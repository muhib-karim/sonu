// Electron imports - must be first
const electron = require('electron');
const { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage, clipboard, screen, shell, nativeTheme, dialog } = electron;

// Model downloader integration
const { ModelDownloader } = require('./src/model_downloader.js');
const modelDownloader = new ModelDownloader();
// Style transformer integration
const { applyStyle, getStyleDescription, getStyleExample, getAvailableStyles, getCategoryBannerText } = require('./src/style_transformer.js');

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

// Other imports
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const { spawn, execSync } = require('child_process');
const https = require('follow-redirects').https;
const http = require('follow-redirects').http;
const crypto = require('crypto');
const { pipeline } = require('stream/promises');
const os = require('os');
const { getLogger } = require('./logger');

// Development mode detection - will be set after app ready
let isDevelopment = process.env.NODE_ENV === 'development';

// Single instance logic will be set up after app is ready
let gotTheLock = false;

const isShowcaseMode = String(process.env.SHOWCASE_CAPTURE || '').toLowerCase() === '1' ||
  String(process.env.SHOWCASE_CAPTURE || '').toLowerCase() === 'true';
const showcaseOutputDir = path.join(__dirname, 'assets', 'showcase');

let mainWindow;
let tray;
let whisperProcess;
let whisperStdoutBuffer = ''; // Buffer for incomplete stdout lines
let llmProcess = null; // LLM service process
let llmProcessReady = false; // Whether LLM service is ready
let isRecording = false;
let robot;
let robotType = null; // 'robot-js' or 'robotjs'
let lastTypedText = ''; // Track what we've already typed for incremental typing
let pendingTypingQueue = []; // Queue for typing operations to prevent overlap
const isTestMode = String(process.env.NODE_ENV || '').toLowerCase() === 'test' ||
  String(process.env.E2E_TEST || '').toLowerCase() === '1' ||
  String(process.env.E2E_TEST || '').toLowerCase() === 'true';
let indicatorWindow;
let fadeTimer = null;
let indicatorState = 'hidden';
let typedSoFar = '';
let settings = {
  holdHotkey: 'CommandOrControl+Super+Space',
  toggleHotkey: 'CommandOrControl+Shift+Space',
  notesHotkey: 'CommandOrControl+Super+N', // Default notes hotkey
  activeModel: 'tiny' // Default model
};
const configPath = path.join(__dirname, 'config.json');
const historyPath = path.join(__dirname, 'history.json');
let logger = null; // Initialize after app ready
let whisperModelReady = false; // Track if whisper model is loaded
let activeDownloadProcess = null; // Track active download process for cancellation
let pendingRecordingAction = null; // Queue recording action if model not ready yet

if (!isTestMode) {
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
} else {
  robot = null;
  robotType = null;
  console.log('Test mode detected: skipping robot libraries for E2E stability');
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
      contextIsolation: true,
      webSecurity: false  // Disable web security to prevent caching issues
    },
    show: false  // Don't show until ready (prevents white flash)
  });
  
  // Windows-specific: Handle taskbar icon clicks
  // On Windows, clicking the taskbar icon should restore and focus the window
  if (process.platform === 'win32') {
    // Handle when window is shown (including from taskbar click)
    mainWindow.on('show', () => {
      console.log('Window shown event - ensuring focus');
      // Use setImmediate to ensure this runs after the window is fully shown
      setImmediate(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.focus();
          // Bring to front
          mainWindow.setAlwaysOnTop(true);
          setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.setAlwaysOnTop(false);
            }
          }, 100);
        }
      });
    });
  }
  
  // Immediately set up window showing logic (before any async operations)
  // This ensures the window appears reliably when launched from agents
  if (!isShowcaseMode && !isTestMode) {
    // Show window immediately after a very short delay (allows window to initialize)
    setImmediate(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.log('🚀 Immediate window show attempt');
        mainWindow.show();
        mainWindow.focus();
      }
    });
  }

  // Aggressively clear all cache and storage (do this BEFORE loading)
  // This ensures we always load the latest files, not cached versions
  mainWindow.webContents.session.clearCache();
  mainWindow.webContents.session.clearStorageData();
  mainWindow.webContents.session.clearHostResolverCache();
  
  // Load file from apps/desktop directory (explicit path to avoid confusion with root files)
  // Use absolute path to ensure we're loading the correct file
  const indexPath = path.resolve(__dirname, 'index.html');
  const appVersion = app.getVersion();
  
  // Debug: Log the actual path being used
  console.log('__dirname:', __dirname);
  console.log('Loading index.html from:', indexPath);
  console.log('File exists:', fs.existsSync(indexPath));
  if (!fs.existsSync(indexPath)) {
    console.error('ERROR: index.html not found at:', indexPath);
    console.log('Current directory files:', fs.readdirSync(__dirname).filter(f => f.endsWith('.html')));
  }
  
  // Verify we're loading from apps/desktop, not root
  if (!indexPath.includes('apps\\desktop') && !indexPath.includes('apps/desktop')) {
    console.error('WARNING: Loading index.html from wrong location!', indexPath);
  }
  
  // Read package.json directly to get the latest version (always up-to-date)
  const packageJsonPath = path.join(__dirname, 'package.json');
  let currentVersion = appVersion;
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    currentVersion = packageJson.version;
    console.log('Version from package.json:', currentVersion);
  } catch (e) {
    console.warn('Could not read package.json, using app.getVersion():', e.message);
  }
  
  // Inject version directly into HTML before loading - simple and reliable
  try {
    let htmlContent = fs.readFileSync(indexPath, 'utf8');
    console.log('✓ Read HTML file successfully');
    console.log('Current version to inject:', currentVersion);
    
    // Replace version - match any version text (or empty) in the app-version element
    // Use a more flexible pattern that handles whitespace and newlines
    const versionPattern = /<span[^>]*id=["']app-version["'][^>]*>[\s\S]*?<\/span>/;
    const replacement = `<span class="version-text" id="app-version" style="cursor: pointer;" title="Click to check for updates">SONU v${currentVersion}</span>`;
    
    if (versionPattern.test(htmlContent)) {
      htmlContent = htmlContent.replace(versionPattern, replacement);
      console.log('✓ Version replaced in HTML');
    } else {
      console.error('✗ Could not find app-version element in HTML!');
      console.error('HTML snippet around app-version:', htmlContent.substring(
        Math.max(0, htmlContent.indexOf('app-version') - 100),
        Math.min(htmlContent.length, htmlContent.indexOf('app-version') + 200)
      ));
    }
    
    // Verify replacement worked
    if (!htmlContent.includes(`SONU v${currentVersion}`)) {
      console.error('✗ Version replacement verification failed!');
      console.error('HTML does not contain:', `SONU v${currentVersion}`);
    } else {
      console.log('✓ Version confirmed in HTML content');
    }
    
    // Write to temp file and load it
    const tempIndexPath = path.join(__dirname, `index.temp.${Date.now()}.html`);
    fs.writeFileSync(tempIndexPath, htmlContent, 'utf8');
    console.log('✓ Temp file written:', tempIndexPath);
    
    // Verify temp file has correct version
    const tempContent = fs.readFileSync(tempIndexPath, 'utf8');
    if (tempContent.includes(`SONU v${currentVersion}`)) {
      console.log('✓ Version confirmed in temp file');
    } else {
      console.error('✗ Version NOT in temp file!');
      console.error('Temp file content snippet:', tempContent.substring(
        Math.max(0, tempContent.indexOf('app-version') - 100),
        Math.min(tempContent.length, tempContent.indexOf('app-version') + 200)
      ));
    }
    
    mainWindow.loadFile(tempIndexPath);
    console.log('✓ Loading temp file');
    
    // Set version immediately after load - no delays
    mainWindow.webContents.once('did-finish-load', () => {
      console.log('Page loaded, setting version immediately...');
      // Set version IMMEDIATELY - synchronous execution
      const jsCode = `
        (function() {
          const el = document.getElementById('app-version');
          console.log('Version element found:', el);
          if (el) {
            const oldText = el.textContent;
            el.textContent = 'SONU v${currentVersion}';
            el.style.cursor = 'pointer';
            el.title = 'Click to check for updates';
            console.log('Version changed from "' + oldText + '" to "SONU v${currentVersion}"');
            return true;
          }
          console.error('Version element NOT found!');
          return false;
        })();
      `;
      mainWindow.webContents.executeJavaScript(jsCode).then(result => {
        console.log('Version JS injection result:', result);
      }).catch(err => {
        console.error('Version JS injection error:', err);
      });
      
      // Clean up temp files after a delay
      setTimeout(() => {
        try {
          const files = fs.readdirSync(__dirname);
          files.forEach(file => {
            if (file.startsWith('index.temp.') && file.endsWith('.html')) {
              fs.unlinkSync(path.join(__dirname, file));
            }
          });
        } catch (e) {}
      }, 2000);
    });
  } catch (e) {
    console.error('Failed to inject version into HTML:', e);
    console.error('Error stack:', e.stack);
    // Fallback: load original file and inject via JS immediately
    mainWindow.loadFile(indexPath);
    mainWindow.webContents.once('did-finish-load', () => {
      const jsCode = `
        (function() {
          const el = document.getElementById('app-version');
          if (el) {
            el.textContent = 'SONU v${currentVersion}';
            el.style.cursor = 'pointer';
            el.title = 'Click to check for updates';
            console.log('Version set via fallback to: SONU v${currentVersion}');
          }
        })();
      `;
      mainWindow.webContents.executeJavaScript(jsCode).catch((err) => {
        console.error('Fallback version injection error:', err);
      });
    });
  }
  
  // Show and focus the main window when ready (recommended Electron pattern)
  mainWindow.once('ready-to-show', () => {
    console.log('✅ ready-to-show event fired');
    if (!isShowcaseMode && !isTestMode) {
      // Restore window if minimized
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      // Show and focus the window to bring it to front
      mainWindow.show();
      mainWindow.focus();
      // Bring to front
      mainWindow.setAlwaysOnTop(true);
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(false);
        }
      }, 200);
      console.log('✅ Window shown via ready-to-show');
    }
  });
  
  // Also ensure window is shown and focused after page fully loads
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('✅ did-finish-load event fired');
    if (!isShowcaseMode && !isTestMode) {
      if (!mainWindow.isVisible()) {
        console.log('🔍 Window not visible after load, showing now');
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.show();
      }
      mainWindow.focus();
      // Bring to front
      mainWindow.setAlwaysOnTop(true);
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(false);
        }
      }, 200);
      console.log('✅ Window shown via did-finish-load');
    }
  });
  
  // Aggressive fallbacks: Ensure window is shown even if ready-to-show doesn't fire
  // This is critical when launching from other agents/tools
  // Multiple fallbacks at different intervals to ensure window appears
  const showWindowAggressively = () => {
    if (mainWindow && !mainWindow.isDestroyed() && !isShowcaseMode && !isTestMode) {
      if (!mainWindow.isVisible()) {
        console.log('🔍 Fallback: Showing window (window not visible)');
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.show();
        mainWindow.focus();
        // Bring to front
        mainWindow.setAlwaysOnTop(true);
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setAlwaysOnTop(false);
          }
        }, 200);
      } else {
        // Window is visible, just ensure it's focused
        mainWindow.focus();
        mainWindow.moveTop();
      }
    }
  };
  
  // Immediate check (100ms)
  setTimeout(showWindowAggressively, 100);
  // Short fallback (500ms)
  setTimeout(showWindowAggressively, 500);
  // Medium fallback (1 second)
  setTimeout(showWindowAggressively, 1000);
  // Long fallback (2 seconds) - last resort
  setTimeout(showWindowAggressively, 2000);
  if (isShowcaseMode) {
    mainWindow.setResizable(false);
    mainWindow.center();
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      mainWindow.focus();
    });
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        runShowcaseCapture().catch((error) => {
          console.error('Showcase capture failed:', error);
          if (logger) {
            logger.error('Showcase capture failed', error);
          }
          app.quit();
        });
      }, 1000);
    });
  }

  // Add error handlers to diagnose loading issues
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.error('❌ Page failed to load:', {
      errorCode,
      errorDescription,
      validatedURL,
      isMainFrame
    });
    if (logger) {
      logger.error('Page failed to load', { errorCode, errorDescription, validatedURL });
    }
  });

  mainWindow.webContents.on('crashed', (event, killed) => {
    console.error('❌ Renderer process crashed!', { killed });
    if (logger) {
      logger.error('Renderer process crashed', { killed });
    }
    // Reload the window after a short delay
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.log('🔄 Attempting to reload after crash...');
        mainWindow.reload();
      }
    }, 1000);
  });

  mainWindow.webContents.on('unresponsive', () => {
    console.warn('⚠️ Renderer process became unresponsive');
    if (logger) {
      logger.warn('Renderer process unresponsive');
    }
  });

  mainWindow.webContents.on('responsive', () => {
    console.log('✅ Renderer process became responsive again');
  });

  // Add keyboard shortcut for reloading (Ctrl+R or Cmd+R)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.control || input.meta) && input.key.toLowerCase() === 'r') {
      if (!input.shift) {
        event.preventDefault();
        mainWindow.reload();
      }
    }
  });
  
  // Handle window events for taskbar icon clicks
  // When window is minimized and user clicks taskbar icon, restore and focus
  mainWindow.on('minimize', () => {
    console.log('Window minimized');
  });
  
  mainWindow.on('restore', () => {
    console.log('Window restored - ensuring focus and bringing to front');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
      // Bring to front when restored from taskbar
      mainWindow.setAlwaysOnTop(true);
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(false);
        }
      }, 200);
    }
  });
  
  // Handle window focus events
  mainWindow.on('focus', () => {
    console.log('Window focused');
  });
  
  mainWindow.on('blur', () => {
    console.log('Window blurred');
  });
  
  // Additional show event handler (complements Windows-specific handler above)
  // This ensures focus even if Windows-specific handler doesn't fire
  mainWindow.on('show', () => {
    console.log('Window shown event (general) - ensuring focus');
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Small delay to ensure window is fully shown before focusing
      setImmediate(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.focus();
          // Bring to front
          mainWindow.setAlwaysOnTop(true);
          setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.setAlwaysOnTop(false);
            }
          }, 100);
        }
      });
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
  // Don't show indicator for notes recording - keep it within Notes tab only
  if (isNotesRecording) {
    console.log('Notes recording active - not showing indicator widget');
    return;
  }
  if (!indicatorWindow) return;
  if (indicatorState === 'visible' || indicatorState === 'fading_in') return;
  
  // CRITICAL: Check waveform animation setting - don't show widget if disabled
  const settingsPath = path.join(__dirname, 'data', 'settings.json');
  try {
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(raw);
      console.log('Checking waveform_animation setting:', settings.waveform_animation);
      if (settings.waveform_animation === false) {
        console.log('Widget NOT shown - waveform animation is disabled');
        indicatorState = 'hidden'; // Keep state as hidden
        return;
      }
      console.log('Widget WILL be shown - waveform animation is enabled or not set (default true)');
    } else {
      console.log('Settings file not found - widget will be shown (default behavior)');
    }
  } catch (e) {
    console.error('Error reading waveform setting for widget:', e);
  }
  
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

