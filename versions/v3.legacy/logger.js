/**
 * Comprehensive logging system for Voice Dictation App
 * Logs to both console and files for debugging
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class Logger {
  constructor() {
    // Create logs directory in app data folder
    const userDataPath = app.getPath('userData');
    this.logsDir = path.join(userDataPath, 'logs');
    
    // Ensure logs directory exists
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    
    // Create log file paths with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    this.mainLogPath = path.join(this.logsDir, `main-${timestamp}.log`);
    this.typingLogPath = path.join(this.logsDir, `typing-${timestamp}.log`);
    this.downloadLogPath = path.join(this.logsDir, `download-${timestamp}.log`);
    this.whisperLogPath = path.join(this.logsDir, `whisper-${timestamp}.log`);
    
    // Initialize log files
    this.initLogFile(this.mainLogPath);
    this.initLogFile(this.typingLogPath);
    this.initLogFile(this.downloadLogPath);
    this.initLogFile(this.whisperLogPath);
    
    console.log('Logger initialized. Logs directory:', this.logsDir);
  }
  
  initLogFile(filePath) {
    const header = `=== Voice Dictation App Log ===\nStarted: ${new Date().toISOString()}\n${'='.repeat(50)}\n\n`;
    fs.writeFileSync(filePath, header, 'utf8');
  }
  
  formatMessage(level, category, message, data = null) {
    const timestamp = new Date().toISOString();
    let logLine = `[${timestamp}] [${level.padEnd(5)}] [${category.padEnd(10)}] ${message}`;
    
    if (data) {
      if (typeof data === 'object') {
        logLine += `\n${JSON.stringify(data, null, 2)}`;
      } else {
        logLine += ` | ${data}`;
      }
    }
    
    return logLine + '\n';
  }
  
  writeToFile(filePath, message) {
    try {
      fs.appendFileSync(filePath, message, 'utf8');
    } catch (e) {
      // Silent fail for EPIPE errors
      if (e.code !== 'EPIPE') {
        console.error('Failed to write log:', e.message);
      }
    }
  }
  
  safeConsole(method, ...args) {
    try {
      console[method](...args);
    } catch (e) {
      // Silent fail for EPIPE errors
    }
  }
  
  // Main application logs
  info(message, data = null) {
    const formatted = this.formatMessage('INFO', 'Main', message, data);
    this.safeConsole('log', `[INFO] ${message}`, data || '');
    this.writeToFile(this.mainLogPath, formatted);
  }
  
  warn(message, data = null) {
    const formatted = this.formatMessage('WARN', 'Main', message, data);
    this.safeConsole('warn', `[WARN] ${message}`, data || '');
    this.writeToFile(this.mainLogPath, formatted);
  }
  
  error(message, error = null) {
    const data = error ? {
      message: error.message,
      stack: error.stack,
      code: error.code
    } : null;
    const formatted = this.formatMessage('ERROR', 'Main', message, data);
    this.safeConsole('error', `[ERROR] ${message}`, error || '');
    this.writeToFile(this.mainLogPath, formatted);
  }
  
  // Typing-specific logs
  typing(message, data = null) {
    const formatted = this.formatMessage('INFO', 'Typing', message, data);
    this.safeConsole('log', `[TYPING] ${message}`, data || '');
    this.writeToFile(this.typingLogPath, formatted);
    this.writeToFile(this.mainLogPath, formatted);
  }
  
  typingError(message, error = null) {
    const data = error ? {
      message: error.message,
      stack: error.stack
    } : null;
    const formatted = this.formatMessage('ERROR', 'Typing', message, data);
    this.safeConsole('error', `[TYPING ERROR] ${message}`, error || '');
    this.writeToFile(this.typingLogPath, formatted);
    this.writeToFile(this.mainLogPath, formatted);
  }
  
  // Download-specific logs
  download(message, data = null) {
    const formatted = this.formatMessage('INFO', 'Download', message, data);
    this.safeConsole('log', `[DOWNLOAD] ${message}`, data || '');
    this.writeToFile(this.downloadLogPath, formatted);
    this.writeToFile(this.mainLogPath, formatted);
  }
  
  downloadError(message, error = null) {
    const data = error ? {
      message: error.message,
      stack: error.stack
    } : null;
    const formatted = this.formatMessage('ERROR', 'Download', message, data);
    this.safeConsole('error', `[DOWNLOAD ERROR] ${message}`, error || '');
    this.writeToFile(this.downloadLogPath, formatted);
    this.writeToFile(this.mainLogPath, formatted);
  }
  
  // Whisper service logs
  whisper(message, data = null) {
    const formatted = this.formatMessage('INFO', 'Whisper', message, data);
    this.safeConsole('log', `[WHISPER] ${message}`, data || '');
    this.writeToFile(this.whisperLogPath, formatted);
    this.writeToFile(this.mainLogPath, formatted);
  }
  
  whisperError(message, error = null) {
    const data = error ? {
      message: error.message,
      stack: error.stack
    } : null;
    const formatted = this.formatMessage('ERROR', 'Whisper', message, data);
    this.safeConsole('error', `[WHISPER ERROR] ${message}`, error || '');
    this.writeToFile(this.whisperLogPath, formatted);
    this.writeToFile(this.mainLogPath, formatted);
  }
  
  // Performance timing
  startTimer(label) {
    return {
      label,
      start: Date.now(),
      end: () => {
        const duration = Date.now() - this.start;
        this.info(`Timer [${label}] completed`, { duration_ms: duration });
        return duration;
      }
    };
  }
  
  // Get logs directory for UI access
  getLogsDirectory() {
    return this.logsDir;
  }
  
  // Get recent logs (last N lines)
  getRecentLogs(category = 'main', lines = 100) {
    let filePath;
    switch (category) {
      case 'typing': filePath = this.typingLogPath; break;
      case 'download': filePath = this.downloadLogPath; break;
      case 'whisper': filePath = this.whisperLogPath; break;
      default: filePath = this.mainLogPath; break;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const allLines = content.split('\n');
      return allLines.slice(-lines).join('\n');
    } catch (e) {
      return `Error reading log file: ${e.message}`;
    }
  }
}

// Create singleton instance
let loggerInstance = null;

function getLogger() {
  if (!loggerInstance) {
    loggerInstance = new Logger();
  }
  return loggerInstance;
}

module.exports = { getLogger };

