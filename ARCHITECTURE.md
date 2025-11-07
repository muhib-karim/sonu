# SONU Architecture Documentation

## Overview

SONU is a professional-grade offline voice typing application built with Electron and Python, leveraging the faster-whisper library for real-time speech-to-text transcription. This document provides a comprehensive overview of the application's architecture, design decisions, and technical implementation.

## Technology Stack

### Frontend
- **Electron**: Desktop application framework (Chromium + Node.js)
- **HTML/CSS/JavaScript**: Vanilla web technologies for UI
- **IPC (Inter-Process Communication)**: Secure communication between main and renderer processes

### Backend
- **Python 3.8+**: Core transcription service
- **faster-whisper**: CPU-optimized Whisper model implementation
- **PyAudio**: Audio capture and processing
- **CTranslate2**: Efficient CPU-based inference engine

### System Integration
- **robotjs**: System-wide keyboard automation
- **Node.js fs/path**: File system operations
- **Electron globalShortcut**: Global hotkey registration

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  main.js                                              │   │
│  │  - Window Management                                 │   │
│  │  - Hotkey Registration                               │   │
│  │  - IPC Handlers                                      │   │
│  │  - Model Management                                  │   │
│  │  - System Tray                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          │ IPC                                │
│                          ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  preload.js (IPC Bridge)                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          │ Secure IPC                         │
│                          ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  renderer.js (UI Logic)                               │   │
│  │  - UI State Management                                │   │
│  │  - User Interactions                                  │   │
│  │  - Theme Management                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ spawn()
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Python Whisper Service Process                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  whisper_service.py                                   │   │
│  │  - Audio Capture (PyAudio)                           │   │
│  │  - Transcription (faster-whisper)                    │   │
│  │  - Real-time Streaming                                │   │
│  │  - Model Loading                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          │ stdout/stderr                      │
│                          ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Event Communication                                  │   │
│  │  - EVENT: READY                                       │   │
│  │  - EVENT: PARTIAL                                     │   │
│  │  - EVENT: FINAL                                       │   │
│  │  - EVENT: ERROR                                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Main Process (`main.js`)

The main process is the entry point of the Electron application and handles:

- **Window Management**: Creates and manages the main application window
- **Hotkey Registration**: Registers global hotkeys for dictation modes
- **IPC Handlers**: Processes requests from the renderer process
- **Model Management**: Handles model downloads, imports, and cache management
- **System Tray**: Manages system tray icon and context menu
- **Process Management**: Spawns and manages the Python whisper service

**Key IPC Handlers:**
- `model:download` - Download Whisper models
- `model:import` - Import local model files
- `model:cancel-download` - Cancel active downloads
- `settings:get` / `settings:set` - Settings management
- `system:info` - System information retrieval
- `hotkey:register` / `hotkey:unregister` - Hotkey management

### 2. Renderer Process (`renderer.js`)

The renderer process handles all UI logic and user interactions:

- **UI State Management**: Manages application state
- **Theme Management**: Handles light/dark theme switching
- **User Interactions**: Processes button clicks, form submissions
- **IPC Communication**: Sends requests to main process
- **History Management**: Displays and manages transcription history

### 3. Preload Script (`preload.js`)

The preload script acts as a secure bridge between the renderer and main processes:

- **Context Isolation**: Exposes safe IPC methods to renderer
- **Security**: Prevents direct Node.js access from renderer
- **API Surface**: Defines the IPC API contract

### 4. Whisper Service (`whisper_service.py`)

The Python service handles all audio processing and transcription:

- **Audio Capture**: Uses PyAudio to capture microphone input
- **Model Loading**: Loads faster-whisper models on demand
- **Transcription**: Performs real-time speech-to-text conversion
- **Streaming**: Provides partial and final transcription results
- **Event Communication**: Sends events via stdout/stderr

**Event Protocol:**
```
EVENT: READY          # Model loaded and ready
EVENT: PARTIAL <text> # Partial transcription
EVENT: FINAL <text>   # Final transcription
EVENT: ERROR <msg>    # Error occurred
```

## Data Flow

### Dictation Flow

1. **User Action**: User presses hotkey (hold or toggle)
2. **Main Process**: Registers hotkey, spawns Python service if needed
3. **Python Service**: Captures audio, performs transcription
4. **Events**: Python service sends PARTIAL/FINAL events via stdout
5. **Main Process**: Receives events, forwards to renderer via IPC
6. **Renderer**: Updates UI with transcription results
7. **Output**: Main process types text at cursor location using robotjs

