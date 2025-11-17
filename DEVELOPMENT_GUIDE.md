# SONU Development Guide

## Quick Reference

### Default: Desktop App (v3.x)
- **Location**: `apps/desktop/`
- **Start**: `cd apps/desktop && npm start`
- **This is the default development environment**

### Mobile App (v4+) - Only When Requested
- **Location**: `apps/mobile/`
- **Only work here when explicitly told "work on mobile app"**

## Project Organization

```
SONU/
├── apps/
│   ├── desktop/     ← DEFAULT: Desktop app (v3.x) - Active development here
│   └── mobile/       ← Mobile app (v4+) - Only when requested
│
├── versions/         ← Historical versions (read-only)
└── [root files]     ← Legacy files - Do NOT use for active development
```

## Important Notes

1. **Always use `apps/desktop/` files for desktop development**
2. **Root-level files are legacy** - Ignore them for active work
3. **Version folders are read-only** - Reference only
4. **Mobile is separate** - Only switch when explicitly requested

## File Locations

### Desktop App (Default)
- Main: `apps/desktop/main.js`
- UI: `apps/desktop/index.html`
- Config: `apps/desktop/package.json`

### Mobile App (When Requested)
- Android: `apps/mobile/android/`
- iOS: `apps/mobile/ios/`

