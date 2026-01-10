# SONU Desktop (Tauri) - Changelog

All notable changes to the SONU Desktop application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-01-11

### 🚀 Major Release - Complete Architecture Refactor

This release represents a complete rewrite of SONU Desktop from Electron + Python to Tauri + Rust, inspired by [Handy](https://github.com/cjpais/Handy).

### Added

- **Tauri Framework** - Native desktop app with ~10x smaller binary size
- **Rust Backend** - High-performance audio processing and transcription
- **whisper.cpp Integration** - Via `whisper-rs` for fast CPU-based inference
- **Voice Activity Detection (VAD)** - Energy-based silence filtering
- **Keyboard Simulation** - Auto-paste transcription via `enigo`
- **Modern React UI** - Dark theme inspired by Wispr Flow
- **Settings Panel** - Configurable recording modes and VAD sensitivity
- **Model Selection** - Support for tiny, base, small, medium, large-v3

### Changed

- **Audio Capture** - Migrated from PyAudio to `cpal` (cross-platform Rust)
- **Transcription Engine** - Migrated from FasterWhisper to whisper-rs
- **UI Framework** - Migrated from Electron to Tauri WebView2
- **Bundle Size** - Reduced from ~200MB to ~30MB

### Removed

- Python runtime dependency
- Electron framework
- FasterWhisper library

### Technical Details

| Component | Old (v1.x) | New (v2.0) |
|-----------|------------|------------|
| Framework | Electron 28 | Tauri 2.0 |
| Backend | Python 3.8+ | Rust 1.70+ |
| Audio | PyAudio | cpal 0.15 |
| Whisper | FasterWhisper | whisper-rs 0.12 |
| Keyboard | robotjs | enigo 0.2 |
| Bundle | ~200MB | ~30MB |

### Migration Notes

- v2.0 uses GGML model format (`.bin` files) instead of CTranslate2
- Model location: `~/.sonu/models/ggml-{model}.bin`
- Settings are not automatically migrated from v1.x

---

## [1.0.0] - Previous Release (Electron)

### Features
- Electron + Python architecture
- FasterWhisper transcription
- Hold-to-dictate and toggle modes
- System tray integration
- Global hotkey support
