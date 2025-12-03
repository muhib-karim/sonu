/**
 * Memory Management System for SONU
 * Provides intelligent memory management, leak detection, and cleanup routines
 */

class MemoryManager {
  constructor() {
    this.memoryHistory = [];
    this.maxHistorySize = 100;
    this.warningThreshold = 500; // MB
    this.criticalThreshold = 800; // MB
    this.cleanupCallbacks = [];
    this.leakDetectionEnabled = true;
    this.lastCleanup = Date.now();
    this.cleanupInterval = 60000; // 1 minute
    this.monitorInterval = null;
    this.isInitialized = false;

    this.initialize();
  }

  initialize() {
    if (this.isInitialized) return;

    this.startMonitoring();
    this.setupCleanupRoutines();
    
    this.isInitialized = true;
    console.log('Memory manager initialized');
  }

  // Memory monitoring
  startMonitoring() {
    if (typeof window === 'undefined' || !performance.memory) {
      console.warn('Memory API not available');
      return;
    }

    this.monitorInterval = setInterval(() => {
      this.collectMemoryMetrics();
      this.checkMemoryPressure();
    }, 5000); // Check every 5 seconds
  }

  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  collectMemoryMetrics() {
    if (!performance.memory) return null;

    const metrics = {
      timestamp: Date.now(),
      usedJSHeapSize: performance.memory.usedJSHeapSize / (1024 * 1024), // MB
      totalJSHeapSize: performance.memory.totalJSHeapSize / (1024 * 1024), // MB
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit / (1024 * 1024) // MB
    };

    this.memoryHistory.push(metrics);
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }

