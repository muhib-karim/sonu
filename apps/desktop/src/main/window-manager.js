/**
 * Window Manager Module
 * Handles creation and management of application windows
 */

const { BrowserWindow, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { constants } = require('../config');
const { logger } = require('../utils');

const windowLogger = logger.createLogger('WindowManager');

/**
 * Create the main application window
 * @param {Object} settings - Application settings
 * @returns {BrowserWindow} The created window
 */
function createMainWindow(settings) {
  const { WINDOW_CONFIG, PATHS, APP_INFO } = constants;
  
  // Load icon
  const iconPath = path.join(__dirname, '..', '..', PATHS.TRAY_ICONS, 'mic-32.png');
  let icon;
  
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  } else {
    // Fallback to base64
    const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAEUlEQVQ4y2NgGAWDEQwYxAEAAJgABu7xq1EAAAAASUVORK5CYII=';
    icon = nativeImage.createFromDataURL(`data:image/png;base64,${base64Png}`);
  }
  
  const mainWindow = new BrowserWindow({
    width: WINDOW_CONFIG.MAIN.WIDTH,
    height: WINDOW_CONFIG.MAIN.HEIGHT,
    minWidth: WINDOW_CONFIG.MAIN.MIN_WIDTH,
    minHeight: WINDOW_CONFIG.MAIN.MIN_HEIGHT,
    frame: WINDOW_CONFIG.MAIN.FRAME,
    transparent: WINDOW_CONFIG.MAIN.TRANSPARENT,
    backgroundColor: '#00000000',
    icon: icon,
    show: true, // Show on startup
    webPreferences: {
      preload: path.join(__dirname, '..', '..', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  mainWindow.loadFile('index.html');
  
  // Handle window events
  mainWindow.on('closed', () => {
    windowLogger.info('Main window closed');
  });
  
  mainWindow.webContents.on('did-finish-load', () => {
    windowLogger.info('Main window loaded');
  });
  
  windowLogger.info('Main window created');
  return mainWindow;
}

/**
 * Create the recording indicator widget window
 * @param {Object} settings - Application settings
 * @returns {BrowserWindow} The created widget window
 */
function createWidgetWindow(settings) {
  const { WINDOW_CONFIG } = constants;
  
  const widgetWindow = new BrowserWindow({
    width: WINDOW_CONFIG.WIDGET.WIDTH,
    height: WINDOW_CONFIG.WIDGET.HEIGHT,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: true,
    movable: true,
    webPreferences: {
      preload: path.join(__dirname, '..', '..', 'widget_preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  widgetWindow.loadFile('widget.html');
  widgetWindow.hide();
  
  windowLogger.info('Widget window created');
  return widgetWindow;
}

module.exports = {
  createMainWindow,
  createWidgetWindow
};
