# SONU Version Control

## Current Version

**Version**: 3.5.4  
**Release Date**: 2025-01-XX  
**Status**: Stable

## Version History

### Version 3.5.4 (Current)
- Project cleanup: Removed unnecessary duplicate files and legacy files
- Comprehensive end-to-end testing suite covering all features
- Enhanced test coverage for all tabs, UI features, and functionalities
- Automated showcase generation and GitHub upload
- Documentation updates and improvements

### Version 3.5.3
- Critical fixes for widget display and icon alignment
- Enhanced error handling for whisper service
- Project file organization improvements

### Version 3.5.2
- Performance optimizations with INT8 quantization
- Toggle mode improvements for instant output
- Live partial updates in toggle mode

### Version 3.5.1
- Test environment improvements
- Waveform animation toggle fixes
- Comprehensive E2E test suite

### Version 3.5.0
- Faster-whisper architecture alignment
- Model name standardization
- Cache location detection improvements

## Versioning Scheme

SONU follows [Semantic Versioning](https://semver.org/) (SemVer):

- **MAJOR** version (X.0.0): Incompatible API changes
- **MINOR** version (0.X.0): New functionality in a backward compatible manner
- **PATCH** version (0.0.X): Backward compatible bug fixes

## Version Locations

Version information is stored in:

1. **package.json**: `apps/desktop/package.json` - `"version": "3.5.3"`
2. **README.md**: Badge and version references
3. **CHANGELOG.md**: Detailed change history
4. **Main Process**: `apps/desktop/main.js` - Uses `app.getVersion()`

## Updating Version

To update the version:

1. Update `apps/desktop/package.json`:
   ```json
   {
     "version": "3.5.4"
   }
   ```

2. Update `README.md` badge:
   ```markdown
   [![Version](https://img.shields.io/badge/version-3.5.4-blue.svg)]
   ```

3. Add entry to `CHANGELOG.md`:
   ```markdown
   ## [3.5.4] - YYYY-MM-DD
   ### Added/Fixed/Changed
   - Description of changes
   ```

4. Update this file (`VERSION.md`)

5. Commit with message: `chore: bump version to 3.5.4`

## Release Process

1. **Development**: Work on features in development branch
2. **Testing**: Run test suite (`npm test`)
3. **Version Bump**: Update version in all locations
4. **Changelog**: Document all changes in CHANGELOG.md
5. **Commit**: Commit version changes
6. **Tag**: Create git tag: `git tag v3.5.4`
7. **Build**: Build release: `npm run build`
8. **Release**: Push tag and create GitHub release

## Branch Strategy

- **main**: Stable production releases
- **develop**: Development branch for new features
- **feature/***: Feature branches
- **hotfix/***: Critical bug fixes

## Build Information

- **Electron**: v28.3.3
- **Node.js**: v16.0.0+
- **Python**: 3.8+
- **Platform**: Windows 10/11 (64-bit)

## Version Display

The app displays version information in:
- Settings footer: "SONU v3.5.3"
- System information tab
- About dialog (if implemented)

## Compatibility

### Backward Compatibility

- **Settings**: Settings format remains compatible across minor versions
- **Models**: Model cache locations remain consistent
- **Data Files**: JSON data files maintain backward compatibility

### Breaking Changes

Breaking changes are documented in CHANGELOG.md under the version that introduces them.

## Release Notes Template

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing functionality

### Fixed
- Bug fixes

### Removed
- Deprecated features removed

### Security
- Security fixes
```

