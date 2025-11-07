/**
 * Generate a GIF banner for README using ffmpeg, with a static PNG fallback using Sharp.
 *
 * - Preferred: Use ffmpeg to create a short animated GIF from `assets/showcase/showcase.mp4`
 * - Fallback: Compose a static PNG banner from three screenshots if ffmpeg or video is unavailable
 *
 * Usage: npm run banner
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const showcaseDir = path.join(ROOT, 'assets', 'showcase');
const videoPath = path.join(showcaseDir, 'showcase.mp4');
const gifPalettePath = path.join(showcaseDir, 'banner_palette.png');
const gifOutputPath = path.join(showcaseDir, 'banner.gif');
const pngOutputPath = path.join(showcaseDir, 'banner.png');

function hasFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch (_) {
    return false;
  }
}

function createGifWithFfmpeg() {
  if (!fs.existsSync(videoPath)) {
    console.warn(`[banner] Video not found: ${path.relative(ROOT, videoPath)}. Skipping GIF generation.`);
    return false;
  }
  try {
    console.log('[banner] Generating palette...');
    execSync(`ffmpeg -y -t 6 -i "${videoPath}" -vf "fps=12,scale=960:-1:flags=lanczos,palettegen" "${gifPalettePath}"`, { stdio: 'inherit' });
    console.log('[banner] Creating GIF banner...');
    execSync(`ffmpeg -y -t 6 -i "${videoPath}" -i "${gifPalettePath}" -filter_complex "fps=12,scale=960:-1:flags=lanczos[x];[x][1:v]paletteuse" "${gifOutputPath}"`, { stdio: 'inherit' });
    if (fs.existsSync(gifOutputPath)) {
      console.log(`[banner] GIF generated: ${path.relative(ROOT, gifOutputPath)}`);
      return true;
    }
  } catch (err) {
    console.warn('[banner] ffmpeg failed to generate GIF banner:', err?.message || err);
  }
  return false;
}

async function createStaticPngBanner() {
  const candidates = [
    path.join(showcaseDir, '01_home.png'),
    path.join(showcaseDir, '09_settings.png'),
    path.join(showcaseDir, '12_model_selector.png')
  ].filter(p => fs.existsSync(p));

  if (candidates.length === 0) {
    console.warn('[banner] No screenshots found for static banner. Aborting.');
    return false;
  }

  console.log('[banner] Creating static PNG banner from screenshots...');
  // Read images and resize to uniform height
  const targetHeight = 320;
  const images = await Promise.all(candidates.map(async (p) => {
    const buf = await sharp(p).resize({ height: targetHeight }).toBuffer();
    const meta = await sharp(buf).metadata();
    return { buf, width: meta.width, height: meta.height };
  }));

  const totalWidth = images.reduce((w, img) => w + (img.width || 0), 0);
  const composite = [];
  let x = 0;
  for (const img of images) {
    composite.push({ input: img.buf, top: 0, left: x });
    x += img.width || 0;
  }

  await sharp({ create: { width: totalWidth, height: targetHeight, channels: 3, background: { r: 18, g: 18, b: 18 } } })
    .composite(composite)
    .toFile(pngOutputPath);

  console.log(`[banner] Static banner created: ${path.relative(ROOT, pngOutputPath)}`);
  return true;
}

(async function main() {
  try {
    const ffmpegAvailable = hasFfmpeg();
    let ok = false;
    if (ffmpegAvailable) {
      ok = createGifWithFfmpeg();
    } else {
      console.warn('[banner] ffmpeg not found. Falling back to static PNG banner.');
    }
    if (!ok) {
      await createStaticPngBanner();
    }
    console.log('[banner] Done.');
  } catch (err) {
    console.error('[banner] Unexpected error:', err);
    process.exitCode = 1;
  }
})();