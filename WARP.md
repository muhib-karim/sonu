# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Default focus & scope

- **Primary target is the desktop app in `apps/desktop/` (v3.x)**.
  - Treat `apps/desktop/` as the active product unless the user explicitly requests mobile work.
  - Prefer files under `apps/desktop/` over similarly named root or `versions/` files (those are legacy/archived).
- **Mobile app in `apps/mobile/` (v4.x)** is a separate codebase.
  - Only work here if the user explicitly says something like "work on mobile app" or "switch to mobile".
- **Historical/legacy areas**
  - `versions/` and `versions/v3.legacy/` are archived snapshots for reference, not active development.
  - Root-level JS/HTML that duplicates desktop code is legacy; use the `apps/desktop/` versions instead.

## Core commands & workflows

### Desktop app: setup & dev loop (default)

From the repo root:

```bash
cd apps/desktop
npm install
pip install -r requirements.txt
npm start
```

Notes:
- `npm start` runs Electron in development mode, with console logs and hot-reload for most UI files.
- Changes to `renderer.js`, `preload.js`, `index.html`, `styles.css`, and files under `src/` are picked up automatically.
- **Changes to `main.js` require an app restart**; the app will prompt for this in dev.

### Building desktop installers

From `apps/desktop`:

```bash
# Standard build (uses electron-builder)
npm run build

# Optional: build without publish hooks
npm run build -- --publish=never
```

This uses the `build` config in `apps/desktop/package.json` to produce (primarily) a Windows NSIS installer, with targets configured for macOS DMG and Linux AppImage as well.

### Test commands

There are two main layers: high-level commands from `apps/desktop`, and fine-grained commands in `apps/desktop/tests`.

#### High-level test entrypoints (from `apps/desktop`)

```bash
cd apps/desktop

# Run full automated pipeline: unit + integration + E2E + showcase
npm run test:auto

# Delegate to the tests workspace default Jest run
npm test

# E2E-only entrypoint (delegates into tests workspace)
npm run test:e2e

# Comprehensive E2E (all features) via tests workspace
npm run test:complete

# Real-time comprehensive E2E (clicks through the full UI)
npm run test:realtime

# Model download health checks
npm run test:model-download
npm run test:health
```

Notes:
- `npm run test:auto` also triggers showcase generation and GitHub upload flows; use the more granular commands below if you only want tests.

#### Tests workspace (from `apps/desktop/tests`)

```bash
cd apps/desktop/tests
npm install

# All Jest tests with JSON output
npm test

# Unit / integration / E2E suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Comprehensive functionality and realtime E2E
npm run test:e2e:complete
npm run test:e2e:realtime

# Model-specific and typing integration tests
npm run test:model-download
npm run test:typing

# Python backend tests (pytest under the hood)
npm run test:python

# Aggregate runner: unit + integration + python + E2E
npm run test:all
```

##### Running a single Jest test file

From `apps/desktop/tests`:

```bash
# Example: focus on one unit test file
npx jest tests/unit/<file>.test.js --runInBand
```

You can substitute `tests/integration/...` or `tests/e2e/...` to narrow to a specific integration/E2E spec.

### Showcase & automation utilities (desktop)

From `apps/desktop`:

```bash
# Generate screenshots for all major tabs
npm run showcase

# Playwright-based screenshot + video automation
npm run auto-screenshots

# Take GitHub-oriented screenshots via Electron script
npm run screenshots

# Generate repository banner assets
npm run banner
```

These commands are wired to automation described in `AUTOMATION_README.md`, `REALTIME_TESTING_GUIDE.md`, and the root `README.md` showcase section.

## High-level architecture

### Big picture

- **Desktop app (v3.x)**
  - Electron-based desktop UI (Chromium + Node.js) in `apps/desktop`.
  - Python 3 backend for audio capture and transcription using **faster-whisper** (CTranslate2-based Whisper).
  - System-wide typing via native automation (Electron/Node on the JS side, plus Python helpers) to emit text into any focused window.
- **Mobile app (v4.x)**
  - Separate Android/iOS codebase in `apps/mobile`, architected around **whisper.cpp** (GGML) rather than faster-whisper.
  - Treat this as an independent project line when/if the user asks to work on it.

### Desktop architecture (apps/desktop)

Key components (see `ARCHITECTURE.md` and `docs/DEVELOPMENT.md`):

- **Electron main process – `main.js`**
  - Creates and manages the main window and tray.
  - Registers global hotkeys (hold/toggle modes, command/Chameleon modes).
  - Spawns and supervises the Python whisper service process.
  - Handles IPC endpoints for settings, system info, model management, and dictation control.
  - Integrates with auto-updater / build configuration (`electron-builder`, `electron-updater`).

- **Renderer UI – `renderer.js` + `index.html` + `styles.css`**
  - Implements the glassmorphic multi-tab UI (Home, Dictionary, Snippets, Style, Notes, Settings).
  - Manages application state, theme switching, statistics panels, and history/dictionary/snippet CRUD.
  - Receives partial/final transcription events over IPC and updates the UI in real time.

