// Jest setup file for SONU testing
const fs = require('fs');
const path = require('path');

// Mock Electron modules
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/test'),
    on: jest.fn(),
    quit: jest.fn(),
    getVersion: jest.fn(() => '3.0.0-dev')
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    on: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    close: jest.fn(),
    isVisible: jest.fn(() => true),
    webContents: {
      send: jest.fn(),
      on: jest.fn()
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
  Tray: jest.fn(),
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
}));

// Mock robotjs
jest.mock('robotjs', () => ({
  typeString: jest.fn(),
  keyTap: jest.fn()
}));

// Mock faster-whisper
jest.mock('faster-whisper', () => ({
  WhisperModel: jest.fn().mockImplementation(() => ({
    transcribe: jest.fn(() => [[{ text: 'test transcription' }], {}])
  }))
}));

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
}));

// Mock keyboard
jest.mock('keyboard', () => ({
  is_pressed: jest.fn(() => false),
  add_hotkey: jest.fn(),
  remove_hotkey: jest.fn()
}));

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