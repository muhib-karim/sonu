# AGENTS.md
Guidance for agentic coding assistants (Cursor, Copilot, Claude Code, OpenCode) in this repository.

## Scope and precedence
- **Primary app**: `apps/tauri-v2/` (Tauri v2: Rust + React/TypeScript) — all new development here
- **Legacy app**: `apps/desktop/` (Electron: JavaScript + Python) — maintenance only
- Conflict order:
  1. Direct user request
  2. Tool-specific rules (Cursor `.cursorrules`, etc.)
  3. This `AGENTS.md`

## Working directory defaults
- **Default to `apps/tauri-v2/`** for all implementation work
- `apps/desktop/` only when explicitly told "work on the Electron app"
- For repo-wide analysis, start at root

## Build, lint, and test commands
### Tauri v2 (`apps/tauri-v2`) — PRIMARY
Prereqs: Bun, Rust toolchain, Tauri prerequisites.

```bash
# Install
bun install

# Dev / build
bun run tauri dev
bun run dev
bun run build
bun run tauri build

# Lint / format / types
bun run lint
bun run format
bun run format:check
bun run typecheck

# Test suites
bun run test
bun run test:e2e
bun run test:rust
```

Single-test commands:

```bash
# One Vitest file
bun run test -- src/components/ui/__tests__/Button.test.tsx

# One Vitest test by name
bun run test -- -t "renders default button"

# One Rust test (from apps/tauri-v2/src-tauri)
cargo test test_name
cargo test module::tests::test_name -- --nocapture
```

## CI / CD
- **CI** (`.github/workflows/ci.yml`): Runs on push/PR to main — lint, format, typecheck, Vitest, cargo fmt/clippy
- **Build** (`.github/workflows/build.yml`): Reusable workflow for multi-platform Tauri builds (6 targets)
- **Release** (`.github/workflows/release.yml`): Manual dispatch — creates draft release, builds all platforms, publishes

## Code style guidelines
### TypeScript/React (Tauri frontend)
- TS is strict (`"strict": true`).
- Use path aliases: `@/*` and `@/bindings`.
- Use Vitest + Testing Library for unit tests.
- Run Prettier (`bun run format`); LF endings enforced.
- ESLint enforces `i18next/no-literal-string` in JSX — use translation keys.
- Use typed `commands.*` from `@/bindings` — never raw `invoke()`.
- Prefer functional components and existing store/hook patterns.

### Rust (Tauri backend)
- Use `cargo fmt` (edition 2021) and `cargo clippy`.
- Naming: `snake_case` functions, `PascalCase` types, `SCREAMING_SNAKE_CASE` constants.
- Prefer `Result<T, E>` and `?` propagation.
- Avoid `unwrap`/`expect` in non-test paths.
- Log failures with context (`log::error!`, `log::warn!`).

## Agent behavior expectations
- Make minimal, scoped changes; avoid broad refactors unless asked.
- Do not commit secrets or API keys.
- Prefer extending existing modules over parallel replacements.
- Use `--no-verify` on commits if pre-commit hooks block on pre-existing upstream warnings.

---
Last updated: 2026-02-28
