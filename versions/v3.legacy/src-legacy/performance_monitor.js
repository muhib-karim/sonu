/**
 * Performance Monitoring System for SONU
 * Tracks application performance metrics and provides analytics
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      transcription: {
        count: 0,
        totalTime: 0,
        avgLatency: 0,
        errors: 0,
        lastTranscriptionTime: 0
      },
      memory: {
        peakUsage: 0,
        currentUsage: 0,
        history: []
      },
      cpu: {
        usage: 0,
        history: []
      },
      audio: {
        bufferUnderruns: 0,
        sampleRate: 16000,
        channels: 1
      },
      ui: {
        renderTime: 0,
        interactionLatency: 0,
        themeSwitchTime: 0
      }
    };

    this.isEnabled = true;
    this.collectionInterval = 5000; // 5 seconds
    this.maxHistorySize = 100;
    this.intervalId = null;

    this.initialize();
  }

  initialize() {
    if (!this.isEnabled) return;

    // Start periodic metric collection
    this.intervalId = setInterval(() => {
      this.collectSystemMetrics();
    }, this.collectionInterval);

    // Set up event listeners
    this.setupEventListeners();

    console.log('Performance monitoring initialized');
  }

  setupEventListeners() {
    // Transcription events
    if (typeof ipcRenderer !== 'undefined') {
      ipcRenderer.on('transcription', (event, text) => {
        this.recordTranscription(text.length);
      });

      ipcRenderer.on('transcription-partial', (event, partialText) => {
        this.recordPartialTranscription(partialText.length);
      });

      ipcRenderer.on('recording-start', () => {
        this.startRecordingTimer();
      });

      ipcRenderer.on('recording-stop', () => {
        this.stopRecordingTimer();
      });

      // UI performance events
      ipcRenderer.on('theme-changed', (event, theme) => {
        this.recordThemeSwitch();
      });
    }

    // Memory and CPU monitoring (browser-side)
    if (typeof performance !== 'undefined' && performance.memory) {
      this.monitorMemoryUsage();
    }
  }

  // Transcription Metrics
  recordTranscription(charCount) {
    const now = Date.now();
    const timeSinceLast = now - this.metrics.transcription.lastTranscriptionTime;

    this.metrics.transcription.count++;
    this.metrics.transcription.lastTranscriptionTime = now;

    // Calculate words per minute if we have timing data
    if (timeSinceLast > 0 && timeSinceLast < 300000) { // Within 5 minutes
      const words = charCount / 5; // Rough estimate
      const minutes = timeSinceLast / 60000;
      const wpm = words / minutes;

      this.updateWPM(wpm);
    }

    this.saveMetrics();
  }

  recordPartialTranscription(charCount) {
    // Track partial updates for latency analysis
    this.metrics.transcription.partialUpdates =
      (this.metrics.transcription.partialUpdates || 0) + 1;
  }

  startRecordingTimer() {
    this.recordingStartTime = Date.now();
  }

  stopRecordingTimer() {
    if (this.recordingStartTime) {
      const duration = Date.now() - this.recordingStartTime;
      this.metrics.transcription.totalTime += duration;

      // Update average latency
      const totalTranscriptions = this.metrics.transcription.count;
      this.metrics.transcription.avgLatency =
        this.metrics.transcription.totalTime / totalTranscriptions;

      this.recordingStartTime = null;
    }
  }

  updateWPM(wpm) {
    if (!this.metrics.transcription.wpmHistory) {
      this.metrics.transcription.wpmHistory = [];
    }

    this.metrics.transcription.wpmHistory.push(wpm);

    // Keep only last 10 WPM measurements
    if (this.metrics.transcription.wpmHistory.length > 10) {
      this.metrics.transcription.wpmHistory.shift();
    }

    // Calculate average WPM
    const sum = this.metrics.transcription.wpmHistory.reduce((a, b) => a + b, 0);
    this.metrics.transcription.avgWPM = sum / this.metrics.transcription.wpmHistory.length;
  }

  // System Metrics
  async collectSystemMetrics() {
    try {
      // Memory usage
      if (typeof performance !== 'undefined' && performance.memory) {
        const memInfo = performance.memory;
        const currentUsage = memInfo.usedJSHeapSize / (1024 * 1024); // MB

        this.metrics.memory.currentUsage = currentUsage;
        this.metrics.memory.peakUsage = Math.max(
          this.metrics.memory.peakUsage,
          currentUsage
        );

        this.metrics.memory.history.push({
          timestamp: Date.now(),
          usage: currentUsage
        });

        // Keep history manageable
        if (this.metrics.memory.history.length > this.maxHistorySize) {
          this.metrics.memory.history.shift();
        }
      }

      // Get system info from main process
      if (typeof ipcRenderer !== 'undefined') {
        const systemInfo = await ipcRenderer.invoke('system:get-info');
        if (systemInfo) {
          this.metrics.system = systemInfo;
        }
      }

      this.saveMetrics();
    } catch (error) {
      console.warn('Failed to collect system metrics:', error);
    }
  }

  monitorMemoryUsage() {
    // Monitor for memory leaks
    const checkInterval = setInterval(() => {
      if (performance.memory) {
        const usage = performance.memory.usedJSHeapSize / (1024 * 1024);
        if (usage > 500) { // Over 500MB
          console.warn('High memory usage detected:', usage.toFixed(2), 'MB');
          this.metrics.memory.warnings =
            (this.metrics.memory.warnings || 0) + 1;
        }
      }
    }, 30000); // Check every 30 seconds

    // Store interval ID for cleanup
    this.memoryCheckInterval = checkInterval;
  }

  // UI Performance
  recordThemeSwitch() {
    const startTime = performance.now();
    // Theme switch is handled by CSS transitions
    setTimeout(() => {
      const endTime = performance.now();
      this.metrics.ui.themeSwitchTime = endTime - startTime;
    }, 300); // Wait for transition to complete
  }

  recordUIRenderTime(renderTime) {
    this.metrics.ui.renderTime = renderTime;
  }

  recordInteractionLatency(latency) {
    this.metrics.ui.interactionLatency = latency;
  }

  // Error Tracking
  recordError(error, context = {}) {
    this.metrics.transcription.errors++;

    const errorEntry = {
      timestamp: Date.now(),
      error: error.message || error,
      context: context,
      stack: error.stack
    };

    if (!this.metrics.errors) {
      this.metrics.errors = [];
    }

    this.metrics.errors.push(errorEntry);

    // Keep only last 50 errors
    if (this.metrics.errors.length > 50) {
      this.metrics.errors.shift();
    }

    this.saveMetrics();
  }

  // Audio Performance
  recordAudioBufferUnderrun() {
    this.metrics.audio.bufferUnderruns++;
  }

  updateAudioConfig(sampleRate, channels) {
    this.metrics.audio.sampleRate = sampleRate;
    this.metrics.audio.channels = channels;
  }

  // Data Persistence
  saveMetrics() {
    try {
      const metricsToSave = {
        ...this.metrics,
        lastUpdated: Date.now()
      };

      localStorage.setItem('sonu_performance_metrics', JSON.stringify(metricsToSave));
    } catch (error) {
      console.warn('Failed to save performance metrics:', error);
    }
  }

  loadMetrics() {
    try {
      const saved = localStorage.getItem('sonu_performance_metrics');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with current metrics to preserve new structure
        this.metrics = { ...this.metrics, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load performance metrics:', error);
    }
  }

  // Analytics API
  getMetrics() {
    return { ...this.metrics };
  }

  getTranscriptionStats() {
    const { transcription } = this.metrics;
    return {
      totalTranscriptions: transcription.count,
      averageLatency: transcription.avgLatency,
      averageWPM: transcription.avgWPM || 0,
      errorRate: transcription.errors / Math.max(transcription.count, 1),
      totalRecordingTime: transcription.totalTime
    };
  }

  getSystemStats() {
    return {
      memory: {
        current: this.metrics.memory.currentUsage,
        peak: this.metrics.memory.peakUsage,
        warnings: this.metrics.memory.warnings || 0
      },
      audio: this.metrics.audio,
      ui: this.metrics.ui
    };
  }

  getPerformanceReport() {
    return {
      transcription: this.getTranscriptionStats(),
      system: this.getSystemStats(),
      timestamp: Date.now(),
      version: '3.0.0-dev'
    };
  }

  // Performance Optimization Suggestions
  getOptimizationSuggestions() {
    const suggestions = [];
    const stats = this.getTranscriptionStats();
    const system = this.getSystemStats();

    // Memory usage suggestions
    if (system.memory.peak > 800) {
      suggestions.push({
        type: 'memory',
        severity: 'high',
        message: 'High memory usage detected. Consider using a smaller Whisper model.',
        action: 'Switch to "tiny" or "base" model in Settings > Model Selector'
      });
    }

    // Latency suggestions
    if (stats.averageLatency > 3000) {
      suggestions.push({
        type: 'latency',
        severity: 'medium',
        message: 'High transcription latency. Try enabling low-latency mode.',
        action: 'Enable "Low-Latency Audio Backend" in Settings > Experimental'
      });
    }

    // WPM suggestions
    if (stats.averageWPM && stats.averageWPM < 100) {
      suggestions.push({
        type: 'accuracy',
        severity: 'low',
        message: 'Lower than expected WPM. Consider using a larger model for better accuracy.',
        action: 'Try "small" or "medium" model if system resources allow'
      });
    }

    // Error rate suggestions
    if (stats.errorRate > 0.1) {
      suggestions.push({
        type: 'errors',
        severity: 'high',
        message: 'High error rate detected. Check microphone quality and system resources.',
        action: 'Test microphone in Windows settings and ensure adequate RAM/CPU'
      });
    }

    return suggestions;
  }

  // Cleanup
  destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }

    // Remove event listeners
    if (typeof ipcRenderer !== 'undefined') {
      ipcRenderer.removeAllListeners('transcription');
      ipcRenderer.removeAllListeners('transcription-partial');
      ipcRenderer.removeAllListeners('recording-start');
      ipcRenderer.removeAllListeners('recording-stop');
      ipcRenderer.removeAllListeners('theme-changed');
    }

    console.log('Performance monitoring destroyed');
  }

  // Export data for debugging
  exportMetrics() {
    const report = this.getPerformanceReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sonu-performance-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
  }
}

// Singleton instance
let performanceMonitorInstance = null;

function getPerformanceMonitor() {
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = new PerformanceMonitor();
  }
  return performanceMonitorInstance;
}

// Global error handler integration
window.addEventListener('error', (event) => {
  const monitor = getPerformanceMonitor();
  monitor.recordError(event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    message: event.message
  });
});

window.addEventListener('unhandledrejection', (event) => {
  const monitor = getPerformanceMonitor();
  monitor.recordError(event.reason, {
    type: 'unhandled_promise_rejection'
  });
});

// Make available globally
window.PerformanceMonitor = PerformanceMonitor;
window.getPerformanceMonitor = getPerformanceMonitor;

module.exports = { PerformanceMonitor, getPerformanceMonitor };