    return metrics;
  }

  // Memory pressure detection
  checkMemoryPressure() {
    const currentUsage = this.getCurrentUsage();
    if (!currentUsage) return;

    if (currentUsage > this.criticalThreshold) {
      console.warn(`CRITICAL: Memory usage at ${currentUsage.toFixed(2)} MB`);
      this.performEmergencyCleanup();
      this.notifyMemoryPressure('critical', currentUsage);
    } else if (currentUsage > this.warningThreshold) {
      console.warn(`WARNING: Memory usage at ${currentUsage.toFixed(2)} MB`);
      this.performScheduledCleanup();
      this.notifyMemoryPressure('warning', currentUsage);
    }
  }

  getCurrentUsage() {
    if (!performance.memory) return null;
    return performance.memory.usedJSHeapSize / (1024 * 1024);
  }

  getPeakUsage() {
    if (this.memoryHistory.length === 0) return 0;
    return Math.max(...this.memoryHistory.map(m => m.usedJSHeapSize));
  }

  getAverageUsage() {
    if (this.memoryHistory.length === 0) return 0;
    const sum = this.memoryHistory.reduce((acc, m) => acc + m.usedJSHeapSize, 0);
    return sum / this.memoryHistory.length;
  }

  // Leak detection
  detectMemoryLeak() {
    if (!this.leakDetectionEnabled || this.memoryHistory.length < 20) {
      return { detected: false };
    }

    // Check if memory is consistently increasing
    const recentHistory = this.memoryHistory.slice(-20);
    let increasingCount = 0;
    
    for (let i = 1; i < recentHistory.length; i++) {
      if (recentHistory[i].usedJSHeapSize > recentHistory[i - 1].usedJSHeapSize) {
        increasingCount++;
      }
    }

    // If memory increased in more than 80% of samples, possible leak
    const leakDetected = increasingCount / (recentHistory.length - 1) > 0.8;
    
    if (leakDetected) {
      const firstUsage = recentHistory[0].usedJSHeapSize;
      const lastUsage = recentHistory[recentHistory.length - 1].usedJSHeapSize;
      const growth = lastUsage - firstUsage;
      const timeSpan = recentHistory[recentHistory.length - 1].timestamp - recentHistory[0].timestamp;
      const growthRate = growth / (timeSpan / 1000 / 60); // MB per minute

      return {
        detected: true,
        growth: growth,
        growthRate: growthRate,
        currentUsage: lastUsage,
        message: `Memory leak detected: ${growth.toFixed(2)} MB growth (${growthRate.toFixed(2)} MB/min)`
      };
    }

    return { detected: false };
  }

  // Cleanup routines
  setupCleanupRoutines() {
    // Register default cleanup callbacks
    this.registerCleanup(() => this.clearImageCache());
    this.registerCleanup(() => this.clearDOMCache());
    this.registerCleanup(() => this.clearEventListeners());
    this.registerCleanup(() => this.compactHistory());
    
    // Periodic cleanup
    setInterval(() => {
      const timeSinceLastCleanup = Date.now() - this.lastCleanup;
      if (timeSinceLastCleanup > this.cleanupInterval) {
        this.performScheduledCleanup();
      }
    }, this.cleanupInterval);
  }

  registerCleanup(callback) {
    if (typeof callback === 'function') {
      this.cleanupCallbacks.push(callback);
    }
  }

  performScheduledCleanup() {
    console.log('Performing scheduled memory cleanup...');
    this.executeCleanup(false);
  }

  performEmergencyCleanup() {
    console.log('Performing emergency memory cleanup...');
    this.executeCleanup(true);
  }

  executeCleanup(aggressive = false) {
    let freedMemory = 0;
    const beforeUsage = this.getCurrentUsage() || 0;

    this.cleanupCallbacks.forEach(callback => {
      try {
        callback(aggressive);
      } catch (e) {
        console.error('Cleanup callback error:', e);
      }
    });

    // Force garbage collection if available (V8)
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
    }

    // Request garbage collection via performance API
    if (performance.measureUserAgentSpecificMemory) {
      performance.measureUserAgentSpecificMemory().catch(() => {});
    }

    const afterUsage = this.getCurrentUsage() || 0;
    freedMemory = Math.max(0, beforeUsage - afterUsage);

    this.lastCleanup = Date.now();
    console.log(`Memory cleanup complete. Freed: ${freedMemory.toFixed(2)} MB`);

    return freedMemory;
  }

  // Default cleanup implementations
  clearImageCache() {
    if (typeof document === 'undefined') return;
    
    // Clear unused image references
    const images = document.querySelectorAll('img[data-cache="true"]');
    images.forEach(img => {
      if (!img.isConnected || !this.isElementVisible(img)) {
        img.src = '';
        img.remove();
      }
    });
  }

  clearDOMCache() {
    if (typeof document === 'undefined') return;
    
    // Remove detached DOM nodes
    const cacheContainers = document.querySelectorAll('[data-cache-container]');
    cacheContainers.forEach(container => {
      while (container.children.length > 50) {
        container.firstChild.remove();
      }
    });
  }

  clearEventListeners() {
    // Clear cached event listeners (implementation depends on how listeners are tracked)
    if (typeof window !== 'undefined' && window._eventListenerCache) {
      const cache = window._eventListenerCache;
      Object.keys(cache).forEach(key => {
        if (cache[key].weak) {
          delete cache[key];
        }
      });
    }
  }

  compactHistory() {
    // Compact transcription history if too large
    try {
      const historyData = localStorage.getItem('sonu_history');
      if (historyData) {
        const history = JSON.parse(historyData);
        if (history.length > 1000) {
          const compacted = history.slice(-500);
          localStorage.setItem('sonu_history', JSON.stringify(compacted));
          console.log(`Compacted history: ${history.length} -> ${compacted.length} items`);
        }
      }
    } catch (e) {}
  }

  isElementVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  // Memory optimization suggestions
  getOptimizationSuggestions() {
    const suggestions = [];
    const currentUsage = this.getCurrentUsage() || 0;
    const peakUsage = this.getPeakUsage();
    const leakCheck = this.detectMemoryLeak();

    if (leakCheck.detected) {
      suggestions.push({
        type: 'leak',
        severity: 'high',
        message: leakCheck.message,
        action: 'Restart application to clear memory leaks'
      });
    }

    if (currentUsage > this.warningThreshold) {
      suggestions.push({
        type: 'usage',
        severity: currentUsage > this.criticalThreshold ? 'critical' : 'warning',
        message: `High memory usage: ${currentUsage.toFixed(2)} MB`,
        action: 'Consider using a smaller Whisper model or clearing history'
      });
    }

    if (peakUsage > this.criticalThreshold) {
      suggestions.push({
        type: 'peak',
        severity: 'warning',
        message: `Peak memory reached: ${peakUsage.toFixed(2)} MB`,
        action: 'Monitor for memory spikes during heavy usage'
      });
    }

    // Check localStorage usage
    try {
      let totalStorage = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalStorage += localStorage[key].length * 2; // Approximate bytes (UTF-16)
        }
      }
      const storageMB = totalStorage / (1024 * 1024);
      if (storageMB > 5) {
        suggestions.push({
          type: 'storage',
          severity: 'low',
          message: `Local storage usage: ${storageMB.toFixed(2)} MB`,
          action: 'Clear application cache in Settings'
        });
      }
    } catch (e) {}

    return suggestions;
  }

  // Notification
  notifyMemoryPressure(level, usage) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('memoryPressure', {
        detail: { level, usage }
      }));
    }

    // Show user notification for critical levels
    if (level === 'critical' && typeof window !== 'undefined' && window.showMessage) {
      window.showMessage('High memory usage detected. Consider restarting the app.');
    }
  }

  // Statistics
  getStats() {
    return {
      currentUsage: this.getCurrentUsage(),
      peakUsage: this.getPeakUsage(),
      averageUsage: this.getAverageUsage(),
      historyLength: this.memoryHistory.length,
      lastCleanup: this.lastCleanup,
      leakDetection: this.detectMemoryLeak(),
      suggestions: this.getOptimizationSuggestions()
    };
  }

  // Export memory report
  exportReport() {
    return {
      timestamp: new Date().toISOString(),
      stats: this.getStats(),
      history: this.memoryHistory.slice(-50),
      thresholds: {
        warning: this.warningThreshold,
        critical: this.criticalThreshold
      }
    };
  }

  // Configuration
  setWarningThreshold(mb) {
    this.warningThreshold = mb;
  }

  setCriticalThreshold(mb) {
    this.criticalThreshold = mb;
  }

  setLeakDetection(enabled) {
    this.leakDetectionEnabled = enabled;
  }

  destroy() {
    this.stopMonitoring();
    this.cleanupCallbacks = [];
    this.memoryHistory = [];
    console.log('Memory manager destroyed');
  }
}

// Singleton instance
let memoryManagerInstance = null;

function getMemoryManager() {
  if (!memoryManagerInstance) {
    memoryManagerInstance = new MemoryManager();
  }
  return memoryManagerInstance;
}

// Make available globally
if (typeof window !== 'undefined') {
  window.MemoryManager = MemoryManager;
  window.getMemoryManager = getMemoryManager;

  // Listen for memory pressure events
  window.addEventListener('memoryPressure', (event) => {
    console.log('Memory pressure event:', event.detail);
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MemoryManager, getMemoryManager };
}
