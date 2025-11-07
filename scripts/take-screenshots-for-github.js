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

// Screenshot tasks with descriptions
const screenshotTasks = [
  {
    name: 'main-window',
    description: 'Main application window showing the home page with modern glassmorphic design',
    wait: 3000,
    action: null // Already on home page
  },
  {
    name: 'settings-page',
    description: 'Settings page with comprehensive configuration options',
    wait: 3000,
    action: () => {
      mainWindow.webContents.executeJavaScript(`
        const settingsNav = document.querySelector('.nav-item[data-page="settings"]');
        if (settingsNav) settingsNav.click();
      `);
    }
  },
  {
    name: 'model-selector',
    description: 'Model selector tab showing available Whisper models and download options',
    wait: 3000,
    action: () => {
      mainWindow.webContents.executeJavaScript(`
        const settingsNav = document.querySelector('.nav-item[data-page="settings"]');
        if (settingsNav) {
          settingsNav.click();
          setTimeout(() => {
            const modelTab = document.querySelector('.settings-nav-item[data-settings-page="model-selector"]');
            if (modelTab) modelTab.click();
          }, 1000);
        }
      `);
    }
  },
  {
    name: 'theme-light',
    description: 'Light theme with clean, modern design',
    wait: 2000,
    action: () => {
      mainWindow.webContents.executeJavaScript(`
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme !== 'light') {
          const themeToggle = document.querySelector('.theme-toggle');
          if (themeToggle) themeToggle.click();
        }
      `);
    }
  },
  {
    name: 'theme-dark',
    description: 'Dark theme with elegant, professional appearance',
    wait: 2000,
    action: () => {
      mainWindow.webContents.executeJavaScript(`
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme !== 'dark') {
          const themeToggle = document.querySelector('.theme-toggle');
          if (themeToggle) themeToggle.click();
        }
      `);
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
        task.action();
      }

      // Wait for UI to update
      await new Promise(resolve => setTimeout(resolve, task.wait));

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
        filename: filename,
        filepath: filepath,
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
  console.log(`\n👉 Press Enter to confirm and upload to GitHub, or Ctrl+C to cancel...`);

  rl.question('', () => {
    uploadToGitHub();
  });
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

