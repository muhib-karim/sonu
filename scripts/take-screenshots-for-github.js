/**
 * Automated Screenshot Capture for GitHub
 * 
 * This standalone script runs SONU, captures screenshots of different features,
 * shows them for confirmation, and uploads to GitHub.
 * 
 * Usage: npm run screenshots
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
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

// Main navigation tabs
const MAIN_TABS = [
  { name: 'home', label: 'Home', selector: '.nav-item[data-page="home"]' },
  { name: 'dictionary', label: 'Dictionary', selector: '.nav-item[data-page="dictionary"]' },
  { name: 'snippets', label: 'Snippets', selector: '.nav-item[data-page="snippets"]' },
  { name: 'style', label: 'Style', selector: '.nav-item[data-page="style"]' },
  { name: 'notes', label: 'Notes', selector: '.nav-item[data-page="notes"]' },
  { name: 'settings', label: 'Settings', selector: '.nav-item[data-page="settings"]' }
];

// Settings sub-tabs
const SETTINGS_TABS = [
  { name: 'general', label: 'General', selector: '.settings-nav-item[data-settings-page="general"]' },
  { name: 'system', label: 'System', selector: '.settings-nav-item[data-settings-page="system"]' },
  { name: 'model', label: 'Model Selector', selector: '.settings-nav-item[data-settings-page="model"]' },
  { name: 'themes', label: 'Themes', selector: '.settings-nav-item[data-settings-page="themes"]' },
  { name: 'vibe', label: 'Vibe Coding', selector: '.settings-nav-item[data-settings-page="vibe"]' },
  { name: 'experimental', label: 'Experimental', selector: '.settings-nav-item[data-settings-page="experimental"]' }
];

// Theme variations
const THEMES = [
  { name: 'light', label: 'Light Theme' },
  { name: 'dark', label: 'Dark Theme' }
];

// Generate screenshot tasks from tabs
const screenshotTasks = [];

// Add main tabs
MAIN_TABS.forEach(tab => {
  screenshotTasks.push({
    name: tab.name,
    label: tab.label,
    description: `${tab.label} page`,
    wait: 2000,
    action: async () => {
      if (mainWindow && mainWindow.webContents) {
        await mainWindow.webContents.executeJavaScript(`
          (function() {
            if (window.voiceApp && window.voiceApp.navigateToPage) {
              window.voiceApp.navigateToPage('${tab.name}');
            } else {
              const navItems = document.querySelectorAll('.nav-item[data-page]');
              const pages = document.querySelectorAll('.page');
              navItems.forEach(nav => {
                if (nav && nav.dataset) {
                  nav.classList.toggle('active', nav.dataset.page === '${tab.name}');
                }
              });
              pages.forEach(p => {
                if (p && p.id) {
                  const expectedId = 'page-${tab.name}';
                  p.classList.toggle('active', p.id === expectedId);
                }
              });
            }
          })();
        `);
      }
    }
  });
});

// Add settings sub-tabs (navigate to settings first)
SETTINGS_TABS.forEach(tab => {
  screenshotTasks.push({
    name: `settings-${tab.name}`,
    label: `Settings > ${tab.label}`,
    description: `Settings > ${tab.label}`,
    wait: 2000,
    action: async () => {
      if (mainWindow && mainWindow.webContents) {
        // Navigate to settings first
        await mainWindow.webContents.executeJavaScript(`
          (function() {
            if (window.voiceApp && window.voiceApp.navigateToPage) {
              window.voiceApp.navigateToPage('settings');
            } else {
              const navItems = document.querySelectorAll('.nav-item[data-page]');
              const pages = document.querySelectorAll('.page');
              navItems.forEach(nav => {
                if (nav && nav.dataset) {
                  nav.classList.toggle('active', nav.dataset.page === 'settings');
                }
              });
              pages.forEach(p => {
                if (p && p.id) {
                  p.classList.toggle('active', p.id === 'page-settings');
                }
              });
            }
          })();
        `);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Navigate to settings sub-tab
        await mainWindow.webContents.executeJavaScript(`
          (function() {
            if (window.voiceApp && window.voiceApp.navigateToSettingsPage) {
              window.voiceApp.navigateToSettingsPage('${tab.name}');
            } else {
              const settingsNavItems = document.querySelectorAll('.settings-nav-item[data-settings-page]');
              const settingsPages = document.querySelectorAll('.settings-page');
              settingsNavItems.forEach(nav => {
                if (nav && nav.dataset) {
                  nav.classList.toggle('active', nav.dataset.settingsPage === '${tab.name}');
                }
              });
              settingsPages.forEach(p => {
                if (p && p.id) {
                  const expectedId = 'settings-${tab.name}';
                  p.classList.toggle('active', p.id === expectedId);
                }
              });
            }
          })();
        `);
      }
    }
  });
});

// Add theme variations (on home page)
THEMES.forEach(theme => {
  screenshotTasks.push({
    name: `theme-${theme.name}`,
    label: theme.label,
    description: theme.label,
    wait: 2000,
    action: async () => {
      if (mainWindow && mainWindow.webContents) {
        // Navigate to home first
        await mainWindow.webContents.executeJavaScript(`
          (function() {
            if (window.voiceApp && window.voiceApp.navigateToPage) {
              window.voiceApp.navigateToPage('home');
            }
          })();
        `);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Set theme
        await mainWindow.webContents.executeJavaScript(`
          (function() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            if (currentTheme !== '${theme.name}') {
              const themeToggle = document.querySelector('.theme-toggle-btn, .theme-toggle');
              if (themeToggle) {
                themeToggle.click();
              }
            }
          })();
        `);
      }
    }
  });
});

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
    console.log('\n✅ SONU app loaded successfully!');
    console.log('📸 Starting automated screenshot capture...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    await captureAllScreenshots();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function captureAllScreenshots() {
  if (!mainWindow) {
    console.error('❌ Main window not available!');
    return;
  }

  console.log(`📋 Will capture ${screenshotTasks.length} screenshots:\n`);
  screenshotTasks.forEach((task, index) => {
    console.log(`   ${index + 1}. ${task.name}.png - ${task.description}`);
  });
  console.log('');

  for (let i = 0; i < screenshotTasks.length; i++) {
    const task = screenshotTasks[i];
    console.log(`[${i + 1}/${screenshotTasks.length}] Capturing: ${task.name}...`);

    try {
      // Execute action if needed
      if (task.action) {
        await task.action();
      }

      // Wait for UI to update
      await new Promise(resolve => setTimeout(resolve, task.wait));

      // Capture screenshot
      if (!mainWindow || mainWindow.isDestroyed()) {
        console.error(`   ❌ Window destroyed before capture`);
        continue;
      }

      const image = await mainWindow.webContents.capturePage();
      const buffer = image.toPNG();

      // Save screenshot with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `${task.name}_${timestamp}.png`;
      const filepath = path.join(SCREENSHOTS_DIR, filename);
      fs.writeFileSync(filepath, buffer);

      const stats = fs.statSync(filepath);
      capturedScreenshots.push({
        name: task.name,
        description: task.description,
        filename: filename,
        filepath: filepath,
        size: stats.size
      });

      console.log(`   ✅ Saved: ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }

    // Delay between screenshots
    if (i < screenshotTasks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  showSummary();
}

function showSummary() {
  console.log(`\n✅ Screenshot capture complete!\n`);
  console.log(`📋 Summary:`);
  console.log(`   Directory: ${SCREENSHOTS_DIR}`);
  console.log(`   Total captured: ${capturedScreenshots.length}/${screenshotTasks.length}\n`);

  console.log(`📸 Captured screenshots:`);
  capturedScreenshots.forEach((screenshot, index) => {
    console.log(`   ${index + 1}. ${screenshot.filename}`);
    console.log(`      Description: ${screenshot.description}`);
    console.log(`      Size: ${(screenshot.size / 1024).toFixed(1)} KB\n`);
  });

  console.log(`💡 Review the screenshots in: ${SCREENSHOTS_DIR}`);
  console.log(`\n⏳ Waiting 5 seconds for review, then automatically uploading to GitHub...`);
  console.log(`   (Press Ctrl+C to cancel if needed)\n`);

  // Auto-confirm after 3 seconds and upload
  setTimeout(() => {
    console.log('✅ Auto-confirming and uploading to GitHub...\n');
    uploadToGitHub();
  }, 3000);
}

async function uploadToGitHub() {
  console.log(`\n📤 Uploading screenshots to GitHub...\n`);

  try {
    const repoPath = path.join(__dirname, '..');

    // Check if screenshots exist
    const screenshots = capturedScreenshots.filter(s => fs.existsSync(s.filepath));
    if (screenshots.length === 0) {
      console.log('❌ No screenshots found to upload.');
      rl.close();
      app.quit();
      return;
    }

    // Add screenshots
    console.log('📦 Adding screenshots to git...');
    execSync('git add screenshots/*.png', { 
      cwd: repoPath, 
      stdio: 'inherit' 
    });

    // Commit
    console.log('💾 Committing screenshots...');
    execSync('git commit -m "docs: Add application screenshots for GitHub"', { 
      cwd: repoPath, 
      stdio: 'inherit' 
    });

    // Push
    console.log('🚀 Pushing to GitHub...');
    execSync('git push origin main', { 
      cwd: repoPath, 
      stdio: 'inherit' 
    });

    console.log(`\n✅ Screenshots successfully uploaded to GitHub!`);
    console.log(`\n📸 View them at:`);
    console.log(`   https://github.com/muhib-karim/sonu/tree/main/screenshots`);
    console.log(`\n📄 They will appear in the README automatically.`);

  } catch (error) {
    console.error(`\n❌ Error uploading to GitHub: ${error.message}`);
    console.log(`\n💡 You can manually upload by running:`);
    console.log(`   git add screenshots/`);
    console.log(`   git commit -m "docs: Add application screenshots"`);
    console.log(`   git push origin main`);
  }

  rl.close();
  setTimeout(() => {
    app.quit();
  }, 2000);
}

// Start the app
app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

