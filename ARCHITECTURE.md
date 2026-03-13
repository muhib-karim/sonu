# SONU Architecture

## Overview

SONU is an offline-first voice typing application built with **Tauri v2** — a Rust backend paired with a React/TypeScript frontend. It runs a local Whisper-based ASR model (Parakeet) for real-time speech-to-text, with optional cloud transcription providers.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Rust (Tauri v2 framework) |
| **Frontend** | React 18 + TypeScript + Vite |
| **Styling** | Tailwind CSS 4.x |
| **State** | Zustand stores |
| **ASR Engine** | Parakeet (local) · OpenAI / Groq / Custom (cloud) |
| **Audio** | CPAL (Rust) for cross-platform capture |
| **i18n** | i18next + react-i18next |
| **Build** | Bun (frontend), Cargo (backend) |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   React Frontend (Vite)                  │
│  ┌─────────────┐  ┌────────────┐  ┌─────────────────┐  │
│  │ HomeSettings │  │ Notes Tab  │  │ Cloud Settings  │  │
│  │ RecordOverlay│  │ History    │  │ Keyboard Config │  │
│  └──────┬──────┘  └─────┬──────┘  └───────┬─────────┘  │
│         │               │                  │             │
│         └───────────────┼──────────────────┘             │
│                         │  Tauri IPC (typed commands)    │
├─────────────────────────┼───────────────────────────────┤
│                   Rust Backend (Tauri)                    │
│  ┌──────────────┐  ┌───────────┐  ┌─────────────────┐  │
│  │ Audio Manager │  │ Whisper   │  │ Settings Store  │  │
│  │ (CPAL)       │  │ (Parakeet)│  │ (JSON + OS Keys)│  │
│  ├──────────────┤  ├───────────┤  ├─────────────────┤  │
│  │ Shortcut Mgr │  │ Cloud API │  │ History / Notes │  │
│  │ (Global Keys)│  │ (reqwest) │  │ (SQLite-backed) │  │
│  └──────────────┘  └───────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Key Directories

```
apps/tauri-v2/
├── src/                    # React frontend
│   ├── components/         # UI components (settings panels, overlays)
│   ├── stores/             # Zustand state management
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Shared utilities (cn, types)
│   └── bindings.ts         # Auto-generated typed Tauri commands
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs          # Tauri plugin/command registration
│   │   ├── commands/       # IPC command handlers (audio, transcription, settings)
│   │   ├── audio_toolkit/  # Audio capture, processing, Whisper integration
│   │   └── shortcut.rs     # Global hotkey management
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri app configuration (v2.2.0)
└── package.json            # Frontend dependencies (Bun)
```

## Data Flow

1. **User presses hotkey** → Rust `shortcut.rs` detects keypress
2. **Audio capture starts** → CPAL captures system microphone input
3. **Transcription** → Audio buffer sent to Parakeet model (local) or cloud API
4. **Result delivered** → Transcribed text injected via system keyboard automation
5. **History saved** → Entry stored with audio file reference, searchable in Notes tab

## Design Principles

- **Offline-first**: All core functionality works without internet
- **Type-safe IPC**: Frontend uses auto-generated bindings (`commands.*`) — never raw `invoke()`
- **Minimal dependencies**: Rust backend avoids unnecessary crates
- **Privacy**: No telemetry, no data leaves the device unless cloud transcription is explicitly enabled

