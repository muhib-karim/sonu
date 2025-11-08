#!/usr/bin/env node
// tools/fix_readme_assets.js
//
// Cleans and standardizes image and badge links across markdown files:
// - Scan README.md and docs/**/*.md
// - Convert HTML <img> tags to Markdown images
// - Normalize image paths to `assets/showcase/`
// - Normalize filenames (lowercase, spaces->underscores, .jpeg->.jpg)
// - Validate GitHub and shields.io badge URLs (HEAD requests)
// - Replace broken shields with sane default pattern
// - Maintain footer banner links
// - Generate a summary report
//
// Notes:
// - Renames files under `assets/showcase` when needed (no content changes)
// - Skips non-markdown files and external links except shields/github validation

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const ROOT = process.cwd();
const SHOWCASE_DIR = path.join(ROOT, 'assets', 'showcase');
const DOCS_DIR = path.join(ROOT, 'docs');
const README_PATH = path.join(ROOT, 'README.md');

// Summary counters
const summary = {
  filesScanned: 0,
  imagesFixed: 0,
  linksUpdated: 0,
  badgesChecked: 0,
  badgesFixed: 0,
  missingFiles: new Set(),
  renamedFiles: [],
  htmlImgConverted: 0,
  notes: [],
};

function log(msg) {
  console.log(msg);
}

function normalizeFileName(name) {
  const ext = path.extname(name).toLowerCase();
  let base = path.basename(name, path.extname(name)).toLowerCase().replace(/\s+/g, '_');
  let fixedExt = ext;
  if (ext === '.jpeg') fixedExt = '.jpg';
  if (!['.png', '.jpg'].includes(fixedExt)) {
    // keep original ext if uncommon, but prefer .png
    fixedExt = ['.png', '.jpg'].includes(ext) ? ext : '.png';
  }
  return `${base}${fixedExt}`;
}

function ensureShowcasePath(urlPath) {
  // Normalize slashes and strip leading ./ or /
  let p = urlPath.replace(/^\.?\/+/, '').replace(/\\/g, '/');
  // Common case transformations
  p = p.replace(/Assets|Showcase/gi, 'assets/showcase');
  // Remove duplicated segments
  p = p.replace(/\.\/assets\/showcase\//g, 'assets/showcase/');
  p = p.replace(/assets\/assets\//g, 'assets/');
  // Keep only filename under showcase
  const fname = path.posix.basename(p);
  const norm = normalizeFileName(fname);
  return `assets/showcase/${norm}`;
}

function headRequest(url) {
  return new Promise((resolve) => {
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      resolve({ ok: false, statusCode: 0 });
    }, 5000);
    try {
      const req = https.request(url, { method: 'HEAD' }, (res) => {
        if (timedOut) return;
        clearTimeout(timeout);
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, statusCode: res.statusCode });
      });
      req.on('error', () => {
        if (timedOut) return;
        clearTimeout(timeout);
        resolve({ ok: false, statusCode: 0 });
      });
      req.end();
    } catch (e) {
      if (!timedOut) clearTimeout(timeout);
      resolve({ ok: false, statusCode: 0 });
    }
  });
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return null;
  }
}