- **Preload bridge – `preload.js`**
  - Provides a constrained API surface for the renderer under context isolation.
  - Encapsulates all IPC calls into a stable JS API.

- **Python services – `whisper_service.py`, `model_manager.py`, `system_utils.py`, `llm_service.py`**
  - `whisper_service.py`: microphone capture (PyAudio), streaming transcription via faster-whisper, and event emission (`READY`, `PARTIAL`, `FINAL`, `ERROR`) over stdout/stderr.
  - `model_manager.py`: model download and Hugging Face cache management (standard faster-whisper model names: tiny/base/small/medium/large-v3 and distil/Parakeet variants).
  - `system_utils.py`: hardware detection (CPU cores, RAM, GPU availability) used to recommend model choices.
  - `llm_service.py`: local LLM integration (e.g., Phi-3-style text transforms) that powers command/Chameleon modes.

- **Data & configuration – `apps/desktop/data/`**
  - `settings.json`: theme, hotkeys, experimental toggles, model selection, etc.
  - `dictionary.json`, `snippets.json`, `notes.json`: user content backing the Dictionary/Snippets/Notes tabs.

- **Tests – `apps/desktop/tests/` + root `tests/` workspace config**
  - Jest + Playwright + Spectron-based tests for unit, integration, Electron/E2E, and real-time UI interaction.
  - Python tests via `pytest` for the backend.
  - See `TESTING_SUMMARY.md` and `REALTIME_TESTING_GUIDE.md` for what the major suites cover.

### Mobile architecture (apps/mobile)

- Android and iOS projects scaffolded under `apps/mobile/android` and `apps/mobile/ios`.
- Intended backend is **whisper.cpp** (GGML) via a `whisper.cpp/` submodule and native bridges (JNI on Android, Swift/C++ on iOS).
- The `apps/mobile/README.md` and `CONTRIBUTING.md` currently reflect its HeliBoard heritage; treat this tree as being adapted into SONU Mobile.

## Multi-agent & ownership rules (adapted for Warp)

The repo is designed for multiple AI/dev "agents"; Warp should respect the same boundaries:

- **Desktop vs mobile separation**
  - Default to **desktop agent behavior**: operate in `apps/desktop/` and do **not** modify `apps/mobile/` unless the user clearly asks for mobile work.
  - If explicitly working on mobile, avoid touching `apps/desktop/` and follow the mobile pipeline (whisper.cpp/Android/iOS).

- **Backend technology boundaries**
  - Desktop side (v3.x): use **faster-whisper + CTranslate2**. Do **not** introduce Whisper.cpp/GGML assumptions into desktop code or docs.
  - Mobile side (v4.x): use **whisper.cpp + GGML**. Do **not** reference faster-whisper/CTranslate2 in mobile-specific code.

- **Shared resources**
  - `core/shared/` (especially `PROJECT_STRUCTURE.md` and `PROGRESS.md`) describe cross-agent status and structure.
  - Treat `core/shared/` as project-wide coordination docs; modify them only when doing structural or status updates the user has asked for.

- **Branching (when using git workflows)**
  - `desktop-v3` branch: desktop agent working branch; tags like `v3.x.x`.
  - `mobile-v4` branch: mobile agent working branch; tags like `v4.x.x`.
  - `main`: stable; do not assume you should create tags/branches unless the user requests git operations.

## Documentation entrypoints

When you need deeper context beyond this file, prefer these documents (all at repo root unless noted):

- **Product & strategy**
  - `START_HERE.md` → index into commercialization and implementation docs (`COMMERCIALIZATION_SUMMARY.md`, `COMMERCIALIZATION_STRATEGY.md`, `IMPLEMENTATION_GUIDE.md`, `CODE_CHANGES_READY_TO_DEPLOY.md`).

- **Architecture & structure**
  - `ARCHITECTURE.md` → detailed Electron/Python/faster-whisper architecture diagrams and data flow.
  - `PROJECT_STRUCTURE.md` and `core/shared/PROJECT_STRUCTURE.md` → authoritative directory/ownership description.
  - `DEVELOPMENT_GUIDE.md` → quick rules about defaulting to `apps/desktop/` and treating root/versions as legacy.
  - `docs/DEVELOPMENT.md` and `docs/README.md` → longer-form dev and user docs, including additional build/test notes.

- **Testing & automation**
  - `TESTING_SUMMARY.md` → what each Jest/E2E suite covers.
  - `REALTIME_TESTING_GUIDE.md` → details of the real-time comprehensive E2E test.
  - `AUTOMATION_README.md`, `AUTOMATION_SETUP.md` → details for screenshot/showcase automation flows.

Use these as the first places to look when you need clarification on behavior, architecture, or expected test coverage before making significant changes.