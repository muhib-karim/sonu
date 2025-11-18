# 🚀 Automated Release Guide

SONU uses **GitHub Actions** to automatically build and release Windows installers. Every time you create a new version tag, the build process runs automatically.

## Quick Release Process

### Option 1: Using the Release Script (Recommended)

```bash
cd apps/desktop

# Patch release (3.5.4 -> 3.5.5)
npm run release:patch

# Minor release (3.5.4 -> 3.6.0)
npm run release:minor

# Major release (3.5.4 -> 4.0.0)
npm run release:major
```

The script will:
1. ✅ Bump the version in `package.json`
2. ✅ Create a git commit with the version bump
3. ✅ Create a git tag (e.g., `v3.5.5`)
4. ✅ Push everything to GitHub
5. ✅ **GitHub Actions automatically builds the installer and creates a release**

### Option 2: Manual Release

```bash
# 1. Update version in apps/desktop/package.json
# 2. Commit the change
git add apps/desktop/package.json
git commit -m "Bump version to 3.5.5"

# 3. Create and push tag
git tag -a v3.5.5 -m "Release version 3.5.5"
git push origin main
git push origin v3.5.5
```

## What Happens Automatically

When you push a version tag (e.g., `v3.5.5`):

1. **GitHub Actions triggers** the build workflow
2. **Windows installer is built** automatically on GitHub's servers
3. **GitHub Release is created** with the installer attached
4. **Release notes are generated** automatically

## Monitoring the Build

- **View build progress**: https://github.com/muhib-karim/sonu/actions
- **View releases**: https://github.com/muhib-karim/sonu/releases

## Release Checklist

Before releasing:

- [ ] Update `CHANGELOG.md` with new features/fixes
- [ ] Test the application thoroughly
- [ ] Update version in `apps/desktop/package.json` (or use release script)
- [ ] Run `npm run release:patch` (or minor/major)
- [ ] Monitor GitHub Actions build
- [ ] Verify the release on GitHub

## Version Numbering

- **Patch** (3.5.4 → 3.5.5): Bug fixes, small improvements
- **Minor** (3.5.4 → 3.6.0): New features, backward compatible
- **Major** (3.5.4 → 4.0.0): Breaking changes, major updates

## Troubleshooting

### Build Fails on GitHub Actions

- Check the Actions tab for error messages
- Ensure all dependencies are in `package.json`
- Verify Python dependencies are listed in `requirements.txt`

### Tag Already Exists

If you need to recreate a tag:

```bash
# Delete local tag
git tag -d v3.5.5

# Delete remote tag
git push origin --delete v3.5.5

# Create new tag
git tag -a v3.5.5 -m "Release version 3.5.5"
git push origin v3.5.5
```

## Future: Multi-Platform Builds

When macOS and Linux support is added, the GitHub Actions workflow will automatically build:
- Windows: `.exe` installer
- macOS: `.dmg` installer
- Linux: `.AppImage` and `.deb` packages

All platforms will be included in a single release automatically!

