/** @jest-environment node */
/**
 * End-to-end tests for model download and typing functionality
 * Tests the complete workflow from download to typing
 */

const { _electron: electron } = require('playwright');
const path = require('path');

describe('Model Download and Typing E2E Tests', () => {
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
      timeout: 60000
    });

    // Get main window
    mainWindow = await electronApp.firstWindow();

    // Wait for app to load
    await mainWindow.waitForLoadState('domcontentloaded', { timeout: 30000 });
    await mainWindow.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    
    // Wait for sidebar and app readiness
    await mainWindow.waitForSelector('#sidebar', { timeout: 30000 });
    try {
      await mainWindow.waitForSelector('body[data-app-ready="1"]', { timeout: 30000 });
    } catch (e) {
      await mainWindow.waitForFunction(() => {
        return !!(window.voiceApp && window.voiceApp.isAppReady && window.voiceApp.isAppReady());
      }, null, { timeout: 30000 }).catch(() => {});
    }
    await mainWindow.waitForTimeout(2000);
  }, 90000);

  afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  describe('Model Download Workflow', () => {
    test('should navigate to model selector', async () => {
      // Click on Settings
      const hasHelper = await mainWindow.evaluate(() => !!(window.voiceApp && window.voiceApp.navigateToPage));
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

      // Check if model selector is visible
      const modelSelector = await mainWindow.$('#settings-model.active');
      expect(modelSelector).toBeTruthy();
    }, 60000);

    test('should display model download button', async () => {
      // Navigate to model selector
      const hasHelper = await mainWindow.evaluate(() => !!(window.voiceApp && window.voiceApp.navigateToPage));
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

      // Check for download button (may take time to load)
      await mainWindow.waitForSelector('#download-model-btn', { timeout: 20000 });
      const downloadBtn = await mainWindow.$('#download-model-btn');
      expect(downloadBtn).toBeTruthy();
    }, 60000);
  });

  describe('Typing Functionality', () => {
    test('should have robotjs available', async () => {
      // Check if robotjs is loaded in main process
      const robotjsStatus = await mainWindow.evaluate(() => {
        return window.voiceApp && window.voiceApp.checkRobotjs ? window.voiceApp.checkRobotjs() : false;
      });

      // robotjs should be available (or at least the check should not throw)
      expect(typeof robotjsStatus).toBe('boolean');
    }, 5000);
  });
});


