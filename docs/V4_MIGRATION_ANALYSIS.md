# Sonu v4 Architecture Analysis: FasterWhisper vs Whisper.cpp Migration Decision

**Date:** 2025-01-XX  
**Status:** Analysis Complete - Plan Saved for Future Reference  
**Decision:** Keep FasterWhisper for Desktop (v3.x), Use Whisper.cpp for Mobile (v4.0)

---

## Executive Summary

**RECOMMENDATION: KEEP FasterWhisper for Desktop, CONSIDER Whisper.cpp ONLY for Mobile**

**Justification:** The codebase is optimized for faster-whisper. INT8 quantization is already implemented (`compute_type="int8"` at line 123,125 in `whisper_service.py`), model management system works, and faster-whisper is 3-4x faster on Intel CPUs. Migration to Whisper.cpp would require significant refactoring for minimal benefit on desktop. However, Whisper.cpp is the right choice for iOS/Android due to CoreML/NNAPI support and smaller binary size.

---

## 1. CURRENT IMPLEMENTATION AUDIT

### Codebase Structure Analysis

**Project Structure:**
```
SONU/
├── main.js (5187 lines) - Electron main process, IPC handlers, hotkey management
├── renderer.js (4645 lines) - UI logic, state management
├── preload.js - IPC bridge
├── whisper_service.py (578 lines) - Core transcription service
├── model_manager.py (370 lines) - Model download/management
├── system_utils.py - System information collection
├── package.json - Electron build config (electron-builder, NSIS installer)
├── requirements.txt - Python dependencies
└── data/ - User settings, history, dictionary
```

**Main Entry Point:** `main.js` (line 1) - Electron main process  
**Core Transcription Service:** `whisper_service.py` (line 1) - Python subprocess spawned by Electron

### FasterWhisper Usage Analysis

**All FasterWhisper imports and usage:**

1. **`whisper_service.py:26`** - Primary import:
```python
from faster_whisper import WhisperModel
FASTER_WHISPER_AVAILABLE = True
```

2. **`whisper_service.py:115-138`** - Model loading:
```python
def load_model_faster_whisper():
    """Load model using faster-whisper"""
    global model, model_ready
    try:
        sys.stderr.write(f"Loading model '{model_size}' with faster-whisper...\n")
        sys.stderr.flush()
        
        if os.path.isdir(model_size):
            model = WhisperModel(model_size, device="cpu", compute_type="int8")
        else:
            model = WhisperModel(model_size, device="cpu", compute_type="int8")
        
        model_ready = True
        sys.stderr.write("faster-whisper model loaded successfully\n")
        sys.stderr.flush()
        print("EVENT: READY")
        sys.stdout.flush()
    except Exception as e:
        sys.stderr.write(f"Failed to load faster-whisper model: {e}\n")
        sys.stderr.flush()
        model_ready = False
        print("EVENT: ERROR")
        sys.stdout.flush()
        raise
```

3. **`whisper_service.py:378`** - Final transcription:
```python
segments, info = model.transcribe(tmp_path, beam_size=5, language="en")
text = "".join([seg.text for seg in segments]).strip()
```

4. **`whisper_service.py:429`** - Partial transcription with VAD:
```python
segments, info = model.transcribe(tmp_path, beam_size=5, language="en", vad_filter=use_vad)
text = "".join([seg.text for seg in segments]).strip()
```

**GUI Framework:** Electron 28.0.0 (Chromium + Node.js) - Mature, production-ready

### Audio Pipeline Deep Dive

**VAD Implementation:**
- Library: faster-whisper's built-in VAD (Silero VAD internally)
- Usage: `vad_filter=use_vad` parameter in `transcribe_recent_seconds()` (line 429)
- Partial updates: VAD disabled (`use_vad=False` at line 478) for speed
- Final transcription: VAD enabled conditionally

**Audio Buffering:**
```python
CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000
```
- Real-time capture: PyAudio with 1024-byte chunks at 16kHz
- Buffering: `frames` list accumulates audio chunks (line 105)
- Thread-safe: Uses `threading.Lock()` (line 108)

