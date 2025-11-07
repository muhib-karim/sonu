# Version Management Guide

This document explains the versioning structure of SONU.

## Version Structure

```
sonu/
├── versions/
│   ├── v1.0/          # Initial release
│   ├── v2.0/          # Stable release (current production)
│   └── v3.0/          # Development version (active work)
├── [root files]       # Current working files (v3.0)
└── ...
```

## Version Status

### Version 1.0
- **Status**: Archived
- **Location**: `versions/v1.0/`
- **Description**: Initial release with basic functionality

### Version 2.0
- **Status**: ✅ Stable (Production)
- **Location**: `versions/v2.0/`
- **Description**: Professional UI redesign, theme system, enhanced UX
- **Version**: 2.0.0

### Version 3.1
- **Status**: ✅ Stable (Latest)
- **Location**: `versions/v3.1/` and root directory
- **Description**: Bug fixes and improvements for model download and typing
- **Version**: 3.1.0

### Version 3.0
- **Status**: Archived
- **Location**: `versions/v3.0/`
- **Description**: Previous development version
- **Version**: 3.0.0-dev

## Working with Versions

### Current Development (v3.0)

All active development happens in:
- Root directory files (main working files)
- `versions/v3.0/` (backup/snapshot)

### Stable Release (v2.0)

The stable release is preserved in:
- `versions/v2.0/` (complete snapshot)

### Switching Versions

To work on a specific version:

1. **v2.0 (Stable)**: Copy files from `versions/v2.0/` to root
2. **v3.0 (Development)**: Already in root directory

## Version History

- **v3.1.0**: Latest stable (2025-11-07) - Bug fixes and improvements
- **v3.0.0-dev**: Archived (2025-01-XX) - Development version
- **v2.0.0**: Stable release (2025-01-XX) - Professional UI redesign
- **v1.0.0**: Initial release

## Git Workflow

- **main branch**: Contains v2.0 stable code
- **develop branch**: Contains v3.0 development code (when ready)
- **feature branches**: Individual features for v3.0

---

*Last Updated: 2025-01-XX*

