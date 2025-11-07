/**
 * Final Screenshot Capture Script for SONU
 * 
 * This script runs the app and captures screenshots programmatically.
 * It uses Electron's built-in screenshot API to capture the app window.
 * 
 * Usage: 
 *   1. Run: npm start (in one terminal - let it fully load)
 *   2. Run: node scripts/capture-screenshots-final.js (in another terminal)
 * 
 * Or use the automated version: npm run screenshots
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let mainWindow = null;
const capturedScreenshots = [];

// Screenshot tasks
const tasks = [
  { name: 'main-window', description: 'Main window (Home page)', wait: 2000 },
  { name: 'settings-page', description: 'Settings page', wait: 2000, navigate: 'settings' },
  { name: 'model-selector', description: 'Model selector tab', wait: 2000, navigate: 'settings', tab: 'model-selector' },
  { name: 'theme-light', description: 'Light theme', wait: 1500, theme: 'light' },
  { name: 'theme-dark', description: 'Dark theme', wait: 1500, theme: 'dark' }
];

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

  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  mainWindow.webContents.once('did-finish-load', async () => {
    console.log('\n✅ App loaded! Starting screenshot capture in 3 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
    await captureAll();
  });
}

async function navigateToPage(page, tab = null) {
  if (!mainWindow) return;
  
  return mainWindow.webContents.executeJavaScript(`
    (function() {
      try {
        // Navigate to main page first
        if ('${page}' === 'settings') {
          const settingsNav = document.querySelector('.nav-item[data-page="settings"]');
          if (settingsNav) {
            settingsNav.click();
            ${tab ? `setTimeout(() => {
              const tabEl = document.querySelector('.settings-nav-item[data-settings-page="${tab}"]');
              if (tabEl) tabEl.click();
            }, 1000);` : ''}
            return true;
          }
        } else {
          const navItem = document.querySelector('.nav-item[data-page="${page}"]');
          if (navItem) {
            navItem.click();
            return true;
          }
        }
        return false;
      } catch(e) {
        console.error('Navigation error:', e);
        return false;
      }
    })();
  `);
}

async function setTheme(theme) {
  if (!mainWindow) return;
  
  return mainWindow.webContents.executeJavaScript(`
    (function() {
      try {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme !== '${theme}') {
          const themeToggle = document.querySelector('.theme-toggle');
          if (themeToggle) {
            themeToggle.click();
            return true;
          }
        }
        return false;
      } catch(e) {
        console.error('Theme error:', e);
        return false;
      }
    })();
  `);
}

async function captureScreenshot(filename) {
  try {
    const image = await mainWindow.webContents.capturePage();
    const buffer = image.toPNG();
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    fs.writeFileSync(filepath, buffer);
    const stats = fs.statSync(filepath);
    return { success: true, filepath, size: stats.size };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function captureAll() {
  console.log('📸 Starting automated screenshot capture...\n');
  
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    console.log(`[${i + 1}/${tasks.length}] ${task.description}...`);
    
    try {
      // Navigate if needed
      if (task.navigate) {
        await navigateToPage(task.navigate, task.tab);
      }
      
      // Set theme if needed
      if (task.theme) {
        await setTheme(task.theme);
      }
      
      // Wait for UI to update
      await new Promise(resolve => setTimeout(resolve, task.wait));
      
      // Capture screenshot
      const filename = `${task.name}.png`;
      const result = await captureScreenshot(filename);
      
      if (result.success) {
        capturedScreenshots.push({
          name: task.name,
          description: task.description,
          filename: filename,
          size: result.size
        });
        console.log(`   ✅ Saved: ${filename} (${(result.size / 1024).toFixed(1)} KB)`);
      } else {
        console.log(`   ❌ Error: ${result.error}`);
      }
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
    
    if (i < tasks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  showSummary();
}

function showSummary() {
  console.log(`\n✅ Screenshot capture complete!\n`);
  console.log(`📋 Summary:`);
  console.log(`   Directory: ${SCREENSHOTS_DIR}`);
  console.log(`   Total captured: ${capturedScreenshots.length}/${tasks.length}\n`);
  
  console.log(`📸 Captured screenshots:`);
  capturedScreenshots.forEach((screenshot, index) => {
    console.log(`   ${index + 1}. ${screenshot.filename} - ${screenshot.description}`);
    console.log(`      Size: ${(screenshot.size / 1024).toFixed(1)} KB`);
  });
  
  console.log(`\n💡 Review the screenshots in: ${SCREENSHOTS_DIR}`);
  console.log(`\n👉 Press Enter to confirm and upload to GitHub, or Ctrl+C to cancel...`);
  
  rl.question('', () => {
    uploadToGitHub();
  });
}

async function uploadToGitHub() {
  console.log(`\n📤 Uploading screenshots to GitHub...\n`);
  
  try {
    const { execSync } = require('child_process');
    
    // Add screenshots
    execSync('git add screenshots/*.png', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
    console.log('✅ Added screenshots to git');
    
    // Commit
    execSync('git commit -m "docs: Add application screenshots"', { 
      cwd: path.join(__dirname, '..'), 
      stdio: 'inherit' 
    });
    console.log('✅ Committed screenshots');
    
    // Push
    execSync('git push origin main', { 
      cwd: path.join(__dirname, '..'), 
      stdio: 'inherit' 
    });
    console.log('✅ Pushed to GitHub');
    
    console.log(`\n🎉 Screenshots successfully uploaded to GitHub!`);
    console.log(`   View them at: https://github.com/muhib-karim/sonu/tree/main/screenshots`);
    
  } catch (error) {
    console.error(`\n❌ Error uploading to GitHub: ${error.message}`);
    console.log(`\n💡 You can manually upload by running:`);
    console.log(`   git add screenshots/`);
    console.log(`   git commit -m "docs: Add application screenshots"`);
    console.log(`   git push origin main`);
  }
  
  rl.close();
  app.quit();
}

// Start app
app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

