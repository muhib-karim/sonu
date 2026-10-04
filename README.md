<div align="center">

<img src="docs/assets/banner.svg" alt="SONU: open-source voice typing" width="100%" />

# SONU

### The Open-Source Voice Typing Platform

**Type at the speed of thought. Fully offline. Fully private.**

[![Latest Release](https://img.shields.io/github/v/release/muhib-karim/sonu?style=for-the-badge&label=Latest&color=6366f1)](https://github.com/muhib-karim/sonu/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/muhib-karim/sonu/ci.yml?branch=main&style=for-the-badge&label=CI)](https://github.com/muhib-karim/sonu/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)
[![Stars](https://img.shields.io/github/stars/muhib-karim/sonu?style=for-the-badge&color=f59e0b)](https://github.com/muhib-karim/sonu)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-0ea5e9?style=for-the-badge)](https://github.com/muhib-karim/sonu/releases)
[![ZAI Community](https://img.shields.io/badge/Part%20of-ZAI%20Start--up%20Community-8b5cf6?style=for-the-badge)](https://startup.z.ai/)
[![Ko-fi](https://img.shields.io/badge/☕_Support_on_Ko--fi-FF5E5B?style=for-the-badge&logo=ko-fi)](https://ko-fi.com/ai_dev_2024)

[Website](https://muhib-karim.github.io/sonu/) · [Download](#-download) · [Features](#-features) · [Showcase](#-showcase--tauri-v2-app) · [Compare](#-how-sonu-compares) · [Docs](#-documentation) · [Contribute](#-contributing)

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

All transcription runs **locally on your device** by default — no audio ever leaves your machine unless you explicitly enable cloud transcription. No accounts, no subscriptions. Your voice stays yours.

</td>
<td width="50%">

### ⚡ Real-Time Transcription

Powered by **NVIDIA Parakeet**, **Whisper**, and **Moonshine** engines (via transcribe-rs) for blazing-fast, real-time voice-to-text. Start speaking and see words appear instantly.

</td>
</tr>
<tr>
<td width="50%">

### 🤖 AI Text Enhancement

Optional **LLM post-processing** cleans up filler words, fixes grammar, and formats your text — via cloud providers (OpenAI-compatible, Groq, and others).

</td>
<td width="50%">

### 🌍 50+ Languages

Transcribe in 50+ languages with automatic language detection. Offline, pick your engine: Parakeet V3 auto-detects languages, Whisper covers 99 languages, and cloud Whisper extends coverage further. Switch languages on the fly or lock to a specific one.

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

> **SONU v2.6.0** — Built with Tauri v2 (Rust + React). Lightweight, native, and fast.

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
| **Offline LLM support**               |         🚧 planned     |     ❌      |      ❌      |       ❌        |
| **Context-aware dictation**           |     ✅ (Windows)     |     ❌      |      ✅      |       ❌        |
| **Command Mode (voice rewrite)**      |          ✅          |     ❌      |      ❌      |       ❌        |
| **Cloud transcription option**        |          ✅          |     ✅      |      ✅      |       ✅        |
| **Custom API endpoint / self-hosted** |          ✅          |     ❌      |      ❌      |       ❌        |
| **Voice notes**                       |          ✅          |     ❌      |      ✅      |       ❌        |
| **Push-to-talk + toggle**             |          ✅          |     ✅      |      ✅      |       ✅        |
| **Auto-type into any app**            |          ✅          |     ✅      |      ✅      |       ✅        |
| **Multiple ASR models**               | ✅ (Parakeet, Whisper & Moonshine local) |     ❌      |      ✅      |       ❌        |
| **Themes & customization**            |          ✅          |   Limited   |   Limited    |       ❌        |

---

## ⬇️ Download

<div align="center">

### Get SONU for your platform

|                                                 Platform                                                 |                                          Download                                          |            Architecture             |
| :------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------: | :---------------------------------: |
| <img src="https://img.shields.io/badge/Windows-0078D6?style=flat-square&logo=windows&logoColor=white" /> |    **[Download Installer (.exe)](https://github.com/muhib-karim/sonu/releases/latest)**    | x64 (ARM64 paused, [#30](https://github.com/muhib-karim/sonu/issues/30)) |
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
4. Press your hotkey (default: `Alt` on Windows, `Option+Space` on macOS, `Ctrl+Space` on Linux) and start speaking

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

| Model              | Download Size | Speed      | Accuracy | Best For                            |
| ------------------ | ------------- | ---------- | -------- | ----------------------------------- |
| **Moonshine Base** | 58 MB         | ⚡⚡⚡⚡⚡ | ★★★☆☆    | Ultra-light English dictation       |
| **Whisper Tiny**   | 75 MB         | ⚡⚡⚡⚡⚡ | ★★☆☆☆    | Quick tests, very old hardware      |
| **Whisper Base**   | 142 MB        | ⚡⚡⚡⚡   | ★★★☆☆    | Lightweight multilingual dictation  |
| **Whisper Small**  | 487 MB        | ⚡⚡⚡⚡   | ★★★☆☆    | Balanced multilingual dictation     |
| **Whisper Medium** | 492 MB        | ⚡⚡⚡     | ★★★★☆    | High-accuracy work (quantized)      |
| **Whisper Large**  | 1.1 GB        | ⚡         | ★★★★★    | Maximum accuracy (quantized)        |
| **Whisper Turbo**  | 1.6 GB        | ⚡⚡       | ★★★★☆    | Large-v3 speed/accuracy balance     |
| **Parakeet V2** ⭐ | 473 MB        | ⚡⚡⚡⚡   | ★★★★★    | English — best speed/accuracy ratio |
| **Parakeet V3** ⭐ | 478 MB        | ⚡⚡⚡⚡   | ★★★★☆    | Multilingual — default pick         |

⭐ Recommended by SONU (Parakeet V3 is the default for new installs; V2 for
English-only). Download sizes reflect the quantized builds served by SONU's
model catalog. All models run locally on your device — they download
automatically on first use.

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
| **Speech Engine**       | [transcribe-rs](https://github.com/cjpais/transcribe-rs) (Parakeet TDT · Whisper · Moonshine) |
| **AI Enhancement**      | Cloud providers (OpenAI-compatible, Groq, etc.)                       |
| **Cloud Transcription** | Groq, Deepgram, Custom API endpoints                                  |
| **Security**            | OS Keychain, Tauri capability scoping, CSP                            |
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
- **🧱 Process isolation** — Tauri renders in a separate webview process from the Rust backend
- **🛡️ CSP Headers** — Content Security Policy limits what the webview can load
- **📁 Path handling** — Recording file names are validated before being resolved on disk

> **Egress note:** SONU makes no telemetry or analytics calls. The only outbound
> requests are model downloads (from the URLs in `resources/models.json`) and,
> if you enable them, update checks and cloud transcription / post-processing
> against the provider you configure.

---

## 🛣️ Roadmap

### ✅ Shipped

- [x] Offline voice-to-text (Parakeet, Whisper & Moonshine)
- [x] AI text enhancement (cloud LLMs; local models planned)
- [x] Context-aware dictation (adapts to the active app)
- [x] Command Mode (voice-rewrite selected text)
- [x] Cloud transcription (Groq, Deepgram, custom endpoint)
- [x] Custom dictionary & text snippets
- [x] Voice notes with search & playback
- [x] Multi-theme support (dark, light, system) with six accent presets
- [x] 50+ language support with auto-detection (cloud Whisper; offline Parakeet covers English + European languages)
- [x] Cross-platform support (Windows, macOS, Linux)

### 🚧 In Progress

- [ ] Custom model fine-tuning
- [ ] Plugin / extension system

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
