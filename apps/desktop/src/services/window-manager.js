/**
 * Window Manager Service
 * Handles all Electron window operations
 */

const { BrowserWindow, screen } = require('electron');
const path = require('path');

class WindowManager {
  constructor() {
    this.mainWindow = null;
    this.indicatorWindow = null;
    this.tray = null;
  }

  createMainWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    
    this.mainWindow = new BrowserWindow({
      width: Math.min(1200, width * 0.8),
      height: Math.min(800, height * 0.8),
      minWidth: 800,
      minHeight: 600,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '..', '..', 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    this.mainWindow.loadFile('index.html');
    
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    return this.mainWindow;
  }

  createIndicatorWindow() {
    this.indicatorWindow = new BrowserWindow({
      width: 200,
      height: 200,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '..', '..', 'indicator_preload.js'),
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    this.indicatorWindow.loadFile('indicator.html');
    this.indicatorWindow.hide();

    return this.indicatorWindow;
  }

  getMainWindow() {
    return this.mainWindow;
  }

  getIndicatorWindow() {
    return this.indicatorWindow;
  }

  showMainWindow() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }

  hideMainWindow() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.hide();
    }
  }

  showIndicator(x, y) {
    if (this.indicatorWindow && !this.indicatorWindow.isDestroyed()) {
      this.indicatorWindow.setPosition(x, y);
      this.indicatorWindow.show();
    }
  }

  hideIndicator() {
    if (this.indicatorWindow && !this.indicatorWindow.isDestroyed()) {
      this.indicatorWindow.hide();
    }
  }

  setIndicatorState(state) {
    if (this.indicatorWindow && !this.indicatorWindow.isDestroyed()) {
      this.indicatorWindow.webContents.send('state-change', state);
    }
  }
}

module.exports = new WindowManager();
