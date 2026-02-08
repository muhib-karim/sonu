/**
 * Main Entry Point - Refactored
 * Orchestrates all services and handles app lifecycle
 */

const { app, globalShortcut, ipcMain } = require('electron');
const path = require('path');

// Import refactored modules
const windowManager = require('../services/window-manager');
const typingService = require('../services/typing-service');
const recordingService = require('../services/recording-service');
const settingsService = require('../services/settings-service');
const trayService = require('../services/tray-service');
const { getLogger } = require('../utils/logger');

// Initialize logger
const logger = getLogger('Main');

// Application state
let isRecording = false;

// ============================================
// Application Lifecycle
// ============================================

app.whenReady().then(async () => {
  logger.info('Application starting...');
  
  // Initialize services
  await initializeServices();
  
  // Create windows
  windowManager.createMainWindow();
  windowManager.createIndicatorWindow();
  
  // Setup tray
  trayService.createTray(windowManager.getMainWindow());
  
  // Register hotkeys
  registerHotkeys();
  
  // Setup IPC handlers
  setupIpcHandlers();
  
  logger.info('Application ready');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  logger.info('Application quitting...');
  recordingService.cleanup();
  globalShortcut.unregisterAll();
});

// ============================================
// Service Initialization
// ============================================

async function initializeServices() {
  try {
    await settingsService.initialize();
    await recordingService.initialize();
    logger.info('All services initialized');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    throw error;
  }
}

// ============================================
// Hotkey Registration
// ============================================

function registerHotkeys() {
  const settings = settingsService.getSettings();
  
  // Hold hotkey
  if (settings.holdHotkey) {
    globalShortcut.register(settings.holdHotkey, () => {
      toggleRecording();
    });
    logger.info('Hold hotkey registered:', settings.holdHotkey);
  }
  
  // Toggle hotkey
  if (settings.toggleHotkey) {
    globalShortcut.register(settings.toggleHotkey, () => {
      toggleRecording();
    });
    logger.info('Toggle hotkey registered:', settings.toggleHotkey);
  }
}

// ============================================
// Recording Control
// ============================================

function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

function startRecording() {
  if (isRecording) return;
  
  isRecording = true;
  logger.info('Recording started');
  
  // Show indicator
  const cursor = require('electron').screen.getCursorScreenPoint();
  windowManager.showIndicator(cursor.x, cursor.y);
  windowManager.setIndicatorState('recording');
  
  // Start recording service
  recordingService.startRecording();
  
  // Notify renderer
  const mainWindow = windowManager.getMainWindow();
  if (mainWindow) {
    mainWindow.webContents.send('recording-started');
  }
}

function stopRecording() {
  if (!isRecording) return;
  
  isRecording = false;
  logger.info('Recording stopped');
  
  // Update indicator
  windowManager.setIndicatorState('processing');
  
  // Stop recording and get result
  recordingService.stopRecording(async (text) => {
    if (text) {
      // Type the transcription
      await typingService.typeText(text, { incremental: true });
      typingService.resetLastTyped();
    }
    
    // Hide indicator
    windowManager.hideIndicator();
    
    // Notify renderer
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('recording-stopped', text);
    }
  });
}

// ============================================
// IPC Handlers
// ============================================

function setupIpcHandlers() {
  // Settings
  ipcMain.handle('settings:get', () => {
    return settingsService.getSettings();
  });
  
  ipcMain.handle('settings:set', (event, newSettings) => {
    settingsService.updateSettings(newSettings);
    return settingsService.getSettings();
  });
  
  // Recording
  ipcMain.handle('recording:toggle', () => {
    toggleRecording();
    return isRecording;
  });
  
  ipcMain.handle('recording:status', () => {
    return isRecording;
  });
  
  // Window control
  ipcMain.handle('window:show', () => {
    windowManager.showMainWindow();
  });
  
  ipcMain.handle('window:hide', () => {
    windowManager.hideMainWindow();
  });
  
  // Typing
  ipcMain.handle('typing:type', async (event, text) => {
    await typingService.typeText(text);
  });
  
  // Models
  ipcMain.handle('models:list', () => {
    return recordingService.getAvailableModels();
  });
  
  ipcMain.handle('models:download', (event, modelId) => {
    return recordingService.downloadModel(modelId);
  });
  
  // History
  ipcMain.handle('history:get', () => {
    return recordingService.getHistory();
  });
  
  ipcMain.handle('history:clear', () => {
    recordingService.clearHistory();
  });
}

// ============================================
// Error Handling
// ============================================

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});
