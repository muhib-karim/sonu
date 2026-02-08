/**
 * Feature Flags Module
 * 
 * Manages feature flags for gradual rollouts and A/B testing.
 * 
 * @module featureFlags
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { app } = require('electron');

class FeatureFlags {
  constructor() {
    this.flags = new Map();
    this.userId = null;
    this.loadFlags();
  }

  /**
   * Load feature flags from YAML file
   */
  loadFlags() {
    try {
      const configPath = path.join(__dirname, '..', '..', 'feature-flags.yml');
      
      if (!fs.existsSync(configPath)) {
        console.warn('[FeatureFlags] feature-flags.yml not found, using defaults');
        return;
      }

      const file = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(file);

      // Parse flags
      if (config.flags) {
        config.flags.forEach(flag => {
          this.flags.set(flag.name, {
            description: flag.description,
            default: flag.default,
            rolloutPercentage: flag.rollout_percentage || 0
          });
        });
      }

      console.log(`[FeatureFlags] Loaded ${this.flags.size} feature flags`);
    } catch (error) {
      console.error('[FeatureFlags] Failed to load flags:', error);
    }
  }

  /**
   * Initialize with user ID for percentage-based rollouts
   * @param {string} userId - Unique user identifier
   */
  initialize(userId) {
    this.userId = userId;
    console.log('[FeatureFlags] Initialized for user:', userId);
  }

  /**
   * Check if a feature is enabled
   * @param {string} flagName - Feature flag name
   * @param {boolean} defaultValue - Default value if flag not found
   * @returns {boolean}
   */
  isEnabled(flagName, defaultValue = false) {
    const flag = this.flags.get(flagName);
    
    if (!flag) {
      return defaultValue;
    }

    // Check percentage-based rollout
    if (flag.rolloutPercentage < 100 && this.userId) {
      const userHash = this.hashUserId(this.userId + flagName);
      const userPercentile = userHash % 100;
      
      if (userPercentile >= flag.rolloutPercentage) {
        return false;
      }
    }

    return flag.default;
  }

  /**
   * Enable a feature flag (override)
   * @param {string} flagName 
   * @param {boolean} enabled 
   */
  setEnabled(flagName, enabled) {
    const flag = this.flags.get(flagName);
    if (flag) {
      flag.default = enabled;
      flag.rolloutPercentage = 100; // Override percentage
      console.log(`[FeatureFlags] ${flagName} set to ${enabled}`);
    }
  }

  /**
   * Get all feature flags with their status
   * @returns {Array}
   */
  getAllFlags() {
    const result = [];
    
    this.flags.forEach((value, key) => {
      result.push({
        name: key,
        description: value.description,
        enabled: this.isEnabled(key),
        rolloutPercentage: value.rolloutPercentage
      });
    });

    return result;
  }

  /**
   * Hash user ID for consistent percentage assignment
   * @param {string} str 
   * @returns {number}
   */
  hashUserId(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

// Singleton instance
let instance = null;

/**
 * Get feature flags instance
 * @returns {FeatureFlags}
 */
function getFeatureFlags() {
  if (!instance) {
    instance = new FeatureFlags();
  }
  return instance;
}

module.exports = {
  FeatureFlags,
  getFeatureFlags
};
