# 🧠 Automated Screenshot & Video Capture

This automation script uses Playwright to automatically capture screenshots and record videos of the SONU Electron app for GitHub showcase.

## 📋 Features

- ✅ **Automatic App Launch**: Launches Electron app automatically
- ✅ **Full Navigation**: Navigates through all tabs and features
- ✅ **High-Resolution Screenshots**: Captures timestamped screenshots
- ✅ **MP4 Video Recording**: Records walkthrough video
- ✅ **Auto GitHub Upload**: Commits and pushes automatically
- ✅ **Cross-Platform**: Works on Windows, macOS, and Linux

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install playwright
npx playwright install chromium
```

### 2. Run Automation

```bash
npm run auto-screenshots
```

Or directly:

```bash
node auto_screenshot.js
```

### Alternative: Showcase Script (Electron)

If you want curated screenshots saved to `assets/showcase/` with a simple MP4 montage, use:

```bash
npm run showcase
```

This runs `scripts/run-showcase.js` (Electron) and places outputs in `assets/showcase/`.

## 📸 What It Captures

### Main Navigation Tabs
- **Home** - Main application window
- **Dictionary** - Dictionary management page
- **Snippets** - Snippets page
- **Style** - Style page
- **Notes** - Notes page
- **Settings** - Settings page

### Settings Sub-Tabs
- **General** - General settings
- **System** - System information
- **Model Selector** - Model selection and download
- **Themes** - Theme customization
- **Vibe Coding** - Vibe coding settings
- **Experimental** - Experimental features

### Theme Variations
- **Light Theme** - Light mode screenshot
- **Dark Theme** - Dark mode screenshot

## 📁 Output

### Screenshots
- Playwright: `screenshots/`
- Showcase script: `assets/showcase/`
- Format: `{tab_name}_{YYYY-MM-DD_HH-mm-ss}.png`
- Example: `home_2025-01-07_15-30-45.png`

### Video
- Playwright: `recordings/`
- Showcase script: `assets/showcase/showcase.mp4` (via ffmpeg command)
- Format: `app_walkthrough_{YYYY-MM-DD_HH-mm-ss}.mp4`
- Example: `app_walkthrough_2025-01-07_15-30-45.mp4`

## 🔄 GitHub Integration

The script automatically:
1. Captures all screenshots and video
2. Adds them to git
3. Commits with timestamp
4. Pushes to GitHub

If Git credentials are not configured, it will show manual upload instructions.

## ⚙️ Configuration

You can modify the script to:
- Add more tabs/features to capture
- Change screenshot resolution
- Adjust video recording settings
- Customize timing delays

## 🐛 Troubleshooting

### Playwright Not Found
```bash
npm install playwright
npx playwright install chromium
```

### Electron App Won't Launch
- Ensure all dependencies are installed: `npm install`
- Check that `main.js` is in the root directory
- Verify Electron is installed: `npm list electron`

### Playwright Electron Error: `setImmediate is not defined`
- Some environments lack `setImmediate` during Electron launch via Playwright.
- Add a safe polyfill in your test setup or injected script:
  ```js
  global.setImmediate = global.setImmediate || ((fn, ...args) => setTimeout(fn, 0, ...args));
  ```
  This prevents crashes without affecting app behavior.

### Screenshots Not Capturing
- Check that the app window is visible
- Increase wait times in the script
- Verify selectors match your HTML structure

### Git Upload Fails
- Configure Git credentials:
  ```bash
  git config --global user.name "Your Name"
  git config --global user.email "your.email@example.com"
  ```
- Or manually upload:
  ```bash
  git add screenshots recordings
  git commit -m "docs: Add screenshots and video"
  git push origin main
  ```

## 📝 Notes

- The script waits for the app to fully load before capturing
- Each screenshot includes a 1-2 second delay for animations
- Video recording captures the entire navigation sequence
- All files are timestamped for version tracking

## 🔗 Links

- **Repository**: https://github.com/muhib-karim/sonu
- **Screenshots**: https://github.com/muhib-karim/sonu/tree/main/screenshots
- **Recordings**: https://github.com/muhib-karim/sonu/tree/main/recordings

---

**Built with ❤️ using TraeAI IDE and Playwright**

