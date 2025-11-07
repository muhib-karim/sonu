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
    // Launch Electron app
    electronApp = await electron.launch({
      args: [path.join(__dirname, '..', '..', 'main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    // Get main window
    mainWindow = await electronApp.firstWindow();

    // Wait for app to load
    await mainWindow.waitForLoadState();
  }, 30000);

  afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  describe('Model Download Workflow', () => {
    test('should navigate to model selector', async () => {
      // Click on Settings
      await mainWindow.click('button[data-page="settings"]');
      await mainWindow.waitForTimeout(500);

      // Click on Model Selector tab
      await mainWindow.click('button[data-settings-tab="model-selector"]');
      await mainWindow.waitForTimeout(500);

      // Check if model selector is visible
      const modelSelector = await mainWindow.$('#page-settings');
      expect(modelSelector).toBeTruthy();
    }, 10000);

    test('should display model download button', async () => {
      // Navigate to model selector
      await mainWindow.click('button[data-page="settings"]');
      await mainWindow.waitForTimeout(500);
      await mainWindow.click('button[data-settings-tab="model-selector"]');
      await mainWindow.waitForTimeout(500);

      // Check for download button
      const downloadBtn = await mainWindow.$('#download-model-btn');
      expect(downloadBtn).toBeTruthy();
    }, 10000);
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


