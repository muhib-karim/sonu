const fs = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');

const svgUrl = 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/mic.svg';
const outDir = path.join(__dirname, '..', 'assets', 'tray');
const svgPath = path.join(outDir, 'mic.svg');
const png16Path = path.join(outDir, 'mic-16.png');
const png32Path = path.join(outDir, 'mic-32.png');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download: ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      })
      .on('error', reject);
  });
}

async function run() {
  ensureDir(outDir);
  console.log('Downloading SVG…');
  await download(svgUrl, svgPath);
  const svgBuffer = fs.readFileSync(svgPath);
  console.log('Converting to PNG 16x16 and 32x32…');
  await sharp(svgBuffer)
    .resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(png16Path);
  await sharp(svgBuffer)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(png32Path);
  console.log('Tray icons saved to', outDir);
}

run().catch((e) => {
  console.error('fetch-tray-icon failed:', e);
  process.exitCode = 1;
});

