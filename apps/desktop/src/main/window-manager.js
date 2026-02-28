/**
 * Window Manager Module
 * Manages main application window and indicator widget window
 */

const { BrowserWindow, screen, nativeImage, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

class WindowManager {
  constructor(options = {}) {
    this.app = options.app;
    this.isShowcaseMode = options.isShowcaseMode || false;
    this.isTestMode = options.isTestMode || false;
    this.__dirname = options.__dirname;
    
    this.mainWindow = null;
    this.indicatorWindow = null;
    this.fadeTimer = null;
    this.indicatorState = 'hidden';
    this.widgetVisualState = 'recording';
    this.savePositionTimeout = null;
  }

  /**
   * Get window icon with fallback
   */
  getWindowIcon() {
    const iconPath = path.join(this.__dirname, 'assets', 'tray', 'mic-32.png');
    let icon;
    
    if (fs.existsSync(iconPath)) {
      icon = nativeImage.createFromPath(iconPath);
    } else {
      const fallbackPath = path.join(this.__dirname, 'assets', 'tray', 'mic-16.png');
      if (fs.existsSync(fallbackPath)) {
        icon = nativeImage.createFromPath(fallbackPath);
      } else {
        const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAEUlEQVQ4y2NgGAWDEQwYxAEAAJgABu7xq1EAAAAASUVORK5CYII=';
        icon = nativeImage.createFromDataURL(`data:image/png;base64,${base64Png}`);
      }
    }
    
    return icon;
  }

  /**
   * Create main application window
   */
  createWindow() {
    const icon = this.getWindowIcon();

    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      alwaysOnTop: false,
      skipTaskbar: false,
      resizable: true,
      minWidth: 800,
      minHeight: 600,
      icon: icon,
      webPreferences: {
        preload: path.join(this.__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true
      },
      show: this.isShowcaseMode || this.isTestMode
    });

    this.mainWindow.loadFile('index.html');
    
    if (!this.isShowcaseMode && !this.isTestMode) {
      this.mainWindow.show();
    }

    if (this.isShowcaseMode) {
      this.mainWindow.setResizable(false);
      this.mainWindow.center();
    }

    // Add keyboard shortcut for reloading
    this.mainWindow.webContents.on('before-input-event', (event, input) => {
      if ((input.control || input.meta) && input.key.toLowerCase() === 'r') {
        if (!input.shift) {
          event.preventDefault();
          this.mainWindow.reload();
        }
      }
    });

    return this.mainWindow;
  }

  /**
   * Create indicator widget window
   */
  createIndicatorWindow() {
    const widgetPosition = this.loadWidgetPosition();

    this.indicatorWindow = new BrowserWindow({
      width: 200,
      height: 48,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: true,
      movable: true,
      x: widgetPosition.x !== null ? widgetPosition.x : undefined,
      y: widgetPosition.y !== null ? widgetPosition.y : undefined,
      webPreferences: {
        preload: path.join(this.__dirname, 'widget_preload.js'),
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    this.indicatorWindow.loadFile('widget.html');
    this.indicatorWindow.setIgnoreMouseEvents(false);

    // Setup event handlers
    this.indicatorWindow.webContents.once('did-finish-load', () => {
      this.indicatorWindow.setMovable(true);
      this.indicatorWindow.setIgnoreMouseEvents(false);
      console.log('Widget window loaded and configured for dragging');
    });

    // Save position when moved (debounced)
    this.indicatorWindow.on('moved', () => {
      if (this.indicatorWindow && !this.indicatorWindow.isDestroyed()) {
        if (this.savePositionTimeout) {
          clearTimeout(this.savePositionTimeout);
        }
        this.savePositionTimeout = setTimeout(() => {
          const bounds = this.indicatorWindow.getBounds();
          this.saveWidgetPosition(bounds.x, bounds.y);
          console.log('Widget position saved:', bounds.x, bounds.y);
        }, 500);
      }
    });

    // Save position on close
    this.indicatorWindow.on('close', () => {
      if (this.indicatorWindow && !this.indicatorWindow.isDestroyed()) {
        const bounds = this.indicatorWindow.getBounds();
        this.saveWidgetPosition(bounds.x, bounds.y);
      }
    });

    // Center if no saved position
    if (widgetPosition.x === null || widgetPosition.y === null) {
      this.positionIndicator();
      setTimeout(() => {
        if (this.indicatorWindow && !this.indicatorWindow.isDestroyed()) {
          const bounds = this.indicatorWindow.getBounds();
          this.saveWidgetPosition(bounds.x, bounds.y);
        }
      }, 100);
    }

    try { this.indicatorWindow.setOpacity(0); } catch (e) { }
    this.indicatorWindow.hide();

    return this.indicatorWindow;
  }

  /**
   * Position indicator in center of screen
   */
  positionIndicator() {
    try {
      const display = screen.getPrimaryDisplay();
      const { width, height, x, y } = display.workArea;
      const w = 150; const h = 32;
      const cx = x + Math.floor((width - w) / 2);
      const cy = y + Math.floor((height - h) / 2);
      this.indicatorWindow.setBounds({ x: cx, y: cy, width: w, height: h });
    } catch (e) { }
  }

  /**
   * Load saved widget position
   */
  loadWidgetPosition() {
    try {
      const settingsPath = path.join(this.__dirname, 'data', 'settings.json');
      if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        if (settings.widgetPosition &&
          typeof settings.widgetPosition.x === 'number' &&
          typeof settings.widgetPosition.y === 'number' &&
          !isNaN(settings.widgetPosition.x) &&
          !isNaN(settings.widgetPosition.y)) {
          
          const display = screen.getPrimaryDisplay();
          const { width, height, x, y } = display.workArea;
          const widgetWidth = 150;
          const widgetHeight = 32;

          // Validate position is within screen bounds
          if (settings.widgetPosition.x >= x &&
            settings.widgetPosition.y >= y &&
            settings.widgetPosition.x + widgetWidth <= x + width &&
            settings.widgetPosition.y + widgetHeight <= y + height) {
            return { x: settings.widgetPosition.x, y: settings.widgetPosition.y };
          } else {
            console.log('Saved widget position is out of bounds, will center');
          }
        }
      }
    } catch (e) {
      console.error('Error loading widget position:', e);
    }
    return { x: null, y: null };
  }

  /**
   * Save widget position to settings
   */
  saveWidgetPosition(x, y) {
    try {
      const settingsPath = path.join(this.__dirname, 'data', 'settings.json');
      let settings = {};
      if (fs.existsSync(settingsPath)) {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      }
      settings.widgetPosition = { x, y };
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    } catch (e) {
      console.error('Error saving widget position:', e);
    }
  }

  /**
   * Show indicator window
   */
  showIndicator(soundCallback) {
    if (!this.indicatorWindow) return;
    if (this.indicatorState === 'visible' || this.indicatorState === 'fading_in') return;
    if (this.fadeTimer) { clearInterval(this.fadeTimer); this.fadeTimer = null; }
    this.indicatorState = 'visible';

    try {
      this.indicatorWindow.setIgnoreMouseEvents(false);
      this.indicatorWindow.setAlwaysOnTop(true);
      this.indicatorWindow.setMovable(true);
      this.indicatorWindow.showInactive();
      this.indicatorWindow.setOpacity(1);

      // Play start sound if callback provided
      if (soundCallback && this.indicatorWindow.webContents) {
        soundCallback('start', this.indicatorWindow.webContents);
      }

      // Enable drag after short delay
      setTimeout(() => {
        if (this.indicatorWindow && !this.indicatorWindow.isDestroyed()) {
          this.indicatorWindow.setMovable(true);
          this.indicatorWindow.setIgnoreMouseEvents(false);
          this.indicatorWindow.webContents.executeJavaScript(`
            document.body.style.pointerEvents = 'auto';
            document.body.style.cursor = 'default';
          `).catch(() => { });
          console.log('Widget drag enabled');
        }
      }, 50);
    } catch (e) {
      console.error('Error showing indicator:', e);
    }
  }

  /**
   * Hide indicator window
   */
  hideIndicator(soundCallback) {
    if (!this.indicatorWindow) return;
    if (this.indicatorState === 'hidden' || this.indicatorState === 'fading_out') return;
    if (this.fadeTimer) { clearInterval(this.fadeTimer); this.fadeTimer = null; }
    this.indicatorState = 'hidden';

    try {
      // Play stop sound if callback provided
      if (soundCallback && this.indicatorWindow.webContents) {
        soundCallback('stop', this.indicatorWindow.webContents);
      }

      // Small delay to let sound start, then hide
      setTimeout(() => {
        try {
          this.indicatorWindow.hide();
          this.indicatorWindow.setOpacity(0);
        } catch (e) { }
      }, 50);

      // Save position asynchronously
      if (this.indicatorWindow && !this.indicatorWindow.isDestroyed()) {
        setImmediate(() => {
          try {
            const bounds = this.indicatorWindow.getBounds();
            this.saveWidgetPosition(bounds.x, bounds.y);
          } catch (e) {
            // Ignore errors in position saving
          }
        });
      }
    } catch (e) {
      try {
        if (this.indicatorWindow && !this.indicatorWindow.isDestroyed()) {
          this.indicatorWindow.hide();
        }
      } catch (e2) {
        // Final fallback - ignore all errors
      }
    }
  }

  /**
   * Set widget visual state
   */
  setWidgetState(state) {
    if (!this.indicatorWindow || this.indicatorWindow.isDestroyed()) return;

    this.widgetVisualState = state;

    try {
      this.indicatorWindow.webContents.executeJavaScript(`
        if (window.setWidgetState) {
          window.setWidgetState('${state}');
        }
      `).catch(() => { });

      console.log(`Widget state changed to: ${state}`);
    } catch (e) {
      console.error('Error setting widget state:', e);
    }
  }

  /**
   * Get main window
   */
  getMainWindow() {
    return this.mainWindow;
  }

  /**
   * Get indicator window
   */
  getIndicatorWindow() {
    return this.indicatorWindow;
  }

  /**
   * Set main window reference
   */
  setMainWindow(window) {
    this.mainWindow = window;
  }

  /**
   * Set indicator window reference
   */
  setIndicatorWindow(window) {
    this.indicatorWindow = window;
  }

  /**
   * Get widget visual state
   */
  getWidgetVisualState() {
    return this.widgetVisualState;
  }

  /**
   * Check if indicator is visible
   */
  isIndicatorVisible() {
    return this.indicatorState === 'visible';
  }

  /**
   * Destroy windows on app quit
   */
  destroy() {
    if (this.indicatorWindow && !this.indicatorWindow.isDestroyed()) {
      try { 
        this.indicatorWindow.destroy(); 
      } catch (e) { }
    }
  }
}

module.exports = WindowManager;
