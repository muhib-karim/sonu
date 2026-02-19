# SONU - Professional Offline Voice Typing

<p align="center">
  <img src="assets/icon.png" alt="SONU Logo" width="128" />
</p>

<h1 align="center">SONU</h1>

<p align="center">
  <strong>🎤 Professional Offline Voice Typing Platform</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Desktop-v3.6.1-blue?style=for-the-badge" alt="Desktop Version" />
  <img src="https://img.shields.io/badge/Tauri-v2.1.0-6366f1?style=for-the-badge" alt="Tauri Version" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

<p align="center">
  A complete offline voice typing solution for desktop.<br/>
  No cloud. No subscriptions. 100% private.
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-development">Development</a> •
  <a href="#-security">Security</a>
</p>

---

## 📱 Applications

| App | Platform | Tech Stack | Status | Location |
|-----|----------|------------|--------|----------|
| **SONU Desktop** | Windows | Electron + Python | ✅ Active | `apps/desktop/` |
| **SONU Desktop v2** | Windows, macOS, Linux | Tauri + Rust | ✅ Active | `apps/tauri-v2/` |

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🔒 **100% Offline** | All processing stays on your device |
| 🚀 **Fast** | Optimized whisper.cpp for real-time transcription |
| 🎯 **Accurate** | OpenAI Whisper models (tiny to large-v3) |
| 🤖 **AI Enhancement** | Optional LLM post-processing for better text |
| 🔇 **Smart VAD** | Filters silence automatically |
| ⌨️ **Auto-Type** | Pastes text into any application |
| 🌍 **Multi-Language** | 50+ languages supported |
| 📚 **Dictionary** | Custom word corrections |
| 📝 **Snippets** | Text expansion shortcuts |

---

## 🚀 Quick Start

### Desktop (Windows)

```bash
# Navigate to desktop app
cd apps/desktop

# Install dependencies
npm install

# Run in development
npm start

# Build for production
npm run build
```

### Desktop v2 (Tauri - All Platforms)

```bash
# Navigate to Tauri app
cd apps/tauri-v2

# Install dependencies
bun install

# Run in development
bun run tauri dev

# Build for production
bun run tauri build
```

---

## 🏗️ Architecture

### Project Structure

```
SONU/
├── apps/
│   ├── desktop/           # 🖥️ Electron desktop app (v3.6.1)
│   │   ├── src/
│   │   │   ├── config/   # Configuration management
│   │   │   ├── core/     # Core services (IPC, models, Python)
│   │   │   ├── services/ # Business logic services
│   │   │   └── utils/    # Utilities (logger, secureStorage, validation)
│   │   └── tests/        # Test suites
│   │
│   └── tauri-v2/         # 🦀 Tauri desktop app (v2.1.0)
│       ├── src/          # React frontend
│       │   ├── components/
│       │   ├── hooks/
│       │   └── lib/
│       ├── src-tauri/    # Rust backend
│       │   ├── src/
│       │   │   ├── commands/    # Tauri commands
│       │   │   ├── managers/    # Business logic managers
│       │   │   └── audio_toolkit/
│       │   └── resources/
│       └── e2e/          # Playwright tests
│
├── docs/                 # 📚 Documentation
│   ├── reports/          # Audit reports, completions
│   └── guides/           # Development guides
│
└── AGENTS.md            # 🤖 Guidelines for AI coding assistants
```

### Desktop App Architecture

The desktop app follows a modular architecture:

- **Main Process**: Entry point, window management, system integration
- **Renderer Process**: UI components, user interactions
- **Preload Script**: Secure bridge between main and renderer
- **Python Services**: Whisper transcription, LLM processing
- **Services Layer**: Business logic (window, recording, typing)
- **Utils Layer**: Shared utilities (logging, validation, secure storage)

### Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                          │
├─────────────────────────────────────────────────────────────┤
│  1. Input Validation    →  Sanitize all user inputs         │
│  2. IPC Validation      →  Validate IPC parameters          │
│  3. Path Sanitization   →  Prevent path traversal           │
│  4. Secure Storage      →  OS keychain for API keys         │
│  5. Context Isolation   →  Isolate renderer from main       │
│  6. CSP Headers         →  Content Security Policy          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Security

### Implemented Security Measures

- ✅ **Input Validation**: All IPC parameters validated against schemas
- ✅ **Path Sanitization**: Prevents path traversal attacks
- ✅ **Secure Storage**: API keys stored in OS keychain (keytar)
- ✅ **Context Isolation**: Renderer isolated from Node.js APIs
- ✅ **CSP Protection**: Content Security Policy in Tauri app
- ✅ **No eval()**: ESLint rules prevent dangerous functions
- ✅ **Model Whitelist**: Only approved model IDs accepted

### Security Modules

- `src/utils/validation.js` - Input validation and sanitization
- `src/utils/errorHandler.js` - Secure error handling
- `src/utils/secureStorage.js` - Credential storage
- `src/services/windowState.js` - State persistence

