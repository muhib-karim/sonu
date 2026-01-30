# SONU Platform

<p align="center">
  <img src="assets/icon.png" alt="SONU Logo" width="128" />
</p>

<h1 align="center">SONU</h1>

<p align="center">
  <strong>🎤 Professional Offline Voice Typing Platform</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Desktop-v2.0.0-6366f1?style=for-the-badge" alt="Desktop Version" />
  <img src="https://img.shields.io/badge/Mobile-v1.2.1-22c55e?style=for-the-badge" alt="Mobile Version" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License" />
</p>

<p align="center">
  A complete offline voice typing solution for desktop and mobile.<br/>
  No cloud. No subscriptions. 100% private.
</p>

---

## 📱 Applications

| App | Platform | Tech Stack | Status |
|-----|----------|------------|--------|
| **[SONU Desktop](apps/tauri)** | Windows, macOS, Linux | Tauri + Rust + whisper.cpp | ✅ v2.0.0 |
| **[Voice AI](apps/mobile)** | Android | Rust + whisper.cpp | ✅ v1.2.1 |
| **SONU Desktop (Legacy)** | Windows | Electron + Python | 🗄️ v1.0.0 |

---

## 📊 State Diagram

```mermaid
stateDiagram-v2
    [*] --> Idle: App Launched
    
    Idle --> ModelLoading: Load Model
    ModelLoading --> Ready: Model Loaded
    
    Ready --> Recording: Hotkey Pressed
    Recording --> Processing: Hotkey Released
    
    Processing --> VAD: Audio Captured
    VAD --> Transcribing: Speech Detected
    VAD --> Ready: No Speech
    
    Transcribing --> Typing: Text Ready
    Typing --> Ready: Complete
```

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🔒 **100% Offline** | All processing stays on your device |
| 🚀 **Fast** | Optimized whisper.cpp for real-time transcription |
| 🎯 **Accurate** | OpenAI Whisper models (tiny to large-v3) |
| 🔇 **Smart VAD** | Filters silence automatically |
| ⌨️ **Auto-Type** | Pastes text into any application |
| 🌍 **Multi-Platform** | Desktop + Mobile support |

---

## 🚀 Quick Start

### Desktop (Windows/macOS/Linux)

```bash
# Navigate to Tauri app
cd apps/tauri-v2

# Install dependencies
npm install

# Run in development
npm run tauri dev

# Build for production
npm run tauri build
```

### Mobile (Android)

```bash
# Navigate to mobile app
cd apps/mobile

# Build APK
./build.sh
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Alt** (hold) | Start/stop dictation (default, configurable) |
| **Ctrl+Shift+D** | Toggle Debug Mode (shows advanced options) |
| **Ctrl+/** | Show keyboard shortcuts help |
| **Escape** | Cancel current recording |

### Debug Mode

Press **Ctrl+Shift+D** to enable Debug Mode. This reveals:
- Advanced timeout options (5 seconds, 30 seconds)
- Log level controls
- System paths and diagnostics
- Additional configuration options

---

## 🏗️ Project Structure

```
SONU/
├── apps/
│   ├── tauri/          # 🖥️ Desktop app (Tauri + Rust)
│   │   ├── src/        # React frontend
│   │   ├── src-tauri/  # Rust backend
│   │   ├── VERSION     # 2.0.0
│   │   └── CHANGELOG.md
│   ├── mobile/         # 📱 Android app (Voice AI)
│   │   ├── src/        # Rust core
│   │   ├── VERSION     # 1.2.1
│   │   └── CHANGELOG.md
│   └── desktop/        # 🗄️ Legacy Electron app (v1.x)
├── assets/             # Shared assets
├── docs/               # Documentation
├── README.md           # This file
└── LICENSE
```

---

## 📊 Version History

### Desktop (Tauri)

| Version | Date | Highlights |
|---------|------|------------|
| **2.0.0** | 2026-01-11 | Complete rewrite to Tauri + Rust |

### Mobile (Voice AI)

| Version | Date | Highlights |
|---------|------|------------|
| **1.2.1** | 2025-12-XX | Latest Android release |

### Legacy Desktop (Electron)

| Version | Date | Highlights |
|---------|------|------------|
| **1.0.0** | 2025-XX-XX | Original Electron + Python |

---

## 🛠️ Development

### Prerequisites

- **Rust** 1.70+ (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- **Node.js** 18+ (for Tauri frontend)
- **Android NDK** (for mobile builds)

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0) - Breaking changes, architecture rewrites
- **MINOR** (0.X.0) - New features, backward compatible
- **PATCH** (0.0.X) - Bug fixes, performance improvements

---

## 📝 License

MIT License - See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) - Fast Whisper inference
- [Tauri](https://tauri.app) - Cross-platform desktop framework
- [Handy](https://github.com/cjpais/Handy) - Architecture inspiration
- [Wispr Flow](https://wispr.ai) - UI/UX inspiration

---

<p align="center">
  Made with ❤️ by the SONU team
</p>
