const { ipcMain } = require('electron');

/**
 * ModelIPC - Handles model-related IPC events.
 */
class ModelIPC {
    constructor(modelManager, mainWindow) {
        this.modelManager = modelManager;
        this.mainWindow = mainWindow;
        this.init();
    }

    init() {
        ipcMain.handle('model:list', async () => {
            return await this.modelManager.listModels();
        });

        ipcMain.handle('model:download', async (_evt, modelName) => {
            try {
                this.modelManager.downloadModel(modelName);
                return { success: true };
            } catch (e) {
                return { success: false, error: e.message };
            }
        });

        ipcMain.handle('model:cancel-download', async () => {
            return this.modelManager.cancelDownload();
        });

        // Forward events to renderer
        this.modelManager.on('progress', (data) => {
            this.mainWindow?.webContents?.send('model:progress', data);
        });

        this.modelManager.on('complete', (data) => {
            this.mainWindow?.webContents?.send('model:complete', data);
        });

        this.modelManager.on('error', (data) => {
            this.mainWindow?.webContents?.send('model:error', data);
        });

        ipcMain.handle('model:cancel-download', async () => {
            const cancelled = this.modelManager.cancelDownload();
            if (cancelled) {
                this.mainWindow?.webContents?.send('model:cancelled');
            }
            return cancelled;
        });
    }
}

module.exports = ModelIPC;
