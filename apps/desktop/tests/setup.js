// Jest setup file for SONU testing
const fs = require('fs');
const path = require('path');

// Mock Electron modules
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/test'),
    on: jest.fn(),
    quit: jest.fn(),
    getVersion: jest.fn(() => '3.0.0-dev'),
    whenReady: jest.fn(() => Promise.resolve()),
    isReady: jest.fn(() => true)
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    on: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    close: jest.fn(),
    isVisible: jest.fn(() => true),
    isDestroyed: jest.fn(() => false),
    setIgnoreMouseEvents: jest.fn(),
    setMovable: jest.fn(),
    setAlwaysOnTop: jest.fn(),
    setOpacity: jest.fn(),
    showInactive: jest.fn(),
    getBounds: jest.fn(() => ({ x: 0, y: 0, width: 150, height: 32 })),
    setBounds: jest.fn(),
    minimize: jest.fn(),
    maximize: jest.fn(),
    unmaximize: jest.fn(),
    isMaximized: jest.fn(() => false),
    destroy: jest.fn(),
    webContents: {
      send: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      executeJavaScript: jest.fn(() => Promise.resolve())
    }
  })),
  ipcMain: {
    on: jest.fn(),
    handle: jest.fn(),
    removeAllListeners: jest.fn()
  },
  globalShortcut: {
    register: jest.fn(() => true),
    unregisterAll: jest.fn()
  },
  Tray: jest.fn().mockImplementation(() => ({
    setToolTip: jest.fn(),
    setContextMenu: jest.fn(),
    on: jest.fn(),
    destroy: jest.fn()
  })),
  Menu: {
    buildFromTemplate: jest.fn(() => ({}))
  },
  nativeImage: {
    createFromPath: jest.fn(() => ({}))
  },
  clipboard: {
    writeText: jest.fn()
  },
  screen: {
    getPrimaryDisplay: jest.fn(() => ({
      workArea: { width: 1920, height: 1080, x: 0, y: 0 }
    }))
  },
  shell: {
    openExternal: jest.fn()
  },
  nativeTheme: {
    shouldUseDarkColors: false,
    on: jest.fn(),
    themeSource: 'system'
  },
  dialog: {
    showOpenDialog: jest.fn(() => ({ canceled: false, filePaths: ['/test/path'] }))
  }
}), { virtual: true });

// Mock robotjs
jest.mock('robotjs', () => ({
  typeString: jest.fn(),
  keyTap: jest.fn()
}), { virtual: true });

// Mock faster-whisper
jest.mock('faster-whisper', () => ({
  WhisperModel: jest.fn().mockImplementation(() => ({
    transcribe: jest.fn(() => [[{ text: 'test transcription' }], {}])
  }))
}), { virtual: true });

// Mock pyaudio
jest.mock('pyaudio', () => ({
  PyAudio: jest.fn().mockImplementation(() => ({
    open: jest.fn(() => ({
      start_stream: jest.fn(),
      stop_stream: jest.fn(),
      close: jest.fn(),
      read: jest.fn(() => Buffer.from('test audio data'))
    })),
    get_device_count: jest.fn(() => 2),
    get_device_info_by_index: jest.fn(() => ({
      name: 'Test Microphone',
      maxInputChannels: 1,
      defaultSampleRate: 16000
    })),
    get_sample_size: jest.fn(() => 2),
    terminate: jest.fn()
  }))
}), { virtual: true });

// Mock keyboard
jest.mock('keyboard', () => ({
  is_pressed: jest.fn(() => false),
  add_hotkey: jest.fn(),
  remove_hotkey: jest.fn()
}), { virtual: true });

// Mock fetch for i18n module (Node.js doesn't have fetch by default)
global.fetch = jest.fn((url) => {
  // Try to load translation file from filesystem
  const fs = require('fs');
  const path = require('path');
  
  // Extract locale from URL (e.g., "locales/en.json")
  const match = url.match(/locales\/([^.]+)\.json/);
  if (match) {
    const locale = match[1];
    const localePath = path.join(__dirname, '..', 'locales', `${locale}.json`);
    
    if (fs.existsSync(localePath)) {
      const content = fs.readFileSync(localePath, 'utf8');
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(JSON.parse(content))
      });
    }
  }
  
  // Return 404 for missing files
  return Promise.resolve({
    ok: false,
    status: 404
  });
});

// Mock window.matchMedia for accessibility manager
if (typeof window !== 'undefined') {
  window.matchMedia = jest.fn(() => ({
    matches: false,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }));
}

// Mock AudioContext for renderer tests
if (typeof window !== 'undefined') {
  window.AudioContext = jest.fn(() => ({
    createAnalyser: jest.fn(() => ({
      fftSize: 2048,
      frequencyBinCount: 1024,
      getByteFrequencyData: jest.fn()
    })),
    createMediaStreamSource: jest.fn(),
    close: jest.fn()
  }));
  window.webkitAudioContext = window.AudioContext;
}

// Setup test environment
global.testRoot = path.join(__dirname, '..');
global.testDataDir = path.join(__dirname, 'test-data');

// Create test data directory
if (!fs.existsSync(global.testDataDir)) {
  fs.mkdirSync(global.testDataDir, { recursive: true });
}

// Cleanup after tests
afterAll(() => {
  // Clean up test files
  try {
    if (fs.existsSync(global.testDataDir)) {
      fs.rmSync(global.testDataDir, { recursive: true, force: true });
    }
  } catch (e) {
    console.warn('Failed to cleanup test data:', e.message);
  }
});
