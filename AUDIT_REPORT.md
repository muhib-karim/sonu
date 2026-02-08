# SONU Codebase Audit Report

**Date:** February 6, 2026  
**Auditor:** Claude Code  
**Scope:** Full audit of Legacy Desktop (Electron) and New Desktop (Tauri) applications  

---

## Executive Summary

This audit covers two implementations of the SONU voice typing application:
- **Legacy Desktop (v3.x)**: Electron-based, Python backend
- **New Desktop (v2.x)**: Tauri-based, Rust backend

### Key Findings

| Metric | Legacy (Electron) | New (Tauri) |
|--------|------------------|-------------|
| Total Files | 92 JS/Python files | 121 TypeScript files |
| Main Process Lines | 5,883 (main.js) | Well modularized |
| Renderer Lines | 6,092 (renderer.js) | Well modularized |
| Test Success Rate | 29% (134/189 failing) | Limited coverage |
| Code Organization | Poor | Good |
| Security Issues | 2 critical | 0 critical |

---

## Phase 1: Critical Fixes (High Priority)

### 1.1 Clean Up Debug Artifacts

**Issue:** Repository contains debug files and output logs that shouldn't be in version control.

**Files to Remove:**
```
apps/desktop/test_paths.js
apps/desktop/test_electron3.js
apps/desktop/test2.js
apps/desktop/test_electron.js
apps/desktop/test_simple.js
apps/desktop/test_minimal.js
apps/desktop/debug_start.js
apps/desktop/debug_test.js
apps/desktop/simple_test.js
apps/desktop/minimal_output*.txt
apps/desktop/app_output*.txt
apps/desktop/src/core/python/whisper_service_backup.py
apps/desktop/src/core/python/model_manager_backup.py
apps/desktop/data/settings_backup.json
```

**Action:** Add to `.gitignore` and delete from repo.

### 1.2 Secure API Key Storage

**Issue:** API keys stored in plain text JSON (`settings.groq_api_key`).

**Location:** `main.js` lines 5617-5626

**Fix:** Implement `keytar` for OS keychain storage.

### 1.3 Centralized Logging

**Issue:** 100+ `console.log` statements, no log levels or persistence.

**Solution:** Create `logger.js` module with Winston or Bunyan for structured logging.

### 1.4 Extract Configuration Constants

**Issue:** Hardcoded values scattered throughout codebase.

**Extract to `src/config/constants.js`:**
- Window dimensions
- Default settings
- File paths
- API endpoints
- Model definitions

---

## Phase 2: Architecture Improvements (High Priority)

### 2.1 Refactor main.js

**Current:** 5,883 lines in single file

**Target Structure:**
```
src/
├── main/
│   ├── index.js              # Entry point (~100 lines)
│   ├── window-manager.js     # Window creation/management
│   ├── tray-manager.js       # System tray
│   ├── hotkey-manager.js     # Global shortcuts
│   ├── python-manager.js     # Python process spawning
│   ├── typing-manager.js     # Text injection
│   ├── audio-manager.js      # Audio device management
│   └── ipc-handlers/         # IPC handlers
│       ├── recording.js
│       ├── settings.js
│       ├── models.js
│       └── dictionary.js
```

### 2.2 Refactor renderer.js

**Current:** 6,092 lines in single file

**Target Structure:**
```
src/renderer/
├── index.js                  # Entry point
├── components/               # UI components
│   ├── pages/
│   │   ├── Home.js
│   │   ├── Dictionary.js
│   │   ├── Snippets.js
│   │   ├── Style.js
│   │   ├── Notes.js
│   │   └── Settings.js
│   └── shared/
│       ├── Sidebar.js
│       └── Widget.js
├── services/                 # Business logic
│   ├── i18n.js
│   ├── theme.js
│   └── storage.js
└── utils/
    ├── dom.js
    └── validation.js
```

---

## Phase 3: Code Quality (Medium Priority)

### 3.1 Centralize Model Definitions