// Incremental typing: type only new words that haven't been typed yet
// Optimized for instant output like Wispr Flow and Typeless
function typeIncrementalText(newText, isPartial = false) {
  if (!newText || !newText.trim()) return '';
  
  // Extract only the NEW words that haven't been typed yet
  let textToType = '';
  
  if (lastTypedText && newText.startsWith(lastTypedText)) {
    // New text extends what we've already typed - type only the delta (fastest path)
    textToType = newText.slice(lastTypedText.length);
    // Don't trim - preserve leading spaces for natural typing
  } else if (lastTypedText && newText.length > lastTypedText.length) {
    // Text has grown - find the longest common prefix for instant typing
    let commonLength = 0;
    const minLen = Math.min(lastTypedText.length, newText.length);
    for (let i = 0; i < minLen && lastTypedText[i] === newText[i]; i++) {
      commonLength = i + 1;
    }
    // Type everything after the common prefix (more aggressive for instant output)
    textToType = newText.slice(commonLength);
  } else if (!lastTypedText || !newText.includes(lastTypedText)) {
    // Completely new text or doesn't match - type everything
    if (isPartial) {
      // For partials, be more aggressive - type new words immediately
      // Find the last word boundary in lastTypedText for smoother typing
      if (lastTypedText) {
        const lastSpaceIndex = lastTypedText.lastIndexOf(' ');
        if (lastSpaceIndex > 0 && newText.includes(lastTypedText.substring(0, lastSpaceIndex + 1))) {
          // Type from after the last complete word
          textToType = newText.slice(lastSpaceIndex + 1);
        } else {
          // No match - type everything (might be correction or new sentence)
          textToType = newText;
          lastTypedText = ''; // Reset since we're typing everything
        }
      } else {
        // First partial - type everything
        textToType = newText;
      }
    } else {
      // Final text - type everything
      textToType = newText;
    }
  }
  
  // Type immediately if there's new text to type
  if (textToType && textToType.trim().length > 0) {
    typeStringRobot(textToType);
    lastTypedText = newText; // Update what we've typed
  }
  
  return textToType;
}

function typeStringRobot(text) {
  const startTime = Date.now();
  
  if (!text || text.trim() === '') {
    if (logger) logger.typing('Empty text, skipping');
    return false;
  }
  
  if (logger) logger.typing('Starting typing', { 
    textLength: text.length, 
    preview: text.substring(0, 50),
    robotType: robotType,
    robotAvailable: !!robot
  });
  
  // CRITICAL: Completely hide and unfocus ALL windows IMMEDIATELY
  // This must happen synchronously before any typing - NO DELAYS
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(false);
    mainWindow.hide();
    mainWindow.minimize();
    mainWindow.blur();
  }
  
  // Also hide indicator window to prevent focus stealing
  if (indicatorWindow && !indicatorWindow.isDestroyed()) {
    indicatorWindow.hide();
  }
  
  // INSTANT TYPING: Use clipboard+paste for ALL text (fastest method, no character delays)
  // This is how Wispr Flow, Typeless, and MacWhisper achieve instant output
  if (robot && robot.keyTap) {
    // Write to clipboard synchronously (fast)
    try {
      clipboard.writeText(text);
      if (logger) logger.typing('Text copied to clipboard', { duration_ms: Date.now() - startTime });
      
      // Paste immediately using process.nextTick (faster than setImmediate/setTimeout)
      // Window is already hidden synchronously above, so we can paste with minimal delay
      process.nextTick(() => {
        try {
          robot.keyTap('v', 'control');
          const totalTime = Date.now() - startTime;
          if (logger) logger.typing('✓ Pasted instantly with Ctrl+V', { total_duration_ms: totalTime });
          console.log(`✓ Typed instantly in ${totalTime}ms (clipboard method)`);
        } catch (pasteErr) {
          if (logger) logger.typingError('Paste failed', pasteErr);
          console.warn('Text is in clipboard, use Ctrl+V manually');
        }
      });
      return true;
    } catch (clipErr) {
      if (logger) logger.typingError('Clipboard failed', clipErr);
      console.error('Failed to copy to clipboard:', clipErr);
      // Fall through to alternative methods
    }
  }
  
  // FALLBACK: Try robot-js if clipboard method failed
  if (robot && robotType === 'robot-js' && robot.Keyboard && robot.Keyboard.typeString) {
    process.nextTick(() => {
      try {
        robot.Keyboard.typeString(text);
        const totalTime = Date.now() - startTime;
        if (logger) logger.typing('✓ Typed with robot-js', { total_duration_ms: totalTime });
        console.log(`✓ Typed successfully in ${totalTime}ms`);
      } catch (e) {
        if (logger) logger.typingError('robot-js.Keyboard.typeString failed', e);
      }
    });
    return true;
  }
  
  // FALLBACK: Try typeStringDelayed with 0 delay (for very short text only)
  if (robot && robotType === 'robotjs' && robot.typeStringDelayed && text.length < 10) {
    process.nextTick(() => {
      try {
        robot.typeStringDelayed(text, 0); // 0 delay = maximum speed
        const totalTime = Date.now() - startTime;
        if (logger) logger.typing('✓ Typed with robotjs.typeStringDelayed (0ms)', { total_duration_ms: totalTime });
        console.log(`✓ Typed successfully in ${totalTime}ms`);
      } catch (e) {
        if (logger) logger.typingError('robotjs.typeStringDelayed failed', e);
      }
    });
    return true;
  }
  
  // FINAL FALLBACK: Clipboard only (no robotjs available)
  try {
    clipboard.writeText(text);
    if (logger) logger.typing('Text copied to clipboard (fallback)');
    console.log('Text copied to clipboard (use Ctrl+V to paste)');
  } catch (clipErr) {
    if (logger) logger.typingError('All typing methods failed', clipErr);
    console.error('Failed to copy to clipboard:', clipErr);
  }
  
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

// Get available audio input devices
async function getAudioInputDevices() {
  try {
    // This requires the app to have microphone permissions
    const devices = await mainWindow.webContents.executeJavaScript(`
      navigator.mediaDevices.enumerateDevices()
        .then(devices => devices.filter(d => d.kind === 'audioinput'))
        .then(devices => devices.map(d => ({ id: d.deviceId, label: d.label || 'Microphone ' + d.deviceId.substr(0, 5) })))
    `);
    return devices || [];
  } catch (e) {
    console.error('Error getting audio devices:', e);
    return [];
  }
}

// Build microphone submenu
async function buildMicrophoneSubmenu() {
  const devices = await getAudioInputDevices();
  
  if (devices.length === 0) {
    return [
      {
        label: 'No microphones detected',
        enabled: false
      }
    ];
  }
  
  return devices.map(device => ({
    label: device.label,
    type: 'radio',
    checked: settings.selectedMicrophone === device.id,
    click: () => {
      settings.selectedMicrophone = device.id;
      saveSettings();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('microphone-changed', device.id);
      }
    }
  }));
}

