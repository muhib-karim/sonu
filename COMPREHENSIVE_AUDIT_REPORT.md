# SONU Codebase Audit Report

**Date**: February 19, 2026  
**Audited by**: OpenCode Agent  
**Scope**: Full codebase analysis of desktop (Electron) and Tauri applications for production readiness

---

## Executive Summary

This audit identifies **critical security vulnerabilities**, **architectural debt**, and **missing safety mechanisms** in the SONU codebase. While the app shows sophisticated feature development (LLM integration, context awareness, multi-model support), production readiness requires immediate attention to Electron security, error handling, and testing coverage.

### Top 5 Critical Risks

1. **Critical Security**: Preload script exposes excessive IPC surface without validation
2. **Critical Reliability**: Uncaught Python process spawn failures, missing try/catch on critical paths
3. **High Architecture**: Duplicate entry points (main.js vs src/main/index.js) cause confusion and deployment drift
4. **High Maintainability**: 40+ legacy/debug/test files scattered in production directories
5. **High Testing**: E2E tests have 180-600s timeouts but no cancellation/timeout mechanisms in production code

---

## Detailed Findings

### 1. Desktop Application (Electron)

#### Security Issues

| Severity | Issue | Location | Impact | Recommendation |
|----------|-------|----------|--------|----------------|
| **Critical** | IPC handlers don't validate parameters before passing to shell commands | `main.js:1100+` | RCE via crafted IPC calls | Add Zod validation schemas for all IPC params |
| **Critical** | `contextBridge` exposes 80+ methods via single namespace - violates principle of least privilege | `preload.js:1-200` | Increased attack surface | Split into domains (recording, settings, models) |
| **High** | Python spawned with user-controlled model paths without sanitization | `main.js:1500+` | Path traversal, command injection | Use path.resolve() + strict allow-list |
| **High** | `nodeIntegration` status unclear in BrowserWindow config | Window creation code | Potential sandbox escape | Explicitly disable nodeIntegration, enable contextIsolation |
| **Medium** | `shell.openExternal` called with user-provided URLs without validation | Settings panel | Open redirect, phishing | Validate URLs against allow-list |

#### Reliability Issues

| Severity | Issue | Location | Evidence | Recommendation |
|----------|-------|----------|----------|----------------|
| **Critical** | Whisper process spawn has no try/catch | `main.js:~500` | `spawn()` can throw if Python missing | Wrap in try/catch with user-friendly error |
| **Critical** | Global shortcuts registered without checking success | `main.js:~280` | Silent failure if shortcut taken | Check return value, show error dialog |
| **High** | Window state not persisted/restored on crash | Missing | User loses widget position | Implement state persistence with electron-window-state |
| **High** | Multiple robot libraries loaded with cascading fallbacks | `main.js:~100-150` | First failure logged but app continues | Fail fast with clear error message |
| **Medium** | `robotType` null check missing before use | `main.js:typing functions` | Potential null reference | Add guard clauses |

#### Architecture Issues

| Severity | Issue | Evidence | Recommendation |
|----------|-------|----------|----------------|
| **Critical** | Two main entry points: `main.js` (1500+ lines) and `src/main/index.js` (200 lines) | Both exist, different architectures | Choose one, delete the other, update package.json |
| **High** | `src/` directory has both new modular code and old monolithic code | `audio_processor.js`, `model_downloader.js` at root | Move legacy files to `src/legacy/` or delete |
| **High** | Services in `src/services/` and `src/core/services/` - duplication | Two window-manager.js files | Consolidate to single location |
| **Medium** | `logger.js` at root duplicates `src/utils/logger.js` | Two logger implementations | Delete root logger.js |

#### Testing Issues

| Severity | Issue | Evidence | Recommendation |
|----------|-------|----------|----------------|
| **High** | Only 7 unit test files for entire app | `tests/unit/*.test.js` | Add tests for critical paths: IPC handlers, Python spawning, model download |
| **High** | E2E tests depend on external model downloads | `model_download_comprehensive.test.js` | Mock HTTP responses, use fixtures |
| **Medium** | No integration tests for Python bridge | Missing | Add tests for whisper_service.py integration |
| **Medium** | Test timeouts extremely long (600s) without progress | `package.json` scripts | Add intermediate checkpoints, fail fast on common errors |

