/**
 * Tray Manager Module
 * Manages system tray icon and context menu
 */

const { Tray, Menu, nativeImage, shell, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');

class TrayManager {
  constructor(options = {}) {
    this.app = options.app;
    this.mainWindow = options.mainWindow;
    this.__dirname = options.__dirname;
    this.getSettings = options.getSettings || (() => ({}));
    this.onToggleRecording = options.onToggleRecording || (() => {});
    this.onPasteLastTranscript = options.onPasteLastTranscript || (() => {});
    this.onSendGeneralFeedback = options.onSendGeneralFeedback || (() => {});
    this.onShowSettings = options.onShowSettings || (() => {});
    this.onShowDictionary = options.onShowDictionary || (() => {});
    this.onFocusHoldHotkey = options.onFocusHoldHotkey || (() => {});
    this.onFocusToggleHotkey = options.onFocusToggleHotkey || (() => {});
    this.onOpenHelpCenter = options.onOpenHelpCenter || (() => shell.openExternal('https://github.com/your-repo/offline-voice-typing/wiki'));
    this.onTalkToSupport = options.onTalkToSupport || (() => shell.openExternal('https://github.com/your-repo/offline-voice-typing/issues'));
    this.onCheckForUpdates = options.onCheckForUpdates || (() => shell.openExternal('https://github.com/your-repo/offline-voice-typing/releases'));

    this.tray = null;
    this.isRecording = false;
  }

  /**
   * Get tray icon with fallback
   */
  getTrayIcon() {
    const iconPath = path.join(this.__dirname, 'assets', 'tray', 'mic-16.png');
    let image;

    if (fs.existsSync(iconPath)) {
      image = nativeImage.createFromPath(iconPath);
    } else {
      const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAEUlEQVQ4y2NgGAWDEQwYxAEAAJgABu7xq1EAAAAASUVORK5CYII=';
      image = nativeImage.createFromDataURL(`data:image/png;base64,${base64Png}`);
    }

    return image;
  }

  /**
   * Create tray icon and menu
   */
  createTray() {
    const image = this.getTrayIcon();

    this.tray = new Tray(image);
    this.updateTrayMenu();
    this.tray.setToolTip('Offline Voice Typing');

    this.tray.on('click', () => {
      if (this.mainWindow) {
        this.mainWindow.isVisible() ? this.mainWindow.hide() : this.mainWindow.show();
      }
    });

    return this.tray;
  }

  /**
   * Get available audio input devices
   */
  async getAudioInputDevices() {
    if (!this.mainWindow) return [];

    try {
      const devices = await this.mainWindow.webContents.executeJavaScript(`
        navigator.mediaDevices.enumerateDevices()
          .then(devices => devices.filter(d => d.kind === 'audioinput'))
          .then(devices => devices.map(d => ({ id: d.deviceId, label: d.label || 'Microphone ' + d.deviceId.substr(0, 5) })))
      `);
      return devices || [];
    } catch (e) {
      console.error('Error getting audio devices:', e);
      return [];
    }
  }

  /**
   * Build microphone submenu
   */
  async buildMicrophoneSubmenu() {
    const devices = await this.getAudioInputDevices();
    const settings = this.getSettings();

    if (devices.length === 0) {
      return [
        {
          label: 'No microphones detected',
          enabled: false
        }
      ];
    }

    return devices.map(device => ({
      label: device.label,
      type: 'radio',
      checked: settings.selectedMicrophone === device.id,
      click: () => {
        settings.selectedMicrophone = device.id;
        // Note: Settings should be saved through a callback
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('microphone-changed', device.id);
        }
      }
    }));
  }

  /**
   * Update tray context menu
   */
  async updateTrayMenu() {
    if (!this.tray) return;

    const settings = this.getSettings();
    const micSubmenu = await this.buildMicrophoneSubmenu();

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open SONU Home',
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.show();
            this.mainWindow.focus();
          }
        }
      },
      {
        label: 'Share Feedback',
        click: () => this.onSendGeneralFeedback()
      },
      { type: 'separator' },
      {
        label: 'Settings...',
        click: () => this.onShowSettings()
      },
      {
        label: 'Select Microphone',
        submenu: micSubmenu
      },
      {
        label: 'Add Word to Dictionary...',
        click: () => this.onShowDictionary()
      },
      { type: 'separator' },
      {
        label: `Version ${this.app.getVersion()}`,
        enabled: false
      },
      {
        label: 'Check for Updates',
        click: () => this.onCheckForUpdates()
      },
      { type: 'separator' },
      {
        label: 'Paste Last Transcript',
        enabled: false // Description item
      },
      { type: 'separator' },
      {
        label: 'Shortcuts',
        submenu: [
          {
            label: 'Hold Hotkey',
            sublabel: settings.holdHotkey || 'Not set',
            click: () => this.onFocusHoldHotkey()
          },
          {
            label: 'Toggle Hotkey',
            sublabel: settings.toggleHotkey || 'Not set',
            click: () => this.onFocusToggleHotkey()
          },
          { type: 'separator' },
          {
            label: 'Paste Last Transcript',
            accelerator: 'Alt+Shift+Z',
            click: () => this.onPasteLastTranscript()
          },
          {
            label: 'Talk to Support',
            accelerator: 'Super+/',
            click: () => this.onTalkToSupport()
          },
          {
            label: 'Exit',
            accelerator: 'Super+Q',
            click: () => this.app.quit()
          }
        ]
      },
      {
        label: 'Microphone',
        submenu: [
          {
            label: 'Microphone Settings',
            click: () => {
              if (this.mainWindow) {
                this.mainWindow.show();
                this.mainWindow.focus();
              }
            }
          },
          { type: 'separator' },
          {
            label: this.isRecording ? 'Stop Recording' : 'Start Recording',
            click: () => this.onToggleRecording()
          }
        ]
      },
      { type: 'separator' },
      {
        label: 'Quit SONU',
        accelerator: 'CmdOrCtrl+Q',
        click: () => this.app.quit()
      }
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  /**
   * Set recording state (for menu update)
   */
  setRecordingState(isRecording) {
    this.isRecording = isRecording;
    this.updateTrayMenu();
  }

  /**
   * Set main window reference
   */
  setMainWindow(window) {
    this.mainWindow = window;
  }

  /**
   * Get tray instance
   */
  getTray() {
    return this.tray;
  }

  /**
   * Destroy tray
   */
  destroy() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}

module.exports = TrayManager;
