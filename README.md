<div align="center">

<img src="apps/tauri-v2/src-tauri/icons/icon.png" alt="SONU" width="120" />

# SONU

### The Open-Source Voice Typing Platform

**Type at the speed of thought. Fully offline. Fully private.**

[![Latest Release](https://img.shields.io/badge/Latest-v2.4.0-6366f1?style=for-the-badge)](https://github.com/muhib-karim/sonu/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/muhib-karim/sonu/ci.yml?branch=main&style=for-the-badge&label=CI)](https://github.com/muhib-karim/sonu/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)
[![Stars](https://img.shields.io/github/stars/muhib-karim/sonu?style=for-the-badge&color=f59e0b)](https://github.com/muhib-karim/sonu)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-0ea5e9?style=for-the-badge)](https://github.com/muhib-karim/sonu/releases)
[![ZAI Community](https://img.shields.io/badge/Part%20of-ZAI%20Start--up%20Community-8b5cf6?style=for-the-badge)](https://startup.z.ai/)
[![Ko-fi](https://img.shields.io/badge/☕_Support_on_Ko--fi-FF5E5B?style=for-the-badge&logo=ko-fi)](https://ko-fi.com/ai_dev_2024)

[Download](#-download) · [Features](#-features) · [Showcase](#-showcase--tauri-v2-app) · [Compare](#-how-sonu-compares) · [Docs](#-documentation) · [Contribute](#-contributing)

</div>

---

<div align="center">

**Built with Tauri v2 (Rust) + React** — _Dictate anywhere, your words appear instantly in any application._

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🔒 100% Offline & Private

All transcription runs **locally on your device**. No audio ever leaves your machine. No accounts, no cloud, no subscriptions. Your voice stays yours.

</td>
<td width="50%">

### ⚡ Real-Time Transcription

Powered by optimized **whisper.cpp** and **Parakeet** engines for blazing-fast, real-time voice-to-text. Start speaking and see words appear instantly.

</td>
</tr>
<tr>
<td width="50%">

### 🤖 AI Text Enhancement

Optional **LLM post-processing** cleans up filler words, fixes grammar, and formats your text — all locally with offline models, or via cloud providers.

</td>
<td width="50%">

### 🌍 50+ Languages

Transcribe in over 50 languages with automatic language detection. Switch languages on the fly or lock to a specific one.

</td>
</tr>
<tr>
<td width="50%">

### ⌨️ Universal Auto-Type

SONU types directly into **any application** — your browser, IDE, email client, Slack, Discord, Word — anywhere you can type.

</td>
<td width="50%">

### 🧠 Context-Aware Dictation

SONU detects the **app you're typing in** and adapts tone and formatting automatically — casual in messengers, formal in email, code-safe in your IDE.

</td>
</tr>
<tr>
<td width="50%">

### ✨ Command Mode

Select any text, press the Command Mode shortcut, and speak an instruction like _"make this more concise"_ — your voice-driven AI rewrites it in place.

</td>
<td width="50%">

### ☁️ Cloud Transcription (Optional)

Connect to **Groq**, **Deepgram**, or any **custom API endpoint** for cloud-powered transcription when you want maximum accuracy.

</td>
</tr>
<tr>
<td width="50%">

### 📚 Smart Dictionary

Custom word corrections automatically fix domain-specific terms, names, and jargon that the model might mishear.

</td>
<td width="50%">

### 📝 Snippets & Text Expansion

Define shorthand codes that expand into full text blocks — perfect for emails, code comments, addresses, and common phrases.

</td>
</tr>
</table>

---

## 📸 Showcase — Tauri v2 App

<div align="center">

> **SONU v2.4.0** — Built with Tauri v2 (Rust + React). Lightweight, native, and fast.

### Appearance & responsiveness

SONU ships with bundled Geist typography, light/dark/system themes, six accent
presets, semantic design tokens, and a low-latency floating recording overlay.
The local live preview begins showing text while you speak; the final pass keeps
full accuracy and existing AI enhancement behavior.

![SONU dark theme dashboard](apps/tauri-v2/shot-dark-home.png)

> The screenshot above is captured from the Windows Tauri v2 app. More theme
> screenshots will be added as part of the cross-platform visual QA pass.

### 🏠 Home Dashboard

The home screen shows your **dictation stats** (time, word count, WPM, time saved), a **voice activation shortcut recorder**, **privacy status**, and **recent transcription history** — all in a clean dashboard layout with local/cloud mode indicator.

### 📚 Dictionary & ✂️ Snippets

**Dictionary** lets you add custom word corrections for domain-specific terms the model might mishear. **Snippets** are reusable text blocks you can expand with shorthand codes — perfect for emails, addresses, and common phrases.

### 📝 Notes

Voice-powered sticky notes with **color-coded cards** (6 colors), **search**, **grid/list view toggle**, and per-note **audio playback** — saved/starred transcriptions become visual notes.

### 🎨 Style

Choose AI dictation style presets organized by category: _Personal_, _Work_, _Email_, _Other_. Each style (Casual, Professional, Technical, Creative, etc.) transforms your raw transcription with LLM post-processing.

### ⚙️ Settings

- **General** — Shortcut binding, language, microphone, audio feedback, push-to-talk
- **Advanced** — Autostart, overlay, clipboard handling, model unload timeout, AI post-processing toggle
- **Cloud** — Provider cards for Groq, Deepgram, and custom self-hosted servers with status indicators
- **Post-Processing** — LLM provider config, model selection, API keys, custom prompts
- **History** — Full transcription log with audio playback, copy, star/save, and delete
- **Debug** — Log level, sound themes, thresholds, recording retention, advanced toggles
- **About** — App version, language, data directory, credits, and links

</div>

> 📷 **Screenshots coming soon** — The Tauri v2 app is built and running. Take screenshots with `bun run tauri dev` in `apps/tauri-v2/`.

---

## 🏆 How SONU Compares

| Feature                               |         SONU         | Wispr Flow  | Superwhisper | macOS Dictation |
| ------------------------------------- | :------------------: | :---------: | :----------: | :-------------: |
| **Fully offline**                     |          ✅          |     ❌      |      ✅      |     Partial     |
| **Open source**                       |          ✅          |     ❌      |      ❌      |       ❌        |
| **Free forever**                      |          ✅          | ❌ ($10/mo) |  ❌ ($8/mo)  |       ✅        |
| **Windows + macOS + Linux**           |          ✅          | macOS only  |  macOS only  |   macOS only    |
| **50+ languages**                     |          ✅          |     ✅      |      ✅      |       ✅        |
| **Custom dictionary**                 |          ✅          |     ❌      |      ❌      |       ❌        |
| **Text snippets**                     |          ✅          |     ❌      |      ❌      |       ❌        |
| **AI text enhancement**               |          ✅          |     ✅      |      ✅      |       ❌        |
| **Offline LLM support**               |          ✅          |     ❌      |      ❌      |       ❌        |
| **Context-aware dictation**           |          ✅          |     ❌      |      ✅      |       ❌        |
| **Command Mode (voice rewrite)**      |          ✅          |     ❌      |      ❌      |       ❌        |
| **Cloud transcription option**        |          ✅          |     ✅      |      ✅      |       ✅        |
| **Custom API endpoint / self-hosted** |          ✅          |     ❌      |      ❌      |       ❌        |
| **Voice notes**                       |          ✅          |     ❌      |      ✅      |       ❌        |
| **Push-to-talk + toggle**             |          ✅          |     ✅      |      ✅      |       ✅        |
| **Auto-type into any app**            |          ✅          |     ✅      |      ✅      |       ✅        |
| **Multiple Whisper models**           | ✅ (tiny → large-v3) |     ❌      |      ✅      |       ❌        |
| **Themes & customization**            |          ✅          |   Limited   |   Limited    |       ❌        |

---

## ⬇️ Download

<div align="center">

### Get SONU for your platform

|                                                 Platform                                                 |                                          Download                                          |            Architecture             |
| :------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------: | :---------------------------------: |
| <img src="https://img.shields.io/badge/Windows-0078D6?style=flat-square&logo=windows&logoColor=white" /> |    **[Download Installer (.exe)](https://github.com/muhib-karim/sonu/releases/latest)**    |             x64, ARM64              |
|   <img src="https://img.shields.io/badge/macOS-000000?style=flat-square&logo=apple&logoColor=white" />   |          **[Download DMG](https://github.com/muhib-karim/sonu/releases/latest)**           | Intel (x64) + Apple Silicon (ARM64) |
|   <img src="https://img.shields.io/badge/Linux-FCC624?style=flat-square&logo=linux&logoColor=black" />   | **[Download AppImage / .deb / .rpm](https://github.com/muhib-karim/sonu/releases/latest)** |                 x64                 |

[![Download Latest](https://img.shields.io/github/v/release/muhib-karim/sonu?style=for-the-badge&label=Download%20Latest&color=6366f1)](https://github.com/muhib-karim/sonu/releases/latest)
[![Total Downloads](https://img.shields.io/github/downloads/muhib-karim/sonu/total?style=for-the-badge&label=Downloads&color=22c55e)](https://github.com/muhib-karim/sonu/releases)

</div>

### Quick Install

<details>
<summary><strong>Windows</strong></summary>

1. Download the `.exe` installer from [Releases](https://github.com/muhib-karim/sonu/releases/latest)
2. Run the installer and follow the prompts
3. Launch SONU from the Start Menu or system tray
4. Press your hotkey (default: `Ctrl+Shift+Space`) and start speaking

</details>

<details>
<summary><strong>macOS</strong></summary>

1. Download the `.dmg` from [Releases](https://github.com/muhib-karim/sonu/releases/latest)
2. Open the DMG and drag SONU to Applications
3. Grant Accessibility permissions when prompted
4. Press your hotkey and start speaking

</details>

<details>
<summary><strong>Linux</strong></summary>

1. Download `.AppImage` (portable) or `.deb` (Debian/Ubuntu) from [Releases](https://github.com/muhib-karim/sonu/releases/latest)
2. For AppImage: `chmod +x SONU-*.AppImage && ./SONU-*.AppImage`
3. For .deb: `sudo dpkg -i sonu_*.deb`
4. Press your hotkey and start speaking

</details>

---

## 🧠 Supported Models

SONU supports multiple speech recognition engines and models:

| Model             | Size   | Speed      | Accuracy | Best For                            |
| ----------------- | ------ | ---------- | -------- | ----------------------------------- |
| **tiny**          | 75 MB  | ⚡⚡⚡⚡⚡ | ★★☆☆☆    | Quick notes, low-resource machines  |
| **base**          | 142 MB | ⚡⚡⚡⚡   | ★★★☆☆    | Everyday dictation                  |
| **small**         | 466 MB | ⚡⚡⚡     | ★★★★☆    | Professional use                    |
| **medium**        | 1.5 GB | ⚡⚡       | ★★★★☆    | High-accuracy work                  |
| **large-v3**      | 3.1 GB | ⚡         | ★★★★★    | Maximum accuracy                    |
| **Parakeet 0.6B** | 600 MB | ⚡⚡⚡⚡   | ★★★★★    | English — best speed/accuracy ratio |

Models download automatically on first use. All processing stays local.

---

## 🏗️ Architecture

```
SONU/
├── apps/
│   └── tauri-v2/          🦀 Tauri v2 desktop app (Rust + React)
│       ├── src/           React/TypeScript frontend
│       └── src-tauri/     Rust backend (transcription, audio, models)
│
├── docs/                  📚 Documentation & guides
└── .github/               ⚙️ CI, build & release workflows
```

### Tech Stack

| Layer                   | Technology                                                            |
| ----------------------- | --------------------------------------------------------------------- |
| **Desktop Framework**   | [Tauri v2](https://v2.tauri.app) (Rust)                               |
| **Frontend**            | React 18, TypeScript, TailwindCSS                                     |
| **Speech Engine**       | [whisper.cpp](https://github.com/ggerganov/whisper.cpp), Parakeet TDT |
| **AI Enhancement**      | Local LLM (GGUF) + Cloud providers (OpenAI, Groq, etc.)               |
| **Cloud Transcription** | Groq, Deepgram, Custom API endpoints                                  |
| **Security**            | OS Keychain, Context Isolation, CSP, Input Validation                 |
| **Testing**             | Vitest, Playwright, Rust tests, GitHub Actions CI                     |

---

## 🚀 Development

### Prerequisites

- **Bun** (package manager) — [bun.sh](https://bun.sh)
- **Rust** toolchain — [rustup.rs](https://rustup.rs)
- **Tauri prerequisites** — [tauri.app/start/prerequisites](https://v2.tauri.app/start/prerequisites/)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/muhib-karim/sonu.git
cd sonu/apps/tauri-v2

# Install dependencies
bun install

# Run in development
bun run tauri dev

# Build for production
bun run tauri build
```

### Commands

```bash
bun run dev           # Start Vite dev server
bun run tauri dev     # Start full Tauri dev environment
bun run build         # Build frontend
bun run tauri build   # Build production binary
bun run test          # Run Vitest unit tests
bun run test:e2e      # Run Playwright E2E tests
bun run lint          # ESLint check
bun run format        # Prettier format
bun run typecheck     # TypeScript check
```

### Self-Hosted / Custom Transcription

SONU can send audio to any transcription endpoint you control. Go to
**Settings → Cloud**, pick the _Custom / Self-Hosted_ provider, and point it
at your own OpenAI-compatible API endpoint. Nothing is routed through us.

---

## 🛡️ Security

SONU is designed with security-first principles:

- **🔒 No telemetry** — Zero data collection, no analytics, no phone-home
- **🔐 OS Keychain** — API keys stored in your OS's secure credential store
- **🧱 Context Isolation** — Renderer process fully sandboxed
- **🛡️ CSP Headers** — Content Security Policy prevents injection attacks
- **✅ Input Validation** — All IPC parameters validated against schemas
- **📁 Path Sanitization** — Prevents path traversal attacks
- **🚫 No eval()** — ESLint enforces no dynamic code execution

---

## 🛣️ Roadmap

### ✅ Shipped

- [x] Offline voice-to-text with Whisper & Parakeet
- [x] AI text enhancement (local + cloud LLMs)
- [x] Context-aware dictation (adapts to the active app)
- [x] Command Mode (voice-rewrite selected text)
- [x] Cloud transcription (Groq, Deepgram, custom endpoint)
- [x] Custom dictionary & text snippets
- [x] Voice notes with search & playback
- [x] Multi-theme support (dark, light, custom)
- [x] 50+ language support with auto-detection
- [x] Cross-platform support (Windows, macOS, Linux)

### 🚧 In Progress

- [ ] Real-time streaming transcription
- [ ] Custom model fine-tuning
- [ ] Plugin / extension system
- [ ] Voice commands & macros

### 🔮 Future

- [ ] Team collaboration features
- [ ] Mobile companion app
- [ ] Browser extension
- [ ] Cloud sync (optional, encrypted)

---

## 🤝 Contributing

We welcome contributions! Whether it's bug fixes, features, translations, or docs:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run checks: `bun run lint && bun run test && bun run typecheck`
5. Commit: `git commit -m "feat: add amazing feature"`
6. Push and open a Pull Request

See [AGENTS.md](AGENTS.md) for development guidelines and coding conventions.

---

## 📚 Documentation

| Document                                                             | Description                                  |
| -------------------------------------------------------------------- | -------------------------------------------- |
| [AGENTS.md](AGENTS.md)                                               | AI assistant guidelines & build commands     |
| [CHANGELOG.md](CHANGELOG.md)                                         | Version history & release notes              |
| [ARCHITECTURE.md](ARCHITECTURE.md)                                   | Technical architecture overview              |
| [INSTALL.md](INSTALL.md)                                             | Installation guide                           |
| [docs/AI_FEATURES.md](docs/AI_FEATURES.md)                           | AI post-processing & context-aware dictation |
| [docs/BRAND_GUIDELINES.md](docs/BRAND_GUIDELINES.md)                 | Brand & logo usage                           |
| [docs/TAURI_V2_MIGRATION_GUIDE.md](docs/TAURI_V2_MIGRATION_GUIDE.md) | Tauri v2 migration guide                     |
| [CONTRIBUTING.md](CONTRIBUTING.md)                                   | Contribution guidelines                      |

---

## 📝 License

[MIT License](LICENSE) — free for personal and commercial use.

---

## 🙏 Acknowledgments

- [Handy](https://github.com/cjpais/Handy) — SONU's foundation; a superb open-source speech-to-text app by CJ Pais
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) — Fast C++ Whisper inference
- [Tauri](https://tauri.app) — Secure, lightweight desktop framework
- [NVIDIA Parakeet](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v2) — High-accuracy English ASR

<sub>Fork notice: SONU is an independent fork of Handy. The Handy name, logo, and brand assets are not open-source — SONU uses its own branding and does not imply endorsement or affiliation.</sub>

---

<div align="center">

**Made with ❤️ for people who think faster than they type.**

[⭐ Star on GitHub](https://github.com/muhib-karim/sonu) · [ Download](https://github.com/muhib-karim/sonu/releases/latest)

<sub>SONU is not affiliated with OpenAI. Whisper is a trademark of OpenAI.</sub>

</div>
