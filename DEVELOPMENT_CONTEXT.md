# Development Context Guide

## Current Working Environment

**Default: Desktop App Development**
- **Directory**: `apps/desktop/`
- **Version**: 3.x (Electron)
- **Status**: Active development

## Switching Contexts

### Desktop App (Default)
- **Location**: `apps/desktop/`
- **Commands**: Run from `apps/desktop/` directory
- **Launch**: `cd apps/desktop && npm start`
- **This is the default working environment**

### Mobile App (On Request Only)
- **Location**: `apps/mobile/`
- **Version**: 4+ (Android/iOS)
- **Activation**: Only when explicitly told "work on mobile app" or "switch to mobile"
- **Separate codebase**: Desktop and mobile do not share code

## File Priority Rules

When files exist in multiple locations:

1. **Desktop files**: Always use `apps/desktop/` version
2. **Root files**: Legacy/backup - Do NOT use for active development
3. **Versions folder**: Historical - Read-only reference

## Quick Reference

| Context | Directory | Command | When to Use |
|---------|-----------|---------|-------------|
| Desktop | `apps/desktop/` | `npm start` | Default - Always |
| Mobile | `apps/mobile/` | See mobile docs | Only when explicitly requested |

## Important Notes

- ✅ Always work in `apps/desktop/` for desktop development
- ✅ Only switch to `apps/mobile/` when explicitly asked
- ❌ Do not use root-level files for active development
- ❌ Do not modify files in `versions/` folder

