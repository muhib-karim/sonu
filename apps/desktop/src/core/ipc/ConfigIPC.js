const { ipcMain, app } = require('electron');

/**
 * ConfigIPC - Handles configuration and app-state IPC events.
 */
class ConfigIPC {
    constructor(configManager, hotkeyManager) {
        this.config = configManager;
        this.hotkeys = hotkeyManager;
        this.init();
    }

    init() {
        ipcMain.handle('settings:get', async () => {
            return this.config.getAll();
        });

        ipcMain.handle('settings:set', async (_evt, newSettings) => {
            for (const key in newSettings) {
                this.config.set(key, newSettings[key]);
            }
            this.hotkeys.register(); // Re-register with new hotkeys/mode
            return this.config.getAll();
        });

        ipcMain.handle('app-settings:get', async () => {
            return this.config.getAll();
        });

        ipcMain.handle('app:get-version', async () => {
            return app.getVersion();
        });
    }
}

module.exports = ConfigIPC;
