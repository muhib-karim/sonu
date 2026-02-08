/**
 * Application Constants Configuration
 * 
 * Centralizes all hardcoded values, paths, and configuration constants.
 * This makes the application easier to configure and maintain.
 * 
 * @module constants
 */

const path = require('path');
const { app } = require('electron');

// App information
const APP_INFO = {
  NAME: 'Sonu Voice Typing',
  VERSION: require('../../package.json').version,
  REPOSITORY: 'https://github.com/muhib-karim/sonu',
  WEBSITE: 'https://sonu.app'
};

// Window dimensions
const WINDOW_CONFIG = {
  MAIN: {
    WIDTH: 1200,
    HEIGHT: 800,
    MIN_WIDTH: 800,
    MIN_HEIGHT: 600,
    FRAME: false,
    TRANSPARENT: true
  },
  WIDGET: {
    WIDTH: 200,
    HEIGHT: 48,
    MIN_WIDTH: 150,
    MIN_HEIGHT: 32
  }
};

// File paths (relative to app root)
const PATHS = {
  ASSETS: 'assets',
  TRAY_ICONS: 'assets/tray',
  DATA: 'data',
  PYTHON: 'src/core/python',
  MODELS: 'models',
  CACHE: 'cache',
  LOGS: 'logs'
};

// Get absolute data path
function getDataPath() {
  return app ? app.getPath('userData') : path.join(__dirname, '..', '..', 'data');
}

// Get absolute logs path
function getLogsPath() {
  return path.join(getDataPath(), 'logs');
}

// Default application settings
const DEFAULT_SETTINGS = {
  // Hotkeys
  holdHotkey: 'CommandOrControl+Super+Space',
  toggleHotkey: 'CommandOrControl+Shift+Space',
  
  // Recording
  activeModel: 'tiny',
  selectedMicrophone: null,
  mute_audio_while_dictating: true,
  sound_feedback: true,
  
  // Post-processing
  flowRefinement: true,
  post_processing_enabled: true,
  post_processing_mode: 'rules', // 'rules' or 'llm'
  
  // Context awareness
  context_awareness: true,
  activeStyle: 'neutral',
  
  // UI
  language: 'en',
  theme: 'system',
  startMinimized: false,
  showOverlay: true,
  
  // Advanced
  cpuThreads: 4,
  beamSize: 5,
  bestOf: 5,
  patience: 1.0,
  lengthPenalty: 1.0,
  temperature: 0.0,
  compressionRatioThreshold: 2.4,
  logProbThreshold: -1.0,
  noSpeechThreshold: 0.6,
  conditionOnPreviousText: true,
  
  // Widget position
  widgetPosition: {
    x: null,
    y: null
  }
};

// Model configurations
const MODELS = {
  WHISPER: {
    tiny: {
      name: 'tiny',
      size: '39 MB',
      description: 'Fastest, lowest accuracy',
      url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
      multilingual: true
    },
    base: {
      name: 'base',
      size: '74 MB',
      description: 'Fast, decent accuracy',
      url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
      multilingual: true
    },
    small: {
      name: 'small',
      size: '244 MB',
      description: 'Balanced speed/accuracy',
      url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
      multilingual: true
    },
    medium: {
      name: 'medium',
      size: '769 MB',
      description: 'High accuracy, slower',
      url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
      multilingual: true
    },
    'large-v1': {
      name: 'large-v1',
      size: '1.5 GB',
      description: 'Highest accuracy, slowest',
      url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v1.bin',
      multilingual: true
    },
    'large-v2': {
      name: 'large-v2',
      size: '1.5 GB',
      description: 'Latest large model',
      url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v2.bin',
      multilingual: true
    },
    'large-v3': {
      name: 'large-v3',
      size: '1.5 GB',
      description: 'Latest large model (v3)',
      url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin',
      multilingual: true
    }
  },
  
  FASTER_WHISPER: {
    'tiny.en': {
      name: 'tiny.en',
      repo: 'Systran/faster-whisper-tiny',
      multilingual: false
    },
    'tiny': {
      name: 'tiny',
      repo: 'Systran/faster-whisper-tiny',
      multilingual: true
    },
    'base.en': {
      name: 'base.en',
      repo: 'Systran/faster-whisper-base',
      multilingual: false
    },
    'base': {
      name: 'base',
      repo: 'Systran/faster-whisper-base',
      multilingual: true
    },
    'small.en': {
      name: 'small.en',
      repo: 'Systran/faster-whisper-small',
      multilingual: false
    },
    'small': {
      name: 'small',
      repo: 'Systran/faster-whisper-small',
      multilingual: true
    },
    'medium.en': {
      name: 'medium.en',
      repo: 'Systran/faster-whisper-medium',
      multilingual: false
    },
    'medium': {
      name: 'medium',
      repo: 'Systran/faster-whisper-medium',
      multilingual: true
    },
    'large-v1': {
      name: 'large-v1',
      repo: 'Systran/faster-whisper-large-v1',
      multilingual: true
    },
    'large-v2': {
      name: 'large-v2',
      repo: 'Systran/faster-whisper-large-v2',
      multilingual: true
    },
    'large-v3': {
      name: 'large-v3',
      repo: 'Systran/faster-whisper-large-v3',
      multilingual: true
    }
  },
  
  PARAKEET: {
    'parakeet-tdt-0.6b-v3': {
      name: 'parakeet-tdt-0.6b-v3',
      repo: 'istupakov/parakeet-tdt-0.6b-v3-onnx',
      size: '~600 MB',
      description: 'English only, very fast on GPU',
      multilingual: false
    }
  }
};

