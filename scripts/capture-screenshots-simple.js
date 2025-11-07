/**
 * Simple Screenshot Capture Script for SONU
 * 
 * This script provides a simple way to capture screenshots manually.
 * Run the app normally, then use this script to capture specific views.
 * 
 * Usage: 
 *   1. Run: npm start (in one terminal)
 *   2. Run: node scripts/capture-screenshots-simple.js (in another terminal)
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n📸 SONU Screenshot Capture Helper\n');
console.log('This script will help you capture screenshots of SONU.\n');
console.log('Instructions:');
console.log('1. Make sure SONU is running (npm start)');
console.log('2. Navigate to the feature/page you want to capture');
console.log('3. Press Enter when ready to capture');
console.log('4. The screenshot will be saved automatically\n');

const screenshotTasks = [
  { name: 'main-window', description: 'Main application window (Home page)' },
  { name: 'settings-page', description: 'Settings page' },
  { name: 'model-selector', description: 'Model selector tab' },
  { name: 'dictation-active', description: 'Active dictation with live transcription' },
  { name: 'theme-light', description: 'Light theme' },
  { name: 'theme-dark', description: 'Dark theme' },
  { name: 'tray-menu', description: 'System tray context menu' }
];

let currentIndex = 0;

function captureScreenshot(task) {
  return new Promise((resolve) => {
    console.log(`\n📸 Ready to capture: ${task.description}`);
    console.log(`   File: ${task.name}.png`);
    console.log(`\n👉 Navigate to the feature in SONU, then press Enter to capture...`);
    
    rl.question('', () => {
      // Use Windows Snipping Tool or Print Screen
      console.log(`\n💡 Please use one of these methods:`);
      console.log(`   1. Press Windows + Shift + S (Snipping Tool)`);
      console.log(`   2. Or press Print Screen`);
      console.log(`   3. Save the image as: ${task.name}.png`);
      console.log(`   4. Save it to: ${SCREENSHOTS_DIR}`);
      console.log(`\n👉 Press Enter when you've saved the screenshot...`);
      
      rl.question('', () => {
        const filepath = path.join(SCREENSHOTS_DIR, `${task.name}.png`);
        if (fs.existsSync(filepath)) {
          console.log(`✅ Screenshot saved: ${task.name}.png`);
        } else {
          console.log(`⚠️  Screenshot not found. Please save it manually.`);
        }
        resolve();
      });
    });
  });
}

async function runCapture() {
  console.log(`\n📋 You will capture ${screenshotTasks.length} screenshots:\n`);
  screenshotTasks.forEach((task, index) => {
    console.log(`   ${index + 1}. ${task.description} → ${task.name}.png`);
  });
  
  console.log(`\n👉 Press Enter to start capturing screenshots...`);
  rl.question('', async () => {
    for (let i = 0; i < screenshotTasks.length; i++) {
      await captureScreenshot(screenshotTasks[i]);
    }
    
    console.log(`\n✅ Screenshot capture complete!`);
    console.log(`\n📋 Summary:`);
    console.log(`   Directory: ${SCREENSHOTS_DIR}`);
    console.log(`   Total: ${screenshotTasks.length} screenshots`);
    
    // Check which screenshots were captured
    console.log(`\n📸 Captured screenshots:`);
    screenshotTasks.forEach((task) => {
      const filepath = path.join(SCREENSHOTS_DIR, `${task.name}.png`);
      if (fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath);
        console.log(`   ✅ ${task.name}.png (${(stats.size / 1024).toFixed(1)} KB)`);
      } else {
        console.log(`   ❌ ${task.name}.png (not found)`);
      }
    });
    
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Review the screenshots in: ${SCREENSHOTS_DIR}`);
    console.log(`   2. If satisfied, run: git add screenshots/`);
    console.log(`   3. Then: git commit -m "docs: Add application screenshots"`);
    console.log(`   4. Finally: git push origin main`);
    
    rl.close();
  });
}

runCapture();

