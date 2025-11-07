# SONU API Documentation

## Overview

SONU provides a comprehensive API for extending functionality, integrating with other applications, and customizing behavior. The API is divided into several layers: Electron IPC, Python backend, and plugin system.

## Table of Contents

- [Electron IPC API](#electron-ipc-api)
- [Python Backend API](#python-backend-api)
- [Plugin System](#plugin-system)
- [Configuration API](#configuration-api)
- [Event System](#event-system)
- [Extension Points](#extension-points)

## Electron IPC API

### Main Process Handlers

#### Settings Management

```javascript
// Get application settings
const settings = await ipcRenderer.invoke('settings:get');
// Returns: { holdHotkey: string, toggleHotkey: string, ... }

// Set application settings
await ipcRenderer.invoke('settings:set', { holdHotkey: 'Ctrl+Space' });

// Get app-specific settings
const appSettings = await ipcRenderer.invoke('app-settings:get');
// Returns: { theme: string, sound_feedback: boolean, ... }

// Set app-specific settings
await ipcRenderer.invoke('app-settings:set', { theme: 'dark' });
```

#### History Management

```javascript
// Get transcription history
const history = await ipcRenderer.invoke('history:get');
// Returns: [{ text: string, ts: number }, ...]

// Clear history
await ipcRenderer.invoke('history:clear');

// Append to history (internal use)
ipcRenderer.send('history:append', { text: 'New transcription', ts: Date.now() });
```

#### System Information

```javascript
// Get system information
const systemInfo = await ipcRenderer.invoke('system:get-info');
// Returns: { Device: string, OS: string, CPU: string, ... }

// Get system profile with recommendations
const profile = await ipcRenderer.invoke('system:get-profile');
// Returns: { os: string, cpu_cores: number, ram_gb: number, gpu: boolean, recommended: {...} }
```

#### Model Management

```javascript
// Check if model is downloaded
const modelStatus = await ipcRenderer.invoke('model:check', 'base');
// Returns: { exists: boolean, path: string, cache_path: string, size_mb: number }

// Download model
await ipcRenderer.invoke('model:download', 'small');
// Progress events sent via 'model:progress', completion via 'model:complete'

// Get available disk space
const space = await ipcRenderer.invoke('model:get-space');
// Returns: { success: boolean, space_gb: number, path: string }

// Browse for custom download path
const pathResult = await ipcRenderer.invoke('model:browse-path');
// Returns: { success: boolean, path: string }

// Set custom download path
await ipcRenderer.invoke('model:set-path', '/custom/path');

// Get current download path
const currentPath = await ipcRenderer.invoke('model:get-path');
// Returns: { success: boolean, path: string }
```

#### Microphone Management

```javascript
// List available microphones
const microphones = await ipcRenderer.invoke('microphone:list');
// Returns: [{ id: string, name: string, channels: number, sample_rate: number }, ...]
```

#### Theme Management

```javascript
// Get system theme
const systemTheme = await ipcRenderer.invoke('theme:get-system');
// Returns: 'light' | 'dark'

// Set theme source
ipcRenderer.send('theme:set-source', 'system'); // 'system' | 'light' | 'dark'
```

### Renderer Process Events

#### Transcription Events

```javascript
// Listen for transcription completion
ipcRenderer.on('transcription', (event, text) => {
  console.log('Transcribed:', text);
});

// Listen for partial transcription updates
ipcRenderer.on('transcription-partial', (event, partialText) => {
  console.log('Partial:', partialText);
});
```

#### Recording Events

```javascript
// Recording started
ipcRenderer.on('recording-start', () => {
  console.log('Recording started');
});

// Recording stopped
ipcRenderer.on('recording-stop', () => {
  console.log('Recording stopped');
});
```

#### UI State Events

```javascript
// Hotkey registration success
ipcRenderer.on('hotkey-registered', (event, hotkey) => {
  console.log('Hotkey registered:', hotkey);
});

// Hotkey registration failed
ipcRenderer.on('hotkey-error', (event, hotkey) => {
  console.error('Hotkey registration failed:', hotkey);
});

// Show message to user
ipcRenderer.on('show-message', (event, message) => {
  alert(message);
});
```

#### Model Events

```javascript
// Model download progress
ipcRenderer.on('model:progress', (event, progress) => {
  console.log(`${progress.percent}% - ${progress.message}`);
});

// Model download completed
ipcRenderer.on('model:complete', (event, result) => {
  console.log('Model downloaded:', result);
});

// Model download error
ipcRenderer.on('model:error', (event, error) => {
  console.error('Model download failed:', error);
});
```

#### Theme Events

```javascript
// System theme changed
ipcRenderer.on('system-theme-changed', (event, theme) => {
  console.log('System theme:', theme);
});
```

## Python Backend API

### Whisper Service Commands

The Python backend accepts commands via stdin and responds via stdout.

#### Command Protocol

Commands are sent as lines terminated with `\n`. Responses are JSON objects or plain text.

```python
# Start recording
whisper_process.stdin.write('START\n')

# Stop recording
whisper_process.stdin.write('STOP\n')

# Set recording mode
whisper_process.stdin.write('SET_MODE HOLD\n')  # or 'TOGGLE'

# Set hold keys
whisper_process.stdin.write('SET_HOLD_KEYS ctrl+shift+space\n')
```

#### Response Format

```python
# Transcription result
"Transcribed text here\n"

# Partial transcription
"PARTIAL: Partial text here\n"

# Event notification
"EVENT: RELEASE\n"
```

### System Utilities API

```python
from system_utils import get_system_info, get_system_profile, suggest_model

# Get detailed system information
info = get_system_info()
# Returns: {'Device': str, 'OS': str, 'CPU': str, ...}

# Get system profile with recommendations
profile = get_system_profile()
# Returns: {'os': str, 'cpu_cores': int, 'ram_gb': float, 'gpu': bool, 'recommended': {...}}

# Get model suggestion
model = suggest_model()
# Returns: 'tiny' | 'base' | 'small' | 'medium' | 'large'
```

### Model Manager API

```python
from model_manager import download, is_downloaded, get_space

# Download a model
download('small', download_root='/custom/path')

# Check if model exists
exists, info = is_downloaded('small')
# Returns: (bool, {'path': str, 'cache_path': str, 'size_mb': float} or None)

# Get available space
result = get_space()
# Returns: {'success': bool, 'space_gb': float, 'path': str}
```

## Plugin System

### Plugin Architecture

SONU supports plugins for extending functionality. Plugins are Node.js modules that export specific interfaces.

#### Plugin Structure

```javascript
// plugin/my-plugin/index.js
module.exports = {
  name: 'My Plugin',
  version: '1.0.0',
  description: 'Plugin description',

  // Lifecycle hooks
  onLoad: async (api) => {
    // Plugin initialization
  },

  onUnload: async () => {
    // Plugin cleanup
  },

  // Extension points
  hooks: {
    'transcription:complete': (text) => {
      // Process completed transcription
      return modifiedText;
    },

    'recording:start': () => {
      // Handle recording start
    },

    'ui:render': (element) => {
      // Add UI elements
    }
  }
};
```

#### Plugin API

```javascript
// Available in plugin context
const api = {
  // IPC communication
  ipc: {
    send: (channel, data) => ipcRenderer.send(channel, data),
    invoke: (channel, data) => ipcRenderer.invoke(channel, data),
    on: (channel, callback) => ipcRenderer.on(channel, callback)
  },

  // Settings access
  settings: {
    get: () => ipcRenderer.invoke('app-settings:get'),
    set: (settings) => ipcRenderer.invoke('app-settings:set', settings)
  },

  // UI manipulation
  ui: {
    addMenuItem: (menuConfig) => { /* Add to context menu */ },
    addSetting: (settingConfig) => { /* Add to settings page */ },
    showNotification: (message) => { /* Show user notification */ }
  },

  // Transcription control
  transcription: {
    startRecording: () => ipcRenderer.send('toggle-recording'),
    stopRecording: () => ipcRenderer.send('toggle-recording')
  }
};
```

### Plugin Loading

Plugins are loaded from the `plugins/` directory:

```
plugins/
├── my-plugin/
│   ├── index.js
│   ├── package.json
│   └── assets/
└── another-plugin/
    └── index.js
```

## Configuration API

### Settings Schema

```javascript
const settingsSchema = {
  // Keyboard shortcuts
  holdHotkey: 'CommandOrControl+Super+Space',
  toggleHotkey: 'CommandOrControl+Shift+Space',

  // UI preferences
  theme: 'light', // 'light' | 'dark' | 'midnight-purple' | 'solarized' | 'soft-gray'
  follow_system_theme: false,

  // Model configuration
  auto_model: true,
  selected_model: 'base',
  model_download_path: '/default/path',

  // Language settings
  language: 'en',
  dictation_hotkey: 'Ctrl+Space',

  // System integration
  launch_on_startup: false,
  sound_feedback: true,
  waveform_animation: true,

  // Recording modes
  continuous_dictation: false,
  low_latency: false,
  noise_reduction: false,

  // Privacy
  local_only: true,
  auto_delete_cache: false
};
```

### Configuration Files

- `config.json`: Keyboard shortcuts and basic settings
- `data/settings.json`: Application settings and preferences
- `history.json`: Transcription history

## Event System

### Event Types

#### Core Events

- `transcription:start` - Recording started
- `transcription:stop` - Recording stopped
- `transcription:complete` - Transcription finished
- `transcription:partial` - Partial transcription update
- `settings:changed` - Settings modified
- `theme:changed` - Theme switched
- `model:downloaded` - Model download completed

#### UI Events

- `page:changed` - Navigation occurred
- `modal:opened` - Modal dialog opened
- `modal:closed` - Modal dialog closed
- `hotkey:captured` - Hotkey input captured

#### System Events

- `system:info:updated` - System information refreshed
- `microphone:changed` - Active microphone changed
- `disk:space:low` - Low disk space warning

### Event Handling

```javascript
// Listen for events
ipcRenderer.on('transcription:complete', (event, data) => {
  console.log('Transcription completed:', data.text);
});

// Emit custom events
ipcRenderer.send('custom:event', { customData: 'value' });
```

## Extension Points

### UI Extensions

```javascript
// Add custom UI to settings page
api.ui.addSetting({
  category: 'general',
  key: 'custom-setting',
  type: 'toggle',
  label: 'Custom Setting',
  description: 'Description of custom setting'
});
```

### Menu Extensions

```javascript
// Add to context menu
api.ui.addMenuItem({
  label: 'Custom Action',
  click: () => {
    // Handle click
  },
  accelerator: 'Ctrl+Alt+C'
});
```

### Transcription Extensions

```javascript
// Hook into transcription pipeline
hooks['transcription:complete'] = (text) => {
  // Process text (e.g., auto-correct, format, etc.)
  return processedText;
};
```

### Hotkey Extensions

```javascript
// Register custom hotkeys
api.hotkeys.register({
  accelerator: 'Ctrl+Alt+P',
  action: 'custom-action',
  global: true
});
```

## Error Handling

### Error Types

```javascript
const ErrorTypes = {
  NETWORK_ERROR: 'Network connection failed',
  PERMISSION_DENIED: 'Permission denied',
  MODEL_NOT_FOUND: 'Model not available',
  AUDIO_ERROR: 'Audio device error',
  SETTINGS_INVALID: 'Invalid settings',
  PLUGIN_ERROR: 'Plugin execution failed'
};
```

### Error Reporting

```javascript
// Report errors
api.error.report({
  type: ErrorTypes.AUDIO_ERROR,
  message: 'Microphone access denied',
  context: { deviceId: 'mic1' }
});
```

## Migration Guide

### Upgrading from v1.0 to v2.0

1. **Settings Migration**: Old `config.json` is automatically migrated
2. **Plugin Updates**: Update plugin interfaces for new API
3. **Event Handling**: Update event listeners for new event names

### Breaking Changes

- Settings storage moved from localStorage to file-based
- IPC channel names standardized
- Plugin loading mechanism changed

## Examples

### Basic Plugin

```javascript
// plugins/text-formatter/index.js
module.exports = {
  name: 'Text Formatter',
  version: '1.0.0',

  onLoad: async (api) => {
    console.log('Text Formatter plugin loaded');
  },

  hooks: {
    'transcription:complete': (text) => {
      // Capitalize first letter of each sentence
      return text.replace(/(^\w|\.\s+\w)/g, letter => letter.toUpperCase());
    }
  }
};
```

### Custom Settings Integration

```javascript
// Add custom setting
api.ui.addSetting({
  category: 'experimental',
  key: 'auto_save',
  type: 'toggle',
  label: 'Auto-save transcriptions',
  default: false
});

// Use setting in plugin
hooks['transcription:complete'] = async (text) => {
  const settings = await api.settings.get();
  if (settings.auto_save) {
    // Auto-save logic
  }
  return text;
};
```

This API documentation provides the foundation for extending SONU's functionality while maintaining compatibility and stability.