# Changelog

All notable changes to SONU will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.2.1] - 2026-02-28

### Tauri App - CI/CD & Documentation Cleanup

### Added
- **Notes mic button**: Click-to-record with visual recording state (red pulse animation), uses typed `commands` API
- **CI workflow** (`.github/workflows/ci.yml`): Lint, format, typecheck, Vitest, cargo fmt/clippy on push/PR
- **Build workflow** (`.github/workflows/build.yml`): Reusable multi-platform Tauri build (6 targets, Vulkan SDK, code signing, AppImage patching)
- **Release workflow** (`.github/workflows/release.yml`): Manual dispatch → draft release → 6-platform build → update manifest → publish

### Removed
- **13 broken GitHub Actions workflows**: All used non-existent `dtolnay/rust-action`, wrong Tauri v1 libs, dead paths, deprecated actions, invalid CodeQL, or massive redundancy
- **35+ stale documentation files**: Legacy Electron-era reports, completion docs, strategy docs, implementation guides
- **Legacy scripts**: `auto_screenshot.js`, `verify_downloader.js`, `model_downloader.py`, `check_llm.py`, `translation_service.py`, `run_sonu.bat`
- **Runtime artifacts**: `logs/`, `plans/`, `custom_models_test/`, `config.json`, `history.json`

### Changed
- **ARCHITECTURE.md**: Rewritten for Tauri v2 (Rust + React architecture diagram)
- **INSTALL.md**: Rewritten with 6-platform download table and build-from-source instructions
- **CONTRIBUTING.md**: Rewritten with Bun/Vitest/Cargo dev setup
- **SECURITY.md**: Updated supported versions table (v2.x Tauri supported, Electron legacy deprecated)
- **CI clippy**: Relaxed from `-D warnings` to allow pre-existing upstream warnings

---

## [2.2.0] - 2026-02-28

### Tauri App - Cloud Transcription & UI Polish Release

### Added
- **Cloud Transcription**: Full cloud transcription feature with provider support
  - OpenAI Whisper API integration
  - Groq (Whisper Large v3) integration
  - Custom API endpoint support for self-hosted services
  - Provider-specific configuration (API keys, model selection, language)
  - Connection testing with real-time feedback
  - Secure API key storage via OS keychain
- **CloudTranscriptionSettings UI**: Professional settings panel with provider cards, hero toggle, test connection, animated status badges
- **`cn()` utility**: Conditional Tailwind CSS class merging using `clsx` + `tailwind-merge`
- **Graceful error handling**: AppDataDirectory and model loading show friendly messages instead of raw errors

### Changed
- **HomeSettings**: Gradient text hero, animated mode badge with pulse dot, hover lift on stat cards, corner glow effects
- **RecordingOverlay**: Smooth entrance animation, refined cancel button states, checkmark glow, cloud indicator gradient
- **Version sync**: All version files (package.json, Cargo.toml, tauri.conf.json) now consistently at 2.2.0
- **Footer**: Correct fallback version display (2.2.0)

### Fixed
- **App.tsx blank screen**: Restored missing state declarations (`useState`, `useShortcutsHelp` hook) that were replaced with placeholder comments
- **`write_settings` signature**: Fixed ownership semantics across 41 call sites (`&mut AppSettings` → `mut settings: AppSettings`)
- **Test infrastructure**: Updated test mocks to use real Tauri command names (`getAppSettings`, per-key updaters) with proper Result wrappers
- **All 27 vitest tests passing** (was 22/27)
- **All 16 Rust tests passing**
- **0 ESLint errors** in modified files
- **0 new TypeScript errors**

---

## [3.7.0] - 2026-02-19

### Desktop App (Electron) - Security & Maintenance Release

### Security
- **CRITICAL**: Implemented comprehensive input validation module (`src/utils/validation.js`)
  - Model ID whitelist validation prevents injection attacks
  - Path traversal protection blocks `../` and control characters
  - IPC channel validation ensures only valid channels are used
  - Settings validation with proper range checks
  - Dictionary word and snippet sanitization
- **CRITICAL**: Added structured error handling module (`src/utils/errorHandler.js`)
  - Safe process spawning with `safeSpawn()` function
  - User-friendly error dialogs with severity levels
  - Dependency validation on startup
  - Graceful error recovery strategies
- **HIGH**: All IPC parameters now validated before processing
- **HIGH**: Path sanitization on all file operations
- **HIGH**: ESLint security rules block dangerous functions (`eval`, `exec`, `new Function`)

### Added
- ESLint configuration with 100+ rules for code quality and security
- Window state persistence service (`src/services/windowState.js`)
  - Saves and restores window position and size
  - Off-screen detection and correction
  - Size validation prevents tiny/huge windows
