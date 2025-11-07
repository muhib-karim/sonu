/**
 * Automated Screenshot Capture Script for SONU
 * 
 * This script uses Electron's programmatic screenshot capabilities
 * to automatically capture screenshots of different app features.
 * 
 * Usage: node scripts/auto-capture-screenshots.js
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
const DELAY_BETWEEN_SCREENSHOTS = 3000; // 3 seconds

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

let mainWindow = null;
const capturedScreenshots = [];

// Screenshot tasks
const screenshotTasks = [
  {
    name: 'main-window',
    description: 'Main application window (Home page)',
    wait: 2000,
    action: null // No action needed, already on home
  },
  {
    name: 'settings-page',
    description: 'Settings page',
    wait: 2000,
    action: () => {
      // Send IPC message to navigate to settings
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.executeJavaScript(`
          if (window.ipcRenderer) {
            window.ipcRenderer.send('navigate-to-settings');
          }
        `);
      }
    }
  },
  {
    name: 'model-selector',
    description: 'Model selector tab',
    wait: 2000,
    action: () => {
      // Navigate to settings first, then model selector
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.executeJavaScript(`
          if (window.ipcRenderer) {
            window.ipcRenderer.send('navigate-to-settings');
            setTimeout(() => {
              const modelSelectorTab = document.querySelector('[data-tab="model-selector"]');
              if (modelSelectorTab) modelSelectorTab.click();
            }, 1000);
          }
        `);
      }
    }
  },
  {
    name: 'theme-light',
    description: 'Light theme',
    wait: 1500,
    action: () => {
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.executeJavaScript(`
          const themeToggle = document.querySelector('.theme-toggle');
          if (themeToggle && document.documentElement.getAttribute('data-theme') !== 'light') {
            themeToggle.click();
          }
        `);
      }
    }
  },
  {
    name: 'theme-dark',
    description: 'Dark theme',
    wait: 1500,
    action: () => {
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.executeJavaScript(`
          const themeToggle = document.querySelector('.theme-toggle');
          if (themeToggle && document.documentElement.getAttribute('data-theme') !== 'dark') {
            themeToggle.click();
          }
        `);
      }
    }
  }
];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  mainWindow.webContents.once('did-finish-load', async () => {
    console.log('✅ App loaded, starting automated screenshot capture...\n');
    await captureAllScreenshots();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function captureAllScreenshots() {
  console.log(`📸 Starting automated screenshot capture...`);
  console.log(`   Total tasks: ${screenshotTasks.length}\n`);

  for (let i = 0; i < screenshotTasks.length; i++) {
    const task = screenshotTasks[i];
    console.log(`[${i + 1}/${screenshotTasks.length}] ${task.description}...`);

    try {
      // Execute action if needed
      if (task.action) {
        task.action();
      }

      // Wait for UI to update
      await new Promise(resolve => setTimeout(resolve, task.wait || 2000));

      // Capture screenshot
      const image = await mainWindow.webContents.capturePage();
      const buffer = image.toPNG();

      // Save screenshot
      const filename = `${task.name}.png`;
      const filepath = path.join(SCREENSHOTS_DIR, filename);
      fs.writeFileSync(filepath, buffer);

      const stats = fs.statSync(filepath);
      capturedScreenshots.push({
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

    // Delay between screenshots
    if (i < screenshotTasks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Show summary
  showSummary();
}

function showSummary() {
  console.log(`\n✅ Screenshot capture complete!\n`);
  console.log(`📋 Summary:`);
  console.log(`   Directory: ${SCREENSHOTS_DIR}`);
  console.log(`   Total captured: ${capturedScreenshots.length}/${screenshotTasks.length}\n`);
  
  console.log(`📸 Captured screenshots:`);
  capturedScreenshots.forEach((screenshot, index) => {
    console.log(`   ${index + 1}. ${screenshot.filename} - ${screenshot.description}`);
    console.log(`      Size: ${(screenshot.size / 1024).toFixed(1)} KB`);
  });

  console.log(`\n💡 Next steps:`);
  console.log(`   1. Review screenshots in: ${SCREENSHOTS_DIR}`);
  console.log(`   2. If satisfied, confirm to upload to GitHub`);
  console.log(`\n⚠️  Window will stay open for review. Close when done.`);
  
  // Keep window open
  mainWindow.show();
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

