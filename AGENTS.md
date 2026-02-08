# AGENTS.md

This file provides guidance to AI coding agents (Cursor, Claude, Copilot) working in this repository.

## Project Overview

SONU is a professional offline voice typing platform with multiple implementations:
- **v2.x (Tauri)** - `apps/tauri-v2/` - Active development (Rust + React/TypeScript)
- **v3.x (Electron)** - `apps/desktop/` - Legacy Windows app (Electron + Python)
- **Mobile** - `apps/mobile/` - Android app (Rust)

## Default Development Environment

**Default to `apps/tauri-v2/` for all work unless explicitly told otherwise.**

## Recent Improvements (February 2026)

### Legacy Desktop (Electron) - Phase 1 & 2 Complete

#### 1. Security Improvements
- ✅ **Secure API Key Storage**: New `src/utils/secureStorage.js` module using OS keychain (keytar)
- ✅ **Encrypted Fallback**: AES-256-GCM encryption for systems without keychain
- ✅ **API Key Migration**: Automatic migration from plaintext settings to secure storage

#### 2. Code Quality
- ✅ **Centralized Logging**: New `src/utils/logger.js` with structured logging and rotation
- ✅ **Configuration Module**: New `src/config/constants.js` - single source of truth
- ✅ **Modular Architecture**: Refactored `src/main/` with separate managers

#### 3. New Modules
- `src/config/constants.js` - Centralized constants (models, API endpoints, settings)
- `src/utils/secureStorage.js` - Secure credential storage
- `src/utils/logger.js` - Structured logging
- `src/utils/migration.js` - Data migration utilities
- `src/main/index.js` - Refactored entry point
- `src/main/window-manager.js` - Window management
- `src/main/tray-manager.js` - System tray
- `src/main/python-manager.js` - Python process management

#### 4. Testing
- ✅ New unit tests for secureStorage, logger, constants
- ✅ Improved test infrastructure

### Tauri Desktop - Phase 4 In Progress

#### 1. Externalized Configuration
- ✅ New `src-tauri/resources/models.json` - Model definitions in JSON
- ✅ New `src-tauri/src/model_config.rs` - JSON config loader

#### 2. Offline LLM Inference
- ✅ New `src-tauri/src/llm_inference.rs` - llama.cpp integration
- ✅ Global inference engine with model caching
- ✅ Text processing with prompt templates

## Build & Development Commands

### Tauri v2 (apps/tauri-v2/)

```bash
# Install dependencies
bun install

# Development
bun run tauri dev              # Full Tauri dev mode
bun run dev                    # Vite frontend only
CMAKE_POLICY_VERSION_MINIMUM=3.5 bun run tauri dev  # macOS cmake fix

# Building
bun run tauri build            # Production build
bun run build                  # Frontend build only
bun run preview                # Preview built frontend

# Code Quality
bun run lint                   # ESLint check
bun run lint:fix               # ESLint auto-fix
bun run format                 # Format all (Prettier + Rust fmt)
bun run format:check           # Check formatting
bun run format:frontend        # Prettier only
bun run format:backend         # Cargo fmt only
bun run typecheck              # TypeScript check

# Testing
bun run test                   # Frontend tests (Vitest)
bun run test:watch             # Watch mode for tests
bun run test:coverage          # Test coverage report
bun run test:e2e               # Playwright E2E tests
bun run test:e2e:ui            # Playwright with UI
bun run test:rust              # Rust unit tests
bun run test:rust:verbose      # Rust tests with output
cd src-tauri && cargo test <test_name>  # Run single Rust test
bun run test:unit -- <pattern> # Run single frontend test
```

### Electron Legacy (apps/desktop/)

```bash
# Development
npm start                      # Run Electron app

# Building
npm run build                  # Build installer

# Testing
cd tests
npm run test:unit              # Unit tests
npm run test:integration       # Integration tests
npm run test:e2e               # E2E tests
npm run test:all               # All tests
```

## Code Style Guidelines

### TypeScript/React (Tauri Frontend)

**Imports:**
- Use path aliases: `@/components`, `@/hooks`, `@/bindings`
- Group imports: React → External libs → Internal (@/) → Relative
- Use named imports: `import { useState } from "react"`

**Formatting:**
- Prettier with LF line endings (see .prettierrc)
- 2-space indentation
- Semicolons required
- Single quotes for strings

**Types:**
- Strict TypeScript enabled
- Use `type` over `interface` for object shapes
- Define types in `src/lib/types.ts`
- Use Zod for runtime validation

**Naming:**
- Components: PascalCase (e.g., `ModelSelector.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useSettings.ts`)
- Utilities: camelCase (e.g., `formatDate.ts`)
- Types: PascalCase (e.g., `DownloadProgress`)

**Components:**
- Functional components with hooks
- Use `useTranslation()` for all user-facing text
- Props destructuring in parameters
- Error boundaries for error handling

**Error Handling:**
- Use `try/catch` for async operations
- Toast notifications via `sonner` for user feedback
- Log errors with context

### Rust (Tauri Backend)

**Formatting:**
- `cargo fmt` standard formatting
- 4-space indentation

**Naming:**
- Structs/Enums: PascalCase
- Functions/Variables: snake_case
- Constants: SCREAMING_SNAKE_CASE
- Modules: snake_case

**Error Handling:**
- Use `Result<T, E>` and `Option<T>`
- Propagate errors with `?` operator
- Log errors with `log::error!`

**New Modules:**
- `model_config.rs` - Load model definitions from JSON
- `llm_inference.rs` - llama.cpp integration for offline LLM

