/**
 * Comprehensive Error Handling Framework for SONU
 * Provides centralized error management, recovery strategies, and user notifications
 */

class ErrorHandler {
  constructor() {
    this.errors = [];
    this.maxErrors = 100;
    this.recoveryStrategies = new Map();
    this.errorListeners = [];
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.isInitialized = false;

    this.initialize();
  }

  initialize() {
    if (this.isInitialized) return;
    
    this.setupGlobalHandlers();
    this.registerDefaultRecoveryStrategies();
    this.isInitialized = true;
    console.log('Error handling framework initialized');
  }

  setupGlobalHandlers() {
    if (typeof window === 'undefined') return;

    // Global error handler
    window.addEventListener('error', (event) => {
      this.handle(event.error || new Error(event.message), {
        type: 'uncaught',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.handle(event.reason, {
        type: 'unhandled_rejection',
        promise: event.promise
      });
    });

    // Network error detection
    window.addEventListener('offline', () => {
      this.handle(new Error('Network connection lost'), {
        type: 'network',
        recoverable: true
      });
    });
  }

  registerDefaultRecoveryStrategies() {
    // Audio/Recording errors
    this.registerRecovery('audio_device_error', async (error, context) => {
      console.log('Attempting to recover from audio device error...');
      // Try to restart audio stream
      if (typeof window !== 'undefined' && window.voiceApp) {
        try {
          await window.voiceApp.restartAudioStream?.();
          return { recovered: true, message: 'Audio stream restarted' };
        } catch (e) {
          return { recovered: false, message: 'Could not restart audio stream' };
        }
      }
      return { recovered: false };
    });

    // Model loading errors
    this.registerRecovery('model_load_error', async (error, context) => {
      console.log('Attempting to recover from model load error...');
      // Try to load fallback model
      if (typeof window !== 'undefined' && window.voiceApp) {
        try {
          await window.voiceApp.loadModel?.('tiny');
          return { recovered: true, message: 'Loaded fallback model (tiny)' };
        } catch (e) {
          return { recovered: false, message: 'Could not load fallback model' };
        }
      }
      return { recovered: false };
    });

    // Network errors
    this.registerRecovery('network_error', async (error, context) => {
      console.log('Attempting to recover from network error...');
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { recovered: navigator.onLine, message: navigator.onLine ? 'Network restored' : 'Still offline' };
    });

    // Storage errors
    this.registerRecovery('storage_error', async (error, context) => {
      console.log('Attempting to recover from storage error...');
      try {
        // Try to clear some cache
        localStorage.removeItem('sonu_cache_temp');
        return { recovered: true, message: 'Storage cleared' };
      } catch (e) {
        return { recovered: false, message: 'Could not clear storage' };
      }
    });

    // UI/Render errors
    this.registerRecovery('render_error', async (error, context) => {
      console.log('Attempting to recover from render error...');
      try {
        // Try to reload the page
        if (context.severity !== 'critical') {
          return { recovered: true, message: 'UI refreshed', action: 'refresh_ui' };
        }
      } catch (e) {}
      return { recovered: false };
    });
  }

  // Error Classification
  classifyError(error, context = {}) {
    const message = error.message?.toLowerCase() || '';
    const stack = error.stack?.toLowerCase() || '';

    // Audio/Recording errors
    if (message.includes('audio') || message.includes('microphone') || 
        message.includes('stream') || message.includes('mediadevice')) {
      return { type: 'audio_device_error', severity: 'high', recoverable: true };
    }

    // Model errors
    if (message.includes('model') || message.includes('whisper') || 
        message.includes('transcrib')) {
      return { type: 'model_load_error', severity: 'high', recoverable: true };
    }

    // Network errors
    if (message.includes('network') || message.includes('fetch') || 
        message.includes('connection') || message.includes('offline')) {
      return { type: 'network_error', severity: 'medium', recoverable: true };
    }

    // Storage errors
    if (message.includes('storage') || message.includes('quota') || 
        message.includes('localstorage')) {
      return { type: 'storage_error', severity: 'medium', recoverable: true };
    }

    // Permission errors
    if (message.includes('permission') || message.includes('denied') || 
        message.includes('not allowed')) {
      return { type: 'permission_error', severity: 'high', recoverable: false };
    }

    // Render/UI errors
    if (stack.includes('render') || stack.includes('dom') || 
        message.includes('element')) {
      return { type: 'render_error', severity: 'low', recoverable: true };
    }

    // Default classification
    return { type: 'unknown_error', severity: 'medium', recoverable: false };
  }

  // Main error handling method
  async handle(error, context = {}) {
    if (!error) return;

    const classification = this.classifyError(error, context);
    const errorEntry = {
      id: this.generateErrorId(),
      error: error.message || String(error),
      stack: error.stack,
      context: { ...context, ...classification },
      timestamp: Date.now(),
      handled: false,
      recovered: false
    };

    // Log the error
    console.error(`[ErrorHandler] ${classification.type}:`, error);

    // Store error
    this.errors.push(errorEntry);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Notify listeners
    this.notifyListeners(errorEntry);

    // Attempt recovery if possible
    if (classification.recoverable) {
      const recoveryResult = await this.attemptRecovery(errorEntry);
      errorEntry.recovered = recoveryResult.recovered;
      errorEntry.recoveryMessage = recoveryResult.message;
    }

    // Show user notification if needed
    if (classification.severity === 'high' || classification.severity === 'critical') {
      this.showUserNotification(errorEntry);
    }

    errorEntry.handled = true;
    this.saveErrors();

    return errorEntry;
  }

  // Recovery attempt with retry logic
  async attemptRecovery(errorEntry) {
    const { type } = errorEntry.context;
    const retryKey = `${type}_${errorEntry.id}`;
    const attempts = this.retryAttempts.get(retryKey) || 0;

    if (attempts >= this.maxRetries) {
      return { recovered: false, message: 'Max retry attempts reached' };
    }

    this.retryAttempts.set(retryKey, attempts + 1);

    const strategy = this.recoveryStrategies.get(type);
    if (strategy) {
      try {
        const result = await strategy(errorEntry.error, errorEntry.context);
        if (result.recovered) {
          this.retryAttempts.delete(retryKey);
        }
        return result;
      } catch (e) {
        console.error('Recovery strategy failed:', e);
        return { recovered: false, message: 'Recovery strategy threw an error' };
      }
    }

    return { recovered: false, message: 'No recovery strategy available' };
  }

  // Register custom recovery strategy
  registerRecovery(errorType, strategy) {
    this.recoveryStrategies.set(errorType, strategy);
  }

  // Error listeners
  addListener(listener) {
    if (typeof listener === 'function') {
      this.errorListeners.push(listener);
    }
  }

  removeListener(listener) {
    this.errorListeners = this.errorListeners.filter(l => l !== listener);
  }

  notifyListeners(errorEntry) {
    this.errorListeners.forEach(listener => {
      try {
        listener(errorEntry);
      } catch (e) {
        console.error('Error listener threw:', e);
      }
    });
  }

  // User notification
  showUserNotification(errorEntry) {
    const { type, severity } = errorEntry.context;
    
    const userMessages = {
      'audio_device_error': 'Microphone error. Please check your audio settings.',
      'model_load_error': 'Failed to load voice model. Trying fallback...',
      'network_error': 'Network connection lost. Some features may be unavailable.',
      'storage_error': 'Storage error. Some data may not be saved.',
      'permission_error': 'Permission denied. Please grant necessary permissions.',
      'render_error': 'Display error. Refreshing interface...',
      'unknown_error': 'An unexpected error occurred.'
    };

    const message = userMessages[type] || userMessages['unknown_error'];

    if (typeof window !== 'undefined' && window.showMessage) {
      window.showMessage(message);
    }

    // Also announce to screen readers
    if (typeof window !== 'undefined' && window.accessibilityManager) {
      window.accessibilityManager.announce(message, 'assertive');
    }
  }

  // Error analytics
  getErrors() {
    return [...this.errors];
  }

  getRecentErrors(count = 10) {
    return this.errors.slice(-count);
  }

  getErrorsByType(type) {
    return this.errors.filter(e => e.context.type === type);
  }

  getErrorStats() {
    const stats = {
      total: this.errors.length,
      byType: {},
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      recovered: 0,
      unrecovered: 0
    };

    this.errors.forEach(e => {
      stats.byType[e.context.type] = (stats.byType[e.context.type] || 0) + 1;
      stats.bySeverity[e.context.severity]++;
      if (e.recovered) stats.recovered++;
      else stats.unrecovered++;
    });

    return stats;
  }

  // Persistence
  saveErrors() {
    try {
      const recentErrors = this.errors.slice(-20); // Keep only recent errors
      localStorage.setItem('sonu_error_log', JSON.stringify(recentErrors));
    } catch (e) {
      console.warn('Could not save error log:', e);
    }
  }

  loadErrors() {
    try {
      const saved = localStorage.getItem('sonu_error_log');
      if (saved) {
        this.errors = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not load error log:', e);
    }
  }

  clearErrors() {
    this.errors = [];
    this.retryAttempts.clear();
    try {
      localStorage.removeItem('sonu_error_log');
    } catch (e) {}
  }

  // Utility
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Export error report
  exportReport() {
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.getErrorStats(),
      recentErrors: this.getRecentErrors(20),
      system: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown'
      }
    };

    return report;
  }

  destroy() {
    this.errors = [];
    this.recoveryStrategies.clear();
    this.errorListeners = [];
    this.retryAttempts.clear();
    console.log('Error handler destroyed');
  }
}

// Singleton instance
let errorHandlerInstance = null;

function getErrorHandler() {
  if (!errorHandlerInstance) {
    errorHandlerInstance = new ErrorHandler();
  }
  return errorHandlerInstance;
}

// Convenience function for handling errors
function handleError(error, context = {}) {
  return getErrorHandler().handle(error, context);
}

// Make available globally
if (typeof window !== 'undefined') {
  window.ErrorHandler = ErrorHandler;
  window.getErrorHandler = getErrorHandler;
  window.handleError = handleError;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ErrorHandler, getErrorHandler, handleError };
}