// API endpoints
const API_ENDPOINTS = {
  GROQ: {
    BASE: 'https://api.groq.com/openai/v1',
    CHAT_COMPLETIONS: '/chat/completions',
    MODELS: '/models'
  },
  GITHUB: {
    RELEASES: 'https://api.github.com/repos/muhib-karim/sonu/releases/latest'
  }
};

// Timing constants (milliseconds)
const TIMING = {
  WIDGET_FADE_DURATION: 300,
  TYPING_DELAY: 10,
  RECORDING_TIMEOUT: 30000,
  LLM_TIMEOUT: 5000,
  POSITION_SAVE_DEBOUNCE: 500,
  WHISPER_INIT_TIMEOUT: 30000
};

// Audio settings
const AUDIO = {
  SAMPLE_RATE: 16000,
  CHANNELS: 1,
  FORMAT: 's16le',
  BUFFER_SIZE: 1024
};

// IPC channel names
const IPC_CHANNELS = {
  // Recording
  START_RECORDING: 'start-recording',
  STOP_RECORDING: 'stop-recording',
  TOGGLE_RECORDING: 'toggle-recording',
  RECORDING_STARTED: 'recording-started',
  RECORDING_STOPPED: 'recording-stopped',
  
  // Transcription
  TRANSCRIPTION_RESULT: 'transcription-result',
  TRANSCRIPTION_PARTIAL: 'transcription-partial',
  
  // Settings
  GET_SETTINGS: 'get-settings',
  SET_SETTINGS: 'set-settings',
  SETTINGS_CHANGED: 'settings-changed',
  
  // Models
  GET_MODELS: 'get-models',
  DOWNLOAD_MODEL: 'download-model',
  MODEL_DOWNLOAD_PROGRESS: 'model-download-progress',
  
  // Dictionary
  GET_DICTIONARY: 'get-dictionary',
  ADD_TO_DICTIONARY: 'add-to-dictionary',
  
  // Snippets
  GET_SNIPPETS: 'get-snippets',
  ADD_SNIPPET: 'add-snippet',
  DELETE_SNIPPET: 'delete-snippet',
  
  // LLM
  LLM_STATUS: 'llm:status',
  LLM_MESSAGE: 'llm:message',
  TRANSFORM_TEXT: 'transform-text',
  
  // Widget
  WIDGET_SHOW: 'widget:show',
  WIDGET_HIDE: 'widget:hide',
  WIDGET_STATE: 'widget:state',
  
  // Sound
  PLAY_SOUND: 'play-sound'
};

// Feature flags
const FEATURES = {
  ENABLE_LLM: true,
  ENABLE_CONTEXT_AWARENESS: true,
  ENABLE_VOICE_COMMANDS: true,
  ENABLE_SNIPPETS: true,
  ENABLE_DICTIONARY: true,
  ENABLE_POST_PROCESSING: true,
  ENABLE_AUTO_UPDATE: false
};

// Error codes
const ERROR_CODES = {
  PYTHON_NOT_FOUND: 'PYTHON_NOT_FOUND',
  MODEL_LOAD_FAILED: 'MODEL_LOAD_FAILED',
  RECORDING_FAILED: 'RECORDING_FAILED',
  TRANSCRIPTION_FAILED: 'TRANSCRIPTION_FAILED',
  LLM_NOT_AVAILABLE: 'LLM_NOT_AVAILABLE',
  API_KEY_INVALID: 'API_KEY_INVALID'
};

module.exports = {
  APP_INFO,
  WINDOW_CONFIG,
  PATHS,
  getDataPath,
  getLogsPath,
  DEFAULT_SETTINGS,
  MODELS,
  API_ENDPOINTS,
  TIMING,
  AUDIO,
  IPC_CHANNELS,
  FEATURES,
  ERROR_CODES
};
