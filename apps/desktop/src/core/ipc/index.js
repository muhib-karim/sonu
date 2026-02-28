/**
 * IPC Handlers Index
 * Centralizes all IPC handler registrations
 */

const SettingsIPC = require('./SettingsIPC');
const ModelIPC = require('./ModelIPC');
const RecordingIPC = require('./RecordingIPC');
const HistoryIPC = require('./HistoryIPC');
const SystemIPC = require('./SystemIPC');
const DataIPC = require('./DataIPC');

class IPCHandlers {
  constructor(options = {}) {
    this.ipcMain = options.ipcMain;
    this.app = options.app;
    this.windowManager = options.windowManager;
    this.trayManager = options.trayManager;
    this.pythonManager = options.pythonManager;
    this.hotkeyManager = options.hotkeyManager;
    this.typingManager = options.typingManager;
    this.settings = options.settings;
    this.__dirname = options.__dirname;
    this.logger = options.logger || null;
    this.modelDownloader = options.modelDownloader || null;
    this.llmManager = options.llmManager || null;
    this.contextManager = options.contextManager || null;

    // Individual IPC modules
    this.settingsIPC = new SettingsIPC({
      ipcMain: this.ipcMain,
      app: this.app,
      settings: this.settings,
      __dirname: this.__dirname,
      logger: this.logger,
      windowManager: this.windowManager,
      pythonManager: this.pythonManager,
      hotkeyManager: this.hotkeyManager,
      trayManager: this.trayManager,
      llmManager: this.llmManager
    });

    this.modelIPC = new ModelIPC({
      ipcMain: this.ipcMain,
      app: this.app,
      settings: this.settings,
      __dirname: this.__dirname,
      logger: this.logger,
      windowManager: this.windowManager,
      pythonManager: this.pythonManager,
      modelDownloader: this.modelDownloader
    });

    this.recordingIPC = new RecordingIPC({
      ipcMain: this.ipcMain,
      settings: this.settings,
      windowManager: this.windowManager,
      pythonManager: this.pythonManager,
      hotkeyManager: this.hotkeyManager,
      typingManager: this.typingManager
    });

    this.historyIPC = new HistoryIPC({
      ipcMain: this.ipcMain,
      __dirname: this.__dirname,
      windowManager: this.windowManager
    });

    this.systemIPC = new SystemIPC({
      ipcMain: this.ipcMain,
      app: this.app,
      __dirname: this.__dirname,
      settings: this.settings,
      modelDownloader: this.modelDownloader
    });

    this.dataIPC = new DataIPC({
      ipcMain: this.ipcMain,
      app: this.app,
      __dirname: this.__dirname,
      windowManager: this.windowManager,
      settings: this.settings
    });
  }

  /**
   * Register all IPC handlers
   */
  registerAll() {
    // Window control handlers
    this.registerWindowHandlers();
    
    // Widget handlers
    this.registerWidgetHandlers();
    
    // Settings handlers
    this.settingsIPC.register();
    
    // Model handlers
    this.modelIPC.register();
    
    // Recording handlers
    this.recordingIPC.register();
    
    // History handlers
    this.historyIPC.register();
    
    // System handlers
    this.systemIPC.register();
    
    // Data handlers (dictionary, snippets, notes, personas)
    this.dataIPC.register();
    
    // App settings handlers
    this.registerAppSettingsHandlers();
    
    // LLM handlers
    this.registerLLMHandlers();
    
    // Context handlers
    this.registerContextHandlers();
    
    // Style handlers
    this.registerStyleHandlers();
    
    // Stats handlers
    this.registerStatsHandlers();
    
    // Translation handlers
    this.registerTranslationHandlers();
    
    // Clipboard handlers
    this.registerClipboardHandlers();
    
    // Theme handlers
    this.registerThemeHandlers();
    
    // Groq handlers
    this.registerGroqHandlers();
    
    // Dictation language handlers
    this.registerDictationHandlers();
    
    // Logs handlers
    this.registerLogsHandlers();

    console.log('✓ All IPC handlers registered');
  }

