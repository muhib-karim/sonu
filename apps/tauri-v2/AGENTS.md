# AGENTS.md (apps/tauri-v2)

> **Read the repository-root [`AGENTS.md`](../../AGENTS.md) first.** It holds the
> authoritative build/test/lint commands and code-style rules. This file only
> adds app-specific context.
>
> It previously documented `rdev` (not a dependency), `whisper-rs` as the core
> engine, and a Whisper-only first-run download. All three were wrong and are
> corrected below.

## What this app is

SONU is a cross-platform desktop speech-to-text application: a Tauri v2 Rust
backend with a React/TypeScript frontend.

## Development

```bash
bun install
bun run tauri dev      # full app
bun run dev            # frontend only (Vite)
bun run tauri build    # production bundle
```

**Required for local development** — the VAD model is not committed:

```bash
mkdir -p src-tauri/resources/models
curl -o src-tauri/resources/models/silero_vad_v4.onnx \
  https://blob.handy.computer/silero_vad_v4.onnx
```

**Toolchain notes**

- `bun` is the only supported package manager. Do not invoke `npm`.
- The `whisper` Cargo feature requires **libclang** at build time
  (`whisper-rs`/bindgen). Without LLVM installed, build with:

  ```bash
  cargo check --no-default-features --features parakeet,moonshine
  ```

  CI installs LLVM, so it builds the full feature set.

**`cargo test` crashes with exit `0xc0000020` on Windows.** The `ort` crate links
`DirectML` for its DML execution provider, and `ort-sys`'s build script emits
`cargo:rerun-if-changed` for `target/debug/DirectML.dll` and
`target/debug/deps/DirectML.dll`. Cargo creates those paths as **0-byte
placeholders**, and because Windows resolves a DLL next to the executable before
the real one, the test binary fails to load with no output at all.

The real DLL ships inside the `ort` download cache. To run the Rust tests:

```bash
REAL="$LOCALAPPDATA/ort.pyke.io/dfbin/x86_64-pc-windows-msvc/*/onnxruntime/lib/DirectML.dll"
cp -f $REAL src-tauri/target/debug/deps/DirectML.dll
cp -f $REAL src-tauri/target/debug/DirectML.dll
./target/debug/deps/sonu_app_lib-*.exe     # run the binary directly
```

Run the test binary directly rather than through `cargo test`: a rebuild rewrites
the 0-byte placeholder and the run fails again. If `target/` was hand-modified
during a build you may hit a rustc ICE writing metadata — delete
`target/debug/incremental` and rebuild with `CARGO_INCREMENTAL=0`.

## Backend layout (`src-tauri/src/`)

| Path             | Responsibility                                                                                                            |
| :--------------- | :------------------------------------------------------------------------------------------------------------------------ |
| `lib.rs`         | App entry: Tauri setup, tray, manager registration, command export                                                        |
| `managers/`      | Core business logic — `audio`, `transcription`, `model`, `history`, `cloud_transcription`, `offline_llm`                  |
| `audio_toolkit/` | Low-level audio: device enumeration, recording (`audio/recorder.rs`), resampling, Silero VAD, text correction (`text.rs`) |
| `commands/`      | Tauri command handlers exposed to the frontend                                                                            |
| `shortcut.rs`    | Global hotkey registration and dispatch                                                                                   |
| `actions.rs`     | What a hotkey actually does (transcribe / cancel / command mode)                                                          |
| `settings.rs`    | Settings persistence (tauri-plugin-store) + OS keychain for secrets                                                       |
| `overlay.rs`     | Floating recording overlay window                                                                                         |

## Speech engines

Engine selection is a Cargo feature: **Parakeet** (fast ONNX), **Whisper**
(multilingual GGML), **Moonshine** (ultra-light ONNX) — all via
[`transcribe-rs`](https://github.com/cjpais/transcribe-rs). Default features
enable all three. The catalog lives in `src-tauri/resources/models.json`.

## Architecture patterns

- **Manager pattern** — managers are constructed at startup and held in Tauri state.
- **Command/event** — frontend calls typed commands; the backend pushes progress via events.
- **Pipeline** — audio → VAD → resample → ASR → optional post-processing → paste + history.

## Locking and panics

Two rules that are easy to get wrong here:

1. **`panic = "abort"` is set for release builds.** A panic in _any_ thread kills
   the process. Do not add `unwrap()`/`expect()`/indexing that can panic in
   non-test code. Prefer `Result` propagation.
2. **The audio manager serialises its lifecycle transitions through one
   `lifecycle` mutex.** Its flag mutexes (`is_open`, `did_mute`, `is_recording`,
   `recorder`, `state`, `mode`) must never be held two-at-a-time — see the
   comment on `AudioRecordingManager` for why.

## Application flow

1. App starts hidden in the tray, loads settings, initialises managers.
2. First run downloads a model (unless cloud transcription is configured).
3. A global shortcut starts capture; VAD filters silence.
4. Audio goes to the local engine or a configured cloud provider.
5. Text is pasted into the active app and saved to history (SQLite + WAV).

## Frontend layout (`src/`)

| Path                         | Responsibility                                                        |
| :--------------------------- | :-------------------------------------------------------------------- |
| `App.tsx`                    | Section navigation and onboarding gate                                |
| `components/settings/`       | Settings panels, one per sidebar section                              |
| `components/model-selector/` | Model catalogue, downloads, extraction state                          |
| `stores/settingsStore.ts`    | Zustand store — the single source of truth for settings               |
| `hooks/useSettings.ts`       | Store accessor used by components                                     |
| `bindings.ts`                | **Generated.** Typed Tauri commands — never edit by hand              |
| `overlay/`                   | Separate React root for the recording overlay window                  |
| `i18n/`                      | i18next setup; translations in `i18n/locales/<lang>/translation.json` |

## Frontend rules

- Use `commands.*` from `@/bindings`. Do not call `invoke()` directly for new code.
- **Commands resolve errors, they do not throw.** A failed command returns
  `{ status: "error", error }`, so `try/catch` around `await commands.x()` will
  not fire. Use the `unwrapResult` helper from `@/lib/utils/result`.
- Route settings writes through the Zustand store (`updateSetting`,
  `updateBinding`) so navigation and other consumers stay in sync.
- Every new JSX string needs a translation key (`eslint-plugin-i18next` enforces this).

## Testing

```bash
bun run test          # Vitest
bun run test:e2e      # Playwright (manual; not run in CI)
bun run test:rust     # cargo test
```

Browser E2E is a manual pre-release step — it is deliberately **not** wired into
CI. The current specs are rendering smoke tests that do not exercise real IPC.
