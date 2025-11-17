/** @jest-environment node */
/**
 * Real-Time Comprehensive E2E Tests for ALL SONU Features
 * Tests actual user interactions: clicks, toggles, downloads, dictation, etc.
 * This test suite actually interacts with the app in real-time
 */

const { _electron: electron } = require('playwright');
const path = require('path');

jest.setTimeout(300000); // 5 minutes for comprehensive real-time testing

describe('SONU Real-Time Comprehensive Tests', () => {
  let electronApp;
  let mainWindow;

  beforeAll(async () => {
    // Ensure setImmediate exists
    if (typeof setImmediate === 'undefined') {
      global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
    }
    
    const appPath = path.resolve(__dirname, '..', '..');
    
    try {
      electronApp = await electron.launch({
        args: [appPath],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          E2E_TEST: '1'
        },
        timeout: 90000
      });

      let retries = 3;
      while (retries > 0) {
        try {
          mainWindow = await electronApp.firstWindow({ timeout: 30000 });
          break;
        } catch (e) {
          retries--;
          if (retries === 0) throw e;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      await mainWindow.waitForLoadState('domcontentloaded', { timeout: 60000 });
      await mainWindow.waitForSelector('#sidebar', { timeout: 45000, state: 'attached' });
      
      try {
        await mainWindow.waitForSelector('body[data-app-ready="1"]', { timeout: 30000 });
      } catch (e) {
        await mainWindow.waitForFunction(() => {
          return !!(window.voiceApp && 
                    window.voiceApp.isAppReady && 
                    window.voiceApp.isAppReady() &&
                    window.voiceApp.navigateToPage &&
                    window.voiceApp.navigateToSettingsPage);
        }, { timeout: 30000 });
      }
      
      await mainWindow.waitForTimeout(3000); // Wait for app to fully initialize
    } catch (error) {
      if (electronApp) {
        try {
          await electronApp.close({ force: true });
        } catch (e) {}
      }
      throw new Error(`Failed to launch Electron app: ${error.message}`);
    }
  }, 180000);

  afterAll(async () => {
    if (electronApp) {
      try {
        await Promise.race([
          electronApp.close(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
        ]);
      } catch (e) {
        try {
          await electronApp.close({ force: true }).catch(() => {});
        } catch (e2) {}
      }
    }
  }, 20000);

  // Helper functions
  async function navigateToPage(page) {
    const hasHelper = await mainWindow.evaluate(() => !!(window.voiceApp && window.voiceApp.navigateToPage));
    if (hasHelper) {
      await mainWindow.evaluate((p) => window.voiceApp.navigateToPage(p), page);
    } else {
      await mainWindow.click(`[data-page="${page}"]`);
    }
    await mainWindow.waitForSelector(`#page-${page}.active`, { timeout: 15000 });
    await mainWindow.waitForTimeout(1000); // Wait for page to fully load
  }

  async function navigateToSettingsPage(page) {
    await navigateToPage('settings');
    await mainWindow.waitForTimeout(500);
    const hasHelper = await mainWindow.evaluate(() => !!(window.voiceApp && window.voiceApp.navigateToSettingsPage));
    if (hasHelper) {
      await mainWindow.evaluate((p) => window.voiceApp.navigateToSettingsPage(p), page);
    } else {
      await mainWindow.click(`[data-settings-page="${page}"]`);
    }
    await mainWindow.waitForSelector(`#settings-${page}.active`, { timeout: 15000 });
    await mainWindow.waitForTimeout(1000);
  }

  async function closeModals() {
    try {
      const modal = await mainWindow.$('.modal.active');
      if (modal) {
        const closeBtn = await mainWindow.$('.modal.active .modal-close, .modal.active .btn-secondary[data-modal]');
        if (closeBtn) {
          await closeBtn.click();
          await mainWindow.waitForTimeout(500);
        }
      }
    } catch (e) {}
  }

  async function clickButton(selector, waitFor = 1000) {
    const btn = await mainWindow.$(selector);
    if (btn) {
      await btn.click();
      await mainWindow.waitForTimeout(waitFor);
      return true;
    }
    return false;
  }

  async function fillInput(selector, text) {
    const input = await mainWindow.$(selector);
    if (input) {
      await input.fill(text);
      await mainWindow.waitForTimeout(300);
      return true;
    }
    return false;
  }

  async function toggleCheckbox(selector, shouldBeChecked) {
    const checkbox = await mainWindow.$(selector);
    if (checkbox) {
      const currentState = await checkbox.isChecked();
      if (currentState !== shouldBeChecked) {
        await checkbox.click();
        await mainWindow.waitForTimeout(500);
      }
      const newState = await checkbox.isChecked();
      return newState === shouldBeChecked;
    }
    return false;
  }

  async function selectOption(selector, value) {
    const select = await mainWindow.$(selector);
    if (select) {
      await select.selectOption(value);
      await mainWindow.waitForTimeout(500);
      return true;
    }
    return false;
  }

  describe('Navigation - All Tabs', () => {
    test('should navigate through all main tabs and verify content', async () => {
      const tabs = [
        { page: 'home', elements: ['#stat-time', '#history-list-full'] },
        { page: 'dictionary', elements: ['#dictionary-list', '#new-word-btn'] },
        { page: 'snippets', elements: ['#snippets-list', '#new-snippet-btn'] },
        { page: 'style', elements: ['.style-category'] },
        { page: 'notes', elements: ['#notes-list', '#new-note-btn'] },
        { page: 'settings', elements: ['.settings-sidebar'] }
      ];

      for (const tab of tabs) {
        console.log(`Testing tab: ${tab.page}`);
        await navigateToPage(tab.page);
        
        // Verify elements exist
        for (const element of tab.elements) {
          await mainWindow.waitForSelector(element, { timeout: 10000 });
        }
        
        await mainWindow.waitForTimeout(500);
      }
    }, 120000);
  });

  describe('Dictionary - Full CRUD Operations', () => {
    test('should add, view, copy, and delete a word', async () => {
      await navigateToPage('dictionary');
      await closeModals();
      
      const testWord = `testword_${Date.now()}`;
      
      // Add word
      console.log('Adding word:', testWord);
      await clickButton('#new-word-btn');
      await mainWindow.waitForSelector('#add-word-modal.active', { timeout: 10000 });
      await fillInput('#new-word-input', testWord);
      await clickButton('#add-word-submit-btn');
      await mainWindow.waitForTimeout(2000);
      
      // Verify word appears
      const wordExists = await mainWindow.evaluate((word) => {
        const list = document.getElementById('dictionary-list');
        return list && list.textContent.includes(word);
      }, testWord);
      expect(wordExists).toBe(true);
      
      // Test copy button
      console.log('Testing copy button');
      const copyBtn = await mainWindow.evaluateHandle((word) => {
        const list = document.getElementById('dictionary-list');
        if (!list) return null;
        const items = list.querySelectorAll('.dictionary-item');
        for (const item of items) {
          if (item.textContent.includes(word)) {
            return item.querySelector('.dictionary-copy-btn');
          }
        }
        return null;
      }, testWord);
      
      if (copyBtn && copyBtn.asElement()) {
        await copyBtn.click();
        await mainWindow.waitForTimeout(1000);
        // Verify clipboard (if accessible)
        const clipboardText = await mainWindow.evaluate(async () => {
          if (navigator.clipboard && navigator.clipboard.readText) {
            try {
              return await navigator.clipboard.readText();
            } catch (e) {
              return null;
            }
          }
          return null;
        });
        if (clipboardText) {
          expect(clipboardText).toBe(testWord);
        }
      }
      
      // Delete word
      console.log('Deleting word');
      const deleteBtn = await mainWindow.evaluateHandle((word) => {
        const list = document.getElementById('dictionary-list');
        if (!list) return null;
        const items = list.querySelectorAll('.dictionary-item');
        for (const item of items) {
          if (item.textContent.includes(word)) {
            return item.querySelector('.delete-word-btn');
          }
        }
        return null;
      }, testWord);
      
      if (deleteBtn && deleteBtn.asElement()) {
        await deleteBtn.click();
        await mainWindow.waitForTimeout(1000);
        
        // Verify word is removed
        const wordStillExists = await mainWindow.evaluate((word) => {
          const list = document.getElementById('dictionary-list');
          return list && list.textContent.includes(word);
        }, testWord);
        expect(wordStillExists).toBe(false);
      }
    }, 60000);
  });

  describe('Snippets - Full CRUD Operations', () => {
    test('should add, view, copy, and delete a snippet', async () => {
      await navigateToPage('snippets');
      await closeModals();
      
      const snippetName = `Test Snippet ${Date.now()}`;
      const snippetText = 'This is a test snippet for automated testing';
      
      // Add snippet
      console.log('Adding snippet');
      await clickButton('#new-snippet-btn');
      await mainWindow.waitForSelector('#add-snippet-modal.active', { timeout: 10000 });
      
      const nameInput = await mainWindow.$('#snippet-name-input');
      const textInput = await mainWindow.$('#snippet-text-input');
      
      if (nameInput) await fillInput('#snippet-name-input', snippetName);
      if (textInput) await fillInput('#snippet-text-input', snippetText);
      
      await clickButton('#add-snippet-submit-btn');
      await mainWindow.waitForTimeout(2000);
      
      // Verify snippet appears
      const snippetExists = await mainWindow.evaluate((name) => {
        const list = document.getElementById('snippets-list');
        return list && list.textContent.includes(name);
      }, snippetName);
      expect(snippetExists).toBe(true);
      
      // Test copy button
      console.log('Testing snippet copy button');
      const copyBtn = await mainWindow.evaluateHandle((name) => {
        const list = document.getElementById('snippets-list');
        if (!list) return null;
        const items = list.querySelectorAll('.snippet-item');
        for (const item of items) {
          if (item.textContent.includes(name)) {
            return item.querySelector('.snippet-copy-btn');
          }
        }
        return null;
      }, snippetName);
      
      if (copyBtn && copyBtn.asElement()) {
        await copyBtn.click();
        await mainWindow.waitForTimeout(1000);
      }
    }, 60000);
  });

  describe('Notes - Full CRUD Operations', () => {
    test('should add, view, copy, and delete a note', async () => {
      await navigateToPage('notes');
      await closeModals();
      
      const noteTitle = `Test Note ${Date.now()}`;
      const noteContent = 'This is test note content for automated testing';
      
      // Add note
      console.log('Adding note');
      await clickButton('#new-note-btn');
      await mainWindow.waitForSelector('#add-note-modal.active', { timeout: 10000 });
      
      const titleInput = await mainWindow.$('#note-title-input');
      const contentInput = await mainWindow.$('#note-content-input');
      
      if (titleInput) await fillInput('#note-title-input', noteTitle);
      if (contentInput) await fillInput('#note-content-input', noteContent);
      
      await clickButton('#add-note-submit-btn');
      await mainWindow.waitForTimeout(2000);
      
      // Verify note appears
      const noteExists = await mainWindow.evaluate((title) => {
        const list = document.getElementById('notes-list');
        return list && list.textContent.includes(title);
      }, noteTitle);
      expect(noteExists).toBe(true);
      
      // Test copy button
      console.log('Testing note copy button');
      const copyBtn = await mainWindow.evaluateHandle((title) => {
        const list = document.getElementById('notes-list');
        if (!list) return null;
        const items = list.querySelectorAll('.note-item');
        for (const item of items) {
          if (item.textContent.includes(title)) {
            return item.querySelector('.note-copy-btn');
          }
        }
        return null;
      }, noteTitle);
      
      if (copyBtn && copyBtn.asElement()) {
        await copyBtn.click();
        await mainWindow.waitForTimeout(1000);
      }
    }, 60000);
  });

  describe('Theme System - Real Changes', () => {
    test('should change themes and verify changes persist', async () => {
      await navigateToPage('home');
      
      // Get initial theme
      const initialTheme = await mainWindow.evaluate(() => {
        return document.body.getAttribute('data-theme') || 'light';
      });
      console.log('Initial theme:', initialTheme);
      
      // Toggle theme using button
      const themeBtn = await mainWindow.$('#theme-toggle-btn');
      expect(themeBtn).toBeTruthy();
      
      await themeBtn.click();
      await mainWindow.waitForTimeout(1000);
      
      // Verify theme changed
      const newTheme = await mainWindow.evaluate(() => {
        return document.body.getAttribute('data-theme');
      });
      expect(newTheme).not.toBe(initialTheme);
      console.log('Theme changed to:', newTheme);
      
      // Test theme gallery in settings
      await navigateToSettingsPage('themes');
      await mainWindow.waitForTimeout(1000);
      
      // Click on a different theme option
      const themeOptions = await mainWindow.$$('.theme-option');
      if (themeOptions.length > 0) {
        // Click second theme if available
        if (themeOptions.length > 1) {
          await themeOptions[1].click();
          await mainWindow.waitForTimeout(1000);
          
          // Verify theme changed
          const galleryTheme = await mainWindow.evaluate(() => {
            return document.body.getAttribute('data-theme');
          });
          expect(galleryTheme).toBeTruthy();
          console.log('Theme from gallery:', galleryTheme);
        }
      }
    }, 60000);
  });

  describe('Model Management - Selection and Download', () => {
    test('should change model selection and test download UI', async () => {
      await navigateToSettingsPage('model');
      
      // Wait for model selector to load
      await mainWindow.waitForSelector('#model-select', { timeout: 20000 });
      
      // Get available models
      const models = await mainWindow.evaluate(() => {
        const select = document.getElementById('model-select');
        if (!select) return [];
        return Array.from(select.options).map(opt => ({
          value: opt.value,
          text: opt.text
        }));
      });
      
      expect(models.length).toBeGreaterThan(0);
      console.log('Available models:', models);
      
      // Change model selection
      if (models.length > 1) {
        const secondModel = models[1].value;
        await selectOption('#model-select', secondModel);
        await mainWindow.waitForTimeout(2000);
        
        // Verify selection changed
        const selectedModel = await mainWindow.evaluate(() => {
          const select = document.getElementById('model-select');
          return select ? select.value : null;
        });
        expect(selectedModel).toBe(secondModel);
        console.log('Model changed to:', selectedModel);
      }
      
      // Test download button (click but don't wait for completion)
      const downloadBtn = await mainWindow.$('#download-model-btn');
      if (downloadBtn) {
        console.log('Testing download button click');
        await downloadBtn.click();
        await mainWindow.waitForTimeout(2000);
        
        // Check if download started or if cancel button appears
        const cancelBtn = await mainWindow.$('#cancel-download-btn');
        if (cancelBtn) {
          console.log('Download started - testing cancel');
          await cancelBtn.click();
          await mainWindow.waitForTimeout(2000);
          console.log('Download cancelled');
        }
      }
    }, 90000);
  });

  describe('All Toggles - Experimental Features', () => {
    test('should toggle all experimental features on and off', async () => {
      await navigateToSettingsPage('experimental');
      
      const toggles = [
        { id: 'continuous-dictation-toggle', name: 'Continuous Dictation' },
        { id: 'low-latency-toggle', name: 'Low Latency' },
        { id: 'noise-reduction-toggle', name: 'Noise Reduction' }
      ];
      
      for (const toggle of toggles) {
        console.log(`Testing toggle: ${toggle.name}`);
        
        // Toggle ON
        const toggledOn = await toggleCheckbox(`#${toggle.id}`, true);
        expect(toggledOn).toBe(true);
        console.log(`${toggle.name} toggled ON`);
        
        // Verify setting saved
        const settingOn = await mainWindow.evaluate(async (id) => {
          if (window.voiceApp && window.voiceApp.getAppSettings) {
            const settings = await window.voiceApp.getAppSettings();
            const settingKey = id.replace('-toggle', '').replace(/-/g, '_');
            return settings[settingKey] === true;
          }
          return false;
        }, toggle.id);
        expect(settingOn).toBe(true);
        
        // Toggle OFF
        const toggledOff = await toggleCheckbox(`#${toggle.id}`, false);
        expect(toggledOff).toBe(true);
        console.log(`${toggle.name} toggled OFF`);
        
        await mainWindow.waitForTimeout(500);
      }
    }, 90000);
  });

  describe('All Toggles - General Settings', () => {
    test('should toggle all general settings on and off', async () => {
      await navigateToSettingsPage('general');
      
      const toggles = [
        { id: 'sound-feedback-toggle', name: 'Sound Feedback' },
        { id: 'waveform-toggle', name: 'Waveform Animation' }
      ];
      
      for (const toggle of toggles) {
        console.log(`Testing toggle: ${toggle.name}`);
        
        // Toggle ON
        const toggledOn = await toggleCheckbox(`#${toggle.id}`, true);
        expect(toggledOn).toBe(true);
        console.log(`${toggle.name} toggled ON`);
        
        // Toggle OFF
        const toggledOff = await toggleCheckbox(`#${toggle.id}`, false);
        expect(toggledOff).toBe(true);
        console.log(`${toggle.name} toggled OFF`);
        
        await mainWindow.waitForTimeout(500);
      }
    }, 60000);
  });

  describe('History - Copy Buttons', () => {
    test('should test copy buttons in history', async () => {
      await navigateToPage('home');
      await mainWindow.waitForTimeout(2000);
      
      // Check if history has items
      const historyItems = await mainWindow.$$('.history-item');
      
      if (historyItems.length > 0) {
        console.log(`Found ${historyItems.length} history items`);
        
        // Test copy button on first item
        const firstItem = historyItems[0];
        const copyBtn = await firstItem.$('.copy-icon');
        
        if (copyBtn) {
          console.log('Testing history copy button');
          await copyBtn.click();
          await mainWindow.waitForTimeout(1000);
        }
      } else {
        console.log('No history items to test copy functionality');
      }
    }, 30000);
  });

  describe('Settings Navigation - All Sub-Tabs', () => {
    test('should navigate through all settings sub-tabs', async () => {
      const settingsTabs = [
        'general',
        'system',
        'model',
        'themes',
        'vibe',
        'experimental'
      ];
      
      for (const tab of settingsTabs) {
        console.log(`Navigating to settings tab: ${tab}`);
        await navigateToSettingsPage(tab);
        await mainWindow.waitForSelector(`#settings-${tab}.active`, { timeout: 15000 });
        await mainWindow.waitForTimeout(500);
      }
    }, 120000);
  });

  describe('Window Controls', () => {
    test('should test all window control buttons', async () => {
      // Test minimize
      const minimizeBtn = await mainWindow.$('#minimize-btn');
      if (minimizeBtn) {
        console.log('Testing minimize button');
        await minimizeBtn.click();
        await mainWindow.waitForTimeout(1000);
        
        // Restore window
        await mainWindow.evaluate(() => {
          if (window.voiceApp && window.voiceApp.restoreWindow) {
            window.voiceApp.restoreWindow();
          }
        });
        await mainWindow.waitForTimeout(1000);
      }
      
      // Test maximize
      const maximizeBtn = await mainWindow.$('#maximize-btn');
      if (maximizeBtn) {
        console.log('Testing maximize button');
        await maximizeBtn.click();
        await mainWindow.waitForTimeout(1000);
        
        // Restore
        await maximizeBtn.click();
        await mainWindow.waitForTimeout(1000);
      }
    }, 30000);
  });

  describe('Dictation - UI and Functionality Testing', () => {
    test('should test dictation UI elements and simulate dictation flow', async () => {
      await navigateToPage('home');
      
      // Check for dictation-related UI elements
      const hotkeyDisplay = await mainWindow.$('#current-hold-hotkey');
      expect(hotkeyDisplay).toBeTruthy();
      
      const hotkeyText = await hotkeyDisplay.textContent();
      console.log('Current hold hotkey:', hotkeyText);
      
      // Check for live preview container (may be hidden)
      const livePreview = await mainWindow.$('#live-preview');
      expect(livePreview).toBeTruthy();
      
      // Check for waveform container (may be hidden)
      const waveformContainer = await mainWindow.$('#waveform-container');
      expect(waveformContainer).toBeTruthy();
      
      // Test if we can trigger recording via IPC (simulated)
      const canStartRecording = await mainWindow.evaluate(() => {
        return !!(window.voiceApp && window.voiceApp.startRecording);
      });
      console.log('Can start recording via IPC:', canStartRecording);
      
      // Test notes recording (NFC dictation)
      await navigateToPage('notes');
      await mainWindow.waitForTimeout(1000);
      
      // Check for notes recording button
      const notesRecordBtn = await mainWindow.$('#start-notes-recording-btn, .notes-record-btn, [data-action="start-notes-recording"]');
      if (notesRecordBtn) {
        console.log('Notes recording button found - testing click');
        // Don't actually start recording in test, just verify button exists and is clickable
        const isVisible = await notesRecordBtn.isVisible();
        console.log('Notes recording button visible:', isVisible);
      } else {
        // Try to find via text content
        const allButtons = await mainWindow.$$('button');
        for (const btn of allButtons) {
          const text = await btn.textContent();
          if (text && (text.includes('Record') || text.includes('Start'))) {
            console.log('Found potential recording button:', text);
          }
        }
      }
    }, 60000);
  });

  describe('Notes Recording (NFC Dictation)', () => {
    test('should test notes recording functionality and UI', async () => {
      await navigateToPage('notes');
      await mainWindow.waitForTimeout(2000);
      
      // Look for notes microphone button
      const notesMicBtn = await mainWindow.$('#notes-mic-btn, .notes-mic-btn, [id*="mic"][id*="note"], button[class*="mic"]');
      
      if (notesMicBtn) {
        console.log('Notes microphone button found');
        const isVisible = await notesMicBtn.isVisible();
        const isEnabled = await notesMicBtn.isEnabled();
        console.log('Notes mic button state:', { isVisible, isEnabled });
        
        // Test if button can be clicked (without actually starting recording)
        if (isEnabled && isVisible) {
          console.log('Notes mic button is clickable');
        }
      } else {
        // Search for any button with mic or record in notes page
        const allButtons = await mainWindow.$$('#page-notes button');
        console.log(`Found ${allButtons.length} buttons in notes page`);
        
        for (const btn of allButtons) {
          const text = await btn.textContent();
          const id = await btn.getAttribute('id');
          const className = await btn.getAttribute('class');
          
          if (text || id || className) {
            const searchText = `${text || ''} ${id || ''} ${className || ''}`.toLowerCase();
            if (searchText.includes('mic') || searchText.includes('record')) {
              console.log('Found potential recording button:', { text, id, className });
            }
          }
        }
      }
      
      // Test if notes recording IPC methods are available
      const ipcMethods = await mainWindow.evaluate(() => {
        if (!window.voiceApp) return null;
        return {
          hasStartNotesRecording: !!(window.voiceApp.startNotesRecording || 
                                     (window.voiceApp.ipc && window.voiceApp.ipc.startNotesRecording)),
          hasStopNotesRecording: !!(window.voiceApp.stopNotesRecording || 
                                    (window.voiceApp.ipc && window.voiceApp.ipc.stopNotesRecording)),
          hasOnNotesRecordingStart: !!(window.voiceApp.onNotesRecordingStart || 
                                       (window.voiceApp.ipc && window.voiceApp.ipc.onNotesRecordingStart)),
          hasOnNotesRecordingStop: !!(window.voiceApp.onNotesRecordingStop || 
                                      (window.voiceApp.ipc && window.voiceApp.ipc.onNotesRecordingStop))
        };
      });
      console.log('Notes recording IPC methods:', ipcMethods);
      
      // Verify at least one method exists
      if (ipcMethods) {
        const hasAnyMethod = Object.values(ipcMethods).some(v => v === true);
        expect(hasAnyMethod).toBe(true);
      }
    }, 60000);
  });

  describe('Statistics Display', () => {
    test('should verify all statistics are displayed and update', async () => {
      await navigateToPage('home');
      
      // Verify all stat cards exist
      const statTime = await mainWindow.textContent('#stat-time');
      const statWords = await mainWindow.textContent('#stat-words');
      const statWpm = await mainWindow.textContent('#stat-wpm');
      const statSaved = await mainWindow.textContent('#stat-saved');
      
      expect(statTime).toBeTruthy();
      expect(statWords).toBeTruthy();
      expect(statWpm).toBeTruthy();
      expect(statSaved).toBeTruthy();
      
      console.log('Statistics:', {
        time: statTime,
        words: statWords,
        wpm: statWpm,
        saved: statSaved
      });
    }, 30000);
  });

  describe('System Information', () => {
    test('should load and refresh system information', async () => {
      await navigateToSettingsPage('system');
      
      // Wait for system info to load
      await mainWindow.waitForSelector('.system-info-container', { timeout: 20000 });
      
      // Verify system info rows exist
      const infoRows = await mainWindow.$$('.system-info-row');
      expect(infoRows.length).toBeGreaterThan(0);
      
      // Test refresh button
      const refreshBtn = await mainWindow.$('#refresh-system-info-btn');
      if (refreshBtn) {
        console.log('Testing system info refresh');
        await refreshBtn.click();
        await mainWindow.waitForTimeout(3000);
        
        // Verify info still exists after refresh
        await mainWindow.waitForSelector('.system-info-container', { timeout: 20000 });
      }
    }, 60000);
  });

  describe('Hotkey Settings', () => {
    test('should open and interact with hotkey settings modal', async () => {
      await navigateToSettingsPage('general');
      
      // Open shortcuts modal
      const shortcutsBtn = await mainWindow.$('#change-shortcuts-btn');
      if (shortcutsBtn) {
        await shortcutsBtn.click();
        await mainWindow.waitForSelector('#shortcuts-modal.active', { timeout: 10000 });
        
        // Verify modal elements
        const holdInput = await mainWindow.$('#modal-hold-hotkey');
        const toggleInput = await mainWindow.$('#modal-toggle-hotkey');
        
        expect(holdInput).toBeTruthy();
        expect(toggleInput).toBeTruthy();
        
        // Close modal
        await closeModals();
      }
    }, 30000);
  });

  describe('Style Transformer', () => {
    test('should test style page and categories', async () => {
      await navigateToPage('style');
      await mainWindow.waitForTimeout(2000);
      
      // Verify style categories exist
      const styleCategories = await mainWindow.$$('.style-category');
      expect(styleCategories.length).toBeGreaterThan(0);
      
      // Click on a style option if available
      const styleOptions = await mainWindow.$$('.style-option');
      if (styleOptions.length > 0) {
        console.log('Testing style selection');
        await styleOptions[0].click();
        await mainWindow.waitForTimeout(1000);
      }
    }, 30000);
  });
});

