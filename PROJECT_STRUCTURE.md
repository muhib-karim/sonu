# SONU Project Structure

## Overview

This project is organized into separate branches for desktop (v3.x) and mobile (v4+) development.

## Directory Structure

```
SONU/
├── apps/
│   ├── desktop/          # Desktop app (v3.x) - ACTIVE DEVELOPMENT
│   │   ├── main.js       # Main Electron process
│   │   ├── index.html    # Main UI
│   │   ├── renderer.js   # Renderer process
│   │   ├── package.json  # Desktop app dependencies
│   │   └── ...
│   │
│   └── mobile/           # Mobile app (v4+) - Only when explicitly requested
│       ├── android/      # Android native code
│       ├── ios/          # iOS native code
│       └── ...
│
├── versions/             # Historical versions (read-only reference)
│   ├── v1.0/
│   ├── v2.0/
│   ├── v3.0/
│   └── v3.1/
│
├── versions/
│   ├── v1.0/
│   ├── v2.0/
│   ├── v3.0/
│   ├── v3.1/
│   └── v3.legacy/        # Archived root-level files from v3.x development
│       ├── main.js       # Legacy main process
│       ├── index.html    # Legacy UI
│       └── ...           # All other legacy files
│
└── [project files]       # Project-wide documentation and configs
```

## Development Guidelines

### Default: Desktop App Development

**By default, all development work should target `apps/desktop/`**

- Working directory: `apps/desktop/`
- Main entry: `apps/desktop/main.js`
- UI: `apps/desktop/index.html`
- All commands: Run from `apps/desktop/` directory

### Mobile App Development

**Only switch to mobile when explicitly requested**

- When user says "work on mobile app" or "switch to mobile"
- Working directory: `apps/mobile/`
- Mobile app is version 4+ (Android/iOS native)

## Important Rules

1. **Desktop app files are in `apps/desktop/`** - Always use these files
2. **Legacy files are archived in `versions/v3.legacy/`** - Do NOT use these for active development
3. **Root-level is project-wide** - Contains documentation, configs, and app directories only
4. **Version folders are read-only** - Historical reference only
5. **Always verify working directory** - Check you're in the correct `apps/desktop/` or `apps/mobile/` folder

## File Locations

### Desktop App (Active)
- Main process: `apps/desktop/main.js`
- UI: `apps/desktop/index.html`
- Renderer: `apps/desktop/renderer.js`
- Styles: `apps/desktop/styles.css`
- Python service: `apps/desktop/whisper_service.py`
- Package config: `apps/desktop/package.json`

### Mobile App (When requested)
- Android: `apps/mobile/android/`
- iOS: `apps/mobile/ios/`
- Shared: `apps/mobile/whisper.cpp/`

## Commands

### Desktop Development (Default)
```bash
cd apps/desktop
npm install        # Install dependencies
npm start          # Start desktop app
npm test           # Run desktop tests
npm run build      # Build for distribution
```

### Mobile Development (When requested)
```bash
cd apps/mobile
# Follow mobile-specific setup instructions
```

### Project Setup
```bash
# From project root
npm run showcase   # Generate showcase images (requires desktop app)
```
