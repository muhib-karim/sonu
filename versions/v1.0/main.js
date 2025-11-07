const { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage, clipboard, screen, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

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

function createWindow() {
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
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.hide();

  createTray();
}

function createIndicatorWindow() {
  indicatorWindow = new BrowserWindow({
    width: 220,
    height: 50,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, 'widget_preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  indicatorWindow.loadFile('widget.html');
  // Allow mouse events on the window so buttons are clickable
  indicatorWindow.setIgnoreMouseEvents(false);
  positionIndicator();
  try { indicatorWindow.setOpacity(0); } catch (e) {}
  indicatorWindow.hide();
}

function positionIndicator() {
  try {
    const display = screen.getPrimaryDisplay();
    const { width, height, x, y } = display.workArea;
    const w = 220; const h = 50;
    const cx = x + Math.floor((width - w) / 2);
    const cy = y + Math.floor((height - h) / 2);
    indicatorWindow.setBounds({ x: cx, y: cy, width: w, height: h });
  } catch (e) {}
}

function showIndicator() {
  if (!indicatorWindow) return;
  if (indicatorState === 'visible' || indicatorState === 'fading_in') return;
  if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }
  indicatorState = 'visible';
  try { 
    indicatorWindow.showInactive(); 
    indicatorWindow.setOpacity(1); // Show instantly - no fade
  } catch (e) {}
}

function hideIndicator() {
  if (!indicatorWindow) return;
  if (indicatorState === 'hidden' || indicatorState === 'fading_out') return;
  if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }
  indicatorState = 'hidden';
  try { 
    indicatorWindow.hide(); // Hide instantly - no fade
    indicatorWindow.setOpacity(0);
  } catch (e) {}
}

function typeStringRobot(text) {
  if (!text || text.trim() === '') {
    console.warn('Empty text, skipping typing');
    return false;
  }
  
  // Ensure main window is hidden and minimized FIRST - critical for system-wide typing
  if (mainWindow) {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    }
    if (!mainWindow.isMinimized()) {
      mainWindow.minimize();
    }
  }
  
  if (!robot) {
    console.warn('Robot library not available. Text copied to clipboard. Install robotjs: npm install robotjs');
    // Fallback: copy to clipboard
    try {
      clipboard.writeText(text);
      console.log('Text copied to clipboard (robot library not available):', text);
    } catch (e) {
      console.error('Failed to copy to clipboard:', e);
    }
    return false;
  }
  
  console.log('Attempting to type with robotjs. Robot type:', robotType);
  console.log('Robot object:', robot ? 'available' : 'null');
  if (robot) {
    console.log('Robot methods:', Object.keys(robot));
  }
  
  try {
    // Small delay to ensure window is minimized and focus is on target app
    // Windows needs a moment to switch focus
    setTimeout(() => {
      try {
        // Double-check window is minimized
        if (mainWindow && !mainWindow.isMinimized()) {
          mainWindow.minimize();
        }
        
        if (robotType === 'robot-js' && robot.Keyboard) {
          robot.Keyboard.typeString(text);
          console.log('✓ Typed text system-wide using robot-js:', text);
        } else if (robotType === 'robotjs' && robot.typeString) {
          // For robotjs, try typing character by character for better reliability
          try {
            // First try the simple method
            robot.typeString(text);
            console.log('✓ Typed text system-wide using robotjs:', text);
          } catch (e) {
            console.error('robotjs typeString failed, trying character by character:', e);
            // Fallback: type character by character
            try {
              for (let i = 0; i < text.length; i++) {
                const char = text[i];
                if (char === '\n') {
                  robot.keyTap('enter');
                } else if (char === '\t') {
                  robot.keyTap('tab');
                } else {
                  robot.typeString(char);
                }
              }
              console.log('✓ Typed text system-wide using robotjs (char by char):', text);
            } catch (e2) {
              console.error('robotjs character-by-character typing also failed:', e2);
              throw e2;
            }
          }
        } else {
          console.error('Robot library available but typing method not found. Type:', robotType);
          console.error('Robot object keys:', robot ? Object.keys(robot) : 'null');
          // Fallback to clipboard
          clipboard.writeText(text);
          console.log('Text copied to clipboard (typing method not found):', text);
        }
      } catch (e) {
        console.error('Typing error:', e);
        console.error('Error details:', e.message);
        if (e.stack) {
          console.error('Stack:', e.stack);
        }
        // Fallback to clipboard on error
        try {
          clipboard.writeText(text);
          console.log('Text copied to clipboard (typing failed):', text);
        } catch (clipErr) {
          console.error('Failed to copy to clipboard:', clipErr);
        }
      }
    }, 100); // Small delay for Windows to switch focus
    return true;
  } catch (e) {
    console.error('Typing error:', e);
    // Fallback to clipboard
    try {
      clipboard.writeText(text);
      console.log('Text copied to clipboard (exception):', text);
    } catch (clipErr) {
      console.error('Failed to copy to clipboard:', clipErr);
    }
    return false;
  }
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
  whisperProcess = spawn('python', [pythonScript], { stdio: ['pipe', 'pipe', 'pipe'] });
  
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
          // Hide indicator IMMEDIATELY - no delays
          hideIndicator();
          isRecording = false;
          isHoldKeyPressed = false;
          if (holdRecordingTimeout) {
            clearTimeout(holdRecordingTimeout);
            holdRecordingTimeout = null;
          }
          try { mainWindow.webContents.send('recording-stop'); } catch (e) {}
          // Text will come after this event
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
        try { mainWindow.webContents.send('recording-stop'); } catch (e) {}
        hideIndicator();
        isRecording = false;
        isHoldKeyPressed = false;
        if (holdRecordingTimeout) {
          clearTimeout(holdRecordingTimeout);
          holdRecordingTimeout = null;
        }
        // Hide window immediately - ULTRA FAST
        if (mainWindow) {
          mainWindow.hide();
        }
        
        // Type the text system-wide IMMEDIATELY - ULTRA FAST (no delays)
        console.log('Attempting to type text system-wide:', text);
        try {
          if (text && text.trim()) {
            const typed = typeStringRobot(text);
            if (!typed) {
              console.warn('Typing failed, text copied to clipboard. Install robotjs: npm install robotjs');
            } else {
              console.log('✓ Text typed system-wide successfully');
            }
          }
        } catch (e) {
          console.error('Failed to type text:', e);
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
      try { mainWindow.webContents.send('recording-stop'); } catch (e) {}
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
        try { mainWindow.webContents.send('recording-stop'); } catch (e) {}
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
        try { mainWindow.webContents.send('recording-stop'); } catch (e) {}
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