**Model Loading:**
- Models: tiny, base, small, medium, large-v3 (faster-whisper standard names)
- Download: Automatic via Hugging Face Systran repositories
- Cache Location:
  - Windows: `%LOCALAPPDATA%\.cache\huggingface\hub\models--openai--whisper-{model}\`
  - Linux/Mac: `~/.cache/huggingface/hub/models--openai--whisper-{model}/`
- Loading: Background thread on startup (line 204-205)

**Transcription Loop Parameters:**
```python
segments, info = model.transcribe(tmp_path, beam_size=5, language="en")
```
- `beam_size=5` (line 378, 429) - Moderate accuracy/speed balance
- `compute_type="int8"` (line 123, 125) - INT8 quantization enabled ✅
- `language="en"` - Hardcoded English
- `vad_filter` - Conditionally enabled for partials (disabled for speed at line 478)
- Missing: `cpu_threads` parameter not specified (uses faster-whisper defaults) ⚠️

**Partial Update Loop:**
- Update interval: 50ms (line 465)
- Progressive windows: 0.8s → 1.0s → 1.5s (line 476)
- VAD disabled for partials for speed

### Build & Distribution System

**Build Method:** electron-builder v24.9.0 with NSIS installer

**Build Configuration:**
```json
{
  "build": {
    "appId": "com.offlinevoicetyping.app",
    "productName": "Offline Voice Typing",
    "win": {
      "target": ["nsis"]
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    },
    "files": [
      "**/*",
      "!**/*.md",
      "whisper_service.py"
    ]
  }
}
```

**Distribution Size:** Not explicitly configured. Electron apps typically 100-200MB, plus Python runtime. Target <30MB is unrealistic for Electron + Python + models.

**Distribution Method:** NSIS installer for Windows (one-click disabled, custom install path allowed)

---

## 2. PERFORMANCE ANALYSIS FOR HARDWARE

**Hardware:** i7-8565U (4C/8T, 1.80GHz), 16GB RAM, no GPU

### Current Performance (FasterWhisper)

**Real-Time Factor Estimate:**
- Model: `base` (145MB, default in code)
- With INT8 quantization: ~0.3-0.5x RTF (faster than real-time)
- With 1.8GHz CPU: ~0.4-0.6x RTF expected
- Small.en equivalent: `tiny` model would be ~0.2-0.3x RTF (very fast)

**Memory Footprint:**
- Base model (INT8): ~200-300MB RAM
- Electron: ~150-200MB
- Python process: ~100-150MB
- Total: ~450-650MB during transcription
- 16GB RAM: No issues ✅

**Startup Time:**
- Model loading: Background thread (line 204), non-blocking
- First transcription: Waits for model ready (line 493-498)
- Typical: 2-5 seconds for base model on CPU

**Blocking Operations:**
1. Model loading (background thread, non-blocking)
2. Final transcription (background thread, line 327, 520)
3. Partial transcription (50ms loop, non-blocking)

### Optimization Gaps

**INT8 Quantization:** ✅ Already using
```python
model = WhisperModel(model_size, device="cpu", compute_type="int8")
```

**CPU Thread Optimization:** ❌ Missing
- No `cpu_threads` parameter specified
- faster-whisper defaults to all available threads
- Recommendation: Add `cpu_threads=4` (4 physical cores) to model initialization

**VAD Filtering:** ✅ Conditionally used
- Enabled for final transcription (line 429)
- Disabled for partials for speed (line 478)

**Beam Size:** ⚠️ Could be optimized
- Current: `beam_size=5` (line 378, 429)
- CHANGELOG mentions `beam_size=1` for speed (line 48)
- Recommendation: Use `beam_size=1` for partials, `beam_size=5` for final

**Model Caching:** ✅ Implemented
- Models cached in Hugging Face cache
- Model loaded once per session (line 115-138)

### Whisper.cpp Projection (If Migrated)

**Expected Speed Reduction:**
- 2-4x slower than faster-whisper on Intel CPU
- Hardware: ~1.2-2.4x RTF (slower than real-time)
- Would require larger models or longer wait times

**Memory Savings:**
- Minimal: ~50-100MB less RAM
- Not significant given 16GB

**Code Complexity Increase:**
- Current: Python API (clean, line 378)
- Whisper.cpp: Subprocess calls (line 381-392) or C++ bindings
- Effort: High (refactor transcription logic, model management, error handling)

---

## 3. ARCHITECTURE RECOMMENDATION

### Hybrid Approach Evaluation

**Desktop (Win/Linux/macOS) → KEEP FasterWhisper**

**Analysis:**
- ✅ Codebase optimized for faster-whisper
- ✅ 3-4x faster on Intel CPUs
- ✅ Python integration is clean
- ✅ Model management system works
- ✅ INT8 quantization already implemented

**Mobile (iOS/Android) → USE Whisper.cpp**

**Analysis:**
- ✅ CoreML/NNAPI support for mobile acceleration
- ✅ Smaller binary size (no Python runtime)
- ✅ Better battery efficiency
- ✅ Native mobile frameworks (Swift/Kotlin)

**Code Sharing Potential:**
- ❌ Minimal: Python logic can't run on mobile
- ✅ Shared: Model files (different formats: CTranslate2 vs GGML)
- ✅ Shared: UI/UX concepts, transcription logic patterns
- ⚠️ Model compatibility: No - faster-whisper uses CTranslate2, whisper.cpp uses GGML

**Tauri Migration for Desktop:**
- ❌ Not recommended: Electron codebase is mature (5187 lines main.js, 4645 lines renderer.js)
- ⚠️ Effort: 40-60 hours to migrate
- ⚠️ Benefits: Smaller bundle (~20-30MB vs 100-200MB), but you'd lose:
  - Existing IPC handlers
  - Hotkey system
  - System tray integration
  - Model management UI
- ✅ Recommendation: Keep Electron for v3.x

### GUI Framework Decision

**Current UI:** Electron 28.0.0
- Maturity: Production-ready
- Performance: Good for desktop apps
- Distribution size: ~100-200MB (typical for Electron)
- Code: 4645 lines of renderer.js, complex UI

**Tauri Migration:**
- Effort: 40-60 hours
- Distribution size: ~20-30MB (significant reduction)
- Risk: High (complete rewrite of IPC, hotkeys, system integration)

**Recommendation:** Keep Electron for v3.x. Consider Tauri for v5 if bundle size becomes critical.

---

## 4. CODE-LEVEL MIGRATION ANALYSIS

### Before/After Code Examples

**Current FasterWhisper Transcription (Final):**
```python
segments, info = model.transcribe(tmp_path, beam_size=5, language="en")
text = "".join([seg.text for seg in segments]).strip()
```

**Equivalent Whisper.cpp Implementation:**
```python
# Would require subprocess call (already implemented as fallback at line 381-392)
cmd = [WHISPER_BINARY, "-m", model, "-f", tmp_path, "--no-timestamps", "-l", "en", "-t", "4"]
result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
if result.returncode == 0:
    text = result.stdout.strip()
    # Remove metadata lines
    lines = text.split('\n')
    text_lines = [line for line in lines if not line.strip().startswith('[') and line.strip()]
    text = ' '.join(text_lines).strip()
