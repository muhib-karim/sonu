/**
 * Shared Electron setup for E2E tests
 * This module provides a singleton Electron instance to prevent conflicts
 */

const { _electron: electron } = require('playwright');
const path = require('path');

let sharedElectronApp = null;
let sharedMainWindow = null;
let setupPromise = null;

/**
 * Setup shared Electron instance
 */
async function setupElectron() {
  if (setupPromise) {
    return setupPromise;
  }

  setupPromise = (async () => {
    // Ensure setImmediate exists in test environment
    if (typeof setImmediate === 'undefined') {
      global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
    }

    // Launch Electron app from project root
    const appPath = path.resolve(__dirname, '..', '..');
    
    try {
      sharedElectronApp = await electron.launch({
        args: [appPath],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          E2E_TEST: '1'
        },
        timeout: 90000 // Increased timeout for slower systems
      });

      // Get main window
      sharedMainWindow = await sharedElectronApp.firstWindow();

      // Wait for app to load with multiple strategies
      await sharedMainWindow.waitForLoadState('domcontentloaded', { timeout: 60000 });
      await sharedMainWindow.waitForLoadState('load', { timeout: 60000 }).catch(() => {});
      await sharedMainWindow.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
      
      // Wait for sidebar with multiple fallback strategies
      try {
        // Strategy 1: Wait for sidebar element
        await sharedMainWindow.waitForSelector('#sidebar', { timeout: 45000, state: 'attached' });
      } catch (e) {
        // Strategy 2: Wait for sidebar to be visible in DOM
        await sharedMainWindow.waitForFunction(() => {
          const sidebar = document.getElementById('sidebar');
          return sidebar !== null;
        }, { timeout: 45000 }).catch(() => {});
      }
      
      // Wait for sidebar to be visible (not just in DOM)
      try {
        await sharedMainWindow.waitForSelector('#sidebar', { timeout: 30000, state: 'visible' });
      } catch (e) {
        // If visible check fails, at least verify it exists
        const sidebarExists = await sharedMainWindow.evaluate(() => {
          return document.getElementById('sidebar') !== null;
        });
        if (!sidebarExists) {
          throw new Error('Sidebar element not found in DOM');
        }
      }
      
      // Wait until app initialization marks readiness
      try {
        await sharedMainWindow.waitForSelector('body[data-app-ready="1"]', { timeout: 30000 });
      } catch (e) {
        // Fallback: wait for helpers to exist and be ready
        await sharedMainWindow.waitForFunction(() => {
          return !!(window.voiceApp && 
                    window.voiceApp.isAppReady && 
                    window.voiceApp.isAppReady() &&
                    window.voiceApp.navigateToPage &&
                    window.voiceApp.navigateToSettingsPage);
        }, { timeout: 30000 }).catch(() => {});
      }
      
      // Additional wait for any async initialization
      await sharedMainWindow.waitForTimeout(2000);
      
      return { electronApp: sharedElectronApp, mainWindow: sharedMainWindow };
    } catch (error) {
      // Cleanup on error
      if (sharedElectronApp) {
        try {
          await sharedElectronApp.close({ force: true });
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      sharedElectronApp = null;
      sharedMainWindow = null;
      setupPromise = null;
      throw error;
    }
  })();

  return setupPromise;
}

/**
 * Cleanup shared Electron instance
 */
async function cleanupElectron() {
  if (sharedElectronApp) {
    try {
      // Give it time to close gracefully
      await Promise.race([
        sharedElectronApp.close(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
      ]);
    } catch (e) {
      // Force close if graceful close fails or times out
      console.warn('Graceful close failed, forcing close:', e.message);
      try {
        await sharedElectronApp.close({ force: true }).catch(() => {});
      } catch (e2) {
        // Ignore force close errors
      }
    }
    sharedElectronApp = null;
    sharedMainWindow = null;
    setupPromise = null;
  }
}

/**
 * Get shared Electron instance (creates if doesn't exist)
 */
async function getElectronInstance() {
  if (!sharedElectronApp || !sharedMainWindow) {
    await setupElectron();
  }
  return { electronApp: sharedElectronApp, mainWindow: sharedMainWindow };
}

module.exports = {
  setupElectron,
  cleanupElectron,
  getElectronInstance
};

