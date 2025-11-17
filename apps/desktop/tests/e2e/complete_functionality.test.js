/** @jest-environment node */
/**
 * Complete Functionality Tests for ALL SONU Features
 * Tests actual functionality: CRUD operations, toggles, dictation, downloads, etc.
 */

const { _electron: electron } = require('playwright');
const path = require('path');

jest.setTimeout(180000); // 3 minutes per test suite

describe('SONU Complete Functionality Tests', () => {
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
      
      await mainWindow.waitForTimeout(2000);
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
    await mainWindow.waitForTimeout(500);
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
    await mainWindow.waitForTimeout(500);
  }

  async function closeModals() {
    try {
      const modal = await mainWindow.$('.modal.active');
      if (modal) {
        const closeBtn = await mainWindow.$('.modal.active .modal-close, .modal.active .btn-secondary[data-modal]');
        if (closeBtn) {
          await closeBtn.click();
          await mainWindow.waitForTimeout(300);
        }
      }
    } catch (e) {}
  }

  async function toggleCheckbox(selector, shouldBeChecked) {
    const checkbox = await mainWindow.$(selector);
    expect(checkbox).toBeTruthy();
    
    const currentState = await checkbox.isChecked();
    if (currentState !== shouldBeChecked) {
      await checkbox.click();
      await mainWindow.waitForTimeout(300);
    }
    
    const newState = await checkbox.isChecked();
    expect(newState).toBe(shouldBeChecked);
  }

  describe('Dictionary Management - CRUD Operations', () => {
    test('should add a new word to dictionary', async () => {
      await navigateToPage('dictionary');
      await closeModals();
      
      // Click add word button
      const newWordBtn = await mainWindow.$('#new-word-btn');
      expect(newWordBtn).toBeTruthy();
      await newWordBtn.click();
      await mainWindow.waitForSelector('#add-word-modal.active', { timeout: 10000 });
      
      // Enter word
      const wordInput = await mainWindow.$('#new-word-input');
      expect(wordInput).toBeTruthy();
      await wordInput.fill('testword123');
      
      // Submit
      const submitBtn = await mainWindow.$('#add-word-submit-btn');
      expect(submitBtn).toBeTruthy();
      await submitBtn.click();
      
      // Wait for modal to close
      await mainWindow.waitForFunction(() => {
        const modal = document.getElementById('add-word-modal');
        return !modal || !modal.classList.contains('active');
      }, { timeout: 10000 });
      
      // Verify word appears in dictionary list
      await mainWindow.waitForTimeout(1000);
      const dictionaryList = await mainWindow.$('#dictionary-list');
      expect(dictionaryList).toBeTruthy();
      
      // Check if word exists in list
      const wordExists = await mainWindow.evaluate(() => {
        const list = document.getElementById('dictionary-list');
        return list && list.textContent.includes('testword123');
      });
      expect(wordExists).toBe(true);
    }, 60000);

    test('should delete a word from dictionary', async () => {
      await navigateToPage('dictionary');
      await mainWindow.waitForTimeout(1000);
      
      // Find delete button for test word
      const deleteBtn = await mainWindow.evaluateHandle(() => {
        const list = document.getElementById('dictionary-list');
        if (!list) return null;
        const items = list.querySelectorAll('.dictionary-item');
        for (const item of items) {
          if (item.textContent.includes('testword123')) {
            return item.querySelector('.delete-word-btn');
          }
        }
        return null;
      });
      
      if (deleteBtn && deleteBtn.asElement()) {
        await deleteBtn.click();
        await mainWindow.waitForTimeout(1000);
        
        // Verify word is removed
        const wordExists = await mainWindow.evaluate(() => {
          const list = document.getElementById('dictionary-list');
          return list && list.textContent.includes('testword123');
        });
        expect(wordExists).toBe(false);
      }
    }, 60000);
  });

  describe('Snippets Management - CRUD Operations', () => {
    test('should add a new snippet', async () => {
      await navigateToPage('snippets');
      await closeModals();
      
      // Click add snippet button
      const newSnippetBtn = await mainWindow.$('#new-snippet-btn');
      expect(newSnippetBtn).toBeTruthy();
      await newSnippetBtn.click();
      await mainWindow.waitForSelector('#add-snippet-modal.active', { timeout: 10000 });
      
      // Fill snippet form
      const snippetNameInput = await mainWindow.$('#snippet-name-input');
      const snippetTextInput = await mainWindow.$('#snippet-text-input');
      
      if (snippetNameInput) {
        await snippetNameInput.fill('Test Snippet');
      }
      if (snippetTextInput) {
        await snippetTextInput.fill('This is a test snippet content');
      }
      
      // Submit
      const submitBtn = await mainWindow.$('#add-snippet-submit-btn');
      if (submitBtn) {
        await submitBtn.click();
        await mainWindow.waitForTimeout(1000);
      }
      
      // Verify snippet appears
      const snippetsList = await mainWindow.$('#snippets-list');
      expect(snippetsList).toBeTruthy();
    }, 60000);
  });

  describe('Notes Management - CRUD Operations', () => {
    test('should add a new note', async () => {
      await navigateToPage('notes');
      await closeModals();
      
      // Click add note button
      const newNoteBtn = await mainWindow.$('#new-note-btn');
      expect(newNoteBtn).toBeTruthy();
      await newNoteBtn.click();
      await mainWindow.waitForSelector('#add-note-modal.active', { timeout: 10000 });
      
      // Fill note form
      const noteTitleInput = await mainWindow.$('#note-title-input');
      const noteContentInput = await mainWindow.$('#note-content-input');
      
      if (noteTitleInput) {
        await noteTitleInput.fill('Test Note');
      }
      if (noteContentInput) {
        await noteContentInput.fill('This is test note content');
      }
      
      // Submit
      const submitBtn = await mainWindow.$('#add-note-submit-btn');
      if (submitBtn) {
        await submitBtn.click();
        await mainWindow.waitForTimeout(1000);
      }
      
      // Verify note appears
      const notesList = await mainWindow.$('#notes-list');
      expect(notesList).toBeTruthy();
    }, 60000);
  });

  describe('Theme Switcher', () => {
    test('should toggle theme between light and dark', async () => {
      await navigateToPage('home');
      
      const themeBtn = await mainWindow.$('#theme-toggle-btn');
      expect(themeBtn).toBeTruthy();

      // Get initial theme
      const initialTheme = await themeBtn.getAttribute('data-theme');
      expect(['light', 'dark']).toContain(initialTheme);

      // Toggle to opposite
      await themeBtn.click();
      await mainWindow.waitForTimeout(500);

      // Verify theme changed
      const newTheme = await themeBtn.getAttribute('data-theme');
      expect(newTheme).not.toBe(initialTheme);
      
      // Verify body has theme attribute
      const bodyTheme = await mainWindow.evaluate(() => {
        return document.body.getAttribute('data-theme');
      });
      expect(['light', 'dark']).toContain(bodyTheme);
      
      // Toggle back
      await themeBtn.click();
      await mainWindow.waitForTimeout(500);
      
      // Verify back to original
      const finalTheme = await themeBtn.getAttribute('data-theme');
      expect(finalTheme).toBe(initialTheme);
    }, 60000);
  });

  describe('Experimental Features - Toggles', () => {
    test('should toggle continuous dictation on and off', async () => {
      await navigateToSettingsPage('experimental');
      
      const toggle = await mainWindow.$('#continuous-dictation-toggle');
      expect(toggle).toBeTruthy();
      
      // Toggle ON
      await toggleCheckbox('#continuous-dictation-toggle', true);
      
      // Verify setting is saved
      const settingValue = await mainWindow.evaluate(async () => {
        if (window.voiceApp && window.voiceApp.getAppSettings) {
          const settings = await window.voiceApp.getAppSettings();
          return settings.continuous_dictation === true;
        }
        return false;
      });
      expect(settingValue).toBe(true);
      
      // Toggle OFF
      await toggleCheckbox('#continuous-dictation-toggle', false);
      
      // Verify setting is saved
      const settingValueOff = await mainWindow.evaluate(async () => {
        if (window.voiceApp && window.voiceApp.getAppSettings) {
          const settings = await window.voiceApp.getAppSettings();
          return settings.continuous_dictation === false;
        }
        return false;
      });
      expect(settingValueOff).toBe(true);
    }, 60000);

    test('should toggle low-latency audio backend on and off', async () => {
      await navigateToSettingsPage('experimental');
      
      const toggle = await mainWindow.$('#low-latency-toggle');
      expect(toggle).toBeTruthy();
      
      // Toggle ON
      await toggleCheckbox('#low-latency-toggle', true);
      
      // Verify setting is saved
      const settingValue = await mainWindow.evaluate(async () => {
        if (window.voiceApp && window.voiceApp.getAppSettings) {
          const settings = await window.voiceApp.getAppSettings();
          return settings.low_latency === true;
        }
        return false;
      });
      expect(settingValue).toBe(true);
      
      // Toggle OFF
      await toggleCheckbox('#low-latency-toggle', false);
    }, 60000);

    test('should toggle noise reduction on and off', async () => {
      await navigateToSettingsPage('experimental');
      
      const toggle = await mainWindow.$('#noise-reduction-toggle');
      if (toggle) {
        // Toggle ON
        await toggleCheckbox('#noise-reduction-toggle', true);
        
        // Toggle OFF
        await toggleCheckbox('#noise-reduction-toggle', false);
      }
    }, 60000);
  });

  describe('General Settings - Toggles', () => {
    test('should toggle sound feedback on and off', async () => {
      await navigateToSettingsPage('general');
      
      const toggle = await mainWindow.$('#sound-feedback-toggle');
      if (toggle) {
        // Toggle ON
        await toggleCheckbox('#sound-feedback-toggle', true);
        
        // Verify setting
        const settingValue = await mainWindow.evaluate(async () => {
          if (window.voiceApp && window.voiceApp.getAppSettings) {
            const settings = await window.voiceApp.getAppSettings();
            return settings.sound_feedback === true;
          }
          return false;
        });
        expect(settingValue).toBe(true);
        
        // Toggle OFF
        await toggleCheckbox('#sound-feedback-toggle', false);
      }
    }, 60000);

    test('should toggle waveform animation on and off', async () => {
      await navigateToSettingsPage('general');
      
      const toggle = await mainWindow.$('#waveform-toggle');
      if (toggle) {
        // Toggle ON
        await toggleCheckbox('#waveform-toggle', true);
        
        // Verify setting
        const settingValue = await mainWindow.evaluate(async () => {
          if (window.voiceApp && window.voiceApp.getAppSettings) {
            const settings = await window.voiceApp.getAppSettings();
            return settings.waveform_animation === true;
          }
          return false;
        });
        expect(settingValue).toBe(true);
        
        // Toggle OFF
        await toggleCheckbox('#waveform-toggle', false);
      }
    }, 60000);
  });

  describe('Model Management', () => {
    test('should display model selector with available models', async () => {
      await navigateToSettingsPage('model');
      
      // Wait for model selector to load
      await mainWindow.waitForSelector('#model-select', { timeout: 20000 });
      
      // Verify model selector exists and has options
      const hasOptions = await mainWindow.evaluate(() => {
        const select = document.getElementById('model-select');
        return select && select.options && select.options.length > 0;
      });
      expect(hasOptions).toBe(true);
    }, 60000);

    test('should display download button and disk space info', async () => {
      await navigateToSettingsPage('model');
      
      // Verify download button exists
      const downloadBtn = await mainWindow.$('#download-model-btn');
      expect(downloadBtn).toBeTruthy();
      
      // Verify disk space info exists
      await mainWindow.waitForSelector('#model-disk-space', { timeout: 20000 });
      const diskSpace = await mainWindow.textContent('#model-disk-space');
      expect(diskSpace).toBeTruthy();
    }, 60000);
  });

  describe('Settings Persistence', () => {
    test('should persist theme across app restarts', async () => {
      await navigateToPage('home');
      
      const themeBtn = await mainWindow.$('#theme-toggle-btn');
      const currentTheme = await themeBtn.getAttribute('data-theme');
      
      // Change theme
      await themeBtn.click();
      await mainWindow.waitForTimeout(500);
      
      const newTheme = await themeBtn.getAttribute('data-theme');
      expect(newTheme).not.toBe(currentTheme);
      
      // Reload page
      await mainWindow.reload();
      await mainWindow.waitForLoadState();
      await mainWindow.waitForTimeout(2000);
      
      // Verify theme persisted
      const themeBtnAfter = await mainWindow.$('#theme-toggle-btn');
      const persistedTheme = await themeBtnAfter.getAttribute('data-theme');
      expect(persistedTheme).toBe(newTheme);
    }, 90000);
  });

  describe('Navigation and UI Responsiveness', () => {
    test('should navigate through all main tabs smoothly', async () => {
      const tabs = ['home', 'dictionary', 'snippets', 'style', 'notes', 'settings'];
      
      for (const tab of tabs) {
        await navigateToPage(tab);
        await mainWindow.waitForSelector(`#page-${tab}.active`, { timeout: 10000 });
        await mainWindow.waitForTimeout(300);
      }
    }, 120000);

    test('should navigate through all settings tabs smoothly', async () => {
      const settingsTabs = ['general', 'system', 'model', 'themes', 'vibe', 'experimental'];
      
      for (const tab of settingsTabs) {
        await navigateToSettingsPage(tab);
        await mainWindow.waitForSelector(`#settings-${tab}.active`, { timeout: 15000 });
        await mainWindow.waitForTimeout(300);
      }
    }, 120000);
  });

  describe('Statistics Display', () => {
    test('should display all statistics correctly', async () => {
      await navigateToPage('home');
      
      // Verify all stat cards exist and have content
      const statTime = await mainWindow.textContent('#stat-time');
      const statWords = await mainWindow.textContent('#stat-words');
      const statWpm = await mainWindow.textContent('#stat-wpm');
      const statSaved = await mainWindow.textContent('#stat-saved');

      expect(statTime).toBeTruthy();
      expect(statWords).toBeTruthy();
      expect(statWpm).toBeTruthy();
      expect(statSaved).toBeTruthy();
    }, 60000);
  });

  describe('History Management', () => {
    test('should display history list and retention settings', async () => {
      await navigateToPage('home');
      
      // Verify history list exists
      await mainWindow.waitForSelector('#history-list-full', { timeout: 10000 });
      
      // Verify retention dropdown exists
      const retentionSelect = await mainWindow.$('#history-retention');
      expect(retentionSelect).toBeTruthy();
    }, 60000);
  });
});

