// Model downloader integration
const { ModelDownloader } = require('./src/model_downloader.js');
const modelDownloader = new ModelDownloader();
// Electron imports - must be first
const { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage, clipboard, screen, shell, nativeTheme, dialog } = require('electron');

// Performance monitoring integration (optional - gracefully handle if not available)
let performanceMonitor = null;
try {
const { PerformanceMonitor } = require('./src/performance_monitor.js');
  performanceMonitor = new PerformanceMonitor();

// Initialize performance monitoring
app.whenReady().then(() => {
    if (performanceMonitor) {
  // Performance monitoring is already initialized in the constructor
  console.log('Performance monitoring ready');
    }
});
} catch (e) {
  console.warn('Performance monitoring not available:', e.message);
}
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const https = require('follow-redirects').https;
const http = require('follow-redirects').http;
const crypto = require('crypto');
const { pipeline } = require('stream/promises');
const os = require('os');

let mainWindow;
let tray;
let whisperProcess;
let whisperStdoutBuffer = ''; // Buffer for incomplete stdout lines
let isRecording = false;
let robot;
let robotType = null; // 'robot-js' or 'robotjs'
let indicatorWindow;
let fadeTimer = null;
let indicatorState = 'hidden';
let typedSoFar = '';
let settings = {
  holdHotkey: 'CommandOrControl+Super+Space',
  toggleHotkey: 'CommandOrControl+Shift+Space'
};
const configPath = path.join(__dirname, 'config.json');
const historyPath = path.join(__dirname, 'history.json');

try {
  robot = require('robot-js');
  robotType = 'robot-js';
  console.log('✓ robot-js loaded successfully');
} catch (e1) {
  try {
    robot = require('robotjs');
    robotType = 'robotjs';
    console.log('✓ robotjs loaded successfully');
  } catch (e2) {
    robot = null;
    robotType = null;
    console.warn('⚠ robot automation library not available; auto-typing disabled.');
    console.warn('Install robotjs: npm install robotjs');
    console.error('robot-js error:', e1.message);
    console.error('robotjs error:', e2.message);
  }
}

// Helper function to find Python executable
function findPythonExecutable() {
  const pythonCommands = ['python3', 'python', 'py'];
  
  // On Windows, try to find Python in common locations
  if (process.platform === 'win32') {
    // Try using 'where' command to find Python
    try {
      for (const cmd of pythonCommands) {
        try {
          const result = execSync(`where ${cmd}`, { encoding: 'utf8', timeout: 2000, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
          if (result && !result.includes('Microsoft Store') && !result.includes('App execution aliases')) {
            // Check if it's a real Python executable
            try {
              const version = execSync(`"${result}" --version`, { encoding: 'utf8', timeout: 2000, stdio: ['pipe', 'pipe', 'pipe'] });
              if (version && version.includes('Python')) {
                console.log(`Found Python at: ${result}`);
                return result;
              }
            } catch (e) {
              // Not a valid Python, continue
            }
          }
        } catch (e) {
          // Command not found, continue
        }
      }
      
      // Try common installation paths
      const commonPaths = [
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python'),
        path.join(process.env.PROGRAMFILES || '', 'Python'),
        path.join(process.env.PROGRAMFILES || '', 'Python3'),
        path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Python'),
        path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Python3'),
        path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'Programs', 'Python'),
      ];
      
      for (const basePath of commonPaths) {
        if (fs.existsSync(basePath)) {
          // Look for python.exe in subdirectories
          try {
            const dirs = fs.readdirSync(basePath);
            for (const dir of dirs) {
              const pythonExe = path.join(basePath, dir, 'python.exe');
              if (fs.existsSync(pythonExe)) {
                try {
                  const version = execSync(`"${pythonExe}" --version`, { encoding: 'utf8', timeout: 2000, stdio: ['pipe', 'pipe', 'pipe'] });
                  if (version && version.includes('Python')) {
                    console.log(`Found Python at: ${pythonExe}`);
                    return pythonExe;
                  }
                } catch (e) {
                  // Not valid, continue
                }
              }
            }
          } catch (e) {
            // Can't read directory, continue
          }
        }
      }
    } catch (e) {
      console.warn('Error finding Python:', e);
    }
  }
  
  // Fallback: try commands in order
  for (const cmd of pythonCommands) {
    try {
      const version = execSync(`${cmd} --version`, { encoding: 'utf8', timeout: 2000, stdio: ['pipe', 'pipe', 'pipe'] });
      if (version && version.includes('Python')) {
        return cmd;
      }
    } catch (e) {
      // Command not found, continue
    }
  }
  
  return null;
}

function createWindow() {
  // Set window icon
  const iconPath = path.join(__dirname, 'assets', 'tray', 'mic-32.png');
  let icon;
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  } else {
    // Fallback to 16x16 if 32x32 doesn't exist
    const fallbackPath = path.join(__dirname, 'assets', 'tray', 'mic-16.png');
    if (fs.existsSync(fallbackPath)) {
      icon = nativeImage.createFromPath(fallbackPath);
    } else {
      // Use base64 fallback
      const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAEUlEQVQ4y2NgGAWDEQwYxAEAAJgABu7xq1EAAAAASUVORK5CYII=';
      icon = nativeImage.createFromDataURL(`data:image/png;base64,${base64Png}`);
    }
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: false,
    skipTaskbar: false,
    resizable: true,
    minWidth: 800,
    minHeight: 600,
    icon: icon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.hide();

  // Add keyboard shortcut for reloading (Ctrl+R or Cmd+R)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.control || input.meta) && input.key.toLowerCase() === 'r') {
      if (!input.shift) {
        event.preventDefault();
        mainWindow.reload();
      }
    }
  });

  createTray();
}

function createIndicatorWindow() {
  // Load saved widget position
  const widgetPosition = loadWidgetPosition();
  
  indicatorWindow = new BrowserWindow({
    width: 150,
    height: 32,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    movable: true,
    x: widgetPosition.x !== null ? widgetPosition.x : undefined,
    y: widgetPosition.y !== null ? widgetPosition.y : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'widget_preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  indicatorWindow.loadFile('widget.html');
  
  // CRITICAL: Allow mouse events so the window can be dragged
  // The CSS -webkit-app-region: drag in widget.html will handle dragging
  // Buttons have -webkit-app-region: no-drag to remain clickable
  indicatorWindow.setIgnoreMouseEvents(false);
  
  // Wait for window to load before setting up drag
  indicatorWindow.webContents.once('did-finish-load', () => {
    // Ensure window is movable and mouse events are enabled
    indicatorWindow.setMovable(true);
    indicatorWindow.setIgnoreMouseEvents(false);
    console.log('Widget window loaded and configured for dragging');
  });
  
  // Save position when window is moved (debounced to avoid too many writes)
  let savePositionTimeout = null;
  indicatorWindow.on('moved', () => {
    if (indicatorWindow && !indicatorWindow.isDestroyed()) {
      // Debounce position saving to avoid too many file writes
      if (savePositionTimeout) {
        clearTimeout(savePositionTimeout);
      }
      savePositionTimeout = setTimeout(() => {
        const bounds = indicatorWindow.getBounds();
        saveWidgetPosition(bounds.x, bounds.y);
        console.log('Widget position saved:', bounds.x, bounds.y);
      }, 500); // Save after 500ms of no movement
    }
  });
  
  // Also save position when window is closed or hidden
  indicatorWindow.on('close', () => {
    if (indicatorWindow && !indicatorWindow.isDestroyed()) {
      const bounds = indicatorWindow.getBounds();
      saveWidgetPosition(bounds.x, bounds.y);
    }
  });
  
  // If no saved position, center it
  if (widgetPosition.x === null || widgetPosition.y === null) {
  positionIndicator();
    // Save the centered position
    setTimeout(() => {
      if (indicatorWindow && !indicatorWindow.isDestroyed()) {
        const bounds = indicatorWindow.getBounds();
        saveWidgetPosition(bounds.x, bounds.y);
      }
    }, 100);
  }
  
  try { indicatorWindow.setOpacity(0); } catch (e) {}
  indicatorWindow.hide();
}

function positionIndicator() {
  try {
    const display = screen.getPrimaryDisplay();
    const { width, height, x, y } = display.workArea;
    const w = 150; const h = 32;
    const cx = x + Math.floor((width - w) / 2);
    const cy = y + Math.floor((height - h) / 2);
    indicatorWindow.setBounds({ x: cx, y: cy, width: w, height: h });
  } catch (e) {}
}

function loadWidgetPosition() {
  try {
    const settingsPath = path.join(__dirname, 'data', 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (settings.widgetPosition && 
          typeof settings.widgetPosition.x === 'number' && 
          typeof settings.widgetPosition.y === 'number' &&
          !isNaN(settings.widgetPosition.x) &&
          !isNaN(settings.widgetPosition.y)) {
        // Validate position is within screen bounds
        const display = screen.getPrimaryDisplay();
        const { width, height, x, y } = display.workArea;
        const widgetWidth = 150;
        const widgetHeight = 32;
        
        // Check if saved position is within screen bounds
        if (settings.widgetPosition.x >= x && 
            settings.widgetPosition.y >= y &&
            settings.widgetPosition.x + widgetWidth <= x + width &&
            settings.widgetPosition.y + widgetHeight <= y + height) {
          return { x: settings.widgetPosition.x, y: settings.widgetPosition.y };
        } else {
          console.log('Saved widget position is out of bounds, will center');
        }
      }
    }
  } catch (e) {
    console.error('Error loading widget position:', e);
  }
  return { x: null, y: null };
}

function saveWidgetPosition(x, y) {
  try {
    const settingsPath = path.join(__dirname, 'data', 'settings.json');
    let settings = {};
    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
    settings.widgetPosition = { x, y };
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (e) {
    console.error('Error saving widget position:', e);
  }
}

function showIndicator() {
  if (!indicatorWindow) return;
  if (indicatorState === 'visible' || indicatorState === 'fading_in') return;
  if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }
  indicatorState = 'visible';
  try { 
    // CRITICAL: Set ignore mouse events to FALSE to allow dragging
    // The CSS -webkit-app-region: drag will handle the dragging
    indicatorWindow.setIgnoreMouseEvents(false);
    
    // Ensure the window is on top and can be moved
    indicatorWindow.setAlwaysOnTop(true);
    indicatorWindow.setMovable(true);
    
    // Show the window
    indicatorWindow.showInactive(); 
    indicatorWindow.setOpacity(1); // Show instantly - no fade
    
    // Force window to be movable and ensure drag works
    // Wait for window to be fully rendered
    setTimeout(() => {
      if (indicatorWindow && !indicatorWindow.isDestroyed()) {
        indicatorWindow.setMovable(true);
        indicatorWindow.setIgnoreMouseEvents(false);
        // Force a repaint to ensure drag region is active
        indicatorWindow.webContents.executeJavaScript(`
          document.body.style.pointerEvents = 'auto';
          document.body.style.cursor = 'default';
        `).catch(() => {});
        console.log('Widget shown and should be draggable');
      }
    }, 50);
  } catch (e) {
    console.error('Error showing indicator:', e);
  }
}

function hideIndicator() {
  if (!indicatorWindow) return;
  if (indicatorState === 'hidden' || indicatorState === 'fading_out') return;
  if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }
  indicatorState = 'hidden';
  try { 
    // CRITICAL: Hide window FIRST for instant visual feedback
    // Position saving can happen asynchronously
    indicatorWindow.hide(); // Hide instantly - no fade
    indicatorWindow.setOpacity(0);
    
    // Save position asynchronously (non-blocking)
    if (indicatorWindow && !indicatorWindow.isDestroyed()) {
      setImmediate(() => {
        try {
          const bounds = indicatorWindow.getBounds();
          saveWidgetPosition(bounds.x, bounds.y);
        } catch (e) {
          // Ignore errors in position saving
        }
      });
    }
  } catch (e) {
    // Ignore errors - just ensure window is hidden
    try {
      if (indicatorWindow && !indicatorWindow.isDestroyed()) {
        indicatorWindow.hide();
      }
    } catch (e2) {
      // Final fallback - ignore all errors
    }
  }
}

function typeStringRobot(text) {
  if (!text || text.trim() === '') {
    return false;
  }
  
  if (!robot || !robot.typeString) {
    // Fallback: copy to clipboard
    try {
      clipboard.writeText(text);
      console.log('Text copied to clipboard (robot not available)');
    } catch (e) {
      console.error('Failed to copy to clipboard:', e);
    }
    return false;
  }
  
  console.log('Starting typing:', text.substring(0, 50) + '...');
  
  // CRITICAL: Hide window FIRST and ensure it loses focus
  // This must happen synchronously before any typing
  if (mainWindow) {
    mainWindow.hide();
    mainWindow.minimize();
    mainWindow.blur();
    // Force window to lose focus
    if (mainWindow.isFocused()) {
      mainWindow.blur();
    }
  }
  
  // Use process.nextTick for fastest execution
  process.nextTick(() => {
    try {
      // Ensure window is completely hidden and unfocused
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        }
        if (!mainWindow.isMinimized()) {
          mainWindow.minimize();
        }
        mainWindow.blur();
      }
      
      // Longer delay to ensure focus has switched (100ms for Windows)
      // This is critical for reliable typing
      setTimeout(() => {
        try {
          console.log('Attempting to type with robotjs...');
          
          // Try typing directly first
          if (robotType === 'robotjs' && robot.typeString) {
            try {
              robot.typeString(text);
              console.log('✓ Typed successfully with robotjs');
              return;
            } catch (e) {
              console.error('robotjs.typeString failed:', e.message);
              // Fall through to clipboard fallback
            }
          } else if (robotType === 'robot-js' && robot.Keyboard && robot.Keyboard.typeString) {
            try {
              robot.Keyboard.typeString(text);
              console.log('✓ Typed successfully with robot-js');
              return;
            } catch (e) {
              console.error('robot-js.Keyboard.typeString failed:', e.message);
              // Fall through to clipboard fallback
            }
          }
          
          // Fallback: clipboard + paste
          console.log('Falling back to clipboard + paste');
          try {
            clipboard.writeText(text);
            console.log('Text copied to clipboard');
            
            // Wait a bit then paste
            setTimeout(() => {
              try {
                if (robot && robot.keyTap) {
                  robot.keyTap('v', 'control');
                  console.log('✓ Pasted using Ctrl+V');
                }
              } catch (pasteErr) {
                console.error('Failed to paste:', pasteErr.message);
              }
            }, 50);
          } catch (clipErr) {
            console.error('Failed to copy to clipboard:', clipErr);
          }
        } catch (e) {
          console.error('Typing error:', e);
          // Final fallback: clipboard
          try {
            clipboard.writeText(text);
            console.log('Text copied to clipboard (final fallback)');
          } catch (clipErr) {
            console.error('Failed to copy to clipboard:', clipErr);
          }
        }
      }, 100); // 100ms delay for reliable focus switching on Windows
    } catch (e) {
      console.error('Setup error:', e);
      // Final fallback: clipboard
      try {
        clipboard.writeText(text);
        console.log('Text copied to clipboard (setup error)');
      } catch (clipErr) {
        console.error('Failed to copy to clipboard:', clipErr);
      }
    }
  });
  
  return true;
}

