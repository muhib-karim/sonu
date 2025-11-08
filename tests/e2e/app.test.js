/** @jest-environment node */
/**
 * End-to-end tests for SONU application
 */

const { _electron: electron } = require('playwright');
const path = require('path');

describe('SONU E2E Tests', () => {
  let electronApp;
  let mainWindow;

  beforeAll(async () => {
    // Ensure setImmediate exists in test environment
    if (typeof setImmediate === 'undefined') {
      global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
    }
    // Launch Electron app from project root
    const appPath = path.resolve(__dirname, '..');
    electronApp = await electron.launch({
      args: [appPath],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        E2E_TEST: '1'
      }
    });

    // Get main window
    mainWindow = await electronApp.firstWindow();

    // Wait for app to load
    await mainWindow.waitForLoadState('domcontentloaded');
    await mainWindow.waitForLoadState('networkidle').catch(() => {});
    await mainWindow.waitForSelector('#sidebar');
    await mainWindow.waitForTimeout(500);
  }, 30000);

  afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

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
      await mainWindow.click('[data-page="settings"]');
      await mainWindow.waitForSelector('#page-settings.active');

      // Navigate back to home
      await mainWindow.click('[data-page="home"]');
      await mainWindow.waitForSelector('#page-home.active');
    });

    test('should navigate settings tabs', async () => {
      // Go to settings
      await mainWindow.click('[data-page="settings"]');
      await mainWindow.waitForSelector('#settings-general.active');

      // Navigate to system tab
      await mainWindow.click('[data-settings-page="system"]');
      await mainWindow.waitForSelector('#settings-system.active');

      // Navigate to model tab
      await mainWindow.click('[data-settings-page="model"]');
      await mainWindow.waitForSelector('#settings-model.active');
    });
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
      const themeBtn = await mainWindow.$('#theme-toggle-btn');
      const currentTheme = await themeBtn.getAttribute('data-theme');

      // Reload page
      await mainWindow.reload();
      await mainWindow.waitForLoadState();

      // Check theme persisted
      const persistedTheme = await themeBtn.getAttribute('data-theme');
      expect(persistedTheme).toBe(currentTheme);
    });
  });

  describe('Settings Management', () => {
    test('should open settings modal', async () => {
      // Go to settings
      await mainWindow.click('[data-page="settings"]');

      // Click change shortcuts button
      await mainWindow.click('#change-shortcuts-btn');

      // Check modal appears
      await mainWindow.waitForSelector('#shortcuts-modal.active');
    });

    test('should save settings', async () => {
      // Open shortcuts modal
      await mainWindow.click('#change-shortcuts-btn');
      await mainWindow.waitForSelector('#shortcuts-modal.active');

      // Set test values
      await mainWindow.fill('#modal-hold-hotkey', 'Ctrl+Space');
      await mainWindow.fill('#modal-toggle-hotkey', 'Ctrl+Shift+Space');

      // Save
      await mainWindow.click('#save-shortcuts-btn');

      // Modal should close
      await mainWindow.waitForSelector('#shortcuts-modal:not(.active)');
    });
  });

  describe('System Information', () => {
    test('should load system information', async () => {
      // Go to system settings
      await mainWindow.click('[data-page="settings"]');
      await mainWindow.click('[data-settings-page="system"]');

      // Wait for system info to load
      await mainWindow.waitForSelector('.system-info-container');

      // Check for system info elements
      const infoRows = await mainWindow.$$('.system-info-row');
      expect(infoRows.length).toBeGreaterThan(0);
    });

    test('should refresh system information', async () => {
      const refreshBtn = await mainWindow.$('#refresh-system-info-btn');
      expect(refreshBtn).toBeTruthy();

      // Click refresh
      await refreshBtn.click();

      // Should still have system info
      await mainWindow.waitForSelector('.system-info-container');
    });
  });

  describe('Model Management', () => {
    test('should display model selector', async () => {
      // Go to model settings
      await mainWindow.click('[data-page="settings"]');
      await mainWindow.click('[data-settings-page="model"]');

      // Check for model elements
      await mainWindow.waitForSelector('#model-select');
      await mainWindow.waitForSelector('#download-model-btn');
    });

    test('should show disk space information', async () => {
      await mainWindow.waitForSelector('#model-disk-space');
      const diskSpace = await mainWindow.textContent('#model-disk-space');
      expect(diskSpace).toBeTruthy();
    });
  });

  describe('History Management', () => {
    test('should display history section', async () => {
      // Go to history page
      await mainWindow.click('[data-page="history"]');
      await mainWindow.waitForSelector('#page-history.active');

      // Check for history elements
      await mainWindow.waitForSelector('#history-list-full');
    });

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
      await mainWindow.click('[data-page="settings"]');

      // Should still display settings page
      await mainWindow.waitForSelector('#settings-general.active');
    }, 10000);
  });
});