---

## 🧪 Testing

### Test Structure

```bash
# Desktop app tests
cd apps/desktop/tests

# Run all tests
npm run test:all

# Run specific test suites
npm run test:unit              # Unit tests
npm run test:integration       # Integration tests
npm run test:e2e              # E2E tests
npm run test:python           # Python service tests

# Tauri app tests
cd apps/tauri-v2

bun run test                   # Frontend unit tests
bun run test:rust             # Rust unit tests
bun run test:e2e              # E2E tests
```

### Single Test Commands

```bash
# Desktop - One test file
npm run test:unit -- tests/unit/logger.test.js

# Desktop - One test by name
npx jest tests/unit/logger.test.js -t "initializes logger"

# Tauri - One test file
bun run test -- src/components/ui/__tests__/Button.test.tsx

# Tauri - One Rust test
cd src-tauri && cargo test test_name
```

---

## 📋 Development

### Prerequisites

**Desktop (Electron)**:
- Node.js 18+
- Python 3.8+
- Windows (for full feature support)

**Desktop v2 (Tauri)**:
- Node.js 18+
- Rust 1.70+
- Bun package manager

### Code Style

We use ESLint and Prettier for code quality:

```bash
# Desktop app
cd apps/desktop
npm run lint        # Check for issues
npm run lint:fix    # Fix auto-fixable issues

# Tauri app
cd apps/tauri-v2
bun run lint        # ESLint check
bun run format      # Format code
bun run typecheck   # TypeScript check
```

### Pre-commit Hooks

Pre-commit hooks run automatically on commit:
- ESLint checks (Tauri app)
- Unit tests (desktop app)
- Rust formatting and clippy (Tauri backend)

---

## 📚 Documentation

### Project Documentation

- **[AGENTS.md](AGENTS.md)** - Guidelines for AI coding assistants
- **[docs/guides/DEVELOPMENT_GUIDE.md](docs/guides/DEVELOPMENT_GUIDE.md)** - Development setup
- **[docs/guides/INSTALL.md](docs/guides/INSTALL.md)** - Installation instructions
- **[docs/guides/CONTRIBUTING.md](docs/guides/CONTRIBUTING.md)** - Contribution guidelines

### Reports

- **[docs/reports/COMPREHENSIVE_AUDIT_REPORT.md](docs/reports/COMPREHENSIVE_AUDIT_REPORT.md)** - Security audit
- **[docs/reports/IMPLEMENTATION_STATUS.md](docs/reports/IMPLEMENTATION_STATUS.md)** - Project status

---

## 🔄 Version History

### Desktop (Electron)

| Version | Date | Highlights |
|---------|------|------------|
| **3.6.1** | 2026-02-19 | Security improvements, error handling, code cleanup |
| **3.6.0** | 2026-01-XX | LLM integration, context awareness |
| **3.5.0** | 2025-12-XX | Multi-language support, snippets |

### Desktop v2 (Tauri)

| Version | Date | Highlights |
|---------|------|------------|
| **2.1.0** | 2026-02-XX | Parakeet engine, offline LLM |
| **2.0.0** | 2026-01-XX | Complete rewrite to Tauri + Rust |

---

## 🤝 Contributing

We welcome contributions! Please see:

1. Read [AGENTS.md](AGENTS.md) for development guidelines
2. Check [docs/guides/CONTRIBUTING.md](docs/guides/CONTRIBUTING.md)
3. Follow the code style guidelines
4. Add tests for new features
5. Update documentation

### Quick Contribution Workflow

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/sonu.git
cd sonu

# 2. Create branch
git checkout -b feature/your-feature

# 3. Make changes and test
cd apps/desktop
npm run test:all

# 4. Commit with clear message
git commit -m "feat: add your feature"

# 5. Push and create PR
git push origin feature/your-feature
```

---

## 🛣️ Roadmap

### Q1 2026

- [x] Security audit and hardening
- [x] Error handling improvements
- [x] Code cleanup and organization
- [ ] macOS support (Tauri app)
- [ ] Linux support (Tauri app)

### Q2 2026

- [ ] Real-time transcription streaming
- [ ] Custom model training
- [ ] Plugin system
- [ ] Voice commands

### Future

- [ ] Cloud sync (optional)
- [ ] Team features
- [ ] Mobile app expansion

---

## 📝 License

MIT License - See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) - Fast Whisper inference
- [Tauri](https://tauri.app) - Secure desktop framework
- [Electron](https://electronjs.org) - Cross-platform desktop
- [Handy](https://github.com/cjpais/Handy) - Architecture inspiration

---

<p align="center">
  Made with ❤️ for voice typing enthusiasts
</p>

<p align="center">
  <a href="https://github.com/muhib-karim/sonu">⭐ Star us on GitHub</a>
</p>
