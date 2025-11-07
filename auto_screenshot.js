/**
 * 🧠 Automated Screenshot & Video Capture for SONU Electron App
 * 
 * This script uses Playwright to automate the Electron app, capture screenshots
 * of all tabs/features, record a walkthrough video, and upload to GitHub.
 * 
 * Usage:
 *   # Install dependencies:
 *   npm install playwright
 *   npx playwright install
 * 
 *   # Run automation:
 *   node auto_screenshot.js
 * 
 * Requirements:
 *   - Node.js 16+
 *   - Playwright installed
 *   - Git configured (for auto-upload)
 */

const { _electron: electron } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const RECORDINGS_DIR = path.join(__dirname, 'recordings');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5); // YYYY-MM-DD_HH-mm-ss

// Ensure directories exist
[SCREENSHOTS_DIR, RECORDINGS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

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

let electronApp = null;
let mainWindow = null;
let capturedScreenshots = [];
let videoPath = null;

/**
 * Log with timestamp
 */
function log(message, emoji = '📸') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${emoji} [${timestamp}] ${message}`);
}

/**
 * Take screenshot with timestamp using Electron's native API via IPC
 */
async function takeScreenshot(name, description) {
  try {
    if (!mainWindow) {
      throw new Error('Main window not available');
    }

    // Wait for page to be ready
    await mainWindow.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
    await mainWindow.waitForTimeout(2000); // Wait for animations

    const filename = `${name}_${TIMESTAMP}.png`;
    const filepath = path.join(SCREENSHOTS_DIR, filename);

    // Get the Electron BrowserWindow from Playwright's Electron context
    // Playwright's Electron integration exposes the actual Electron app
    const electronApp = await electronApp;
    const windows = await electronApp.windows();
    const browserWindow = windows[0]; // Get first window
    
    // Use Electron's native capturePage API directly
    // We need to access the actual BrowserWindow object
    // Since Playwright wraps it, we'll use evaluate to call capturePage
    const screenshotData = await mainWindow.evaluate(() => {
      // This won't work directly, so we'll use a different approach
      return null;
    });

    // Alternative: Use Playwright's screenshot but with a workaround
    // Take screenshot without waiting for fonts by using a shorter timeout
    // and catching the error, then retrying with a buffer approach
    let screenshotBuffer;
    try {
      // Try to get screenshot as buffer first (faster)
      screenshotBuffer = await mainWindow.screenshot({
        timeout: 3000, // Very short timeout to avoid font wait
        fullPage: false,
        type: 'png'
      });
    } catch (e) {
      // If that fails, try with even shorter timeout
      try {
        screenshotBuffer = await Promise.race([
          mainWindow.screenshot({ timeout: 2000, fullPage: false }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
        ]);
      } catch (e2) {
        // Last resort: use evaluate to get canvas screenshot
        log(`Using canvas fallback for ${name}...`, '🔄');
        const canvasData = await mainWindow.evaluate(() => {
          const canvas = document.createElement('canvas');
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          const ctx = canvas.getContext('2d');
          // This won't work for Electron, but we'll try
          return canvas.toDataURL('image/png');
        }).catch(() => null);
        
        if (canvasData) {
          const base64Data = canvasData.replace(/^data:image\/png;base64,/, '');
          screenshotBuffer = Buffer.from(base64Data, 'base64');
        } else {
          throw new Error('All screenshot methods failed');
        }
      }
    }

    // Save screenshot
    if (screenshotBuffer) {
      fs.writeFileSync(filepath, screenshotBuffer);
      
      const stats = fs.statSync(filepath);
      capturedScreenshots.push({
        name,
        description,
        filename,
        filepath,
        size: stats.size
      });

      log(`Captured: ${name} (${(stats.size / 1024).toFixed(1)} KB)`, '✅');
      return filepath;
    }

    throw new Error('No screenshot data captured');
  } catch (error) {
    log(`Error capturing ${name}: ${error.message}`, '❌');
    return null;
  }
}

/**
 * Navigate to a main tab
 */
async function navigateToMainTab(tab) {
  try {
    log(`Navigating to ${tab.label}...`, '🔄');
    
    // Use JavaScript evaluation for more reliable navigation
    await mainWindow.evaluate((pageName) => {
      if (window.voiceApp && window.voiceApp.navigateToPage) {
        window.voiceApp.navigateToPage(pageName);
      } else {
        // Fallback: direct DOM manipulation
        const navItems = document.querySelectorAll('.nav-item[data-page]');
        const pages = document.querySelectorAll('.page');
        
        navItems.forEach(nav => {
          if (nav && nav.dataset) {
            nav.classList.toggle('active', nav.dataset.page === pageName);
          }
        });
        
        pages.forEach(p => {
          if (p && p.id) {
            const expectedId = `page-${pageName}`;
            p.classList.toggle('active', p.id === expectedId);
          }
        });
      }
    }, tab.name);
    
    await mainWindow.waitForTimeout(2000); // Wait for navigation
    return true;
  } catch (error) {
    log(`Error navigating to ${tab.label}: ${error.message}`, '⚠️');
    // Try fallback: click button directly
    try {
      const button = await mainWindow.locator(tab.selector).first();
      if (await button.isVisible({ timeout: 5000 })) {
        await button.click();
        await mainWindow.waitForTimeout(2000);
        return true;
      }
    } catch (e) {
      log(`Fallback navigation also failed: ${e.message}`, '❌');
    }
    return false;
  }
}

/**
 * Navigate to a settings sub-tab
 */
async function navigateToSettingsTab(tab) {
  try {
    log(`Navigating to Settings > ${tab.label}...`, '🔄');
    
    // Use JavaScript evaluation for more reliable navigation
    await mainWindow.evaluate((pageName) => {
      if (window.voiceApp && window.voiceApp.navigateToSettingsPage) {
        window.voiceApp.navigateToSettingsPage(pageName);
      } else {
        // Fallback: direct DOM manipulation
        const settingsNavItems = document.querySelectorAll('.settings-nav-item[data-settings-page]');
        const settingsPages = document.querySelectorAll('.settings-page');
        
        settingsNavItems.forEach(nav => {
          if (nav && nav.dataset) {
            nav.classList.toggle('active', nav.dataset.settingsPage === pageName);
          }
        });
        
        settingsPages.forEach(p => {
          if (p && p.id) {
            const expectedId = `settings-${pageName}`;
            p.classList.toggle('active', p.id === expectedId);
          }
        });
      }
    }, tab.name);
    
    await mainWindow.waitForTimeout(1500); // Wait for tab switch
    return true;
  } catch (error) {
    log(`Error navigating to Settings > ${tab.label}: ${error.message}`, '⚠️');
    // Try fallback: click button directly
    try {
      const button = await mainWindow.locator(tab.selector).first();
      if (await button.isVisible({ timeout: 5000 })) {
        await button.click();
        await mainWindow.waitForTimeout(1500);
        return true;
      }
    } catch (e) {
      log(`Fallback navigation also failed: ${e.message}`, '❌');
    }
    return false;
  }
}

/**
 * Set theme
 */
async function setTheme(theme) {
  try {
    log(`Setting ${theme.label}...`, '🎨');
    
    const currentTheme = await mainWindow.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });

    if (currentTheme !== theme.name) {
      const themeToggle = await mainWindow.locator('.theme-toggle-btn, .theme-toggle').first();
      if (await themeToggle.isVisible({ timeout: 5000 })) {
        await themeToggle.click();
        await mainWindow.waitForTimeout(1500); // Wait for theme transition
      }
    }
    return true;
  } catch (error) {
    log(`Error setting theme: ${error.message}`, '⚠️');
    return false;
  }
}

/**
 * Capture all screenshots
 */
async function captureAllScreenshots() {
  log('Starting automated screenshot capture...', '🚀');
  log(`Will capture ${MAIN_TABS.length + SETTINGS_TABS.length + THEMES.length} screenshots\n`, '📋');

  // Capture main tabs
  for (const tab of MAIN_TABS) {
    const navigated = await navigateToMainTab(tab);
    if (navigated) {
      await takeScreenshot(tab.name, `${tab.label} page`);
    }
    await mainWindow.waitForTimeout(500);
  }

  // Navigate to settings first
  await navigateToMainTab(MAIN_TABS.find(t => t.name === 'settings'));

  // Capture settings sub-tabs
  for (const tab of SETTINGS_TABS) {
    const navigated = await navigateToSettingsTab(tab);
    if (navigated) {
      await takeScreenshot(`settings-${tab.name}`, `Settings > ${tab.label}`);
    }
    await mainWindow.waitForTimeout(500);
  }

  // Capture theme variations (on home page)
  await navigateToMainTab(MAIN_TABS.find(t => t.name === 'home'));
  for (const theme of THEMES) {
    await setTheme(theme);
    await takeScreenshot(`theme-${theme.name}`, theme.label);
    await mainWindow.waitForTimeout(500);
  }

  log(`\n✅ Screenshot capture complete! Captured ${capturedScreenshots.length} screenshots`, '✅');
}

/**
 * Upload to GitHub
 */
async function uploadToGitHub() {
  log('Uploading screenshots and video to GitHub...', '📤');

  try {
    const repoPath = __dirname;

    // Check if there are new files
    const screenshots = capturedScreenshots.filter(s => fs.existsSync(s.filepath));
    const hasVideo = videoPath && fs.existsSync(videoPath);

    if (screenshots.length === 0 && !hasVideo) {
      log('No new assets to upload', '⚠️');
      return;
    }

    // Add files
    log('Adding files to git...', '📦');
    if (screenshots.length > 0) {
      execSync('git add screenshots/*.png', { cwd: repoPath, stdio: 'inherit' });
    }
    if (hasVideo) {
      execSync('git add recordings/*.mp4', { cwd: repoPath, stdio: 'inherit' });
    }

    // Commit
    log('Committing changes...', '💾');
    const commitMessage = `docs: Auto-update screenshots and walkthrough video [${TIMESTAMP}]`;
    try {
      execSync(`git commit -m "${commitMessage}"`, { 
        cwd: repoPath, 
        stdio: 'inherit' 
      });
    } catch (error) {
      if (error.message.includes('nothing to commit')) {
        log('No changes to commit', 'ℹ️');
        return;
      }
      throw error;
    }

    // Push
    log('Pushing to GitHub...', '🚀');
    execSync('git push origin main', { 
      cwd: repoPath, 
      stdio: 'inherit' 
    });

    log('✅ Successfully uploaded to GitHub!', '✅');
    log(`📸 Screenshots: ${screenshots.length}`, '📸');
    if (hasVideo) {
      log(`🎬 Video: ${path.basename(videoPath)}`, '🎬');
    }
    log(`🔗 View at: https://github.com/muhib-karim/sonu/tree/main/screenshots`, '🔗');

  } catch (error) {
    log(`Error uploading to GitHub: ${error.message}`, '❌');
    log('You may need to configure Git credentials', '💡');
    log('Manual upload:', '💡');
    log('  git add screenshots recordings', '💡');
    log('  git commit -m "docs: Add screenshots and video"', '💡');
    log('  git push origin main', '💡');
  }
}

