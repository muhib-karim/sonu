# Changelog

All notable changes to SONU will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [3.5.4] - 2025-01-XX

### 🧹 Project Cleanup & Comprehensive Testing