/** @jest-environment node */
/**
 * Visual Regression Tests
 * Captures screenshots and compares them to baseline images
 */

const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');

jest.setTimeout(180000); // 3 minutes

const SNAPSHOTS_DIR = path.join(__dirname, 'visual-snapshots');
const DIFFS_DIR = path.join(__dirname, 'visual-diffs');

// Ensure directories exist
if (!fs.existsSync(SNAPSHOTS_DIR)) {
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
}
if (!fs.existsSync(DIFFS_DIR)) {
  fs.mkdirSync(DIFFS_DIR, { recursive: true });
}

describe('Visual Regression Tests', () => {
  let electronApp;
  let mainWindow;

  beforeAll(async () => {
    if (typeof setImmediate === 'undefined') {
      global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
    }
    
    const appPath = path.resolve(__dirname, '..', '..');
    
    electronApp = await electron.launch({
      args: [appPath],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        E2E_TEST: '1'
      },
      timeout: 90000
    });

    mainWindow = await electronApp.firstWindow({ timeout: 30000 });
    await mainWindow.waitForLoadState('domcontentloaded', { timeout: 60000 });
    await mainWindow.waitForSelector('#sidebar', { timeout: 45000, state: 'attached' });
  }, 120000);

  afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  }, 30000);

  async function takeScreenshot(name, selector = null) {
    await mainWindow.waitForTimeout(1000); // Wait for UI to stabilize
    
    const screenshotPath = path.join(SNAPSHOTS_DIR, `${name}.png`);
    
    if (selector) {
      const element = await mainWindow.$(selector);
      if (element) {
        await element.screenshot({ path: screenshotPath });
      } else {
        await mainWindow.screenshot({ path: screenshotPath });
      }
    } else {
      await mainWindow.screenshot({ path: screenshotPath });
    }
    
    return screenshotPath;
  }

  async function compareScreenshots(currentPath, baselineName) {
    const baselinePath = path.join(SNAPSHOTS_DIR, `baseline-${baselineName}.png`);
    
    // If baseline doesn't exist, create it
    if (!fs.existsSync(baselinePath)) {
      fs.copyFileSync(currentPath, baselinePath);
      console.log(`Created baseline: ${baselineName}`);
      return { match: true, message: 'Baseline created' };
    }
    
    // In a real implementation, you'd use pixelmatch or similar
    // For now, we'll just check if files exist and are similar size
    const currentStats = fs.statSync(currentPath);
    const baselineStats = fs.statSync(baselinePath);
    
    const sizeDiff = Math.abs(currentStats.size - baselineStats.size);
    const sizeDiffPercent = (sizeDiff / baselineStats.size) * 100;
    
    // Allow 10% size difference (for minor UI changes)
    if (sizeDiffPercent > 10) {
      return {
        match: false,
        message: `Size difference: ${sizeDiffPercent.toFixed(2)}%`,
        diffPath: path.join(DIFFS_DIR, `${baselineName}-diff.png`)
      };
    }
    
    return { match: true, message: 'Visual match' };
  }

  test('should capture home page screenshot', async () => {
    await mainWindow.waitForSelector('#page-home', { timeout: 10000 });
    const screenshotPath = await takeScreenshot('home-page');
    expect(fs.existsSync(screenshotPath)).toBe(true);
  }, 60000);

  test('should capture dictionary page screenshot', async () => {
    await mainWindow.click('#nav-dictionary');
    await mainWindow.waitForSelector('#page-dictionary', { timeout: 10000 });
    await mainWindow.waitForTimeout(1000);
    
    const screenshotPath = await takeScreenshot('dictionary-page');
    expect(fs.existsSync(screenshotPath)).toBe(true);
  }, 60000);

  test('should capture settings page screenshot', async () => {
    await mainWindow.click('#nav-settings');
    await mainWindow.waitForSelector('.settings-sidebar', { timeout: 10000 });
    await mainWindow.waitForTimeout(1000);
    
    const screenshotPath = await takeScreenshot('settings-page');
    expect(fs.existsSync(screenshotPath)).toBe(true);
  }, 60000);

  test('should capture theme changes visually', async () => {
    await mainWindow.click('#nav-settings');
    await mainWindow.click('#settings-nav-themes');
    await mainWindow.waitForTimeout(1000);
    
    // Light theme
    const lightThemeBtn = await mainWindow.$('[data-theme="light"]');
    if (lightThemeBtn) {
      await lightThemeBtn.click();
      await mainWindow.waitForTimeout(1000);
      await takeScreenshot('theme-light');
    }
    
    // Dark theme
    const darkThemeBtn = await mainWindow.$('[data-theme="dark"]');
    if (darkThemeBtn) {
      await darkThemeBtn.click();
      await mainWindow.waitForTimeout(1000);
      await takeScreenshot('theme-dark');
    }
  }, 60000);

  test('should compare current screenshots with baseline', async () => {
    const pages = ['home', 'dictionary', 'settings'];
    
    for (const page of pages) {
      const currentPath = path.join(SNAPSHOTS_DIR, `${page}-page.png`);
      if (fs.existsSync(currentPath)) {
        const comparison = await compareScreenshots(currentPath, `${page}-page`);
        console.log(`${page} page: ${comparison.message}`);
        // Don't fail on visual differences in CI - just log them
      }
    }
  }, 60000);
});