function updateTrayMenu() {
  if (!tray) return;
  
  // Build microphone submenu (async)
  buildMicrophoneSubmenu().then(micSubmenu => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open SONU Home',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      {
        label: 'Share Feedback',
        click: sendGeneralFeedback
      },
      { type: 'separator' },
      {
        label: 'Settings...',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('navigate-to-settings');
          }
        }
      },
      {
        label: 'Select Microphone',
        submenu: micSubmenu
      },
      {
        label: 'Add Word to Dictionary...',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('open-dictionary');
          }
        }
      },
      { type: 'separator' },
      {
        label: `Version ${app.getVersion()}`,
        enabled: false
      },
      {
        label: 'Check for Updates',
        click: checkForUpdates
      },
      { type: 'separator' },
      {
        label: 'Paste Last Transcript',
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
    { type: 'separator' },
    {
      label: 'Quit SONU',
      accelerator: 'CmdOrCtrl+Q',
      click: () => app.quit()
    }
  ]);

  tray.setContextMenu(contextMenu);
  }).catch(err => {
    console.error('Error building tray menu:', err);
  });
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
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.show();
        mainWindow.focus();
        // Bring to front
        mainWindow.setAlwaysOnTop(true);
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setAlwaysOnTop(false);
          }
        }, 200);
      }
    }
  });
}

function ensureWhisperService() {
  if (whisperProcess && !whisperProcess.killed) {
    // Service is ready - pre-configure hold keys if needed
    if (logger) logger.whisper('Whisper service already running');
    return;
  }

  const pythonScript = path.join(__dirname, 'whisper_service.py');
  const pythonCmd = findPythonExecutable() || 'python';
  
  if (logger) logger.whisper('Starting whisper service', { 
    pythonCmd, 
    pythonScript,
    model: settings.activeModel 
  });
  
  // Set WHISPER_MODEL environment variable
  const env = { ...process.env };
  env.WHISPER_MODEL = settings.activeModel || 'tiny';
  
  whisperProcess = spawn(pythonCmd, [pythonScript], { 
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    env: env
  });
  
  // Reset buffer when creating new process
  whisperStdoutBuffer = '';
  
  // Pre-configure hold keys and experimental settings immediately when service starts
  setImmediate(() => {
    if (whisperProcess && !whisperProcess.killed) {
      const pyCombo = electronToPythonCombo(settings.holdHotkey);
      writeToWhisper(`SET_HOLD_KEYS ${pyCombo}\n`);
      // Send experimental settings
      sendExperimentalSettings();
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
      
      // Handle live partial updates - TYPE INCREMENTALLY FOR INSTANT OUTPUT
      if (raw.startsWith('PARTIAL:')) {
        const partial = raw.slice(8).trim();
        try { mainWindow.webContents.send('transcription-partial', partial); } catch (e) {}
        
        // Check if continuous dictation is enabled
        const continuousDictationEnabled = isContinuousDictationEnabled();
        
        // INSTANT TYPING: Type partials incrementally as they arrive
        // This gives Wispr Flow-like instant feedback while still recording
        // Window is already hidden when recording starts, so we can type immediately
        // CRITICAL: This also handles the instant partial sent on RELEASE/STOP for instant output
        if (partial && partial.length > 0) {
          // Apply style transformation to partial text (async)
          // For partials, use rule-based for speed (LLM would be too slow for live typing)
          const transformedPartial = applyStyle(partial, getTextStyle(), getTextStyleCategory());
          
          // Don't type if this is Notes tab recording - text should only go to Notes UI
          if (isNotesRecording) {
            // Notes recording: Don't type, just send to UI
            console.log('Notes recording: skipping auto-type, sending to Notes UI');
          } else if (continuousDictationEnabled && isRecording) {
            // Continuous dictation mode: Type partials live/incrementally while dictating
            console.log('Continuous dictation: typing partials live');
            typeIncrementalText(transformedPartial, true); // true = isPartial
          } else if (!continuousDictationEnabled && isRecording) {
            // Normal mode (continuous dictation OFF): Don't type partials, wait for final
            console.log('Normal mode: storing partial, waiting for final transcription');
            // Don't type - wait for final transcription
          } else {
            // Release partial (recording stopped): Type immediately
            // Check if this is a release partial (comes right after RELEASE event)
            const isReleasePartial = !isRecording; // If recording stopped, this is a release partial
            
            if (isReleasePartial) {
              // RELEASE PARTIAL: Type immediately for instant output (like Wispr Flow)
              // Don't do complex delta - just type what's new or type everything if needed
              if (!lastTypedText || !transformedPartial.startsWith(lastTypedText)) {
                // Type everything for instant output on release
                typeStringRobot(transformedPartial);
                lastTypedText = transformedPartial;
              } else {
                // Type only the delta
                const delta = transformedPartial.slice(lastTypedText.length);
                if (delta && delta.trim().length > 0) {
                  typeStringRobot(delta);
                  lastTypedText = transformedPartial;
                }
              }
            }
          }
        }
        continue;
      }
      // Immediate release event: hide indicator INSTANTLY - ULTRA FAST
      if (raw.startsWith('EVENT:')) {
        const evt = raw.slice(6).trim().toUpperCase();
        if (evt === 'READY') {
          // Model is loaded and ready
          whisperModelReady = true;
          if (logger) logger.whisper('Whisper model loaded and ready', { model: settings.activeModel });
          console.log('✓ Whisper model ready');
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('whisper-ready', { model: settings.activeModel });
          }
          
          // Send experimental settings when model is ready
          sendExperimentalSettings();
          
          // Execute any pending recording action
          if (pendingRecordingAction) {
            console.log('⚡ Executing queued recording action');
            const action = pendingRecordingAction;
            pendingRecordingAction = null;
            
            // Execute the queued action immediately
            setImmediate(() => {
              action();
            });
          }
          continue;
        }
        if (evt === 'ERROR') {
          // Model failed to load
          if (logger) logger.whisperError('Whisper model failed to load');
          console.error('✗ Whisper model failed to load');
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('whisper-error', 'Model failed to load. Please check your model files.');
          }
          continue;
        }
        if (evt === 'MODEL_NOT_READY') {
          // Model not ready yet - show notification
          whisperModelReady = false;
          if (logger) logger.whisper('Model not ready, blocking dictation attempt');
          console.log('⏳ Model still loading, please wait...');
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('show-message', {
              type: 'warning',
              message: 'Please wait, loading model...',
              duration: 2000
            });
          }
          // Hide indicator since recording didn't start
          hideIndicator();
          isRecording = false;
          continue;
        }
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
          
          // INSTANT TYPING: If we have partial text, type it immediately on release
          // This gives Wispr Flow-like instant output while final transcription processes
          // The partial will come right after RELEASE event, so we'll type it then
          // Don't wait - partial typing happens in the PARTIAL handler below
        }
        continue;
      }
      // Regular transcription text (final text after release/stop)
      const text = raw;
      if (text) {
        console.log('Received final transcription text:', text);
        
        // Apply style transformation to final text (async - may use LLM if enabled)
        transformText(text).then(transformedText => {
          // Ensure text is available for manual paste as a fallback (use transformed text)
          try { clipboard.writeText(transformedText); } catch (e) {}
          appendHistory(transformedText);
          mainWindow.webContents.send('transcription', transformedText);
          
          // Check if continuous dictation is enabled
          const continuousDictationEnabled = isContinuousDictationEnabled();
          
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
          
          // Typing logic based on continuous dictation mode
          // Don't type if this is Notes tab recording - text should only go to Notes UI
          try {
            if (transformedText && transformedText.trim()) {
              if (isNotesRecording) {
                // Notes recording: Don't type, just send to UI (already sent above)
                console.log('Notes recording: skipping auto-type, text sent to Notes UI');
                // Reset for next transcription
                lastTypedText = '';
                // Ensure app stays in foreground after notes dictation completes
                if (mainWindow && !mainWindow.isDestroyed()) {
                  if (!mainWindow.isVisible()) {
                    mainWindow.show();
                  }
                  mainWindow.focus();
                  mainWindow.setAlwaysOnTop(false);
                }
              } else if (continuousDictationEnabled) {
                // Continuous dictation mode: We already typed partials live, so just type any remaining delta
                // This handles the case where final transcription might have slight differences
                const typedDelta = typeIncrementalText(transformedText, false); // false = final text
                
                // If no delta (everything was already typed from partials), we're done
                if (!typedDelta || typedDelta.trim().length === 0) {
                  if (lastTypedText === transformedText) {
                    console.log('✓ Continuous dictation: All text already typed from live partials');
                  }
                } else {
                  console.log(`✓ Continuous dictation: Typed final delta: "${typedDelta}"`);
                }
                
                // Reset for next transcription
                lastTypedText = '';
              } else {
                // Normal mode (continuous dictation OFF): Type the complete final transcription
                // We didn't type any partials, so type everything now
                console.log('Normal mode: typing complete final transcription');
                typeStringRobot(transformedText);
                lastTypedText = transformedText;
                
                // Reset for next transcription
                lastTypedText = '';
              }
            }
          } catch (e) {
            console.error('Failed to type text:', e);
            // Fallback: ensure text is in clipboard (unless Notes recording)
            if (!isNotesRecording) {
              try {
                clipboard.writeText(transformedText);
              } catch (clipErr) {
                console.error('Failed to copy to clipboard:', clipErr);
              }
            }
            // Reset on error
            lastTypedText = '';
          }
        }).catch(error => {
          console.error('Error transforming text:', error);
          // Fallback to rule-based transformation
          const fallbackText = applyStyle(text, getTextStyle(), getTextStyleCategory());
          try { clipboard.writeText(fallbackText); } catch (e) {}
          appendHistory(fallbackText);
          mainWindow.webContents.send('transcription', fallbackText);
          // Don't type if this is Notes tab recording - keep window visible
          if (isNotesRecording) {
            console.log('Notes recording: skipping auto-type in error handler, keeping window visible');
            // Ensure app stays in foreground after notes dictation completes
            if (mainWindow && !mainWindow.isDestroyed()) {
              if (!mainWindow.isVisible()) {
                mainWindow.show();
              }
              mainWindow.focus();
              mainWindow.setAlwaysOnTop(false);
            }
          } else {
            typeStringRobot(fallbackText);
          }
        });
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

// Function to get continuous dictation setting
function isContinuousDictationEnabled() {
  const appSettingsPath = path.join(app.getPath('userData'), 'app-settings.json');
  try {
    if (fs.existsSync(appSettingsPath)) {
      const raw = fs.readFileSync(appSettingsPath, 'utf8');
      const appSettings = JSON.parse(raw);
      return appSettings.continuous_dictation || false;
    }
  } catch (e) {
    console.error('Error loading app settings for continuous dictation:', e);
  }
  return false;
}

// Function to get text style setting
function getTextStyle() {
  const appSettingsPath = path.join(app.getPath('userData'), 'app-settings.json');
  try {
    if (fs.existsSync(appSettingsPath)) {
      const raw = fs.readFileSync(appSettingsPath, 'utf8');
      const appSettings = JSON.parse(raw);
      return appSettings.text_style || 'none';
    }
  } catch (e) {
    console.error('Error loading app settings for text style:', e);
  }
  return 'none';
}

// Function to detect context and update category automatically
async function detectAndUpdateContext() {
  try {
    const detectedCategory = await detectContextCategory();
    if (detectedCategory) {
      const appSettingsPath = path.join(app.getPath('userData'), 'app-settings.json');
      let appSettings = {};
      if (fs.existsSync(appSettingsPath)) {
        const raw = fs.readFileSync(appSettingsPath, 'utf8');
        appSettings = JSON.parse(raw);
      }
      // Only update if different from current
      if (appSettings.text_style_category !== detectedCategory) {
        appSettings.text_style_category = detectedCategory;
        fs.writeFileSync(appSettingsPath, JSON.stringify(appSettings, null, 2));
        console.log(`✓ Auto-detected context: ${detectedCategory}`);
        // Notify renderer to update UI if style page is open
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('style-category-auto-updated', detectedCategory);
        }
      }
      return detectedCategory;
    }
  } catch (e) {
    console.warn('Context detection failed:', e.message);
  }
  return null;
}

