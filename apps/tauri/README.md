# SONU Desktop (Tauri)

<p align="center">
  <img src="../../assets/icon.png" alt="SONU Logo" width="128" />
</p>

<h1 align="center">SONU Desktop</h1>

<p align="center">
  <strong>🎤 Fast Offline Voice Typing</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-2.0.0-6366f1?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-22c55e?style=for-the-badge" alt="Platform" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License" />
</p>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔒 **100% Offline** | All processing stays on your device |
| ⚡ **Lightning Fast** | Tauri + Rust for native performance |
| 🎯 **Accurate** | Powered by OpenAI Whisper |
| 🔇 **Smart VAD** | Automatically filters silence |
| ⌨️ **Auto-Paste** | Transcription typed into active app |
| 🎨 **Modern UI** | Dark theme inspired by Wispr Flow |

---

## 🚀 Quick Start

### Prerequisites

- Windows 10/11, macOS 12+, or Linux (glibc 2.31+)
- Whisper model file (see below)

### Installation

1. Download the latest release from [Releases](../../releases)
2. Install the application
3. Download a Whisper model:

```bash
# Create models directory
mkdir -p ~/.sonu/models

# Download base model (recommended for most users)
curl -L -o ~/.sonu/models/ggml-base.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
```

### Usage

1. Launch SONU
2. Select a model from the UI
3. Hold the record button or use `Ctrl+Shift+Space`
4. Speak - your words will be typed automatically!

---

## 📊 Model Comparison

| Model | Size | Speed | Accuracy | RAM |
|-------|------|-------|----------|-----|
| `tiny` | 75 MB | ⚡⚡⚡⚡⚡ | ⭐⭐ | 1 GB |
| `base` | 145 MB | ⚡⚡⚡⚡ | ⭐⭐⭐ | 1.5 GB |
| `small` | 488 MB | ⚡⚡⚡ | ⭐⭐⭐⭐ | 2.5 GB |
| `medium` | 1.5 GB | ⚡⚡ | ⭐⭐⭐⭐⭐ | 5 GB |
| `large-v3` | 3 GB | ⚡ | ⭐⭐⭐⭐⭐ | 10 GB |

**Recommendation:** Start with `base` for a good balance of speed and accuracy.

---

## ⚙️ Configuration

### Recording Modes

- **Hold to Record** - Press and hold hotkey, release to transcribe
- **Toggle Record** - Press to start, press again to stop

### Voice Activity Detection

- **Enabled** - Filters silence before transcription (faster)
- **Sensitivity** - Adjust threshold for speech detection

---

## 🏗️ Architecture

Built with enterprise-grade technologies:

```
┌─────────────────────────────────────────────────┐
│                    Tauri 2.0                     │
│  ┌─────────────┐    ┌─────────────────────────┐ │
│  │   React UI   │◄──►│      Rust Backend       │ │
│  │   TypeScript │    │  ┌───────────────────┐ │ │
│  │   Tailwind   │    │  │     whisper-rs    │ │ │
│  └─────────────┘    │  │   (whisper.cpp)   │ │ │
│                      │  └───────────────────┘ │ │
│                      │  ┌───────────────────┐ │ │
│                      │  │       cpal        │ │ │
│                      │  │   (Audio I/O)     │ │ │
│                      │  └───────────────────┘ │ │
│                      │  ┌───────────────────┐ │ │
│                      │  │       enigo       │ │ │
│                      │  │   (Keyboard)      │ │ │
│                      │  └───────────────────┘ │ │
│                      └─────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## 🛠️ Development

### Build from Source

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

### Project Structure

```
apps/tauri/
├── src/                    # React frontend
│   ├── App.tsx            # Main UI component
│   ├── App.css            # Styles
│   └── main.tsx           # Entry point
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs         # Tauri commands
│   │   ├── audio.rs       # Audio capture
│   │   ├── transcribe.rs  # Whisper integration
│   │   ├── vad.rs         # Voice Activity Detection
│   │   └── keyboard.rs    # Keyboard simulation
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
└── package.json           # Node.js dependencies
```

---

## 📝 License

MIT License - See [LICENSE](../../LICENSE) for details.

---

## 🙏 Acknowledgments

- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) - Fast Whisper inference
- [Tauri](https://tauri.app) - Desktop app framework
- [Handy](https://github.com/cjpais/Handy) - Architecture inspiration
- [Wispr Flow](https://wispr.ai) - UI inspiration

---

<p align="center">
  Made with ❤️ for the voice typing community
</p>
