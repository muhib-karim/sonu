/**
 * Migration Utility for SONU Desktop
 * 
 * Helps migrate from old codebase patterns to new modular architecture.
 * Run this once when upgrading to the new version.
 * 
 * Usage: node scripts/migrate.js
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { secureStorage } = require('../src/utils');
const { constants } = require('../src/config');

/**
 * Migrate API keys from plaintext settings to secure storage
 */
async function migrateApiKeys() {
  console.log('[Migration] Checking for API keys to migrate...');
  
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    
    if (!fs.existsSync(settingsPath)) {
      console.log('[Migration] No settings file found');
      return;
    }
    
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const migratedSettings = await secureStorage.migratePlaintextKeys(settings);
    
    // Save migrated settings (without API keys)
    fs.writeFileSync(settingsPath, JSON.stringify(migratedSettings, null, 2));
    
    console.log('[Migration] API keys migrated successfully');
  } catch (e) {
    console.error('[Migration] Failed to migrate API keys:', e);
  }
}

/**
 * Migrate old settings format to new format
 */
async function migrateSettingsFormat() {
  console.log('[Migration] Checking settings format...');
  
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    
    if (!fs.existsSync(settingsPath)) {
      console.log('[Migration] No settings file found');
      return;
    }
    
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const defaultSettings = constants.DEFAULT_SETTINGS;
    
    // Add any missing default settings
    let migrated = false;
    for (const [key, value] of Object.entries(defaultSettings)) {
      if (settings[key] === undefined) {
        settings[key] = value;
        migrated = true;
        console.log(`[Migration] Added missing setting: ${key}`);
      }
    }
    
    if (migrated) {
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      console.log('[Migration] Settings format updated');
    } else {
      console.log('[Migration] Settings format already up to date');
    }
  } catch (e) {
    console.error('[Migration] Failed to migrate settings format:', e);
  }
}

/**
 * Clean up old log files
 */
async function cleanupOldLogs() {
  console.log('[Migration] Cleaning up old log files...');
  
  try {
    const appData = app.getPath('userData');
    const logsDir = path.join(appData, 'logs');
    
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Move old log files to new location
    const oldLogs = [
      path.join(appData, 'app_output.txt'),
      path.join(appData, 'debug.log'),
      path.join(appData, 'error.log')
    ];
    
    for (const oldLog of oldLogs) {
      if (fs.existsSync(oldLog)) {
        const filename = path.basename(oldLog);
        const newPath = path.join(logsDir, `legacy_${filename}`);
        fs.renameSync(oldLog, newPath);
        console.log(`[Migration] Moved ${filename} to logs directory`);
      }
    }
  } catch (e) {
    console.error('[Migration] Failed to clean up logs:', e);
  }
}

/**
 * Run all migrations
 */
async function runMigrations() {
  console.log('=== SONU Desktop Migration Utility ===\n');
  
  // Wait for app to be ready
  if (!app.isReady()) {
    await new Promise(resolve => app.once('ready', resolve));
  }
  
  await secureStorage.initialize();
  
  await migrateApiKeys();
  await migrateSettingsFormat();
  await cleanupOldLogs();
  
  console.log('\n=== Migration Complete ===');
}

// Export for use in main app
module.exports = {
  runMigrations,
  migrateApiKeys,
  migrateSettingsFormat,
  cleanupOldLogs
};

// Run if executed directly
if (require.main === module) {
  runMigrations().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
