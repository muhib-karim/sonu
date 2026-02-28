# SONU - Professional Offline Voice Typing

<p align="center">
  <img src="assets/icon.png" alt="SONU Logo" width="128" />
</p>

<h1 align="center">SONU</h1>

<p align="center">
  <strong>🎤 Professional Offline Voice Typing Platform</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Desktop-v3.7.0-blue?style=for-the-badge" alt="Desktop Version" />
  <img src="https://img.shields.io/badge/Tauri-v2.2.0-6366f1?style=for-the-badge" alt="Tauri Version" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/Tests-Automated-success?style=for-the-badge" alt="Tests" />
</p>

<p align="center">
  A complete offline voice typing solution for desktop.<br/>
  No cloud. No subscriptions. 100% private.
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-download">Download</a> •
  <a href="#-support">Support</a> •
  <a href="#-security">Security</a>
</p>

---

## 📸 Screenshot

<p align="center">
  <img src="assets/showcase/01_home.png" alt="SONU Home Screen" width="680" />
</p>

<p align="center">
  <em>SONU v2.2.0 — Clean, modern interface for offline voice typing</em>
</p>

---

## 💝 Support SONU

**SONU is completely free and open source.** Your support helps us:
- 🚀 Maintain and improve the software
- 🐛 Fix bugs and security issues quickly
- ✨ Add new features and models
- 🌍 Support more languages and platforms

<p align="center">
  <a href="https://github.com/sponsors/muhib-karim">
    <img src="https://img.shields.io/badge/Sponsor-%E2%9D%A4-ff69b4?style=for-the-badge&logo=github" alt="Sponsor on GitHub" />
  </a>
  <a href="https://www.buymeacoffee.com/sonu">
    <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-%E2%98%95-yellow?style=for-the-badge&logo=buy-me-a-coffee" alt="Buy Me a Coffee" />
  </a>
  <a href="https://ko-fi.com/sonu">
    <img src="https://img.shields.io/badge/Ko--fi-Support-%23FF5E5B?style=for-the-badge&logo=kofi" alt="Ko-fi" />
  </a>
  <a href="https://paypal.me/sonuvoice">
    <img src="https://img.shields.io/badge/PayPal-Donate-00457C?style=for-the-badge&logo=paypal" alt="PayPal" />
  </a>
</p>

<p align="center">
  <strong>⭐ Star this repository</strong> to show your support!
</p>

---

## ⬇️ Download

### Latest Releases