// Removed typeDelta - we now type the full final text instead of deltas

function getLastTranscript() {
  try {
    if (fs.existsSync(historyPath)) {
      const arr = JSON.parse(fs.readFileSync(historyPath, 'utf8')) || [];
      if (arr.length > 0) {
        return arr[arr.length - 1].text;
      }
    }
  } catch (e) {
    console.error('Failed to get last transcript:', e);
  }
  return null;
}

function pasteLastTranscript() {
  const lastText = getLastTranscript();
  if (lastText) {
    // Hide window first
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.hide();
    }
    // Type the text system-wide
    setTimeout(() => {
      typeStringRobot(lastText);
    }, 100);
  } else {
    // Show notification or message
    if (mainWindow) {
      mainWindow.show();
      mainWindow.webContents.send('show-message', 'No transcript available');
    }
  }
}

function checkForUpdates() {
  // Open update check dialog or website
  shell.openExternal('https://github.com/your-repo/offline-voice-typing/releases');
}

function openHelpCenter() {
  shell.openExternal('https://github.com/your-repo/offline-voice-typing/wiki');
}

function talkToSupport() {
  shell.openExternal('https://github.com/your-repo/offline-voice-typing/issues');
}

function sendGeneralFeedback() {
  shell.openExternal('https://github.com/your-repo/offline-voice-typing/issues/new');
}