// Helper function to detect context category (same logic as IPC handler)
function detectContextCategory() {
  return new Promise((resolve) => {
    try {
      // Get active window information
      // On Windows, use PowerShell to get the active window title
      if (process.platform === 'win32') {
        const psCommand = `powershell -Command "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Win32 { [DllImport(\\\"user32.dll\\\")] public static extern IntPtr GetForegroundWindow(); [DllImport(\\\"user32.dll\\\")] public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count); } $hwnd = [Win32]::GetForegroundWindow(); $sb = New-Object System.Text.StringBuilder 256; [Win32]::GetWindowText($hwnd, $sb, $sb.Capacity) | Out-Null; $sb.ToString()"`;
        try {
          const activeWindowTitle = execSync(psCommand, { encoding: 'utf8', timeout: 1000 }).trim().toLowerCase();
          
          // Map window titles to categories
          const emailApps = ['outlook', 'gmail', 'thunderbird', 'mail', 'apple mail', 'spark'];
          const workMessengers = ['slack', 'teams', 'microsoft teams', 'discord', 'zoom'];
          const personalMessengers = ['whatsapp', 'telegram', 'signal', 'messenger', 'imessage', 'messages'];
          
          if (emailApps.some(app => activeWindowTitle.includes(app))) {
            resolve('email');
            return;
          } else if (workMessengers.some(app => activeWindowTitle.includes(app))) {
            resolve('work');
            return;
          } else if (personalMessengers.some(app => activeWindowTitle.includes(app))) {
            resolve('personal');
            return;
          }
        } catch (e) {
          console.warn('Context detection command failed:', e.message);
        }
      } else if (process.platform === 'darwin') {
        // macOS - use AppleScript
        try {
          const script = `osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`;
          const activeApp = execSync(script, { encoding: 'utf8', timeout: 1000 }).trim().toLowerCase();
          
          const emailApps = ['mail', 'outlook', 'spark', 'airmail'];
          const workMessengers = ['slack', 'microsoft teams', 'zoom'];
          const personalMessengers = ['messages', 'whatsapp', 'telegram', 'signal'];
          
          if (emailApps.some(app => activeApp.includes(app))) {
            resolve('email');
            return;
          } else if (workMessengers.some(app => activeApp.includes(app))) {
            resolve('work');
            return;
          } else if (personalMessengers.some(app => activeApp.includes(app))) {
            resolve('personal');
            return;
          }
        } catch (e) {
          console.warn('Context detection failed on macOS:', e.message);
        }
      }
      
      // Default to null if no match (don't change category)
      resolve(null);
    } catch (e) {
      console.warn('Context detection failed:', e.message);
      resolve(null);
    }
  });
}

// Function to get text style category
function getTextStyleCategory() {
  const appSettingsPath = path.join(app.getPath('userData'), 'app-settings.json');
  try {
    if (fs.existsSync(appSettingsPath)) {
      const raw = fs.readFileSync(appSettingsPath, 'utf8');
      const appSettings = JSON.parse(raw);
      return appSettings.text_style_category || 'personal';
    }
  } catch (e) {
    console.error('Error loading app settings for text style category:', e);
  }
  return 'personal';
}

// Function to check if LLM processing is enabled
function isLLMProcessingEnabled() {
  const appSettingsPath = path.join(app.getPath('userData'), 'app-settings.json');
  try {
    if (fs.existsSync(appSettingsPath)) {
      const raw = fs.readFileSync(appSettingsPath, 'utf8');
      const appSettings = JSON.parse(raw);
      return appSettings.llm_processing || false;
    }
  } catch (e) {
    console.error('Error loading app settings for LLM processing:', e);
  }
  return false;
}

// Function to ensure LLM service is running
function ensureLLMService() {
  if (llmProcess && !llmProcess.killed) {
    return true;
  }

  const pythonCmd = findPythonExecutable();
  if (!pythonCmd) {
    console.warn('Python not found, LLM service unavailable');
    return false;
  }

  const llmScript = path.join(__dirname, 'llm_service.py');
  if (!fs.existsSync(llmScript)) {
    console.warn('LLM service script not found');
    return false;
  }

  try {
    llmProcess = spawn(pythonCmd, [llmScript], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: __dirname
    });

    llmProcess.stdout.setEncoding('utf8');
    llmProcess.stderr.setEncoding('utf8');
    llmProcessReady = false;

    // Check if model exists and load it
    llmProcess.stdin.write('CHECK\n');
    
    llmProcess.stdout.once('data', (data) => {
      try {
        const result = JSON.parse(data.toString().trim());
        if (result.exists && result.ready) {
          llmProcessReady = true;
          console.log('✓ LLM service ready');
        } else if (result.exists) {
          // Model exists but not loaded, try to load
          llmProcess.stdin.write('LOAD\n');
        }
      } catch (e) {
        // Not JSON, ignore
      }
    });

    llmProcess.stderr.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('loaded successfully')) {
        llmProcessReady = true;
        console.log('✓ LLM model loaded');
      }
    });

    llmProcess.on('exit', (code) => {
      console.log('LLM service exited with code', code);
      llmProcess = null;
      llmProcessReady = false;
    });

    return true;
  } catch (error) {
    console.error('Failed to start LLM service:', error);
    llmProcess = null;
    return false;
  }
}

// Function to transform text using LLM service
async function transformTextWithLLM(text, style, category = 'personal') {
  if (!llmProcess || llmProcess.killed) {
    if (!ensureLLMService()) {
      return null;
    }
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(null); // Timeout after 5 seconds
    }, 5000);

    const onData = (data) => {
      clearTimeout(timeout);
      llmProcess.stdout.removeListener('data', onData);
      const transformed = data.toString().trim();
      resolve(transformed || null);
    };

    llmProcess.stdout.once('data', onData);
    // Send category along with style
    llmProcess.stdin.write(`TRANSFORM:${style}:${category}:${text}\n`);

    // Fallback timeout
    setTimeout(() => {
      clearTimeout(timeout);
      llmProcess.stdout.removeListener('data', onData);
      resolve(null);
    }, 5000);
  });
}

// Function to transform text based on style settings
async function transformText(text) {
  if (!text || !text.trim()) {
    return text;
  }

  const style = getTextStyle();
  const category = getTextStyleCategory();
  const useLLM = isLLMProcessingEnabled();

  // Try LLM transformation if enabled (only for final transcriptions, not partials)
  if (useLLM) {
    try {
      const transformed = await transformTextWithLLM(text, style, category);
      if (transformed && transformed !== text && transformed.length > 0) {
        console.log('✓ Text transformed using local LLM');
        return transformed;
      }
    } catch (error) {
      console.warn('LLM transformation failed, falling back to rule-based:', error.message);
    }
  }

  // Fall back to rule-based style transformation
  return applyStyle(text, style, category);
}

// Function to send experimental settings to whisper service
function sendExperimentalSettings() {
  if (!whisperProcess || whisperProcess.killed) {
    return;
  }
  
  // Load app settings to get experimental feature values
  const appSettingsPath = path.join(app.getPath('userData'), 'app-settings.json');
  let appSettings = {};
  try {
    if (fs.existsSync(appSettingsPath)) {
      const raw = fs.readFileSync(appSettingsPath, 'utf8');
      appSettings = JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading app settings for experimental features:', e);
  }
  
  // Send experimental settings
  const continuousDictation = appSettings.continuous_dictation || false;
  const lowLatency = appSettings.low_latency || false;
  const noiseReduction = appSettings.noise_reduction || false;
  
  writeToWhisper(`SET_CONTINUOUS_DICTATION ${continuousDictation}\n`);
  writeToWhisper(`SET_LOW_LATENCY ${lowLatency}\n`);
  writeToWhisper(`SET_NOISE_REDUCTION ${noiseReduction}\n`);
}

function registerHotkeys() {
  globalShortcut.unregisterAll();
  const holdAcc = settings.holdHotkey || 'CommandOrControl+Super+Space';
  const toggleAcc = settings.toggleHotkey || 'CommandOrControl+Shift+Space';
  const notesAcc = settings.notesHotkey || 'CommandOrControl+Super+N';

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

  // Register notes hotkey - only works when in notes tab or navigates to it
  const regNotes = globalShortcut.register(notesAcc, () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Send message to renderer to handle notes hotkey
      mainWindow.webContents.send('notes-hotkey-pressed');
    }
  });
  if (!regNotes) {
    if (mainWindow) mainWindow.webContents.send('hotkey-error', notesAcc);
  } else {
    if (mainWindow) mainWindow.webContents.send('hotkey-registered', notesAcc);
  }
}

