/**
 * Centralized Logging Module
 * 
 * Provides structured logging with multiple transports (console, file, rotation)
 * Replaces scattered console.log statements throughout the codebase.
 * 
 * @module logger
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};

// Current log level (can be changed at runtime)
let currentLogLevel = LOG_LEVELS.DEBUG;

// Log file path
let logFilePath = null;
let logStream = null;

// Max log file size (10MB)
const MAX_LOG_SIZE = 10 * 1024 * 1024;
// Max number of backup files
const MAX_BACKUPS = 5;

/**
 * Initialize the logging system
 * @param {Object} options - Configuration options
 * @param {string} options.level - Initial log level ('error', 'warn', 'info', 'debug', 'trace')
 * @param {boolean} options.logToFile - Whether to write to file
 * @param {boolean} options.logToConsole - Whether to output to console
 */
function initialize(options = {}) {
  const {
    level = 'debug',
    logToFile = true,
    logToConsole = true
  } = options;

  // Set initial level
  setLogLevel(level);

  // Setup file logging
  if (logToFile && app) {
    const logsDir = path.join(app.getPath('userData'), 'logs');
    
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    logFilePath = path.join(logsDir, 'sonu.log');
    
    // Check if we need to rotate
    rotateLogsIfNeeded();
    
    // Open log stream
    logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
    
    logStream.on('error', (err) => {
      console.error('[Logger] Failed to write to log file:', err);
    });
  }

  // Log initialization
  info('Logger initialized', { level, logToFile, logToConsole });
}

/**
 * Set the current log level
 * @param {string} level - Log level name
 */
function setLogLevel(level) {
  const upperLevel = level.toUpperCase();
  if (LOG_LEVELS[upperLevel] !== undefined) {
    currentLogLevel = LOG_LEVELS[upperLevel];
  }
}

/**
 * Get current log level name
 * @returns {string}
 */
function getLogLevel() {
  return Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === currentLogLevel) || 'DEBUG';
}

/**
 * Rotate logs if current file exceeds max size
 */
function rotateLogsIfNeeded() {
  if (!fs.existsSync(logFilePath)) return;

  const stats = fs.statSync(logFilePath);
  if (stats.size < MAX_LOG_SIZE) return;

  // Close current stream
  if (logStream) {
    logStream.end();
    logStream = null;
  }

  // Rotate backup files
  for (let i = MAX_BACKUPS - 1; i >= 1; i--) {
    const oldPath = `${logFilePath}.${i}`;
    const newPath = `${logFilePath}.${i + 1}`;
    
    if (fs.existsSync(oldPath)) {
      if (i === MAX_BACKUPS - 1) {
        fs.unlinkSync(oldPath); // Delete oldest
      } else {
        fs.renameSync(oldPath, newPath);
      }
    }
  }

  // Rotate current file
  fs.renameSync(logFilePath, `${logFilePath}.1`);
}

/**
 * Format a log message
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 * @returns {string}
 */
function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? ' ' + JSON.stringify(meta) : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
}

/**
 * Write log to outputs
 * @param {number} level - Log level number
 * @param {string} levelName - Log level name
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 */
function writeLog(level, levelName, message, meta = {}) {
  if (level > currentLogLevel) return;

  const formatted = formatLog(levelName, message, meta);

  // Console output
  if (level <= LOG_LEVELS.WARN) {
    console.error(formatted);
  } else {
    console.log(formatted);
  }

  // File output
  if (logStream) {
    logStream.write(formatted + '\n');
    
    // Check rotation
    if (logFilePath) {
      const stats = fs.statSync(logFilePath);
      if (stats.size >= MAX_LOG_SIZE) {
        rotateLogsIfNeeded();
        logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
      }
    }
  }
}

/**
 * Log an error message
 * @param {string} message - Error message
 * @param {Object} meta - Additional metadata
 */
function error(message, meta = {}) {
  writeLog(LOG_LEVELS.ERROR, 'ERROR', message, meta);
}

/**
 * Log a warning message
 * @param {string} message - Warning message
 * @param {Object} meta - Additional metadata
 */
function warn(message, meta = {}) {
  writeLog(LOG_LEVELS.WARN, 'WARN', message, meta);
}

/**
 * Log an info message
 * @param {string} message - Info message
 * @param {Object} meta - Additional metadata
 */
function info(message, meta = {}) {
  writeLog(LOG_LEVELS.INFO, 'INFO', message, meta);
}

/**
 * Log a debug message
 * @param {string} message - Debug message
 * @param {Object} meta - Additional metadata
 */
function debug(message, meta = {}) {
  writeLog(LOG_LEVELS.DEBUG, 'DEBUG', message, meta);
}

/**
 * Log a trace message
 * @param {string} message - Trace message
 * @param {Object} meta - Additional metadata
 */
function trace(message, meta = {}) {
  writeLog(LOG_LEVELS.TRACE, 'TRACE', message, meta);
}

/**
 * Create a namespaced logger
 * @param {string} namespace - Logger namespace
 * @returns {Object} - Namespaced logger methods
 */
function createLogger(namespace) {
  return {
    error: (msg, meta) => error(`[${namespace}] ${msg}`, meta),
    warn: (msg, meta) => warn(`[${namespace}] ${msg}`, meta),
    info: (msg, meta) => info(`[${namespace}] ${msg}`, meta),
    debug: (msg, meta) => debug(`[${namespace}] ${msg}`, meta),
    trace: (msg, meta) => trace(`[${namespace}] ${msg}`, meta)
  };
}

/**
 * Close the logging system
 */
function close() {
  if (logStream) {
    logStream.end();
    logStream = null;
  }
}

// Handle app exit
if (app) {
  app.on('before-quit', close);
}

module.exports = {
  initialize,
  setLogLevel,
  getLogLevel,
  error,
  warn,
  info,
  debug,
  trace,
  createLogger,
  close,
  LOG_LEVELS
};
