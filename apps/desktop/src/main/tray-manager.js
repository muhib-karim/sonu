/**
 * Tray Manager Module
 * Handles system tray icon and menu
 */

const { Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { constants } = require('../config');
const { logger } = require('../utils');

const trayLogger = logger.createLogger('TrayManager');
let tray = null;

/**
 * Create the system tray icon and menu
 * @param {Object} settings - Application settings
 * @param {BrowserWindow} mainWindow - Main application window
 * @returns {Tray} The created tray instance
 */
function createTray(settings, mainWindow) {
  const { PATHS, APP_INFO } = constants;
  
  // Load tray icon
  const iconPath = path.join(__dirname, '..', '..', PATHS.TRAY_ICONS, 'mic-16.png');
  let image;
  
  if (fs.existsSync(iconPath)) {
    image = nativeImage.createFromPath(iconPath);
  } else {
    // Base64 fallback
    const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAEUlEQVQ4y2NgGAWDEQwYxAEAAJgABu7xq1EAAAAASUVORK5CYII=';
    image = nativeImage.createFromDataURL(`data:image/png;base64,${base64Png}`);
  }
  
  tray = new Tray(image);
  tray.setToolTip(APP_INFO.NAME);
  
  updateTrayMenu(settings, mainWindow);
  
  // Toggle window on click
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  
  trayLogger.info('Tray created');
  return tray;
}

/**
 * Update the tray context menu
 * @param {Object} settings - Application settings
 * @param {BrowserWindow} mainWindow - Main application window
 */
function updateTrayMenu(settings, mainWindow) {
  const { IPC_CHANNELS } = constants;
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open SONU',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    {
      label: 'Settings...',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send(IPC_CHANNELS.NAVIGATE_TO_SETTINGS);
      }
    },
    { type: 'separator' },
    {
      label: `Version ${require('../../package.json').version}`,
      enabled: false
    },
    {
      label: 'Check for Updates',
      click: () => {
        shell.openExternal(`${constants.APP_INFO.REPOSITORY}/releases`);
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      accelerator: 'CmdOrCtrl+Q',
      click: () => {
        require('electron').app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  trayLogger.debug('Tray menu updated');
}

module.exports = {
  createTray,
  updateTrayMenu
};