// function setupAutoUpdater() {
//   // Only check for updates in production (not in test mode)
//   if (isTestMode || !app.isPackaged) {
//     return;
//   }
//
//   // autoUpdater.checkForUpdatesAndNotify();
//
//   // autoUpdater.on('update-downloaded', () => {
//   //   dialog.showMessageBox({
//   //     type: 'info',
//   //     title: 'Update Ready',
//   //     message: 'A new version has been downloaded. Restart to apply the update?',
//   //     buttons: ['Restart', 'Later']
//   //   }).then(result => {
//   //     if (result.response === 0) {
//   //       autoUpdater.quitAndInstall();
//   //     }
//   //   });
//   // });
//
//   // autoUpdater.on('error', (error) => {
//   //   console.error('Auto-updater error:', error);
//   // });
// }

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
  
  // Detect context and update category automatically (non-blocking)
  detectAndUpdateContext().catch(e => {
    console.warn('Context detection failed during recording start:', e.message);
  });
  
  // If model not ready, queue this action and show subtle indicator
  if (!whisperModelReady) {
    console.log('⚡ Model loading... queuing recording action');
    
    // Show indicator immediately for responsive feel
    showIndicator();
    
    // Queue the recording to start when model is ready
    pendingRecordingAction = () => {
      // Reset and execute actual recording
      isHoldKeyPressed = true;
      isRecording = true;
  lastTypedText = ''; // Reset typing state for new recording
      typedSoFar = '';
      
      mainWindow.hide();
      mainWindow.webContents.send('recording-start');
      mainWindow.webContents.send('play-sound', 'start');
      
      ensureWhisperService();
      
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
      
      if (whisperProcess && !whisperProcess.killed) {
        writeToWhisper(`SET_MODE HOLD\n`);
        const pyCombo = electronToPythonCombo(settings.holdHotkey);
        writeToWhisper(`SET_HOLD_KEYS ${pyCombo}\n`);
        writeToWhisper('START\n');
      }
    };
    
    return; // Recording will start when model is ready
  }
  
  isHoldKeyPressed = true;
  isRecording = true;
  lastTypedText = ''; // Reset typing state for new recording
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
  // If model not ready, queue this action and show indicator
  if (!whisperModelReady) {
    console.log('⚡ Model loading... queuing toggle recording');
    
    // Show indicator immediately for responsive feel
    showIndicator();
    
    // Queue the recording to start when model is ready
    pendingRecordingAction = () => {
      isRecording = true;
  lastTypedText = ''; // Reset typing state for new recording
      typedSoFar = '';
      
      mainWindow.hide();
      ensureWhisperService();
      
      mainWindow.webContents.send('recording-start');
      mainWindow.webContents.send('play-sound', 'start');
      
      if (whisperProcess && !whisperProcess.killed) {
        writeToWhisper(`SET_MODE TOGGLE\n`);
        writeToWhisper('START\n');
      }
    };
    
    return; // Recording will start when model is ready
  }
  
  isRecording = true;
  lastTypedText = ''; // Reset typing state for new recording
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
    // Detect context and update category automatically (non-blocking)
    detectAndUpdateContext().catch(e => {
      console.warn('Context detection failed during recording start:', e.message);
    });
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

// Notes tab recording - doesn't hide window, stays in app
let isNotesRecording = false;

function startNotesRecording() {
  // If model not ready, queue this action
  if (!whisperModelReady) {
    console.log('⚡ Model loading... queuing notes recording');
    
    // Queue the recording to start when model is ready
    pendingRecordingAction = () => {
      isNotesRecording = true;
      isRecording = true; // Set global flag for transcription handling
      lastTypedText = '';
      typedSoFar = '';
      
      // DON'T hide window - stay in app
      // DON'T show indicator - keep it within Notes tab only
      ensureWhisperService();
      
      // Send UI updates but don't show indicator widget
      mainWindow.webContents.send('recording-start');
      mainWindow.webContents.send('play-sound', 'start');
      // Send special flag to indicate this is notes recording
      mainWindow.webContents.send('notes-recording-start');
      
      if (whisperProcess && !whisperProcess.killed) {
        writeToWhisper(`SET_MODE TOGGLE\n`);
        writeToWhisper('START\n');
      }
    };
    
    return;
  }
  
  isNotesRecording = true;
  isRecording = true; // Set global flag for transcription handling
  lastTypedText = '';
  typedSoFar = '';
  
  // DON'T hide window - stay visible in app
  // DON'T show indicator - keep it within Notes tab only
  ensureWhisperService();
  
  // Send UI updates but don't show indicator widget
  mainWindow.webContents.send('recording-start');
  mainWindow.webContents.send('play-sound', 'start');
  // Send special flag to indicate this is notes recording (no indicator)
  mainWindow.webContents.send('notes-recording-start');
  
  // Send commands to start recording
  if (whisperProcess && !whisperProcess.killed) {
    writeToWhisper(`SET_MODE TOGGLE\n`);
    writeToWhisper('START\n');
  } else {
    ensureWhisperService();
    setImmediate(() => {
      if (whisperProcess && !whisperProcess.killed) {
        writeToWhisper(`SET_MODE TOGGLE\n`);
        writeToWhisper('START\n');
      }
    });
  }
}

function stopNotesRecording() {
  if (!isNotesRecording) return;
  
  isNotesRecording = false;
  isRecording = false;
  
  // Send stop events
  mainWindow.webContents.send('recording-stop');
  mainWindow.webContents.send('play-sound', 'stop');
  // Send special flag for notes recording stop
  mainWindow.webContents.send('notes-recording-stop');
  writeToWhisper('STOP\n');
  
  // DON'T hide window - stay in app
  // DON'T show/hide indicator - it was never shown for notes
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

// File watcher for hot reload in development mode
// This ensures changes made by agents in Cursor are reflected immediately
let fileWatchers = [];
let reloadTimeout = null;

function setupFileWatcher() {
  if (!isDevelopment) return;
  
  console.log('🔧 Development mode: Setting up file watcher for hot reload');
  
  const filesToWatch = [
    path.join(__dirname, 'main.js'),
    path.join(__dirname, 'renderer.js'),
    path.join(__dirname, 'preload.js'),
    path.join(__dirname, 'index.html'),
    path.join(__dirname, 'styles.css')
  ];
  
  filesToWatch.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        const watcher = fs.watch(filePath, { persistent: true }, (eventType, filename) => {
          if (eventType === 'change') {
            console.log(`📝 File changed: ${filename} - Reloading...`);
            
            // Debounce reload to avoid multiple rapid reloads
            if (reloadTimeout) {
              clearTimeout(reloadTimeout);
            }
            
            reloadTimeout = setTimeout(() => {
              reloadApp(filePath);
            }, 500); // 500ms debounce
          }
        });
        
        fileWatchers.push(watcher);
        console.log(`👀 Watching: ${path.basename(filePath)}`);
      } catch (e) {
        console.warn(`Failed to watch ${filePath}:`, e.message);
      }
    }
  });
  
  // Watch source directory for style transformer and other modules
  const srcDir = path.join(__dirname, 'src');
  if (fs.existsSync(srcDir)) {
    try {
      const srcWatcher = fs.watch(srcDir, { recursive: true, persistent: true }, (eventType, filename) => {
        if (eventType === 'change' && filename && (filename.endsWith('.js') || filename.endsWith('.json'))) {
          console.log(`📝 Source file changed: ${filename} - Reloading...`);
          
          if (reloadTimeout) {
            clearTimeout(reloadTimeout);
          }
          
          reloadTimeout = setTimeout(() => {
            reloadApp(path.join(srcDir, filename));
          }, 500);
        }
      });
      
      fileWatchers.push(srcWatcher);
      console.log(`👀 Watching source directory: src/`);
    } catch (e) {
      console.warn(`Failed to watch src directory:`, e.message);
    }
  }
}

function reloadApp(changedFile) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.log('Window not available, cannot reload');
    return;
  }
  
  const fileName = path.basename(changedFile);
  console.log(`🔄 Reloading app due to change in: ${fileName}`);
  
  // If main.js changed, we need to restart the entire app
  if (changedFile === path.join(__dirname, 'main.js')) {
    console.log('⚠️  main.js changed - Full restart required. Please restart the app manually.');
    if (mainWindow) {
      mainWindow.webContents.send('show-message', {
        type: 'info',
        message: 'main.js changed - Please restart the app to apply changes',
        duration: 5000
      });
    }
    return;
  }
  
  // For other files, reload the renderer
  try {
    mainWindow.webContents.reload();
    console.log('✅ App reloaded successfully');
  } catch (e) {
    console.error('Failed to reload app:', e);
  }
}

// Cleanup watchers on app quit
app.on('before-quit', () => {
  fileWatchers.forEach(watcher => {
    try {
      watcher.close();
    } catch (e) {
      // Ignore errors during cleanup
    }
  });
  fileWatchers = [];
  if (reloadTimeout) {
    clearTimeout(reloadTimeout);
  }
});

  // Register app event handlers before app is ready
  app.on('activate', () => {
    console.log('📱 App activated - showing/focusing window');
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      // Window exists - show and focus it
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
      // Bring to front
      mainWindow.setAlwaysOnTop(true);
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(false);
        }
      }, 200);
    }
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

  app.whenReady().then(() => {
    // Set development mode detection after app is ready
    isDevelopment = !app.isPackaged || process.env.NODE_ENV === 'development';

    // Prevent multiple instances - must be called after app is ready
    gotTheLock = app.requestSingleInstanceLock();

    if (!gotTheLock) {
      // Another instance is already running, quit this one
      console.log('Another instance is already running. Exiting...');
      app.quit();
      process.exit(0);
    } else {
      // Handle second instance attempts - focus the existing window instead
      app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, focus our window instead
        console.log('Second instance detected - focusing existing window');
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }
          mainWindow.show();
          mainWindow.focus();
          // Bring to front
          mainWindow.setAlwaysOnTop(true);
          setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.setAlwaysOnTop(false);
            }
          }, 100);
        } else {
          // Window not created yet, wait a bit and try again
          setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              if (mainWindow.isMinimized()) {
                mainWindow.restore();
              }
              mainWindow.show();
              mainWindow.focus();
            }
          }, 500);
        }
      });
    }

    // Load settings first to check for custom logs directory
    loadSettings();
    
    // Initialize logger with custom directory if set
    let customLogsDir = null;
    if (settings.logs_directory) {
      customLogsDir = settings.logs_directory;
    }
    logger = getLogger(customLogsDir);
    logger.info('Application starting', { version: app.getVersion() });
    
    // Verify style transformer module is loaded
    console.log('[Main] Style transformer module loaded:', {
      hasApplyStyle: typeof applyStyle === 'function',
      hasGetStyleDescription: typeof getStyleDescription === 'function',
      hasGetStyleExample: typeof getStyleExample === 'function',
      hasGetAvailableStyles: typeof getAvailableStyles === 'function',
      hasGetCategoryBannerText: typeof getCategoryBannerText === 'function'
    });
    
    createWindow();
    createIndicatorWindow();
