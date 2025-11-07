# Development Guide - Version 3.0

This document provides guidance for developing SONU v3.0.

## Current Status

- **Active Version**: 3.0.0-dev
- **Base Version**: 2.0.0 (stable)
- **Status**: In Development

## Development Environment

### Working Directory

All development happens in the **root directory**. The files here represent v3.0.

### Version Snapshots

- `versions/v2.0/` - Stable v2.0 release (reference)
- `versions/v3.0/` - v3.0 backup/snapshot

## Development Workflow

1. **Make changes** in root directory files
2. **Test thoroughly** before committing
3. **Update documentation** (CHANGELOG.md, README.md)
4. **Commit changes** with clear messages
5. **Periodically backup** to `versions/v3.0/`

## Planned Features for v3.0

### High Priority
- [ ] Multi-language support
- [ ] Custom model selection
- [ ] Advanced audio processing
- [ ] Enhanced analytics dashboard

### Medium Priority
- [ ] Plugin system
- [ ] Cloud sync (optional)
- [ ] Performance optimizations
- [ ] Advanced settings

### Low Priority
- [ ] Mobile companion app
- [ ] API for third-party integrations
- [ ] Enterprise deployment tools

## Code Standards

- Follow existing code patterns
- Add comments for complex logic
- Update CHANGELOG.md for significant changes
- Test on Windows 10 and 11
- Verify all features work in both themes

## Testing Checklist

Before committing:
- [ ] Hotkeys work correctly
- [ ] Theme switching is smooth
- [ ] System-wide typing works
- [ ] History management works
- [ ] Settings page functions correctly
- [ ] Tray icon menu works
- [ ] No console errors

## Version Management

- **v2.0**: Stable, production-ready
- **v3.0**: Development, active work
- Keep versions separate and documented

## Git Workflow

When ready to commit:
```bash
git add .
git commit -m "feat: description of changes"
```

When ready to push:
```bash
git push origin main
```

---

*Happy coding! 🚀*