```

**Required Changes:**
1. Model loading: Replace `WhisperModel()` with binary path detection (line 140-192)
2. Transcription: Replace Python API with subprocess calls (already implemented as fallback)
3. Model management: Update `model_manager.py` to use GGML format (currently has whisper.cpp code but outdated)
4. Error handling: Different error patterns from subprocess vs Python exceptions

### Refactoring Steps

**Files to Modify:**
1. `whisper_service.py` (578 lines)
   - Lines 115-138: Model loading function
   - Lines 377-379: Final transcription
   - Lines 428-430: Partial transcription
   - Estimated: 8-12 hours

2. `model_manager.py` (370 lines)
   - Currently has whisper.cpp download logic but outdated
   - Lines 16-24: Model definitions need update
   - Estimated: 4-6 hours

3. `main.js` (5187 lines)
   - Model detection logic (lines 4243-4307)
   - Cache path detection (lines 3546, 4428, 4460, etc.)
   - Estimated: 6-8 hours

4. `requirements.txt`
   - Remove `faster-whisper>=1.0.0`
   - Add whisper.cpp binary distribution method
   - Estimated: 1 hour

**New Dependencies:**
- None (whisper.cpp is a binary, not a Python package)
- Need to bundle binary or provide download mechanism

**Total Estimated Hours:** 19-27 hours for full migration

---

## 5. PRODUCTION READINESS GAP ANALYSIS

### Critical Features

**Auto-updater:** ❌ Not implemented
```javascript
function checkForUpdates() {
  // Open update check dialog or website
  shell.openExternal('https://github.com/your-repo/offline-voice-typing/releases');
}
```
- Current: Opens GitHub releases page
- Needed: `electron-updater` integration
- Effort: 8-12 hours

**Model Manager:** ✅ Implemented
- UI for downloading/switching models (Settings > Model tab)
- Download progress tracking
- Model cache management

**System Integration:** ✅ Partially implemented
- ✅ Global hotkeys: `registerHotkeys()` at line 1275-1303
- ✅ System tray: Tray icon and context menu
- ❌ Global hotkeys: May need elevation on Windows
- ❌ System tray: Basic implementation, could be enhanced

**Error Handling:** ✅ Good
- Model readiness checks (line 493-498)
- Graceful fallbacks
- Error events via stdout (line 136, 359)

**Cross-platform Paths:** ✅ Handled
- Windows: `%LOCALAPPDATA%` (line 163-165)
- Linux/Mac: `~/.cache` (implicit in faster-whisper)

### Distribution

**Current Installer Size:**
- Not explicitly configured
- Electron base: ~100-200MB
- Python runtime: Not bundled (requires system Python)
- Models: Downloaded separately
- Target <30MB: Unrealistic for Electron

**Code Signing:** ❌ Not configured
- Windows: No certificate in `package.json`
- macOS: No Apple Developer account setup
- Needed for production distribution

**CI/CD Setup:** ❌ Not found
- No GitHub Actions workflows
- No automated builds
- Manual build process only

---

## 6. SPECIFIC QUESTIONS ANSWERED

### 1. Should I migrate desktop to Whisper.cpp?

**NO** - Keep FasterWhisper for desktop

**Evidence from code:**
- ✅ INT8 quantization already implemented (line 123, 125)
- ✅ Clean Python API integration (line 378)
- ✅ Model management system works
- ✅ 3-4x faster on Intel CPU
- ⚠️ Missing `cpu_threads` optimization (easy fix)

**Impact on 16GB RAM:**
- Current: ~450-650MB during transcription
- Whisper.cpp: ~400-550MB (minimal savings)
- No benefit for hardware

**Recommendation:** Optimize current implementation:
```python
# Add to load_model_faster_whisper() at line 123, 125:
model = WhisperModel(model_size, device="cpu", compute_type="int8", cpu_threads=4)
```

### 2. Keep current GUI or move to Tauri?

**Keep Electron for v3.x**

**Distribution Size Comparison:**
- Electron: ~100-200MB (current)
- Tauri: ~20-30MB (potential)
- Target <30MB: Only achievable with Tauri

**Effort Estimate Based on Code:**
- `main.js`: 5187 lines (IPC handlers, hotkey system, model management)
- `renderer.js`: 4645 lines (complex UI state management)
- Estimated migration: 40-60 hours
- Risk: High (complete rewrite of IPC layer)

**Recommendation:** Keep Electron for v3.x. Consider Tauri for v5 if bundle size becomes critical.

### 3. Repository structure for v4

**Current:** `/root` (monolithic)

**Proposed:** `/apps/desktop`, `/apps/mobile`, `/core/shared`

**Exact `git mv` Commands:**
```bash
# Create new structure
mkdir -p apps/desktop apps/mobile core/shared