//     registerHotkeys();
//     setupAutoUpdater();
    
    // Enable hot reload in development mode (for changes made by agents in Cursor)
    if (isDevelopment && !isTestMode) {
      setupFileWatcher();
    }
    
    // Aggressively ensure window is visible when launched (critical for launching from other agents)
    // Multiple checks to guarantee window appears
    if (mainWindow && !mainWindow.isDestroyed() && !isShowcaseMode && !isTestMode) {
      const ensureVisible = () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (!mainWindow.isVisible()) {
            console.log('🔍 App ready: Window not visible, showing now');
            if (mainWindow.isMinimized()) {
              mainWindow.restore();
            }
            mainWindow.show();
            mainWindow.focus();
            // Bring to front
            mainWindow.setAlwaysOnTop(true);
            setTimeout(() => {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.setAlwaysOnTop(false);
              }
            }, 200);
          } else {
            // Window is visible, just ensure focus
            mainWindow.focus();
            mainWindow.moveTop();
          }
        }
      };
      
      // Immediate check
      setTimeout(ensureVisible, 100);
      // Short delay check
      setTimeout(ensureVisible, 500);
      // Medium delay check
      setTimeout(ensureVisible, 1000);
      // Long delay check (last resort)
      setTimeout(ensureVisible, 2000);
    }
    
    // Pre-initialize whisper service for ultra-fast response (skip in test mode)
    if (!isTestMode) {
      ensureWhisperService();
    }

    ipcMain.on('toggle-recording', () => toggleRecording());
    ipcMain.on('notes:start-recording', () => startNotesRecording());
    ipcMain.on('notes:stop-recording', () => stopNotesRecording());
    
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
    
    // Listen for setting changes to hide/show widget
    ipcMain.on('notify-widget-waveform-change', (event, isEnabled) => {
      if (indicatorWindow && !indicatorWindow.isDestroyed()) {
        indicatorWindow.webContents.send('widget-waveform-setting-changed', isEnabled);
        
        // If setting is turned off while widget is visible, hide it
        if (!isEnabled && indicatorState === 'visible') {
          hideIndicator();
        }
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
    if (incoming.notesHotkey) incoming.notesHotkey = normalizeHotkey(incoming.notesHotkey);
    settings = { ...settings, ...incoming };
    saveSettings();
    registerHotkeys();
    // If model changed, restart whisper service
    if (incoming.activeModel && incoming.activeModel !== settings.activeModel) {
      whisperModelReady = false;
      if (whisperProcess && !whisperProcess.killed) {
        whisperProcess.kill();
      }
    }
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
          'App Version': `SONU v${app.getVersion()}`
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
          'App Version': `SONU v${app.getVersion()}`
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

  // Helper function to calculate model recommendation based on system specs
  // Optimized for best UX - recommends one level lower for faster, smoother performance
  function getModelRecommendation(ramGB, cpuCount, gpu = false) {
    let rec;
    
    if (ramGB < 4 || cpuCount <= 2) {
      rec = { 
        family: "Whisper (faster-whisper)", 
        model: "tiny", 
        reason: "Optimized for low-spec systems - fast and responsive" 
      };
    } else if (ramGB < 16 || cpuCount <= 6) {
      rec = { 
        family: "Whisper (faster-whisper)", 
        model: "tiny", 
        reason: "Optimized for speed - instant response with good accuracy" 
      };
    } else if (ramGB < 32) {
      rec = { 
        family: "Whisper (faster-whisper)", 
        model: "small", 
        reason: "Balanced performance - fast response with excellent accuracy" 
      };
    } else {
      rec = { 
        family: "Whisper (faster-whisper)", 
        model: "medium", 
        reason: "High-performance - great accuracy with fast processing" 
      };
    }
    
    rec.note = gpu ? "GPU detected - performance boosted" : "CPU-only mode";
    return rec;
  }

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
        
        return {
          os: process.platform,
          cpu_cores: cpuCount,
          ram_gb: ramGB,
          gpu: gpu,
          recommended: getModelRecommendation(ramGB, cpuCount, gpu)
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
              const cpuCount = os.cpus().length;
              const ramGB = Math.round(os.totalmem() / (1024 ** 3));
              resolve({
                os: process.platform,
                cpu_cores: cpuCount,
                ram_gb: ramGB,
                gpu: false,
                recommended: getModelRecommendation(ramGB, cpuCount, false)
              });
            }
          } else {
            console.error('System profile check failed:', error);
            // Fallback
            const os = require('os');
            const cpuCount = os.cpus().length;
            const ramGB = Math.round(os.totalmem() / (1024 ** 3));
            resolve({
              os: process.platform,
              cpu_cores: cpuCount,
              ram_gb: ramGB,
              gpu: false,
              recommended: getModelRecommendation(ramGB, cpuCount, false)
            });
          }
        });
      });
    } catch (e) {
      console.error('Error getting system profile:', e);
      // Fallback
      const os = require('os');
      const cpuCount = os.cpus().length;
      const ramGB = Math.round(os.totalmem() / (1024 ** 3));
      return {
        os: process.platform,
        cpu_cores: cpuCount,
        ram_gb: ramGB,
        gpu: false,
        recommended: getModelRecommendation(ramGB, cpuCount, false)
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

  // Model definitions for faster-whisper
  // Note: faster-whisper uses model NAMES (not filenames) like "tiny", "base", "small", "medium", "large-v3"
  // faster-whisper automatically downloads from Hugging Face Systran repositories (not ggerganov/whisper.cpp)
  // The filename field is kept for backward compatibility with import functionality
  const MODEL_DEFINITIONS = {
    tiny: { 
      filename: 'tiny',  // faster-whisper model name (not a filename)
      size_mb: 75,
      sha: null,
      description: 'Fastest, lowest accuracy - best for real-time dictation',
      recommended_for: '≤4 cores / <8 GB RAM'
    },
    base: { 
      filename: 'base',  // faster-whisper model name (not a filename)
      size_mb: 142,
      sha: null,
      description: 'Balanced speed & accuracy - recommended for most users',
      recommended_for: '4–8 cores / 8–16 GB RAM'
    },
    small: { 
      filename: 'small',  // faster-whisper model name (not a filename)
      size_mb: 466,
      sha: null,
      description: 'Good accuracy, slower processing',
      recommended_for: '8–12 cores / ≥16 GB RAM'
    },
    medium: { 
      filename: 'medium',  // faster-whisper model name (not a filename)
      size_mb: 1530,
      sha: null,
      description: 'High accuracy, requires significant resources',
      recommended_for: '>12 cores / ≥32 GB RAM'
    },
    large: { 
      filename: 'large-v3',  // faster-whisper model name (not a filename)
      size_mb: 3100,
      sha: null,
      description: 'Best accuracy, very resource-intensive',
      recommended_for: '≥16 cores / 64+ GB RAM'
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

  // NOTE: This function is NOT used for faster-whisper downloads
  // faster-whisper handles downloads automatically from Hugging Face Systran repositories
  // This function is kept for backward compatibility only
  async function getLatestGitHubTag() {
    return 'v1.8.2'; // Not used for faster-whisper
  }

  // NOTE: This function is NOT used for faster-whisper downloads
  // faster-whisper handles downloads automatically from Hugging Face Systran repositories
  // This function is kept for backward compatibility only
  async function getModelSources(modelName) {
    const filename = MODEL_DEFINITIONS[modelName]?.filename;
    if (!filename) {
      throw new Error(`Unknown model: ${modelName}`);
    }

    // faster-whisper downloads from Hugging Face Systran repositories automatically
    // These URLs are NOT used for faster-whisper downloads
    // They are kept for backward compatibility only
    return [];
  }

  // Get manual download URLs for display in UI
  // Note: faster-whisper downloads automatically from Hugging Face Systran repositories
  // These URLs are informational only (faster-whisper handles downloads internally)
  function getManualDownloadUrls() {
    const urls = {};
    for (const [modelName, modelDef] of Object.entries(MODEL_DEFINITIONS)) {
      urls[modelName] = {
        name: modelName,
        filename: modelDef.filename, // This is the model name, not a filename
        size_mb: modelDef.size_mb,
        description: modelDef.description,
        recommended_for: modelDef.recommended_for,
        url: `https://huggingface.co/Systran/faster-whisper-${modelDef.filename}` // Informational only
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

  // Get active model
  ipcMain.handle('model:get-active', async () => {
    try {
      const activeModel = settings.activeModel || 'tiny';
      const modelDef = MODEL_DEFINITIONS[activeModel];
      return {
        success: true,
        model: activeModel,
        description: modelDef ? modelDef.description : 'Unknown model',
        size_mb: modelDef ? modelDef.size_mb : 0,
        ready: whisperModelReady
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  
  // Logging handlers
  ipcMain.handle('logs:get-directory', async () => {
    try {
      if (logger) {
        return { success: true, directory: logger.getLogsDirectory() };
      }
      return { success: false, error: 'Logger not initialized' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  
  ipcMain.handle('logs:get-recent', async (_evt, category, lines) => {
    try {
      if (logger) {
        const logs = logger.getRecentLogs(category || 'main', lines || 100);
        return { success: true, logs };
      }
      return { success: false, error: 'Logger not initialized' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  
  ipcMain.handle('logs:open-directory', async () => {
    try {
      if (logger) {
        const logsDir = logger.getLogsDirectory();
        shell.openPath(logsDir);
        return { success: true };
      }
      return { success: false, error: 'Logger not initialized' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  
  // Logs directory path handlers
  ipcMain.handle('logs:browse-path', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Select Logs Directory'
      });
      
      if (!result.canceled && result.filePaths.length > 0) {
        const selectedPath = result.filePaths[0];
        // Save to settings
        const settingsPath = path.join(__dirname, 'data', 'settings.json');
        let settingsData = {};
        if (fs.existsSync(settingsPath)) {
          try {
            settingsData = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
          } catch (e) {
            console.error('Error reading settings:', e);
          }
        }
        settingsData.logs_directory = selectedPath;
        settings.logs_directory = selectedPath;
        fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
        fs.writeFileSync(settingsPath, JSON.stringify(settingsData, null, 2));
        
        // Update logger directory
        if (logger) {
          logger.setLogsDirectory(selectedPath);
        }
        
        return { success: true, path: selectedPath };
      }
      return { success: false, path: null };
    } catch (e) {
      console.error('Error browsing logs path:', e);
      return { success: false, path: null, error: e.message };
    }
  });
  
  ipcMain.handle('logs:get-path', async () => {
    try {
      if (logger) {
        return { success: true, path: logger.getLogsDirectory() };
      }
      // Return default path if logger not initialized
      const userDataPath = app.getPath('userData');
      const defaultPath = path.join(userDataPath, 'logs');
      return { success: true, path: defaultPath };
    } catch (e) {
      console.error('Error getting logs path:', e);
      return { success: false, path: null, error: e.message };
    }
  });
  
  ipcMain.handle('logs:set-path', async (_evt, logsPath) => {
    try {
      const settingsPath = path.join(__dirname, 'data', 'settings.json');
      let settingsData = {};
      if (fs.existsSync(settingsPath)) {
        try {
          settingsData = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        } catch (e) {
          console.error('Error reading settings:', e);
        }
      }
      settingsData.logs_directory = logsPath;
      settings.logs_directory = logsPath;
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      fs.writeFileSync(settingsPath, JSON.stringify(settingsData, null, 2));
      
      // Update logger directory
      if (logger) {
        const success = logger.setLogsDirectory(logsPath);
        if (!success) {
          return { success: false, error: 'Failed to update logger directory' };
        }
      }
      
      return { success: true };
    } catch (e) {
      console.error('Error setting logs path:', e);
      return { success: false, error: e.message };
    }
  });
  
  // App version handler - always reads from package.json for latest version
  ipcMain.handle('app:get-version', async () => {
    try {
      // Read directly from package.json to get the most up-to-date version
      const packageJsonPath = path.join(__dirname, 'package.json');
      let version = app.getVersion();
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        version = packageJson.version;
      } catch (e) {
        console.warn('Could not read package.json for version:', e.message);
      }
      return { success: true, version };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  
//   // Check for updates handler
//   ipcMain.handle('app:check-updates', async () => {
//     try {
//       if (isTestMode || !app.isPackaged) {
//         return { success: false, error: 'Update checking is only available in packaged apps' };
//       }
//
//       // Check for updates
//       // const result = await autoUpdater.checkForUpdates();
//       return {
//         success: false,
//         updateAvailable: false,
//         currentVersion: app.getVersion(),
//         updateVersion: null
//       };
//     } catch (e) {
//       console.error('Error checking for updates:', e);
//       return { success: false, error: e.message };
//     }
//   });

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
    // CRITICAL: Check if download already in progress
    if (activeDownloadProcess && !activeDownloadProcess.killed) {
      console.warn('⚠️ Download already in progress, rejecting new download request');
      const errorResult = {
        success: false,
        error: 'Download already in progress',
        message: 'Please cancel the current download first before starting a new one'
      };
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('model:error', errorResult);
      }
      return errorResult;
    }
    
    if (logger) logger.download('Model download requested', { modelName });
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

      // Check if model already exists in faster-whisper cache
      // faster-whisper stores models in: ~/.cache/huggingface/hub/models--openai--whisper-{model_name}/
      // On Windows: %LOCALAPPDATA%\.cache\huggingface\hub\models--openai--whisper-{model_name}\
      let hfCacheDir;
      if (process.platform === 'win32') {
        const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
        hfCacheDir = path.join(localAppData, '.cache', 'huggingface', 'hub');
      } else {
        hfCacheDir = path.join(os.homedir(), '.cache', 'huggingface', 'hub');
      }
      
      const modelCacheDir = path.join(hfCacheDir, `models--openai--whisper-${modelName}`);
      if (fs.existsSync(modelCacheDir)) {
        // Model already exists in faster-whisper cache
        console.log(`✓ Model ${modelName} already exists in faster-whisper cache at ${modelCacheDir}`);
        
        // Set as active model
        settings.activeModel = modelName;
        saveSettings();
        if (logger) logger.download('Model already exists, setting as active', { model: modelName, path: modelCacheDir });
        
        // Restart whisper service with this model
        whisperModelReady = false;
        if (whisperProcess && !whisperProcess.killed) {
          whisperProcess.kill();
        }
        
        // Trigger model ready event after restart
        setTimeout(() => {
          ensureWhisperService();
        }, 500);
        
        const cachedResult = {
          success: true,
          model: modelName,
          path: modelCacheDir,
          cache_path: hfCacheDir,
          size_mb: modelDef.size_mb,
          status: 'cached',
          cached: true,
          message: `Model ${modelName.toUpperCase()} is already downloaded and has been activated.`
        };
        
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('model:complete', cachedResult);
        }
        
        return cachedResult;
      }

      // Define target path for the model file
      const targetPath = path.join(downloadPath, modelDef.filename);

      // Use Python offline model downloader for robust, resumable downloads
      const pythonCmd = findPythonExecutable();
      const downloaderScript = path.join(__dirname, 'offline_model_downloader.py');
      
      if (pythonCmd && fs.existsSync(downloaderScript)) {
        try {
          return await new Promise((resolve, reject) => {
            const pythonProcess = spawn(pythonCmd, [downloaderScript, 'download', modelName, downloadPath], {
              cwd: __dirname,
              stdio: ['pipe', 'pipe', 'pipe'],
              shell: process.platform === 'win32',
              windowsHide: true
            });
            
            activeDownloadProcess = pythonProcess;
            
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
                      activeDownloadProcess = null;
                      if (jsonData.success) {
                        // Set as active model
                        settings.activeModel = modelName;
                        saveSettings();
                        
                        // Restart whisper service
                        whisperModelReady = false;
                        if (whisperProcess && !whisperProcess.killed) {
                          whisperProcess.kill();
                        }
                        
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
              console.log('offline_model_downloader stderr:', data.toString().trim());
            });
            
            pythonProcess.on('close', (code) => {
              activeDownloadProcess = null;
              if (code !== 0) {
                // Python downloader failed, fall back to Node.js
                reject(new Error(`Python downloader exited with code ${code}`));
              }
            });
            
            pythonProcess.on('error', (error) => {
              activeDownloadProcess = null;
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
      try {
        console.error('Error in model download handler:', e);
      } catch (err) {
        // Ignore EPIPE errors
      }
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
  
  // Cancel download handler
  ipcMain.handle('model:cancel-download', async () => {
    try {
      if (activeDownloadProcess && !activeDownloadProcess.killed) {
        console.log('🛑 Cancelling active download...');
        
        const processToKill = activeDownloadProcess;
        const processPid = processToKill.pid;
        
        // Clear reference immediately to prevent race conditions
        activeDownloadProcess = null;
        
        // Force kill the process and all its children
        if (process.platform === 'win32') {
          // Windows: Use taskkill with /T to kill process tree (all child processes)
          try {
            const { execSync } = require('child_process');
            try {
              // Kill the entire process tree
              execSync(`taskkill /F /T /PID ${processPid}`, { stdio: 'ignore', timeout: 5000 });
              console.log('✓ Process tree killed with taskkill');
            } catch (taskkillError) {
              // If taskkill fails, try killing just the process
              try {
                execSync(`taskkill /F /PID ${processPid}`, { stdio: 'ignore', timeout: 5000 });
                console.log('✓ Process killed with taskkill (no tree)');
              } catch (e) {
                console.warn('taskkill failed, using Node.js kill:', e.message);
                // Fallback to Node.js kill
                try {
                  processToKill.kill('SIGKILL');
                } catch (killError) {
                  console.error('Failed to kill process:', killError);
                }
              }
            }
          } catch (e) {
            console.warn('taskkill execution failed, using Node.js kill:', e.message);
            // Fallback to SIGKILL
            try {
              processToKill.kill('SIGKILL');
            } catch (killError) {
              console.error('Failed to kill process:', killError);
            }
          }
        } else {
          // Unix: Try to kill process group, then fallback to direct kill
          try {
            // First try to kill the process directly (this should also kill children if they're in the same group)
            processToKill.kill('SIGKILL');
            console.log('✓ Process killed with SIGKILL');
            
            // Also try to kill any child processes using pkill (if available)
            // This is a best-effort attempt to clean up any orphaned processes
            try {
              const { exec } = require('child_process');
              exec(`pkill -P ${processPid} 2>/dev/null || true`, (error) => {
                if (!error) {
                  console.log('✓ Child processes cleaned up');
                }
              });
            } catch (pkillError) {
              // pkill not available or failed, that's okay
            }
          } catch (e) {
            console.error('Failed to kill process:', e);
          }
        }
        
        console.log('🛑 Download process terminated');
        
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('model:error', {
            success: false,
            error: 'Download cancelled by user',
            message: 'Download was cancelled'
          });
        }
        return { success: true, message: 'Download cancelled' };
      }
      return { success: false, message: 'No active download to cancel' };
    } catch (e) {
      console.error('Error cancelling download:', e);
      // Force clear even on error
      activeDownloadProcess = null;
      return { success: false, error: e.message };
    }
  });
  
  // Helper function for Node.js downloader - PRIMARY METHOD NOW
  async function downloadModelWithNodeJS(modelName, modelDef, downloadPath, targetPath) {
    console.log(`📥 Starting download for ${modelName} using Node.js`);
    
    // Get download sources
    const sources = await getModelSources(modelName);
    console.log(`📡 Download sources for ${modelName}:`, sources);
    
    // Send initial progress
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('model:progress', {
        percent: 0,
        bytesDownloaded: 0,
        bytesTotal: modelDef.size_mb * 1024 * 1024,
        downloadedMB: 0,
        totalMB: modelDef.size_mb,
        speedKB: 0,
        message: `Initializing download for ${modelName.toUpperCase()}...`
      });
    }
    
    // Progress callback
    const onProgress = (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        const bytesDownloaded = progress.bytesDownloaded || 0;
        const bytesTotal = progress.bytesTotal || 0;
        mainWindow.webContents.send('model:progress', {
          percent: progress.percent || 0,
          bytesDownloaded: bytesDownloaded,
          bytesTotal: bytesTotal,
          downloadedMB: bytesDownloaded / (1024 * 1024),
          totalMB: bytesTotal / (1024 * 1024),
          speedKB: progress.speedKB || 0,
          message: `Downloading ${modelName.toUpperCase()}... ${progress.percent || 0}%`
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
              // Set as active model and save to settings
              settings.activeModel = modelName;
              saveSettings();
              if (logger) logger.download('Model downloaded and set as active', { model: modelName });
              
              // Restart whisper service with new model
              whisperModelReady = false;
              if (whisperProcess && !whisperProcess.killed) {
                whisperProcess.kill();
              }
              // Service will auto-restart on next use
              
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

      // If no match, try to infer from size (more lenient matching)
      if (!modelName) {
        let bestMatch = null;
        let smallestDiff = Infinity;
        
        for (const [key, def] of Object.entries(MODEL_DEFINITIONS)) {
          const sizeDiff = Math.abs(sourceSizeMB - def.size_mb);
          const percentDiff = sizeDiff / def.size_mb;
          
          // Track the closest match
          if (sizeDiff < smallestDiff) {
            smallestDiff = sizeDiff;
            bestMatch = key;
          }
          
          // Accept if within 15% of expected size
          if (percentDiff < 0.15) {
            modelName = key;
            break;
          }
        }
        
        // If no close match found, use the best match if it's reasonable
        if (!modelName && bestMatch && smallestDiff < 200) { // Within 200 MB
          modelName = bestMatch;
        }
      }

      if (!modelName) {
        return {
          success: false,
          error: 'Cannot identify model',
          message: `Cannot determine model type from file. Size: ${sourceSizeMB.toFixed(1)} MB. Please ensure the file is a valid Whisper model (tiny: 75MB, base: 142MB, small: 466MB, medium: 1530MB, large: 3100MB).`
        };
      }

      const modelDef = MODEL_DEFINITIONS[modelName];
      const targetFilename = modelDef.filename;
      const targetPath = path.join(downloadPath, targetFilename);

      // Check if file already exists at target
      if (fs.existsSync(targetPath)) {
        const existingStats = fs.statSync(targetPath);
        if (Math.abs(existingStats.size - sourceStats.size) < 1024) { // Same file
          console.log(`Model ${modelName} already exists at target location`);
          
          // Set as active model
          settings.activeModel = modelName;
          saveSettings();
          if (logger) logger.download('Imported model (already exists) set as active', { model: modelName, path: targetPath });
          
          // Restart whisper service
          whisperModelReady = false;
          if (whisperProcess && !whisperProcess.killed) {
            whisperProcess.kill();
          }
          
          // Trigger model ready event after restart
          setTimeout(() => {
            ensureWhisperService();
          }, 500);
          
          const existingResult = {
            success: true,
            model: modelName,
            model_display: modelName.toUpperCase(),
            path: targetPath,
            cache_path: downloadPath,
            size_mb: modelDef.size_mb,
            status: 'imported',
            cached: true,
            message: `Model ${modelName.toUpperCase()} (${modelDef.size_mb} MB) was already in the models folder and has been activated!`
          };
          
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('model:complete', existingResult);
          }
          
          return existingResult;
        }
      }

      // Copy file to target location
      console.log(`Importing model ${modelName} from ${sourcePath} to ${targetPath}`);
      if (logger) logger.download('Importing model file', { model: modelName, source: sourcePath, target: targetPath });
      
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

      // Set as active model
      settings.activeModel = modelName;
      saveSettings();
      if (logger) logger.download('Imported model set as active', { model: modelName, path: targetPath });
      
      // Restart whisper service with new model
      whisperModelReady = false;
      if (whisperProcess && !whisperProcess.killed) {
        whisperProcess.kill();
      }
      
      // Trigger model ready event after restart
      setTimeout(() => {
        ensureWhisperService();
      }, 500);

      // Send completion event
      const importResult = {
        success: true,
        model: modelName,
        model_display: modelName.toUpperCase(),
        path: targetPath,
        cache_path: downloadPath,
        size_mb: modelDef.size_mb,
        status: 'imported',
        cached: false,
        message: `Model ${modelName.toUpperCase()} (${modelDef.size_mb} MB) has been imported and activated successfully!`
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
        auto_delete_cache: false,
        text_style: 'none',
        text_style_category: 'personal',
        llm_processing: false
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
      
      // If experimental settings changed, send them to whisper service
      if ('continuous_dictation' in newSettings || 
          'low_latency' in newSettings || 
          'noise_reduction' in newSettings) {
        sendExperimentalSettings();
      }
      
      return updated;
    } catch (e) {
      console.error('Error saving app settings:', e);
      return {};
    }
  });

  // Style transformer IPC handlers
  ipcMain.handle('style:get-description', async (_evt, style, category) => {
    console.log('[Style IPC] get-description called:', style, category);
    try {
      const result = getStyleDescription(style, category);
      console.log('[Style IPC] get-description result:', result);
      return result;
    } catch (e) {
      console.error('[Style IPC] get-description error:', e);
      return 'Style description';
    }
  });

  ipcMain.handle('style:get-example', async (_evt, style, category) => {
    console.log('[Style IPC] get-example called:', style, category);
    try {
      const result = getStyleExample(style, category);
      console.log('[Style IPC] get-example result:', result?.substring(0, 50) + '...');
      return result;
    } catch (e) {
      console.error('[Style IPC] get-example error:', e);
      return 'Example text';
    }
  });

  ipcMain.handle('style:get-available', async (_evt, category) => {
    console.log('[Style IPC] get-available called:', category);
    try {
      const result = getAvailableStyles(category);
      console.log('[Style IPC] get-available result:', result);
      return result;
    } catch (e) {
      console.error('[Style IPC] get-available error:', e);
      // Return fallback styles
      if (category === 'personal') {
        return ['formal', 'casual', 'very_casual'];
      } else {
        return ['formal', 'casual', 'excited'];
      }
    }
  });

  ipcMain.handle('style:get-banner-text', async (_evt, category) => {
    console.log('[Style IPC] get-banner-text called:', category);
    try {
      const result = getCategoryBannerText(category);
      console.log('[Style IPC] get-banner-text result:', result);
      return result;
    } catch (e) {
      console.error('[Style IPC] get-banner-text error:', e);
      return 'This style applies in various apps. Available on desktop in English.';
    }
  });

  // Context detection handler - detects active application and suggests category
  ipcMain.handle('style:detect-context', async () => {
    try {
      // Get active window information
      // On Windows, use PowerShell to get the active window title
      if (process.platform === 'win32') {
        const psCommand = `powershell -Command "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Win32 { [DllImport(\\\"user32.dll\\\")] public static extern IntPtr GetForegroundWindow(); [DllImport(\\\"user32.dll\\\")] public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count); } $hwnd = [Win32]::GetForegroundWindow(); $sb = New-Object System.Text.StringBuilder 256; [Win32]::GetWindowText($hwnd, $sb, $sb.Capacity) | Out-Null; $sb.ToString()"`;
        const activeWindowTitle = execSync(psCommand, { encoding: 'utf8', timeout: 1000 }).trim().toLowerCase();
        
        // Map window titles to categories
        const emailApps = ['outlook', 'gmail', 'thunderbird', 'mail', 'apple mail', 'spark'];
        const workMessengers = ['slack', 'teams', 'microsoft teams', 'discord', 'zoom'];
        const personalMessengers = ['whatsapp', 'telegram', 'signal', 'messenger', 'imessage', 'messages'];
        
        if (emailApps.some(app => activeWindowTitle.includes(app))) {
          return 'email';
        } else if (workMessengers.some(app => activeWindowTitle.includes(app))) {
          return 'work';
        } else if (personalMessengers.some(app => activeWindowTitle.includes(app))) {
          return 'personal';
        }
      } else if (process.platform === 'darwin') {
        // macOS - use AppleScript
        try {
          const script = `osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`;
          const activeApp = execSync(script, { encoding: 'utf8', timeout: 1000 }).trim().toLowerCase();
          
          const emailApps = ['mail', 'outlook', 'spark', 'airmail'];
          const workMessengers = ['slack', 'microsoft teams', 'zoom'];
          const personalMessengers = ['messages', 'whatsapp', 'telegram', 'signal'];
          
          if (emailApps.some(app => activeApp.includes(app))) {
            return 'email';
          } else if (workMessengers.some(app => activeApp.includes(app))) {
            return 'work';
          } else if (personalMessengers.some(app => activeApp.includes(app))) {
            return 'personal';
          }
        } catch (e) {
          console.warn('Context detection failed on macOS:', e.message);
        }
      }
      
      // Default to 'other' if no match
      return 'other';
    } catch (e) {
      console.warn('Context detection failed:', e.message);
      return 'other';
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

});

async function runShowcaseCapture() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.warn('Showcase capture skipped: main window unavailable');
    return;
  }

  await fsp.mkdir(showcaseOutputDir, { recursive: true });
  const scenes = buildShowcaseScenes();
  const captured = [];

  for (const scene of scenes) {
    try {
      if (scene.action) {
        await scene.action();
      }
      await wait(scene.wait || 1200);
      if (!mainWindow || mainWindow.isDestroyed()) break;
      const image = await mainWindow.capturePage();
      const filename = `${scene.id}.png`;
      const filePath = path.join(showcaseOutputDir, filename);
      await fsp.writeFile(filePath, image.toPNG());
      captured.push({ filename, description: scene.description });
      console.log(`Showcase saved: ${filename} (${scene.description})`);
    } catch (error) {
      console.error(`Failed to capture scene ${scene.id}:`, error);
    }
  }

  if (captured.length) {
    console.log(`\nShowcase capture complete. Files saved to ${showcaseOutputDir}`);
    console.log('Scenes:');
    captured.forEach(({ filename, description }) => {
      console.log(` - ${filename}: ${description}`);
    });
    console.log('\nCreate a video by running (requires ffmpeg):');
    console.log('ffmpeg -y -framerate 1 -pattern_type glob -i "assets/showcase/*.png" -c:v libx264 -pix_fmt yuv420p assets/showcase/showcase.mp4');
  } else {
    console.warn('No showcase scenes were captured.');
  }

  setTimeout(() => app.quit(), 800);
}

function buildShowcaseScenes() {
  return [
    {
      id: '01-home',
      description: 'Home overview',
      action: () => showcaseNavigate('home')
    },
    {
      id: '02-dictionary',
      description: 'Dictionary workspace',
      action: () => showcaseNavigate('dictionary')
    },
    {
      id: '03-snippets',
      description: 'Snippets library',
      action: () => showcaseNavigate('snippets')
    },
    {
      id: '04-style',
      description: 'Style presets',
      action: () => showcaseNavigate('style')
    },
    {
      id: '05-notes',
      description: 'Notes dashboard',
      action: () => showcaseNavigate('notes')
    },
    {
      id: '06-settings-general',
      description: 'Settings – General',
      action: () => showcaseNavigateSettings('general')
    },
    {
      id: '07-settings-system',
      description: 'Settings – System',
      action: () => showcaseNavigateSettings('system')
    },
    {
      id: '08-settings-model',
      description: 'Settings – Model selector',
      action: () => showcaseNavigateSettings('model')
    },
    {
      id: '09-settings-themes',
      description: 'Settings – Themes',
      action: () => showcaseNavigateSettings('themes')
    },
    {
      id: '10-home-dark',
      description: 'Home in dark theme',
      action: async () => {
        await showcaseNavigate('home');
        await wait(500);
        await showcaseSetTheme('dark');
      }
    }
  ];
}

function showcaseExec(script) {
  if (!mainWindow || mainWindow.isDestroyed()) return Promise.resolve(false);
  return mainWindow.webContents.executeJavaScript(script, true).catch((error) => {
    console.error('Showcase script error:', error);
    return false;
  });
}

async function showcaseNavigate(page) {
  const clicked = await showcaseExec(`
    (function() {
      const target = document.querySelector('.nav-item[data-page="${page}"]');
      if (target) {
        target.click();
        return true;
      }
      return false;
    })();
  `);
  if (!clicked) {
    console.warn(`Showcase navigation failed for page: ${page}`);
  }
}

async function showcaseNavigateSettings(page) {
  await showcaseNavigate('settings');
  await wait(400);
  const clicked = await showcaseExec(`
    (function() {
      const nav = document.querySelector('.settings-nav-item[data-settings-page="${page}"]');
      if (nav) {
        nav.click();
        return true;
      }
      return false;
    })();
  `);
  if (!clicked) {
    console.warn(`Showcase settings navigation failed for page: ${page}`);
  }
}

async function showcaseSetTheme(theme) {
  const applied = await showcaseExec(`
    (function() {
      const root = document.documentElement;
      const current = root.getAttribute('data-theme') || 'light';
      if (current === '${theme}') {
        return true;
      }
      root.setAttribute('data-theme', '${theme}');
      const toggle = document.querySelector('#theme-toggle-btn, .theme-toggle-btn');
      if (toggle) {
        const aria = toggle.getAttribute('data-theme');
        if (aria !== '${theme}') {
          toggle.setAttribute('data-theme', '${theme}');
        }
      }
      return true;
    })();
  `);
  if (!applied) {
    console.warn(`Showcase theme switch failed for theme: ${theme}`);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

  app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (whisperProcess && !whisperProcess.killed) {
    whisperProcess.kill();
  }
  if (indicatorWindow && !indicatorWindow.isDestroyed()) {
    try { indicatorWindow.destroy(); } catch (e) {}
  }
});
