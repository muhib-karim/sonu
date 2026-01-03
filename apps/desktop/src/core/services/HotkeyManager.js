const { globalShortcut } = require('electron');

/**
 * HotkeyManager - Manages global shortcuts for dictation.
 */
class HotkeyManager {
    constructor(recordingService, configManager) {
        this.recordingService = recordingService;
        this.config = configManager;
        this.lastHotkeyDown = 0;
        this.debounceMs = 300;
    }

    register() {
        const hotkey = this.config.get('hotkey') || 'Ctrl+Shift+Space';
        const mode = this.config.get('mode') || 'HOLD';

        // Unregister any existing
        globalShortcut.unregisterAll();

        try {
            if (mode === 'HOLD') {
                this.registerHoldMode(hotkey);
            } else {
                this.registerToggleMode(hotkey);
            }
            console.log(`[HotkeyManager] Registered ${hotkey} in ${mode} mode`);
        } catch (e) {
            console.error(`[HotkeyManager] Failed to register ${hotkey}:`, e);
        }
    }

    registerHoldMode(hotkey) {
        // Unfortunately standard Electron globalShortcut doesn't support 'keyup' well.
        // We use a workaround or specialized native module.
        // For production grade, we'd use 'iohook' or similar, but for now
        // we'll stick to robust Toggle or a generic shortcut handler if possible.
        // Actually, SONU v3.6.0 was trying to do HOLD.

        globalShortcut.register(hotkey, () => {
            const now = Date.now();
            if (now - this.lastHotkeyDown < this.debounceMs) return;
            this.lastHotkeyDown = now;

            this.recordingService.toggle();
        });
    }

    registerToggleMode(hotkey) {
        globalShortcut.register(hotkey, () => {
            this.recordingService.toggle();
        });
    }

    unregister() {
        globalShortcut.unregisterAll();
    }
}

module.exports = HotkeyManager;
