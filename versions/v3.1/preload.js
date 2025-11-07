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
  saveHistory: (items) => ipcRenderer.invoke('history:save', items),
  deleteHistoryItem: (timestamp) => ipcRenderer.invoke('history:delete', timestamp),
  onHistoryAppend: (cb) => ipcRenderer.on('history-append', (_, entry) => cb(entry)),
  copyToClipboard: (text) => {
    try {
      clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Clipboard write error:', error);
      // Fallback to IPC
      return ipcRenderer.invoke('clipboard:write', text);
    }
  },
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  onShowMessage: (callback) => ipcRenderer.on('show-message', (_, msg) => callback(msg)),
  onFocusHoldHotkey: (callback) => ipcRenderer.on('focus-hold-hotkey', callback),
  onFocusToggleHotkey: (callback) => ipcRenderer.on('focus-toggle-hotkey', callback),
  getSystemInfo: () => ipcRenderer.invoke('system:get-info'),
  getSystemProfile: () => ipcRenderer.invoke('system:get-profile'),
  getSuggestedModel: () => ipcRenderer.invoke('model:suggest'),
  getRecommendedModel: () => ipcRenderer.invoke('model:get-recommended'),
  getManualDownloadUrls: () => ipcRenderer.invoke('model:get-manual-urls'),
  downloadModel: (modelName) => ipcRenderer.invoke('model:download', modelName),
  checkModel: (modelName) => ipcRenderer.invoke('model:check', modelName),
  importModel: () => ipcRenderer.invoke('model:import'),
  getModelSpace: () => ipcRenderer.invoke('model:get-space'),
  onModelProgress: (callback) => ipcRenderer.on('model:progress', (_, data) => callback(data)),
  onModelComplete: (callback) => ipcRenderer.on('model:complete', (_, data) => callback(data)),
  onModelError: (callback) => ipcRenderer.on('model:error', (_, data) => callback(data)),
  getAppSettings: () => ipcRenderer.invoke('app-settings:get'),
  saveAppSettings: (settings) => ipcRenderer.invoke('app-settings:set', settings),
  clearCache: () => ipcRenderer.invoke('cache:clear'),
  listMicrophones: () => ipcRenderer.invoke('microphone:list'),
  onPlaySound: (callback) => ipcRenderer.on('play-sound', (_, type) => callback(type)),
  getSystemTheme: () => ipcRenderer.invoke('theme:get-system'),
  onSystemThemeChanged: (callback) => ipcRenderer.on('system-theme-changed', (_, theme) => callback(theme)),
  setThemeSource: (source) => ipcRenderer.send('theme:set-source', source),
  browseModelDownloadPath: () => ipcRenderer.invoke('model:browse-path'),
  getModelDownloadPath: () => ipcRenderer.invoke('model:get-path'),
  setModelDownloadPath: (path) => ipcRenderer.invoke('model:set-path', path),
  // Dictionary
  getDictionary: () => ipcRenderer.invoke('dictionary:get'),
  addDictionaryWord: (word) => ipcRenderer.invoke('dictionary:add', word),
  updateDictionaryWord: (oldWord, newWord) => ipcRenderer.invoke('dictionary:update', oldWord, newWord),
  deleteDictionaryWord: (word) => ipcRenderer.invoke('dictionary:delete', word),
  // Snippets
  getSnippets: () => ipcRenderer.invoke('snippets:get'),
  addSnippet: (snippet) => ipcRenderer.invoke('snippets:add', snippet),
  updateSnippet: (id, snippet) => ipcRenderer.invoke('snippets:update', id, snippet),
  deleteSnippet: (id) => ipcRenderer.invoke('snippets:delete', id),
  // Notes
  getNotes: () => ipcRenderer.invoke('notes:get'),
  addNote: (note) => ipcRenderer.invoke('notes:add', note),
  updateNote: (id, note) => ipcRenderer.invoke('notes:update', id, note),
  deleteNote: (id) => ipcRenderer.invoke('notes:delete', id),
  // Translation
  translateText: (text, targetLang, sourceLang) => ipcRenderer.invoke('translation:translate', text, targetLang, sourceLang),
  translateDict: (translationsJson, targetLang, sourceLang) => ipcRenderer.invoke('translation:translate-dict', translationsJson, targetLang, sourceLang),
  checkTranslationService: () => ipcRenderer.invoke('translation:check')
});