# Move desktop files (keep current structure)
git mv main.js apps/desktop/
git mv renderer.js apps/desktop/
git mv preload.js apps/desktop/
git mv whisper_service.py apps/desktop/
git mv system_utils.py apps/desktop/
git mv model_manager.py apps/desktop/
git mv package.json apps/desktop/
git mv requirements.txt apps/desktop/
git mv index.html apps/desktop/
git mv styles.css apps/desktop/
git mv assets apps/desktop/
git mv data apps/desktop/
git mv scripts apps/desktop/
git mv tests apps/desktop/

# Move shared documentation
git mv README.md core/shared/
git mv ARCHITECTURE.md core/shared/
git mv CHANGELOG.md core/shared/
git mv LICENSE core/shared/

# Keep root-level configs
# config.json, .gitignore, etc. stay at root
```

**Mobile structure:** Create new (Swift/Kotlin) - no Python files to move

### 4. Lowest-effort mobile path

**Can I reuse Python logic?** ❌ No
- Python can't run natively on iOS/Android
- Would require Python runtime bundling (large, complex)

**Complete rewrite necessary?** ✅ Yes, but with shared patterns:
- Transcription logic patterns (audio capture, chunking, VAD)
- Model management concepts
- UI/UX design
- But implementation: Swift (iOS) / Kotlin (Android)

**Lowest-effort path:**
1. Use whisper.cpp bindings for mobile:
   - iOS: Swift wrapper for whisper.cpp
   - Android: JNI bindings for whisper.cpp
2. Reuse model download logic (HTTP download, similar to `model_manager.py`)
3. Shared UI/UX concepts (but native implementation)

**Estimated effort:** 80-120 hours for basic mobile app

### 5. Cursor-specific development setup

**Dev Container Configuration:**
```json
// .devcontainer/devcontainer.json
{
  "name": "SONU Development",
  "image": "mcr.microsoft.com/devcontainers/python:3.11",
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "18"
    }
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-python.python",
        "dbaeumer.vscode-eslint",
        "ms-vscode.vscode-typescript-next"
      ],
      "settings": {
        "python.defaultInterpreterPath": "/usr/local/bin/python",
        "python.linting.enabled": true
      }
    }
  },
  "postCreateCommand": "pip install -r requirements.txt && npm install",
  "remoteUser": "vscode"
}
```

**Launch Configurations:**
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Desktop App",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "runtimeArgs": ["."],
      "cwd": "${workspaceFolder}/apps/desktop"
    },
    {
      "name": "Debug Python Service",
      "type": "debugpy",
      "request": "launch",
      "program": "${workspaceFolder}/apps/desktop/whisper_service.py",
      "console": "integratedTerminal",
      "env": {
        "WHISPER_MODEL": "base"
      }
    }
  ]
}
```

