const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Path to the python script
const scriptPath = path.join(__dirname, 'apps/desktop/src/core/python/offline_model_downloader.py');
const downloadPath = path.join(__dirname, 'temp_models');

// Ensure temp dir exists
if (!fs.existsSync(downloadPath)) {
  fs.mkdirSync(downloadPath, { recursive: true });
}

console.log('Testing downloader with script:', scriptPath);
console.log('Download path:', downloadPath);

// We'll try to download 'tiny' model which is small
const pythonProcess = spawn('python', [scriptPath, 'download', 'tiny', downloadPath], {
  env: process.env
});

let output = '';

pythonProcess.stdout.on('data', (data) => {
  const str = data.toString();
  output += str;
  console.log('STDOUT:', str.trim());
});

pythonProcess.stderr.on('data', (data) => {
  console.error('STDERR:', data.toString());
});

pythonProcess.on('close', (code) => {
  console.log(`Process exited with code ${code}`);

  // Clean up
  try {
    if (fs.existsSync(downloadPath)) {
      // fs.rmSync(downloadPath, { recursive: true, force: true });
    }
  } catch (e) {
    console.error('Cleanup failed:', e);
  }
});
