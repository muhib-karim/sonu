# Changelog

All notable changes to SONU will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.6.2] - 2026-09-14

Build and release repair. This is the first release since 2.3.0, so it also ships
the 2.4.0–2.6.1 work documented below.

### Fixed

- **The macOS build did not compile.** `src/lib.rs` attached the macOS-only
  `tauri-nspanel` plugin with an assignment to `builder`, which is declared
  immutable (`error[E0384]`). Nothing caught it because no CI job compiled the
  crate for macOS.
- **The Windows build failed against Visual Studio 2026.** The pinned `cmake`
  crate (0.1.54) could not name the Visual Studio version on current GitHub
  Windows runners, so it panicked inside its generator lookup before invoking
  cmake at all. Updated to `cmake` 0.1.58, which recognises VS 2026.
- **The release pipeline had been broken since 2026-09-07** by the two issues
  above; Windows and macOS builds now pass.
- Two release-only `unused_imports` warnings, invisible in CI because CI only
  builds in debug: the `specta_typescript` imports (used only by the
  `#[cfg(debug_assertions)]` bindings export) are now gated, and a redundant
  `apple_intelligence` import was removed.
- **Dependency advisories.** 35 of 53 advisories in `Cargo.lock` resolved by
  updating to the newest version inside each crate's own compatibility line —
  including a HIGH-severity `openssl` bounds assertion, plus `rustls-webpki`,
  `tar`, `h2`, `quinn-proto`, `time`, `serde_with` and `bytes`.
- The `rust-audit` CI job had never worked: it passed `workingDirectory` where
  the action declares `working-directory`, and the workflow granted no
  permissions, so the action could not publish its results.
- The pre-commit hook ran clippy with default features, which cannot build
  without libclang — so it failed unconditionally on such machines and forced
  `--no-verify` on every Rust commit.

### Added

- **CI compiles the crate for Windows and macOS.** Previously nothing did except
  a release run, which is how the two build failures above reached `main`.
- **The Rust test suite now runs in CI** (`cargo test --lib`), with a floor guard
  so the step cannot report success while running nothing.
- Failed CI steps and failed release builds now publish the reason as a GitHub
  check annotation, which is readable without admin access to the job log.

---

## [2.6.1] - 2026-09-11

Audit-driven hardening pass. Companion to [`AUDIT.md`](AUDIT.md); the
per-task rationale lives in [`IMPROVEMENT_PLAN.md`](IMPROVEMENT_PLAN.md).

### Added

- **Download checksum verification**: every shipped model now carries a
  verified integrity hash — SHA-256 for HuggingFace-hosted Whisper models
  (read from the LFS object id) and MD5 for the object-store-hosted
  artifacts. Multipart-uploaded files are verified with the same
  md5-of-part-digests construction the store publishes, so the published
  `ETag` is reproducible on the client. An artifact that fails verification
  is discarded rather than installed, and the failure is surfaced instead of
  failing later at transcription time.
- **Type-aware frontend linting**: `@typescript-eslint/no-floating-promises`
  and `no-misused-promises` are now enforced, with 75 pre-existing findings
  fixed. This catches fire-and-forget IPC calls whose rejection would
  otherwise be discarded silently.
- **Keychain read cache**: API-key lookups no longer enter the OS credential
  store on every settings load. The cache is invalidated on every write and
  delete.
- **Panic ratchet** (`scripts/check-panic-ratchet.sh`) plus
  `scripts/panic-baseline.txt`, wired into CI as a fast dependency-free job
  that runs before the Rust build.
- **Dependency automation**: Dependabot config for cargo, bun, and GitHub
  Actions; advisory `cargo audit` job.

### Changed

- **CI clippy gate tightened** to `cargo clippy --all-targets -- -D warnings`;
  all 36 lints in the tree were fixed, so warnings are now fatal.
- GitHub Actions pinned to commit SHAs rather than mutable tags.
- Git dependencies (`vad-rs`, `rodio`, `tauri-nspanel`) pinned to exact
  revisions.
- Unknown/absent checksums are tolerated (the entry is simply unverified),
  so a catalog without hashes keeps working as before.

### Fixed

- **Crash risks under `panic = "abort"`**: removed panics in the audio
  recorder worker, made unsupported sample formats return an error, and
  recovered a poisoned VAD lock instead of aborting the process.
- **Recording lifecycle**: a single `lifecycle` mutex now serialises every
  microphone transition, structurally eliminating two lock-order inversions
  that could deadlock.
- **Stalled audio device**: the recorder command loop services `Stop` and
  `Shutdown` via `recv_timeout` rather than blocking indefinitely.
- **History**: transcription rows are keyed by an explicit saved flag instead
  of a text-equality heuristic that could merge distinct entries; the SQLite
  connection is now a single shared handle with WAL and a busy timeout.
- **Clipboard**: restoration is a drop guard that only fires when the
  original read succeeded, and now runs on error paths too.
- **Settings drift**: rollback is field-scoped and version-guarded, and
  post-process toggles route through the store rather than writing directly.
- **API keys**: `set_cloud_api_key` with an empty value now removes the
  keychain entry instead of storing a blank string that left the secret in
  place while the UI reported no key.
- **Model downloads**: partials are bound to their source URL via a
  `.partial.meta` sidecar, so a repointed catalog can no longer splice two
  different artifacts into one corrupt model.
- **Shortcuts**: a new binding is registered before the old one is removed,
  and toggle state only latches on success.
- **Overlay**: a generation counter prevents a pending delayed hide from
  hiding a subsequent recording.
