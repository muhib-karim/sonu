/**
 * Comprehensive Feature Testing Script
 * Tests all UI tabs, settings, and core functionality
 */

const { _electron: electron } = require('playwright');
const path = require('path');

async function testAllFeatures() {
  console.log('🚀 Starting comprehensive feature testing...\n');
  
  const appPath = path.resolve(__dirname, '..');
  const electronApp = await electron.launch({
    args: [appPath],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      E2E_TEST: '1'
    },
    timeout: 60000
  });

  const mainWindow = await electronApp.firstWindow();
  
  // Wait for app to be ready
  await mainWindow.waitForLoadState('domcontentloaded', { timeout: 30000 });
  await mainWindow.waitForSelector('#sidebar', { timeout: 30000 });
  
  try {
    await mainWindow.waitForSelector('body[data-app-ready="1"]', { timeout: 20000 });
  } catch (e) {
    await mainWindow.waitForFunction(() => {
      return !!(window.voiceApp && window.voiceApp.isAppReady && window.voiceApp.isAppReady());
    }, null, { timeout: 20000 });
  }
  
  await mainWindow.waitForTimeout(1000);
  
  const results = {
    passed: [],
    failed: []
  };
  
  // Helper function to test feature
  async function testFeature(name, testFn) {
    try {
      console.log(`  Testing: ${name}...`);
      await testFn();
      results.passed.push(name);
      console.log(`  ✅ ${name} - PASSED\n`);
      return true;
    } catch (error) {
      results.failed.push({ name, error: error.message });
      console.log(`  ❌ ${name} - FAILED: ${error.message}\n`);
      return false;
    }
  }
  
  // Helper to assert element exists
  function assertElement(element, name) {
    if (!element) {
      throw new Error(`${name} element not found`);
    }
  }
  
  // Helper to navigate using clicks
  async function navigateToPage(page) {
    const selector = `[data-page="${page}"]`;
    await mainWindow.click(selector);
    await mainWindow.waitForSelector(`#page-${page}.active`, { timeout: 5000 });
  }
  
  async function navigateToSettingsPage(page) {
    // First ensure we're on settings page
    await navigateToPage('settings');
    const selector = `[data-settings-page="${page}"]`;
    await mainWindow.click(selector);
    await mainWindow.waitForSelector(`#settings-${page}.active`, { timeout: 5000 });
  }
  
  // Test Navigation Tabs
  console.log('📑 Testing Navigation Tabs...\n');
  
  await testFeature('Home Tab', async () => {
    await navigateToPage('home');
  });
  
  await testFeature('Dictionary Tab', async () => {
    await navigateToPage('dictionary');
  });
  
  await testFeature('Snippets Tab', async () => {
    await navigateToPage('snippets');
  });
  
  await testFeature('Style Tab', async () => {
    await navigateToPage('style');
  });
  
  await testFeature('Notes Tab', async () => {
    await navigateToPage('notes');
  });
  
  await testFeature('Settings Tab', async () => {
    await navigateToPage('settings');
  });
  
  // Test Settings Sub-tabs
  console.log('⚙️ Testing Settings Sub-tabs...\n');
  
  await testFeature('Settings - General', async () => {
    await navigateToSettingsPage('general');
  });
  
  await testFeature('Settings - System', async () => {
    await navigateToSettingsPage('system');
  });
  
  await testFeature('Settings - Model', async () => {
    await navigateToSettingsPage('model');
  });
  
  await testFeature('Settings - Themes', async () => {
    await navigateToSettingsPage('themes');
  });
  
  await testFeature('Settings - Vibe', async () => {
    await navigateToSettingsPage('vibe');
  });
  
  await testFeature('Settings - Experimental', async () => {
    await navigateToSettingsPage('experimental');
  });
  
  // Test Theme Switching
  console.log('🎨 Testing Theme Switching...\n');
  
  await testFeature('Theme Toggle', async () => {
    const themeBtn = await mainWindow.$('#theme-toggle-btn');
    assertElement(themeBtn, 'Theme toggle button');
    
    const initialTheme = await themeBtn.getAttribute('data-theme');
    await themeBtn.click();
    await mainWindow.waitForTimeout(500);
    
    const newTheme = await themeBtn.getAttribute('data-theme');
    if (newTheme === initialTheme) {
      throw new Error('Theme did not change');
    }
    
    // Toggle back
    await themeBtn.click();
    await mainWindow.waitForTimeout(500);
  });
  
  // Test Settings Modal
  console.log('🔧 Testing Settings Modals...\n');
  
  await testFeature('Shortcuts Modal', async () => {
    await navigateToSettingsPage('general');
    
    const shortcutsBtn = await mainWindow.$('#change-shortcuts-btn');
    if (shortcutsBtn) {
      await shortcutsBtn.click();
      await mainWindow.waitForSelector('#shortcuts-modal.active', { timeout: 5000 });
      
      // Close modal
      const closeBtn = await mainWindow.$('.modal-close, [data-modal="shortcuts-modal"]');
      if (closeBtn) {
        await closeBtn.click();
        await mainWindow.waitForSelector('#shortcuts-modal:not(.active)', { timeout: 5000 });
      }
    }
  });
  
  // Test System Information
  console.log('💻 Testing System Information...\n');
  
  await testFeature('System Info Display', async () => {
    await navigateToSettingsPage('system');
    
    // Wait for system info to load
    await mainWindow.waitForSelector('.system-info-container', { timeout: 10000 });
    const infoRows = await mainWindow.$$('.system-info-row');
    if (infoRows.length === 0) {
      throw new Error('No system info rows found');
    }
  });
  
  // Test Model Selector
  console.log('🤖 Testing Model Management...\n');
  
  await testFeature('Model Selector Display', async () => {
    await navigateToSettingsPage('model');
    
    const modelSelect = await mainWindow.$('#model-select');
    assertElement(modelSelect, 'Model selector');
  });
  
  // Test History
  console.log('📜 Testing History Management...\n');
  
  await testFeature('History Display', async () => {
    await navigateToPage('home');
    
    const historyList = await mainWindow.$('#history-list-full');
    assertElement(historyList, 'History list');
  });
  
  // Test Statistics
  console.log('📊 Testing Statistics...\n');
  
  await testFeature('Statistics Display', async () => {
    const statTime = await mainWindow.$('#stat-time');
    const statWords = await mainWindow.$('#stat-words');
    const statWpm = await mainWindow.$('#stat-wpm');
    
    assertElement(statTime, 'Stat time');
    assertElement(statWords, 'Stat words');
    assertElement(statWpm, 'Stat WPM');
  });
  
  // Test Window Controls
  console.log('🪟 Testing Window Controls...\n');
  
  await testFeature('Window Control Buttons', async () => {
    const minimizeBtn = await mainWindow.$('#minimize-btn');
    const maximizeBtn = await mainWindow.$('#maximize-btn');
    const closeBtn = await mainWindow.$('#close-btn');
    
    assertElement(minimizeBtn, 'Minimize button');
    assertElement(maximizeBtn, 'Maximize button');
    assertElement(closeBtn, 'Close button');
  });
  
  // Print Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 FEATURE TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`📊 Total: ${results.passed.length + results.failed.length}`);
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.failed.forEach(({ name, error }) => {
      console.log(`  - ${name}: ${error}`);
    });
  }
  
  console.log('\n✅ Passed Tests:');
  results.passed.forEach(name => {
    console.log(`  - ${name}`);
  });
  
  await electronApp.close();
  
  return results;
}

// Run if called directly
if (require.main === module) {
  testAllFeatures()
    .then(results => {
      process.exit(results.failed.length > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testAllFeatures };

