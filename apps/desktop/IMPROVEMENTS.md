# SONU Desktop - Codebase Improvements

This document describes the improvements made to the SONU Desktop (Legacy Electron) codebase during the comprehensive audit and refactor.

## Summary of Changes

### Phase 1: Critical Infrastructure (Completed)

#### 1. Cleaned Up Debug Artifacts
- **Removed** 20+ debug/test files from repository
- **Updated** `.gitignore` to prevent future commits of:
  - Test files (`test_*.js`, `debug_*.js`)
  - Output logs (`*_output*.txt`)
  - Backup files (`*backup*`)
  - Temporary files

#### 2. Created Centralized Configuration Module
**File:** `src/config/constants.js`

Centralizes all hardcoded values:
- Window dimensions and settings
- Default application settings
- Model configurations (Whisper, Faster-Whisper, Parakeet)
- API endpoints
- Timing constants
- Audio settings
- IPC channel names
- Feature flags
- Error codes

**Usage:**
```javascript
const { constants } = require('./src/config');
const { WINDOW_CONFIG, DEFAULT_SETTINGS, MODELS } = constants;
```

#### 3. Implemented Secure API Key Storage
**File:** `src/utils/secureStorage.js`

Uses OS keychain (via `keytar`) to securely store sensitive data:
- Groq API keys
- OpenAI API keys
- Anthropic API keys

**Features:**
- OS keychain integration (Windows Credential Manager, macOS Keychain, Linux Secret Service)
- Encrypted fallback storage with AES-256-GCM
- Automatic migration from plaintext settings

**Usage:**
```javascript
const { secureStorage } = require('./src/utils');

// Initialize
await secureStorage.initialize();

// Store API key
await secureStorage.setPassword('groq_api_key', apiKey);

// Retrieve API key
const apiKey = await secureStorage.getPassword('groq_api_key');

// Migrate existing keys from settings
const migratedSettings = await secureStorage.migratePlaintextKeys(settings);
```

**Installation:**
```bash
cd apps/desktop
npm install keytar
```

#### 4. Created Centralized Logging Module
**File:** `src/utils/logger.js`

Replaces scattered `console.log` statements with structured logging:
- Multiple log levels (ERROR, WARN, INFO, DEBUG, TRACE)
- Log rotation (10MB max, 5 backups)
- Namespaced loggers
- Both console and file output

**Usage:**
```javascript
const { logger } = require('./src/utils');

// Initialize
logger.initialize({ level: 'debug', logToFile: true });

// Basic logging
logger.info('Application started');
logger.error('Something went wrong', { error: err.message });
logger.debug('Debug info', { data: someData });

// Namespaced logger
const appLogger = logger.createLogger('App');
appLogger.info('Module initialized');
```

#### 5. Created Migration Utilities
**File:** `src/utils/migration.js`

Handles automatic migration of:
- API keys from plaintext to secure storage
- Old settings format to new format
- Log files to new location

**Usage:**
```javascript
const { runMigrations } = require('./src/utils/migration');

app.whenReady().then(async () => {
  await runMigrations();
  // Continue with app initialization
});
```

### Phase 2: Architecture Improvements (In Progress)

#### Planned Refactoring

The massive `main.js` (5,883 lines) and `renderer.js` (6,092 lines) will be refactored into modular components:

**Target Structure for main.js:**
```
src/main/
├── index.js              # Entry point
├── window-manager.js     # Window creation/management
├── tray-manager.js       # System tray
├── hotkey-manager.js     # Global shortcuts
├── python-manager.js     # Python process spawning
├── typing-manager.js     # Text injection
├── audio-manager.js      # Audio device management
└── ipc-handlers/         # IPC handlers
    ├── recording.js
    ├── settings.js
    ├── models.js
    └── dictionary.js
```

## Integration Guide

### Step 1: Update imports in main.js

Replace scattered constants and console logs:

```javascript
// Before
const settings = {
  holdHotkey: 'CommandOrControl+Super+Space',
  toggleHotkey: 'CommandOrControl+Shift+Space',
  // ... many more hardcoded values
};

console.log('Starting application...');

// After
const { constants } = require('./src/config');
const { secureStorage, logger } = require('./src/utils');

const settings = { ...constants.DEFAULT_SETTINGS };
const appLogger = logger.createLogger('Main');

appLogger.info('Starting application...');
```

### Step 2: Initialize new modules

```javascript
const { app } = require('electron');
const { logger, secureStorage } = require('./src/utils');
const { runMigrations } = require('./src/utils/migration');

app.whenReady().then(async () => {
  // Initialize logging
  logger.initialize({ level: 'debug', logToFile: true });
  
  // Initialize secure storage
  await secureStorage.initialize();
  
  // Run migrations
  await runMigrations();
  
  // Continue with app initialization
  createWindow();
});
```

### Step 3: Update API key handling

```javascript
// Before (insecure)
const apiKey = settings.groq_api_key;

// After (secure)
const apiKey = await secureStorage.getPassword('groq_api_key');

// When saving API key
await secureStorage.setPassword('groq_api_key', newApiKey);
```

### Step 4: Replace console.log with logger

```javascript
// Before
console.log('Recording started');
console.error('Error:', err);

// After
const recordingLogger = logger.createLogger('Recording');
recordingLogger.info('Recording started');
recordingLogger.error('Recording failed', { error: err.message });
```

## Testing

### Test the new modules:

```bash
cd apps/desktop

# Test logging
node -e "
const logger = require('./src/utils/logger');
logger.initialize({ level: 'debug', logToFile: false });
logger.info('Test message');
logger.error('Test error', { code: 500 });
"

# Test secure storage (requires electron)
npm start
```

## Benefits

### Security
- ✅ API keys no longer stored in plaintext
- ✅ Encrypted fallback for systems without keychain
- ✅ Secure file permissions (0o600)

### Maintainability
- ✅ Single source of truth for constants
- ✅ Centralized configuration
- ✅ Structured logging with rotation
- ✅ No scattered debug files

### Developer Experience
- ✅ Namespaced loggers for easier debugging
- ✅ Automatic migration of legacy data
- ✅ Well-documented modules
- ✅ Clear separation of concerns

### Performance
- ✅ Log rotation prevents disk space issues
- ✅ Efficient secure storage with fallback
- ✅ Reduced clutter from debug files

## Next Steps

1. **Install keytar dependency:**
   ```bash
   cd apps/desktop && npm install
   ```

2. **Integrate new modules into main.js** (see Integration Guide above)

3. **Test thoroughly** to ensure no regressions

4. **Gradually refactor** remaining large files using the new architecture

5. **Update tests** to use the new modules

## Files Created

```
apps/desktop/
├── src/
│   ├── config/
│   │   ├── constants.js      # Centralized configuration
│   │   └── index.js          # Config module exports
│   └── utils/
│       ├── secureStorage.js  # Secure API key storage
│       ├── logger.js         # Centralized logging
│       ├── migration.js      # Migration utilities
│       └── index.js          # Utils module exports
└── .gitignore                # Updated to exclude debug files
```

## Dependencies Added

```json
{
  "dependencies": {
    "keytar": "^7.9.0"
  }
}
```

---

**Note:** This is a living document. As more improvements are made, update this file to reflect the current state.
