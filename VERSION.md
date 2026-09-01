# SONU Version Control

## Current Versions

| Component | Version | Status |
|-----------|---------|--------|
| **Desktop v2 (Tauri)** | 2.3.0 | Stable |

**Last Updated**: 2026-09-02

## Version History

### Desktop v2 (Tauri)

#### Version 2.3.0 (Current)
- Context-aware dictation: adapts LLM post-processing tone to the focused app
- Command Mode: voice-rewrite selected text via global shortcut
- Style settings persisted in the backend settings store and wired into the LLM pipeline
- Licensing experiment fully reverted; project remains 100% free and open-source
- Branding hygiene: outgoing LLM HTTP headers identify as SONU
- Documentation refresh: README, AI_FEATURES, stale-reference cleanup

#### Version 2.2.1
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

### Desktop (Electron) — Removed

The legacy Electron app has been removed from the repository. Its version
history (3.5.x – 3.7.0) is preserved in `CHANGELOG.md`.

## Versioning Scheme

SONU follows [Semantic Versioning](https://semver.org/) (SemVer):

- **MAJOR** version (X.0.0): Incompatible API changes
- **MINOR** version (0.X.0): New functionality in a backward compatible manner
- **PATCH** version (0.0.X): Backward compatible bug fixes

## Version Locations

### Tauri App (v2)

| File | Location |
|------|----------|
| `apps/tauri-v2/package.json` | `"version": "2.3.0"` |
| `apps/tauri-v2/src-tauri/Cargo.toml` | `version = "2.3.0"` |
| `apps/tauri-v2/src-tauri/tauri.conf.json` | `"version": "2.3.0"` |

### Desktop App (Electron) — Removed

The Electron app no longer exists in this repository.

## Release Process

1. **Development**: Work on features in development branch
2. **Testing**: Run test suite (`bun run test` / `npm test`)
3. **Version Bump**: Update version in all locations listed above
4. **Changelog**: Document all changes in CHANGELOG.md
5. **Commit**: Commit version changes
6. **Tag**: Create git tag: `git tag v2.3.0`
7. **Build**: Build release: `bun run tauri build`
8. **Release**: Push tag and create GitHub release

## Build Information

### Tauri v2
- **Tauri**: 2.9.1
- **Rust**: Edition 2021
- **React**: 18.3.x
- **TypeScript**: 5.6.x
- **Bun**: Package manager

