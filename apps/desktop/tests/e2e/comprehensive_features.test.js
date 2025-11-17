/** @jest-environment node */
/**
 * Comprehensive End-to-End Tests for ALL SONU Features
 * Tests all tabs, UI features, and functionalities automatically
 */

const { _electron: electron } = require('playwright');
const path = require('path');

jest.setTimeout(120000); // 2 minutes per test suite

describe('SONU Comprehensive Feature Tests', () => {
  let electronApp;
  let mainWindow;

  beforeAll(async () => {
    // Ensure setImmediate exists in test environment
    if (typeof setImmediate === 'undefined') {
      global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
    }
    
    // Launch Electron app
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

      // Get main window with retry logic
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

      // Wait for app to load
      await mainWindow.waitForLoadState('domcontentloaded', { timeout: 60000 });
      await mainWindow.waitForLoadState('load', { timeout: 60000 }).catch(() => {});
      
      // Wait for sidebar
      await mainWindow.waitForSelector('#sidebar', { timeout: 45000, state: 'attached' });
      await mainWindow.waitForSelector('#sidebar', { timeout: 30000, state: 'visible' });
      
      // Wait for app readiness
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

  describe('Main Navigation Tabs', () => {
    test('should navigate to Home tab and verify elements', async () => {
      await navigateToPage('home');
      
      // Verify home page elements
      await mainWindow.waitForSelector('.welcome-text', { timeout: 10000 });
      await mainWindow.waitForSelector('.stats-cards', { timeout: 10000 });
      await mainWindow.waitForSelector('#stat-time', { timeout: 10000 });
      await mainWindow.waitForSelector('#stat-words', { timeout: 10000 });
      await mainWindow.waitForSelector('#stat-wpm', { timeout: 10000 });
      await mainWindow.waitForSelector('#history-list-full', { timeout: 10000 });
    }, 60000);

    test('should navigate to Dictionary tab and verify elements', async () => {
      await navigateToPage('dictionary');
      
      // Verify dictionary elements
      await mainWindow.waitForSelector('#new-word-btn', { timeout: 10000 });
      await mainWindow.waitForSelector('#dictionary-list', { timeout: 10000 });
    }, 60000);

    test('should navigate to Snippets tab and verify elements', async () => {
      await navigateToPage('snippets');
      
      // Verify snippets elements
      await mainWindow.waitForSelector('#new-snippet-btn', { timeout: 10000 });
      await mainWindow.waitForSelector('#snippets-list', { timeout: 10000 });
    }, 60000);

    test('should navigate to Style tab and verify elements', async () => {
      await navigateToPage('style');
      
      // Verify style elements
      await mainWindow.waitForSelector('.style-category', { timeout: 10000 });
    }, 60000);

    test('should navigate to Notes tab and verify elements', async () => {
      await navigateToPage('notes');
      
      // Verify notes elements
      await mainWindow.waitForSelector('#new-note-btn', { timeout: 10000 });
      await mainWindow.waitForSelector('#notes-list', { timeout: 10000 });
    }, 60000);

    test('should navigate to Settings tab and verify elements', async () => {
      await navigateToPage('settings');
      
      // Verify settings sidebar
      await mainWindow.waitForSelector('.settings-sidebar', { timeout: 10000 });
      await mainWindow.waitForSelector('.settings-nav-item', { timeout: 10000 });
    }, 60000);
  });

  describe('Settings Sub-Tabs', () => {
    test('should navigate to General settings and verify elements', async () => {
      await navigateToSettingsPage('general');
      
      // Verify general settings elements
      await mainWindow.waitForSelector('#change-shortcuts-btn', { timeout: 10000 });
    }, 60000);

    test('should navigate to System settings and verify elements', async () => {
      await navigateToSettingsPage('system');
      
      // Verify system info loads
      await mainWindow.waitForSelector('.system-info-container', { timeout: 20000 });
      await mainWindow.waitForSelector('#refresh-system-info-btn', { timeout: 10000 });
    }, 60000);

    test('should navigate to Model Selector and verify elements', async () => {
      await navigateToSettingsPage('model');
      
      // Verify model selector elements
      await mainWindow.waitForSelector('#model-select', { timeout: 20000 });
      await mainWindow.waitForSelector('#download-model-btn', { timeout: 20000 });
    }, 60000);

    test('should navigate to Themes settings and verify elements', async () => {
      await navigateToSettingsPage('themes');
      
      // Verify themes elements
      await mainWindow.waitForSelector('.theme-option', { timeout: 10000 });
    }, 60000);

    test('should navigate to Vibe Coding settings and verify elements', async () => {
      await navigateToSettingsPage('vibe');
      
      // Verify vibe settings elements exist
      const vibePage = await mainWindow.$('#settings-vibe');
      expect(vibePage).toBeTruthy();
    }, 60000);

    test('should navigate to Experimental settings and verify elements', async () => {
      await navigateToSettingsPage('experimental');
      
      // Verify experimental settings elements exist
      const expPage = await mainWindow.$('#settings-experimental');
      expect(expPage).toBeTruthy();
    }, 60000);
  });

  describe('Theme System', () => {
    test('should toggle theme between light and dark', async () => {
      await navigateToPage('home');
      
      const themeBtn = await mainWindow.$('#theme-toggle-btn');
      expect(themeBtn).toBeTruthy();

      // Get initial theme
      const initialTheme = await themeBtn.getAttribute('data-theme');
      expect(['light', 'dark']).toContain(initialTheme);

      // Toggle theme
      await themeBtn.click();
      await mainWindow.waitForTimeout(500);

      // Verify theme changed
      const newTheme = await themeBtn.getAttribute('data-theme');
      expect(newTheme).not.toBe(initialTheme);
      expect(['light', 'dark']).toContain(newTheme);
    }, 60000);

    test('should persist theme across page navigation', async () => {
      await navigateToPage('home');
      
      const themeBtn = await mainWindow.$('#theme-toggle-btn');
      const currentTheme = await themeBtn.getAttribute('data-theme');

      // Navigate away and back
      await navigateToPage('dictionary');
      await navigateToPage('home');

      // Verify theme persisted
      const themeBtnAfter = await mainWindow.$('#theme-toggle-btn');
      const persistedTheme = await themeBtnAfter.getAttribute('data-theme');
      expect(persistedTheme).toBe(currentTheme);
    }, 60000);
  });

  describe('Dictionary Management', () => {
    test('should open add word modal', async () => {
      await navigateToPage('dictionary');
      await closeModals();
      
      const newWordBtn = await mainWindow.$('#new-word-btn');
      expect(newWordBtn).toBeTruthy();
      
      await newWordBtn.click();
      await mainWindow.waitForSelector('#add-word-modal.active', { timeout: 10000 });
      
      // Verify modal elements
      await mainWindow.waitForSelector('#new-word-input', { timeout: 5000 });
      await mainWindow.waitForSelector('#add-word-submit-btn', { timeout: 5000 });
    }, 60000);
  });

  describe('Snippets Management', () => {
    test('should open add snippet modal', async () => {
      await navigateToPage('snippets');
      await closeModals();
      
      const newSnippetBtn = await mainWindow.$('#new-snippet-btn');
      expect(newSnippetBtn).toBeTruthy();
      
      await newSnippetBtn.click();
      await mainWindow.waitForSelector('#add-snippet-modal.active', { timeout: 10000 });
    }, 60000);
  });

  describe('Notes Management', () => {
    test('should open add note modal', async () => {
      await navigateToPage('notes');
      await closeModals();
      
      const newNoteBtn = await mainWindow.$('#new-note-btn');
      expect(newNoteBtn).toBeTruthy();
      
      await newNoteBtn.click();
      await mainWindow.waitForSelector('#add-note-modal.active', { timeout: 10000 });
    }, 60000);
  });

  describe('Style Transformer', () => {
    test('should display style categories', async () => {
      await navigateToPage('style');
      
      // Wait for style page to initialize
      await mainWindow.waitForTimeout(1000);
      
      // Verify style categories exist
      const styleCategories = await mainWindow.$$('.style-category');
      expect(styleCategories.length).toBeGreaterThan(0);
    }, 60000);
  });

  describe('Settings Management', () => {
    test('should open shortcuts modal', async () => {
      await navigateToSettingsPage('general');
      await closeModals();
      
      const shortcutsBtn = await mainWindow.$('#change-shortcuts-btn');
      expect(shortcutsBtn).toBeTruthy();
      
      await shortcutsBtn.click();
      await mainWindow.waitForSelector('#shortcuts-modal.active', { timeout: 10000 });
      
      // Verify modal elements
      await mainWindow.waitForSelector('#modal-hold-hotkey', { timeout: 5000 });
      await mainWindow.waitForSelector('#modal-toggle-hotkey', { timeout: 5000 });
      await mainWindow.waitForSelector('#save-shortcuts-btn', { timeout: 5000 });
    }, 60000);

    test('should refresh system information', async () => {
      await navigateToSettingsPage('system');
      
      const refreshBtn = await mainWindow.$('#refresh-system-info-btn');
      expect(refreshBtn).toBeTruthy();
      
      await refreshBtn.click();
      await mainWindow.waitForTimeout(2000);
      
      // Verify system info still exists after refresh
      await mainWindow.waitForSelector('.system-info-container', { timeout: 20000 });
    }, 60000);
  });

  describe('Window Controls', () => {
    test('should have all window control buttons', async () => {
      const minimizeBtn = await mainWindow.$('#minimize-btn');
      const maximizeBtn = await mainWindow.$('#maximize-btn');
      const closeBtn = await mainWindow.$('#close-btn');

      expect(minimizeBtn).toBeTruthy();
      expect(maximizeBtn).toBeTruthy();
      expect(closeBtn).toBeTruthy();
    }, 30000);
  });

  describe('Statistics Display', () => {
    test('should display all statistics on home page', async () => {
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
    }, 60000);
  });

  describe('History Management', () => {
    test('should display history list', async () => {
      await navigateToPage('home');
      
      // History list should exist (may be empty)
      await mainWindow.waitForSelector('#history-list-full', { timeout: 10000 });
      
      // Verify history retention dropdown exists
      const retentionSelect = await mainWindow.$('#history-retention');
      expect(retentionSelect).toBeTruthy();
    }, 60000);
  });

  describe('Model Management', () => {
    test('should display model selector with options', async () => {
      await navigateToSettingsPage('model');
      
      // Wait for model selector to load
      await mainWindow.waitForSelector('#model-select', { timeout: 20000 });
      
      // Verify model selector exists
      const modelSelect = await mainWindow.$('#model-select');
      expect(modelSelect).toBeTruthy();
      
      // Verify download button exists
      const downloadBtn = await mainWindow.$('#download-model-btn');
      expect(downloadBtn).toBeTruthy();
    }, 60000);

    test('should display disk space information', async () => {
      await navigateToSettingsPage('model');
      
      // Wait for disk space info to load
      await mainWindow.waitForSelector('#model-disk-space', { timeout: 20000 });
      
      const diskSpace = await mainWindow.textContent('#model-disk-space');
      expect(diskSpace).toBeTruthy();
    }, 60000);
  });

  describe('UI Responsiveness', () => {
    test('should handle rapid navigation between tabs', async () => {
      const tabs = ['home', 'dictionary', 'snippets', 'style', 'notes', 'settings'];
      
      for (const tab of tabs) {
        await navigateToPage(tab);
        await mainWindow.waitForSelector(`#page-${tab}.active`, { timeout: 10000 });
      }
      
      // Navigate back to home
      await navigateToPage('home');
      await mainWindow.waitForSelector('#page-home.active', { timeout: 10000 });
    }, 120000);

    test('should handle rapid settings tab navigation', async () => {
      const settingsTabs = ['general', 'system', 'model', 'themes', 'vibe', 'experimental'];
      
      for (const tab of settingsTabs) {
        await navigateToSettingsPage(tab);
        await mainWindow.waitForSelector(`#settings-${tab}.active`, { timeout: 15000 });
      }
    }, 120000);
  });

  describe('Error Handling', () => {
    test('should handle invalid navigation gracefully', async () => {
      // Try to navigate to non-existent page
      try {
        const hasHelper = await mainWindow.evaluate(() => !!(window.voiceApp && window.voiceApp.navigateToPage));
        if (hasHelper) {
          await mainWindow.evaluate(() => window.voiceApp.navigateToPage('nonexistent'));
        }
      } catch (e) {
        // Expected to fail gracefully
      }
      
      // App should still be responsive
      await mainWindow.waitForSelector('#sidebar', { timeout: 10000 });
    }, 30000);

    test('should handle modal close gracefully', async () => {
      await navigateToPage('dictionary');
      await closeModals();
      
      // Open modal
      const newWordBtn = await mainWindow.$('#new-word-btn');
      await newWordBtn.click();
      await mainWindow.waitForSelector('#add-word-modal.active', { timeout: 10000 });
      
      // Close modal
      await closeModals();
      
      // Modal should be closed
      const modal = await mainWindow.$('#add-word-modal.active');
      expect(modal).toBeFalsy();
    }, 60000);
  });
});