---

## 7. EFFORT & RISK ASSESSMENT

### Hours Estimate

**Path 1: Keep FasterWhisper, Optimize Current (Recommended)**
- Add `cpu_threads=4`: 0.5 hours
- Optimize `beam_size` for partials: 1 hour
- Add auto-updater: 8-12 hours
- Code signing setup: 4-6 hours
- CI/CD setup: 6-8 hours
- **Total: 19.5-27.5 hours**

**Path 2: Migrate Desktop to Whisper.cpp**
- Refactor `whisper_service.py`: 8-12 hours
- Update `model_manager.py`: 4-6 hours
- Update `main.js` model detection: 6-8 hours
- Testing and debugging: 8-12 hours
- **Total: 26-38 hours**
- **Risk: High** (performance regression, breaking changes)

**Path 3: Migrate to Tauri**
- Rewrite IPC layer: 20-30 hours
- Port hotkey system: 8-12 hours
- Port system tray: 4-6 hours
- Port model management: 8-12 hours
- Testing: 8-12 hours
- **Total: 48-72 hours**
- **Risk: Very High** (complete rewrite)

**Path 4: Hybrid (Desktop FasterWhisper + Mobile Whisper.cpp)**
- Desktop optimizations: 19.5-27.5 hours (Path 1)
- Mobile app (iOS/Android): 80-120 hours
- **Total: 99.5-147.5 hours**
- **Risk: Medium** (new platform, but desktop stable)

