const { app } = require('electron'); console.log('app:', !!app); if (app) { app.on('ready', () => console.log('READY')); } else { process.exit(1); }
