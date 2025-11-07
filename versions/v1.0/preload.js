const { contextBridge, ipcRenderer, clipboard } = require('electron');

contextBridge.exposeInMainWorld('voiceApp', {
  onTranscription: (callback) => ipcRenderer.on('transcription', (_, text) => callback(text)),
  onTranscriptionPartial: (callback) => ipcRenderer.on('transcription-partial', (_, text) => callback(text)),
  onRecordingStart: (callback) => ipcRenderer.on('recording-start', callback),
  onRecordingStop: (callback) => ipcRenderer.on('recording-stop', callback),
  toggleRecording: () => ipcRenderer.send('toggle-recording'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:set', settings),
  onHotkeyRegistered: (cb) => ipcRenderer.on('hotkey-registered', (_, acc) => cb(acc)),
  onHotkeyError: (cb) => ipcRenderer.on('hotkey-error', (_, acc) => cb(acc)),
  startCaptureHotkey: () => ipcRenderer.send('hotkey-capture-start'),
  endCaptureHotkey: () => ipcRenderer.send('hotkey-capture-end'),
  getHistory: () => ipcRenderer.invoke('history:get'),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
  onHistoryAppend: (cb) => ipcRenderer.on('history-append', (_, entry) => cb(entry)),
  copyToClipboard: (text) => clipboard.writeText(text),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  onShowMessage: (callback) => ipcRenderer.on('show-message', (_, msg) => callback(msg)),
  onFocusHoldHotkey: (callback) => ipcRenderer.on('focus-hold-hotkey', callback),
  onFocusToggleHotkey: (callback) => ipcRenderer.on('focus-toggle-hotkey', callback)
});
