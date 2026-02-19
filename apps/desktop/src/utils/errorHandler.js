/**
 * Error Handler Module
 * 
 * Provides structured error handling, user-friendly error messages,
 * and error recovery strategies for critical application paths.
 * 
 * @module errorHandler
 */

const { app, dialog } = require('electron');
const { getLogger } = require('./logger');
const { ERROR_CODES } = require('../config/constants');

const logger = getLogger('ErrorHandler');

// Error severity levels
const SEVERITY = {
  CRITICAL: 'critical',  // App cannot continue, must exit
  ERROR: 'error',        // Feature broken, but app can continue
  WARNING: 'warning',    // Issue occurred, recovered automatically
  INFO: 'info'           // Informational, no user action needed
};

// User-friendly error messages
const ERROR_MESSAGES = {
  [ERROR_CODES.PYTHON_NOT_FOUND]: {
    title: 'Python Not Found',
    message: 'SONU requires Python to run the transcription engine. Please install Python 3.8 or higher.',
    action: 'https://python.org/downloads',
    severity: SEVERITY.CRITICAL
  },
  [ERROR_CODES.MODEL_LOAD_FAILED]: {
    title: 'Model Load Failed',
    message: 'Failed to load the speech recognition model. Please try downloading the model again.',
    action: 'retry',
    severity: SEVERITY.ERROR
  },
  [ERROR_CODES.RECORDING_FAILED]: {
    title: 'Recording Failed',
    message: 'Could not start recording. Please check your microphone permissions.',
    action: 'settings',
    severity: SEVERITY.ERROR
  },
  [ERROR_CODES.TRANSCRIPTION_FAILED]: {
    title: 'Transcription Failed',
    message: 'Could not transcribe audio. Please try again.',
    action: 'retry',
    severity: SEVERITY.WARNING
  },
  [ERROR_CODES.LLM_NOT_AVAILABLE]: {
    title: 'AI Enhancement Unavailable',
    message: 'The AI text enhancement feature is currently unavailable. Basic transcription will still work.',
    action: null,
    severity: SEVERITY.WARNING
  },
  [ERROR_CODES.API_KEY_INVALID]: {
    title: 'API Key Invalid',
    message: 'Your API key appears to be invalid or expired. Please check your settings.',
    action: 'settings',
    severity: SEVERITY.ERROR
  }
};

/**
 * Handle an error with appropriate logging and user notification
 * @param {Error|string} error - The error object or message
 * @param {string} context - Where the error occurred
 * @param {Object} options - Error handling options
 * @param {string} options.code - Error code from ERROR_CODES
 * @param {boolean} options.showDialog - Whether to show error dialog
 * @param {boolean} options.recoverable - Whether the app can continue
 * @returns {Object} Error result with recovery info
 */
function handleError(error, context, options = {}) {
  const { code, showDialog = true, recoverable = true } = options;
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : null;
  
  // Log the error
  logger.error(`Error in ${context}: ${errorMessage}`, {
    code,
    context,
    recoverable,
    stack: errorStack
  });

  // Get error config
  const errorConfig = code ? ERROR_MESSAGES[code] : null;
  const severity = errorConfig?.severity || (recoverable ? SEVERITY.ERROR : SEVERITY.CRITICAL);

  // Show dialog for critical or user-facing errors
  if (showDialog && (severity === SEVERITY.CRITICAL || severity === SEVERITY.ERROR)) {
    showErrorDialog(errorConfig, errorMessage, recoverable);
  }

  return {
    success: false,
    error: errorMessage,
    code,
    severity,
    recoverable,
    action: errorConfig?.action || null
  };
}

/**
 * Show error dialog to user
 * @param {Object} errorConfig - Error configuration
 * @param {string} errorMessage - Technical error message
 * @param {boolean} recoverable - Whether app can continue
 */
