/**
 * Integrated Screenshot Capture for SONU
 * 
 * This script adds screenshot capture functionality to the main app.
 * It can be run alongside the app to capture screenshots programmatically.
 * 
 * Usage: Add this to main.js or run as a separate module
 */

const { BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

/**
 * Capture screenshot of the main window
 * @param {BrowserWindow} window - The window to capture
 * @param {string} filename - Filename for the screenshot
 * @returns {Promise<string>} - Path to saved screenshot
 */
async function captureScreenshot(window, filename) {
  try {
    const image = await window.webContents.capturePage();
    const buffer = image.toPNG();
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    fs.writeFileSync(filepath, buffer);
    return filepath;
  } catch (error) {
    console.error(`Error capturing screenshot ${filename}:`, error);
    throw error;
  }
}

/**
 * Navigate to a specific page in the app
 * @param {BrowserWindow} window - The window to navigate
 * @param {string} page - Page name (e.g., 'home', 'settings', 'model-selector')
 */
function navigateToPage(window, page) {
  if (!window || !window.webContents) return;
  
  window.webContents.executeJavaScript(`
    (function() {
      // Try to find and trigger navigation
      const navItem = document.querySelector('.nav-item[data-page="${page}"]');
      if (navItem) {
        navItem.click();
        return true;
      }
      
      // Try settings navigation
      if (page === 'settings' || page.startsWith('settings-')) {
        const settingsNav = document.querySelector('.settings-nav-item[data-settings-page="${page.replace('settings-', '')}"]');
        if (settingsNav) {
          settingsNav.click();
          return true;
        }
      }
      
      return false;
    })();
  `);
}

/**
 * Set theme
 * @param {BrowserWindow} window - The window
 * @param {string} theme - Theme name ('light' or 'dark')
 */
function setTheme(window, theme) {
  if (!window || !window.webContents) return;
  
  window.webContents.executeJavaScript(`
    (function() {
      const themeToggle = document.querySelector('.theme-toggle');
      const currentTheme = document.documentElement.getAttribute('data-theme');
      
      if (themeToggle && currentTheme !== theme) {
        themeToggle.click();
      }
    })();
  `);
}

/**
 * Wait for a specified time
 * @param {number} ms - Milliseconds to wait
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Capture all screenshots
 * @param {BrowserWindow} window - The main window
 */
async function captureAllScreenshots(window) {
  const screenshots = [];
  
  const tasks = [
    {
      name: 'main-window',
      description: 'Main application window (Home page)',
      wait: 2000,
      action: null
    },
    {
      name: 'settings-page',
      description: 'Settings page',
      wait: 2000,
      action: () => navigateToPage(window, 'settings')
    },
    {
      name: 'model-selector',
      description: 'Model selector tab',
      wait: 2000,
      action: () => {
        navigateToPage(window, 'settings');
        wait(1000).then(() => {
          window.webContents.executeJavaScript(`
            const modelTab = document.querySelector('.settings-nav-item[data-settings-page="model-selector"]');
            if (modelTab) modelTab.click();
          `);
        });
      }
    },
    {
      name: 'theme-light',
      description: 'Light theme',
      wait: 1500,
      action: () => setTheme(window, 'light')
    },
    {
      name: 'theme-dark',
      description: 'Dark theme',
      wait: 1500,
      action: () => setTheme(window, 'dark')
    }
  ];
  
  console.log(`\n📸 Starting screenshot capture...`);
  console.log(`   Total tasks: ${tasks.length}\n`);
  
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    console.log(`[${i + 1}/${tasks.length}] ${task.description}...`);
    
    try {
      if (task.action) {
        task.action();
      }
      
      await wait(task.wait);
      
      const filename = `${task.name}.png`;
      const filepath = await captureScreenshot(window, filename);
      const stats = fs.statSync(filepath);
      
      screenshots.push({
        name: task.name,
        description: task.description,
        filepath: filepath,
        filename: filename,
        size: stats.size
      });
      
      console.log(`   ✅ Saved: ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
    
    if (i < tasks.length - 1) {
      await wait(1000);
    }
  }
  
  return screenshots;
}

module.exports = {
  captureScreenshot,
  captureAllScreenshots,
  navigateToPage,
  setTheme
};

