/**
 * Lazy Model Loading System for SONU
 * Implements intelligent model loading with predictive preloading based on usage patterns
 */

class ModelLoader {
  constructor() {
    this.loadedModels = new Map();
    this.loadingPromises = new Map();
    this.usageHistory = [];
    this.maxHistory = 100;
    this.preloadQueue = [];
    this.isPreloading = false;
    this.modelSizes = {
      'tiny': 75,      // MB
      'base': 150,     // MB
      'small': 450,    // MB
      'medium': 1500,  // MB
      'large': 3000    // MB
    };
    this.isInitialized = false;

    this.initialize();
  }

  initialize() {
    if (this.isInitialized) return;

    this.loadUsageHistory();
    this.setupPreloadingStrategy();
    
    this.isInitialized = true;
    console.log('Model loader initialized');
  }

  // Load model lazily
  async loadModel(modelName, options = {}) {
    const { force = false, priority = 'normal' } = options;

    // Check if already loaded
    if (!force && this.loadedModels.has(modelName)) {
      console.log(`Model ${modelName} already loaded`);
      this.recordUsage(modelName);
      return this.loadedModels.get(modelName);
    }

    // Check if currently loading
    if (this.loadingPromises.has(modelName)) {
      console.log(`Model ${modelName} is loading, waiting...`);
      return this.loadingPromises.get(modelName);
    }

    // Start loading
    console.log(`Loading model ${modelName}...`);
    
    const loadPromise = this.doLoadModel(modelName, priority);
    this.loadingPromises.set(modelName, loadPromise);

    try {
      const model = await loadPromise;
      this.loadedModels.set(modelName, model);
      this.recordUsage(modelName);
      
      // Trigger predictive preloading
      this.triggerPredictivePreload(modelName);
      
      return model;
    } catch (error) {
      console.error(`Failed to load model ${modelName}:`, error);
      throw error;
    } finally {
      this.loadingPromises.delete(modelName);
    }
  }

  async doLoadModel(modelName, priority) {
    // Notify IPC to load model in whisper service
    if (typeof window !== 'undefined' && window.voiceApp) {
      return window.voiceApp.loadWhisperModel(modelName, { priority });
    }

    // Fallback: return model info
    return {
      name: modelName,
      size: this.modelSizes[modelName] || 0,
      loadedAt: Date.now()
    };
  }

  // Unload model to free memory
  async unloadModel(modelName) {
    if (!this.loadedModels.has(modelName)) {
      return false;
    }

    console.log(`Unloading model ${modelName}...`);

    // Notify IPC to unload model
    if (typeof window !== 'undefined' && window.voiceApp && window.voiceApp.unloadWhisperModel) {
      await window.voiceApp.unloadWhisperModel(modelName);
    }

    this.loadedModels.delete(modelName);
    return true;
  }

  // Check if model is loaded
  isLoaded(modelName) {
    return this.loadedModels.has(modelName);
  }

  // Check if model is loading
  isLoading(modelName) {
    return this.loadingPromises.has(modelName);
  }

  // Get loaded models
  getLoadedModels() {
    return Array.from(this.loadedModels.keys());
  }

  // Usage tracking for predictive loading
  recordUsage(modelName) {
    this.usageHistory.push({
      model: modelName,
      timestamp: Date.now(),
      hour: new Date().getHours(),
      dayOfWeek: new Date().getDay()
    });

    // Trim history
    if (this.usageHistory.length > this.maxHistory) {
      this.usageHistory = this.usageHistory.slice(-this.maxHistory);
    }

    this.saveUsageHistory();
  }

  // Predictive preloading
  setupPreloadingStrategy() {
    // Check for preload opportunities every minute
    setInterval(() => {
      this.checkPreloadOpportunity();
    }, 60000);

    // Initial check
    setTimeout(() => {
      this.checkPreloadOpportunity();
    }, 5000);
  }

  checkPreloadOpportunity() {
    const prediction = this.predictNextModel();
    
    if (prediction && prediction.confidence > 0.6) {
      const modelToPreload = prediction.model;
      
      if (!this.isLoaded(modelToPreload) && !this.isLoading(modelToPreload)) {
        console.log(`Preloading predicted model: ${modelToPreload} (confidence: ${prediction.confidence.toFixed(2)})`);
        this.preloadModel(modelToPreload);
      }
    }
  }

  predictNextModel() {
    if (this.usageHistory.length < 5) {
      // Not enough data for prediction
      return null;
    }

    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();

    // Analyze usage patterns
    const modelCounts = {};
    const timeWeightedCounts = {};

    this.usageHistory.forEach((usage, index) => {
      const model = usage.model;
      const recency = (index + 1) / this.usageHistory.length;
      const timeMatch = this.getTimeMatchScore(usage.hour, currentHour, usage.dayOfWeek, currentDay);
      
      modelCounts[model] = (modelCounts[model] || 0) + 1;
      timeWeightedCounts[model] = (timeWeightedCounts[model] || 0) + recency * timeMatch;
    });

    // Find best prediction
    let bestModel = null;
    let bestScore = 0;

    Object.entries(timeWeightedCounts).forEach(([model, score]) => {
      const frequency = modelCounts[model] / this.usageHistory.length;
      const combinedScore = score * 0.7 + frequency * 0.3;
      
      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestModel = model;
      }
    });

