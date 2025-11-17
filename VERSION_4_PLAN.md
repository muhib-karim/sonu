# Version 4.0.0 Plan - Mobile & IoT Implementation with whisper.cpp

## Overview

Version 4.0.0 is planned for mobile and IoT device implementations using whisper.cpp. This version will be **completely separate** from version 3.x.x which focuses exclusively on desktop environments (Windows/Linux/macOS) with faster-whisper.

**Important:** Version 3.x.x will continue to be maintained and optimized for desktop use. Version 4.0.0 is a new codebase targeting mobile and embedded platforms.

## Target Platforms

### Mobile Devices
- **iOS**: Native iOS app with CoreML integration
- **Android**: Native Android app with TensorFlow Lite

### IoT/Embedded Devices
- **Raspberry Pi**: ARM-based devices
- **Other ARM devices**: Various embedded systems

## Key Features

### 1. Engine Selection System
- **Automatic Detection**: Auto-detect available engines (faster-whisper vs whisper.cpp)
- **Manual Selection**: Allow users to manually select engine via settings or environment variable
- **Fallback Logic**: Graceful fallback if preferred engine is unavailable

### 2. whisper.cpp Integration
- **Binary Detection**: Auto-detect whisper.cpp binary in common locations
- **Model Management**: Support for GGML format models
- **Model Download**: Download GGML models from HuggingFace
- **Path Resolution**: Check multiple locations for models:
  - `%LOCALAPPDATA%/whisper-models/` (Windows)
  - `~/models/` (Linux/Mac)
  - App directory `models/`
  - Current directory

### 3. Unified Model Interface
- **Abstract Engine Interface**: Common interface for both faster-whisper and whisper.cpp
- **Transcription Methods**: Unified transcription methods that work with both engines
- **Model Loading**: Engine-specific model loading functions

## Implementation Details

### Files Modified

#### `whisper_service.py`
- Added engine detection and selection logic
- Added `FASTER_WHISPER_AVAILABLE` and `WHISPER_CPP_AVAILABLE` flags
- Added `detect_best_engine()` function
- Added `load_model_faster_whisper()` and `load_model_whisper_cpp()` functions
- Modified `transcribe_frames()` to support both engines
- Modified `transcribe_recent_seconds()` to support both engines
- Added subprocess support for whisper.cpp binary execution

#### `model_manager.py`
- Updated to support GGML format models for whisper.cpp
- Added model path resolution for whisper.cpp models
- Added download URLs for GGML models from HuggingFace

#### `requirements.txt`
- Added comments explaining faster-whisper for desktop
- Added comments explaining whisper.cpp for embedded/IoT
- Kept faster-whisper as primary dependency

#### `package.json`
- Version bumped to 4.0.0

#### `main.js`
- Added engine selection UI in settings
- Added environment variable support for engine selection

#### `system_utils.py`
- Added engine detection utilities

### Engine Detection Logic

```python
# Auto-detect best available engine
def detect_best_engine():
    if ENGINE_PREFERENCE == "faster-whisper":
        if FASTER_WHISPER_AVAILABLE:
            return "faster-whisper"
        else:
            # Fallback warning
            return None
    
    if ENGINE_PREFERENCE == "whisper-cpp":
        if WHISPER_CPP_AVAILABLE:
            return "whisper-cpp"
        else:
            # Fallback warning
            return None
    
    # Auto-detect: prefer faster-whisper if available, else whisper.cpp
    if FASTER_WHISPER_AVAILABLE:
        return "faster-whisper"
    elif WHISPER_CPP_AVAILABLE:
        return "whisper-cpp"
    else:
        return None
```

### Model Mapping

#### faster-whisper Models
- Uses model names directly: `tiny`, `base`, `small`, `medium`, `large-v3`
- Auto-downloads from HuggingFace cache

#### whisper.cpp Models
- Uses GGML format: `ggml-tiny.bin`, `ggml-base.bin`, etc.
- Manual download required or via model_manager.py

### Transcription Differences

#### faster-whisper
```python
segments, info = model.transcribe(tmp_path, beam_size=5, language="en")
text = "".join([seg.text for seg in segments]).strip()
```

#### whisper.cpp
```python
cmd = [WHISPER_BINARY, "-m", model, "-f", tmp_path, "--no-timestamps", "-l", "en", "-t", "4"]
result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
text = result.stdout.strip()
# Clean metadata lines
```

## Platform-Specific Considerations

### Desktop (Version 3.x.x)
- **Engine**: faster-whisper (recommended)
- **Performance**: 4x faster, GPU support
- **Installation**: `pip install faster-whisper`
- **Models**: Auto-download from HuggingFace

### Mobile (Version 4.0.0)
- **iOS**: CoreML integration (planned)
- **Android**: TensorFlow Lite (planned)
- **Models**: Optimized mobile models

### IoT/Embedded (Version 4.0.0)
- **Engine**: whisper.cpp (required)
- **Performance**: CPU-only, lower memory
- **Installation**: Compile whisper.cpp binary
- **Models**: GGML format, manual download

## Migration Path

### From Version 3.x.x to 4.0.0
1. Desktop users: Continue using version 3.x.x with faster-whisper
2. Mobile users: Use version 4.0.0 with native implementations
3. IoT users: Use version 4.0.0 with whisper.cpp

### Backward Compatibility
- Version 3.x.x: Desktop only, faster-whisper only
- Version 4.0.0: Multi-platform, dual engine support

## Documentation Updates Needed

1. **PLATFORM_BUILDS.md**: Already created with platform-specific instructions
2. **README.md**: Update to clarify version 3.x.x for desktop, version 4.0.0 for mobile/IoT
3. **CHANGELOG.md**: Add version 4.0.0 section when implemented
4. **ARCHITECTURE.md**: Document dual-engine architecture

## Testing Requirements

### Desktop Testing (Version 3.x.x)
- Test faster-whisper only
- Verify model downloads
- Test transcription accuracy
- Performance benchmarks

### Mobile Testing (Version 4.0.0)
- Test CoreML on iOS
- Test TensorFlow Lite on Android
- Battery usage testing
- Performance on mobile hardware

### IoT Testing (Version 4.0.0)
- Test whisper.cpp on Raspberry Pi
- Test on various ARM devices
- Memory usage testing
- CPU performance testing

## Future Enhancements

1. **Model Quantization**: Further optimize models for mobile/IoT
2. **Offline-First**: Ensure all features work offline
3. **Cross-Platform Sync**: Sync settings across devices
4. **Cloud Backup**: Optional cloud backup for settings/history

## Notes

- Version 3.x.x will remain desktop-focused with faster-whisper
- Version 4.0.0 will be mobile/IoT-focused with whisper.cpp
- Both versions can coexist in the codebase with feature flags
- Documentation should clearly separate desktop vs mobile/IoT features

---

**Status**: Plan saved - Implementation deferred to Version 4.0.0  
**Date**: 2025-01-XX  
**Version 3.x.x Focus**: Desktop environment with faster-whisper optimizations