  /**
   * Register window control handlers
   */
  registerWindowHandlers() {
    this.ipcMain.on('window-minimize', () => {
      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) mainWindow.minimize();
    });

    this.ipcMain.on('window-maximize', () => {
      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) {
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        } else {
          mainWindow.maximize();
        }
      }
    });

    this.ipcMain.on('window-close', () => {
      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) mainWindow.hide();
    });

    // Hotkey capture handlers
    this.ipcMain.on('hotkey-capture-start', () => {
      this.hotkeyManager.pauseHotkeys();
    });

    this.ipcMain.on('hotkey-capture-end', () => {
      this.hotkeyManager.resumeHotkeys();
    });
  }

  /**
   * Register widget handlers
   */
  registerWidgetHandlers() {
    this.ipcMain.on('widget-stop-recording', () => {
      console.log('[WIDGET] Stop button clicked');
      const recordingState = this.hotkeyManager.getRecordingState();
      if (recordingState.isRecording || recordingState.isHoldKeyPressed) {
        this.hotkeyManager.setRecordingState(false);
        this.windowManager.setWidgetState('processing');
        this.pythonManager.writeToWhisper('STOP\n');
        
        const mainWindow = this.windowManager.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('recording-stop');
        }
      }
    });

    this.ipcMain.on('widget-cancel-recording', () => {
      console.log('[WIDGET] Cancel button clicked');
      const recordingState = this.hotkeyManager.getRecordingState();
      if (recordingState.isRecording || recordingState.isHoldKeyPressed) {
        this.hotkeyManager.setRecordingState(false);
        this.windowManager.hideIndicator();
        
        const mainWindow = this.windowManager.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('recording-stop');
        }
      }
    });

    this.ipcMain.on('widget-hide', () => {
      this.windowManager.hideIndicator();
    });

    this.ipcMain.on('widget-set-state', (_evt, state) => {
      this.windowManager.setWidgetState(state);
    });
  }

  /**
   * Register app settings handlers
   */
  registerAppSettingsHandlers() {
    const fs = require('fs');
    const path = require('path');
    const appSettingsPath = path.join(this.__dirname, 'data', 'settings.json');

    // Ensure data directory exists
    const dataDir = path.join(this.__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.ipcMain.handle('app-settings:get', async () => {
      try {
        if (fs.existsSync(appSettingsPath)) {
          const raw = fs.readFileSync(appSettingsPath, 'utf8');
          return JSON.parse(raw);
        }
        return this.getDefaultSettings();
      } catch (e) {
        console.error('Error loading app settings:', e);
        return this.getDefaultSettings();
      }
    });

    this.ipcMain.handle('app-settings:set', async (_evt, newSettings) => {
      try {
        let currentSettings = {};
        if (fs.existsSync(appSettingsPath)) {
          const raw = fs.readFileSync(appSettingsPath, 'utf8');
          currentSettings = JSON.parse(raw);
        }
        const updated = { ...currentSettings, ...newSettings };
        fs.writeFileSync(appSettingsPath, JSON.stringify(updated, null, 2));

        // Handle model change
        if (newSettings.selected_model && newSettings.selected_model !== currentSettings.selected_model) {
          this.settings.activeModel = newSettings.selected_model;
          this.settings.selected_model = newSettings.selected_model;
          this.pythonManager.killWhisperProcess();
          setTimeout(() => this.pythonManager.ensureWhisperService(), 500);
        }

        return updated;
      } catch (e) {
        console.error('Error saving app settings:', e);
        return {};
      }
    });

    // Cache clear handler
    this.ipcMain.handle('cache:clear', async () => {
      try {
        const cacheDir = path.join(this.app.getPath('userData'), 'whisper-cache');
        if (fs.existsSync(cacheDir)) {
          fs.rmSync(cacheDir, { recursive: true, force: true });
        }
        return { success: true };
      } catch (e) {
        console.error('Error clearing cache:', e);
        return { success: false, error: e.message };
      }
    });
  }

  /**
   * Get default settings
   */
  getDefaultSettings() {
    return {
      theme: 'light',
      follow_system_theme: false,
      auto_model: false,
      selected_model: 'base',
      language: 'en',
      dictation_hotkey: 'Ctrl+Space',
      launch_on_startup: false,
      sound_feedback: true,
      vibe_coding_enabled: false,
      waveform_animation: true,
      continuous_dictation: false,
      low_latency: false,
      noise_reduction: false,
      local_only: true,
      auto_delete_cache: false
    };
  }

  /**
   * Register LLM handlers
   */
  registerLLMHandlers() {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const { spawn } = require('child_process');

    this.ipcMain.handle('llm:transform', async (_evt, { text, style, context }) => {
      const safeText = (text || '').replace(/\n/g, '\\n');
      const cmd = `TRANSFORM:${style}:${context || 'general'}:${safeText}`;
      this.pythonManager.writeToLLM(cmd);
      return { status: 'processing' };
    });

    this.ipcMain.handle('tools:refresh', async () => {
      this.pythonManager.writeToLLM('REFRESH_TOOLS');
      return { status: 'requested' };
    });

    this.ipcMain.handle('llm:status', async () => {
      return {
        running: !!(this.pythonManager.getLLMProcess() && !this.pythonManager.getLLMProcess().killed),
        ready: this.pythonManager.isLLMServiceReady()
      };
    });

    // LLM Model Management
    this.ipcMain.handle('llm:check-model', async () => {
      const MODEL_FILENAME = 'TinyLlama-1.1B-Chat-v1.0-Q4_K_M.gguf';
      const possiblePaths = [
        path.join(os.homedir(), '.sonu', 'models', 'llm', MODEL_FILENAME),
        path.join(this.app.getPath('userData'), 'models', 'llm', MODEL_FILENAME),
        path.join(this.__dirname, 'models', 'llm', MODEL_FILENAME),
        path.join(this.__dirname, 'data', 'models', 'llm', MODEL_FILENAME),
        path.join(this.__dirname, 'src', 'core', 'python', 'models', 'llm', MODEL_FILENAME),
      ];

      for (const modelPath of possiblePaths) {
        if (fs.existsSync(modelPath)) {
          return { exists: true, path: modelPath, ready: this.pythonManager.isLLMServiceReady() };
        }
      }

      return { exists: false, path: null, ready: false };
    });

    this.ipcMain.handle('llm:import-model', async () => {
      try {
        const { dialog } = require('electron');
        const mainWindow = this.windowManager.getMainWindow();
        
        const result = await dialog.showOpenDialog(mainWindow, {
          title: 'Import LLM Model',
          filters: [{ name: 'GGUF Models', extensions: ['gguf'] }],
          properties: ['openFile']
        });
        
        if (result.canceled || !result.filePaths.length) {
          return { success: false, canceled: true };
        }
        
        const sourcePath = result.filePaths[0];
        const llmModelsDir = path.join(this.app.getPath('userData'), 'models', 'llm');
        if (!fs.existsSync(llmModelsDir)) {
          fs.mkdirSync(llmModelsDir, { recursive: true });
        }
        
        const destPath = path.join(llmModelsDir, path.basename(sourcePath));
        fs.copyFileSync(sourcePath, destPath);
        return { success: true, path: destPath };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });

    this.ipcMain.handle('llm:get-status', async () => {
      return {
        ready: this.pythonManager.isLLMServiceReady(),
        processing: this.pythonManager.getLLMProcess() !== null,
        model: this.settings.post_process_model || 'lfm2-1b'
      };
    });
  }

  /**
   * Register context handlers
   */
  registerContextHandlers() {
    this.ipcMain.on('context:start-tracking', () => {
      if (this.contextManager) this.contextManager.start();
    });

    this.ipcMain.on('context:stop-tracking', () => {
      if (this.contextManager) this.contextManager.stop();
    });

    this.ipcMain.handle('context:set-auto-style', async (_evt, enabled) => {
      if (this.contextManager) {
        this.contextManager.setAutoStyleEnabled(enabled);
      }
      return { success: true, enabled };
    });

    this.ipcMain.handle('context:get-auto-style', async () => {
      return { enabled: this.contextManager ? this.contextManager.isAutoStyleEnabled() : false };
    });

    this.ipcMain.handle('context:get-current', async () => {
      try {
        const context = this.contextManager ? this.contextManager.getCurrentContext() : null;
        return { success: true, context };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
  }

  /**
   * Register style handlers
   */
  registerStyleHandlers() {
    const styleDescriptions = {
      personal: {
        casual: 'Relaxed, everyday language',
        formal: 'Professional and polished',
        friendly: 'Warm and approachable',
        concise: 'Brief and to the point'
      },
      professional: {
        business: 'Corporate communication style',
        technical: 'Precise technical language',
        academic: 'Scholarly and research-oriented',
        legal: 'Formal legal terminology'
      },
      creative: {
        storytelling: 'Narrative and engaging',
        poetic: 'Artistic and expressive',
        humorous: 'Light and entertaining',
        dramatic: 'Bold and impactful'
      }
    };

    const examples = {
      casual: 'Hey, just wanted to check in about the project.',
      formal: 'I am writing to inquire about the status of the project.',
      friendly: 'Hope you\'re doing well! Quick question about the project.',
      concise: 'Project status update needed.',
      business: 'Please find attached the quarterly report.',
      technical: 'The API endpoint returns a JSON response with status code 200.'
    };

    const banners = {
      personal: 'Express yourself naturally',
      professional: 'Communicate with confidence',
      creative: 'Unleash your creativity',
      coding: 'Code with precision'
    };

    this.ipcMain.handle('style:get-description', async (_evt, style, category) => {
      const cat = styleDescriptions[category] || styleDescriptions.personal;
      return cat[style] || 'Custom style';
    });

    this.ipcMain.handle('style:get-example', async (_evt, style) => {
      return examples[style] || 'Example text for this style.';
    });

    this.ipcMain.handle('style:get-available', async (_evt, category) => {
      const cat = styleDescriptions[category] || styleDescriptions.personal;
      return Object.keys(cat);
    });

    this.ipcMain.handle('style:get-banner-text', async (_evt, category) => {
      return banners[category] || 'Transform your text';
    });

    this.ipcMain.handle('style:detect-context', async () => {
      try {
        const context = this.contextManager ? this.contextManager.getCurrentContext() : null;
        return context || { category: 'personal', application: 'unknown' };
      } catch (e) {
        return { category: 'personal', application: 'unknown' };
      }
    });
  }

  /**
   * Register stats handlers
   */
  registerStatsHandlers() {
    this.ipcMain.handle('stats:get-wpm', async () => {
      return this.typingManager.getSessionStats();
    });

    this.ipcMain.handle('stats:reset', async () => {
      this.typingManager.resetSessionStats();
      return { success: true };
    });

    this.ipcMain.handle('stats:get-session', async () => {
      return this.typingManager.getSessionStats();
    });
  }

  /**
   * Register translation handlers
   */
  registerTranslationHandlers() {
    const fs = require('fs');
    const path = require('path');
    const { spawn } = require('child_process');

    this.ipcMain.handle('translation:translate', async (_evt, text, targetLang, sourceLang = 'en') => {
      try {
        const translationServicePath = path.join(this.__dirname, 'src', 'core', 'python', 'translation_service.py');

        if (!fs.existsSync(translationServicePath)) {
          return { error: 'Translation service not found', translated: text };
        }

        // Validate language codes to prevent injection (only allow a-z, A-Z, 0-9, -, _)
        const validLangPattern = /^[a-zA-Z0-9_-]+$/;
        if (!validLangPattern.test(sourceLang) || !validLangPattern.test(targetLang)) {
          return { error: 'Invalid language code', translated: text };
        }

        // Use spawn with argument array to prevent shell injection
        const pythonProcess = spawn('python', [
          translationServicePath,
          'translate',
          text,
          sourceLang,
          targetLang
        ], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
          output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        const result = await new Promise((resolve) => {
          pythonProcess.on('close', (code) => {
            if (code === 0 && output) {
              try {
                resolve({ success: true, data: JSON.parse(output.trim()) });
              } catch (e) {
                resolve({ success: false, error: 'Invalid JSON response from translation service' });
              }
            } else {
              resolve({ success: false, error: errorOutput || `Process exited with code ${code}` });
            }
          });

          pythonProcess.on('error', (err) => {
            resolve({ success: false, error: err.message });
          });
        });

        if (result.success) {
          return result.data;
        } else {
          console.error('Translation error:', result.error);
          return { error: result.error, translated: text };
        }
      } catch (error) {
        console.error('Translation error:', error);
        return { error: error.message, translated: text };
      }
    });

    this.ipcMain.handle('translation:check', async () => {
      try {
        const translationServicePath = path.join(this.__dirname, 'src', 'core', 'python', 'translation_service.py');

        if (!fs.existsSync(translationServicePath)) {
          return { available: false, error: 'Translation service not found' };
        }

        // Use spawn with argument array to prevent shell injection
        const pythonProcess = spawn('python', [
          translationServicePath,
          'check'
        ], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
          output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        const result = await new Promise((resolve) => {
          pythonProcess.on('close', (code) => {
            if (code === 0 && output) {
              try {
                resolve({ success: true, data: JSON.parse(output.trim()) });
              } catch (e) {
                resolve({ success: false, error: 'Invalid JSON response from translation service' });
              }
            } else {
              resolve({ success: false, error: errorOutput || `Process exited with code ${code}` });
            }
          });

          pythonProcess.on('error', (err) => {
            resolve({ success: false, error: err.message });
          });
        });

        if (result.success) {
          return result.data;
        } else {
          console.error('Translation check error:', result.error);
          return { available: false, error: result.error };
        }
      } catch (error) {
        console.error('Translation check error:', error);
        return { available: false, error: error.message };
      }
    });
  }

  /**
   * Register clipboard handlers
   */
  registerClipboardHandlers() {
    const { clipboard } = require('electron');

    this.ipcMain.handle('clipboard:write', async (_evt, text) => {
      try {
        clipboard.writeText(text);
        return { success: true };
      } catch (error) {
        console.error('Clipboard write error:', error);
        return { success: false, error: error.message };
      }
    });
  }

  /**
   * Register theme handlers
   */
  registerThemeHandlers() {
    const { nativeTheme } = require('electron');

    this.ipcMain.handle('theme:get-system', async () => {
      try {
        return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
      } catch (e) {
        console.error('Error getting system theme:', e);
        return 'light';
      }
    });

    this.ipcMain.on('theme:set-source', (_evt, source) => {
      try {
        if (source === 'system') {
          nativeTheme.themeSource = 'system';
        } else if (source === 'light' || source === 'dark') {
          nativeTheme.themeSource = source;
        }
      } catch (e) {
        console.error('Error setting theme source:', e);
      }
    });

    // Listen to system theme changes
    nativeTheme.on('updated', () => {
      try {
        const systemTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
        const mainWindow = this.windowManager.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('system-theme-changed', systemTheme);
        }
      } catch (e) {
        console.error('Error sending system theme change:', e);
      }
    });
  }

  /**
   * Register Groq API handlers
   */
  registerGroqHandlers() {
    this.ipcMain.handle('groq:get-status', async () => {
      const apiKey = this.settings.groq_api_key || '';
      return {
        enabled: this.settings.groq_enabled || false,
        hasApiKey: apiKey.length > 0,
        apiKeyPreview: apiKey ? `${apiKey.substring(0, 8)}...` : ''
      };
    });

    this.ipcMain.handle('groq:save-api-key', async (_evt, apiKey) => {
      this.settings.groq_api_key = apiKey;
      // Save to file
      const fs = require('fs');
      const path = require('path');
      const settingsPath = path.join(this.__dirname, 'data', 'settings.json');
      try {
        fs.writeFileSync(settingsPath, JSON.stringify(this.settings, null, 2));
      } catch (e) {
        console.error('Error saving Groq API key:', e);
      }
      return { success: true };
    });

    this.ipcMain.handle('groq:set-enabled', async (_evt, enabled) => {
      this.settings.groq_enabled = enabled;
      const fs = require('fs');
      const path = require('path');
      const settingsPath = path.join(this.__dirname, 'data', 'settings.json');
      try {
        fs.writeFileSync(settingsPath, JSON.stringify(this.settings, null, 2));
      } catch (e) {
        console.error('Error saving Groq enabled state:', e);
      }
      return { success: true, enabled };
    });
  }

  /**
   * Register dictation language handlers
   */
  registerDictationHandlers() {
    const supportedLanguages = [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'ru', name: 'Russian' },
      { code: 'zh', name: 'Chinese' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'ar', name: 'Arabic' },
      { code: 'hi', name: 'Hindi' },
      { code: 'auto', name: 'Auto-detect' }
    ];

    this.ipcMain.handle('dictation:get-languages', async () => {
      return supportedLanguages;
    });

    this.ipcMain.handle('dictation:set-language', async (_evt, language) => {
      this.settings.dictation_language = language;
      const fs = require('fs');
      const path = require('path');
      const settingsPath = path.join(this.__dirname, 'data', 'settings.json');
      try {
        fs.writeFileSync(settingsPath, JSON.stringify(this.settings, null, 2));
      } catch (e) {
        console.error('Error saving dictation language:', e);
      }
      // Notify whisper service of language change
      this.pythonManager.writeToWhisper(`SET_LANGUAGE ${language}`);
      return { success: true, language };
    });
  }

  /**
   * Register logs handlers
   */
  registerLogsHandlers() {
    const { shell } = require('electron');
    const { dialog } = require('electron');
    const path = require('path');
    const fs = require('fs');

    this.ipcMain.handle('logs:browse-path', async () => {
      try {
        const mainWindow = this.windowManager.getMainWindow();
        const result = await dialog.showOpenDialog(mainWindow, {
          title: 'Select Logs Directory',
          properties: ['openDirectory', 'createDirectory']
        });
        if (result.canceled || !result.filePaths.length) {
          return { success: false, canceled: true };
        }
        return { success: true, path: result.filePaths[0] };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });

    this.ipcMain.handle('logs:get-path', async () => {
      return this.settings.logs_path || path.join(this.app.getPath('userData'), 'logs');
    });

    this.ipcMain.handle('logs:set-path', async (_evt, logsPath) => {
      this.settings.logs_path = logsPath;
      const settingsPath = path.join(this.__dirname, 'data', 'settings.json');
      try {
        fs.writeFileSync(settingsPath, JSON.stringify(this.settings, null, 2));
      } catch (e) {
        console.error('Error saving logs path:', e);
      }
      return { success: true, path: logsPath };
    });

    this.ipcMain.handle('logs:get-directory', async () => {
      try {
        if (this.logger) {
          return { success: true, directory: this.logger.getLogsDirectory() };
        }
        return { success: false, error: 'Logger not initialized' };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });

    this.ipcMain.handle('logs:get-recent', async (_evt, category, lines) => {
      try {
        if (this.logger) {
          const logs = this.logger.getRecentLogs(category || 'main', lines || 100);
          return { success: true, logs };
        }
        return { success: false, error: 'Logger not initialized' };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });

    this.ipcMain.handle('logs:open-directory', async () => {
      try {
        if (this.logger) {
          const logsDir = this.logger.getLogsDirectory();
          shell.openPath(logsDir);
          return { success: true };
        }
        return { success: false, error: 'Logger not initialized' };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
  }
}

module.exports = IPCHandlers;
