# SONU Tauri v2

A modern, high-performance offline voice typing application built with Tauri v2, Rust, and React.

## Features

- **🎤 Offline Voice Typing** - Convert speech to text using local AI models
- **⚡ Lightning Fast** - Native Rust backend for 10x better performance
- **🔒 100% Private** - All processing happens on your device
- **🌍 Multi-language** - Support for 40+ languages with auto-detection
- **⌨️ Global Shortcuts** - Type anywhere with customizable hotkeys
- **📊 Smart History** - Search and reuse past transcriptions
- **🤖 AI Post-Processing** - Optional text refinement with local LLMs
- **🎨 Beautiful UI** - Modern interface with multiple themes

## Quick Start

### Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Bun](https://bun.sh/) (package manager)
- Git

### Installation

```bash
# Clone and navigate to the project
git clone <repository-url>
cd SONU/apps/tauri-v2

# Install dependencies
bun install

# Download required models
mkdir -p src-tauri/resources/models
curl -o src-tauri/resources/models/silero_vad_v4.onnx \
  https://blob.handy.computer/silero_vad_v4.onnx

# Start development server
bun run tauri dev
```

### Building

```bash
# Build for production
bun run tauri build

# Build with debug symbols
bun run tauri build --debug
```

## Development

### Project Structure

```
src/                      # Frontend (React + TypeScript)
├── components/          # React components
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and types
├── overlay/             # Recording overlay window
└── store/               # Zustand state stores

src-tauri/               # Backend (Rust)
└── src/
    ├── commands/        # Tauri command handlers
    ├── managers/        # Core business logic
    ├── audio_toolkit/   # Audio processing
    └── tests/           # Unit tests
```

### Available Scripts

```bash
# Development
bun run dev              # Start Vite dev server only
bun run tauri dev        # Start full Tauri app with hot reload

# Building
bun run build            # Build frontend for production
bun run tauri build      # Build complete Tauri app

# Code Quality
bun run lint             # Run ESLint
bun run lint:fix         # Fix ESLint issues
bun run format           # Format code with Prettier
bun run format:check     # Check code formatting

# Testing
cd src-tauri && cargo test    # Run Rust unit tests
bun test                      # Run frontend tests (when implemented)
```

### Troubleshooting

**macOS CMake Error:**

```bash
CMAKE_POLICY_VERSION_MINIMUM=3.5 bun run tauri dev
```

**Linux Dependencies:**

```bash
sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.1-dev \
  libayatana-appindicator3-dev librsvg2-dev libasound2-dev
```

## Architecture

### Technology Stack

| Layer    | Technology                               |
| -------- | ---------------------------------------- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend  | Rust, Tauri v2                           |
| Audio    | CPAL, Whisper-rs, Silero VAD             |
| State    | Zustand                                  |
| I18n     | i18next                                  |

### Key Improvements

- **Performance**: 10x faster than legacy Python backend
- **Size**: ~5MB bundle vs ~200MB Electron app
- **Memory**: Efficient Rust memory management
- **Type Safety**: Full TypeScript coverage with automatic bindings
- **Error Handling**: Comprehensive error boundaries and logging

## Configuration

### Settings File

Settings are stored in the OS-specific app data directory:

- **Windows**: `%APPDATA%/SONU/settings_store.json`
- **macOS**: `~/Library/Application Support/SONU/settings_store.json`
- **Linux**: `~/.config/SONU/settings_store.json`

### Environment Variables

- `RUST_LOG` - Control Rust logging level (e.g., `RUST_LOG=debug`)
- `TAURI_DEV_HOST` - Development server host (for mobile debugging)

## Contributing

Please read our [Contributing Guide](../../docs/CONTRIBUTING.md) for details on:

- Code style and conventions
- Development workflow
- Testing requirements
- Pull request process

## Documentation

- [Migration Guide](../../docs/TAURI_V2_MIGRATION_GUIDE.md) - Complete migration guide
- [Contributing Guide](../../docs/CONTRIBUTING.md) - How to contribute
- [API Documentation](../../docs/API.md) - Backend API reference

## License

MIT License - see LICENSE file for details

## Support

- **Issues**: [GitHub Issues](https://github.com/your-username/SONU/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/SONU/discussions)
- **Email**: support@sonu.app (if applicable)

---

Built with ❤️ using [Tauri](https://tauri.app/), [Rust](https://www.rust-lang.org/), and [React](https://react.dev/)
