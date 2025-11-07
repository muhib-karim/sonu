/**
 * Screenshot Capture Script for SONU
 * 
 * This script runs the Electron app and captures screenshots of different features,
 * tabs, and pages. It uses Electron's built-in screenshot capabilities.
 * 
 * Usage: node scripts/capture-screenshots.js
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Screenshot configuration
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
const SCREENSHOT_DELAY = 2000; // 2 seconds delay between screenshots
const SCREENSHOT_QUALITY = 90; // JPEG quality (1-100)

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

let mainWindow = null;
let screenshots = [];
let currentScreenshotIndex = 0;

// Screenshot tasks to capture
const screenshotTasks = [
  {
    name: 'main-window',
    description: 'Main application window (Home page)',
    action: async (window) => {
      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Already on home page, just capture
    }
  },
  {
    name: 'settings-page',
    description: 'Settings page',
    action: async (window) => {
      // Navigate to settings
      window.webContents.send('navigate-to-settings');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  },
  {
    name: 'model-selector',
    description: 'Model selector tab',
    action: async (window) => {
      // Navigate to settings first
      window.webContents.send('navigate-to-settings');
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Then navigate to model selector tab
      window.webContents.send('navigate-to-tab', 'model-selector');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  },
  {
    name: 'theme-light',
    description: 'Light theme',
    action: async (window) => {
      // Set light theme
      window.webContents.send('set-theme', 'light');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  },
  {
    name: 'theme-dark',
    description: 'Dark theme',
    action: async (window) => {
      // Set dark theme
      window.webContents.send('set-theme', 'dark');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
];

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load the app
  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  // Wait for app to be ready
  mainWindow.webContents.once('did-finish-load', async () => {
    console.log('App loaded, starting screenshot capture...');
    await captureScreenshots();
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Capture screenshots
async function captureScreenshots() {
  console.log(`\n📸 Starting screenshot capture...`);
  console.log(`Total screenshots to capture: ${screenshotTasks.length}\n`);

  for (let i = 0; i < screenshotTasks.length; i++) {
    const task = screenshotTasks[i];
    currentScreenshotIndex = i;
    
    console.log(`[${i + 1}/${screenshotTasks.length}] Capturing: ${task.description}...`);
    
    try {
      // Execute the action (navigation, theme change, etc.)
      await task.action(mainWindow);
      
      // Wait a bit for UI to settle
      await new Promise(resolve => setTimeout(resolve, SCREENSHOT_DELAY));
      
      // Capture the screenshot
      const image = await mainWindow.webContents.capturePage();
      const buffer = image.toPNG();
      
      // Save screenshot
      const filename = `${task.name}.png`;
      const filepath = path.join(SCREENSHOTS_DIR, filename);
      fs.writeFileSync(filepath, buffer);
      
      screenshots.push({
        name: task.name,
        description: task.description,
        filepath: filepath,
        filename: filename
      });
      
      console.log(`✅ Saved: ${filename}`);
      
    } catch (error) {
      console.error(`❌ Error capturing ${task.name}:`, error);
    }
    
    // Delay between screenshots
    if (i < screenshotTasks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`\n✅ Screenshot capture complete!`);
  console.log(`\nCaptured screenshots:`);
  screenshots.forEach((screenshot, index) => {
    console.log(`  ${index + 1}. ${screenshot.filename} - ${screenshot.description}`);
  });
  
  // Show summary and ask for confirmation
  showScreenshotSummary();
}

// Show screenshot summary
function showScreenshotSummary() {
  console.log(`\n📋 Screenshot Summary:`);
  console.log(`   Directory: ${SCREENSHOTS_DIR}`);
  console.log(`   Total: ${screenshots.length} screenshots`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Review the screenshots in: ${SCREENSHOTS_DIR}`);
  console.log(`   2. If satisfied, run: git add screenshots/`);
  console.log(`   3. Then: git commit -m "docs: Add application screenshots"`);
  console.log(`   4. Finally: git push origin main`);
  console.log(`\n⚠️  Close this window when done reviewing.`);
  
  // Keep window open for review
  mainWindow.show();
}

// App initialization
app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