    return bestModel ? { model: bestModel, confidence: Math.min(1, bestScore) } : null;
  }

  getTimeMatchScore(usageHour, currentHour, usageDay, currentDay) {
    const hourDiff = Math.abs(usageHour - currentHour);
    const hourScore = Math.max(0, 1 - hourDiff / 6); // Higher score if within 6 hours

    const dayMatch = usageDay === currentDay ? 0.3 : 0;

    return hourScore + dayMatch;
  }

  async preloadModel(modelName) {
    if (this.isPreloading) {
      this.preloadQueue.push(modelName);
      return;
    }

    this.isPreloading = true;

    try {
      await this.loadModel(modelName, { priority: 'low' });
      console.log(`Preloaded model: ${modelName}`);
    } catch (error) {
      console.warn(`Failed to preload model ${modelName}:`, error);
    } finally {
      this.isPreloading = false;
      
      // Process queue
      if (this.preloadQueue.length > 0) {
        const next = this.preloadQueue.shift();
        this.preloadModel(next);
      }
    }
  }

  triggerPredictivePreload(justLoadedModel) {
    // After loading a model, check if we should preload another
    const prediction = this.predictNextModel();
    
    if (prediction && prediction.model !== justLoadedModel && prediction.confidence > 0.7) {
      // Add to preload queue with low priority
      if (!this.preloadQueue.includes(prediction.model)) {
        this.preloadQueue.push(prediction.model);
        
        // Start preloading if not already
        if (!this.isPreloading) {
          const next = this.preloadQueue.shift();
          this.preloadModel(next);
        }
      }
    }
  }

  // Memory-aware model management
  async ensureMemoryForModel(modelName) {
    const requiredSize = this.modelSizes[modelName] || 500;
    const currentUsage = this.getEstimatedMemoryUsage();
    const available = this.getAvailableMemory();

    if (currentUsage + requiredSize > available * 0.8) {
      // Need to free memory
      console.log('Memory pressure detected, unloading unused models...');
      
      const modelsToUnload = this.getModelsToUnload(requiredSize);
      
      for (const model of modelsToUnload) {
        await this.unloadModel(model);
      }
    }
  }

  getEstimatedMemoryUsage() {
    let total = 0;
    this.loadedModels.forEach((info, modelName) => {
      total += this.modelSizes[modelName] || 0;
    });
    return total;
  }

  getAvailableMemory() {
    // Estimate available memory (default to 4GB)
    if (typeof navigator !== 'undefined' && navigator.deviceMemory) {
      return navigator.deviceMemory * 1024; // Convert GB to MB
    }
    return 4096; // Default 4GB
  }

  getModelsToUnload(requiredSpace) {
    const candidates = [];
    const now = Date.now();

    this.loadedModels.forEach((info, modelName) => {
      // Calculate priority for unloading
      const lastUsage = this.getLastUsageTime(modelName);
      const timeSinceUse = now - lastUsage;
      const size = this.modelSizes[modelName] || 0;
      
      candidates.push({
        model: modelName,
        priority: timeSinceUse / 3600000 + size / 1000, // Higher = more likely to unload
        size
      });
    });

    // Sort by priority (highest = unload first)
    candidates.sort((a, b) => b.priority - a.priority);

    const toUnload = [];
    let freedSpace = 0;

    for (const candidate of candidates) {
      if (freedSpace >= requiredSpace) break;
      toUnload.push(candidate.model);
      freedSpace += candidate.size;
    }

    return toUnload;
  }

  getLastUsageTime(modelName) {
    for (let i = this.usageHistory.length - 1; i >= 0; i--) {
      if (this.usageHistory[i].model === modelName) {
        return this.usageHistory[i].timestamp;
      }
    }
    return 0;
  }

  // Persistence
  saveUsageHistory() {
    try {
      localStorage.setItem('sonu_model_usage', JSON.stringify(this.usageHistory));
    } catch (e) {}
  }

  loadUsageHistory() {
    try {
      const saved = localStorage.getItem('sonu_model_usage');
      if (saved) {
        this.usageHistory = JSON.parse(saved);
      }
    } catch (e) {}
  }

  // Get model loading stats
  getStats() {
    const prediction = this.predictNextModel();
    
    return {
      loadedModels: this.getLoadedModels(),
      loadingModels: Array.from(this.loadingPromises.keys()),
      preloadQueue: [...this.preloadQueue],
      isPreloading: this.isPreloading,
      memoryUsage: this.getEstimatedMemoryUsage(),
      usageHistorySize: this.usageHistory.length,
      prediction: prediction
    };
  }

  destroy() {
    this.loadedModels.clear();
    this.loadingPromises.clear();
    this.preloadQueue = [];
    console.log('Model loader destroyed');
  }
}

// Singleton instance
let modelLoaderInstance = null;

function getModelLoader() {
  if (!modelLoaderInstance) {
    modelLoaderInstance = new ModelLoader();
  }
  return modelLoaderInstance;
}

// Make available globally
if (typeof window !== 'undefined') {
  window.ModelLoader = ModelLoader;
  window.getModelLoader = getModelLoader;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ModelLoader, getModelLoader };
}