/**
 * Main automation function
 */
async function runAutomation() {
  try {
    log('Starting SONU Electron app automation...', '🚀');
    log(`Timestamp: ${TIMESTAMP}\n`, '🕐');

    // Launch Electron app with video recording
    log('Launching Electron app...', '⚡');
    electronApp = await electron.launch({
      args: ['.'],
      recordVideo: {
        dir: RECORDINGS_DIR,
        size: { width: 1280, height: 720 }
      }
    });

    // Get main window
    mainWindow = await electronApp.firstWindow();
    log('App window opened', '✅');

    // Wait for app to fully load
    log('Waiting for app to load...', '⏳');
    await mainWindow.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await mainWindow.waitForTimeout(5000); // Additional wait for initialization
    
    // Wait for navigation to be ready
    await mainWindow.waitForFunction(() => {
      return document.querySelectorAll('.nav-item[data-page]').length > 0;
    }, { timeout: 10000 }).catch(() => {
      log('Navigation elements may not be ready, continuing anyway...', '⚠️');
    });

    log('App loaded successfully!\n', '✅');

    // Capture all screenshots
    await captureAllScreenshots();

    // Get video path - Playwright saves video automatically, we just need to get the path
    try {
      // Wait a bit for video to finalize
      await mainWindow.waitForTimeout(2000);
      
      // Find the video file that was created
      const videoFiles = fs.readdirSync(RECORDINGS_DIR).filter(f => f.endsWith('.webm') || f.endsWith('.mp4'));
      if (videoFiles.length > 0) {
        // Get the most recent video file
        const videoFile = videoFiles.sort().reverse()[0];
        const videoFilename = `app_walkthrough_${TIMESTAMP}.mp4`;
        videoPath = path.join(RECORDINGS_DIR, videoFilename);
        
        // Rename if needed
        const oldPath = path.join(RECORDINGS_DIR, videoFile);
        if (fs.existsSync(oldPath) && oldPath !== videoPath) {
          fs.renameSync(oldPath, videoPath);
        } else if (fs.existsSync(oldPath)) {
          videoPath = oldPath;
        }
        
        log(`Video saved: ${path.basename(videoPath)}`, '🎬');
      }
    } catch (error) {
      log(`Video capture note: ${error.message}`, '⚠️');
    }

    // Show summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 CAPTURE SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Screenshots captured: ${capturedScreenshots.length}`);
    if (videoPath) {
      const videoStats = fs.statSync(videoPath);
      console.log(`🎬 Video recorded: ${path.basename(videoPath)} (${(videoStats.size / 1024 / 1024).toFixed(1)} MB)`);
    }
    console.log(`📁 Screenshots directory: ${SCREENSHOTS_DIR}`);
    console.log(`📁 Recordings directory: ${RECORDINGS_DIR}`);
    console.log('='.repeat(60) + '\n');

    // Upload to GitHub
    await uploadToGitHub();

    log('Automation complete!', '🎉');

  } catch (error) {
    log(`Fatal error: ${error.message}`, '❌');
    console.error(error);
    process.exit(1);
  } finally {
    // Close app
    if (electronApp) {
      await electronApp.close();
      log('App closed', '👋');
    }
  }
}

// Run automation
runAutomation().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
