# Changelog

All notable changes to SONU will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.5.1] - 2025-01-XX

### 🔧 Test Environment Improvements & Feature Verification

This version focuses on comprehensive test environment fixes and feature verification to ensure all app functionality works correctly.

#### Added

- **Test Scripts**: Added `test` and `test:e2e` scripts to main package.json
- **Comprehensive E2E Tests**: Added tests for all main tabs and settings sub-tabs
- **Modal Handling**: Added `closeModals()` helper for reliable test execution
- **Navigation Tests**: Comprehensive navigation tests for all tabs (home, dictionary, snippets, style, notes, settings)
- **Settings Tab Tests**: Tests for all settings sub-tabs (general, system, model, themes, vibe, experimental)
- **Test Documentation**: Created test report and autonomy log files

#### Fixed

- **Test Environment Mocks**: Fixed Tray mock missing `setToolTip` method
- **BrowserWindow Mock**: Added all missing methods (`setIgnoreMouseEvents`, `setMovable`, `getBounds`, etc.)
- **Fetch Mock**: Added global fetch mock for i18n module in test environment
- **AudioContext Mock**: Added mock for audio visualization features
- **IPC Handler Tests**: Made IPC handler tests more robust for test environment
- **E2E Test Timeouts**: Increased timeouts from 30s to 60s and improved readiness detection
- **App Readiness Detection**: Enhanced with multiple methods (data-app-ready attribute, navigation helpers)
- **Modal Interference**: Fixed modals blocking clicks in tests
- **Navigation Reliability**: Improved navigation with helper functions and fallback methods

#### Improved

- **Test Environment**: Enhanced test setup with comprehensive mocks
- **E2E Tests**: Improved timeout handling and readiness detection
- **Feature Testing**: Created comprehensive feature testing script
- **Documentation**: Updated test report with detailed progress
- **Showcase Generation**: Regenerated showcase screenshots and video
- **Test Coverage**: Added tests for all major UI components and features

#### Technical

- **Test Mocks**: Complete Electron API mocks for unit tests
- **Readiness Detection**: Multiple methods for detecting app initialization
- **Feature Coverage**: All major UI tabs and settings verified
- **Timeout Management**: Increased timeouts for slow operations (system info, model loading)
- **Wait Conditions**: Improved wait conditions with proper selectors and timeouts

---

## [3.5.0] - 2025-01-XX

### 🎉 Major Release - Faster-Whisper Architecture Alignment

This version represents a significant architectural improvement, properly aligning the codebase with the faster-whisper library that powers the application.

#### Added

- **Architecture Documentation**: Comprehensive documentation clarifying faster-whisper vs whisper.cpp
- **Model Name Standardization**: Updated all model definitions to use faster-whisper model names
- **Cache Location Detection**: Proper detection of faster-whisper cache locations across platforms
- **Example Configuration Files**: Added `.example` files for settings, dictionary, and config

#### Fixed

- **Model Definitions**: Fixed model definitions to use faster-whisper model names (tiny, base, small, medium, large-v3) instead of filenames
- **Download Logic**: Removed outdated whisper.cpp repository references
- **Model Existence Check**: Fixed to check faster-whisper cache locations correctly
- **Documentation**: Clarified that the app uses faster-whisper, not whisper.cpp

#### Changed

- **MODEL_DEFINITIONS**: Updated to use model names instead of filenames
- **Download System**: Removed unused whisper.cpp download URLs
- **Comments**: Updated all comments to reflect faster-whisper architecture
- **Version**: Bumped to 3.5.0 to reflect architectural improvements

#### Technical

