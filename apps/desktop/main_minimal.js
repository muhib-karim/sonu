console.log('DEBUG: process.versions:', JSON.stringify(process.versions, null, 2));
console.log('DEBUG: process.execPath:', process.execPath);

try {
  const electron = require('electron');
  console.log('DEBUG: typeof electron:', typeof electron);
  console.log('DEBUG: electron value:', electron);

  if (typeof electron === 'string') {
      console.log('CRITICAL: require("electron") returned a string (path), not the API. We are likely not in the Electron context or it is shadowed.');
  } else {
      const { app } = electron;
      console.log('DEBUG: app present:', !!app);

      if (app) {
          app.whenReady().then(() => {
            console.log('DEBUG: app is ready');
            app.quit();
          });
      } else {
          console.error('CRITICAL: app is undefined on electron object');
      }
  }
} catch (e) {
  console.error('DEBUG: Error requiring electron:', e);
}
