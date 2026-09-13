# SONU Version Control

## Current Versions

| Component              | Version | Status |
| ---------------------- | ------- | ------ |
| **Desktop v2 (Tauri)** | 2.6.2   | Stable |

**Last Updated**: 2026-09-14 (2.6.2)

## Version History

### Desktop v2 (Tauri)

#### Version 2.6.2

- Release pipeline repaired: the Windows and macOS builds had been failing since 2026-09-07
- macOS: fixed a compile error in `lib.rs` where the macOS-only `tauri-nspanel` plugin was attached to an immutable `builder`
- Windows: updated the `cmake` build dependency so it recognises Visual Studio 2026, which current GitHub runners use
- CI now compiles the crate for Windows and macOS, and runs the Rust test suite (previously Linux-only, tests unrun)
- Dependency advisories: 35 of 53 resolved within each crate's compatibility line, including a HIGH-severity `openssl` issue
- Failed CI steps and release builds now publish their reason as a GitHub check annotation

#### Version 2.6.1

- Download integrity: every model in the catalog is now checksum-verified before it replaces the previous file — SHA-256 for the HuggingFace-hosted Whisper models, MD5 (including multipart `md5-of-part-digests`) for the Cloudflare R2 hosted ones
- Hardened crash and data-loss paths across the recorder lifecycle, history database, settings persistence, and clipboard handling
- Keychain reads are cached in-process with write-through invalidation, removing a blocking OS call from hot paths
- Type-aware ESLint (`no-floating-promises`, `no-misused-promises`) — 75 dropped-promise sites fixed
- CI hardening: GitHub Actions pinned to commit SHAs, clippy `-D warnings` gate, Dependabot for cargo/bun/Actions, panic ratchet
- Rust test suite restored: 50 tests passing (previously unrun on Windows due to an ONNX runtime DLL shadowing issue)

#### Version 2.6.0

- Full model catalog: Whisper Tiny–Turbo, Parakeet V2/V3, Moonshine Base — all running locally, data-driven registry with "Recommended" badges
- Streaming live preview: confirmed text renders solid while the volatile tail flows in
- Voice commands and custom macros applied to every transcription
- Automated multi-platform releases with duplicate guard
- Offline LLM settings hidden behind debug mode until llama.cpp integration ships

#### Version 2.4.0

- Deep visual overhaul with bundled Geist Sans typography
- Light, dark, and system themes with six accent color presets
- New Appearance settings page with live preview and recording controls
- Live local transcription preview while recording
- Theme-reactive sidebar, settings groups, toggles, onboarding, and footer
- E2E coverage for Appearance controls and navigation

#### Version 2.3.0

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

| File                                      | Location             |
| ----------------------------------------- | -------------------- |
| `apps/tauri-v2/package.json`              | `"version": "2.6.2"` |
| `apps/tauri-v2/src-tauri/Cargo.toml`      | `version = "2.6.2"`  |
| `apps/tauri-v2/src-tauri/tauri.conf.json` | `"version": "2.6.2"` |

### Desktop App (Electron) — Removed

The Electron app no longer exists in this repository.

## Release Process

1. **Development**: Work on features in development branch
2. **Testing**: Run test suite (`bun run test` / `npm test`)
3. **Version Bump**: Update version in all locations listed above
4. **Changelog**: Document all changes in CHANGELOG.md
5. **Commit**: Commit version changes
6. **Release**: Dispatch the Release workflow (GitHub Actions → Release →
   Run workflow). It reads the version from `tauri.conf.json`, creates the
   `v{version}` draft release and tag, builds all 6 platform targets, and
   publishes the release on success. No manual tagging is needed.

## Build Information

### Tauri v2

- **Tauri**: 2.9.1
- **Rust**: Edition 2021
- **React**: 18.3.x
- **TypeScript**: 5.6.x
- **Bun**: Package manager
