const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('widgetApp', {
  stopRecording: () => ipcRenderer.send('widget-stop-recording'),
  cancelRecording: () => ipcRenderer.send('widget-cancel-recording')
});