- **Notes mic button** now tracks recording ownership rather than the global
  flag, so a hotkey dictation can no longer present a "Stop" that cannot
  stop anything.
- **Model selection** can no longer auto-switch the active model while a
  recording is in progress.

### Verified

- Full gate suite green: `cargo fmt --check`, `cargo clippy --all-targets
  -- -D warnings`, `cargo test` (50 passing), `bun run typecheck`,
  `bun run lint`, `bun run test` (38 passing), panic ratchet at baseline.
- The Rust test suite had not been executable on Windows: cargo materialises
  a 0-byte `DirectML.dll` placeholder next to the test binary (because
  `ort-sys` registers the path via `cargo:rerun-if-changed`), which shadows
  the real ONNX Runtime DLL and makes the binary fail at load with exit
  `0xc0000020`. The workaround is documented in both `AGENTS.md` files.
- Known gap: CI compiles the `whisper` feature, which needs libclang and
  cannot be built on the audit machine. Clippy was verified clean for
  `--no-default-features --features parakeet,moonshine` only.

---

## [2.6.0] - 2026-09-03

### Added

- **Full model catalog**: the complete transcription model list — Whisper
  Tiny, Base, Small, Medium, Large and Turbo, Parakeet V2/V3, and Moonshine
  Base — all running locally, driven by a bundled JSON model registry
  (Handy-style) with per-model language coverage.
- **Model recommendations**: Parakeet V3 is the default pick (multilingual
  with automatic language detection) and Parakeet V2 the top pick for
  English-only dictation; the model selector and onboarding surface
  "Recommended" badges.
- **Streaming live dictation**: the recording overlay now shows text as you
  speak — the confirmed prefix renders solid while the volatile tail is
  translucent, using word-boundary stabilization across preview ticks.
- **Voice commands**: built-in spoken commands — "new line" inserts a line
  break, "new paragraph" starts a new paragraph — applied after AI
  post-processing so the result is deterministic.
- **Custom voice macros**: define spoken phrase → replacement text pairs in
  the Dictionary settings; longest phrase wins and matching is
  case-insensitive on whole words.
- **Automated releases**: pushing a version change on main now creates and
  publishes the multi-platform release automatically, guarded against
  duplicate releases; manual dispatch still works.

### Changed

- The offline LLM settings section is hidden unless debug mode is enabled;
  the feature requires the llama.cpp integration which has not shipped yet.
- 12-locale translation parity including the new voice commands strings.

### Fixed

- The live preview can no longer unload the ASR model mid-recording, which
  could silently lose the final transcription with an "immediately" model
  unload timeout.
- Rapid stop/start cycles can no longer stack zombie preview tickers
  emitting stale text into a new recording session.
- The model unload timeout setting is now actually persisted (the UI was
  silently discarded) and its option values match the backend enum.
- Missing theme tokens (`background-ui`, `text-secondary`) defined so
  primary buttons and the slider track render correctly in both themes.
- Settings updates now roll back on backend errors instead of silently
  keeping the optimistic value.

---

## [2.4.0] - 2026-09-02

### Added

- Deep visual overhaul with bundled Geist Sans and Geist Mono fonts.
- Light, dark, and system theme modes.
- Six accent color presets: zinc, violet, blue, green, amber, and rose.
- New Appearance settings page with theme preview and live-preview toggle.
- Live local transcription preview in the recording overlay while speaking.
- Incremental recorder peek path that does not stop or interrupt the final recording.
- Theme-aware sidebar, settings groups, toggles, onboarding, and footer. The
  recording overlay intentionally stays dark for contrast against any app.
- E2E coverage for appearance controls and navigation.

### Changed

- Replaced hardcoded dark-only styling with semantic theme tokens.
- Replaced mono-first application typography with bundled Geist Sans.
- Kept cloud transcription out of live preview to avoid unexpected API usage;
  cloud-only mode continues to show the waveform while recording.

### Fixed

- Legacy hardcoded surfaces and controls now follow the selected theme.

---

## [2.3.0] - 2026-09-02

### Tauri App - Context-Aware Dictation & Command Mode

### Added

- **Context-aware dictation**: SONU detects the focused application and adapts
  LLM post-processing tone accordingly (casual in messengers, professional in
  work chat, formal in email). Per-category styles from the Style settings are
  now persisted in the app settings and actually applied to the LLM prompt.
  Toggle available in Settings → Style.
- **Command Mode**: new global shortcut (default `Ctrl+Shift+E`, `Cmd+Shift+E`
  on macOS). Select any text, press the shortcut, speak an instruction, and
  SONU transcribes your instruction and rewrites the selected text with the
  configured LLM — pasting the result in place of the selection. Falls back to
  plain dictation when no text is selected or no LLM is configured.
- Style selections now persist via the backend settings store (previously
  localStorage only and not wired into the transcription pipeline).
- Command Mode shortcut configurable from Settings → General, with i18n
  support for all 12 languages.

### Changed

- **Licensing WIP removed**: the repository remains 100% free and open-source;
  an unmerged paid-license experiment was fully reverted.
- Project branding hygiene: outgoing LLM HTTP headers now identify as SONU.
- Documentation: README, VERSION.md updated; removed references to the
  deleted Electron app, self-hosted server, and legacy plan folders.

### Fixed

- `prettier --check` failed locally on Windows due to CRLF line endings
  (`.prettierrc` now uses `endOfLine: "auto"`, matching CI behavior).
- `.prettierignore` now excludes alternate cargo target directories.

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

