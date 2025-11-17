# SONU Desktop App (v3.x)

This is the active desktop application development directory.

## Quick Start

```bash
# Install dependencies
npm install

# Start the app (with hot reload enabled)
npm start

# Run tests
npm test
```

## Important Notes

- **This is the active desktop app directory**
- All desktop development should happen here
- Root-level files are legacy and should not be used
- This directory is self-contained with its own `package.json`, `node_modules`, etc.

## Hot Reload & Development

The app includes **automatic hot reload** in development mode. Changes made to files are automatically detected and the app reloads immediately.

**See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed information about:**
- How hot reload works
- File watching system
- Working with multiple agents in Cursor
- Troubleshooting tips

### Quick Summary

- ✅ Changes to `renderer.js`, `preload.js`, `index.html`, `styles.css` → Auto-reload
- ✅ Changes to files in `src/` → Auto-reload
- ⚠️ Changes to `main.js` → Requires manual restart

## Project Structure

- `main.js` - Electron main process
- `index.html` - Main UI
- `renderer.js` - Renderer process
- `preload.js` - Preload script (IPC bridge)
- `styles.css` - Application styles
- `whisper_service.py` - Python transcription service
- `src/` - Source modules (style transformer, etc.)
- `package.json` - Desktop app dependencies

## Version

This is version 3.x of the desktop app. For mobile app (v4+), see `../mobile/`.

## Recent Updates

### Initialization Fixes (Latest)

The app has been updated to ensure all features initialize properly on fresh launches:

- **App Version Display**: Now properly initializes and displays in the Settings sidebar footer
- **Style Tab Functionality**: Category tabs (Personal, Work, Email, Other) initialize correctly when navigating to the Style page
- **Model Tab Functionality**: Model selector loads properly when navigating to Settings → Model tab
- **Notes Tab**: Fully initialized and ready when navigating to the Notes page

All features use robust initialization with retry logic and proper error handling to ensure they work reliably even when launched from new agent sessions.