/**
 * SONU Desktop - Refactored Main Process Entry Point
 * 
 * This is an example refactored entry point showing how to integrate
 * the new modules (logger, secureStorage, constants).
 * 
 * This replaces the original main.js (5,883 lines) with a modular approach.
 */

const { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage, clipboard, screen, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Import new modules
const { constants } = require('./src/config');
const { logger, secureStorage } = require('./src/utils');
const { runMigrations } = require('./src/utils/migration');

// Import managers (these would be separate files in a full refactor)
// For now, we keep them here as a transition step
const WindowManager = require('./src/main/window-manager');
const TrayManager = require('./src/main/tray-manager');
const PythonManager = require('./src/main/python-manager');

// Initialize logger
const mainLogger = logger.createLogger('Main');

// Application state
let mainWindow = null;
let tray = null;
let isRecording = false;
let settings = { ...constants.DEFAULT_SETTINGS };

/**
 * Initialize the application
 */
async function initialize() {
  mainLogger.info('Initializing SONU Desktop...');
  
  // Initialize secure storage
  await secureStorage.initialize();
  mainLogger.info('Secure storage initialized');
  
  // Run migrations
  await runMigrations();
  mainLogger.info('Migrations complete');
  
  // Load settings
  await loadSettings();
  
  // Create managers
  createManagers();
  
  // Create main window
  mainWindow = WindowManager.createMainWindow(settings);
  
  // Create tray
  tray = TrayManager.createTray(settings, mainWindow);
  
  // Register hotkeys
  registerHotkeys();
  
  // Setup IPC handlers
  setupIpcHandlers();
  
  mainLogger.info('SONU Desktop initialized successfully');
}

/**
 * Load settings from file
 */
async function loadSettings() {
  try {
    const settingsPath = path.join(constants.getDataPath(), 'settings.json');
    
    if (fs.existsSync(settingsPath)) {
      const loadedSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      settings = { ...constants.DEFAULT_SETTINGS, ...loadedSettings };
      mainLogger.info('Settings loaded', { path: settingsPath });
    } else {
      mainLogger.info('Using default settings');
    }
  } catch (error) {
    mainLogger.error('Failed to load settings', { error: error.message });
    settings = { ...constants.DEFAULT_SETTINGS };
  }
}

/**
 * Save settings to file
 */
async function saveSettings() {
  try {
    const settingsPath = path.join(constants.getDataPath(), 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    mainLogger.debug('Settings saved');
  } catch (error) {
    mainLogger.error('Failed to save settings', { error: error.message });
  }
}

/**
 * Create manager instances
 */
function createManagers() {
  // Initialize Python manager
  PythonManager.initialize(settings);
  
  mainLogger.info('Managers initialized');
}

/**
 * Register global hotkeys
 */
function registerHotkeys() {
  // Hold hotkey
  if (settings.holdHotkey) {
    globalShortcut.register(settings.holdHotkey, () => {
      toggleRecording();
    });
    mainLogger.info('Hold hotkey registered', { hotkey: settings.holdHotkey });
  }
  
  // Toggle hotkey
  if (settings.toggleHotkey) {
    globalShortcut.register(settings.toggleHotkey, () => {
      toggleRecording();
    });
    mainLogger.info('Toggle hotkey registered', { hotkey: settings.toggleHotkey });
  }
}

/**
 * Toggle recording state
 */
function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

/**
 * Start recording
 */
function startRecording() {
  if (isRecording) return;
  
  isRecording = true;
  mainLogger.info('Recording started');
  
  // Notify renderer
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(constants.IPC_CHANNELS.RECORDING_STARTED);
  }
  
  // Start Python recording process
  PythonManager.startRecording();
}

/**
 * Stop recording
 */
function stopRecording() {
  if (!isRecording) return;
  
  isRecording = false;
  mainLogger.info('Recording stopped');
  
  // Notify renderer
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(constants.IPC_CHANNELS.RECORDING_STOPPED);
  }
  
  // Stop Python recording process
  PythonManager.stopRecording();
}

/**
 * Setup IPC handlers
 */
function setupIpcHandlers() {
  // Get settings
  ipcMain.handle(constants.IPC_CHANNELS.GET_SETTINGS, async () => {
    return settings;
  });
  
  // Set settings
  ipcMain.handle(constants.IPC_CHANNELS.SET_SETTINGS, async (event, newSettings) => {
    settings = { ...settings, ...newSettings };
    await saveSettings();
    
    // Notify all windows
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send(constants.IPC_CHANNELS.SETTINGS_CHANGED, settings);
    });
    
    return settings;
  });
  
  // Get API key (securely)
  ipcMain.handle('get-api-key', async (event, keyName) => {
    return await secureStorage.getPassword(keyName);
  });
  
  // Set API key (securely)
  ipcMain.handle('set-api-key', async (event, keyName, value) => {
    await secureStorage.setPassword(keyName, value);
    return true;
  });
  
  // Toggle recording
  ipcMain.handle(constants.IPC_CHANNELS.TOGGLE_RECORDING, async () => {
    toggleRecording();
    return isRecording;
  });
  
  // Get models
  ipcMain.handle(constants.IPC_CHANNELS.GET_MODELS, async () => {
    return constants.MODELS;
  });
  
  mainLogger.info('IPC handlers registered');
}

// App event handlers
app.whenReady().then(async () => {
  // Initialize logging first
  logger.initialize({
    level: 'debug',
    logToFile: true,
    logToConsole: true
  });
  
  mainLogger.info('Application ready');
  
  await initialize();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = WindowManager.createMainWindow(settings);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  mainLogger.info('Application quitting...');
  
  // Unregister hotkeys
  globalShortcut.unregisterAll();
  
  // Close logger
  logger.close();
});

app.on('will-quit', () => {
  mainLogger.info('Application will quit');
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  mainLogger.error('Uncaught exception', { error: error.message, stack: error.stack });
  dialog.showErrorBox('Unexpected Error', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
  mainLogger.error('Unhandled rejection', { reason });
});
