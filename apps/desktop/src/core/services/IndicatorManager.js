const { BrowserWindow, screen, path } = require('electron');

/**
 * IndicatorManager - Manages the dictation indicator widget.
 */
class IndicatorManager {
    constructor() {
        this.window = null;
        this.height = 32;
        this.width = 160;
    }

    create() {
        if (this.window) return;

        this.window = new BrowserWindow({
            width: this.width,
            height: this.height,
            show: false,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            skipTaskbar: true,
            resizable: false,
            movable: true,
            hasShadow: false,
            webPreferences: {
                preload: require('path').join(__dirname, '..', '..', 'widget_preload.js'),
                nodeIntegration: false,
                contextIsolation: true,
                backgroundThrottling: false
            }
        });

        this.window.loadFile(require('path').join(__dirname, '..', '..', 'widget.html'));

        // Ensure it doesn't steal focus
        this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        this.window.setAlwaysOnTop(true, 'screen-saver');
    }

    show() {
        if (!this.window) this.create();

        this.position();
        this.window.showInactive();
        this.window.webContents.send('start-waveform');
        this.window.webContents.send('play-sound', 'start');
    }

    hide() {
        if (this.window) {
            this.window.webContents.send('play-sound', 'stop');
            // Give sound a moment to finish before hiding
            setTimeout(() => {
                if (this.window) this.window.hide();
            }, 300);
        }
    }

    position() {
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;
        const x = Math.round((width - this.width) / 2);
        const y = Math.round(height - this.height - 40);
        this.window.setPosition(x, y);
    }

    destroy() {
        if (this.window) {
            this.window.destroy();
            this.window = null;
        }
    }
}

module.exports = IndicatorManager;
