// Debug test to see what's available
console.log('Starting debug test...');

try {
  const electron = require('electron');
  console.log('Electron loaded, type:', typeof electron);
  console.log('Electron keys:', Object.keys(electron));
  console.log('Electron.app:', typeof electron.app);
  console.log('Electron.BrowserWindow:', typeof electron.BrowserWindow);
} catch (error) {
  console.error('Error loading electron:', error);
}

// Also try the specific destructured import
try {
  const { app } = require('electron');
  console.log('Destructured app:', typeof app);
} catch (error) {
  console.error('Error destructuring:', error);
}