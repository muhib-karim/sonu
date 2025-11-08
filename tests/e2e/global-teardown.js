/**
 * Global teardown for E2E tests
 * Ensures all Electron instances are properly closed
 */

module.exports = async () => {
  // Give any remaining processes time to clean up
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Force kill any remaining Electron processes (Windows)
  if (process.platform === 'win32') {
    const { exec } = require('child_process');
    return new Promise((resolve) => {
      exec('taskkill /F /IM electron.exe /T 2>nul', () => {
        resolve();
      });
    });
  }
  
  // For other platforms, rely on proper cleanup in test files
};

