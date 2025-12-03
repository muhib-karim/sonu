/**
 * Plugin System Architecture for SONU
 * Provides extensible functionality through plugins
 */

class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.hooks = new Map();
    this.enabled = true;
    this.pluginPath = null;
    this.loadedPlugins = [];
    
    this.initializeHooks();
  }

  initializeHooks() {
    // Define available hooks for plugins
    const availableHooks = [
      // Transcription hooks
      'beforeTranscription',
      'afterTranscription',
      'onPartialTranscription',
      
      // Recording hooks
      'onRecordingStart',
      'onRecordingStop',
      
      // Text processing hooks
      'beforeTextOutput',
      'afterTextOutput',
      'onStyleTransform',
      
      // UI hooks
      'onPageNavigate',
      'onSettingsChange',
      'onThemeChange',
      
      // Model hooks
      'onModelLoad',
      'onModelDownloadStart',
      'onModelDownloadComplete',
      
      // App lifecycle hooks
      'onAppReady',
      'onAppClose',
      'onWindowFocus',
      'onWindowBlur'
    ];

    availableHooks.forEach(hook => {
      this.hooks.set(hook, []);
    });
  }

  // Plugin Registration
  register(plugin) {
    if (!this.validatePlugin(plugin)) {
      console.error('Invalid plugin:', plugin.name || 'Unknown');
      return false;
    }

    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin ${plugin.id} already registered`);
      return false;
    }

    this.plugins.set(plugin.id, {
      ...plugin,
      enabled: true,
      loadedAt: Date.now()
    });

    // Register plugin hooks
    if (plugin.hooks) {
      Object.entries(plugin.hooks).forEach(([hookName, handler]) => {
        this.addHook(hookName, handler, plugin.id);
      });
    }

    // Initialize plugin
    if (plugin.init && typeof plugin.init === 'function') {
      try {
        plugin.init(this.getPluginAPI(plugin.id));
      } catch (error) {
        console.error(`Failed to initialize plugin ${plugin.id}:`, error);
        this.plugins.delete(plugin.id);
        return false;
      }
    }

    console.log(`Plugin registered: ${plugin.name} (${plugin.id})`);
    this.loadedPlugins.push(plugin.id);
    return true;
  }

  unregister(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`Plugin ${pluginId} not found`);
      return false;
    }

    // Call plugin cleanup
    if (plugin.destroy && typeof plugin.destroy === 'function') {
      try {
        plugin.destroy();
      } catch (error) {
        console.error(`Error destroying plugin ${pluginId}:`, error);
      }
    }

    // Remove plugin hooks
    this.hooks.forEach((handlers, hookName) => {
      this.hooks.set(hookName, handlers.filter(h => h.pluginId !== pluginId));
    });

    this.plugins.delete(pluginId);
    this.loadedPlugins = this.loadedPlugins.filter(id => id !== pluginId);
    console.log(`Plugin unregistered: ${pluginId}`);
    return true;
  }

  validatePlugin(plugin) {
    if (!plugin) return false;
    if (!plugin.id || typeof plugin.id !== 'string') return false;
    if (!plugin.name || typeof plugin.name !== 'string') return false;
    if (!plugin.version || typeof plugin.version !== 'string') return false;
    return true;
  }

  // Hook Management
  addHook(hookName, handler, pluginId) {
    if (!this.hooks.has(hookName)) {
      console.warn(`Unknown hook: ${hookName}`);
      return false;
    }

    const handlers = this.hooks.get(hookName);
    handlers.push({
      handler,
      pluginId,
      priority: handler.priority || 10
    });

    // Sort by priority (lower runs first)
    handlers.sort((a, b) => a.priority - b.priority);
    return true;
  }

  removeHook(hookName, pluginId) {
    if (!this.hooks.has(hookName)) return false;

    const handlers = this.hooks.get(hookName);
    this.hooks.set(hookName, handlers.filter(h => h.pluginId !== pluginId));
    return true;
  }

  // Execute hooks
  async executeHook(hookName, data = {}) {
    if (!this.enabled) return data;
    if (!this.hooks.has(hookName)) {
      console.warn(`Unknown hook: ${hookName}`);
      return data;
    }

    const handlers = this.hooks.get(hookName);
    let result = data;

    for (const { handler, pluginId } of handlers) {
      const plugin = this.plugins.get(pluginId);
      if (!plugin || !plugin.enabled) continue;

      try {
        const handlerResult = await handler(result);
        if (handlerResult !== undefined) {
          result = handlerResult;
        }
      } catch (error) {
        console.error(`Error in hook ${hookName} from plugin ${pluginId}:`, error);
      }
    }

    return result;
  }

  // Plugin API provided to plugins
  getPluginAPI(pluginId) {
    return {
      // Storage API
      storage: {
        get: (key) => this.getPluginStorage(pluginId, key),
        set: (key, value) => this.setPluginStorage(pluginId, key, value),
        remove: (key) => this.removePluginStorage(pluginId, key),
        clear: () => this.clearPluginStorage(pluginId)
      },
      
      // UI API
      ui: {
        showNotification: (message, type = 'info') => this.showNotification(message, type),
        addMenuItem: (menuItem) => this.addMenuItem(pluginId, menuItem),
        addSettingsPanel: (panel) => this.addSettingsPanel(pluginId, panel),
        injectCSS: (css) => this.injectPluginCSS(pluginId, css)
      },
      
      // App API
      app: {
        getSettings: () => this.getAppSettings(),
        getSetting: (key) => this.getAppSetting(key),
        getVersion: () => this.getAppVersion(),
        getActiveModel: () => this.getActiveModel()
      },
      
      // Events API
      events: {
        on: (event, handler) => this.addHook(event, handler, pluginId),
        off: (event) => this.removeHook(event, pluginId),
        emit: (event, data) => this.executeHook(event, data)
      },
      
      // Logger API
      logger: {
        log: (...args) => console.log(`[${pluginId}]`, ...args),
        warn: (...args) => console.warn(`[${pluginId}]`, ...args),
        error: (...args) => console.error(`[${pluginId}]`, ...args),
        debug: (...args) => console.debug(`[${pluginId}]`, ...args)
      }
    };
  }

  // Plugin Storage
  getPluginStorage(pluginId, key) {
    try {
      const storage = JSON.parse(localStorage.getItem(`sonu_plugin_${pluginId}`) || '{}');
      return key ? storage[key] : storage;
    } catch (e) {
      return key ? null : {};
    }
  }

  setPluginStorage(pluginId, key, value) {
    try {
      const storage = this.getPluginStorage(pluginId);
      storage[key] = value;
      localStorage.setItem(`sonu_plugin_${pluginId}`, JSON.stringify(storage));
      return true;
    } catch (e) {
      return false;
    }
  }

  removePluginStorage(pluginId, key) {
    try {
      const storage = this.getPluginStorage(pluginId);
      delete storage[key];
      localStorage.setItem(`sonu_plugin_${pluginId}`, JSON.stringify(storage));
      return true;
    } catch (e) {
      return false;
    }
  }

  clearPluginStorage(pluginId) {
    try {
      localStorage.removeItem(`sonu_plugin_${pluginId}`);
      return true;
    } catch (e) {
      return false;
    }
  }

  // UI Integration
  showNotification(message, type = 'info') {
    if (typeof window !== 'undefined' && window.showMessage) {
      window.showMessage(message);
    } else {
      console.log(`[Notification] ${type}: ${message}`);
    }
  }

  addMenuItem(pluginId, menuItem) {
    // Store menu items for later injection
    if (!this.menuItems) this.menuItems = [];
    this.menuItems.push({ ...menuItem, pluginId });
  }

  addSettingsPanel(pluginId, panel) {
    // Store settings panels for later injection
    if (!this.settingsPanels) this.settingsPanels = [];
    this.settingsPanels.push({ ...panel, pluginId });
  }

  injectPluginCSS(pluginId, css) {
    if (typeof document === 'undefined') return;
    
    const existingStyle = document.getElementById(`plugin-css-${pluginId}`);
    if (existingStyle) {
      existingStyle.textContent = css;
    } else {
      const style = document.createElement('style');
      style.id = `plugin-css-${pluginId}`;
      style.textContent = css;
      document.head.appendChild(style);
    }
  }

  // App integration helpers
  getAppSettings() {
    try {
      if (typeof window !== 'undefined' && window.voiceApp && window.voiceApp.getAppSettings) {
        return window.voiceApp.getAppSettings();
      }
    } catch (e) {}
    return {};
  }

  getAppSetting(key) {
    const settings = this.getAppSettings();
    return settings[key];
  }

  getAppVersion() {
    try {
      const versionEl = document.getElementById('app-version');
      if (versionEl) {
        const match = versionEl.textContent.match(/v?([\d.]+)/);
        return match ? match[1] : '0.0.0';
      }
    } catch (e) {}
    return '0.0.0';
  }

  getActiveModel() {
    try {
      if (typeof window !== 'undefined' && window.voiceApp && window.voiceApp.getSettings) {
        return window.voiceApp.getSettings().then(s => s.activeModel || 'tiny');
      }
    } catch (e) {}
    return 'tiny';
  }

  // Plugin state management
  enable(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.enabled = true;
      return true;
    }
    return false;
  }

  disable(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.enabled = false;
      return true;
    }
    return false;
  }

  isEnabled(pluginId) {
    const plugin = this.plugins.get(pluginId);
    return plugin ? plugin.enabled : false;
  }

  // Get plugin information
  getPlugin(pluginId) {
    return this.plugins.get(pluginId);
  }

  getPlugins() {
    return Array.from(this.plugins.values());
  }

  getLoadedPlugins() {
    return [...this.loadedPlugins];
  }

  getAvailableHooks() {
    return Array.from(this.hooks.keys());
  }

  // Destroy all plugins
  destroy() {
    this.plugins.forEach((plugin, pluginId) => {
      this.unregister(pluginId);
    });
    this.hooks.clear();
    this.loadedPlugins = [];
    console.log('Plugin manager destroyed');
  }
}

// Singleton instance
let pluginManagerInstance = null;

function getPluginManager() {
  if (!pluginManagerInstance) {
    pluginManagerInstance = new PluginManager();
  }
  return pluginManagerInstance;
}

// Make available globally
if (typeof window !== 'undefined') {
  window.PluginManager = PluginManager;
  window.getPluginManager = getPluginManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PluginManager, getPluginManager };
}
