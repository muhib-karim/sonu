const { ipcMain } = require('electron');

/**
 * RecordingIPC - Handles recording and dictation IPC events.
 */
class RecordingIPC {
    constructor(recordingService, indicatorManager) {
        this.recordingService = recordingService;
        this.indicatorManager = indicatorManager;
        this.init();
    }

    init() {
        ipcMain.on('recording-start', () => {
            this.recordingService.start();
        });

        ipcMain.on('recording-stop', () => {
            this.recordingService.stop();
        });

        ipcMain.on('toggle-recording', () => {
            this.recordingService.toggle();
        });

        ipcMain.on('notes:start-recording', () => {
            // Notes recording might need special handling, for now just start
            this.recordingService.start();
        });

        ipcMain.on('notes:stop-recording', () => {
            this.recordingService.stop();
        });

        // Widget specific events from preload.js context
        ipcMain.on('widget-stop-recording', () => {
            this.recordingService.stop();
        });

        ipcMain.on('widget-cancel-recording', () => {
            this.recordingService.cancel();
        });
    }
}

module.exports = RecordingIPC;