- Pre-commit hooks now include ESLint checks
- npm scripts: `lint` and `lint:fix`

### Changed
- Consolidated to single entry point (removed duplicate `src/main/index.js`)
- Updated `src/utils/index.js` to export errorHandler and validation modules
- Extended constants with timeout values for various operations
- Pre-commit hook now runs linting before tests

### Removed
- **40+ debug and test files** from repository:
  - All `test*.js` files
  - All `debug*.js` files
  - All `minimal*.js` files
  - All `*_output.txt` log files
  - Duplicate `logger.js` at root
  - Duplicate service directories
- Personal information from repository (paths, usernames)

### Fixed
- Python process spawning now has proper try/catch error handling
- Global shortcut registration checks return values
- Window manager consolidated (removed duplicate implementations)

---

## [2.1.0] - 2026-02-19

### Tauri App - Testing & Quality Release

### Added
- Comprehensive Rust unit tests for transcription manager (`transcription_tests.rs`)
  - Model state tracking tests (8 test cases)
  - Transcription options validation tests
  - Timeout configuration tests
  - Error handling and recovery tests
  - Model ID validation tests (path traversal protection)
  - Recording state management tests
  - Audio device validation tests
  - Custom words processing tests
  - Async timeout handling with tokio
  - Cancellation token tests
- Total: 500+ lines of test code

### Security
- Input validation for all model IDs (whitelist approach)
- Path traversal protection in model loading
- Settings range validation

---

## [3.6.1] - 2025-12-27

### 🔧 Production Release Fixes

Critical fixes to restore all broken features and achieve Wispr Flow parity for instant text output.

#### Fixed

- **Instant Text Output** (Wispr Flow parity):
  - Added `typeIncrementalText()` function for real-time incremental typing during dictation
  - Implemented instant partial output with delta typing to prevent duplicate text
  - Added RELEASE event handling for immediate text output when hotkey is released

- **Model Loading & Configuration**:
  - Fixed model name to HuggingFace repo mapping (e.g., 'base' → 'Systran/faster-whisper-base')
  - Fixed `config.json` activeModel from broken 'moonshine-tiny' to working 'distil-small.en'
  - Fixed `getRecommendedModel()` to use distil-small.en for all RAM levels
  - Fixed settings loading from correct config path

- **IPC Handler Registration**:
  - Fixed race condition where renderer called IPC handlers before they were registered
  - Moved IPC handler registration BEFORE `createWindow()` to ensure handlers are ready

- **Widget Position Persistence**:
  - Added `loadWidgetPosition()` and `saveWidgetPosition()` functions
  - Widget now remembers user's dragged position across app restarts

- **Code Cleanup**:
  - Removed obsolete `canUseElectron` and `electronApp` patterns
  - Fixed `screenObj` undefined reference in createIndicatorWindow
  - Simplified electron module imports

#### Technical

- Refactored `main.js` for cleaner architecture
- Improved whisper stdout handler with proper PARTIAL/EVENT parsing
- Added Windows shell spawn options for stdin persistence

---

## [3.6.0] - 2025-12-05

### 🧠 AI Intelligence & Context Awareness

This major update transforms SONU from a transcription tool into an intelligent writing assistant, introducing local LLM capabilities and app-aware context switching.

#### Added

- **Command Mode ("Magic Edit")**:
  - New global hotkey `Ctrl+Win+E` to open the Command Overlay.
  - Select text anywhere and instruct AI to "Fix grammar", "Summarize", "Make professional", etc.
  - Powered by **Microsoft Phi-3 Mini (3.8B)** running locally via `llama-cpp-python`.
  - Transparent, glassmorphic overlay UI for seamless interaction.

- **Chameleon Mode (Context Awareness)**:
  - Automatically detects the active application window using `@paymoapp/active-window`.
  - Intelligently switches context profiles (e.g., preserving code formatting in VS Code, casual tone in Discord).
  - "Chameleon Mode" toggle in new AI Settings tab.

- **AI & Intelligence Settings**:
  - Dedicated settings tab for managing AI features.
  - One-click download for the Phi-3 Mini GGUF model (~2.3GB).
  - Status indicators for model readiness and installation.

#### Technical

- **Local LLM Architecture**:
  - Integrated `llama-cpp-python` for efficient CPU inference.
  - Created independent `llm_service.py` process to ensure main transcription remains stable.
  - Implemented optimized prompt templates for Phi-3 Instruct.

- **Context Manager**:
  - Native Node.js module for low-overhead window polling.
  - Event-driven architecture for context updates.

---

## [3.5.4] - 2025-01-XX

### 🧹 Project Cleanup & Comprehensive Testing