### Model Download Flow

1. **User Request**: User selects model and clicks "Download and Apply"
2. **Main Process**: Checks if model exists in faster-whisper cache
3. **Download**: Uses faster-whisper's built-in download mechanism
4. **Progress**: Python script reports progress via JSON stdout
5. **Completion**: Model downloaded to Hugging Face cache
6. **Activation**: Restarts whisper service with new model

## Model Management

### Faster-Whisper Integration

SONU uses **faster-whisper** (not whisper.cpp) for transcription:

- **Model Names**: Standard names (tiny, base, small, medium, large-v3)
- **Cache Location**: 
  - Windows: `%LOCALAPPDATA%\.cache\huggingface\hub\models--openai--whisper-{model}\`
  - Linux/Mac: `~/.cache/huggingface/hub/models--openai--whisper-{model}/`
- **Download Source**: Hugging Face Systran repositories
- **CPU Optimization**: Uses CTranslate2 for efficient CPU inference

### Model Selection

Models are selected based on:
- **System Resources**: RAM and CPU cores
- **User Preference**: Manual selection available
- **Use Case**: Real-time vs. accuracy trade-off

## Security Considerations

### Context Isolation

- Renderer process runs in isolated context
- No direct Node.js access from renderer
- All IPC communication via preload script

### Data Privacy

- **100% Offline**: All processing local
- **No Telemetry**: Zero tracking or analytics
- **Local Storage**: All data stored locally
- **No Cloud Sync**: No data transmission

### Process Isolation

- Python service runs as separate process
- No shared memory between processes
- Communication via stdout/stderr only

## Performance Optimizations

### Model Loading

- **Lazy Loading**: Models loaded on first use
- **Caching**: Models cached in Hugging Face cache
- **Memory Management**: Models unloaded when not in use

### Audio Processing

- **Chunked Processing**: Audio processed in chunks
- **Streaming**: Real-time partial results
- **Buffering**: Efficient audio buffer management

### UI Responsiveness

- **Async Operations**: All I/O operations async
- **IPC Batching**: Batched IPC calls where possible
- **Theme Transitions**: Optimized CSS transitions

## File Structure

```
sonu/
├── main.js              # Electron main process
├── renderer.js           # UI logic and interactions
├── preload.js            # IPC bridge
├── styles.css            # Application styles
├── index.html            # Main UI structure
├── whisper_service.py    # Python transcription service
├── system_utils.py       # System information utilities
├── model_manager.py      # Model download and management
├── package.json          # Node.js dependencies
├── config.json.example   # Example configuration
├── data/                 # User data directory
│   ├── settings.json.example
│   ├── dictionary.json.example
│   └── snippets.json
├── assets/               # Application assets
│   └── tray/            # Tray icons
├── scripts/              # Utility scripts
├── tests/                # Test suite
└── docs/                 # Documentation
```

## Development Guidelines

### Code Organization

- **Separation of Concerns**: Clear separation between main/renderer/preload
- **Modular Design**: Reusable components and utilities
- **Error Handling**: Comprehensive error handling throughout
- **Logging**: Structured logging for debugging

### Testing

- **Unit Tests**: Individual component testing
- **Integration Tests**: End-to-end workflow testing
- **E2E Tests**: Full application testing

### Documentation

- **Code Comments**: Inline documentation for complex logic
- **API Documentation**: IPC API documentation
- **Architecture Docs**: This document
- **User Documentation**: README and user guides

## Future Considerations

### Potential Improvements

- **Multi-language Support**: Support for non-English transcription
- **Custom Models**: User-provided model support
- **Plugin System**: Extensible plugin architecture
- **macOS/Linux Support**: Cross-platform compatibility
- **API Server**: REST API for third-party integrations

### Scalability

- **Process Pooling**: Multiple Python processes for parallel transcription
- **Model Caching**: Advanced model caching strategies
- **Resource Management**: Better memory and CPU management

## Acknowledgments

This architecture was designed and implemented by a solo developer with the assistance of **TraeAI**, a world-class AI-powered IDE that significantly accelerated development and improved code quality. The intelligent code completion, context-aware suggestions, and seamless AI assistance made building SONU as a solo project truly efficient and enjoyable.

This project demonstrates the power of AI-augmented development, showing how a single developer can create professional-grade applications with the right tools.

---

For more information, see:
- [README.md](README.md) - User documentation
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [SECURITY.md](SECURITY.md) - Security considerations