function writeFileSafe(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

function convertHtmlImgToMarkdown(content) {
  // Preserve images inside HTML tables; GitHub does not parse markdown inside table cells
  const tableBlocks = [];
  const TABLE_PLACEHOLDER = '__TABLE_BLOCK_' + Date.now() + '_';
  let temp = content.replace(/<table[\s\S]*?<\/table>/gi, (m) => {
    const idx = tableBlocks.push(m) - 1;
    return TABLE_PLACEHOLDER + idx + '__';
  });

  // Convert <img ...> outside tables only
  temp = temp.replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, (match, src) => {
    // If this match was within a table block, it won't exist in temp due to placeholder substitution
    const altMatch = match.match(/alt=["']([^"']+)["']/i);
    const alt = altMatch ? altMatch[1] : path.basename(src);
    const fixedSrc = /^https?:\/\//i.test(src) ? src : ensureShowcasePath(src);
    summary.htmlImgConverted += 1;
    if (!/^https?:\/\//i.test(src)) summary.imagesFixed += 1;
    return `![${alt}](${fixedSrc})`;
  });

  // Restore table blocks unchanged
  temp = temp.replace(new RegExp(TABLE_PLACEHOLDER + '(\\d+)__', 'g'), (_, i) => tableBlocks[Number(i)]);
  return temp;
}

function fixMarkdownImages(filePath) {
  let content = readFileSafe(filePath);
  if (content == null) return false;

  const original = content;
  content = convertHtmlImgToMarkdown(content);

  // Fix markdown image paths: ![alt](url)
  content = content.replace(/!\[[^\]]*\]\(([^)]+)\)/g, (m, url) => {
    // ignore external except local assets; process only relative or assets/showcase
    if (/^https?:\/\//i.test(url)) {
      return m; // external image – leave as is
    }
    const fixed = ensureShowcasePath(url);
    if (fixed !== url) summary.imagesFixed += 1;
    return m.replace(url, fixed);
  });

  // Fix doubled slashes or wrong prefixes
  content = content.replace(/\.\/assets\/showcase\//g, 'assets/showcase/');

  // Badge verification and fix
  // Pattern: [![...](https://img.shields.io/...)](https://github.com/...)
  const badgeRegex = /\[!\[[^\]]*\]\((https:\/\/img\.shields\.io[^)]+)\)\]\((https:\/\/github\.com[^)]+)\)/gi;
  let badgeMatch;
  const badgeReplacements = [];
  while ((badgeMatch = badgeRegex.exec(content)) !== null) {
    const fullMatch = badgeMatch[0];
    const badgeImgUrl = badgeMatch[1];
    const targetUrl = badgeMatch[2];
    summary.badgesChecked += 1;
    badgeReplacements.push({ fullMatch, badgeImgUrl, targetUrl });
  }

  async function processBadges() {
    for (const b of badgeReplacements) {
      const okImg = await headRequest(b.badgeImgUrl);
      const okLink = await headRequest(b.targetUrl);
      if (!okImg.ok || !okLink.ok) {
        // Build a sane fallback badge using alt text as label if possible
        const altMatch = b.fullMatch.match(/\[!\[([^\]]*)\]\(/);
        const labelRaw = altMatch ? altMatch[1] : 'Project';
        const label = encodeURIComponent(labelRaw.replace(/\s+/g, ' '));
        const color = 'blue';
        const fallback = `https://img.shields.io/badge/${label}-${color}?logo=github`;
        const replacement = b.fullMatch.replace(b.badgeImgUrl, fallback);
        content = content.replace(b.fullMatch, replacement);
        summary.badgesFixed += 1;
        summary.linksUpdated += (!okLink.ok ? 1 : 0);
      }
    }
  }

  // Footer banner check (keep URLs valid). We won't rewrite; only note missing.
  const urlRegex = /(https?:\/\/[^\s)]+)(?=[\s)|])/g;
  const footerSectionMatch = content.match(/\n-{3,,}\n/); // not strict; leave as is
  // We won't process specially; links validated globally below.

  // Validate GitHub links generally and record broken ones.
  const allLinks = new Set();
  let linkMatch;
  while ((linkMatch = urlRegex.exec(content)) !== null) {
    const url = linkMatch[1];
    if (/^https:\/\/github\.com\//i.test(url) || /^https:\/\/img\.shields\.io\//i.test(url)) {
      allLinks.add(url);
    }
  }

  async function processLinks() {
    for (const l of allLinks) {
      const ok = await headRequest(l);
      if (!ok.ok) {
        summary.notes.push(`Broken link in ${path.relative(ROOT, filePath)}: ${l}`);
        summary.linksUpdated += 0; // informative only, not auto-fixed
      }
    }
  }

  return { content, original, processBadges, processLinks };
}

function listMarkdownFiles() {
  const files = [];
  // README.md
  if (fs.existsSync(README_PATH)) files.push(README_PATH);
  // docs/**/*.md
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (/\.md$/i.test(entry)) files.push(full);
    }
  }
  walk(DOCS_DIR);
  return files;
}

function buildShowcaseIndex() {
  const idx = new Map();
  if (!fs.existsSync(SHOWCASE_DIR)) return idx;
  for (const f of fs.readdirSync(SHOWCASE_DIR)) {
    const full = path.join(SHOWCASE_DIR, f);
    const stat = fs.statSync(full);
    if (stat.isFile()) {
      idx.set(f.toLowerCase(), full);
    }
  }
  return idx;
}