function updateTrayMenu() {
  if (!tray) return;
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Home',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Check for updates...',
      click: checkForUpdates
    },
    {
      label: 'Paste last transcript',
      accelerator: 'Alt+Shift+Z',
      click: pasteLastTranscript
    },
    {
      label: 'For the toggle functional...',
      enabled: false // Description item
    },
    { type: 'separator' },
    {
      label: 'Shortcuts',
      submenu: [
        {
          label: 'Hold Hotkey',
          sublabel: settings.holdHotkey || 'Not set',
          click: () => {
            if (mainWindow) {
              mainWindow.show();
              mainWindow.focus();
              // Focus on hold hotkey input
              mainWindow.webContents.send('focus-hold-hotkey');
            }
          }
        },
        {
          label: 'Toggle Hotkey',
          sublabel: settings.toggleHotkey || 'Not set',
          click: () => {
            if (mainWindow) {
              mainWindow.show();
              mainWindow.focus();
              // Focus on toggle hotkey input
              mainWindow.webContents.send('focus-toggle-hotkey');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Paste Last Transcript',
          accelerator: 'Alt+Shift+Z',
          click: pasteLastTranscript
        },
        {
          label: 'Talk to Support',
          accelerator: 'Super+/',
          click: talkToSupport
        },
        {
          label: 'Exit',
          accelerator: 'Super+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Microphone',
      submenu: [
        {
          label: 'Microphone Settings',
          click: () => {
            if (mainWindow) {
              mainWindow.show();
              mainWindow.focus();
            }
          }
        },
        { type: 'separator' },
        {
          label: isRecording ? 'Stop Recording' : 'Start Recording',
          click: () => {
            toggleRecording();
          }
        }
      ]
    },
    {
      label: 'Languages',
      submenu: [
        {
          label: 'English',
          type: 'radio',
          checked: true,
          click: () => {
            // Language selection functionality
            console.log('Language: English selected');
          }
        },
        {
          label: 'Spanish',
          type: 'radio',
          click: () => {
            console.log('Language: Spanish selected');
          }
        },
        {
          label: 'French',
          type: 'radio',
          click: () => {
            console.log('Language: French selected');
          }
        },
        {
          label: 'German',
          type: 'radio',
          click: () => {
            console.log('Language: German selected');
          }
        },
        { type: 'separator' },
        {
          label: 'More languages...',
          click: () => {
            if (mainWindow) {
              mainWindow.show();
              mainWindow.focus();
            }
          }
        }
      ]
    },
    { type: 'separator' },
    {
      label: 'Help Center',
      click: openHelpCenter
    },
    {
      label: 'Talk to support',
      accelerator: 'Super+/',
      click: talkToSupport
    },
    {
      label: 'General feedback',
      click: sendGeneralFeedback
    },
    { type: 'separator' },
    {
      label: 'Exit',
      accelerator: 'Super+Q',
      click: () => app.quit()
    }
  ]);

  tray.setContextMenu(contextMenu);
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray', 'mic-16.png');
  let image;
  if (fs.existsSync(iconPath)) {
    image = nativeImage.createFromPath(iconPath);
  } else {
    // 16x16 transparent PNG fallback (base64)
    const base64Png =
      'iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAEUlEQVQ4y2NgGAWDEQwYxAEAAJgABu7xq1EAAAAASUVORK5CYII=';
    image = nativeImage.createFromDataURL(`data:image/png;base64,${base64Png}`);
  }

  tray = new Tray(image);

  updateTrayMenu();

  tray.setToolTip('Offline Voice Typing');
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

function ensureWhisperService() {
  if (whisperProcess && !whisperProcess.killed) {
    // Service is ready - pre-configure hold keys if needed
    return;
  }

  const pythonScript = path.join(__dirname, 'whisper_service.py');
  const pythonCmd = findPythonExecutable() || 'python';
  whisperProcess = spawn(pythonCmd, [pythonScript], { 
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: process.platform === 'win32'
  });
  
  // Reset buffer when creating new process
  whisperStdoutBuffer = '';
  
  // Pre-configure hold keys immediately when service starts
  setImmediate(() => {
    if (whisperProcess && !whisperProcess.killed) {
      const pyCombo = electronToPythonCombo(settings.holdHotkey);
      writeToWhisper(`SET_HOLD_KEYS ${pyCombo}\n`);
    }
  });
  
  whisperProcess.stdout.on('data', (data) => {
    // Handle data that might come in chunks
    whisperStdoutBuffer += data.toString();
    const lines = whisperStdoutBuffer.split('\n');
    // Keep the last incomplete line in buffer
    whisperStdoutBuffer = lines.pop() || '';
    
    for (const line of lines) {
      const raw = line.trim();
      if (!raw) continue;
      
      // Handle live partial updates (do not copy, do not history)
      if (raw.startsWith('PARTIAL:')) {
        const partial = raw.slice(8).trim();
        try { mainWindow.webContents.send('transcription-partial', partial); } catch (e) {}
        // Don't type partials, only final text
        continue;
      }
      // Immediate release event: hide indicator INSTANTLY - ULTRA FAST
      if (raw.startsWith('EVENT:')) {
        const evt = raw.slice(6).trim().toUpperCase();
        if (evt === 'RELEASE') {
          // CRITICAL: Hide indicator FIRST, before any other operations
          // This must be synchronous and immediate - no async operations
          hideIndicator();
          
          // Reset state immediately
          isRecording = false;
          isHoldKeyPressed = false;
          
          // Clear timeout immediately
          if (holdRecordingTimeout) {
            clearTimeout(holdRecordingTimeout);
            holdRecordingTimeout = null;
          }
          
          // Send UI updates (non-blocking)
          try { 
            mainWindow.webContents.send('recording-stop');
            mainWindow.webContents.send('play-sound', 'stop');
          } catch (e) {}
          
          // Text will come after this event - don't wait for it
        }
        continue;
      }
      // Regular transcription text
      const text = raw;
      if (text) {
        console.log('Received transcription text:', text);
        // Ensure text is available for manual paste as a fallback
        try { clipboard.writeText(text); } catch (e) {}
        appendHistory(text);
        mainWindow.webContents.send('transcription', text);
        // Update UI state after a transcription completes (covers HOLD release)
        try { 
          mainWindow.webContents.send('recording-stop');
          mainWindow.webContents.send('play-sound', 'stop');
        } catch (e) {}
        hideIndicator();
        isRecording = false;
        isHoldKeyPressed = false;
        if (holdRecordingTimeout) {
          clearTimeout(holdRecordingTimeout);
          holdRecordingTimeout = null;
        }
        // Type the text system-wide IMMEDIATELY - ULTRA FAST
        // This happens for both TOGGLE and HOLD modes
        // typeStringRobot handles window hiding internally
        try {
          if (text && text.trim()) {
            // Call typing function immediately - it handles window hiding internally
            typeStringRobot(text);
          }
        } catch (e) {
          console.error('Failed to type text:', e);
          // Fallback: ensure text is in clipboard
          try {
            clipboard.writeText(text);
          } catch (clipErr) {
            console.error('Failed to copy to clipboard:', clipErr);
          }
        }
      }
    }
  });

  whisperProcess.stderr.on('data', (data) => {
    const errorMsg = data.toString();
    console.error(`Whisper Error: ${errorMsg}`);
    // If there's an import error or critical error, log it
    if (errorMsg.includes('import') || errorMsg.includes('ModuleNotFoundError') || errorMsg.includes('ImportError')) {
      console.error('Python dependencies may be missing. Please install: pip install faster-whisper pyaudio keyboard numpy');
    }
  });

  whisperProcess.on('exit', (code) => {
    console.log('Whisper service exited with code', code);
    whisperProcess = null;
    whisperStdoutBuffer = '';
    // If recording was active, stop it and hide indicator
    if (isRecording) {
      isRecording = false;
      isHoldKeyPressed = false;
      if (holdRecordingTimeout) {
        clearTimeout(holdRecordingTimeout);
        holdRecordingTimeout = null;
      }
      try { mainWindow.webContents.send('recording-stop'); } catch (e) {}
      hideIndicator();
    }
  });
}

function writeToWhisper(command) {
  if (!whisperProcess || whisperProcess.killed) {
    console.error('Whisper process not available, ensuring service...');
    ensureWhisperService();
    // Wait a bit for process to start
    setTimeout(() => {
      if (whisperProcess && !whisperProcess.killed) {
        try {
          whisperProcess.stdin.write(command);
          console.log('Sent command to whisper:', command.trim());
        } catch (e) {
          console.error('Failed to write to whisper stdin:', e);
        }
      } else {
        console.error('Whisper process still not available after wait');
      }
    }, 200);
    return;
  }
  try {
    whisperProcess.stdin.write(command);
    console.log('Sent command to whisper:', command.trim());
  } catch (e) {
    console.error('Failed to write to whisper stdin:', e);
    // Restart the service if write fails
    whisperProcess = null;
    ensureWhisperService();
  }
}

function registerHotkeys() {
  globalShortcut.unregisterAll();
  const holdAcc = settings.holdHotkey || 'CommandOrControl+Super+Space';
  const toggleAcc = settings.toggleHotkey || 'CommandOrControl+Shift+Space';

  const regHold = globalShortcut.register(holdAcc, () => {
    if (isRecording || isHoldKeyPressed) return;
    startHoldRecording();
  });
  if (!regHold) {
    if (mainWindow) mainWindow.webContents.send('hotkey-error', holdAcc);
  } else {
    if (mainWindow) mainWindow.webContents.send('hotkey-registered', holdAcc);
  }

  const regToggle = globalShortcut.register(toggleAcc, () => {
    toggleRecording();
  });
  if (!regToggle) {
    if (mainWindow) mainWindow.webContents.send('hotkey-error', toggleAcc);
  } else {
    if (mainWindow) mainWindow.webContents.send('hotkey-registered', toggleAcc);
  }
}

function loadSettings() {
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    // Migrate old config keys if present
    if (parsed.hotkey) {
      const accelerator = normalizeHotkey(parsed.hotkey);
      if ((parsed.mode || 'toggle') === 'hold') {
        settings.holdHotkey = accelerator;
      } else {
        settings.toggleHotkey = accelerator;
      }
    }
    settings = { ...settings, ...parsed };
  } catch (e) {
    // Defaults already set
  }
}

function saveSettings() {
  try {
    fs.writeFileSync(configPath, JSON.stringify(settings, null, 2));
  } catch (e) {
    console.warn('Failed to save settings:', e);
  }
}

function normalizeHotkey(input) {
  // Accept forms like "Ctrl+Win+Space" and convert to Electron accelerator
  if (!input) return 'CommandOrControl+Shift+Space';
  let parts = input.split('+').map(p => p.trim().toLowerCase());
  const mapped = parts.map(p => {
    if (p === 'ctrl' || p === 'control') return 'CommandOrControl';
    if (p === 'win' || p === 'super' || p === 'windows') return 'Super';
    if (p === 'alt' || p === 'option') return 'Alt';
    if (p === 'shift') return 'Shift';
    if (p === 'space') return 'Space';
    return p.charAt(0).toUpperCase() + p.slice(1);
  });
  return mapped.join('+');
}

function electronToPythonCombo(accelerator) {
  // Convert Electron accelerator to keyboard.py combo string
  if (!accelerator) return 'ctrl+shift+space';
  const parts = accelerator.split('+');
  const mapped = parts.map(p => {
    const s = p.toLowerCase();
    if (s.includes('commandorcontrol')) return 'ctrl';
    if (s === 'cmd' || s === 'ctrl') return 'ctrl';
    if (s === 'alt' || s === 'option') return 'alt';
    if (s === 'shift') return 'shift';
    if (s === 'super') return 'win';
    if (s === 'space') return 'space';
    return s; // letters/numbers
  });
  return mapped.join('+');
}

let holdRecordingTimeout = null;
let isHoldKeyPressed = false;

function startHoldRecording() {
  // Prevent multiple calls when key is held down
  if (isHoldKeyPressed || isRecording) {
    return;
  }
  
  isHoldKeyPressed = true;
  isRecording = true;
  typedSoFar = '';
  
  // Hide window FIRST for ultra-fast response
  mainWindow.hide();
  
  // Show indicator INSTANTLY - no delay
  showIndicator();
  
  // Send UI updates
  mainWindow.webContents.send('recording-start');
  
  // Play sound feedback if enabled
  mainWindow.webContents.send('play-sound', 'start');
  
  // Ensure service is ready (should already be pre-initialized)
  ensureWhisperService();
  
  // Fallback: if no release event is received within 30 seconds, stop recording
  if (holdRecordingTimeout) {
    clearTimeout(holdRecordingTimeout);
  }
  holdRecordingTimeout = setTimeout(() => {
    if (isRecording) {
      console.warn('Hold recording timeout - stopping');
      isRecording = false;
      isHoldKeyPressed = false;
      writeToWhisper('STOP\n');
      hideIndicator();
      try { 
        mainWindow.webContents.send('recording-stop');
        mainWindow.webContents.send('play-sound', 'stop');
      } catch (e) {}
    }
    holdRecordingTimeout = null;
  }, 30000);
  
  // Send commands IMMEDIATELY - ULTRA FAST (no delays)
  // Service should already be ready from pre-initialization
  if (whisperProcess && !whisperProcess.killed) {
    writeToWhisper(`SET_MODE HOLD\n`);
    const pyCombo = electronToPythonCombo(settings.holdHotkey);
    writeToWhisper(`SET_HOLD_KEYS ${pyCombo}\n`);
    writeToWhisper('START\n');
  } else {
    // If process not ready, ensure it and send immediately
    ensureWhisperService();
    // Use setImmediate for fastest possible execution
    setImmediate(() => {
      if (whisperProcess && !whisperProcess.killed) {
        writeToWhisper(`SET_MODE HOLD\n`);
        const pyCombo = electronToPythonCombo(settings.holdHotkey);
        writeToWhisper(`SET_HOLD_KEYS ${pyCombo}\n`);
        writeToWhisper('START\n');
      }
    });
  }
}

function startToggleRecording() {
  isRecording = true;
  typedSoFar = '';
  
  // Hide window FIRST for ultra-fast response
  mainWindow.hide();
  
  // Ensure service is ready
  ensureWhisperService();
  
  // Send UI updates
  mainWindow.webContents.send('recording-start');
  mainWindow.webContents.send('play-sound', 'start');
  showIndicator();
  
  // Send commands IMMEDIATELY - ULTRA FAST (no delays)
  if (whisperProcess && !whisperProcess.killed) {
    writeToWhisper(`SET_MODE TOGGLE\n`);
    writeToWhisper('START\n');
  } else {
    // If process not ready, ensure it and send immediately
    ensureWhisperService();
    // Use setImmediate for fastest possible execution
    setImmediate(() => {
      if (whisperProcess && !whisperProcess.killed) {
        writeToWhisper(`SET_MODE TOGGLE\n`);
        writeToWhisper('START\n');
      }
    });
  }
}

function toggleRecording() {
  isRecording = !isRecording;
  ensureWhisperService();
  if (isRecording) {
    startToggleRecording();
  } else {
    mainWindow.webContents.send('recording-stop');
    mainWindow.webContents.send('play-sound', 'stop');
    writeToWhisper('STOP\n');
    hideIndicator();
    // Hide immediately so auto-typing targets the previous app
    mainWindow.hide();
    // Text will be typed when transcription comes back from Python service
  }
  // Update tray menu to reflect recording state
  updateTrayMenu();
}

function appendHistory(text) {
  const entry = { text, ts: Date.now() };
  try {
    let arr = [];
    if (fs.existsSync(historyPath)) {
      arr = JSON.parse(fs.readFileSync(historyPath, 'utf8')) || [];
    }
    arr.push(entry);
    // Keep only last 100 items
    if (arr.length > 100) {
      arr = arr.slice(-100);
    }
    fs.writeFileSync(historyPath, JSON.stringify(arr, null, 2));
    if (mainWindow) mainWindow.webContents.send('history-append', entry);
  } catch (e) {
    console.warn('Failed to write history:', e);
  }
}

  app.whenReady().then(() => {
    loadSettings();
    createWindow();
    createIndicatorWindow();
    registerHotkeys();
    // Pre-initialize whisper service for ultra-fast response
    ensureWhisperService();

    ipcMain.on('toggle-recording', () => toggleRecording());
    
    // Window control handlers
    ipcMain.on('window-minimize', () => {
      if (mainWindow) mainWindow.minimize();
    });
    
    ipcMain.on('window-maximize', () => {
      if (mainWindow) {
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        } else {
          mainWindow.maximize();
        }
      }
    });
    
    ipcMain.on('window-close', () => {
      if (mainWindow) mainWindow.hide();
    });
    
    // Widget button handlers
    ipcMain.on('widget-stop-recording', () => {
      if (isRecording) {
        if (holdRecordingTimeout) {
          clearTimeout(holdRecordingTimeout);
          holdRecordingTimeout = null;
        }
        isRecording = false;
        writeToWhisper('STOP\n');
        hideIndicator();
        try { 
          mainWindow.webContents.send('recording-stop');
          mainWindow.webContents.send('play-sound', 'stop');
        } catch (e) {}
        setTimeout(() => mainWindow.hide(), 150);
      }
    });
    
    ipcMain.on('widget-cancel-recording', () => {
      if (isRecording) {
        if (holdRecordingTimeout) {
          clearTimeout(holdRecordingTimeout);
          holdRecordingTimeout = null;
        }
        isRecording = false;
        writeToWhisper('STOP\n');
        hideIndicator();
        try { 
          mainWindow.webContents.send('recording-stop');
          mainWindow.webContents.send('play-sound', 'stop');
        } catch (e) {}
        setTimeout(() => mainWindow.hide(), 150);
      }
    });

    // Pause global shortcuts while capturing user input for a new hotkey
    ipcMain.on('hotkey-capture-start', () => {
      try { globalShortcut.unregisterAll(); } catch (e) {}
    });
    ipcMain.on('hotkey-capture-end', () => {
      registerHotkeys();
    });

  ipcMain.handle('settings:get', async () => settings);
  ipcMain.handle('settings:set', async (_evt, newSettings) => {
    const incoming = { ...newSettings };
    if (incoming.holdHotkey) incoming.holdHotkey = normalizeHotkey(incoming.holdHotkey);
    if (incoming.toggleHotkey) incoming.toggleHotkey = normalizeHotkey(incoming.toggleHotkey);
    settings = { ...settings, ...incoming };
    saveSettings();
    registerHotkeys();
    ensureWhisperService();
    // Update Python with latest hold combo without changing current mode
    const pyCombo = electronToPythonCombo(settings.holdHotkey);
    writeToWhisper(`SET_HOLD_KEYS ${pyCombo}\n`);
    // Update tray menu when settings change
    updateTrayMenu();
    return settings;
  });
  
  // IPC handlers for tray menu actions
  ipcMain.on('focus-hold-hotkey', () => {
    if (mainWindow) {
      mainWindow.webContents.send('focus-hold-hotkey');
    }
  });
  
  ipcMain.on('focus-toggle-hotkey', () => {
    if (mainWindow) {
      mainWindow.webContents.send('focus-toggle-hotkey');
    }
  });
  
  // Register global shortcuts for tray menu items
  try {
    globalShortcut.register('Alt+Shift+Z', () => {
      pasteLastTranscript();
    });
  } catch (e) {
    console.warn('Failed to register Alt+Shift+Z:', e);
  }
  
  try {
    globalShortcut.register('Super+/', () => {
      talkToSupport();
    });
  } catch (e) {
    console.warn('Failed to register Super+/:', e);
  }
  
  try {
    globalShortcut.register('Super+Q', () => {
      app.quit();
    });
  } catch (e) {
    console.warn('Failed to register Super+Q:', e);
  }

  ipcMain.handle('history:get', async () => {
    try {
      if (!fs.existsSync(historyPath)) return [];
      const arr = JSON.parse(fs.readFileSync(historyPath, 'utf8')) || [];
      return arr;
    } catch (e) {
      return [];
    }
  });
  ipcMain.handle('history:clear', async () => {
    try { fs.writeFileSync(historyPath, JSON.stringify([], null, 2)); } catch (e) {}
    return [];
  });
  
  ipcMain.handle('history:save', async (_evt, items) => {
    try {
      fs.writeFileSync(historyPath, JSON.stringify(items, null, 2));
      return true;
    } catch (e) {
      console.error('Error saving history:', e);
      return false;
    }
  });
  
  ipcMain.handle('history:delete', async (_evt, timestamp) => {
    try {
      let arr = [];
      if (fs.existsSync(historyPath)) {
        arr = JSON.parse(fs.readFileSync(historyPath, 'utf8')) || [];
      }
      arr = arr.filter(item => item.ts !== timestamp);
      fs.writeFileSync(historyPath, JSON.stringify(arr, null, 2));
      return true;
    } catch (e) {
      console.error('Error deleting history item:', e);
      return false;
    }
  });

  // System info handler - with Node.js fallback
  ipcMain.handle('system:get-info', async () => {
    // Helper function to get system info using Node.js
    function getNodeSystemInfo() {
      try {
        const os = require('os');
        const cpus = os.cpus();
        const cpuModel = cpus && cpus.length > 0 ? cpus[0].model : 'Unknown';
        const cpuCount = cpus ? cpus.length : 0;
        
        // Get logical cores (threads) - on Windows, this might be different
        const logicalCores = cpuCount;
        const physicalCores = cpuCount; // Simplified - on Windows this is harder to detect
        
        const info = {
          Device: os.hostname() || 'Unknown',
          OS: `${os.type()} ${os.release()}` || 'Unknown',
          CPU: cpuModel || 'Unknown',
          Cores: physicalCores || 'N/A',
          Threads: logicalCores || 'N/A',
          RAM: `${(os.totalmem() / (1024**3)).toFixed(1)} GB`,
          GPU: 'N/A',
          Arch: os.arch() || 'Unknown',
          'App Version': 'SONU v3.0.0-dev'
        };
        console.log('System info (Node.js):', info);
        return info;
      } catch (e) {
        console.error('Error getting system info:', e);
        return {
          Device: 'Unknown',
          OS: 'Unknown',
          CPU: 'Unknown',
          Cores: 'N/A',
          Threads: 'N/A',
          RAM: 'N/A',
          GPU: 'N/A',
          Arch: 'Unknown',
          'App Version': 'SONU v3.0.0-dev'
        };
      }
    }
    
    // Try Python script first
    try {
      const systemUtilsPath = path.join(__dirname, 'system_utils.py');
      const pythonCommands = ['python3', 'python'];
      
      for (const pythonCmd of pythonCommands) {
        try {
          const pythonProcess = spawn(pythonCmd, [systemUtilsPath, 'info'], { 
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: process.platform === 'win32' // Use shell on Windows
          });
          let output = '';
          let error = '';
          
          pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
          });
          
          pythonProcess.stderr.on('data', (data) => {
            error += data.toString();
          });
          
          const result = await new Promise((resolve) => {
            pythonProcess.on('close', (code) => {
              if (code === 0 && output && output.trim()) {
                try {
                  const info = JSON.parse(output.trim());
                  console.log('System info from Python:', info);
                  resolve({ success: true, info });
                  return;
                } catch (e) {
                  console.error('Failed to parse system info:', e, 'Output:', output);
                  resolve({ success: false });
                }
              } else {
                console.log(`Python command '${pythonCmd}' failed with code ${code}, error: ${error}`);
                resolve({ success: false });
              }
            });
          });
          
          if (result.success) {
            return result.info;
          }
        } catch (e) {
          console.log(`Failed to run '${pythonCmd}':`, e.message);
          continue; // Try next Python command
        }
      }
      
      // If all Python attempts failed, use Node.js fallback
      console.log('All Python attempts failed, using Node.js fallback');
      return getNodeSystemInfo();
    } catch (e) {
      console.error('Error in system info handler:', e);
      return getNodeSystemInfo();
    }
  });

  // System profile handler - returns detailed system info with recommendations
  ipcMain.handle('system:get-profile', async () => {
    try {
      const systemUtilsPath = path.join(__dirname, 'system_utils.py');
      const pythonExecutable = findPythonExecutable();
      
      if (!pythonExecutable) {
        // Fallback to Node.js
        const os = require('os');
        const cpuCount = os.cpus().length;
        const ramGB = Math.round(os.totalmem() / (1024 ** 3));
        const gpu = false; // Can't detect GPU easily in Node.js
        
        let rec = { family: "Whisper (faster-whisper)", model: "base", reason: "Default" };
        if (ramGB < 8 || cpuCount <= 4) {
          rec = { family: "Whisper (faster-whisper)", model: "tiny", reason: "Low RAM or CPU cores" };
        } else if (ramGB < 16) {
          rec = { family: "Whisper (faster-whisper)", model: "small", reason: "Moderate RAM" };
        } else if (ramGB < 32) {
          rec = { family: "Whisper (faster-whisper)", model: "medium", reason: "Good RAM" };
        } else {
          rec = { family: "Whisper (faster-whisper)", model: "large", reason: "High RAM" };
        }
        
        rec.note = "CPU-only mode";
        
        return {
          os: process.platform,
          cpu_cores: cpuCount,
          ram_gb: ramGB,
          gpu: false,
          recommended: rec
        };
      }
      
      const pythonProcess = spawn(pythonExecutable, [systemUtilsPath, 'profile'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: process.platform === 'win32'
      });
      
      let output = '';
      let error = '';
      
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      return new Promise((resolve) => {
        pythonProcess.on('close', (code) => {
          if (code === 0 && output) {
            try {
              const profile = JSON.parse(output.trim());
              resolve(profile);
            } catch (e) {
              console.error('Error parsing system profile:', e);
              // Fallback
              const os = require('os');
              resolve({
                os: process.platform,
                cpu_cores: os.cpus().length,
                ram_gb: Math.round(os.totalmem() / (1024 ** 3)),
                gpu: false,
                recommended: { family: "Whisper (faster-whisper)", model: "base", note: "CPU-only mode" }
              });
            }
          } else {
            console.error('System profile check failed:', error);
            // Fallback
            const os = require('os');
            resolve({
              os: process.platform,
              cpu_cores: os.cpus().length,
              ram_gb: Math.round(os.totalmem() / (1024 ** 3)),
              gpu: false,
              recommended: { family: "Whisper (faster-whisper)", model: "base", note: "CPU-only mode" }
            });
          }
        });
      });
    } catch (e) {
      console.error('Error getting system profile:', e);
      // Fallback
      const os = require('os');
      return {
        os: process.platform,
        cpu_cores: os.cpus().length,
        ram_gb: Math.round(os.totalmem() / (1024 ** 3)),
        gpu: false,
        recommended: { family: "Whisper (faster-whisper)", model: "base", note: "CPU-only mode" }
      };
    }
  });

  // Model suggestion handler - using Node.js model downloader
  ipcMain.handle('model:suggest', async () => {
    try {
      return modelDownloader.getRecommendedModel();
    } catch (error) {
      console.error('Error suggesting model:', error);
      return 'base';
    }
  });

  // Get available disk space - with Node.js fallback
  ipcMain.handle('model:get-space', async () => {
    // First try Python script
    try {
      const modelManagerPath = path.join(__dirname, 'model_manager.py');
      
      // Find Python executable
      const pythonExecutable = findPythonExecutable();
      if (pythonExecutable) {
        try {
          const pythonProcess = spawn(pythonExecutable, [modelManagerPath, 'space'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: process.platform === 'win32'
          });
          
          let output = '';
          let error = '';
          
          pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
          });
          
          pythonProcess.stderr.on('data', (data) => {
            error += data.toString();
            console.log('Python stderr (space):', data.toString());
          });
          
          const result = await new Promise((resolve) => {
            pythonProcess.on('close', (code) => {
              console.log(`Disk space check: code=${code}, output="${output.trim()}"`);
              if (code === 0 && output) {
                try {
                  const trimmed = output.trim();
                  const result = JSON.parse(trimmed);
                  // New format returns {success, space_gb, path}
                  if (result.success) {
                    console.log('Parsed disk space from Python:', result.space_gb, 'GB, path:', result.path);
                    resolve({
                      success: true,
                      space_gb: result.space_gb || 0,
                      path: result.path || ''
                    });
                  } else {
                    resolve({
                      success: false,
                      space_gb: result.space_gb || 0,
                      path: result.path || ''
                    });
                  }
                } catch (e) {
                  console.error('Failed to parse disk space result:', e, 'Raw output:', output);
                  resolve({
                    success: false,
                    space_gb: 0,
                    path: ''
                  });
                }
              } else {
                console.error(`Python disk space check failed, code ${code}, error: ${error}`);
                resolve({
                  success: false,
                  space_gb: 0,
                  path: ''
                });
              }
            });
          });
          
          if (result && result.success) {
            return result;
          }
        } catch (e) {
          console.error(`Failed to run Python for disk space:`, e);
          // Python failed, try Node.js fallback
        }
      } else {
        console.log('Python not found, using Node.js fallback for disk space');
      }
    } catch (e) {
      console.error('Error in Python disk space check:', e);
    }
    
    // Fallback to Node.js method
    try {
      const os = require('os');
      const fs = require('fs');
      const { execSync } = require('child_process');
      
      // Get cache directory path
      const homeDir = os.homedir();
      let cacheDir = path.join(homeDir, '.cache', 'huggingface', 'hub');
      
      if (process.platform === 'win32') {
        const localAppData = process.env.LOCALAPPDATA || '';
        if (localAppData) {
          cacheDir = path.join(localAppData, '.cache', 'huggingface', 'hub');
        }
      }
      
      // Ensure parent directory exists
      const parentDir = path.dirname(cacheDir);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      
      // Get disk space using Node.js
      // Try statfsSync first (Node.js 18.15.0+)
      if (fs.statfsSync) {
        try {
          const stats = fs.statfsSync(cacheDir);
          const freeGB = (stats.bavail * stats.bsize) / (1024 ** 3);
          console.log('Disk space from Node.js statfsSync:', freeGB, 'GB');
          return Math.round(freeGB * 100) / 100;
        } catch (e) {
          console.warn('statfsSync failed:', e);
        }
      }
      
      // Fallback: use system commands
      if (process.platform === 'win32') {
        try {
          // Get drive letter from cache directory
          const driveLetter = cacheDir.split(':')[0];
          
          // Try PowerShell
          try {
            const psCommand = `(Get-PSDrive -Name ${driveLetter}).Free / 1GB`;
            const result = execSync(`powershell -Command "${psCommand}"`, { 
              encoding: 'utf8',
              timeout: 5000,
              stdio: ['pipe', 'pipe', 'pipe']
            });
            const freeGB = parseFloat(result.trim());
            if (!isNaN(freeGB) && freeGB > 0) {
              console.log('Disk space from PowerShell:', freeGB, 'GB');
              return {
                success: true,
                space_gb: Math.round(freeGB * 100) / 100,
                path: cacheDir
              };
            }
          } catch (e) {
            console.warn('PowerShell disk space check failed:', e);
          }
          
          // Try wmic as fallback
          try {
            const wmicCommand = `wmic logicaldisk where "DeviceID='${driveLetter}:'" get FreeSpace /format:value`;
            const result = execSync(wmicCommand, { 
              encoding: 'utf8',
              timeout: 5000,
              stdio: ['pipe', 'pipe', 'pipe']
            });
            const match = result.match(/FreeSpace=(\d+)/);
            if (match) {
              const freeBytes = parseInt(match[1], 10);
              const freeGB = freeBytes / (1024 ** 3);
              console.log('Disk space from wmic:', freeGB, 'GB');
              return {
                success: true,
                space_gb: Math.round(freeGB * 100) / 100,
                path: cacheDir
              };
            }
          } catch (e) {
            console.warn('wmic disk space check failed:', e);
          }
        } catch (e) {
          console.warn('Windows disk space check failed:', e);
        }
      } else {
        // Linux/Mac: use df command
        try {
          const dfCommand = `df -BG "${cacheDir}" | tail -1 | awk '{print $4}' | sed 's/G//'`;
          const result = execSync(dfCommand, { 
            encoding: 'utf8',
            timeout: 5000,
            stdio: ['pipe', 'pipe', 'pipe']
          });
          const freeGB = parseFloat(result.trim());
          if (!isNaN(freeGB) && freeGB > 0) {
            console.log('Disk space from df:', freeGB, 'GB');
            return {
              success: true,
              space_gb: Math.round(freeGB * 100) / 100,
              path: cacheDir
            };
          }
        } catch (e) {
          console.warn('df disk space check failed:', e);
        }
      }
      
      // Final fallback: estimate based on available memory (not ideal, but better than 0)
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const freeGB = freeMem / (1024 ** 3);
      console.log('Disk space estimate from memory (fallback):', freeGB, 'GB');
      return {
        success: true,
        space_gb: Math.round(freeGB * 100) / 100,
        path: cacheDir
      };
    } catch (e) {
      console.error('Error in Node.js disk space fallback:', e);
      // Return a default value
      return {
        success: false,
        space_gb: 10.0,
        path: cacheDir || ''
      };
    }
  });

  // Model download path handlers
  ipcMain.handle('model:browse-path', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Select Model Download Location'
      });
      
      if (!result.canceled && result.filePaths.length > 0) {
        const selectedPath = result.filePaths[0];
        // Save to settings
        const settingsPath = path.join(__dirname, 'data', 'settings.json');
        let settings = {};
        if (fs.existsSync(settingsPath)) {
          try {
            settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
          } catch (e) {
            console.error('Error reading settings:', e);
          }
        }
        settings.model_download_path = selectedPath;
        fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        return { success: true, path: selectedPath };
      }
      return { success: false, path: null };
    } catch (e) {
      console.error('Error browsing model path:', e);
      return { success: false, path: null, error: e.message };
    }
  });
  
  ipcMain.handle('model:get-path', async () => {
    try {
      const settingsPath = path.join(__dirname, 'data', 'settings.json');
      if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        if (settings.model_download_path) {
          return { success: true, path: settings.model_download_path };
        }
      }
      // Return default path
      const os = require('os');
      const homeDir = os.homedir();
      let defaultPath = path.join(homeDir, '.cache', 'huggingface', 'hub');
      if (process.platform === 'win32') {
        const localAppData = process.env.LOCALAPPDATA || '';
        if (localAppData) {
          defaultPath = path.join(localAppData, '.cache', 'huggingface', 'hub');
        }
      }
      return { success: true, path: defaultPath };
    } catch (e) {
      console.error('Error getting model path:', e);
      return { success: false, path: null, error: e.message };
    }
  });
  
  ipcMain.handle('model:set-path', async (_evt, downloadPath) => {
    try {
      const settingsPath = path.join(__dirname, 'data', 'settings.json');
      let settings = {};
      if (fs.existsSync(settingsPath)) {
        try {
          settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        } catch (e) {
          console.error('Error reading settings:', e);
        }
      }
      settings.model_download_path = downloadPath;
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      return { success: true };
    } catch (e) {
      console.error('Error setting model path:', e);
      return { success: false, error: e.message };
    }
  });

  // Model definitions based on whisper.cpp official models (GGUF format)
  // Source: https://huggingface.co/ggerganov/whisper.cpp
  // Updated to use GGUF format (ggml-*-q5_0.gguf) for better performance
  const MODEL_DEFINITIONS = {
    tiny: { 
      filename: 'ggml-tiny-q5_0.gguf', 
      size_mb: 75,
      sha: null, // SHA will be verified from manifest if available
      description: 'Fastest, lowest accuracy - best for real-time dictation',
      recommended_for: '≤4 cores / <8 GB RAM'
    },
    base: { 
      filename: 'ggml-base-q5_0.gguf', 
      size_mb: 145,
      sha: null,
      description: 'Balanced speed & accuracy - recommended for most users',
      recommended_for: '4–8 cores / 8–16 GB RAM'
    },
    small: { 
      filename: 'ggml-small-q5_0.gguf', 
      size_mb: 480,
      sha: null,
      description: 'Slower but more accurate - good for high-quality transcription',
      recommended_for: '8–12 cores / ≥16 GB RAM'
    },
    medium: { 
      filename: 'ggml-medium-q5_0.gguf', 
      size_mb: 1536, // 1.5 GB
      sha: null,
      description: 'Best accuracy for CPU use - requires powerful system',
      recommended_for: '>12 cores / ≥32 GB RAM'
    }
  };

  // Get recommended model based on system specs
  function getRecommendedModel() {
    const cpuCount = os.cpus().length;
    const totalMemoryGB = os.totalmem() / (1024 * 1024 * 1024);
    
    if (cpuCount <= 4 && totalMemoryGB < 8) {
      return 'tiny';
    } else if (cpuCount <= 8 && totalMemoryGB < 16) {
      return 'base';
    } else if (cpuCount <= 12 && totalMemoryGB >= 16) {
      return 'small';
    } else {
      return 'medium';
    }
  }

  // Get default models directory
  function getDefaultModelsDir() {
    const platform = os.platform();
    if (platform === 'win32') {
      return path.join(os.homedir(), 'AppData', 'Roaming', 'Sonu', 'models');
    } else if (platform === 'darwin') {
      return path.join(os.homedir(), 'Library', 'Application Support', 'Sonu', 'models');
    } else {
      return path.join(os.homedir(), '.local', 'share', 'Sonu', 'models');
    }
  }

  // Check if path is under OneDrive/Desktop
  function isProblematicPath(dirPath) {
    const lowerPath = dirPath.toLowerCase();
    return lowerPath.includes('onedrive') || lowerPath.includes('desktop');
  }

  // Get latest GitHub release tag
  async function getLatestGitHubTag() {
    // Use latest stable release: v1.8.2 (as of Oct 2025)
    // In production, you could fetch from GitHub API: https://api.github.com/repos/ggml-org/whisper.cpp/releases/latest
    try {
      // Try to fetch latest tag from GitHub API
      const https = require('https');
      return new Promise((resolve) => {
        const req = https.get('https://api.github.com/repos/ggml-org/whisper.cpp/releases/latest', {
          headers: { 'User-Agent': 'Sonu/1.0' }
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              const release = JSON.parse(data);
              if (release.tag_name) {
                resolve(release.tag_name);
                return;
              }
            } catch (e) {
              // Fall through to default
            }
            resolve('v1.8.2'); // Fallback to known stable release
          });
        });
        req.on('error', () => {
          resolve('v1.8.2'); // Fallback to known stable release
        });
        req.setTimeout(5000, () => {
          req.destroy();
          resolve('v1.8.2'); // Fallback to known stable release
        });
      });
    } catch (e) {
      return 'v1.8.2'; // Fallback to known stable release
    }
  }

  // Get model download sources based on whisper.cpp official sources
  // Based on: https://huggingface.co/ggerganov/whisper.cpp
  // Multiple sources for reliability - offline-first approach
  async function getModelSources(modelName) {
    const filename = MODEL_DEFINITIONS[modelName]?.filename;
    if (!filename) {
      throw new Error(`Unknown model: ${modelName}`);
    }

    // Primary mirror: Hugging Face (official whisper.cpp repository)
    // GGUF models are in the root directory
    // Use resolve endpoint for direct file download
    const huggingFaceUrl1 = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${filename}`;
    
    // Fallback 1: Hugging Face with download parameter
    const huggingFaceUrl2 = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${filename}?download=true`;
    
    // Fallback 2: Alternative Hugging Face path (models directory)
    const huggingFaceUrl3 = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/models/${filename}`;
    
    // Fallback 3: GitHub releases (if available)
    const tag = await getLatestGitHubTag();
    const githubUrl = `https://github.com/ggerganov/whisper.cpp/releases/download/${tag}/${filename}`;
    
    // Fallback 4: GitHub raw content (alternative)
    const githubRawUrl = `https://raw.githubusercontent.com/ggerganov/whisper.cpp/master/${filename}`;
    
    return [
      huggingFaceUrl1,  // Primary: Hugging Face root (most reliable)
      huggingFaceUrl2,  // Fallback 1: Hugging Face with ?download=true
      huggingFaceUrl3,  // Fallback 2: Hugging Face models/ directory
      githubUrl,        // Fallback 3: GitHub releases
      githubRawUrl      // Fallback 4: GitHub raw content
    ];
  }

  // Get manual download URLs for display in UI
  function getManualDownloadUrls() {
    const urls = {};
    for (const [modelName, modelDef] of Object.entries(MODEL_DEFINITIONS)) {
      urls[modelName] = {
        name: modelName,
        filename: modelDef.filename,
        size_mb: modelDef.size_mb,
        description: modelDef.description,
        recommended_for: modelDef.recommended_for,
        url: `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${modelDef.filename}?download=true`
      };
    }
    return urls;
  }

  // Create keep-alive agent
  const keepAliveAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 6
  });

  // Download model with resume support and 8MB chunking
  // Implements HTTP range requests for resumable downloads
  async function downloadModelFromSource(url, targetPath, onProgress, sourceName = '') {
    const partPath = `${targetPath}.part`;
    let startByte = 0;

    // Check for existing partial download
    if (fs.existsSync(partPath)) {
      const stats = fs.statSync(partPath);
      startByte = stats.size;
    }

    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          'User-Agent': 'Sonu/1.0',
          'Accept': 'application/octet-stream'
        },
        agent: keepAliveAgent,
        maxRedirects: 5
      };

      if (startByte > 0) {
        options.headers['Range'] = `bytes=${startByte}-`;
      }

      const request = https.get(url, options, async (response) => {
        // Handle redirects (follow up to 5 redirects)
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          const redirectUrl = response.headers.location;
          // Handle relative redirects
          const fullRedirectUrl = redirectUrl.startsWith('http') 
            ? redirectUrl 
            : new URL(redirectUrl, url).href;
          return downloadModelFromSource(fullRedirectUrl, targetPath, onProgress, sourceName)
            .then(resolve)
            .catch(reject);
        }

        // Handle errors
        if (response.statusCode !== 200 && response.statusCode !== 206) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        const contentLength = parseInt(response.headers['content-length'] || '0', 10);
        const totalSize = startByte > 0 && response.statusCode === 206 
          ? startByte + contentLength 
          : contentLength;

        let downloadedBytes = startByte;
        let lastProgressTime = Date.now();
        let lastProgressBytes = startByte;
        const startTime = Date.now();

        const writeStream = fs.createWriteStream(partPath, { flags: startByte > 0 ? 'a' : 'w' });

        // Use 8MB chunks for better reliability
        const CHUNK_SIZE = 8 * 1024 * 1024; // 8 MB
        let chunkBuffer = Buffer.alloc(0);

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          const now = Date.now();
          
          // Buffer chunks for efficient writing
          chunkBuffer = Buffer.concat([chunkBuffer, chunk]);
          
          // Write in 8MB chunks for better reliability
          if (chunkBuffer.length >= CHUNK_SIZE) {
            const toWrite = chunkBuffer.slice(0, CHUNK_SIZE);
            chunkBuffer = chunkBuffer.slice(CHUNK_SIZE);
            writeStream.write(toWrite);
          }
          
          // Calculate speed
          const timeDiff = (now - lastProgressTime) / 1000;
          if (timeDiff >= 0.5) { // Update every 500ms
            const bytesDiff = downloadedBytes - lastProgressBytes;
            const speedKB = bytesDiff / timeDiff / 1024;
            
            const percent = totalSize > 0 ? Math.round((downloadedBytes / totalSize) * 100) : 0;
            const elapsed = (now - startTime) / 1000;
            const remaining = speedKB > 0 && totalSize > 0 
              ? ((totalSize - downloadedBytes) / 1024) / speedKB 
              : 0;
            
            if (onProgress) {
              onProgress({
                percent,
                bytesDownloaded: downloadedBytes,
                bytesTotal: totalSize,
                speedKB: Math.round(speedKB * 10) / 10,
                message: sourceName ? `Downloading from ${sourceName}... ${percent}%` : `Downloading... ${percent}%`,
                elapsed: Math.round(elapsed),
                remaining: Math.round(remaining)
              });
            }
            
            lastProgressTime = now;
            lastProgressBytes = downloadedBytes;
          }
        });

        response.on('end', async () => {
          try {
            // Write any remaining buffered data
            if (chunkBuffer.length > 0) {
              writeStream.write(chunkBuffer);
              chunkBuffer = Buffer.alloc(0);
            }
            
            // Ensure all data is written and synced
            await new Promise((resolve, reject) => {
              writeStream.end(() => {
                // Get file descriptor and sync to disk
                const fd = writeStream.fd;
                if (fd && typeof fd === 'number') {
                  try {
                    fs.fsyncSync(fd);
                    resolve();
                  } catch (err) {
                    // If fsync fails, still resolve (data is written, just not synced)
                    try {
                      console.warn('Failed to sync file to disk:', err);
                    } catch (e) {
                      // Ignore EPIPE errors when writing to console
                    }
                    resolve();
                  }
                } else {
                  // If no file descriptor, just resolve (data is written)
                  resolve();
                }
              });
            });

            // Final progress update
            if (onProgress) {
              onProgress({
                percent: 100,
                bytesDownloaded: downloadedBytes,
                bytesTotal: totalSize,
                speedKB: 0
              });
            }

            // Verify file size (basic integrity check)
            const finalStats = await fs.promises.stat(partPath);
            const modelName = Object.keys(MODEL_DEFINITIONS).find(k => 
              MODEL_DEFINITIONS[k].filename === path.basename(targetPath)
            );
            const expectedSize = modelName ? MODEL_DEFINITIONS[modelName].size_mb * 1024 * 1024 : null;
            
            // Accept if size is within 2% of expected (allows for minor variations)
            if (expectedSize && finalStats.size < expectedSize * 0.98) {
              reject(new Error(`Downloaded file size (${(finalStats.size / 1024 / 1024).toFixed(2)} MB) is less than expected (${(expectedSize / 1024 / 1024).toFixed(2)} MB)`));
              return;
            }

            // Rename part file to final
            await fs.promises.rename(partPath, targetPath);
            resolve();
          } catch (error) {
            reject(error);
          }
        });

        response.on('error', reject);
        
        try {
          await pipeline(response, writeStream);
        } catch (error) {
          writeStream.destroy();
          reject(error);
        }
      });

      request.on('error', reject);
      request.setTimeout(300000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  // Get manual download URLs handler
  ipcMain.handle('model:get-manual-urls', async () => {
    try {
      return { success: true, urls: getManualDownloadUrls() };
    } catch (e) {
      try {
        console.error('Error getting manual URLs:', e);
      } catch (e2) {}
      return { success: false, error: e.message };
    }
  });

  // Get recommended model handler
  ipcMain.handle('model:get-recommended', async () => {
    try {
      const recommended = getRecommendedModel();
      const modelDef = MODEL_DEFINITIONS[recommended];
      return {
        success: true,
        model: recommended,
        description: modelDef.description,
        recommended_for: modelDef.recommended_for,
        size_mb: modelDef.size_mb
      };
    } catch (e) {
      try {
        console.error('Error getting recommended model:', e);
      } catch (e2) {}
      return { success: false, error: e.message };
    }
  });

  // Model download handler - Uses Python OfflineModelDownloader for robust downloads
  ipcMain.handle('model:download', async (_evt, modelName) => {
    try {
      console.log('Model download requested:', modelName);
    } catch (e) {
      // Ignore EPIPE errors when writing to console
    }
    
    try {
      // Get model definition
      const modelDef = MODEL_DEFINITIONS[modelName];
      if (!modelDef) {
        const errorResult = {
          success: false,
          model: modelName,
          error: 'Unknown model',
          message: `Unknown model: ${modelName}. Available models: ${Object.keys(MODEL_DEFINITIONS).join(', ')}`
        };
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('model:error', errorResult);
        }
        return errorResult;
      }

      // Get download path
      let downloadPath = null;
      try {
        const settingsPath = path.join(__dirname, 'data', 'settings.json');
        if (fs.existsSync(settingsPath)) {
          const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
          if (settings.model_download_path) {
            downloadPath = settings.model_download_path;
          }
        }
      } catch (e) {
        console.warn('Error reading download path from settings:', e);
      }

      // Use default path if not set
      if (!downloadPath) {
        downloadPath = getDefaultModelsDir();
      }

      // Check if path is problematic
      if (isProblematicPath(downloadPath)) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('model:error', {
            success: false,
            model: modelName,
            error: 'Problematic path',
            message: 'The selected path is under OneDrive or Desktop. Please choose a different location for better reliability.'
          });
        }
      }

      // Ensure directory exists
      if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath, { recursive: true });
      }

      // Check if model already exists
      const targetPath = path.join(downloadPath, modelDef.filename);
      if (fs.existsSync(targetPath)) {
        const stats = fs.statSync(targetPath);
        const sizeMB = stats.size / (1024 * 1024);
        
        // Verify size (within 2% tolerance)
        if (sizeMB >= modelDef.size_mb * 0.98) {
          const cachedResult = {
            success: true,
            model: modelName,
            path: targetPath,
            cache_path: downloadPath,
            size_mb: modelDef.size_mb,
            status: 'cached',
            cached: true
          };
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('model:complete', cachedResult);
          }
          return cachedResult;
        } else {
          // File exists but is incomplete, delete it
          console.log('Incomplete model file found, removing...');
          fs.unlinkSync(targetPath);
        }
      }

      // Try Python downloader first (more robust)
      const pythonCmd = findPythonExecutable();
      const downloaderScript = path.join(__dirname, 'offline_model_downloader.py');
      
      if (pythonCmd && fs.existsSync(downloaderScript)) {
        try {
          return await new Promise((resolve, reject) => {
            const pythonProcess = spawn(pythonCmd, [downloaderScript, 'download', modelName, downloadPath], {
              cwd: __dirname,
              stdio: ['pipe', 'pipe', 'pipe'],
              shell: process.platform === 'win32'
            });
            
            let stdout = '';
            let stderr = '';
            
            pythonProcess.stdout.on('data', (data) => {
              stdout += data.toString();
              const lines = stdout.split('\n');
              stdout = lines.pop() || ''; // Keep incomplete line
              
              for (const line of lines) {
                if (line.trim()) {
                  try {
                    const jsonData = JSON.parse(line);
                    if (jsonData.type === 'progress') {
                      // Send progress update
                      if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('model:progress', {
                          percent: jsonData.percent || 0,
                          bytesDownloaded: jsonData.bytesDownloaded || 0,
                          bytesTotal: jsonData.bytesTotal || 0,
                          speedKB: jsonData.speedKB || 0,
                          message: jsonData.message || `Downloading ${modelName}... ${jsonData.percent || 0}%`,
                          elapsed: jsonData.elapsed || 0,
                          remaining: jsonData.remaining || 0
                        });
                      }
                    } else if (jsonData.type === 'result') {
                      // Download complete
                      if (jsonData.success) {
                        if (mainWindow && !mainWindow.isDestroyed()) {
                          mainWindow.webContents.send('model:complete', {
                            success: true,
                            model: modelName,
                            path: jsonData.path,
                            cache_path: downloadPath,
                            size_mb: jsonData.size_mb,
                            status: jsonData.status || 'downloaded',
                            cached: jsonData.cached || false
                          });
                        }
                        resolve({
                          success: true,
                          model: modelName,
                          path: jsonData.path,
                          cache_path: downloadPath,
                          size_mb: jsonData.size_mb,
                          status: jsonData.status || 'downloaded',
                          cached: jsonData.cached || false
                        });
                      } else {
                        // Python downloader failed, fall back to Node.js
                        reject(new Error(jsonData.error || 'Python downloader failed'));
                      }
                    }
                  } catch (e) {
                    // Not JSON, ignore
                  }
                }
              }
            });
            
            pythonProcess.stderr.on('data', (data) => {
              stderr += data.toString();
            });
            
            pythonProcess.on('close', (code) => {
              if (code !== 0) {
                // Python downloader failed, fall back to Node.js
                reject(new Error(`Python downloader exited with code ${code}`));
              }
            });
            
            pythonProcess.on('error', (error) => {
              // Python not available or script error, fall back to Node.js
              reject(error);
            });
          }).catch(async (error) => {
            // Fall back to Node.js downloader
            console.log('Python downloader failed, falling back to Node.js:', error.message);
            return await downloadModelWithNodeJS(modelName, modelDef, downloadPath, targetPath);
          });
        } catch (error) {
          // Fall back to Node.js downloader
          console.log('Python downloader error, falling back to Node.js:', error.message);
          return await downloadModelWithNodeJS(modelName, modelDef, downloadPath, targetPath);
        }
      } else {
        // Python not available, use Node.js downloader
        return await downloadModelWithNodeJS(modelName, modelDef, downloadPath, targetPath);
      }
    } catch (e) {
      console.error('Error in model download handler:', e);
      const errorResult = {
        success: false,
        model: modelName,
        error: e.message,
        message: `Error downloading model: ${e.message}`
      };
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('model:error', errorResult);
      }
      return errorResult;
    }
  });
  
  // Helper function for Node.js fallback downloader
  async function downloadModelWithNodeJS(modelName, modelDef, downloadPath, targetPath) {
    // Get download sources
    const sources = await getModelSources(modelName);
    
    // Progress callback
    const onProgress = (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('model:progress', {
          percent: progress.percent,
          bytesDownloaded: progress.bytesDownloaded,
          bytesTotal: progress.bytesTotal,
          speedKB: progress.speedKB,
          message: `Downloading ${modelName}... ${progress.percent}%`
        });
      }
    };

    // Try each source with retries
    let lastError = null;
    let sourceIndex = 0;
    for (const sourceUrl of sources) {
      sourceIndex++;
      const sourceName = new URL(sourceUrl).hostname;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          try {
            console.log(`Attempting to download from ${sourceName} (source ${sourceIndex}/${sources.length}, attempt ${attempt}/3)`);
          } catch (e) {
            // Ignore EPIPE errors
          }
          
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('model:progress', {
              percent: 0,
              bytesDownloaded: 0,
              bytesTotal: 0,
              speedKB: 0,
              message: `Connecting to ${sourceName}... (source ${sourceIndex}/${sources.length})`
            });
          }

          await downloadModelFromSource(sourceUrl, targetPath, onProgress, sourceName);

          // Download successful - verify file exists
          if (fs.existsSync(targetPath)) {
            const stats = fs.statSync(targetPath);
            if (stats.size > 0) {
              const successResult = {
                success: true,
                model: modelName,
                path: targetPath,
                cache_path: downloadPath,
                size_mb: modelDef.size_mb,
                status: 'downloaded',
                cached: false
              };
              
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('model:complete', successResult);
              }
              
              return successResult;
            }
          }
          
          // If we get here, download didn't complete properly
          throw new Error('Download completed but file verification failed');
        } catch (error) {
          lastError = error;
          try {
            console.error(`Download from ${sourceName} (attempt ${attempt}/3) failed:`, error.message);
          } catch (e) {
            // Ignore EPIPE errors when writing to console
          }
          
          // Update progress with error message
          if (mainWindow && !mainWindow.isDestroyed() && attempt === 3) {
            mainWindow.webContents.send('model:progress', {
              percent: 0,
              bytesDownloaded: 0,
              bytesTotal: 0,
              speedKB: 0,
              message: `Failed to download from ${sourceName}. Trying next source...`
            });
          }
          
          // Wait before retry (exponential backoff: 1s, 3s, 7s)
          if (attempt < 3) {
            const backoffDelay = Math.pow(2, attempt) - 1; // 1s, 3s, 7s
            await new Promise(resolve => setTimeout(resolve, backoffDelay * 1000));
          }
        }
      }
    }

    // All sources failed
    const errorResult = {
      success: false,
      model: modelName,
      error: lastError ? lastError.message : 'Download failed',
      message: `Failed to download model from all sources. Last error: ${lastError ? lastError.message : 'Unknown error'}. Please try manual download.`
    };
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('model:error', errorResult);
    }
    
    return errorResult;
  }
  
  // Model check handler - using Node.js model downloader
  ipcMain.handle('model:check', async (_evt, modelName) => {
    try {
      // Get custom download path from settings
      let customPath = null;
      try {
        const settingsPath = path.join(__dirname, 'data', 'settings.json');
        if (fs.existsSync(settingsPath)) {
          const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
          if (settings.model_download_path) {
            customPath = settings.model_download_path;
          }
        }
      } catch (e) {
        console.warn('Error reading download path from settings:', e);
      }
      
      const downloadPath = await modelDownloader.getDownloadPath(customPath);
      const exists = await modelDownloader.checkModelExists(modelName, downloadPath);

      if (exists) {
        const modelPath = path.join(downloadPath, `${modelName}.bin`);
        const modelConfig = modelDownloader.constructor.MODELS[modelName];

        return {
          exists: true,
          path: modelPath,
          cache_path: downloadPath,
          size_mb: modelConfig ? modelConfig.size_mb : null
        };
      }

          return {
            exists: false,
            path: null,
        cache_path: downloadPath,
            size_mb: null
          };
    } catch (error) {
      console.error('Model check failed:', error);
      return {
        exists: false,
        path: null,
        cache_path: null,
        size_mb: null
      };
    }
  });

  // Model import handler - allows user to import a pre-downloaded model file
  ipcMain.handle('model:import', async () => {
    try {
      // Open file dialog to select model file
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        title: 'Import Model File',
        filters: [
          { name: 'Model Files', extensions: ['bin', 'ggml', 'gguf'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled || result.filePaths.length === 0) {
        return {
          success: false,
          error: 'No file selected',
          message: 'No model file was selected.'
        };
      }

      const sourcePath = result.filePaths[0];
      const sourceStats = fs.statSync(sourcePath);
      const sourceSizeMB = sourceStats.size / (1024 * 1024);

      // Get download path
      let downloadPath = null;
      try {
        const settingsPath = path.join(__dirname, 'data', 'settings.json');
        if (fs.existsSync(settingsPath)) {
          const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
          if (settings.model_download_path) {
            downloadPath = settings.model_download_path;
          }
        }
      } catch (e) {
        console.warn('Error reading download path from settings:', e);
      }

      if (!downloadPath) {
        downloadPath = getDefaultModelsDir();
      }

      // Ensure directory exists
      if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath, { recursive: true });
      }

      // Determine model name from filename or ask user
      const sourceFilename = path.basename(sourcePath);
      let modelName = null;
      
      // Try to match filename to known models
      for (const [key, def] of Object.entries(MODEL_DEFINITIONS)) {
        if (sourceFilename.includes(key) || sourceFilename === def.filename) {
          modelName = key;
          break;
        }
      }

      // If no match, try to infer from size
      if (!modelName) {
        for (const [key, def] of Object.entries(MODEL_DEFINITIONS)) {
          const sizeDiff = Math.abs(sourceSizeMB - def.size_mb);
          if (sizeDiff < def.size_mb * 0.1) { // Within 10% of expected size
            modelName = key;
            break;
          }
        }
      }

      // If still no match, use the source filename
      const targetFilename = modelName ? MODEL_DEFINITIONS[modelName].filename : sourceFilename;
      const targetPath = path.join(downloadPath, targetFilename);

      // Copy file to target location
      console.log(`Copying model from ${sourcePath} to ${targetPath}`);
      fs.copyFileSync(sourcePath, targetPath);

      // Verify copied file
      const targetStats = fs.statSync(targetPath);
      if (targetStats.size !== sourceStats.size) {
        fs.unlinkSync(targetPath);
        return {
          success: false,
          error: 'Copy verification failed',
          message: 'The copied file size does not match the source file. Import failed.'
        };
      }

      // Send completion event
      const importResult = {
        success: true,
        model: modelName || 'unknown',
        path: targetPath,
        cache_path: downloadPath,
        size_mb: sourceSizeMB,
        status: 'imported',
        cached: false
      };

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('model:complete', importResult);
      }

      return importResult;
    } catch (error) {
      console.error('Error importing model:', error);
      const errorResult = {
        success: false,
        error: error.message,
        message: `Failed to import model: ${error.message}`
      };
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('model:error', errorResult);
      }
      return errorResult;
    }
  });

  // Translation service handler - uses Python service for on-the-fly translation
  ipcMain.handle('translation:translate', async (_evt, text, targetLang, sourceLang = 'en') => {
    try {
      const translationServicePath = path.join(__dirname, 'translation_service.py');
      
      if (!fs.existsSync(translationServicePath)) {
        return { error: 'Translation service not found', translated: text };
      }

      // Call Python translation service
      const result = execSync(
        `python "${translationServicePath}" translate "${text.replace(/"/g, '\\"')}" ${sourceLang} ${targetLang}`,
        { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
      );

      const parsed = JSON.parse(result.trim());
      return parsed;
    } catch (error) {
      console.error('Translation error:', error);
      return { error: error.message, translated: text };
    }
  });

  // Translation service handler for dictionaries (translation files)
  ipcMain.handle('translation:translate-dict', async (_evt, translationsJson, targetLang, sourceLang = 'en') => {
    try {
      const translationServicePath = path.join(__dirname, 'translation_service.py');
      
      if (!fs.existsSync(translationServicePath)) {
        return { error: 'Translation service not found', translated: translationsJson };
      }

      // Escape JSON for command line
      const escapedJson = JSON.stringify(translationsJson).replace(/"/g, '\\"');
      
      // Call Python translation service
      const result = execSync(
        `python "${translationServicePath}" translate_dict "${escapedJson}" ${sourceLang} ${targetLang}`,
        { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
      );

      const parsed = JSON.parse(result.trim());
      return parsed;
    } catch (error) {
      console.error('Translation error:', error);
      return { error: error.message, translated: translationsJson };
    }
  });

  // Check if translation service is available
  ipcMain.handle('translation:check', async () => {
    try {
      const translationServicePath = path.join(__dirname, 'translation_service.py');
      
      if (!fs.existsSync(translationServicePath)) {
        return { available: false, error: 'Translation service not found' };
      }

      const result = execSync(
        `python "${translationServicePath}" check`,
        { encoding: 'utf8', maxBuffer: 1024 * 1024 }
      );

      const parsed = JSON.parse(result.trim());
      return parsed;
    } catch (error) {
      console.error('Translation check error:', error);
      return { available: false, error: error.message };
    }
  });

  // Clipboard handler
  ipcMain.handle('clipboard:write', async (_evt, text) => {
    try {
      clipboard.writeText(text);
      return { success: true };
    } catch (error) {
      console.error('Clipboard write error:', error);
      return { success: false, error: error.message };
    }
  });

  // App settings handlers
  const appSettingsPath = path.join(__dirname, 'data', 'settings.json');
  
  // Ensure data directory exists
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  ipcMain.handle('app-settings:get', async () => {
    try {
      if (fs.existsSync(appSettingsPath)) {
        const raw = fs.readFileSync(appSettingsPath, 'utf8');
        return JSON.parse(raw);
      }
      // Return defaults
      return {
        theme: 'light',
        follow_system_theme: false,
        auto_model: false,
        selected_model: 'base',
        language: 'en',
        dictation_hotkey: 'Ctrl+Space',
        launch_on_startup: false,
        sound_feedback: true,
        vibe_coding_enabled: false,
        waveform_animation: true,
        continuous_dictation: false,
        low_latency: false,
        noise_reduction: false,
        local_only: true,
        auto_delete_cache: false
      };
    } catch (e) {
      console.error('Error loading app settings:', e);
      return {};
    }
  });

  ipcMain.handle('app-settings:set', async (_evt, newSettings) => {
    try {
      let currentSettings = {};
      if (fs.existsSync(appSettingsPath)) {
        const raw = fs.readFileSync(appSettingsPath, 'utf8');
        currentSettings = JSON.parse(raw);
      }
      const updated = { ...currentSettings, ...newSettings };
      fs.writeFileSync(appSettingsPath, JSON.stringify(updated, null, 2));
      return updated;
    } catch (e) {
      console.error('Error saving app settings:', e);
      return {};
    }
  });

  // Cache clear handler
  ipcMain.handle('cache:clear', async () => {
    try {
      // Clear whisper model cache if it exists
      const cacheDir = path.join(app.getPath('userData'), 'whisper-cache');
      if (fs.existsSync(cacheDir)) {
        fs.rmSync(cacheDir, { recursive: true, force: true });
      }
      return { success: true };
    } catch (e) {
      console.error('Error clearing cache:', e);
      return { success: false, error: e.message };
    }
  });

  // Microphone detection handler
  ipcMain.handle('microphone:list', async () => {
    try {
      const systemUtilsPath = path.join(__dirname, 'system_utils.py');
      const pythonProcess = spawn('python', [systemUtilsPath, 'list-microphones'], { stdio: ['pipe', 'pipe', 'pipe'] });
      let output = '';
      let error = '';
      
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      return new Promise((resolve) => {
        pythonProcess.on('close', (code) => {
          if (code === 0 && output) {
            try {
              const devices = JSON.parse(output.trim());
              resolve(devices);
            } catch (e) {
              resolve([{ name: 'Auto-detect (Audio)', id: 'default' }]);
            }
          } else {
            resolve([{ name: 'Auto-detect (Audio)', id: 'default' }]);
          }
        });
      });
    } catch (e) {
      console.error('Error listing microphones:', e);
      return [{ name: 'Auto-detect (Audio)', id: 'default' }];
    }
  });

  // System theme detection handlers
  ipcMain.handle('theme:get-system', async () => {
    try {
      return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    } catch (e) {
      console.error('Error getting system theme:', e);
      return 'light';
    }
  });

  ipcMain.on('theme:set-source', (_evt, source) => {
    try {
      if (source === 'system') {
        nativeTheme.themeSource = 'system';
      } else if (source === 'light' || source === 'dark') {
        nativeTheme.themeSource = source;
      }
    } catch (e) {
      console.error('Error setting theme source:', e);
    }
  });

  // Listen to system theme changes and notify renderer
  nativeTheme.on('updated', () => {
    try {
      const systemTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('system-theme-changed', systemTheme);
      }
    } catch (e) {
      console.error('Error sending system theme change:', e);
    }
  });

  // Dictionary handlers
  const dictionaryPath = path.join(__dirname, 'data', 'dictionary.json');
  
  ipcMain.handle('dictionary:get', async () => {
    try {
      if (fs.existsSync(dictionaryPath)) {
        const raw = fs.readFileSync(dictionaryPath, 'utf8');
        return JSON.parse(raw);
      }
      return [];
    } catch (e) {
      console.error('Error loading dictionary:', e);
      return [];
    }
  });

  ipcMain.handle('dictionary:add', async (_evt, word) => {
    try {
      let words = [];
      if (fs.existsSync(dictionaryPath)) {
        const raw = fs.readFileSync(dictionaryPath, 'utf8');
        words = JSON.parse(raw);
      }
      
      // Normalize the input word
      const normalizedWord = word.toLowerCase().trim();
      
      // Validate input
      if (!normalizedWord) {
        return { success: false, words, error: 'Please enter a valid word' };
      }
      
      // Check for duplicates (case-insensitive)
      // Normalize all existing words for comparison
      const normalizedWords = words.map(w => {
        const str = String(w);
        return str.toLowerCase().trim();
      }).filter(w => w);
      
      // Check if word already exists (case-insensitive)
      if (normalizedWords.includes(normalizedWord)) {
        // Find the original casing if it exists to show in error message
        const existingWord = words.find(w => {
          const str = String(w);
          return str.toLowerCase().trim() === normalizedWord;
        });
        const displayWord = existingWord || normalizedWord;
        return { 
          success: false, 
          words, 
          error: `"${displayWord}" already exists in the dictionary` 
        };
      }
      
      // Add the word (store in original casing but check duplicates case-insensitively)
      words.push(normalizedWord);
      words.sort();
      fs.writeFileSync(dictionaryPath, JSON.stringify(words, null, 2));
      return { success: true, words };
    } catch (e) {
      console.error('Error adding to dictionary:', e);
      return { success: false, words: [], error: e.message || 'Failed to add word' };
    }
  });

  ipcMain.handle('dictionary:update', async (_evt, oldWord, newWord) => {
    try {
      let words = [];
      if (fs.existsSync(dictionaryPath)) {
        const raw = fs.readFileSync(dictionaryPath, 'utf8');
        words = JSON.parse(raw);
      }
      const normalizedOldWord = oldWord.toLowerCase().trim();
      const normalizedNewWord = newWord.toLowerCase().trim();
      
      // Normalize all existing words for comparison
      const normalizedWords = words.map(w => {
        const str = String(w);
        return str.toLowerCase().trim();
      }).filter(w => w);
      
      // Check if new word already exists (and it's not the same as old word)
      if (normalizedNewWord && normalizedNewWord !== normalizedOldWord && normalizedWords.includes(normalizedNewWord)) {
        return { success: false, words, error: 'Word already exists' };
      }
      
      // Update the word
      const index = normalizedWords.indexOf(normalizedOldWord);
      if (index !== -1) {
        words[index] = normalizedNewWord;
        words.sort();
        fs.writeFileSync(dictionaryPath, JSON.stringify(words, null, 2));
        return { success: true, words };
      }
      return { success: false, words, error: 'Word not found' };
    } catch (e) {
      console.error('Error updating dictionary:', e);
      return { success: false, words: [], error: e.message };
    }
  });

  ipcMain.handle('dictionary:delete', async (_evt, word) => {
    try {
      let words = [];
      if (fs.existsSync(dictionaryPath)) {
        const raw = fs.readFileSync(dictionaryPath, 'utf8');
        words = JSON.parse(raw);
      }
      words = words.filter(w => w !== word.toLowerCase().trim());
      fs.writeFileSync(dictionaryPath, JSON.stringify(words, null, 2));
      return words;
    } catch (e) {
      console.error('Error deleting from dictionary:', e);
      return [];
    }
  });

  // Snippets handlers
  const snippetsPath = path.join(__dirname, 'data', 'snippets.json');
  
  ipcMain.handle('snippets:get', async () => {
    try {
      if (fs.existsSync(snippetsPath)) {
        const raw = fs.readFileSync(snippetsPath, 'utf8');
        return JSON.parse(raw);
      }
      return [];
    } catch (e) {
      console.error('Error loading snippets:', e);
      return [];
    }
  });

  ipcMain.handle('snippets:add', async (_evt, snippet) => {
    try {
      let snippets = [];
      if (fs.existsSync(snippetsPath)) {
        const raw = fs.readFileSync(snippetsPath, 'utf8');
        snippets = JSON.parse(raw);
      }
      const newSnippet = {
        id: Date.now().toString(),
        title: snippet.title || 'Untitled',
        text: snippet.text || '',
        timestamp: Date.now()
      };
      snippets.unshift(newSnippet);
      fs.writeFileSync(snippetsPath, JSON.stringify(snippets, null, 2));
      return snippets;
    } catch (e) {
      console.error('Error adding snippet:', e);
      return [];
    }
  });

  ipcMain.handle('snippets:update', async (_evt, id, snippet) => {
    try {
      let snippets = [];
      if (fs.existsSync(snippetsPath)) {
        const raw = fs.readFileSync(snippetsPath, 'utf8');
        snippets = JSON.parse(raw);
      }
      const index = snippets.findIndex(s => s.id === id);
      if (index !== -1) {
        snippets[index] = { ...snippets[index], ...snippet };
        fs.writeFileSync(snippetsPath, JSON.stringify(snippets, null, 2));
      }
      return snippets;
    } catch (e) {
      console.error('Error updating snippet:', e);
      return [];
    }
  });

  ipcMain.handle('snippets:delete', async (_evt, id) => {
    try {
      let snippets = [];
      if (fs.existsSync(snippetsPath)) {
        const raw = fs.readFileSync(snippetsPath, 'utf8');
        snippets = JSON.parse(raw);
      }
      snippets = snippets.filter(s => s.id !== id);
      fs.writeFileSync(snippetsPath, JSON.stringify(snippets, null, 2));
      return snippets;
    } catch (e) {
      console.error('Error deleting snippet:', e);
      return [];
    }
  });

  // Notes handlers
  const notesPath = path.join(__dirname, 'data', 'notes.json');
  
  ipcMain.handle('notes:get', async () => {
    try {
      if (fs.existsSync(notesPath)) {
        const raw = fs.readFileSync(notesPath, 'utf8');
        return JSON.parse(raw);
      }
      return [];
    } catch (e) {
      console.error('Error loading notes:', e);
      return [];
    }
  });

  ipcMain.handle('notes:add', async (_evt, note) => {
    try {
      let notes = [];
      if (fs.existsSync(notesPath)) {
        const raw = fs.readFileSync(notesPath, 'utf8');
        notes = JSON.parse(raw);
      }
      const newNote = {
        id: Date.now().toString(),
        text: note.text || '',
        timestamp: Date.now()
      };
      notes.unshift(newNote);
      fs.writeFileSync(notesPath, JSON.stringify(notes, null, 2));
      return notes;
    } catch (e) {
      console.error('Error adding note:', e);
      return [];
    }
  });

  ipcMain.handle('notes:update', async (_evt, id, note) => {
    try {
      let notes = [];
      if (fs.existsSync(notesPath)) {
        const raw = fs.readFileSync(notesPath, 'utf8');
        notes = JSON.parse(raw);
      }
      const index = notes.findIndex(n => n.id === id);
      if (index !== -1) {
        notes[index] = { ...notes[index], ...note };
        fs.writeFileSync(notesPath, JSON.stringify(notes, null, 2));
      }
      return notes;
    } catch (e) {
      console.error('Error updating note:', e);
      return [];
    }
  });

  ipcMain.handle('notes:delete', async (_evt, id) => {
    try {
      let notes = [];
      if (fs.existsSync(notesPath)) {
        const raw = fs.readFileSync(notesPath, 'utf8');
        notes = JSON.parse(raw);
      }
      notes = notes.filter(n => n.id !== id);
      fs.writeFileSync(notesPath, JSON.stringify(notes, null, 2));
      return notes;
    } catch (e) {
      console.error('Error deleting note:', e);
      return [];
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

  app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (whisperProcess && !whisperProcess.killed) {
    whisperProcess.kill();
  }
  if (indicatorWindow && !indicatorWindow.isDestroyed()) {
    try { indicatorWindow.destroy(); } catch (e) {}
  }
});