### 2. Tauri Application

#### Security Issues

| Severity | Issue | Location | Evidence | Recommendation |
|----------|-------|----------|----------|----------------|
| **Medium** | CSP allows `https://api.openai.com` etc. without nonce/hash | `tauri.conf.json` | Any XSS could exfiltrate to these endpoints | Use strict CSP, move API calls to Rust backend |
| **Medium** | Asset protocol scope allows `$RESOURCE/**` recursively | `tauri.conf.json` | Potential info disclosure | Narrow to specific file patterns |
| **Low** | Debug assertions with `expect()` in production code | `lib.rs:run()` | Panic on specta export failure | Use `unwrap_or_else` with logging |

#### Reliability Issues

| Severity | Issue | Location | Evidence | Recommendation |
|----------|-------|----------|----------|----------------|
| **High** | Model loading can hang indefinitely | `transcription.rs:114-140` | No timeout on ParakeetEngine init | Add timeout with cancellation |
| **High** | Mutex poisoning not recovered | `transcription.rs` | Uses `PoisonError` but no recovery | Implement panic recovery or use parking_lot |
| **Medium** | Download cancellation uses shared boolean not atomic | `models.rs` | Race condition possible | Use `Arc<AtomicBool>` |
| **Medium** | No retry logic for network operations | `download_model` | Single failure fails entire download | Add exponential backoff retry |

#### Architecture Issues

| Severity | Issue | Evidence | Recommendation |
|----------|-------|----------|----------------|
| **Medium** | Commands module getting large (monolithic) | `commands/mod.rs` has 50+ commands | Split into submodules by domain |
| **Medium** | Settings shortcuts mixed with other commands | `shortcut.rs` and `commands/` | Consolidate shortcut logic |
| **Low** | Unused CLI binary commented in Cargo.toml | `Cargo.toml:40-42` | Remove or implement |

#### Testing Issues

| Severity | Issue | Evidence | Recommendation |
|----------|-------|----------|----------------|
| **High** | Only 2 test files in src/ directory | `__tests__/*.test.tsx` | Add tests for managers, commands, hooks |
| **High** | No Rust unit tests for critical managers | `managers/*.rs` | Add tests for transcription, model, audio managers |
| **Medium** | E2E test only covers basic app spec | `e2e/app.spec.ts` | Add tests for recording flow, model download, settings |
| **Medium** | vitest.config.ts excludes `**/bindings.ts` | Coverage config | Verify coverage of actual bindings, not just exclusion |

### 3. Cross-Cutting Issues

#### Duplication & Dead Code

- **Root level**: `model_downloader.py`, `check_llm.py` - Python duplicates in root
- **Desktop app**: 40+ debug/test files (`test_*.js`, `*_output.txt`, `minimal_*.js`)
- **Legacy modules**: `src/core/services/` and `src/services/` - identical purpose
- **Backup files**: `whisper_service_backup.py`, `model_manager_backup.py`

#### Dependency Issues

**Desktop**:
- `robotjs` (unmaintained) and `robot-js` (old) both in deps - security risk
- `@electron/remote` - deprecated pattern, should use IPC
- `spectron` in devDeps - deprecated, blocks Electron upgrades

**Tauri**:
- Multiple git dependencies (`rdev`, `vad-rs`, `rodio`) - build instability risk
- `transcribe-rs` pinned to specific version - may miss security fixes

#### Workflow/Hygiene Issues

- **No automated linting** in desktop app (husky only runs tests)
- **Prettier not configured** for desktop JavaScript
- **Python linting** optional in root hook, not enforced
- **Tauri has no husky hooks** (`.husky` directory missing)

---

## Quick Wins (< 1 Day)

1. **Delete dead code** - Remove 40+ debug/test files from `apps/desktop/`
2. **Consolidate entry points** - Delete `src/main/index.js`, use `main.js` as single entry
3. **Add ESLint to desktop** - Copy Tauri's eslint.config.js, adapt for Electron
4. **Fix CSP in Tauri** - Remove `unsafe-inline` from style-src
5. **Add try/catch to Python spawn** - 5-line fix prevents crash
6. **Document which main.js is active** - Add comment to package.json

---

## Strategic Improvements (1-4 Weeks)

### Week 1: Security Hardening

