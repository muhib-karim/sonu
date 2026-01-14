# SONU - Offline Voice Typing

**Built on [Handy](https://github.com/cjpais/Handy) by cjpais**

[![GitHub](https://img.shields.io/badge/GitHub-ai--dev--2024%2FSONU-blue?style=for-the-badge&logo=github)](https://github.com/muhib-karim/SONU)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support-ff5f5f?style=for-the-badge&logo=ko-fi)](https://ko-fi.com/ai_dev_2024)

**A free, open source, and extensible speech-to-text application that works completely offline.**

SONU is a cross-platform desktop application built with Tauri v2 (Rust + React/TypeScript) that provides simple, privacy-focused speech transcription. Press a shortcut, speak, and have your words appear in any text field—all without sending your voice to the cloud.

## Features

- **100% Offline**: Your voice never leaves your computer
- **CPU-Optimized**: Parakeet V3 model works great on any modern CPU
- **Cross-Platform**: Windows, macOS, and Linux support
- **Floating Overlay**: Beautiful glassmorphism recording indicator
- **Wispr Flow-Inspired UI**: Clean, dark graphite theme
- **Customizable Shortcuts**: Configure your preferred key combinations
- **Multiple Models**: Choose between Whisper or Parakeet models

## Why SONU?

SONU was forked from Handy to create a customized, CPU-optimized voice typing experience:

- **Free**: Accessibility tooling belongs in everyone's hands, not behind a paywall
- **Open Source**: Built on solid foundations, extend it for yourself
- **Private**: Your voice stays on your computer. No cloud required
- **Parakeet-First**: Optimized for CPU-based transcription using Parakeet V3 models
- **Beautiful UI**: Wispr Flow-inspired dark theme with glassmorphism effects

## How It Works

1. **Press** a configurable keyboard shortcut to start/stop recording (default: `Ctrl+Space`)
2. **Speak** your words while the overlay shows you're recording
3. **Release** and SONU processes your speech locally
4. **Get** your transcribed text pasted directly into whatever app you're using

The process is entirely local:

- Silence is filtered using VAD (Voice Activity Detection) with Silero
- Transcription uses your choice of models:
  - **Parakeet V3** - CPU-optimized model with excellent performance (~5x real-time)
  - **Whisper models** (Small/Medium/Turbo/Large) with GPU acceleration when available
- Works on Windows, macOS, and Linux

## Quick Start

### Installation

1. Download the latest release from the [releases page](https://github.com/muhib-karim/SONU/releases)
2. Install the application following platform-specific instructions
3. Launch SONU and grant necessary system permissions (microphone, accessibility)
4. Select and download a model (Parakeet V3 recommended)
5. Configure your preferred keyboard shortcuts in Settings
6. Start transcribing!

### Development Setup

**Prerequisites:** [Rust](https://rustup.rs/) (latest stable), [Node.js](https://nodejs.org/) or [Bun](https://bun.sh/)

```bash
# Clone the repository
git clone https://github.com/muhib-karim/SONU.git
cd SONU/apps/tauri-v2

# Install dependencies
npm install
# or: bun install

# Download required VAD model
mkdir -p src-tauri/resources/models
curl -o src-tauri/resources/models/silero_vad_v4.onnx https://blob.handy.computer/silero_vad_v4.onnx

# Run in development mode
npm run tauri dev
# or: bun run tauri dev

# Build for production
npm run tauri build
```

For detailed build instructions including platform-specific requirements, see [BUILD.md](BUILD.md).

## Architecture

SONU is built as a Tauri v2 application combining:

- **Frontend**: React + TypeScript with Tailwind CSS
- **Backend**: Rust for system integration, audio processing, and ML inference
- **UI**: Wispr Flow-inspired dark theme with glassmorphism effects
- **Core Libraries**:
  - `whisper-rs`: Local speech recognition with Whisper models
  - `transcription-rs`: CPU-optimized speech recognition with Parakeet models
  - `cpal`: Cross-platform audio I/O
  - `vad-rs`: Voice Activity Detection
  - `rdev`: Global keyboard shortcuts and system events

### Debug Mode

SONU includes an advanced debug mode for development and troubleshooting. Access it by pressing:

- **macOS**: `Cmd+Shift+D`
- **Windows/Linux**: `Ctrl+Shift+D`

## Platform Support

- **macOS** (Intel and Apple Silicon)
- **Windows** (x64)
- **Linux** (x64) - See [Linux Notes](#linux-notes)

### System Requirements

**For Parakeet V3 Model (Recommended):**

- **CPU-only operation** - runs on a wide variety of hardware
- **Minimum**: Intel Skylake (6th gen) or equivalent AMD processors
- **Performance**: ~5x real-time speed on mid-range hardware

**For Whisper Models:**

- **macOS**: Metal acceleration on M-series and Intel Macs
- **Windows/Linux**: Intel, AMD, or NVIDIA GPU recommended

### Linux Notes

**Text Input Tools:**

For reliable text input on Linux, install the appropriate tool for your display server:

| Display Server | Recommended Tool | Install Command            |
| -------------- | ---------------- | -------------------------- |
| X11            | `xdotool`        | `sudo apt install xdotool` |
| Wayland        | `wtype`          | `sudo apt install wtype`   |

**Other Notes:**

- The recording overlay is disabled by default on Linux due to compositor compatibility issues
- You can control SONU via signals: `pkill -USR2 -n sonu-desktop` toggles recording

## Troubleshooting

### Manual Model Installation

If you're behind a proxy or in a restricted network environment, you can manually download and install models:

1. Find your app data directory in Settings → About
2. Create a `models` folder inside it
3. Download models from:
   - **Parakeet V3** (478 MB): `https://blob.handy.computer/parakeet-v3-int8.tar.gz`
   - **Whisper Small** (487 MB): `https://blob.handy.computer/ggml-small.bin`
4. Place downloaded files in the `models` directory
5. Restart SONU

## Contributing

1. **Check existing issues** at [github.com/muhib-karim/SONU/issues](https://github.com/muhib-karim/SONU/issues)
2. **Fork the repository** and create a feature branch
3. **Test thoroughly** on your target platform
4. **Submit a pull request** with clear description of changes

## Credits

SONU is built on top of the excellent [Handy](https://github.com/cjpais/Handy) project by cjpais.

**Support the projects:**
- **SONU**: [Ko-fi](https://ko-fi.com/ai_dev_2024) | [GitHub](https://github.com/muhib-karim/SONU)
- **Handy**: [handy.computer/donate](https://handy.computer/donate) | [GitHub](https://github.com/cjpais/Handy)

## Acknowledgments

- **[Handy](https://github.com/cjpais/Handy)** by cjpais - The foundation for SONU
- **Whisper** by OpenAI for the speech recognition model
- **whisper.cpp and ggml** for cross-platform whisper inference
- **Silero** for lightweight VAD
- **Tauri** team for the excellent Rust-based app framework
- **Wispr Flow** for UI/UX inspiration

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

_"Your search for the right speech-to-text tool can end here—not because SONU is perfect, but because you can make it perfect for you."_
