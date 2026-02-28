/**
 * Python Process Manager Module
 * Manages Python subprocesses for Whisper and LLM services
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const os = require('os');

class PythonManager {
  constructor(options = {}) {
    this.__dirname = options.__dirname;
    this.logger = options.logger || null;
    this.settings = options.settings || {};
    
    this.whisperProcess = null;
    this.llmProcess = null;
    this.whisperStdoutBuffer = '';
    this.llmStdoutBuffer = '';
    this.whisperModelReady = false;
    this.llmServiceReady = false;
    this.pendingRecordingAction = null;
    
    // Event callbacks
    this.onTranscription = options.onTranscription || (() => {});
    this.onPartialTranscription = options.onPartialTranscription || (() => {});
    this.onWhisperReady = options.onWhisperReady || (() => {});
    this.onWhisperError = options.onWhisperError || (() => {});
    this.onLLMMessage = options.onLLMMessage || (() => {});
  }

  /**
   * Helper function to find Python executable
   */
  findPythonExecutable() {
    const pythonCommands = ['python3', 'python', 'py'];

    // On Windows, try to find Python in common locations
    if (process.platform === 'win32') {
      try {
        for (const cmd of pythonCommands) {
          try {
            const result = execSync(`where ${cmd}`, { 
              encoding: 'utf8', 
              timeout: 2000, 
              stdio: ['pipe', 'pipe', 'pipe'] 
            }).trim();
            if (result && !result.includes('Microsoft Store') && !result.includes('App execution aliases')) {
              try {
                const version = execSync(`"${result}" --version`, { 
                  encoding: 'utf8', 
                  timeout: 2000, 
                  stdio: ['pipe', 'pipe', 'pipe'] 
                });
                if (version && version.includes('Python')) {
                  console.log(`Found Python at: ${result}`);
                  return result;
                }
              } catch (e) {
                // Not a valid Python, continue
              }
            }
          } catch (e) {
            // Command not found, continue
          }
        }

        // Try common installation paths
        const commonPaths = [
          path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python'),
          path.join(process.env.PROGRAMFILES || '', 'Python'),
          path.join(process.env.PROGRAMFILES || '', 'Python3'),
          path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Python'),
          path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Python3'),
          path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'Programs', 'Python'),
        ];

        for (const basePath of commonPaths) {
          if (require('fs').existsSync(basePath)) {
            try {
              const dirs = require('fs').readdirSync(basePath);
              for (const dir of dirs) {
                const pythonExe = path.join(basePath, dir, 'python.exe');
                if (require('fs').existsSync(pythonExe)) {
                  try {
                    const version = execSync(`"${pythonExe}" --version`, { 
                      encoding: 'utf8', 
                      timeout: 2000, 
                      stdio: ['pipe', 'pipe', 'pipe'] 
                    });
                    if (version && version.includes('Python')) {
                      console.log(`Found Python at: ${pythonExe}`);
                      return pythonExe;
                    }
                  } catch (e) {
                    // Not valid, continue
                  }
                }
              }
            } catch (e) {
              // Can't read directory, continue
            }
          }
        }
      } catch (e) {
        console.warn('Error finding Python:', e);
      }
    }

    // Fallback: try commands in order
    for (const cmd of pythonCommands) {
      try {
        const version = execSync(`${cmd} --version`, { 
          encoding: 'utf8', 
          timeout: 2000, 
          stdio: ['pipe', 'pipe', 'pipe'] 
        });
        if (version && version.includes('Python')) {
          return cmd;
        }
      } catch (e) {
        // Command not found, continue
      }
    }

    return null;
  }

  /**
   * Convert Electron accelerator to Python keyboard combo string
   */
  electronToPythonCombo(accelerator) {
    if (!accelerator) return 'ctrl+shift+space';
    const parts = accelerator.split('+');
    const mapped = parts.map(p => {
      const s = p.toLowerCase();
      if (s.includes('commandorcontrol')) return 'ctrl';
      if (s === 'cmd' || s === 'ctrl') return 'ctrl';
      if (s === 'alt' || s === 'option') return 'alt';
      if (s === 'shift') return 'shift';
      if (s === 'super') return 'win';
      if (s === 'space') return 'space';
      return s; // letters/numbers
    });
    return mapped.join('+');
  }

  /**
   * Get models directory path
   */
  getDefaultModelsDir() {
    const platform = os.platform();
    if (platform === 'win32') {
      return path.join(os.homedir(), 'AppData', 'Roaming', 'Sonu', 'models');
    } else if (platform === 'darwin') {
      return path.join(os.homedir(), 'Library', 'Application Support', 'Sonu', 'models');
    } else {
      return path.join(os.homedir(), '.local', 'share', 'Sonu', 'models');
    }
  }

  /**
   * Ensure Whisper Python service is running
   */
  ensureWhisperService() {
    if (this.whisperProcess && !this.whisperProcess.killed) {
      if (this.logger) this.logger.whisper('Whisper service already running');
      return;
    }

    const pythonScript = path.join(this.__dirname, 'src', 'core', 'python', 'whisper_service.py');
    const pythonCmd = this.findPythonExecutable() || 'python';

    if (this.logger) {
      this.logger.whisper('Starting whisper service', {
        pythonCmd,
        pythonScript,
        model: this.settings.activeModel
      });
    }

    // Set environment variables
    const env = { ...process.env };
    env.WHISPER_MODEL = this.settings.activeModel || 'tiny';
    
    if (this.settings.model_download_path) {
      env.SONU_MODELS_DIR = this.settings.model_download_path;
    } else {
      env.SONU_MODELS_DIR = this.getDefaultModelsDir();
    }

    this.whisperProcess = spawn(pythonCmd, [pythonScript], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      env: env
    });

    // Reset buffer when creating new process
    this.whisperStdoutBuffer = '';

    // Pre-configure hold keys immediately when service starts
    setImmediate(() => {
      if (this.whisperProcess && !this.whisperProcess.killed) {
        const pyCombo = this.electronToPythonCombo(this.settings.holdHotkey);
        this.writeToWhisper(`SET_HOLD_KEYS ${pyCombo}\n`);
      }
    });

    this.whisperProcess.stdout.on('data', (data) => {
      this.handleWhisperStdout(data);
    });

    this.whisperProcess.stderr.on('data', (data) => {
      const errorMsg = data.toString();
      console.error(`Whisper Error: ${errorMsg}`);
      if (errorMsg.includes('import') || errorMsg.includes('ModuleNotFoundError') || errorMsg.includes('ImportError')) {
        console.error('Python dependencies may be missing. Please install: pip install faster-whisper pyaudio keyboard numpy');
      }
    });

    this.whisperProcess.on('exit', (code) => {
      console.log('Whisper service exited with code', code);
      this.whisperProcess = null;
      this.whisperStdoutBuffer = '';
      this.whisperModelReady = false;
    });
  }

  /**
   * Handle Whisper stdout data
   */
  handleWhisperStdout(data) {
    // Handle data that might come in chunks
    this.whisperStdoutBuffer += data.toString();
    const lines = this.whisperStdoutBuffer.split('\n');
    this.whisperStdoutBuffer = lines.pop() || '';

    for (const line of lines) {
      const raw = line.trim();
      if (!raw) continue;

      // Skip LANG: lines - they're metadata
      if (raw.startsWith('LANG:')) {
        continue;
      }

      // Handle live partial updates
      if (raw.startsWith('PARTIAL:')) {
        const partial = raw.slice(8).trim();
        this.onPartialTranscription(partial);
        continue;
      }

      // Handle continuous dictation segments
      if (raw.startsWith('SEGMENT:')) {
        const segment = raw.slice(8).trim();
        if (segment && segment.length > 0) {
          this.onTranscription(segment, { isContinuous: true });
        }
        continue;
      }

      // Handle events
      if (raw.startsWith('EVENT:')) {
        const evt = raw.slice(6).trim().toUpperCase();
        this.handleWhisperEvent(evt);
        continue;
      }

      // Regular transcription text (final text after release/stop)
      this.onTranscription(raw, { isFinal: true });
    }
  }

  /**
   * Handle Whisper events
   */
  handleWhisperEvent(evt) {
    switch (evt) {
      case 'READY':
        this.whisperModelReady = true;
        if (this.logger) {
          this.logger.whisper('Whisper model loaded and ready', { model: this.settings.activeModel });
        }
        console.log('✓ Whisper model ready');
        this.onWhisperReady({ model: this.settings.activeModel });

        // Execute any pending recording action
        if (this.pendingRecordingAction) {
          console.log('⚡ Executing queued recording action');
          const action = this.pendingRecordingAction;
          this.pendingRecordingAction = null;
          setImmediate(() => action());
        }
        break;

      case 'ERROR':
        if (this.logger) this.logger.whisperError('Whisper model failed to load');
        console.error('✗ Whisper model failed to load');
        this.onWhisperError('Model failed to load. Please check your model files.');
        break;

      case 'MODEL_NOT_READY':
        this.whisperModelReady = false;
        if (this.logger) this.logger.whisper('Model not ready, blocking dictation attempt');
        console.log('⏳ Model still loading, please wait...');
        break;

      case 'CONTINUOUS_STARTED':
        console.log('✓ Continuous dictation mode active');
        break;

      case 'CONTINUOUS_STOPPED':
        console.log('✓ Continuous dictation mode stopped');
        break;

      case 'RELEASE':
        console.log('Whisper RELEASE event received');
        break;
    }
  }

  /**
   * Write command to Whisper stdin
   */
  writeToWhisper(command) {
    if (!this.whisperProcess || this.whisperProcess.killed) {
      console.error('Whisper process not available, ensuring service...');
      this.ensureWhisperService();
      
      setTimeout(() => {
        if (this.whisperProcess && !this.whisperProcess.killed) {
          try {
            this.whisperProcess.stdin.write(command);
            console.log('Sent command to whisper:', command.trim());
          } catch (e) {
            console.error('Failed to write to whisper stdin:', e);
          }
        } else {
          console.error('Whisper process still not available after wait');
        }
      }, 200);
      return;
    }

    try {
      this.whisperProcess.stdin.write(command);
      console.log('Sent command to whisper:', command.trim());
    } catch (e) {
      console.error('Failed to write to whisper stdin:', e);
      this.whisperProcess = null;
      this.ensureWhisperService();
    }
  }

  /**
   * Ensure LLM Python service is running
   */
  ensureLLMService() {
    if (this.llmProcess && !this.llmProcess.killed) return;

    console.log('Starting LLM Service...');
    const pythonCmd = this.findPythonExecutable() || 'python';
    const scriptPath = path.join(this.__dirname, 'src', 'core', 'python', 'llm_service.py');

    const env = { ...process.env };
    env.SONU_MODELS_DIR = this.settings.model_download_path || this.getDefaultModelsDir();

    try {
      this.llmProcess = spawn(pythonCmd, [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: process.platform === 'win32',
        env: env
      });

      this.llmProcess.stdout.on('data', (data) => {
        this.llmStdoutBuffer += data.toString();
        const lines = this.llmStdoutBuffer.split('\n');
        this.llmStdoutBuffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            if (line.trim().startsWith('{')) {
              const msg = JSON.parse(line.trim());
              this.onLLMMessage(msg);
              
              if (msg.type === 'status') {
                this.llmServiceReady = msg.ready;
                console.log('LLM Status:', msg.status);
              }
            } else {
              console.log('LLM:', line);
            }
          } catch (e) {
            console.log('LLM Raw:', line);
          }
        }
      });

      this.llmProcess.stderr.on('data', d => console.error('LLM Err:', d.toString()));

      this.llmProcess.on('exit', (code) => {
        console.log('LLM Service exited:', code);
        this.llmProcess = null;
        this.llmServiceReady = false;
      });

    } catch (e) {
      console.error('Failed to start LLM service:', e);
    }
  }

  /**
   * Write command to LLM stdin
   */
  writeToLLM(cmd) {
    if (this.llmProcess && !this.llmProcess.killed) {
      try {
        this.llmProcess.stdin.write(cmd + '\n');
      } catch (e) {
        console.error('Error writing to LLM:', e);
      }
    } else {
      this.ensureLLMService();
      setTimeout(() => {
        if (this.llmProcess && !this.llmProcess.killed) {
          try { 
            this.llmProcess.stdin.write(cmd + '\n'); 
          } catch (e) { }
        }
      }, 1000);
    }
  }

  /**
   * Check if whisper model is ready
   */
  isWhisperModelReady() {
    return this.whisperModelReady;
  }

  /**
   * Check if LLM service is ready
   */
  isLLMServiceReady() {
    return this.llmServiceReady;
  }

  /**
   * Queue recording action when model is ready
   */
  queueRecordingAction(action) {
    this.pendingRecordingAction = action;
  }

  /**
   * Set recording state for model readiness check
   */
  setRecordingState(isRecording) {
    // This is used to check if we're currently recording
    this.isRecording = isRecording;
  }

  /**
   * Get whisper process
   */
  getWhisperProcess() {
    return this.whisperProcess;
  }

  /**
   * Get LLM process
   */
  getLLMProcess() {
    return this.llmProcess;
  }

  /**
   * Kill whisper process
   */
  killWhisperProcess() {
    if (this.whisperProcess && !this.whisperProcess.killed) {
      this.whisperProcess.kill();
      this.whisperProcess = null;
      this.whisperModelReady = false;
    }
  }

  /**
   * Kill LLM process
   */
  killLLMProcess() {
    if (this.llmProcess && !this.llmProcess.killed) {
      this.llmProcess.kill();
      this.llmProcess = null;
      this.llmServiceReady = false;
    }
  }

  /**
   * Cleanup on quit
   */
  destroy() {
    this.killWhisperProcess();
    this.killLLMProcess();
  }
}

module.exports = PythonManager;
