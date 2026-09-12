# Contributing to SONU

Thank you for your interest in contributing to SONU! This guide will help you get started.

## 📖 Philosophy

SONU is an open-source speech-to-text desktop app built with Tauri v2 (Rust + React).
We prioritize:

- **Simplicity**: Clear, maintainable code over clever solutions
- **Privacy**: Everything runs offline unless you explicitly enable cloud features
- **Accessibility**: Free tooling that belongs in everyone's hands

## 🚀 Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Bun](https://bun.sh/) package manager
- Platform-specific build tools (see [BUILD.md](BUILD.md))

### Setup

```bash
git clone https://github.com/muhib-karim/sonu.git
cd sonu/apps/tauri-v2
bun install
bun run tauri dev
```

On macOS a cmake policy env var may be needed:

```bash
CMAKE_POLICY_VERSION_MINIMUM=3.5 bun run tauri dev
```

### Codebase Overview

**Backend** (`src-tauri/src/`):

| Path             | What it does                                   |
| ---------------- | ---------------------------------------------- |
| `lib.rs`         | Tauri setup, tray, manager registration        |
| `managers/`      | Core logic — audio, transcription, model, etc. |
| `audio_toolkit/` | Low-level audio: capture, resample, VAD        |
| `commands/`      | Tauri IPC handlers                             |
| `shortcut.rs`    | Global hotkey dispatch                         |
| `settings.rs`    | Settings persistence + OS keychain for secrets |

**Frontend** (`src/`):

| Path          | What it does                                        |
| ------------- | --------------------------------------------------- |
| `App.tsx`     | Section nav + onboarding gate                       |
| `components/` | Settings panels, UI components                      |
| `stores/`     | Zustand store (single source of truth for settings) |
| `hooks/`      | Reusable hooks                                      |
| `bindings.ts` | Auto-generated typed Tauri commands                 |

See [AGENTS.md](AGENTS.md) for full development guidelines and build commands.

## 🐛 Reporting Issues

Open issues on [GitHub](https://github.com/muhib-karim/sonu/issues).
Include: app version, OS, CPU/GPU, steps to reproduce, expected vs actual behavior.

## 💡 Features

Start a [Discussion](https://github.com/muhib-karim/sonu/discussions) for feature ideas.
Search existing discussions first.

## 🔧 Making Changes

### Workflow

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Make focused, minimal changes
3. Run checks:

   ```bash
   bun run lint
   bun run format:check
   bun run typecheck
   cd src-tauri && cargo fmt -- --check && cargo clippy
   ```

4. Commit conventionally: `git commit -m "feat: add feature"`
5. Push and open a PR against `muhib-karim/sonu:main`

### AI Assistance

AI-assisted PRs are welcome. Mention which tool was used in the PR description.

### Code Style

**Rust** — `cargo fmt`, `cargo clippy`, snake_case, Result propagation over unwrap.

**TypeScript** — strict mode, functional components, typed commands (`commands.*` from `@/bindings`), i18n keys for JSX text.

## 📞 Getting Help

- [Discord](https://discord.com/invite/WVBeWsNXK4)
- [GitHub Discussions](https://github.com/muhib-karim/sonu/discussions)

---

**Thank you for contributing to SONU!**
