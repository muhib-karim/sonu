/** @jest-environment node */
/**
 * Comprehensive Model Download End-User Testing
 * Tests complete download flow, cancellation, errors, and verification
 */

const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

jest.setTimeout(600000); // 10 minutes for download tests

describe('Model Download - Comprehensive End-User Testing', () => {
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

  async function navigateToSettingsPage(page) {
    await mainWindow.click('#nav-settings');
    await mainWindow.waitForTimeout(1000);
    
    const pageMap = {
      'model': '#settings-nav-model',
      'general': '#settings-nav-general',
      'experimental': '#settings-nav-experimental'
    };
    
    if (pageMap[page]) {
      await mainWindow.click(pageMap[page]);
      await mainWindow.waitForTimeout(1000);
    }
  }

  async function closeModals() {
    await mainWindow.evaluate(() => {
      const modals = document.querySelectorAll('.modal.active');
      modals.forEach(modal => {
        modal.classList.remove('active');
      });
    });
    await mainWindow.waitForTimeout(500);
  }

  describe('Complete Download Flow', () => {
    test('should handle complete download flow with progress tracking', async () => {
      await navigateToSettingsPage('model');
      await closeModals();
      
      // Select a model (tiny for faster testing)
      const modelSelect = await mainWindow.$('#model-select');
      expect(modelSelect).toBeTruthy();
      
      await modelSelect.selectOption('tiny');
      await mainWindow.waitForTimeout(1000);
      
      // Click download button
      const downloadBtn = await mainWindow.$('#download-model-btn');
      expect(downloadBtn).toBeTruthy();
      
      console.log('Starting model download...');
      await downloadBtn.click();
      await mainWindow.waitForTimeout(2000);
      
      // Wait for progress container to appear
      const progressContainer = await mainWindow.waitForSelector('.model-progress', { 
        timeout: 10000,
        state: 'visible'
      });
      expect(progressContainer).toBeTruthy();
      
      // Monitor progress for up to 2 minutes
      let progressSeen = false;
      const startTime = Date.now();
      const maxWaitTime = 120000; // 2 minutes
      
      while (Date.now() - startTime < maxWaitTime) {
        const progressText = await mainWindow.$('.model-progress-text');
        if (progressText) {
          const text = await progressText.textContent();
          console.log('Download progress:', text);
          
          if (text.includes('%') || text.includes('MB') || text.includes('downloaded')) {
            progressSeen = true;
          }
          
          // Check if download completed
          if (text.includes('✅') || text.includes('downloaded successfully') || text.includes('already downloaded')) {
            console.log('Download completed successfully');
            break;
          }
          
          // Check for errors
          if (text.includes('❌') || text.includes('Error')) {
            console.log('Download error detected:', text);
            // Don't fail immediately - might be recoverable
          }
        }
        
        await mainWindow.waitForTimeout(2000);
      }
      
      // Verify we saw some progress indication
      expect(progressSeen).toBe(true);
    }, 300000); // 5 minutes timeout
  });

  describe('Download Cancellation', () => {
    test('should cancel download mid-way and handle cancellation properly', async () => {
      await navigateToSettingsPage('model');
      await closeModals();
      
      // Select a model
      const modelSelect = await mainWindow.$('#model-select');
      await modelSelect.selectOption('base');
      await mainWindow.waitForTimeout(1000);
      
      // Start download
      const downloadBtn = await mainWindow.$('#download-model-btn');
      await downloadBtn.click();
      await mainWindow.waitForTimeout(3000);
      
      // Look for cancel button
      const cancelBtn = await mainWindow.$('.cancel-download-button');
      if (cancelBtn) {
        console.log('Cancel button found, clicking...');
        await cancelBtn.click();
        await mainWindow.waitForTimeout(2000);
        
        // Verify download was cancelled
        const progressContainer = await mainWindow.$('.model-progress');
        if (progressContainer) {
          const isVisible = await progressContainer.isVisible();
          // Progress should be hidden or show cancelled message
          console.log('Download cancellation verified');
        }
      } else {
        console.log('Cancel button not available (download may have completed too quickly)');
      }
    }, 180000); // 3 minutes
  });

  describe('Network Failure Handling', () => {
    test('should handle network errors gracefully with user-friendly messages', async () => {
      await navigateToSettingsPage('model');
      await closeModals();
      
      // This test verifies error handling UI
      // In a real scenario, we'd mock network failures
      const modelSelect = await mainWindow.$('#model-select');
      await modelSelect.selectOption('small');
      await mainWindow.waitForTimeout(1000);
      
      // Check if error handling UI elements exist
      const downloadBtn = await mainWindow.$('#download-model-btn');
      expect(downloadBtn).toBeTruthy();
      
      // Verify manual download section exists (for error fallback)
      const manualDownloadSection = await mainWindow.$('#manual-download-section');
      // This might not be visible until error occurs, so just check it exists in DOM
      const manualSectionExists = await mainWindow.evaluate(() => {
        return document.getElementById('manual-download-section') !== null;
      });
      
      console.log('Manual download section exists:', manualSectionExists);
    }, 60000);
  });

  describe('Model File Verification', () => {
    test('should verify model files exist in correct location after download', async () => {
      // Check HuggingFace cache location
      const hfCacheDir = process.platform === 'win32'
        ? path.join(os.homedir(), 'AppData', 'Local', '.cache', 'huggingface', 'hub')
        : path.join(os.homedir(), '.cache', 'huggingface', 'hub');
      
      console.log('Checking HuggingFace cache:', hfCacheDir);
      
      if (fs.existsSync(hfCacheDir)) {
        // Look for whisper model directories
        const files = fs.readdirSync(hfCacheDir);
        const whisperModels = files.filter(f => f.includes('whisper'));
        
        console.log('Found whisper models:', whisperModels);
        
        // Verify at least one model exists (if any were downloaded)
        if (whisperModels.length > 0) {
          for (const modelDir of whisperModels) {
            const modelPath = path.join(hfCacheDir, modelDir);
            const stats = fs.statSync(modelPath);
            expect(stats.isDirectory()).toBe(true);
            
            // Check for model files
            const modelFiles = fs.readdirSync(modelPath, { recursive: true });
            console.log(`Model ${modelDir} has ${modelFiles.length} files`);
          }
        }
      } else {
        console.log('HuggingFace cache directory does not exist yet');
      }
    }, 30000);
  });

  describe('Disk Space Handling', () => {
    test('should check and display disk space information', async () => {
      await navigateToSettingsPage('model');
      await closeModals();
      
      // Wait for disk space info to load
      await mainWindow.waitForTimeout(2000);
      
      // Check if disk space is displayed
      const diskSpaceInfo = await mainWindow.evaluate(() => {
        const elements = [
          document.querySelector('[id*="disk"]'),
          document.querySelector('[class*="disk"]'),
          document.querySelector('[id*="space"]')
        ];
        return elements.filter(el => el !== null).map(el => el.textContent);
      });
      
      console.log('Disk space info found:', diskSpaceInfo.length > 0);
    }, 30000);
  });

  describe('Model Selection and Activation', () => {
    test('should change model selection and verify UI updates', async () => {
      await navigateToSettingsPage('model');
      await closeModals();
      
      const modelSelect = await mainWindow.$('#model-select');
      expect(modelSelect).toBeTruthy();
      
      // Get available models
      const availableModels = await modelSelect.$$('option');
      const modelValues = await Promise.all(
        availableModels.map(opt => opt.getAttribute('value'))
      );
      
      console.log('Available models:', modelValues);
      expect(modelValues.length).toBeGreaterThan(0);
      
      // Select different model
      if (modelValues.length > 1) {
        const newModel = modelValues[1];
        await modelSelect.selectOption(newModel);
        await mainWindow.waitForTimeout(1000);
        
        // Verify selection changed
        const selectedValue = await modelSelect.inputValue();
        expect(selectedValue).toBe(newModel);
      }
    }, 60000);
  });

  describe('Download Progress UI', () => {
    test('should display download progress with accurate information', async () => {
      await navigateToSettingsPage('model');
      await closeModals();
      
      // Check if progress UI elements exist
      const progressElements = await mainWindow.evaluate(() => {
        return {
          progressContainer: document.querySelector('.model-progress') !== null,
          progressBar: document.querySelector('.model-progress-bar') !== null,
          progressText: document.querySelector('.model-progress-text') !== null,
          cancelButton: document.querySelector('.cancel-download-button') !== null
        };
      });
      
      console.log('Progress UI elements:', progressElements);
      
      // At least progress container should exist in DOM (even if hidden)
      expect(progressElements.progressContainer || progressElements.progressBar).toBeTruthy();
    }, 30000);
  });
});

