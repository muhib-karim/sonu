const electron = require('electron');
console.log('require("electron") type:', typeof electron);
console.log('require("electron") keys:', Object.keys(electron));
console.log('require("electron") value:', electron);

if (typeof electron === 'string') {
    console.log('It returned a string! This means we are in a pure Node.js process, not an Electron process.');
} else {
    const { app } = electron;
    console.log('app is:', app);
    if (app) {
        console.log('Electron app object loaded successfully.');
        app.quit();
    }
}