function showErrorDialog(errorConfig, errorMessage, recoverable) {
  try {
    const buttons = ['OK'];
    if (errorConfig?.action === 'retry') {
      buttons.unshift('Retry');
    } else if (errorConfig?.action?.startsWith('http')) {
      buttons.unshift('Open Link');
    } else if (errorConfig?.action === 'settings') {
      buttons.unshift('Open Settings');
    }

    if (!recoverable) {
      buttons.push('Exit App');
    }

    const result = dialog.showMessageBoxSync({
      type: errorConfig?.severity === SEVERITY.CRITICAL ? 'error' : 'warning',
      title: errorConfig?.title || 'Error',
      message: errorConfig?.message || errorMessage,
      detail: errorConfig ? `Technical details: ${errorMessage}` : undefined,
      buttons,
      defaultId: 0,
      cancelId: buttons.indexOf('OK')
    });

    // Handle button clicks
    const clickedButton = buttons[result];
    if (clickedButton === 'Exit App') {
      app.quit();
    } else if (clickedButton === 'Open Link' && errorConfig?.action) {
      const { shell } = require('electron');
      shell.openExternal(errorConfig.action);
    }
    // Retry and Open Settings handled by caller
  } catch (dialogError) {
    logger.error('Failed to show error dialog:', dialogError);
  }
}

/**
 * Wrap a function with error handling
 * @param {Function} fn - Function to wrap
 * @param {string} context - Context for error reporting
 * @param {Object} options - Error handling options
 * @returns {Function} Wrapped function
 */
function withErrorHandling(fn, context, options = {}) {
  return async function(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      return handleError(error, context, options);
    }
  };
}

/**
 * Validate that required dependencies are available
 * @returns {Promise<Object>} Validation result
 */
async function validateDependencies() {
  const { spawn } = require('child_process');
  const issues = [];

  // Check Python
  try {
    const result = spawn('python', ['--version'], { shell: true });
    await new Promise((resolve, reject) => {
      result.on('close', (code) => {
        if (code !== 0) reject(new Error('Python check failed'));
        else resolve();
      });
      result.on('error', reject);
    });
  } catch (e) {
    issues.push({
      code: ERROR_CODES.PYTHON_NOT_FOUND,
      message: 'Python not found or not accessible',
      critical: true
    });
  }

  if (issues.length > 0) {
    const critical = issues.filter(i => i.critical);
    if (critical.length > 0) {
      handleError(
        critical[0].message,
        'Dependency Validation',
        { code: critical[0].code, showDialog: true, recoverable: false }
      );
      return { valid: false, issues };
    }
  }

  return { valid: true, issues };
}

/**
 * Safely spawn a process with error handling
 * @param {string} command - Command to spawn
 * @param {Array} args - Command arguments
 * @param {Object} options - Spawn options
 * @returns {Promise<Object>} Spawn result
 */
async function safeSpawn(command, args = [], options = {}) {
  const { spawn } = require('child_process');
  const { ERROR_CODES } = require('../config/constants');
  
  return new Promise((resolve, reject) => {
    let process;
    
    try {
      process = spawn(command, args, {
        ...options,
        shell: options.shell || false
      });
    } catch (spawnError) {
      logger.error(`Failed to spawn ${command}:`, spawnError);
      reject({
        success: false,
        error: spawnError.message,
        code: spawnError.code === 'ENOENT' ? ERROR_CODES.PYTHON_NOT_FOUND : ERROR_CODES.RECORDING_FAILED
      });
      return;
    }

    let stdout = '';
    let stderr = '';

    if (process.stdout) {
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    if (process.stderr) {
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    process.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, stdout, stderr, code });
      } else {
        reject({
          success: false,
          error: stderr || `Process exited with code ${code}`,
          stdout,
          stderr,
          code: code === 'ENOENT' ? ERROR_CODES.PYTHON_NOT_FOUND : ERROR_CODES.TRANSCRIPTION_FAILED
        });
      }
    });

    process.on('error', (error) => {
      logger.error(`Process error for ${command}:`, error);
      reject({
        success: false,
        error: error.message,
        code: error.code === 'ENOENT' ? ERROR_CODES.PYTHON_NOT_FOUND : ERROR_CODES.RECORDING_FAILED
      });
    });
  });
}

module.exports = {
  SEVERITY,
  ERROR_CODES,
  handleError,
  withErrorHandling,
  validateDependencies,
  safeSpawn,
  showErrorDialog
};
