/**
 * Python Manager Module
 * Manages Python service processes
 */

const { spawn } = require('child_process');
const path = require('path');
const { constants } = require('../config');
const { logger } = require('../utils');

const pythonLogger = logger.createLogger('PythonManager');

let whisperProcess = null;
let llmProcess = null;

/**
 * Initialize Python manager
 * @param {Object} settings - Application settings
 */
function initialize(settings) {
  pythonLogger.info('Python manager initialized');
}

/**
 * Find Python executable
 * @returns {string|null} Path to Python executable
 */
function findPythonExecutable() {
  const { execSync } = require('child_process');
  const pythonCommands = ['python3', 'python', 'py'];
  
  for (const cmd of pythonCommands) {
    try {
      const result = execSync(`where ${cmd}`, { encoding: 'utf8', timeout: 2000 }).trim();
      if (result && !result.includes('Microsoft Store')) {
        return result.split('\n')[0].trim();
      }
    } catch (e) {
      // Try next command
    }
  }
  
  return null;
}

/**
 * Start the Whisper transcription service
 * @param {Object} settings - Application settings
 */
function startWhisperService(settings) {
  if (whisperProcess) {
    pythonLogger.warn('Whisper service already running');
    return;
  }
  
  const pythonPath = findPythonExecutable();
  if (!pythonPath) {
    pythonLogger.error('Python executable not found');
    return;
  }
  
  const scriptPath = path.join(__dirname, '..', '..', constants.PATHS.PYTHON, 'whisper_service.py');
  
  whisperProcess = spawn(pythonPath, [scriptPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  whisperProcess.stdout.on('data', (data) => {
    pythonLogger.debug('Whisper stdout:', data.toString().trim());
  });
  
  whisperProcess.stderr.on('data', (data) => {
    pythonLogger.error('Whisper stderr:', data.toString().trim());
  });
  
  whisperProcess.on('close', (code) => {
    pythonLogger.info('Whisper service exited with code', code);
    whisperProcess = null;
  });
  
  pythonLogger.info('Whisper service started');
}

/**
 * Stop the Whisper transcription service
 */
function stopWhisperService() {
  if (!whisperProcess) return;
  
  whisperProcess.kill();
  whisperProcess = null;
  pythonLogger.info('Whisper service stopped');
}

/**
 * Start recording
 */
function startRecording() {
  pythonLogger.info('Recording started');
  // TODO: Send command to Python service
}

/**
 * Stop recording
 */
function stopRecording() {
  pythonLogger.info('Recording stopped');
  // TODO: Send command to Python service
}

module.exports = {
  initialize,
  findPythonExecutable,
  startWhisperService,
  stopWhisperService,
  startRecording,
  stopRecording
};
