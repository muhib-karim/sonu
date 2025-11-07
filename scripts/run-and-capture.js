/**
 * Run App and Capture Screenshots
 * 
 * This script runs the SONU app and automatically captures screenshots
 * of different features, tabs, and pages.
 * 
 * Usage: node scripts/run-and-capture.js
 */

// Import the main app
process.env.SCREENSHOT_MODE = 'true';
require('../main.js');

// Wait a bit for app to initialize, then import screenshot module
setTimeout(() => {
  const screenshotModule = require('./screenshot-capture-integrated');
  const { app, BrowserWindow } = require('electron');
  
  // Wait for app to be ready
  app.whenReady().then(async () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const mainWindow = windows[0];
      console.log('App ready, starting screenshot capture...\n');
      
      // Wait for app to fully load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Capture screenshots
      const screenshots = await screenshotModule.captureAllScreenshots(mainWindow);
      
      // Show summary
      console.log(`\n✅ Screenshot capture complete!`);
      console.log(`\n📋 Summary:`);
      console.log(`   Directory: ${require('path').join(__dirname, '..', 'screenshots')}`);
      console.log(`   Total captured: ${screenshots.length}\n`);
      
      console.log(`📸 Captured screenshots:`);
      screenshots.forEach((screenshot, index) => {
        console.log(`   ${index + 1}. ${screenshot.filename} - ${screenshot.description}`);
        console.log(`      Size: ${(screenshot.size / 1024).toFixed(1)} KB`);
      });
      
      console.log(`\n💡 Review the screenshots, then confirm to upload to GitHub.`);
      console.log(`   Screenshots saved in: screenshots/ directory`);
      
      // Keep window open for review
      mainWindow.show();
    }
  });
}, 1000);