1. Implement IPC parameter validation using Zod schemas
2. Split preload script into domain-specific APIs
3. Add path traversal protection to all file operations
4. Audit and remove `nodeIntegration` anywhere it's enabled
5. Add URL validation for `shell.openExternal`

### Week 2: Reliability & Error Handling

1. Implement structured error boundaries in Electron
2. Add timeouts to all Python process operations
3. Add retry logic with exponential backoff for downloads
4. Implement proper window state persistence
5. Add health check endpoint for Python service

### Week 3: Testing Infrastructure

1. Add unit tests for critical IPC handlers (target: 80% coverage)
2. Mock HTTP in E2E tests to eliminate external dependencies
3. Add Python bridge integration tests
4. Add Rust unit tests for managers
5. Implement visual regression testing baseline

### Week 4: Architecture Cleanup

1. Consolidate service directories
2. Migrate legacy modules to new architecture
3. Remove deprecated dependencies (`robotjs`, `@electron/remote`, `spectron`)
4. Implement proper dependency injection for testability
5. Document module boundaries and public APIs

---

## Prioritized Roadmap

### P0 - Critical (Fix Immediately)

- [ ] Add try/catch to Python spawn in `main.js`
- [ ] Validate IPC parameters before shell execution
- [ ] Fix duplicate entry point confusion
- [ ] Add global shortcut registration error handling
- [ ] Remove `apps/desktop/src/main/index.js` or consolidate

### P1 - High (Fix in Next Sprint)

- [ ] Implement Zod validation for all IPC channels
- [ ] Add timeouts to model loading
- [ ] Delete 40+ debug/test files
- [ ] Add ESLint to desktop app
- [ ] Implement window state persistence
- [ ] Add Rust unit tests for transcription manager

### P2 - Medium (Fix in Next Quarter)

- [ ] Split preload API into domains
- [ ] Migrate from deprecated dependencies
- [ ] Consolidate service directories
- [ ] Add retry logic for downloads
- [ ] Implement proper CSP without `unsafe-inline`
- [ ] Add integration tests for Python bridge

---

## Appendices

### A. File Inventory

**Desktop App Active Files (to keep)**:
- `main.js` - Main entry point
- `preload.js` - Preload script (needs refactoring)
- `src/config/constants.js` - Centralized config
- `src/utils/logger.js` - Structured logging
- `src/utils/secureStorage.js` - Secure credential storage
- `src/core/services/*.js` - Core services
- `src/core/python/*.py` - Python services

**Desktop App Files to Delete**:
- `src/main/index.js` - Duplicate entry point
- `src/main/*.js` - Unused window/tray managers
- `src/services/*.js` - Duplicates of core/services
- `test*.js` - 20+ debug files
- `*_output.txt` - 15+ log files
- `minimal*.js` - Test scripts
- `renderer.js` - If not used
- `logger.js` (root) - Duplicate

### B. Security Checklist

- [ ] IPC parameter validation
- [ ] Path traversal protection
- [ ] CSP strictness
- [ ] nodeIntegration disabled
- [ ] contextIsolation enabled
- [ ] Preload script minimized
- [ ] URL validation for external links
- [ ] API keys in secure storage
- [ ] No secrets in logs
- [ ] Update dependencies with vulnerabilities

### C. Testing Checklist

- [ ] Unit tests for IPC handlers
- [ ] Unit tests for Python bridge
- [ ] Integration tests for recording flow
- [ ] E2E tests with mocked HTTP
- [ ] Rust unit tests for managers
- [ ] Visual regression baseline
- [ ] Performance benchmarks
- [ ] Security fuzzing for IPC

---

## Conclusion

SONU is a feature-rich application with sophisticated AI integration, but it has accumulated significant technical debt. The **most critical issues are security-related** (IPC validation, preload surface) and **reliability-related** (missing error handling). 

**Recommended immediate action**: Focus on P0 items (critical fixes) before adding new features. The codebase has solid foundations (secureStorage, logger, constants modules) that should be extended rather than bypassed.

**Success metrics**:
- Zero uncaught exceptions in production
- 80%+ test coverage for critical paths
- Clean security audit (no high/critical findings)
- <100ms startup time
- <5MB installer size increase

---

*This audit was generated by OpenCode Agent on February 19, 2026.*