### Risk Levels

| Change | Risk Level | Rollback Strategy |
|--------|-----------|-------------------|
| Optimize FasterWhisper | Low | Revert parameter changes |
| Migrate to Whisper.cpp | High | Git revert, restore faster-whisper code |
| Migrate to Tauri | Very High | Maintain Electron branch in parallel |
| Add Mobile Support | Medium | Separate codebase, no desktop impact |

### Rollback Strategy

**If FasterWhisper optimization fails:**
- Git revert specific commits
- All changes are parameter tweaks, easily reversible

**If Whisper.cpp migration fails:**
- Code already has fallback logic (line 57-79)
- Can revert to faster-whisper by changing `ENGINE_PREFERENCE`
- Model detection auto-falls back (line 74-77)

**If Tauri migration fails:**
- Maintain Electron branch
- Tauri in separate branch
- Can switch branches for releases

---

## 8. FINAL RECOMMENDATIONS

### For v3.x Release (Desktop)

1. ✅ **Keep FasterWhisper for Desktop**
   - Add `cpu_threads=4` optimization
   - Optimize `beam_size` (1 for partials, 5 for final)
   - No migration needed

2. ✅ **Keep Electron Framework**
   - Mature codebase, production-ready
   - Tauri migration too risky for v3.x

3. ⚠️ **Add Production Features**
   - Auto-updater (`electron-updater`)
   - Code signing (Windows cert, Apple dev account)
   - CI/CD (GitHub Actions)

4. ✅ **Prepare for Mobile (v4.0)**
   - Use Whisper.cpp for iOS/Android
   - Separate mobile codebase
   - Shared UI/UX concepts only

### Code Changes for Immediate Optimization

**File: `whisper_service.py`**

**Line 123, 125 - Add CPU thread optimization:**
```python
# Change from:
model = WhisperModel(model_size, device="cpu", compute_type="int8")

# To:
model = WhisperModel(model_size, device="cpu", compute_type="int8", cpu_threads=4)
```

**Line 378 - Optimize final transcription (keep current):**
```python
# Current is good: beam_size=5 for accuracy
segments, info = model.transcribe(tmp_path, beam_size=5, language="en")
```

**Line 429 - Optimize partial transcription:**
```python
# Change from:
segments, info = model.transcribe(tmp_path, beam_size=5, language="en", vad_filter=use_vad)

# To:
segments, info = model.transcribe(tmp_path, beam_size=1, language="en", vad_filter=use_vad, temperature=0, best_of=1)
```

**Estimated performance improvement:** 10-20% faster partials, same final accuracy

---

## Conclusion

The codebase is well-optimized for FasterWhisper. Migration to Whisper.cpp would provide minimal benefits on desktop while requiring significant refactoring. Focus on optimizing the current implementation and adding production features (auto-updater, code signing) for v3.x. Consider Whisper.cpp only for mobile platforms (v4.0) where it provides native acceleration benefits.

**Next Steps:**
1. Implement CPU thread optimization (0.5 hours)
2. Optimize beam_size for partials (1 hour)
3. Add auto-updater (8-12 hours)
4. Set up code signing (4-6 hours)
5. Plan mobile architecture for v4.0 (separate effort)

---

**Status:** Analysis complete - Saved for reference  
**Version 3.x Focus:** Desktop environment with FasterWhisper optimizations  
**Version 4.0 Focus:** Mobile and IoT devices with Whisper.cpp

