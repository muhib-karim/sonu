import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  convertFileSrc: vi.fn((path) => path),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
  emit: vi.fn(),
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    onFocusChanged: vi.fn(() => Promise.resolve(() => {})),
    setFocus: vi.fn(),
  })),
}));

// Mock bindings
vi.mock('@/bindings', () => ({
  commands: {
    getSettings: vi.fn(),
    setSettings: vi.fn(),
    getDefaultSettings: vi.fn(),
    updateMicrophoneMode: vi.fn(),
    changeAudioFeedbackSetting: vi.fn(),
    changeAudioFeedbackVolumeSetting: vi.fn(),
    changeSoundThemeSetting: vi.fn(),
    changeStartHiddenSetting: vi.fn(),
    changeAutostartSetting: vi.fn(),
    changeUpdateChecksSetting: vi.fn(),
    changePttSetting: vi.fn(),
    setSelectedMicrophone: vi.fn(),
    setClamshellMicrophone: vi.fn(),
    setSelectedOutputDevice: vi.fn(),
    setSelectedLanguage: vi.fn(),
    changeTranslateToEnglishSetting: vi.fn(),
    changeShowWaveformSetting: vi.fn(),
    updateBinding: vi.fn(),
    resetBinding: vi.fn(),
    setLogLevel: vi.fn(),
    openAppDataDirectory: vi.fn(),
    openLogDirectory: vi.fn(),
    deleteRecording: vi.fn(),
    getHistory: vi.fn(),
    playRecording: vi.fn(),
    getRecordingDuration: vi.fn(),
  },
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  Toaster: vi.fn(() => null),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: IntersectionObserverMock,
});

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
});

// Mock fetch
global.fetch = vi.fn();
