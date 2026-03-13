# SONU Version Control

## Current Versions

| Component | Version | Status |
|-----------|---------|--------|
| **Desktop (Electron)** | 3.7.0 | Stable |
| **Desktop v2 (Tauri)** | 2.2.1 | Stable |

**Last Updated**: 2026-02-28

## Version History

### Desktop v2 (Tauri)

#### Version 2.2.1 (Current)
- Notes mic button: click-to-record with visual recording state
- GitHub Actions: 3 clean workflows replacing 13 broken ones (CI, Build, Release)
- Documentation overhaul: 35+ stale files removed, essential docs rewritten for Tauri v2
- Legacy cleanup: removed Electron-era scripts, runtime artifacts, and stale feature flags

#### Version 2.2.0
- Cloud transcription feature with OpenAI, Groq, and custom provider support
- Professional UI redesign (HomeSettings, CloudTranscriptionSettings, RecordingOverlay)
- Utility class `cn()` for conditional Tailwind CSS merging
- Fixed `write_settings` ownership semantics across 41 call sites
- All 27 vitest tests passing, 16/16 Rust tests passing
- Synced version numbers across package.json, Cargo.toml, and tauri.conf.json
- Graceful error handling for AppDataDirectory and model loading

#### Version 2.1.0
- Parakeet ASR engine integration
- Offline LLM manager for local text processing
- Full settings architecture with per-key updaters

#### Version 2.0.0
- Complete rewrite from Electron to Tauri + Rust
- React 18 frontend with TypeScript, Tailwind CSS 4, Zustand
- Specta-generated type-safe Tauri bindings

### Desktop (Electron)

#### Version 3.7.0 (Current)
- Security audit and hardening
- Comprehensive input validation and error handling
- Removed 40+ debug/test files
- Window state persistence

#### Version 3.6.1
- Instant text output (Wispr parity)
- Model loading and configuration fixes
- Widget position persistence

#### Version 3.6.0
- AI Command Mode ("Magic Edit") with Phi-3 Mini LLM
- Chameleon Mode context awareness
- Dedicated AI settings tab

## Versioning Scheme

SONU follows [Semantic Versioning](https://semver.org/) (SemVer):

- **MAJOR** version (X.0.0): Incompatible API changes
- **MINOR** version (0.X.0): New functionality in a backward compatible manner
- **PATCH** version (0.0.X): Backward compatible bug fixes

## Version Locations

### Tauri App (v2)

| File | Location |
|------|----------|
| `apps/tauri-v2/package.json` | `"version": "2.2.0"` |
| `apps/tauri-v2/src-tauri/Cargo.toml` | `version = "2.2.0"` |
| `apps/tauri-v2/src-tauri/tauri.conf.json` | `"version": "2.2.0"` |

### Desktop App (Electron)

| File | Location |
|------|----------|
| `apps/desktop/package.json` | `"version": "3.7.0"` |
| `README.md` | Badge references |

## Release Process

1. **Development**: Work on features in development branch
2. **Testing**: Run test suite (`bun run test` / `npm test`)
3. **Version Bump**: Update version in all locations listed above
4. **Changelog**: Document all changes in CHANGELOG.md
5. **Commit**: Commit version changes
6. **Tag**: Create git tag: `git tag v2.2.0`
7. **Build**: Build release: `bun run tauri build`
8. **Release**: Push tag and create GitHub release

## Build Information

### Tauri v2
- **Tauri**: 2.9.1
- **Rust**: Edition 2021
- **React**: 18.3.x
- **TypeScript**: 5.6.x
- **Bun**: Package manager

### Desktop (Electron)
- **Electron**: v28.3.3
- **Node.js**: v16.0.0+
- **Python**: 3.8+
- **Platform**: Windows 10/11 (64-bit)