### JavaScript (Legacy Electron)

**New Patterns:**
```javascript
// Use new modules instead of scattered code
const { constants } = require('./src/config');
const { logger, secureStorage } = require('./src/utils');

// Initialize at startup
await secureStorage.initialize();
logger.initialize({ level: 'debug', logToFile: true });

// Use structured logging
const appLogger = logger.createLogger('MyModule');
appLogger.info('Message', { context: 'data' });

// Secure API key storage
await secureStorage.setPassword('groq_api_key', apiKey);
const apiKey = await secureStorage.getPassword('groq_api_key');
```

## Project Structure

### Tauri v2
```
apps/tauri-v2/
├── src/                       # React/TypeScript frontend
│   ├── components/            # UI components
│   │   ├── settings/          # Settings panels
│   │   ├── model-selector/    # Model management
│   │   └── ui/                # Shared UI components
│   ├── hooks/                 # React hooks
│   ├── lib/                   # Utilities & types
│   ├── i18n/                  # Translations (12 languages)
│   └── stores/                # Zustand stores
└── src-tauri/
    ├── resources/
    │   └── models.json        # Model configurations (NEW)
    ├── src/
    │   ├── managers/          # Business logic (audio, model, transcription)
    │   ├── commands/          # Tauri IPC commands
    │   ├── audio_toolkit/     # Audio processing
    │   ├── model_config.rs    # Model config loader (NEW)
    │   └── llm_inference.rs   # Offline LLM inference (NEW)
    └── resources/             # Static assets
```

### Legacy Desktop (Refactored)
```
apps/desktop/
├── src/
│   ├── config/
│   │   ├── constants.js       # Centralized configuration (NEW)
│   │   └── index.js           # Config exports (NEW)
│   ├── main/                  # Refactored main process (NEW)
│   │   ├── index.js           # Entry point
│   │   ├── window-manager.js  # Window management
│   │   ├── tray-manager.js    # Tray management
│   │   └── python-manager.js  # Python process management
│   └── utils/                 # Utility modules (NEW)
│       ├── secureStorage.js   # Secure API key storage
│       ├── logger.js          # Centralized logging
│       ├── migration.js       # Migration utilities
│       └── index.js           # Utils exports
├── tests/
│   └── unit/                  # Unit tests
│       ├── secureStorage.test.js (NEW)
│       ├── logger.test.js     (NEW)
│       └── constants.test.js  (NEW)
└── IMPROVEMENTS.md            # Detailed improvement guide
```

## Internationalization (i18n)

All user-facing text must be translatable:
- Use `const { t } = useTranslation()`
- Add keys to `src/i18n/locales/{lang}/translation.json`
- ESLint will catch untranslated literal strings
- Support 12 languages: en, de, es, fr, it, ja, pl, pt, ru, uk, vi, zh

## Testing Requirements

- Run `bun run lint` and `bun run typecheck` before committing
- Rust tests: `bun run test:rust`
- Single test: `cd src-tauri && cargo test test_name`
- E2E tests: `bun run test:e2e`
- New modules should have unit tests

## Important Rules

1. **Always work in `apps/tauri-v2/`** unless told otherwise
2. **Never use root-level legacy files** - they're archived
3. **All UI text must be i18n-ready** - use translation keys
4. **Run linting before commits** - husky pre-commit hooks
5. **Use path aliases** - `@/` for imports, not relative paths
6. **Error boundaries** - wrap components that may fail
7. **Secure storage** - Never store API keys in plaintext JSON
8. **Structured logging** - Use logger module, not console.log
9. **Single source of truth** - Use constants module for config

## Model Setup (Required)

```bash
mkdir -p src-tauri/resources/models
curl -o src-tauri/resources/models/silero_vad_v4.onnx \
  https://blob.handy.computer/silero_vad_v4.onnx
```

## Dependencies Added

### Legacy Desktop
- `keytar@7.9.0` - OS keychain integration

### Tauri Desktop
- `llama-cpp` - llama.cpp Rust bindings (for offline LLM)
- `lazy_static` - Global singleton pattern

## Migration Guide

### For Legacy Desktop Users
1. Install new dependency: `npm install`
2. Run app - migrations will auto-execute
3. API keys will be migrated from settings.json to secure storage

### For Developers
1. Review `IMPROVEMENTS.md` in `apps/desktop/`
2. Use new modules in new code
3. Gradually refactor old code

## Documentation

- `AUDIT_REPORT.md` - Complete audit findings
- `IMPLEMENTATION_SUMMARY.md` - Summary of all changes
- `apps/desktop/IMPROVEMENTS.md` - Legacy app integration guide
- `apps/tauri-v2/src-tauri/resources/models.json` - Model definitions

## Key Files Reference

### Configuration
- `apps/desktop/src/config/constants.js` - Legacy app constants
- `apps/tauri-v2/src-tauri/resources/models.json` - Tauri model config
- `apps/tauri-v2/src-tauri/src/model_config.rs` - Config loader

### Security
- `apps/desktop/src/utils/secureStorage.js` - Secure storage module

### Logging
- `apps/desktop/src/utils/logger.js` - Logger module
- `apps/tauri-v2/src-tauri/src/lib.rs` - Rust logging setup

### Offline LLM
- `apps/tauri-v2/src-tauri/src/llm_inference.rs` - Inference engine
- `apps/tauri-v2/src-tauri/src/managers/offline_llm.rs` - Model manager

---

Last Updated: February 6, 2026