function ensureShowcaseFileExists(relPath) {
  // relPath like assets/showcase/name.png
  const fname = path.basename(relPath).toLowerCase();
  const idx = buildShowcaseIndex();
  const existing = idx.get(fname);
  if (existing) return existing;
  summary.missingFiles.add(relPath);
  return null;
}

function maybeRenameShowcaseFile(oldRelPath) {
  const oldFull = path.join(ROOT, oldRelPath);
  if (!fs.existsSync(oldFull)) return false;
  const newRel = ensureShowcasePath(oldRelPath);
  const newFull = path.join(ROOT, newRel);
  if (oldFull === newFull) return false;
  // Ensure directory exists
  fs.mkdirSync(path.dirname(newFull), { recursive: true });
  // If destination exists, skip to avoid overwrite
  if (fs.existsSync(newFull)) {
    summary.notes.push(`Skip rename: destination exists ${path.relative(ROOT, newFull)}`);
    return false;
  }
  fs.renameSync(oldFull, newFull);
  summary.renamedFiles.push({ from: path.relative(ROOT, oldFull), to: path.relative(ROOT, newFull) });
  return true;
}

async function main() {
  log('🔎 Scanning markdown files...');
  const files = listMarkdownFiles();
  summary.filesScanned = files.length;
  const processed = [];

  // First pass: rewrite contents
  for (const filePath of files) {
    const result = fixMarkdownImages(filePath);
    if (!result) continue;
    const { content, original, processBadges, processLinks } = result;
    if (content !== original) {
      writeFileSafe(filePath, content);
      log(`✅ Cleaned ${path.relative(ROOT, filePath)}`);
    } else {
      log(`ℹ️ No changes ${path.relative(ROOT, filePath)}`);
    }
    processed.push({ filePath, processBadges, processLinks });
  }

  // Validate and fix badges/links asynchronously
  for (const p of processed) {
    await p.processBadges();
    await p.processLinks();
    // Write again in case badge replacements occurred
    const content = readFileSafe(p.filePath);
    writeFileSafe(p.filePath, content);
  }

  // Second pass: attempt to rename any referenced files to normalized names
  // Find all local image references again to ensure existence and maybe rename
  for (const filePath of files) {
    const content = readFileSafe(filePath);
    if (!content) continue;
    const imgRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
    let m;
    while ((m = imgRegex.exec(content)) !== null) {
      const url = m[1];
      if (/^https?:\/\//i.test(url)) continue; // external skip
      const full = path.join(ROOT, url);
      if (fs.existsSync(full)) {
        // ensure normalized naming
        maybeRenameShowcaseFile(url);
      } else {
        ensureShowcaseFileExists(url);
      }
    }
  }

  // Write summary report
  const report = [
    `Markdown cleanup completed on ${new Date().toISOString()}`,
    `Files scanned: ${summary.filesScanned}`,
    `HTML <img> converted: ${summary.htmlImgConverted}`,
    `Images fixed: ${summary.imagesFixed}`,
    `Badges checked: ${summary.badgesChecked}`,
    `Badges fixed: ${summary.badgesFixed}`,
    `Links updated: ${summary.linksUpdated}`,
    `Renamed files: ${summary.renamedFiles.length}`,
  ];
  if (summary.renamedFiles.length) {
    report.push('Renames:');
    for (const r of summary.renamedFiles) report.push(`- ${r.from} -> ${r.to}`);
  }
  if (summary.missingFiles.size) {
    report.push('Missing files:');
    for (const m of summary.missingFiles) report.push(`- ${m}`);
  }
  if (summary.notes.length) {
    report.push('Notes:');
    for (const n of summary.notes) report.push(`- ${n}`);
  }
  const reportText = report.join(os.EOL) + os.EOL;
  const reportPath = path.join(ROOT, 'tools', 'fix_readme_assets.report.txt');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, reportText, 'utf8');
  log('\n📄 Summary Report:\n' + reportText);
}

main().catch((err) => {
  console.error('Error during cleanup:', err);
  process.exitCode = 1;
});