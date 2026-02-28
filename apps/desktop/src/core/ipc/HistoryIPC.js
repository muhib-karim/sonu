/**
 * History IPC Module
 * Handles transcription history-related IPC calls
 */

const path = require('path');
const fs = require('fs');

class HistoryIPC {
  constructor(options = {}) {
    this.ipcMain = options.ipcMain;
    this.__dirname = options.__dirname;
    this.windowManager = options.windowManager;
    this.historyPath = path.join(this.__dirname, 'history.json');
  }

  register() {
    this.ipcMain.handle('history:get', async () => {
      try {
        if (!fs.existsSync(this.historyPath)) return [];
        const arr = JSON.parse(fs.readFileSync(this.historyPath, 'utf8')) || [];
        return arr;
      } catch (e) {
        console.error('Error loading history:', e);
        return { success: false, error: e.message, data: [] };
      }
    });

    this.ipcMain.handle('history:clear', async () => {
      try {
        fs.writeFileSync(this.historyPath, JSON.stringify([], null, 2));
        return [];
      } catch (e) {
        console.error('Error clearing history:', e);
        return [];
      }
    });

    this.ipcMain.handle('history:save', async (_evt, items) => {
      try {
        fs.writeFileSync(this.historyPath, JSON.stringify(items, null, 2));
        return true;
      } catch (e) {
        console.error('Error saving history:', e);
        return false;
      }
    });

    this.ipcMain.handle('history:delete', async (_evt, timestamp) => {
      try {
        let arr = [];
        if (fs.existsSync(this.historyPath)) {
          arr = JSON.parse(fs.readFileSync(this.historyPath, 'utf8')) || [];
        }
        arr = arr.filter(item => item.ts !== timestamp);
        fs.writeFileSync(this.historyPath, JSON.stringify(arr, null, 2));
        return true;
      } catch (e) {
        console.error('Error deleting history item:', e);
        return false;
      }
    });

    this.ipcMain.handle('history:append', (_evt, text) => {
      this.appendToHistory(text);
    });
  }

  /**
   * Append entry to history file
   */
  appendToHistory(text) {
    const entry = { text, ts: Date.now() };
    try {
      let arr = [];
      if (fs.existsSync(this.historyPath)) {
        arr = JSON.parse(fs.readFileSync(this.historyPath, 'utf8')) || [];
      }
      arr.push(entry);
      // Keep only last 100 items
      if (arr.length > 100) {
        arr = arr.slice(-100);
      }
      fs.writeFileSync(this.historyPath, JSON.stringify(arr, null, 2));
      
      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('history-append', entry);
      }
    } catch (e) {
      console.warn('Failed to write history:', e);
    }
  }

  /**
   * Get last transcript
   */
  getLastTranscript() {
    try {
      if (fs.existsSync(this.historyPath)) {
        const arr = JSON.parse(fs.readFileSync(this.historyPath, 'utf8')) || [];
        if (arr.length > 0) {
          return arr[arr.length - 1].text;
        }
      }
    } catch (e) {
      console.error('Failed to get last transcript:', e);
    }
    return null;
  }
}

module.exports = HistoryIPC;
