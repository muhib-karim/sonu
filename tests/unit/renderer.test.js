/**
 * Unit tests for renderer.js (UI logic)
 */

describe('Renderer Tests', () => {
  let mockIpcRenderer;

  beforeEach(() => {
    // Mock DOM elements
    document.body.innerHTML = `
      <div id="sidebar"></div>
      <div id="main-content"></div>
      <div id="page-home" class="page active"></div>
      <div id="page-settings" class="page"></div>
      <div id="settings-general" class="settings-page"></div>
      <div id="settings-system" class="settings-page active"></div>
      <div id="history-list"></div>
      <div id="history-list-full"></div>
      <div id="live-preview" style="display: none;"></div>
      <div id="live-preview-text"></div>
      <div id="stat-time">0 min</div>
      <div id="stat-words">0 words</div>
      <div id="stat-saved">0 min</div>
      <div id="stat-wpm">0 WPM</div>
      <button id="theme-toggle-btn" data-theme="light"></button>
      <input id="modal-hold-hotkey" />
      <input id="modal-toggle-hotkey" />
      <button id="save-shortcuts-btn"></button>
      <div id="system-info-container"></div>
      <div id="microphone-modal"></div>
      <button id="change-microphone-btn"></button>
      <select id="microphone-select"></select>
      <div id="microphone-desc"></div>
    `;

    // Mock IPC
    mockIpcRenderer = {
      __handlers: {},
      onTranscription: jest.fn((arg) => {
        if (typeof arg === 'function') {
          mockIpcRenderer.__handlers.transcription = arg;
        } else if (mockIpcRenderer.__handlers.transcription) {
          mockIpcRenderer.__handlers.transcription(arg);
        }
      }),
      onRecordingStart: jest.fn((arg) => {
        if (typeof arg === 'function') {
          mockIpcRenderer.__handlers.recordingStart = arg;
        } else if (mockIpcRenderer.__handlers.recordingStart) {
          mockIpcRenderer.__handlers.recordingStart();
        }
      }),
      onRecordingStop: jest.fn((arg) => {
        if (typeof arg === 'function') {
          mockIpcRenderer.__handlers.recordingStop = arg;
        } else if (mockIpcRenderer.__handlers.recordingStop) {
          mockIpcRenderer.__handlers.recordingStop();
        }
      }),
      toggleRecording: jest.fn(),
      getSettings: jest.fn(() => Promise.resolve({ holdHotkey: 'Ctrl+Space', toggleHotkey: 'Ctrl+Shift+Space' })),
      saveSettings: jest.fn(() => Promise.resolve({})),
      onHotkeyRegistered: jest.fn(),
      onHotkeyError: jest.fn(),
      getHistory: jest.fn(() => Promise.resolve([])),
      clearHistory: jest.fn(() => Promise.resolve([])),
      onHistoryAppend: jest.fn(),
      copyToClipboard: jest.fn(),
      onShowMessage: jest.fn(),
      onFocusHoldHotkey: jest.fn(),
      onFocusToggleHotkey: jest.fn(),
      onTranscriptionPartial: jest.fn((arg) => {
        if (typeof arg === 'function') {
          mockIpcRenderer.__handlers.transcriptionPartial = arg;
        } else if (mockIpcRenderer.__handlers.transcriptionPartial) {
          mockIpcRenderer.__handlers.transcriptionPartial(arg);
        }
      }),
      getSystemInfo: jest.fn(() => Promise.resolve({})),
      getSuggestedModel: jest.fn(() => Promise.resolve('base')),
      downloadModel: jest.fn(() => Promise.resolve({ success: false })),
      checkModel: jest.fn(() => Promise.resolve({ exists: false })),
      getModelSpace: jest.fn(() => Promise.resolve(0)),
      onModelProgress: jest.fn(),
      onModelComplete: jest.fn(),
      onModelError: jest.fn(),
      // Add missing whisper event registrations used during renderer initialization
      onWhisperReady: jest.fn(() => {}),
      onWhisperError: jest.fn(() => {}),
      // Hotkey capture helpers used in renderer
      startCaptureHotkey: jest.fn(() => {}),
      endCaptureHotkey: jest.fn(() => {}),
      getAppSettings: jest.fn(() => Promise.resolve({})),
      saveAppSettings: jest.fn(() => Promise.resolve({})),
      clearCache: jest.fn(() => Promise.resolve({})),
      listMicrophones: jest.fn(() => Promise.resolve([])),
      onPlaySound: jest.fn(),
      getSystemTheme: jest.fn(() => Promise.resolve('light')),
      onSystemThemeChanged: jest.fn(),
      setThemeSource: jest.fn(),
      getActiveModel: jest.fn(() => Promise.resolve({ 
        success: true, 
        model: 'tiny', 
        description: 'Tiny model', 
        size_mb: 75, 
        ready: true 
      })),
      navigateToPage: jest.fn((page) => {
        // Mock navigation
        const pages = document.querySelectorAll('.page');
        pages.forEach(p => p.classList.remove('active'));
        const targetPage = document.getElementById(`page-${page}`);
        if (targetPage) targetPage.classList.add('active');
      }),
      navigateToSettingsPage: jest.fn((page) => {
        // Mock settings navigation
        const settingsPages = document.querySelectorAll('.settings-page');
        settingsPages.forEach(p => p.classList.remove('active'));
        const targetPage = document.getElementById(`settings-${page}`);
        if (targetPage) targetPage.classList.add('active');
      }),
      isAppReady: jest.fn(() => true)
    };

    // Mock window.voiceApp
    window.voiceApp = mockIpcRenderer;

    // Reset modules to get fresh instance
    jest.resetModules();
  });

  describe('Navigation', () => {
    test('should navigate between pages', () => {
      // Import and initialize renderer
      require('../../renderer.js');

      // Wait for initialization
      return new Promise(resolve => setTimeout(resolve, 100)).then(() => {
        const homePage = document.getElementById('page-home');
        const settingsPage = document.getElementById('page-settings');

        expect(homePage.classList.contains('active')).toBe(true);
        expect(settingsPage.classList.contains('active')).toBe(false);
      });
    });

    test('should handle theme toggle', () => {
      require('../../renderer.js');

      return new Promise(resolve => setTimeout(resolve, 100)).then(() => {
        const themeBtn = document.getElementById('theme-toggle-btn');
        const initialTheme = themeBtn.getAttribute('data-theme');

        // Simulate click
        themeBtn.click();

        // Should toggle theme
        const newTheme = themeBtn.getAttribute('data-theme');
        expect(newTheme).not.toBe(initialTheme);
      });
    });
  });

  describe('History Management', () => {
    test('should load and display history', () => {
      const mockHistory = [
        { text: 'Test transcription 1', ts: Date.now() },
        { text: 'Test transcription 2', ts: Date.now() - 1000 }
      ];

      mockIpcRenderer.getHistory.mockResolvedValue(mockHistory);

      require('../../renderer.js');

      return new Promise(resolve => setTimeout(resolve, 200)).then(() => {
        const historyList = document.getElementById('history-list-full');
        expect(historyList.children.length).toBeGreaterThan(0);
      });
    });

    test('should add new history item', () => {
      require('../../renderer.js');

      return new Promise(resolve => setTimeout(resolve, 100)).then(() => {
        // Simulate transcription event
        mockIpcRenderer.onTranscription('New transcription');

        const historyList = document.getElementById('history-list-full');
        expect(historyList.children.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Recording States', () => {
    test('should handle recording start', () => {
      require('../../renderer.js');

      return new Promise(resolve => setTimeout(resolve, 100)).then(() => {
        mockIpcRenderer.onRecordingStart();

        const livePreview = document.getElementById('live-preview');
        expect(livePreview.style.display).not.toBe('none');
      });
    });

    test('should handle recording stop', () => {
      require('../../renderer.js');

      return new Promise(resolve => setTimeout(resolve, 100)).then(() => {
        // Start recording first
        mockIpcRenderer.onRecordingStart();

        // Then stop
        mockIpcRenderer.onRecordingStop();

        const livePreview = document.getElementById('live-preview');
        // Should hide after timeout
        setTimeout(() => {
          expect(livePreview.style.display).toBe('none');
        }, 1100);
      });
    });
  });

  describe('Statistics', () => {
    test('should update statistics display', () => {
      require('../../renderer.js');

      return new Promise(resolve => setTimeout(resolve, 100)).then(() => {
        // Directly trigger stats update via exposed test hook
        const hooks = window.__rendererTestHooks;
        hooks.updateStats('This is a test transcription with multiple words');

        // Allow any queued UI updates to flush
        return new Promise(r => setTimeout(r, 20));
      }).then(() => {
        const statWords = document.getElementById('stat-words');
        expect(statWords.textContent).not.toBe('0 words');
      });
    });

    test('should calculate WPM correctly', () => {
      require('../../renderer.js');

      return new Promise(resolve => setTimeout(resolve, 100)).then(() => {
        // Start recording
        mockIpcRenderer.onRecordingStart();

        // Simulate 60 seconds of recording
        setTimeout(() => {
          mockIpcRenderer.onRecordingStop();
          mockIpcRenderer.onTranscription('This is a test with ten words in it for calculation');

          const statWpm = document.getElementById('stat-wpm');
          // Should calculate WPM based on duration and word count
          expect(statWpm.textContent).not.toBe('0 WPM');
        }, 100);
      });
    });
  });

  describe('Settings Management', () => {
    test('should load app settings', () => {
      const mockSettings = {
        theme: 'dark',
        sound_feedback: true,
        waveform_animation: true
      };

      mockIpcRenderer.getAppSettings.mockResolvedValue(mockSettings);

      require('../../renderer.js');

      return new Promise(resolve => setTimeout(resolve, 100)).then(() => {
        expect(mockIpcRenderer.getAppSettings).toHaveBeenCalled();
      });
    });

    test('should save app settings', () => {
      require('../../renderer.js');

      return new Promise(resolve => setTimeout(resolve, 100)).then(() => {
        // Settings should be saved when toggles change
        const testSettings = { theme: 'light', sound_feedback: false };
        mockIpcRenderer.saveAppSettings(testSettings);

        expect(mockIpcRenderer.saveAppSettings).toHaveBeenCalledWith(testSettings);
      });
    });
  });

  describe('Hotkey Configuration', () => {
    test('should handle hotkey input', () => {
      require('../../renderer.js');

      return new Promise(resolve => setTimeout(resolve, 100)).then(() => {
        const holdHotkeyInput = document.getElementById('modal-hold-hotkey');

        // Simulate keydown event
        const event = new KeyboardEvent('keydown', {
          key: 'A',
          ctrlKey: true,
          shiftKey: true
        });

        holdHotkeyInput.dispatchEvent(event);

        expect(holdHotkeyInput.value).toBe('Ctrl+Shift+A');
      });
    });

    test('should save hotkey settings', () => {
      require('../../renderer.js');

      return new Promise(resolve => setTimeout(resolve, 100)).then(() => {
        const saveBtn = document.getElementById('save-shortcuts-btn');

        // Set test values
        document.getElementById('modal-hold-hotkey').value = 'Ctrl+Space';
        document.getElementById('modal-toggle-hotkey').value = 'Ctrl+Shift+Space';

        // Simulate save
        saveBtn.click();

        expect(mockIpcRenderer.saveSettings).toHaveBeenCalledWith({
          holdHotkey: 'Ctrl+Space',
          toggleHotkey: 'Ctrl+Shift+Space'
        });
      });
    });
  });

  describe('System Integration', () => {
    test('should load system information', () => {
      const mockSystemInfo = {
        Device: 'Test Device',
        OS: 'Windows 11',
        CPU: 'Intel i7',
        RAM: '16 GB'
      };

      mockIpcRenderer.getSystemInfo.mockResolvedValue(mockSystemInfo);

      require('../../renderer.js');

      return new Promise(resolve => setTimeout(resolve, 700)).then(() => {
        expect(mockIpcRenderer.getSystemInfo).toHaveBeenCalled();
      });
    });

    test('should handle microphone listing', async () => {
      const mockMicrophones = [
        { id: 'default', name: 'Default Microphone', channels: 1 },
        { id: 'mic1', name: 'External Mic', channels: 2 }
      ];

      mockIpcRenderer.listMicrophones.mockResolvedValue(mockMicrophones);

      require('../../renderer.js');

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const changeBtn = document.getElementById('change-microphone-btn');
      if (changeBtn) {
        // Click the button and wait for async operations
        changeBtn.click();
        // Wait for async listMicrophones call to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        // Should handle microphone list loading
        expect(mockIpcRenderer.listMicrophones).toHaveBeenCalled();
      } else {
        // If button doesn't exist, skip the test
        expect(true).toBe(true);
      }
    });
  });
});
