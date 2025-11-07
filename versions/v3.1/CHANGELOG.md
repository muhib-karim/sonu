# Changelog

All notable changes to SONU will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [Unreleased]

### Planned for Version 3.0

- Multi-language support
- Custom model selection
- Advanced audio processing
- Cloud sync (optional)
- Enhanced analytics
- Plugin system

---

## Version History Summary

- **v2.0.0**: Professional UI redesign, theme system, enhanced UX
- **v1.0.0**: Initial release with core functionality

---

## Migration Notes

### Upgrading from v1.0 to v2.0

1. **Configuration**: Existing `config.json` files are compatible
2. **History**: `history.json` format remains unchanged
3. **Settings**: New settings structure, but old preferences are preserved
4. **Hotkeys**: Existing hotkey configurations are maintained

### Breaking Changes

- None - v2.0 is backward compatible with v1.0 data files

---

## Contributors

- Development Team
- Community Testers
- Beta Users

---

For detailed technical changes, see the git commit history.