**Issue:** Model configs exist in 3+ places

**Solution:** Single `config/models.json` loaded by all modules

### 3.2 Fix Test Suite

**Current:** 71% failure rate (134/189 tests)

**Issues:**
- Mock setup incomplete
- Missing test environment variables
- Async timing issues
- Platform-specific tests failing on wrong platform

### 3.3 Add Type Safety

**Legacy:** Add JSDoc types to major functions
**Tauri:** Already has TypeScript - ensure strict mode enabled

---

## Phase 4: Tauri App Improvements (Medium Priority)

### 4.1 Externalize Model Configuration

**File:** `src-tauri/src/managers/model.rs:70`

**TODO:** Move hardcoded model definitions to external JSON.

### 4.2 Implement Offline LLM Inference

**File:** `src-tauri/src/managers/offline_llm.rs:495-529`

**Current:** Placeholder method returning error

**Implementation:** Integrate llama.cpp via `llama-cpp-rs` crate

### 4.3 Add Comprehensive Tests

**Current:** Limited test coverage

**Add:**
- Unit tests for all managers
- E2E tests with Playwright
- Rust integration tests

---

## Phase 5: Security & Best Practices

### 5.1 Legacy App

- [ ] Add SRI hashes for external scripts
- [ ] Validate file paths before operations
- [ ] Sanitize user inputs
- [ ] Use `contextIsolation: true` (already done)

### 5.2 Tauri App

- [ ] Enable all security headers
- [ ] Validate IPC inputs
- [ ] Use capability-based permissions
- [ ] Regular dependency audits

---

## Implementation Priority Matrix

| Task | Impact | Effort | Priority |
|------|--------|--------|----------|
| Clean debug artifacts | High | Low | P0 |
| Secure API storage | Critical | Medium | P0 |
| Centralized logging | Medium | Low | P1 |
| Refactor main.js | High | High | P1 |
| Refactor renderer.js | High | High | P1 |
| Fix tests | High | High | P1 |
| Model config centralization | Medium | Medium | P2 |
| LLM inference (Tauri) | High | High | P2 |
| Add tests (Tauri) | Medium | High | P2 |

---

## Recommendations

### Short-term (Week 1-2)
1. Clean up repository
2. Implement secure API storage
3. Add centralized logging
4. Begin main.js refactoring

### Medium-term (Week 3-4)
1. Complete main.js refactoring
2. Begin renderer.js refactoring
3. Fix critical test failures
4. Externalize Tauri model config

### Long-term (Month 2)
1. Complete all refactoring
2. Implement Tauri LLM inference
3. Achieve >80% test coverage
4. Security audit pass

---

## Success Metrics

- [ ] Debug artifacts: 0 files
- [ ] API keys: 100% stored securely
- [ ] main.js: <500 lines per module
- [ ] renderer.js: <500 lines per component
- [ ] Test pass rate: >90%
- [ ] Tauri LLM: Functional inference
- [ ] Code coverage: >80%

---

## Appendix A: File Inventory

### Legacy App (apps/desktop/)

**Critical Files:**
- `main.js` (5,883 lines) - Main process
- `renderer.js` (6,092 lines) - Renderer process
- `preload.js` (158 lines) - IPC bridge
- `index.html` (~1,000 lines) - Main UI
- `widget.html` (~280 lines) - Recording widget

**Services:**
- `src/core/python/whisper_service.py` (~850 lines)
- `src/core/python/model_manager.py` (~650 lines)
- `src/core/python/llm_service.py` (~350 lines)

### Tauri App (apps/tauri-v2/)

**Backend (Rust):**
- `src-tauri/src/lib.rs` - Entry point
- `src-tauri/src/managers/*.rs` - 6 managers
- `src-tauri/src/commands/*.rs` - IPC commands

**Frontend (TypeScript):**
- `src/App.tsx` - Main component
- `src/components/` - 40+ UI components
- `src/stores/settingsStore.ts` - State management

---

*End of Audit Report*
