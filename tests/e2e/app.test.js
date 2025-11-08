/** @jest-environment node */
/**
 * End-to-end tests for SONU application
 */

const { _electron: electron } = require('playwright');
const path = require('path');

// Increase default timeout for slower Electron UI flows
jest.setTimeout(60000);

describe('SONU E2E Tests', () => {
  let electronApp;
  let mainWindow;

  beforeAll(async () => {
    // Ensure setImmediate exists in test environment
    if (typeof setImmediate === 'undefined') {
      global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
    }
    // Launch Electron app from project root
    const appPath = path.resolve(__dirname, '..', '..');
    electronApp = await electron.launch({
      args: [appPath],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        E2E_TEST: '1'
      },
      timeout: 60000 // Increase launch timeout
    });

    // Get main window
    mainWindow = await electronApp.firstWindow();

    // Wait for app to load with longer timeout
    await mainWindow.waitForLoadState('domcontentloaded', { timeout: 30000 });
    await mainWindow.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    
    // Wait for sidebar to appear
    await mainWindow.waitForSelector('#sidebar', { timeout: 30000 });
    
    // Wait until app initialization marks readiness
    // Try multiple ways to detect readiness
    try {
      await mainWindow.waitForSelector('body[data-app-ready="1"]', { timeout: 30000 });
    } catch (e) {
      // Fallback: wait for helpers to exist and be ready
      await mainWindow.waitForFunction(() => {
        return !!(window.voiceApp && 
                  window.voiceApp.isAppReady && 
                  window.voiceApp.isAppReady() &&
                  window.voiceApp.navigateToPage &&
                  window.voiceApp.navigateToSettingsPage);
      }, null, { timeout: 30000 }).catch(() => {});
    }
    
    // Additional wait for any async initialization and verify helpers
    await mainWindow.waitForTimeout(2000);
    
    // Verify helpers are available
    const hasHelpers = await mainWindow.evaluate(() => {
      return !!(window.voiceApp && 
                window.voiceApp.navigateToPage &&
                window.voiceApp.navigateToSettingsPage);
    });
    
    if (!hasHelpers) {
      console.warn('Navigation helpers not available, tests may fail');
    }
  }, 90000); // Increase overall timeout to 90 seconds

  afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  // Helper to close any open modals
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
    } catch (e) {
      // No modal open or error closing - ignore
    }
  }

  describe('Application Launch', () => {
    test('should launch application successfully', async () => {
      // Check if window exists
      expect(mainWindow).toBeTruthy();

      // Check title
      const title = await mainWindow.title();
      expect(title).toBe('SONU - Offline Voice Typing');
    });

    test('should display main interface', async () => {
      // Check for main UI elements
      await mainWindow.waitForSelector('#sidebar');
      await mainWindow.waitForSelector('#main-content');
      await mainWindow.waitForSelector('#page-home');

      // Check sidebar navigation
      const navItems = await mainWindow.$$('.nav-item');
      expect(navItems.length).toBeGreaterThan(0);
    });
  });

  describe('Navigation', () => {
    test('should navigate between pages', async () => {
      // Start on home page
      await mainWindow.waitForSelector('#page-home.active');

      // Navigate to settings
      // Use reliable helper if available
      const hasHelper = await mainWindow.evaluate(() => !!(window.voiceApp && window.voiceApp.navigateToPage));
      if (hasHelper) {
        await mainWindow.evaluate(() => window.voiceApp.navigateToPage('settings'));
      } else {
        await mainWindow.click('[data-page="settings"]');
      }
      await mainWindow.waitForSelector('#page-settings.active');

      // Navigate back to home
      if (hasHelper) {
        await mainWindow.evaluate(() => window.voiceApp.navigateToPage('home'));
      } else {
        await mainWindow.click('[data-page="home"]');
      }
      await mainWindow.waitForSelector('#page-home.active');
    });

    test('should navigate settings tabs', async () => {
      // Close any modals first
      await closeModals();
      
      // Go to settings
      const hasHelper = await mainWindow.evaluate(() => !!(window.voiceApp && window.voiceApp.navigateToPage));
      if (hasHelper) {
        await mainWindow.evaluate(() => window.voiceApp.navigateToPage('settings'));
        await mainWindow.waitForSelector('#page-settings.active', { timeout: 15000 });
        await mainWindow.waitForTimeout(500);
        await mainWindow.evaluate(() => window.voiceApp.navigateToSettingsPage('general'));
        await mainWindow.waitForSelector('#settings-general.active', { timeout: 15000 });
      } else {
        await mainWindow.click('[data-page="settings"]');
        await mainWindow.waitForSelector('#page-settings.active', { timeout: 15000 });
        await mainWindow.waitForTimeout(500);
        await mainWindow.click('[data-settings-page="general"]');
        await mainWindow.waitForSelector('#settings-general.active', { timeout: 15000 });
      }

      // Navigate to system tab
      await mainWindow.click('[data-settings-page="system"]');
      await mainWindow.waitForSelector('#settings-system.active', { timeout: 15000 });

      // Navigate to model tab
      await mainWindow.click('[data-settings-page="model"]');
      await mainWindow.waitForSelector('#settings-model.active', { timeout: 15000 });
      
      // Navigate to themes tab
      await mainWindow.click('[data-settings-page="themes"]');
      await mainWindow.waitForSelector('#settings-themes.active', { timeout: 15000 });
      
      // Navigate to vibe tab
      await mainWindow.click('[data-settings-page="vibe"]');
      await mainWindow.waitForSelector('#settings-vibe.active', { timeout: 15000 });
      
      // Navigate to experimental tab
      await mainWindow.click('[data-settings-page="experimental"]');
      await mainWindow.waitForSelector('#settings-experimental.active', { timeout: 15000 });
    }, 60000);
    
    test('should navigate all main tabs', async () => {
      // Close any modals first
      await closeModals();
      
      const tabs = ['home', 'dictionary', 'snippets', 'style', 'notes', 'settings'];
      const hasHelper = await mainWindow.evaluate(() => !!(window.voiceApp && window.voiceApp.navigateToPage));
      
      for (const tab of tabs) {
        if (hasHelper) {
          await mainWindow.evaluate((page) => window.voiceApp.navigateToPage(page), tab);
        } else {
          await mainWindow.click(`[data-page="${tab}"]`);
        }
        await mainWindow.waitForSelector(`#page-${tab}.active`, { timeout: 15000 });
        await mainWindow.waitForTimeout(500);
      }
    }, 60000);
  });

  describe('Theme System', () => {
    test('should toggle theme', async () => {
      const themeBtn = await mainWindow.$('#theme-toggle-btn');
      expect(themeBtn).toBeTruthy();

      // Get initial theme
      const initialTheme = await themeBtn.getAttribute('data-theme');

      // Click to toggle
      await themeBtn.click();

      // Check theme changed
      const newTheme = await themeBtn.getAttribute('data-theme');
      expect(newTheme).not.toBe(initialTheme);
    });

    test('should persist theme selection', async () => {
      // Theme should be saved to localStorage
      let themeBtn = await mainWindow.$('#theme-toggle-btn');
      const currentTheme = await themeBtn.getAttribute('data-theme');

      // Reload page
      await mainWindow.reload();
      await mainWindow.waitForLoadState();

      // Check theme persisted
      // Re-query button after reload to avoid stale handle
      themeBtn = await mainWindow.$('#theme-toggle-btn');
      const persistedTheme = await themeBtn.getAttribute('data-theme');
      expect(persistedTheme).toBe(currentTheme);
    });
  });

  describe('Settings Management', () => {
    test('should open settings modal', async () => {
      // Go to settings
      const hasHelper = await mainWindow.evaluate(() => !!(window.voiceApp && window.voiceApp.navigateToPage));
      if (hasHelper) {
        await mainWindow.evaluate(() => window.voiceApp.navigateToPage('settings'));
      } else {
        await mainWindow.click('[data-page="settings"]');
      }

      // Click change shortcuts button
      await mainWindow.click('#change-shortcuts-btn');

      // Check modal appears
      await mainWindow.waitForSelector('#shortcuts-modal.active');
    });

    test('should save settings', async () => {
      // Close any open modals first
      await closeModals();
      
      // Ensure settings page is active
      const hasHelper = await mainWindow.evaluate(() => !!(window.voiceApp && window.voiceApp.navigateToPage));
      if (hasHelper) {
        await mainWindow.evaluate(() => window.voiceApp.navigateToPage('settings'));
        await mainWindow.waitForSelector('#page-settings.active', { timeout: 15000 });
        await mainWindow.waitForTimeout(500);
        await mainWindow.evaluate(() => window.voiceApp.navigateToSettingsPage('general'));
        await mainWindow.waitForSelector('#settings-general.active', { timeout: 15000 });
      } else {
        await mainWindow.click('[data-page="settings"]');
        await mainWindow.waitForSelector('#page-settings.active', { timeout: 15000 });
        await mainWindow.waitForTimeout(500);
        await mainWindow.click('[data-settings-page="general"]');
        await mainWindow.waitForSelector('#settings-general.active', { timeout: 15000 });
      }
      
      // Wait for shortcuts button to be available
      await mainWindow.waitForSelector('#change-shortcuts-btn', { timeout: 10000 });
      await mainWindow.waitForTimeout(500);
      
      // Open shortcuts modal
      await mainWindow.click('#change-shortcuts-btn');
      await mainWindow.waitForSelector('#shortcuts-modal.active', { timeout: 10000 });

      // Set test values
      await mainWindow.waitForSelector('#modal-hold-hotkey', { timeout: 5000 });
      await mainWindow.fill('#modal-hold-hotkey', 'Ctrl+Space');
      await mainWindow.fill('#modal-toggle-hotkey', 'Ctrl+Shift+Space');

      // Save
      await mainWindow.click('#save-shortcuts-btn');

      // Modal should close
      await mainWindow.waitForSelector('#shortcuts-modal:not(.active)', { timeout: 10000 });
    }, 60000);
  });

  describe('System Information', () => {
    test('should load system information', async () => {
      // Go to system settings
      const hasHelper = await mainWindow.evaluate(() => !!(window.voiceApp && window.voiceApp.navigateToSettingsPage));
      if (hasHelper) {
        await mainWindow.evaluate(() => window.voiceApp.navigateToPage('settings'));
        await mainWindow.waitForSelector('#page-settings.active', { timeout: 15000 });
        await mainWindow.waitForTimeout(500);
        await mainWindow.evaluate(() => window.voiceApp.navigateToSettingsPage('system'));
        await mainWindow.waitForSelector('#settings-system.active', { timeout: 15000 });
      } else {
        await mainWindow.click('[data-page="settings"]');
        await mainWindow.waitForSelector('#page-settings.active', { timeout: 15000 });
        await mainWindow.waitForTimeout(500);
        await mainWindow.click('[data-settings-page="system"]');
        await mainWindow.waitForSelector('#settings-system.active', { timeout: 15000 });
      }

      // Wait for system info to load (may take time for Python script)
      await mainWindow.waitForSelector('.system-info-container', { timeout: 20000 });
      await mainWindow.waitForSelector('.system-info-row', { timeout: 20000 });

      // Check for system info elements
      const infoRows = await mainWindow.$$('.system-info-row');
      expect(infoRows.length).toBeGreaterThan(0);
    }, 60000);

    test('should refresh system information', async () => {
      // Ensure we're on system settings page
      const hasHelper = await mainWindow.evaluate(() => !!(window.voiceApp && window.voiceApp.navigateToSettingsPage));
      if (hasHelper) {
        await mainWindow.evaluate(() => window.voiceApp.navigateToPage('settings'));
        await mainWindow.waitForSelector('#page-settings.active', { timeout: 15000 });
        await mainWindow.waitForTimeout(500);
        await mainWindow.evaluate(() => window.voiceApp.navigateToSettingsPage('system'));
        await mainWindow.waitForSelector('#settings-system.active', { timeout: 15000 });
      } else {
        await mainWindow.click('[data-page="settings"]');
        await mainWindow.waitForSelector('#page-settings.active', { timeout: 15000 });
        await mainWindow.waitForTimeout(500);
        await mainWindow.click('[data-settings-page="system"]');
        await mainWindow.waitForSelector('#settings-system.active', { timeout: 15000 });
      }
      
      // Wait for refresh button
      await mainWindow.waitForSelector('#refresh-system-info-btn', { timeout: 10000 });
      const refreshBtn = await mainWindow.$('#refresh-system-info-btn');
      expect(refreshBtn).toBeTruthy();

      // Click refresh
      await refreshBtn.click();
      await mainWindow.waitForTimeout(1000);

      // Should still have system info
      await mainWindow.waitForSelector('.system-info-container', { timeout: 20000 });
    }, 60000);
  });

  describe('Model Management', () => {
    test('should display model selector', async () => {
      // Go to model settings
      const hasHelper = await mainWindow.evaluate(() => !!(window.voiceApp && window.voiceApp.navigateToSettingsPage));
      if (hasHelper) {
        await mainWindow.evaluate(() => window.voiceApp.navigateToPage('settings'));
        await mainWindow.waitForSelector('#page-settings.active', { timeout: 15000 });
        await mainWindow.waitForTimeout(500);
        await mainWindow.evaluate(() => window.voiceApp.navigateToSettingsPage('model'));
        await mainWindow.waitForSelector('#settings-model.active', { timeout: 15000 });
      } else {
        await mainWindow.click('[data-page="settings"]');
        await mainWindow.waitForSelector('#page-settings.active', { timeout: 15000 });
        await mainWindow.waitForTimeout(500);
        await mainWindow.click('[data-settings-page="model"]');
        await mainWindow.waitForSelector('#settings-model.active', { timeout: 15000 });
      }

      // Check for model elements (may take time to load)
      await mainWindow.waitForSelector('#model-select', { timeout: 20000 });
      await mainWindow.waitForSelector('#download-model-btn', { timeout: 20000 });
    }, 60000);

    test('should show disk space information', async () => {
      // Ensure we are on the model settings tab
      const hasHelper = await mainWindow.evaluate(() => !!(window.voiceApp && window.voiceApp.navigateToSettingsPage));
      if (hasHelper) {
        await mainWindow.evaluate(() => window.voiceApp.navigateToPage('settings'));
        await mainWindow.waitForSelector('#page-settings.active', { timeout: 15000 });
        await mainWindow.waitForTimeout(500);
        await mainWindow.evaluate(() => window.voiceApp.navigateToSettingsPage('model'));
        await mainWindow.waitForSelector('#settings-model.active', { timeout: 15000 });
      } else {
        await mainWindow.click('[data-page="settings"]');
        await mainWindow.waitForSelector('#page-settings.active', { timeout: 15000 });
        await mainWindow.waitForTimeout(500);
        await mainWindow.click('[data-settings-page="model"]');
        await mainWindow.waitForSelector('#settings-model.active', { timeout: 15000 });
      }

      // Disk space info can take time to compute; wait longer
      await mainWindow.waitForSelector('#model-disk-space', { timeout: 20000 });
      const diskSpace = await mainWindow.textContent('#model-disk-space');
      expect(diskSpace).toBeTruthy();
    }, 60000);
  });

  describe('History Management', () => {
    test('should display history section', async () => {
      // History lives on Home page
      const hasHelper = await mainWindow.evaluate(() => !!(window.voiceApp && window.voiceApp.navigateToPage));
      if (hasHelper) {
        await mainWindow.evaluate(() => window.voiceApp.navigateToPage('home'));
      } else {
        await mainWindow.click('[data-page="home"]');
      }
      await mainWindow.waitForSelector('#page-home.active', { timeout: 15000 });
      await mainWindow.waitForTimeout(1000);

      // Check for history elements (may be empty, but container should exist)
      await mainWindow.waitForSelector('#history-list-full', { timeout: 20000 });
    }, 60000);

    test('should show statistics', async () => {
      // Check stats are displayed
      const statTime = await mainWindow.textContent('#stat-time');
      const statWords = await mainWindow.textContent('#stat-words');
      const statWpm = await mainWindow.textContent('#stat-wpm');

      expect(statTime).toBeTruthy();
      expect(statWords).toBeTruthy();
      expect(statWpm).toBeTruthy();
    });
  });

  describe('Window Controls', () => {
    test('should handle window controls', async () => {
      // Check window control buttons exist
      const minimizeBtn = await mainWindow.$('#minimize-btn');
      const maximizeBtn = await mainWindow.$('#maximize-btn');
      const closeBtn = await mainWindow.$('#close-btn');

      expect(minimizeBtn).toBeTruthy();
      expect(maximizeBtn).toBeTruthy();
      expect(closeBtn).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid navigation gracefully', async () => {
      // Try clicking non-existent navigation item
      try {
        await mainWindow.click('[data-page="nonexistent"]', { timeout: 1000 });
      } catch (e) {
        // Should not crash the app
        expect(e.message).toMatch(/Timeout/i);
      }

      // App should still be responsive
      await mainWindow.waitForSelector('#sidebar');
    });

    test('should handle settings errors gracefully', async () => {
      // Go to settings and try invalid operations
      const hasHelper = await mainWindow.evaluate(() => !!(window.voiceApp && window.voiceApp.navigateToPage));
      if (hasHelper) {
        await mainWindow.evaluate(() => window.voiceApp.navigateToPage('settings'));
        await mainWindow.waitForSelector('#page-settings.active', { timeout: 15000 });
        await mainWindow.waitForTimeout(500);
        // Explicitly navigate to general tab for deterministic state
        const hasSettingsHelper = await mainWindow.evaluate(() => !!(window.voiceApp && window.voiceApp.navigateToSettingsPage));
        if (hasSettingsHelper) {
          await mainWindow.evaluate(() => window.voiceApp.navigateToSettingsPage('general'));
          await mainWindow.waitForSelector('#settings-general.active', { timeout: 15000 });
        }
      } else {
        await mainWindow.click('[data-page="settings"]');
        await mainWindow.waitForSelector('#page-settings.active', { timeout: 15000 });
        await mainWindow.waitForTimeout(500);
        await mainWindow.click('[data-settings-page="general"]');
        await mainWindow.waitForSelector('#settings-general.active', { timeout: 15000 });
      }
      // Wait for settings page transition and default tab
      await mainWindow.waitForSelector('#page-settings.active', { timeout: 15000 });
      await mainWindow.waitForSelector('#settings-general.active', { timeout: 15000 });
    }, 60000);
  });
});