- **faster-whisper Integration**: Properly documented faster-whisper usage throughout codebase
- **Cache Detection**: Windows: `%LOCALAPPDATA%\.cache\huggingface\hub\models--openai--whisper-{model}\`
- **Cache Detection**: Linux/Mac: `~/.cache/huggingface/hub/models--openai--whisper-{model}/`
- **Model Names**: Uses faster-whisper standard names (tiny, base, small, medium, large-v3)

---

## [3.1.2] - 2025-11-07

### 🔧 Bug Fixes and Improvements

This version focuses on fixing critical issues with model downloads and system-wide typing functionality.

#### Added

- **Python-based Model Downloader**: `offline_model_downloader.py` with resumable downloads and mirror fallback
- **Automated Testing**: Comprehensive test suite for model download and typing functionality
- **Better Error Handling**: Improved error messages and fallback mechanisms

#### Fixed

- **Model Download Failures**: Fixed 404 errors and download interruptions with robust Python downloader
- **System-wide Typing**: Improved focus handling and typing reliability
- **Download Resumption**: Added support for resuming interrupted downloads
- **Mirror Fallback**: Multiple mirror support for reliable downloads

#### Changed

- **Download System**: Primary downloader now uses Python with Node.js fallback
- **Typing Function**: Enhanced with better focus handling and error recovery
- **Test Infrastructure**: Added automated tests for critical functionality

#### Technical

- **Python Downloader**: Uses `requests` library for HTTP downloads with range support
- **Error Handling**: Better exception handling and user-facing error messages
- **Testing**: Jest-based test suite with mocks for HTTP and robotjs

---

## [3.1.0] - 2025-11-07

### 🔧 Bug Fixes and Improvements

This version focuses on fixing critical issues with model downloads and system-wide typing functionality.

#### Added

- **Python-based Model Downloader**: `offline_model_downloader.py` with resumable downloads and mirror fallback
- **Automated Testing**: Comprehensive test suite for model download and typing functionality
- **Better Error Handling**: Improved error messages and fallback mechanisms

#### Fixed

- **Model Download Failures**: Fixed 404 errors and download interruptions with robust Python downloader
- **System-wide Typing**: Improved focus handling and typing reliability
- **Download Resumption**: Added support for resuming interrupted downloads
- **Mirror Fallback**: Multiple mirror support for reliable downloads

#### Changed

- **Download System**: Primary downloader now uses Python with Node.js fallback
- **Typing Function**: Enhanced with better focus handling and error recovery
- **Test Infrastructure**: Added automated tests for critical functionality

#### Technical

- **Python Downloader**: Uses `requests` library for HTTP downloads with range support
- **Error Handling**: Better exception handling and user-facing error messages
- **Testing**: Jest-based test suite with mocks for HTTP and robotjs

---

## [3.0.0-dev] - 2025-01-XX

### 🚧 Development Version - Settings Interface Overhaul

This version introduces a comprehensive Settings interface with full functionality for system information, model selection, themes, and all configuration options.

### Added

#### Settings Interface
- **System Tab**: Complete system information display with hardware details (Device, OS, CPU, Cores, Threads, RAM, GPU, Architecture, App Version)
- **Model Selector Tab**: Whisper model selection with auto-pick based on system RAM, download progress indicator
- **Themes Tab**: Five theme options (Light, Dark, Midnight Purple, Solarized, Soft Gray) with instant preview
- **General Tab Enhancements**: Launch on startup, default language, sound feedback toggles
- **Vibe Coding Tab**: Coding editor dictation settings with hotkey configuration
- **Experimental Tab**: Continuous dictation, low-latency audio, neural noise reduction options
- **Account Tab**: User information display and account management
- **Team Tab**: Placeholder for team collaboration features
- **Plans & Billing Tab**: Offline operation information
- **Data & Privacy Tab**: Local-only transcriptions, auto-delete cache, clear cache functionality

#### Features
- **Sound Feedback**: Audio beeps on dictation start/stop (configurable toggle)
- **Keyboard Shortcuts Display**: Shows current hotkey configuration in General settings
- **Microphone Detection**: Lists actual hardware microphone devices (not just "Auto-detect")
- **System Info Refresh**: Button to reload system information
- **Settings Persistence**: All settings saved to `data/settings.json`
- **Theme Persistence**: Selected theme persists across app restarts

#### Backend
- **system_utils.py**: Python utility for system information collection and microphone listing
- **Node.js Fallback**: System info falls back to Node.js `os` module if Python unavailable
- **IPC Handlers**: Complete IPC communication for all settings functionality

### Fixed

#### Critical Fixes
- **System Info Loading**: Fixed "No handler registered" error - system info now loads on first run and refresh
- **Sound Feedback**: Implemented audio beep functionality for dictation start/stop events
- **Keyboard Shortcuts Display**: Now shows current hotkey configuration instead of placeholder text
- **Microphone Detection**: Lists actual microphone hardware devices instead of just "Auto-detect"
- **Settings Persistence**: All settings properly saved and loaded from persistent storage

#### UI/UX Improvements
- **System Info Display**: Proper error handling with Node.js fallback for system information
- **Microphone Selection**: Dropdown populated with actual microphone devices
- **Keyboard Shortcuts**: Dynamic display updates when hotkeys are changed
- **Sound Feedback**: Respects toggle setting and only plays when enabled

### Changed

#### Settings Structure
- **Settings Navigation**: Reorganized with System, Model Selector, and Themes as separate tabs
- **General Tab**: Enhanced with additional toggles and configuration options
- **Settings Storage**: Moved from localStorage to `data/settings.json` for better persistence

#### Technical
- **IPC Communication**: Enhanced IPC handlers for system info, model management, and settings
- **Error Handling**: Improved error handling with fallbacks for system information collection
- **Audio Context**: Web Audio API implementation for sound feedback

---

## [2.0.0] - 2025-01-XX

### 🎉 Major Release - Professional UI Redesign

This release represents a complete overhaul of the user interface, introducing a modern, professional design inspired by leading productivity applications.

### Added

#### User Interface
- **Complete UI Redesign**: Modern glassmorphic design with Apple-inspired aesthetics
- **Theme System**: Beautiful light and dim dark themes with smooth transitions
- **Sidebar Navigation**: Intuitive navigation with Home, Dictionary, Snippets, Style, Notes, and Settings
- **Settings Page**: Comprehensive settings interface with sub-navigation
- **Live Statistics**: Real-time tracking of transcriptions, words, and characters
- **History Management**: Enhanced history section with inline editing capabilities
- **Dictation Box**: Prominent call-to-action box with dynamic hotkey display
- **Live Preview**: Real-time transcription preview during dictation

#### Features
- **Theme Toggle**: Neumorphic toggle switch for light/dark mode switching
- **Dynamic Hotkey Display**: Dictation box shows current key binding
- **Edit Button**: Direct navigation to settings from dictation box
- **Logo Icon**: Branded logo icon with theme-aware visibility
- **Window Controls**: Standard minimize, maximize, and close buttons
- **Reload Shortcut**: Ctrl+R (Cmd+R) for quick UI refresh during development

#### Technical
- **Version Management**: Built-in versioning system (v1.0, v2.0)
- **CSS Custom Properties**: Theme-aware color system using CSS variables
- **View Transitions API**: Smooth theme switching using browser-native transitions
- **GPU Acceleration**: Optimized rendering with hardware acceleration
- **Performance Optimizations**: Reduced transition lag and improved responsiveness

### Changed

#### User Experience
- **Theme Transitions**: Reduced from 0.4s to 0.15s for more responsive feel
- **Dictation Box**: Now theme-aware, adapting colors to current theme
- **Navigation**: Improved navigation flow and page transitions
- **Settings Organization**: Better structured settings with grouped options

#### Technical
- **Branding**: Changed from "Flow" to "SONU" throughout the application
- **Theme Colors**: Updated dark theme to dim, warmer colors for better eye comfort
- **Transition Timing**: Optimized easing curves for smoother animations
- **Code Organization**: Improved code structure and maintainability

### Fixed

- **Logo Visibility**: Fixed logo icon visibility in dark mode
- **Button Interactions**: Resolved CSS containment issues affecting button clicks
- **Theme Switching**: Fixed lag and stuttering during theme transitions
- **Hotkey Capture**: Prevented dictation mode from triggering during hotkey configuration
- **Window Dragging**: Fixed window dragging functionality
- **System-wide Output**: Ensured text output works across all applications

### Performance

- **Transition Smoothness**: 10x improvement in theme transition smoothness
- **Rendering**: Optimized CSS for better GPU utilization
- **Memory**: Improved memory management for long-running sessions

---

## [1.0.0] - 2024-XX-XX

### Initial Release

#### Added

- **Core Functionality**:
  - Press-and-hold hotkey for momentary dictation
  - Toggle hotkey for continuous dictation
  - Live partial transcription during hold mode
  - Final transcription output to clipboard
  - System-wide auto-typing via robotjs

- **User Interface**:
  - Basic Electron window
  - History display
  - Hotkey configuration
  - Settings panel

- **Features**:
  - Audio cues for dictation start/stop
  - Floating indicator widget
  - Tray icon with context menu
  - History management (last 100 items)

#### Technical

- Electron-based desktop application
- Python backend for audio capture and transcription
- Faster-Whisper integration
- System-wide hotkey registration
- IPC communication between processes

---

## Version History Summary

- **v3.5.0**: Faster-whisper architecture alignment, model name standardization
- **v3.1.2**: Bug fixes, improved download system, testing infrastructure
- **v3.1.0**: Bug fixes, improved download system, testing infrastructure
- **v3.0.0**: Settings interface overhaul, comprehensive configuration
- **v2.0.0**: Professional UI redesign, theme system, enhanced UX
- **v1.0.0**: Initial release with core functionality

---

## Migration Notes

### Upgrading to v3.5.0

1. **Model Definitions**: Model names now use faster-whisper standard names
2. **Cache Location**: Models are now detected in faster-whisper cache locations
3. **Configuration**: Existing settings are compatible, no migration needed

### Upgrading from v1.0 to v2.0

1. **Configuration**: Existing `config.json` files are compatible
2. **History**: `history.json` format remains unchanged
3. **Settings**: New settings structure, but old preferences are preserved
4. **Hotkeys**: Existing hotkey configurations are maintained

### Breaking Changes

- None - v3.5.0 is backward compatible with previous versions

---

## Contributors

- Development Team
- Community Testers
- Beta Users

---

For detailed technical changes, see the git commit history.
