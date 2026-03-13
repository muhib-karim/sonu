# Contributing to SONU

Thank you for your interest in contributing! SONU is built by a solo developer with AI assistance, and community contributions are welcome.

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) (package manager)
- [Rust toolchain](https://rustup.rs) (stable)
- Platform-specific [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/)

### Getting Started

```bash
git clone https://github.com/muhib-karim/sonu.git
cd sonu/apps/tauri-v2
bun install
bun run tauri dev
```

### Running Tests

```bash
# Frontend tests (Vitest)
bun run test

# Single test file
bun run test -- src/hooks/__tests__/useSettings.test.ts

# Rust tests (from src-tauri/)
cd src-tauri && cargo test

# Lint & format
bun run lint
bun run format:check
bun run typecheck
```

## Code Style

### TypeScript / React
- Strict TypeScript (`"strict": true`)
- Prettier for formatting (run `bun run format` before committing)
- ESLint enforces `i18next/no-literal-string` — user-facing JSX text must use translation keys
- Use path aliases: `@/*` maps to `src/`
- Use typed `commands.*` from `@/bindings` — never raw `invoke()`

### Rust
- `cargo fmt` for formatting
- `cargo clippy` for linting
- `snake_case` functions, `PascalCase` types, `SCREAMING_SNAKE_CASE` constants
- Prefer `Result<T, E>` with `?` propagation over `.unwrap()`

## Commit Convention

```
type: short description

# Types: feat, fix, docs, style, refactor, test, chore
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make focused, minimal changes
4. Ensure `bun run lint`, `bun run typecheck`, and `bun run test` pass
5. Open a PR against `main`

## Code of Conduct

- Be respectful and constructive
- Focus on the code, not the person
- Help maintain a welcoming environment

