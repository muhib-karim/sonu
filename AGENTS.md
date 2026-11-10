# AGENTS.md
Guidance for agentic coding assistants (Cursor, Copilot, Claude Code, OpenCode) in this repository.

## Scope and precedence
- **Primary app**: `apps/tauri-v2/` (Tauri v2: Rust + React/TypeScript) — the only app in this repository
- Conflict order:
  1. Direct user request
  2. Tool-specific rules (Cursor `.cursorrules`, etc.)
  3. This `AGENTS.md`

## Working directory defaults
- **Default to `apps/tauri-v2/`** for all implementation work
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
bun run test:coverage # same suite; fails below the floors in vite.config.ts
bun run test:e2e      # manual pre-release step; not run in CI
bun run test:rust

# Dependency audit (what the blocking CI job runs)
bun audit --audit-level=high
```

**Building the Rust backend without LLVM.** The `whisper` feature needs
libclang at build time (`whisper-rs`/bindgen). On a machine without LLVM, use:

```bash
cd apps/tauri-v2/src-tauri
cargo check --all-targets --no-default-features --features parakeet,moonshine
```

CI installs LLVM and builds the full default feature set.

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

**Windows: `cargo test` may fail with exit `0xc0000020` and no output.** `ort`'s
build script makes cargo create a 0-byte `DirectML.dll` in `target/debug/` and
`target/debug/deps/`, which shadows the real DLL and prevents the test binary
from loading. See [`apps/tauri-v2/AGENTS.md`](apps/tauri-v2/AGENTS.md) for the
workaround.

## CI / CD
- **CI** (`.github/workflows/ci.yml`): Runs on push/PR to main — lint, format, typecheck, Vitest with coverage floors, JS dependency audit (`bun audit`, blocking at high), panic ratchet, cargo fmt, cargo clippy (`-D warnings`), cargo audit (advisory).
- **Build** (`.github/workflows/build.yml`): Reusable workflow for multi-platform Tauri builds (6 targets)
- **Release** (`.github/workflows/release.yml`): Manual dispatch — creates draft release, builds all platforms, publishes
- **Dependencies**: Dependabot (`.github/dependabot.yml`) covers cargo, bun, and GitHub Actions.
- **Actions are SHA-pinned.** Every `uses:` in `.github/workflows/` references a
  full commit SHA with a `# vX.Y.Z` comment. Do not replace a SHA with a mutable
  tag; Dependabot updates the SHA and the comment together.

### Panic ratchet

`apps/tauri-v2/scripts/check-panic-ratchet.sh` counts `.unwrap()` / `.expect(`
in `src-tauri/src` and fails when the count rises above
`scripts/panic-baseline.txt`. It exists because `panic = "abort"` turns any
panic into a full-app abort.

It is a **ratchet, not a purity gate**: the ~107 existing sites (see the baseline file) are tolerated.
When you remove one, lower the baseline in the same commit so the gain sticks.
Run it locally with:

```bash
cd apps/tauri-v2 && bash scripts/check-panic-ratchet.sh
```

### Coverage ratchet

`bun run test:coverage` enforces the floors in `apps/tauri-v2/vite.config.ts`
(`test.coverage.thresholds`): one global set and a higher one for
`src/stores/settingsStore.ts`. Like the panic ratchet, they sit just under the
measured figure. When you add tests, raise them in the same commit; do not
lower them to make a change pass.

### JS dependency audit

The `JS Dependency Audit` job runs `bun audit --audit-level=high` and blocks.
It reads `bun.lock` against a live advisory database, so it can fail on a PR
that did not touch dependencies. To fix a transitive package without moving
direct dependencies: add a temporary top-level `overrides` entry in
`package.json` with the patched range, run `bun install`, remove the entry and
run `bun install` again. Only `bun.lock` should change. (`bun update <name>` on
bun 1.3.14 adds a transitive package as a new direct dependency instead.)

## Code style guidelines
### TypeScript/React (Tauri frontend)
- TS is strict (`"strict": true`).
- Use path aliases: `@/*` and `@/bindings`.
- Use Vitest + Testing Library for unit tests.
- Run Prettier (`bun run format`). Line endings are normalised to LF in the
  repository by `.gitattributes`; `.prettierrc` uses `endOfLine: "auto"` so a
  CRLF working tree on Windows still passes `format:check`.
- ESLint enforces `i18next/no-literal-string` in JSX — use translation keys.
- ESLint also enforces `@typescript-eslint/no-floating-promises` and
  `no-misused-promises` via type-aware linting (`projectService`). Do not leave a
  promise unawaited: a dropped settings write or IPC result loses its error. Use
  `void` only where fire-and-forget is genuinely intended, and prefer awaiting.
- Use typed `commands.*` from `@/bindings` — never raw `invoke()`.
- Prefer functional components and existing store/hook patterns.

**IPC results resolve, they do not throw.** Generated commands return
`{ status: "error", error }` for backend failures rather than rejecting, so a
`try/catch` around `await commands.x()` never fires. Unwrap with `unwrapResult`
from `@/lib/utils/result` when you need the failure path to run.

**Settings writes go through the store.** Use `updateSetting` / `updateBinding`
from `useSettings()` rather than calling the backend directly — other consumers
(navigation, sibling panels) read the same store and will otherwise go stale.

### Rust (Tauri backend)
- Use `cargo fmt` (edition 2021) and `cargo clippy`.
- Naming: `snake_case` functions, `PascalCase` types, `SCREAMING_SNAKE_CASE` constants.
- Prefer `Result<T, E>` and `?` propagation.
- Log failures with context (`log::error!`, `log::warn!`).

**`panic = "abort"` is set for release builds** (`src-tauri/Cargo.toml`). A panic
in *any* thread terminates the whole application, so `unwrap`/`expect`/panicking
indexing and slicing are not merely style issues. Avoid them in non-test code;
propagate errors instead. Watch for char-vs-byte index confusion when slicing
strings — the codebase handles user text in many scripts and emoji are common.

**Locking.** `AudioRecordingManager` serialises every microphone/recording
lifecycle transition through a single `lifecycle` mutex, and never holds two of
its flag mutexes at once. Preserve that invariant; see the comment on the struct
for the two inversions that used to deadlock it.

## Agent behavior expectations
- Make minimal, scoped changes; avoid broad refactors unless asked.
- Do not commit secrets or API keys.
- Prefer extending existing modules over parallel replacements.
- Use `--no-verify` on commits if pre-commit hooks block on pre-existing upstream warnings.

---
Last updated: 2026-09-11