| Platform | Download | Version |
|----------|----------|---------|
| **Windows** | [Download Installer](https://github.com/muhib-karim/sonu/releases/latest) | v3.7.0 |
| **macOS** | [Download DMG](https://github.com/muhib-karim/sonu/releases/latest) | v2.2.0 |
| **Linux** | [Download AppImage](https://github.com/muhib-karim/sonu/releases/latest) | v2.2.0 |

<p align="center">
  <a href="https://github.com/muhib-karim/sonu/releases/latest">
    <img src="https://img.shields.io/github/v/release/muhib-karim/sonu?style=for-the-badge&color=blue" alt="Latest Release" />
  </a>
</p>

### Installation

**Windows:**
1. Download the `.exe` installer
2. Run the installer and follow the prompts
3. Launch SONU from the Start Menu

**macOS:**
1. Download the `.dmg` file
2. Open the DMG and drag SONU to Applications
3. Launch from Applications folder

**Linux:**
1. Download the `.AppImage` (portable) or `.deb` (Debian/Ubuntu)
2. Make executable: `chmod +x SONU-*.AppImage`
3. Run: `./SONU-*.AppImage`

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
│   ├── desktop/           # 🖥️ Electron desktop app (v3.7.0)
│   │   ├── src/
│   │   │   ├── config/   # Configuration management
│   │   │   ├── core/     # Core services (IPC, models, Python)
│   │   │   ├── services/ # Business logic services
│   │   │   └── utils/    # Utilities (logger, secureStorage, validation)
│   │   └── tests/        # Test suites
│   │
│   └── tauri-v2/         # 🦀 Tauri desktop app (v2.2.0)
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

## 🧪 Automated Testing

**All testing is done in the cloud via GitHub Actions.** No local testing required!

<p align="center">
  <a href="https://github.com/muhib-karim/sonu/actions">
    <img src="https://img.shields.io/github/workflow/status/muhib-karim/sonu/CI?style=for-the-badge" alt="CI Status" />
  </a>
</p>

### Test Coverage

| Test Type | Status | Platform |
|-----------|--------|----------|
| **Unit Tests** | ✅ Automated | Ubuntu, Windows, macOS |
| **Integration Tests** | ✅ Automated | Ubuntu, Windows, macOS |
| **E2E Tests** | ✅ Automated | Ubuntu, Windows, macOS |
| **Security Tests** | ✅ Automated | All platforms |
| **Linting** | ✅ Automated | All platforms |

### Test Workflows

- **On every PR**: Linting, unit tests, type checking
- **On every push to main**: Full test suite + security scans
- **On version tags**: Complete build + release pipeline

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

## 💝 Support the Project

SONU is developed and maintained with ❤️ by a small team. Your support makes a huge difference!

### Ways to Support

<p align="center">
  <a href="https://github.com/sponsors/muhib-karim">
    <img src="https://img.shields.io/badge/GitHub%20Sponsors-%E2%9D%A4-ff69b4?style=for-the-badge&logo=github" alt="GitHub Sponsors" />
  </a>
</p>

**Monthly Sponsorship Tiers:**
- ☕ **$5/month** - Coffee supporter
- 🚀 **$10/month** - Early access to new features
- 💎 **$25/month** - Priority support + name in credits
- 🌟 **$50/month** - All above + custom feature requests

<p align="center">
  <a href="https://www.buymeacoffee.com/sonu">
    <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-%E2%98%95-yellow?style=for-the-badge&logo=buy-me-a-coffee" alt="Buy Me a Coffee" />
  </a>
</p>

**One-time Donations:**
- [Buy Me a Coffee](https://www.buymeacoffee.com/sonu) - ☕ Support with a coffee
- [Ko-fi](https://ko-fi.com/sonu) - ☕ Quick donations
- [PayPal](https://paypal.me/sonuvoice) - 💳 Secure PayPal donation

<p align="center">
  <a href="https://ko-fi.com/sonu">
    <img src="https://img.shields.io/badge/Ko--fi-Support-%23FF5E5B?style=for-the-badge&logo=kofi" alt="Ko-fi" />
  </a>
  <a href="https://paypal.me/sonuvoice">
    <img src="https://img.shields.io/badge/PayPal-Donate-00457C?style=for-the-badge&logo=paypal" alt="PayPal" />
  </a>
</p>

### Non-Monetary Support

- ⭐ **Star this repository** - It helps others discover SONU
- 🐛 **Report bugs** - Help us improve quality
- 💡 **Suggest features** - Shape the roadmap
- 📝 **Write documentation** - Help others get started
- 🌐 **Translate** - Make SONU accessible globally

---

## 🏆 Sponsors

A huge thank you to our sponsors who make SONU possible!

### Diamond Sponsors 💎

*Become our first Diamond Sponsor!*

### Gold Sponsors 🥇

*Become our first Gold Sponsor!*

### Silver Sponsors 🥈

*Become our first Silver Sponsor!*

### Bronze Sponsors 🥉

*Become our first Bronze Sponsor!*

---

## 🔄 Version History

### Desktop (Electron)

| Version | Date | Highlights |
|---------|------|------------|
| **3.7.0** | 2026-02-19 | Security improvements, error handling, code cleanup |
| **3.6.1** | 2025-12-27 | Production fixes, instant text output |
| **3.6.0** | 2025-12-05 | LLM integration, context awareness |
| **3.5.0** | 2025-11-XX | Multi-language support, snippets |

### Desktop v2 (Tauri)

| Version | Date | Highlights |
|---------|------|------------|
| **2.2.0** | 2026-02-19 | Comprehensive testing infrastructure |
| **2.1.0** | 2026-01-XX | Parakeet engine, offline LLM |
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
- [x] Automated cloud testing
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
  <strong>Made with ❤️ for voice typing enthusiasts</strong>
</p>

<p align="center">
  <a href="https://github.com/muhib-karim/sonu">⭐ Star us on GitHub</a> •
  <a href="https://github.com/sponsors/muhib-karim">💖 Sponsor</a> •
  <a href="https://twitter.com/sonuvoice">🐦 Twitter</a>
</p>

<p align="center">
  <sub>SONU is not affiliated with OpenAI. Whisper is a trademark of OpenAI.</sub>
</p>
