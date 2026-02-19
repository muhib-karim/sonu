/**
 * Window State Persistence Module
 * 
 * Saves and restores window size, position, and maximized state
 * across app restarts. Prevents windows from opening off-screen.
 * 
 * @module windowState
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { getLogger } = require('../utils/logger');

const logger = getLogger('WindowState');

// State file path
const STATE_FILE = 'window-state.json';

// Default state
const DEFAULT_STATE = {
  main: {
    width: 1200,
    height: 800,
    x: null,
    y: null,
    maximized: false
  },
  widget: {
    width: 200,
    height: 48,
    x: null,
    y: null
  }
};

let currentState = { ...DEFAULT_STATE };

/**
 * Get the state file path
 * @returns {string}
 */
function getStateFilePath() {
  return path.join(app.getPath('userData'), STATE_FILE);
}

/**
 * Load window state from disk
 * @returns {Object}
 */
function loadState() {
  try {
    const statePath = getStateFilePath();
    
    if (!fs.existsSync(statePath)) {
      logger.debug('No window state file found, using defaults');
      return { ...DEFAULT_STATE };
    }

    const data = fs.readFileSync(statePath, 'utf8');
    const loaded = JSON.parse(data);

    // Merge with defaults to ensure all properties exist
    currentState = {
      main: { ...DEFAULT_STATE.main, ...loaded.main },
      widget: { ...DEFAULT_STATE.widget, ...loaded.widget }
    };

    // Validate state
    validateAndFixState();

    logger.debug('Window state loaded', currentState);
    return currentState;
  } catch (error) {
    logger.error('Failed to load window state:', error);
    return { ...DEFAULT_STATE };
  }
}

/**
 * Save window state to disk
 * @param {string} windowName - 'main' or 'widget'
 * @param {Object} state - Window state
 */
function saveState(windowName, state) {
  try {
    if (!currentState[windowName]) {
      logger.warn(`Invalid window name: ${windowName}`);
      return;
    }

    // Update current state
    currentState[windowName] = {
      ...currentState[windowName],
      ...state
    };

    // Validate before saving
    validateAndFixState();

    // Save to disk
    const statePath = getStateFilePath();
    fs.writeFileSync(statePath, JSON.stringify(currentState, null, 2));

    logger.debug(`Window state saved for ${windowName}`);
  } catch (error) {
    logger.error('Failed to save window state:', error);
  }
}

/**
 * Validate and fix window state to prevent off-screen windows
 */
function validateAndFixState() {
  const { screen } = require('electron');
  
  if (!screen) {
    // Screen module not available during early initialization
    return;
  }

  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();

  // Validate main window
  if (currentState.main) {
    // Check if window is within display bounds
    const isWithinDisplays = displays.some(display => {
      const { x, y, width, height } = display.bounds;
      return (
        currentState.main.x >= x - 50 &&
        currentState.main.x <= x + width - 50 &&
        currentState.main.y >= y - 50 &&
        currentState.main.y <= y + height - 50
      );
    });

    if (!isWithinDisplays) {
      logger.warn('Main window position is off-screen, resetting to default');
      currentState.main.x = null;
      currentState.main.y = null;
    }

    // Validate size
    if (currentState.main.width < 400) currentState.main.width = 800;
    if (currentState.main.height < 300) currentState.main.height = 600;
    if (currentState.main.width > 4000) currentState.main.width = 1200;
    if (currentState.main.height > 3000) currentState.main.height = 800;
  }

  // Validate widget window
  if (currentState.widget) {
    const isWithinDisplays = displays.some(display => {
      const { x, y, width, height } = display.bounds;
      return (
        currentState.widget.x >= x - 50 &&
        currentState.widget.x <= x + width - 50 &&
        currentState.widget.y >= y - 50 &&
        currentState.widget.y <= y + height - 50
      );
    });

    if (!isWithinDisplays) {
      logger.warn('Widget position is off-screen, resetting to default');
      currentState.widget.x = null;
      currentState.widget.y = null;
    }
  }
}

/**
 * Get window state for a specific window
 * @param {string} windowName - 'main' or 'widget'
 * @returns {Object}
 */
function getWindowState(windowName) {
  if (!currentState[windowName]) {
    logger.warn(`Invalid window name: ${windowName}`);
    return DEFAULT_STATE.main;
  }
  return { ...currentState[windowName] };
}

/**
 * Reset window state to defaults
 */
function resetState() {
  currentState = { ...DEFAULT_STATE };
  try {
    const statePath = getStateFilePath();
    if (fs.existsSync(statePath)) {
      fs.unlinkSync(statePath);
    }
    logger.info('Window state reset to defaults');
  } catch (error) {
    logger.error('Failed to reset window state:', error);
  }
}

/**
 * Initialize window state module
 */
function initialize() {
  loadState();
  logger.info('Window state manager initialized');
}

module.exports = {
  initialize,
  loadState,
  saveState,
  getWindowState,
  resetState,
  DEFAULT_STATE
};
