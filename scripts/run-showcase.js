/**
 * Showcase Proxy Entry
 *
 * This file ensures the Showcase runs with the full application
 * (main.js) so that all IPC handlers are registered. It simply sets
 * the SHOWCASE_CAPTURE flag and boots main.js. Capture logic lives
 * inside main.js (runShowcaseCapture / buildShowcaseScenes).
 */

const path = require('path');
process.env.SHOWCASE_CAPTURE = process.env.SHOWCASE_CAPTURE || '1';
require(path.join(__dirname, '..', 'main.js'));
