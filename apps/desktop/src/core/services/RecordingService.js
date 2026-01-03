const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');
const { clipboard, shell } = require('electron');
const robot = require('robotjs');

/**
 * RecordingService - Orchestrates the dictation recording process.
 */
class RecordingService extends EventEmitter {
    constructor(configManager, audioService, indicatorManager, pythonCorePath, modelsDir) {
        super();
        this.config = configManager;
        this.audio = audioService;
        this.indicator = indicatorManager;
        this.pythonCorePath = pythonCorePath;
        this.modelsDir = modelsDir;

        this.whisperProcess = null;
        this.isRecording = false;
        this.isReady = false;
        this.stdoutBuffer = '';
    }

    startEngine() {
        if (this.whisperProcess) return;

        const script = path.join(this.pythonCorePath, 'whisper_service.py');
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        const env = {
            ...process.env,
            WHISPER_MODEL: this.config.get('activeModel'),
            SONU_MODELS_DIR: this.modelsDir
        };

        this.whisperProcess = spawn(pythonCmd, [script], {
            cwd: this.pythonCorePath,
            env: env,
            shell: process.platform === 'win32'
        });

        this.whisperProcess.stdout.on('data', (data) => {
            this.stdoutBuffer += data.toString();
            const lines = this.stdoutBuffer.split('\n');
            this.stdoutBuffer = lines.pop() || '';

            for (const line of lines) {
                this.handleEngineOutput(line.trim());
            }
        });

        this.whisperProcess.stderr.on('data', (data) => {
            console.error(`[WhisperEngine] ${data}`);
        });

        this.whisperProcess.on('close', (code) => {
            console.log(`[WhisperEngine] Exited with code ${code}`);
            this.whisperProcess = null;
            this.isReady = false;
            // Auto-restart if unexpected
            if (code !== 0) setTimeout(() => this.startEngine(), 2000);
        });
    }

    handleEngineOutput(line) {
        if (line === 'EVENT: READY') {
            this.isReady = true;
            this.emit('ready');
        } else if (line.startsWith('PARTIAL:')) {
            const text = line.slice(8).trim();
            if (text) {
                this.injectText(text);
                this.emit('transcription', text);
            }
        }
    }

    start() {
        if (this.isRecording || !this.isReady) return;

        console.log('[RecordingService] Starting dictation');
        this.isRecording = true;
        this.audio.muteSystem();
        this.indicator.show();
        this.sendCommand('START');
        this.emit('start');
    }

    stop() {
        if (!this.isRecording) return;

        console.log('[RecordingService] Stopping dictation');
        this.isRecording = false;
        this.sendCommand('STOP');
        this.indicator.hide();
        this.audio.unmuteSystem();
        this.emit('stop');
    }

    cancel() {
        if (!this.isRecording) return;
        this.isRecording = false;
        this.sendCommand('STOP'); // still need to stop the engine
        this.indicator.hide();
        this.audio.unmuteSystem();
        this.emit('cancel');
    }

    toggle() {
        if (this.isRecording) this.stop();
        else this.start();
        return this.isRecording;
    }

    sendCommand(cmd) {
        if (this.whisperProcess && this.whisperProcess.stdin.writable) {
            this.whisperProcess.stdin.write(cmd + '\n');
        }
    }

    injectText(text) {
        if (!text || text.trim() === '') return;

        // Production-grade injection: Clipboard fast paste
        try {
            const { clipboard } = require('electron');
            const { execSync } = require('child_process');

            const prevClipboard = clipboard.readText();
            clipboard.writeText(text);

            // Simulating Ctrl+V via PowerShell for maximum compatibility on Windows
            if (process.platform === 'win32') {
                setTimeout(() => {
                    try {
                        execSync('powershell -Command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys(\'^v\')"', {
                            stdio: 'ignore',
                            timeout: 2000,
                            windowsHide: true
                        });
                    } catch (e) { console.error('[RecordingService] Paste error:', e); }
                }, 100);
            } else if (process.platform === 'darwin') {
                execSync('osascript -e \'tell application "System Events" to keystroke "v" using command down\'', { stdio: 'ignore' });
            }

            // Restore clipboard after a delay
            setTimeout(() => clipboard.writeText(prevClipboard), 500);
        } catch (e) {
            console.error('[RecordingService] Injection failed:', e);
        }
    }

    setLanguage(lang) {
        this.sendCommand(`SET_LANGUAGE ${lang}`);
    }

    setModel(modelName) {
        this.sendCommand(`SET_MODEL ${modelName}`);
    }
}

module.exports = RecordingService;
