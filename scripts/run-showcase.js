/**
 * Automated Showcase Capture for SONU
 * 
 * This script runs SONU, captures screenshots of all features,
 * saves them to assets/showcase, creates a video, and uploads to GitHub.
 * 
 * Usage: npm run showcase
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const SHOWCASE_DIR = path.join(__dirname, '..', 'assets', 'showcase');
if (!fs.existsSync(SHOWCASE_DIR)) {
  fs.mkdirSync(SHOWCASE_DIR, { recursive: true });
}

let mainWindow = null;
const capturedScreenshots = [];

// Main navigation tabs
const MAIN_TABS = [
  { name: 'home', label: 'Home' },
  { name: 'dictionary', label: 'Dictionary' },
  { name: 'snippets', label: 'Snippets' },
  { name: 'style', label: 'Style' },
  { name: 'notes', label: 'Notes' },
  { name: 'settings', label: 'Settings' }
];

// Settings sub-tabs
const SETTINGS_TABS = [
  { name: 'general', label: 'General' },
  { name: 'system', label: 'System' },
  { name: 'model', label: 'Model Selector' },
  { name: 'themes', label: 'Themes' },
  { name: 'vibe', label: 'Vibe Coding' },
  { name: 'experimental', label: 'Experimental' }
];

// Theme variations
const THEMES = [
  { name: 'light', label: 'Light Theme' },
  { name: 'dark', label: 'Dark Theme' }
];

// Generate screenshot tasks
const screenshotTasks = [];

// Add main tabs
MAIN_TABS.forEach(tab => {
  screenshotTasks.push({
    name: tab.name,
    label: tab.label,
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

// Curated showcase states (insert early to influence ordering)
// 1) Dictation start state on Home
screenshotTasks.splice(1, 0, {
  name: 'dictation-start',
  label: 'Dictation Start',
  wait: 2000,
  action: async () => {
    if (mainWindow && mainWindow.webContents) {
      // Navigate to home and show live transcription preview with sample text
      await mainWindow.webContents.executeJavaScript(`
        (function() {
          if (window.voiceApp && window.voiceApp.navigateToPage) {
            window.voiceApp.navigateToPage('home');
          } else {
            const navItems = document.querySelectorAll('.nav-item[data-page]');
            const pages = document.querySelectorAll('.page');
            navItems.forEach(nav => {
              if (nav && nav.dataset) {
                nav.classList.toggle('active', nav.dataset.page === 'home');
              }
            });
            pages.forEach(p => {
              if (p && p.id) {
                p.classList.toggle('active', p.id === 'page-home');
              }
            });
          }
          const live = document.getElementById('live-preview');
          const text = document.getElementById('live-preview-text');
          if (live) live.style.display = 'block';
          if (text) {
            text.textContent = 'Hello! This is a live dictation demo. Whisper.cpp captures audio and transcribes it in real time. The text appears here as you speak.';
          }
        })();
      `);
    }
  }
});

// 2) Output log/state on Home (history list demo)
screenshotTasks.splice(2, 0, {
  name: 'output-log',
  label: 'Output Log',
  wait: 2000,
  action: async () => {
    if (mainWindow && mainWindow.webContents) {
      await mainWindow.webContents.executeJavaScript(`
        (function() {
          if (window.voiceApp && window.voiceApp.navigateToPage) {
            window.voiceApp.navigateToPage('home');
          }
          const history = document.getElementById('history-list');
          if (history) {
            history.innerHTML = '';
            const items = [
              '10:02 AM — "Meeting moved to 3 PM, confirm with Alex"',
              '10:05 AM — "Draft email to team about quarterly goals"',
              '10:10 AM — "Note: Try the new medium model for accuracy"'
            ];
            items.forEach(t => {
              const div = document.createElement('div');
              div.className = 'history-item';
              div.textContent = t;
              history.appendChild(div);
            });
          }
        })();
      `);
    }
  }
});

// 3) Help overlay (UI-only for screenshot)
screenshotTasks.splice(3, 0, {
  name: 'help',
  label: 'Help & Support',
  wait: 1500,
  action: async () => {
    if (mainWindow && mainWindow.webContents) {
      await mainWindow.webContents.executeJavaScript(`
        (function() {
          const overlayId = 'showcase-help-overlay';
          if (!document.getElementById(overlayId)) {
            const overlay = document.createElement('div');
            overlay.id = overlayId;
            overlay.style.position = 'fixed';
            overlay.style.top = '24px';
            overlay.style.right = '24px';
            overlay.style.padding = '12px 16px';
            overlay.style.background = 'rgba(24, 24, 24, 0.85)';
            overlay.style.color = '#fff';
            overlay.style.border = '1px solid rgba(255,255,255,0.15)';
            overlay.style.borderRadius = '8px';
            overlay.style.boxShadow = '0 4px 20px rgba(0,0,0,0.35)';
            overlay.style.zIndex = '9999';
            overlay.style.fontSize = '14px';
            overlay.style.backdropFilter = 'blur(6px)';
            overlay.innerHTML = '<strong>Help & Support</strong><br/>Press Settings → Model to manage models. Visit docs for FAQs.';
            document.body.appendChild(overlay);
          }
        })();
      `);
    }
  }
});

// Add settings sub-tabs
SETTINGS_TABS.forEach(tab => {
  screenshotTasks.push({
    name: `settings-${tab.name}`,
    label: `Settings > ${tab.label}`,
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

// Add theme variations
THEMES.forEach(theme => {
  screenshotTasks.push({
    name: `theme-${theme.name}`,
    label: theme.label,
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
    width: 1920,
    height: 1080,
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
    console.log('📸 Starting automated showcase capture...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
    await captureAllScreenshots();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function captureAllScreenshots() {
  if (!mainWindow) {
    console.error('❌ Main window not available!');
    app.quit();
    return;
  }

  console.log(`📋 Will capture ${screenshotTasks.length} screenshots:\n`);
  screenshotTasks.forEach((task, index) => {
    console.log(`   ${index + 1}. ${task.name}.png - ${task.label}`);
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

      // Map to preferred showcase names when applicable
      function mapPreferredName(taskName, index) {
        const preferred = {
          'home': 'home',
          'settings': 'settings',
          'dictation-start': 'dictation_start',
          'settings-model': 'model_selector',
          'output-log': 'output_log',
          'help': 'help'
        };
        const base = preferred[taskName] || taskName.replace(/[^a-z0-9-_]/gi, '_');
        const num = String(index + 1).padStart(2, '0');
        return `${num}_${base}.png`;
      }

      const filename = mapPreferredName(task.name, i);
      const filepath = path.join(SHOWCASE_DIR, filename);
      fs.writeFileSync(filepath, buffer);

      const stats = fs.statSync(filepath);
      capturedScreenshots.push({
        name: task.name,
        label: task.label,
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
  console.log(`   Directory: ${SHOWCASE_DIR}`);
  console.log(`   Total captured: ${capturedScreenshots.length}/${screenshotTasks.length}\n`);

  console.log(`📸 Captured screenshots:`);
  capturedScreenshots.forEach((screenshot, index) => {
    console.log(`   ${index + 1}. ${screenshot.filename} - ${screenshot.label}`);
  });

  console.log(`\nℹ️ Video generation and any git actions are handled externally.`);
  console.log(`   (No auto-push performed. Waiting for explicit 'push showcase'.)`);

  setTimeout(() => {
    app.quit();
  }, 1500);
}

function createVideo() {
  try {
    const repoPath = path.join(__dirname, '..');
    
    // Get all PNG files sorted by name
    const pngFiles = fs.readdirSync(SHOWCASE_DIR)
      .filter(file => file.endsWith('.png'))
      .sort()
      .map(file => path.join(SHOWCASE_DIR, file));
    
    if (pngFiles.length === 0) {
      console.log('   ⚠️  No PNG files found to create video');
      return;
    }
    
    // For Windows compatibility, use image2 demuxer with individual file inputs
    // Build filter_complex to concatenate all images
    const videoPath = path.join(SHOWCASE_DIR, 'showcase.mp4');
    const videoPathNormalized = videoPath.replace(/\\/g, '/');
    
    // Build input arguments - each image as a separate input with framerate and duration
    const inputArgs = [];
    const filterInputs = [];
    
    pngFiles.forEach((file, index) => {
      const normalizedPath = file.replace(/\\/g, '/');
      // Escape special characters for shell (Windows paths)
      const escapedPath = normalizedPath.replace(/ /g, '\\ ').replace(/'/g, "'\\''");
      // Use -loop 1 and -t 1 to show each image for 1 second
      inputArgs.push(`-loop 1 -t 1 -i "${escapedPath}"`);
      filterInputs.push(`[${index}:v]`);
    });
    
    // Build filter_complex to concatenate all inputs
    const filterComplex = `${filterInputs.join('')}concat=n=${pngFiles.length}:v=1:a=0[out]`;
    
    const ffmpegCmd = `ffmpeg -y ${inputArgs.join(' ')} -filter_complex "${filterComplex}" -map "[out]" -c:v libx264 -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "${videoPathNormalized}"`;
    
    console.log(`   Running ffmpeg with ${pngFiles.length} images...`);
    execSync(ffmpegCmd, { 
      cwd: repoPath, 
      stdio: 'inherit',
      shell: true
    });
    
    if (fs.existsSync(videoPath)) {
      const stats = fs.statSync(videoPath);
      console.log(`   ✅ Video created: showcase.mp4 (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
    }
  } catch (error) {
    console.error(`   ❌ Error creating video: ${error.message}`);
    console.log(`   💡 Make sure ffmpeg is installed: https://ffmpeg.org/download.html`);
    // Clean up file list on error
    const fileListPath = path.join(SHOWCASE_DIR, 'filelist.txt');
    if (fs.existsSync(fileListPath)) {
      try {
        fs.unlinkSync(fileListPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}

// Disabled auto-upload to GitHub to honor "push showcase" requirement
async function uploadToGitHub() { /* intentionally disabled */ }

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
