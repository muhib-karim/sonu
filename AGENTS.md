# AGENTS.md
Guidance for agentic coding assistants (Cursor, Copilot, Claude Code, OpenCode) in this repository.

## Scope and precedence
- Monorepo apps:
  - `apps/tauri-v2/` (Tauri v2: Rust + React/TypeScript)
  - `apps/desktop/` (Electron desktop: JavaScript + Python)
  - `apps/mobile/` (mobile)
- Conflict order:
  1. Direct user request
  2. Tool-specific rules (Cursor `.cursorrules`, etc.)
  3. This `AGENTS.md`

## Cursor and Copilot rules
### Cursor
- `.cursorrules` exists at repo root and currently says:
  - Default to `apps/desktop/` unless explicitly told otherwise
  - Treat root files as legacy/backup for active desktop work
  - Use `apps/mobile/` only when explicitly requested
- In Cursor sessions, follow `.cursorrules` first.

### Copilot
- No `.github/copilot-instructions.md` was found.
- Use this file as baseline guidance for Copilot-style agents.

## Working directory defaults
- For repo-wide analysis, start at root.
- For implementation, choose app explicitly:
  - Tauri work: `apps/tauri-v2/`
  - Electron work: `apps/desktop/`
- Avoid editing legacy root-level duplicates when app-scoped versions exist.

## Build, lint, and test commands
### Tauri v2 (`apps/tauri-v2`)
Prereqs: Bun, Rust toolchain, Tauri prerequisites.

```bash
# Install
bun install

# Dev / build
bun run tauri dev
bun run dev
bun run build
bun run tauri build
bun run preview

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

Single-test commands (important):

```bash
# One Vitest file
bun run test -- src/components/ui/__tests__/Button.test.tsx

# One Vitest test by name
bun run test -- -t "renders default button"

# One Playwright spec
bun run test:e2e -- e2e/onboarding.spec.ts

# One Rust test (from apps/tauri-v2/src-tauri)
cargo test test_name
cargo test module::tests::test_name -- --nocapture
```

### Electron Desktop (`apps/desktop`)
Prereqs: Node.js/npm, Python for Python-backed tests.

```bash
# App
npm install
npm start
npm run build

# Top-level test entry points
npm run test
npm run test:e2e
npm run test:all
```

Detailed tests live in `apps/desktop/tests`:

```bash
cd tests
npm install
npm run test
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:visual
npm run test:python
```

Single-test commands (important):

```bash
# One Jest file
npm run test:unit -- tests/unit/logger.test.js

# One Jest test by name
npx jest tests/unit/logger.test.js -t "initializes logger"

# One Python test
python -m pytest tests/python/test_whisper_service.py::test_transcribe
```

## Hooks and CI-relevant checks
- Root `.husky/pre-commit` checks staged files by type:
  - JS/TS -> `apps/tauri-v2`: lint, format, typecheck
  - Rust -> `apps/tauri-v2/src-tauri`: `cargo fmt -- --check`, `cargo clippy -- -D warnings`
  - Python -> optional `flake8` for desktop python code
- Root `.husky/pre-push` runs `npm test --if-present || true`.
- `apps/desktop/.husky` also has desktop-specific pre-commit/pre-push scripts.

## Code style guidelines
### TypeScript/React (Tauri frontend)
- TS is strict (`"strict": true` in `tsconfig.json`).
- Use path aliases from `tsconfig.json`: `@/*` and `@/bindings`.
- Keep import groups consistent: external -> internal aliases -> relative.
- Use Vitest + Testing Library for unit tests and Playwright for e2e.
- Run Prettier (`bun run format`); LF endings are enforced.
- Follow existing quote/trailing-comma style in touched files; do not hand-format against Prettier.
- ESLint enforces `i18next/no-literal-string` in JSX (`markupOnly`); user-facing JSX text should use translation keys.
- Use `type` and `interface` pragmatically; keep shared contracts in `src/lib/types.ts` when appropriate.
- Prefer functional components and existing store/hook patterns.
- Wrap async UI flows with `try/catch`; surface user-facing failures with existing toast patterns.

### JavaScript (Electron desktop)
- CommonJS modules (`require`/`module.exports`).
- Use path aliases via `src/` directory structure.
- Run ESLint (`npm run lint`); fix issues before committing.
- Import utilities from `src/utils/` (logger, validation, errorHandler).
- Validate all IPC parameters with `validation.validateIPCParams()`.
- Use `errorHandler.safeSpawn()` instead of raw `child_process.spawn()`.

### Rust (Tauri backend)
- Use `cargo fmt` (edition 2021) and `cargo clippy -- -D warnings`.
- Naming:
  - `snake_case` for functions/modules/variables
  - `PascalCase` for structs/enums/traits
  - `SCREAMING_SNAKE_CASE` for constants/statics
- Prefer `Result<T, E>` and `?` propagation for recoverable paths.
- Avoid `unwrap`/`expect` in non-startup/non-test paths unless failure is truly unrecoverable.
- Log failures with context (`log::error!`, `log::warn!`).

### JavaScript/Python (Electron desktop)
- JavaScript: CommonJS (`require`/`module.exports`) is the dominant pattern.
- Reuse existing modules in `apps/desktop/src/{services,config,utils}` before creating new abstractions.
- Keep functions small and side effects explicit in main-process code.
- Python: keep dependencies aligned with `requirements.txt`; add focused pytest coverage for behavior changes.
- Error handling: fail gracefully around IPC/process boundaries; log structured context and do not swallow exceptions.

## Agent behavior expectations
- Make minimal, scoped changes; avoid broad refactors unless asked.
- Do not commit secrets or API keys in plaintext files.
- Prefer extending existing modules over parallel replacements.
- When adding tests, include single-file/single-test reproduction commands in PR notes.

---
Last updated: 2026-02-19
