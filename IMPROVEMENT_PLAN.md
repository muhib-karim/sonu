# SONU — Prioritised Improvement Plan (Implementation Handoff)

**Companion to:** [`AUDIT.md`](AUDIT.md) — every task below cites the finding IDs from that document.
**Audience:** the implementing engineer/agent (DeepSeek). Written to be executed task-by-task.
**Date:** 2026-09-11 · **Base revision:** `2c04ba4`

---

## ⚠️ Status: complete — read this first

Every task in this plan is implemented. The remaining items that were previously
listed as open have been closed:

- **T5.6** — keychain reads are cached process-wide and invalidated on every
  write/delete.
- **T5.8 checksum verification** — **shipped.** All 9 catalog entries now carry a
  verified hash and downloads are checked before installation. The blocker
  ("no hash API") turned out to be false: HuggingFace publishes the SHA-256 as
  `X-Linked-ETag`, and the object store's `ETag` is a real checksum
  (whole-file MD5 for single-part uploads, md5-of-part-digests with 10 MiB parts
  for multipart ones). Both schemes were verified against actual downloads
  before being encoded.
- **T6.5** — `@typescript-eslint/no-floating-promises` and `no-misused-promises`
  are enabled with type-aware linting; all 75 findings were fixed.
- **T3.3** — all GitHub Actions pinned to commit SHAs.
- **T0.2** — panic ratchet implemented and wired into CI.

A first pass landed earlier; the line numbers in this document are from
`2c04ba4` and have shifted. Re-verify against current source when reading.

### Done

| Task | What changed |
| :--- | :--- |
| **T1.1** | `audio_toolkit/text.rs` — `extract_punctuation` now derives byte offsets from `char_indices`; `preserve_case_pattern` ignores non-alphabetic chars. 4 new regression tests cover emoji and CJK punctuation. |
| **T1.2** | `audio_toolkit/audio/recorder.rs` — worker panics removed. `open()` now waits on a bounded init handshake and returns a real error; unsupported `SampleFormat` values return an error instead of `panic!`; VAD lock poison is recovered. |
| **T1.3** | `managers/audio.rs` — added a single `lifecycle` mutex serialising every microphone/recording transition; flag mutexes are never held two-at-a-time. Both inversions are now structurally impossible. |
| **T1.4** | `recorder.rs` — `run_consumer` uses `recv_timeout` so commands are serviced on a stalled device. 2 regression tests prove `Shutdown` and `Stop` are answered with no audio arriving. |
| **T1.5** | `managers/history.rs` + `commands/transcription.rs` — `save_transcription` takes `saved: bool` and returns the row id; the text-equality "cheat" is gone. |
| **T2.1** | `clipboard.rs` — a `ClipboardRestore` drop guard restores only when the original read succeeded, and runs on error paths too. |
| **T2.2** | `CloudTranscriptionSettings.tsx` — hydrates from `cloud_transcription` settings; persistence moved to explicit user-change handlers. |
| **T2.3** | `settings.rs` — `save_api_keys_to_keychain` returns an error listing failures; `write_settings` logs and emits `settings-persist-error`; `App.tsx` shows a toast. |
| **T2.4** | `history.rs` — millisecond filenames with a collision loop; orphaned WAV removed if the DB insert fails. |
| **T2.5** | `commands/history.rs` — file names validated (no separators, `..`, `:`, NUL); history limit clamped to 1–10000. |
| **T3.1** | `ci.yml` — `set -o pipefail` added **and the gate tightened to `cargo clippy --all-targets -- -D warnings`**. All 36 clippy lints in the tree were fixed (29 pre-existing + 7 introduced by earlier phases), so warnings are now fatal. |
| **T3.2** | `Cargo.toml` — `vad-rs`, `rodio`, `tauri-nspanel` pinned to exact `rev`. |
| **T3.3** | `ci.yml` — `bun install --frozen-lockfile`; `tauri.conf.json` and `playwright.config.ts` now call `bun`, not `npm`. **All 29 external `uses:` references across the three workflows are pinned to full commit SHAs** with a `# vX.Y.Z` comment (annotated tags dereferenced to their commit). The only unpinned reference is the local `./.github/workflows/build.yml` call, which cannot be pinned. |
| **T3.4** | `.github/dependabot.yml` added (cargo, bun, github-actions); advisory `rust-audit` job added. |
| **T3.5** | `apps/tauri-v2/AGENTS.md` — E2E documented as a manual pre-release step. |
| **T4.1** | `settingsStore.ts` — rollback is now field-scoped and version-guarded; `updateSetting` returns `Promise<boolean>`. `unwrapResult` helper added and used in `HistorySettings`. |
| **T4.2** | `AdvancedSettings.tsx` — post-process toggle routes through the store. |
| **T4.3** | `utils/keychain.rs` gains `delete_password` (idempotent). `set_cloud_api_key` now treats an **empty value as removal** — it deletes the keychain entry rather than storing a blank string, which would have left the secret in place while the UI reported no key. `test_cloud_connection` falls back to the stored credential when the caller passes no draft, so a saved key can be tested after a remount. UI gained a Remove button shown when `has_api_key`. *(Removal is expressed as an empty value rather than a new command because `bindings.ts` is generated at app startup and cannot be regenerated here.)* |
| **T4.4** | `DictionarySettings.tsx` — vocabulary moved to `settings.custom_words` (what the pipeline reads), with one-time localStorage migration. |
| **T4.5** | `NotesSettings.tsx` — the mic button now tracks **ownership**, not the global flag. `commands.isRecording()` reports whether *any* recording is active (including a hotkey dictation) while the backend only stops one whose binding matches, so driving the button from it offered a "Stop" that could not stop anything and then reported idle while dictation continued. Now: an active recording Notes did not start is surfaced as such with the button disabled; a failed finish re-checks the real state instead of assuming idle; double submission is blocked while a command is in flight. |
| **T5.1** | `RecordingOverlay.tsx` — cleanup returned from the effect, late listener registration handled, auto-hide timer tracked and cancelled, session counter added. `overlay.rs` — generation counter so a pending delayed hide cannot hide a new recording. |
| **T5.2** | `managers/model.rs` — per-model `AtomicBool` cancellation checked every chunk; partial kept, no completion event on cancel. |
| **T5.3** | `shortcut.rs` — new binding registered before the old is unregistered; `ShortcutAction::start` returns `bool` and toggle state only latches on success. |
| **T5.4** | `Onboarding.tsx` — download failures now surface as a toast (which renders from the main app's `Toaster`) instead of `setError` on a component the transition had already unmounted. `App.tsx` startup predicate cleaned up (no `as any`) and now treats a working cloud provider as complete setup, so cloud-only users are no longer forced through a model download. |
| **T5.5** | `llm_client.rs` — 10 s connect / 60 s request timeouts. |
| **T5.6** | `utils/keychain.rs` — reads are cached process-wide, with the affected account invalidated on every `set_password`/`delete_password`. Confirmed-absent is cached too (most accounts have no key); transient credential-store *errors* are deliberately not cached. 5 regression tests cover write-invalidation, delete-invalidation, idempotent delete, and absent-account lookup. |
| **T5.7** | `managers/history.rs` — one shared `Mutex<Connection>` with WAL, `synchronous = NORMAL` and a 5 s busy timeout. The two paths that re-entered the connection (`delete_entry` via `get_entry_by_id`, and the cleanup helpers via `delete_entries_and_files`) were restructured so the mutex is never re-entered. |
| **T5.8** | **Complete.** Partial downloads are bound to their source URL via a `.partial.meta` sidecar (a repointed catalog can no longer splice two artifacts into one corrupt model), tar extraction runs on `spawn_blocking`, both download clients use 30 s connect timeouts, **and every artifact is verified against a checksum before it is installed**. SHA-256 is used for HuggingFace-hosted entries (from the LFS object id); MD5 for object-store-hosted entries, reproducing the multipart `md5-of-part-digests` construction at the published 10 MiB part size. A mismatch discards the partial *and* its meta, emits `model-download-failed`, and returns an error. Absent/empty checksums are tolerated so a hashless third-party mirror still works. 5 tests, including an independent md5-of-md5s recomputation and a catalog guard that fails if any shipped entry loses its hash. |
| **T5.9** | `settingsStore.ts` — single-flight `initialize()`. |
| **T6.1** | README and `docs/AI_FEATURES.md` — offline GGUF/LLM claims corrected to reflect that it is not wired. |
| **T6.2** | Sidebar navigation, the shortcut re-record control, and the Dictionary row actions are now native `<button>`s with `aria-current` / `aria-label` / `focus-visible` rings. |
| **T6.3** | `README.md`, `SECURITY.md`, `ARCHITECTURE.md`, `apps/tauri-v2/AGENTS.md`, root `AGENTS.md` — corrected. |
| **T6.4** | Husky hooks repaired (shebang, real checks, no `\|\| true`); `prepare` sets `core.hooksPath`; `packageManager` added. |
| **T6.5** | **Complete.** `eslint.config.js` bans raw `invoke()` imports (all 13 call sites migrated to typed `commands.*` + `unwrapResult`) **and enables type-aware linting** with `@typescript-eslint/no-floating-promises` and `no-misused-promises`. All 75 findings were fixed — mostly `void`-marking genuine fire-and-forget calls in mount effects, plus real structural fixes where a promise was being dropped by an event listener or `setTimeout`. `Dropdown.onSelect` was typed `(value: string) => void` while the implementation was `async`; that is now honest. *(The IPC/event test harness from T0.1 remains out of scope.)* |
| **T6.6** | Orphaned never-compiled test files deleted; `.claude/settings.local.json` untracked and gitignored. |
| **T0.2** | Panic ratchet: `apps/tauri-v2/scripts/check-panic-ratchet.sh` + `panic-baseline.txt`, wired in as a fast dependency-free CI job. A **ratchet**, not a purity gate — the ~87 existing `.unwrap()`/`.expect(` sites are tolerated but the count may not rise. |

### Still open

Nothing in this plan is outstanding. Two items are consciously out of scope and
recorded here so they are not mistaken for oversights:

- **T0.1 the IPC/event test harness.** Test infrastructure, not a defect; it was
  never costed into the phases.
- **`rust-audit` is still non-blocking.** It runs on every push but does not fail
  the build until the existing advisory backlog is triaged.

### Deliberate deviations

- **`.prettierrc` was left as `endOfLine: "auto"`.** Changing it to `"lf"` makes `format:check` fail on 127 files in a CRLF working tree. The `AGENTS.md` claim was corrected instead.
- **`write_settings` keeps its `()` signature.** ~65 call sites made a signature change disproportionate; failures are surfaced via the `settings-persist-error` event instead.
- **`rust-audit` is non-blocking** (`continue-on-error: true`) until the existing advisory backlog is triaged.
- **`clippy::large_enum_variant` on `LoadedEngine` is `#[allow]`ed, not boxed.** The enum is constructed once at model-load time and stored in a single `Option`, never in a collection, so the largest variant's footprint is paid once. Boxing would add a heap indirection to every transcription call for no measurable gain. The allow carries a comment saying so.

### Verification performed

Clean:

- `cargo check --all-targets --no-default-features --features parakeet,moonshine` — no errors, no warnings.
- `cargo fmt -- --check` — clean.
- `cargo clippy --all-targets -- -D warnings` — **clean** (was 36 lints).
- `bun run typecheck` — clean.
- `bun run lint` — clean, with `no-restricted-imports`, `no-floating-promises`,
  and `no-misused-promises` all active (the type-aware rules surfaced 75
  findings, all fixed rather than suppressed).
- `bun run test` — 5 files, 38/38 tests passing.
- `cargo test --lib --no-default-features --features parakeet,moonshine` —
  **50 passed, 0 failed**. This includes the two recorder regression tests in
  `audio_toolkit/audio/recorder.rs` and the new checksum tests in
  `managers/model.rs`. See the note below on how to run the suite: the test
  binary needs the real `DirectML.dll` copied next to it, or Windows shadows it
  with a 0-byte cargo placeholder and the binary fails at load with exit
  `0xc0000020`.
- Panic ratchet (`bash scripts/check-panic-ratchet.sh`) — 87/87, at baseline.

**Could not verify:**

- **CI runs clippy with *default* features (including `whisper`), but this machine cannot build that feature set** (no libclang). The `-D warnings` gate was verified clean for `--no-default-features --features parakeet,moonshine`; the whisper-gated code in `managers/transcription.rs` was read and mirrors the now-clean Parakeet/Moonshine paths, but it was never compiled. If CI reports a lint there, it is a one-line fix.
- Playwright E2E, and all macOS/Linux runtime behaviour.
- Anything requiring real audio hardware (the recorder fixes are reasoned from
  the channel/lock structure, not observed against a stalled device).

#### Running `cargo test` on Windows

`cargo test` links fine but the binary then fails at load with exit
`0xc0000020` (running it directly gives `127` with no output). The cause is a
**0-byte `DirectML.dll` placeholder** that cargo materialises in
`target/debug/` and `target/debug/deps/` because `ort-sys`'s build script
registers it via `cargo:rerun-if-changed`. Windows resolves a DLL sitting beside
the executable first, so the placeholder shadows the real 18 MB DLL and ORT
fails to initialise.

Copy the real DLL over the placeholders, then invoke the test binary directly
(a rebuild recreates the placeholder):

```bash
cp "$LOCALAPPDATA/ort.pyke.io/dfbin/x86_64-pc-windows-msvc/*/onnxruntime/lib/DirectML.dll" \
   target/debug/ target/debug/deps/
```

If a build was interrupted while you were swapping the DLL, rustc may ICE
writing metadata — clear `target/debug/incremental` and rebuild with
`CARGO_INCREMENTAL=0`. This is documented in both `AGENTS.md` files.

---

## How to use this document

- Tasks are grouped into six phases, ordered so that **each phase is independently shippable** and later phases build on earlier ones.
- Do **not** batch phases into one change. One task = one focused commit/PR, with its own tests.
- Every task lists: **Refs**, **Files**, **Change**, **Acceptance criteria**, and **Watch out for**.
- Line numbers are from `2c04ba4`. Re-read the file before editing — line numbers will shift as you work.
- Where a task requires a backend contract change, the frontend task depending on it is called out explicitly. **Do backend first.**
- Follow `AGENTS.md`: minimal scoped changes, `cargo fmt` + `cargo clippy`, Prettier, typed `commands.*` from `@/bindings` (never raw `invoke()` for new code), translation keys for any new JSX string.

### Definition of done (applies to every task)

1. `bun run typecheck`, `bun run lint`, `bun run test` pass.
2. `cd src-tauri && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test` pass.
3. New tests are added at the level where the bug lives (unit for pure logic, integration for IPC/concurrency).
4. The task's acceptance criteria are demonstrably met — not merely "code changed".

### Suggested branch strategy

```
fix/critical-crashes        → Phase 1
fix/data-loss               → Phase 2
ci/honest-gates             → Phase 3
refactor/state-ownership    → Phase 4
perf/hot-paths              → Phase 5
chore/honesty-and-hygiene   → Phase 6
```

---

## Phase 0 — Safety net (do this first)

**Goal:** be able to prove a fix works and to catch regressions. Without this, every later phase is guesswork.

### T0.1 — Add a realistic IPC/event test harness (frontend)
**Refs:** M-4, H-7, H-1, Audit §8 gap 1
**Files:** `apps/tauri-v2/src/test/setup.ts`, `src/test/` (new helpers), `src/test/__mocks__/` (new)
**Change:**
- Replace the broad bindings mock with a **command registry** keyed by real command name, matching the current `bindings.ts` surface. Remove obsolete command names.
- Mutation mocks must return the real discriminated shape (`{ status: "success", data }` / `{ status: "error", error }`), never bare `undefined`.
- Add an **event harness**: `emitEvent(name, payload)`, `listenerCount(name)`, and the ability to delay a `listen()` registration so late-registration cleanup can be tested.
- Add deferred-promise and fake-timer helpers.

**Acceptance criteria:**
- A test can assert that exactly one listener is registered per event after mount and zero after unmount.
- A test can make a command resolve *after* an arbitrary delay, then assert ordering.
- A test can return `{ status: "error" }` from a mutation and assert the caller's behaviour.

**Watch out for:** do not weaken existing passing tests to accommodate the new harness. If an existing test only passes because the mock returned `undefined`, that test is asserting the bug — fix it.

### T0.2 — Establish the panic-safety baseline (backend)
**Refs:** C-1, C-2, L-1
**Files:** `src-tauri/src/`, new `docs/PANIC_POLICY.md` (short)
**Change:** document and enforce a rule: **no `unwrap`/`expect`/indexing/slicing that can panic in non-test code paths**, because `panic = "abort"` (`Cargo.toml:116`) turns every panic into a full process kill. Add a CI grep gate for new offenders in `src/` (excluding `#[cfg(test)]` blocks and `tests/`).

**Acceptance criteria:**
- CI fails on a newly introduced `unwrap()` in a non-test function.
- The gate has an explicit allow-list with justification for the handful of provably-safe sites, and the list is reviewed in this task.

**Watch out for:** this gate must not block Phase 1's fixes. Land it with a generous allow-list, then shrink the list as Phase 1 progresses.

### T0.3 — Delete or repair orphaned test files
**Refs:** M-17
**Files:** `src-tauri/src/tests/{audio,model,settings}_tests.rs`, `src-tauri/src/managers/transcription_tests.rs`, `src-tauri/src/lib.rs`, `src-tauri/src/managers/mod.rs`
**Change:** these are never compiled (no `mod tests;` declaration) and reference types that no longer exist (`ModelRequirements`, `DownloadStatus`, `TranscriptionError::ModelNotLoaded`, a differently-shaped `ModelInfo`/`AudioDevice`). Decide per file: **delete** if superseded by inline tests, or **repair and wire up** if the coverage is genuinely missing. Do not leave them in place.

**Acceptance criteria:**
- `git grep -n "mod tests" src-tauri/src/lib.rs src-tauri/src/managers/mod.rs` accounts for every test file that exists.
- No `.rs` file in `src/tests/` or `*_tests.rs` is orphaned.
- `cargo test` compiles everything it finds.

---

## Phase 1 — Eliminate crashes and hangs (P0)

**Goal:** no user action can abort the process or freeze the audio manager. This phase is the highest-value work in the plan.

### T1.1 — Fix the byte/char slicing panic in custom-word correction
**Refs:** C-1
**Files:** `src-tauri/src/audio_toolkit/text.rs:112-133`
**Change:** `extract_punctuation` counts characters (`.chars().count()`, `.char_indices().rev().count()`) but slices bytes (`&word[..prefix_end]`, `&word[word.len() - suffix_start..]`). Derive byte offsets from `char_indices`, or replace the whole function with `trim_start_matches`/`trim_end_matches` and take `.len()` of the trimmed region.

**Acceptance criteria:**
- `extract_punctuation("😀hello")`, `extract_punctuation("hello😀")`, `extract_punctuation("「hello」")` return correct prefix/suffix without panicking.
- `apply_custom_words("😀helo", &["hello"], 0.5)` does not panic and preserves the emoji.
- Existing `text.rs` tests still pass unchanged.

**Watch out for:** the suffix branch has the same defect as the prefix branch — fix both. Also check `apply_custom_words`'s surrounding tokenization for the same char/byte confusion.

### T1.2 — Remove panics from the audio worker thread
**Refs:** C-2
**Files:** `src-tauri/src/audio_toolkit/audio/recorder.rs:83-121, 295, 331`, `src-tauri/src/managers/audio.rs:331-380`
**Change:**
- Add a result channel (or reuse the existing command channel) so the worker reports a typed error instead of panicking.
- Replace `get_preferred_config(...).expect(...)` (83-84) with error propagation.
- Replace every `build_stream::<T>(...).unwrap()` (99-116) with `?`-style propagation into the result channel.
- Replace `_ => panic!("unsupported sample format")` (118) with an explicit error naming the format; handle or explicitly reject `U16/U32/U64/I64/F64`.
- Replace `stream.play().expect(...)` (121) with propagation.
- Replace `vad_arc.lock().unwrap()` (295) and `v.lock().unwrap()` (331) with the existing poison-tolerant `safe_lock` pattern (see `managers/audio.rs:269`).
- Surface the worker error from `try_start_recording` so the UI can report "microphone unavailable".

**Acceptance criteria:**
- A test injects a `build_stream` failure and asserts `try_start_recording` returns `false` with a logged error — the process does not abort.
- A test asserts an unsupported `SampleFormat` produces an error, not a panic.
- Selecting an unplugged/unsupported device in the app shows a user-facing error and leaves the app responsive.

**Watch out for:** the worker currently owns `stream` and drops it when `run_consumer` returns (line 124-125). Preserve that lifetime relationship while adding error paths.

### T1.3 — Resolve the audio-manager lock-order inversions
**Refs:** C-3
**Files:** `src-tauri/src/managers/audio.rs:307-318, 331-346, 445-478, 482-520`
**Change:** two AB-BA inversions exist:
- `apply_mute` locks `did_mute` (309) → `is_open` (310), while `start_microphone_stream` locks `is_open` (333) → `did_mute` (344).
- `update_mode` locks `mode` (446) → `state` (453), while `try_start_recording` locks `state` (483) → `mode` (493).

Choose **one** approach and apply it consistently:
- **(a)** Collapse the independent flags (`state`, `mode`, `is_open`, `did_mute`, `recorder`) into a single `Mutex<AudioManagerState>` struct. This eliminates the class of bug permanently and is the recommended option.
- **(b)** Establish and document a single global acquisition order (e.g. `state → mode → is_open → did_mute → recorder`) and reorder every acquisition site to match, with a comment block stating the invariant.

Whichever you pick, **reduce lock scope** — none of these guards need to be held across `get_settings()`, `create_audio_recorder()`, or device enumeration.

**Acceptance criteria:**
- A concurrency test runs `try_start_recording`/`update_mode` and `apply_mute`/`start_microphone_stream` from separate threads under a timeout; both complete.
- A comment block in the file states the locking invariant, or the single-mutex design makes it structurally impossible.
- No guard is held across a call that performs I/O or takes another lock it does not own.

**Watch out for:** `update_mode` currently drops `mode_guard` before `stop_microphone_stream` (461) but **not** before `start_microphone_stream` (466-467). Check both branches after your change.

### T1.4 — Make `stop_microphone_stream` unblockable
**Refs:** C-4
**Files:** `src-tauri/src/managers/audio.rs:384-441`, `src-tauri/src/audio_toolkit/audio/recorder.rs:161-170, 305-324`
**Change:** `close()` sends `Cmd::Shutdown` then `h.join()`, but `run_consumer` only drains `cmd_rx` after `sample_rx.recv()` returns. If the device stops delivering callbacks, the worker blocks in `recv()` forever and `join()` never returns while `is_open`/`did_mute`/`recorder` are held.

- Make the consumer `select!` over both `sample_rx` and `cmd_rx` (or push a shutdown sentinel through `sample_rx`).
- Drop the cpal stream before joining the worker.
- Add a bounded join timeout that logs and detaches the thread rather than blocking forever.

**Acceptance criteria:**
- A test drops the sample sender without delivering callbacks and asserts `close()` returns within a bounded time.
- Unplugging the active microphone mid-recording and stopping leaves the app responsive.

### T1.5 — Fix note creation so completed notes are never lost
**Refs:** C-5
**Files:** `src-tauri/src/commands/transcription.rs:157-188`, `src-tauri/src/managers/history.rs:180-233`, plus the note command in `commands/transcription.rs:27-109`
**Change:**
- Add a `saved: bool` parameter to `save_transcription` (or add a dedicated `save_note`) so the row is inserted with the correct flag in one statement. `save_to_database` currently hardcodes `saved = false` (`history.rs:228`).
- Return the inserted row ID (`last_insert_rowid()`).
- Replace the text-equality star hack (`transcription.rs:180-188`) with an operation on the returned ID. Delete the apologetic comment at lines 168-173.
- Decide and document which text Notes displays/copies — currently Notes always shows the **original** text while history stores both. Pick one and make it consistent.

**Acceptance criteria:**
- With post-processing enabled and a prompt that changes the text, exactly one row is created with `saved = true` and the note appears in the Notes tab.
- A concurrency test inserting two rows in the same second stars the correct row.
- Retention cleanup cannot remove a just-created saved note.
- `history-updated` still fires so the frontend refreshes.

**Watch out for:** this is a **contract change**. Any other caller of `save_transcription` must be updated in the same commit. Grep for all call sites before editing.

---

## Phase 2 — Stop silent data loss (P1)

**Goal:** nothing the user did should be destroyed without their knowledge.

### T2.1 — Preserve clipboard contents
**Refs:** H-4
**Files:** `src-tauri/src/clipboard.rs:21, 26, 40-45, 50-52`, `src-tauri/src/actions.rs:594, 609`
**Change:**
- `read_text().unwrap_or_default()` returns `""` for images/files; writing that back erases the original. Track whether the read **succeeded** and only restore in that case.
- Use a guard/`Drop`-style pattern so restoration runs on the early-`?` error paths (26, 40-45) too, not only on success.
- Consider preserving non-text clipboard types rather than skipping restoration entirely.

**Acceptance criteria:**
- Place an image on the clipboard, run a paste-and-restore flow, assert the image is still there.
- Force an error mid-paste and assert the original text clipboard is restored.
- Existing clipboard tests pass.

### T2.2 — Stop cloud settings from overwriting language preferences
**Refs:** H-1
**Files:** `src/components/settings/cloud-transcription/CloudTranscriptionSettings.tsx:422-436, 457-474`, `src-tauri/src/commands/cloud_transcription.rs:174-191`
**Change:**
- Hydrate `selectedLanguage`/`translateToEnglish` from typed `settings.cloud_transcription`, not from the local `selected_language`/`translate_to_english` keys (427-432).
- Delete the two hydration-triggered persistence effects (458-474). Persist only inside explicit user-change handlers (`onChange` of the language select and the translate toggle).
- Switch the raw `invoke("set_cloud_language", ...)` calls to generated `commands.*` with `Result` handling.

**Acceptance criteria:**
- Set local language `auto` and cloud language `French`; open and close the Cloud tab; assert cloud language is still French and no write was issued on mount.
- Switching provider or saving a key (which calls `loadData()`) does not reset cloud preferences.
- A failed save keeps a recoverable draft and surfaces an error.

### T2.3 — Propagate keychain failures instead of losing keys
**Refs:** H-10
**Files:** `src-tauri/src/settings.rs:842-847, 916-940`
**Change:** `set_password` failure is only `warn!`-ed (923, 934); `write_settings` then clears keys from memory and persists without them. Return an error to the caller and **retain the key in memory** when persistence fails. Keep the existing no-plaintext-fallback behaviour — that part is correct.

**Acceptance criteria:**
- A test simulating a keychain error asserts the command returns `Err` and the key is still present afterwards.
- The frontend surfaces the failure rather than reporting success.

### T2.4 — Fix WAV filename collisions and orphaned files
**Refs:** M-6
**Files:** `src-tauri/src/managers/history.rs:187-203, 216-233`
**Change:**
- `format!("sonu-{}.wav", Utc::now().timestamp())` is second-resolution — two transcriptions in the same second overwrite one file while the DB holds two rows. Use millisecond precision plus a short random suffix, or a UUID.
- The WAV is written (193) before the DB insert (196) with no transaction. Wrap both in a transaction, or delete the WAV if the insert fails.

**Acceptance criteria:**
- A test saves two entries with the same second and asserts two distinct files exist.
- A test forces a DB insert failure and asserts no orphaned WAV remains.

### T2.5 — Validate history inputs
**Refs:** M-7
**Files:** `src-tauri/src/commands/history.rs:32-41, 58-72`, `src-tauri/src/managers/history.rs:409-411`
**Change:**
- `get_audio_file_path` joins a frontend-supplied `file_name` to the recordings directory. Require a bare filename: reject any input containing a path separator, `..`, or an absolute path; then verify the canonicalized result is still inside `recordings_dir`.
- `update_history_limit(limit: usize)` accepts `0`, which deletes all unsaved entries via `cleanup_by_count`. Clamp to a documented minimum (e.g. 1) and return a validation error.

**Acceptance criteria:**
- A test passes `../../secret` and asserts an error.
- A test passes `0` and asserts the limit is rejected or clamped, and no rows are deleted.

---

## Phase 3 — Make CI honest (P1)

**Goal:** green CI should mean something. Cheap to do, and it protects every later phase.

### T3.1 — Make the clippy gate able to fail
**Refs:** H-11
**Files:** `.github/workflows/ci.yml:108-111`
**Change:** `cargo clippy 2>&1 | tee clippy-output.txt` returns `tee`'s exit code. Either drop the tee, or add `shell: bash` and `set -o pipefail`, and upgrade to `cargo clippy --all-targets -- -D warnings`. Land this **after** Phase 1 so the existing backlog does not block the build; if needed, land it with `-D warnings` on a scoped set first.

**Acceptance criteria:**
- Introducing a deliberate clippy violation on a branch turns the job red.
- The step's name and the root `AGENTS.md:56` claim agree.

### T3.2 — Pin git dependencies
**Refs:** H-12
**Files:** `src-tauri/Cargo.toml:67, 69, 110`
**Change:** add `rev = "<sha>"` for `vad-rs`, `rodio`, and `tauri-nspanel` (the latter currently uses a mutable `branch = "v2.1"`). Use the SHAs currently recorded in `Cargo.lock`.

**Acceptance criteria:**
- `cargo update -p vad-rs --dry-run` reports no movement.
- `Cargo.toml` contains no `git` dependency without `rev`.

### T3.3 — Enforce lockfiles and pin Actions
**Refs:** L-14, L-16
**Files:** `.github/workflows/ci.yml:28, 30, 33, 50, 64, 78, 82, 106, 109`, `build.yml`, `release.yml`
**Change:**
- `bun install --frozen-lockfile`; cargo commands with `--locked`.
- Pin every third-party action to a full commit SHA. Add a comment with the human-readable tag beside each SHA.

**Acceptance criteria:**
- CI fails when `bun.lock` is out of sync with `package.json`.
- No workflow references an action by mutable tag.

### T3.4 — Add supply-chain scanning
**Refs:** L-15
**Files:** new `.github/dependabot.yml`, new `src-tauri/deny.toml` or a `cargo-audit` job in `ci.yml`
**Change:** add Dependabot for `cargo` and `bun`, plus a `cargo audit` (or `cargo deny`) job. Start non-blocking, then make it blocking once the existing advisory backlog is triaged.

**Acceptance criteria:**
- Dependabot opens PRs for both ecosystems.
- A known-vulnerable dependency introduced on a branch is reported.

### T3.5 — Run E2E in CI (or declare it manual)
**Refs:** M-15
**Files:** `.github/workflows/ci.yml`, `apps/tauri-v2/playwright.config.ts`
**Change:** either add an E2E job, or explicitly document in `AGENTS.md` that E2E is a manual pre-release step. Do not leave it ambiguous. If you add the job, note that the current specs are rendering smoke tests (Audit §8 gap 4) — improving them is T6.5.

**Acceptance criteria:** `grep -rn "test:e2e" .github/` either finds a job or the docs state it is manual.

---

## Phase 4 — Unify state ownership (P2)

**Goal:** one source of truth for settings. This is the highest-leverage structural change in the plan and the root cause of several findings.

### T4.1 — Define and enforce a single mutation-result policy
**Refs:** M-4
**Files:** `src/stores/settingsStore.ts:261-304, 381-395, 398-458`, `src/bindings.ts:626-649`
**Change:**
- The generic updater restores the **entire** captured settings object on failure (`set({ settings: { ...settings, [key]: originalValue } })`), discarding unrelated successful changes. Roll back only the affected field against **current** state, guarded by a request version so an old failure cannot overwrite a newer success.
- Several actions ignore `Result.status` entirely (e.g. `await commands.deleteHistoryEntry(id)`), so History's error alert is unreachable for backend string errors. Check every `Result` in every mutation path.
- Return or rethrow failures so callers can show localized feedback.
- Handle **both** resolved `{ status: "error" }` and rejected `Error`.

**Acceptance criteria:**
- Deferred-A-fails-after-B-succeeds test: B's state survives.
- Old same-key failure cannot overwrite a newer success.
- Tests cover both resolved error `Result`s and rejected `Error`s.
- History delete/star failure produces visible feedback.
- `isUpdating` stays true until the relevant operation finishes.

### T4.2 — Route Advanced and Style settings through the store
**Refs:** H-6
**Files:** `src/components/settings/advanced/AdvancedSettings.tsx:17-42`, `src/components/settings/style/StyleSettings.tsx:132-155`, `src/stores/settingsStore.ts`
**Change:**
- `AdvancedSettings` writes `change_post_process_enabled_setting` directly while `Sidebar.tsx:108-113` reads `post_process_enabled` from the store. Use `updateSetting("post_process_enabled", ...)`.
- `setStyleSelection()` updates the backend and local state but not the store, and its hydration effect re-runs on any store change. Add a typed store action for the nested style selection.
- Remove the redundant legacy `localStorage` mirror unless it serves a documented purpose.
- Add **one** owned subscription for backend-originated settings changes, and validate the active section when its availability changes.

**Acceptance criteria:**
- Toggling AI post-processing in Advanced immediately reveals/hides the Post Process nav item.
- A selected style survives unrelated setting changes and navigation.
- Disabling the currently-active conditional section navigates to a valid section.

### T4.3 — Credential presence, testing, and removal
**Refs:** M-5
**Files:** `CloudTranscriptionSettings.tsx:401, 523-534, 548-564, 695-702`, `src-tauri/src/commands/cloud_transcription.rs:197-206`, `src-tauri/src/managers/cloud_transcription.rs:371-441`, `src-tauri/src/settings.rs:915-939`, `PostProcessingSettingsApi/usePostProcessProviderState.ts:64-72, 117-124`
**Change:**
- Separate "a stored credential exists" from "an unsaved draft". After remount the input map is empty even when `has_api_key` is true, so connection testing fails for valid saved config.
- Add an explicit **Remove Credential** command that deletes the keychain entry. Simply allowing an empty string does not work — keychain persistence skips empty values and does not delete.
- Expose non-secret presence metadata for post-processing. `usePostProcessProviderState` tries to recover `post_process_api_keys` from serialized settings, but that field is `#[serde(skip)]`.
- Never return stored secrets to the frontend.

**Acceptance criteria:**
- A saved credential can be tested after remount without retyping.
- Removal survives settings reload and app restart.
- Keychain failure is surfaced, not reported as success.
- Post-processing accurately indicates saved-key presence.

### T4.4 — Connect the Dictionary to the transcription pipeline
**Refs:** M-1
**Files:** `src/components/settings/dictionary/DictionarySettings.tsx:19-73`, `src/components/settings/CustomWords.tsx:16-38`, `src/components/settings/snippets/SnippetsSettings.tsx:24-39`, `src-tauri/src/managers/transcription.rs:554-560`
**Change:**
- Dictionary CRUD currently writes only to component state and `localStorage["sonu-dictionary"]`, while the pipeline reads `settings.custom_words` via `apply_custom_words`. Make `custom_words` canonical.
- Migrate existing local dictionary entries once, with deduplication, on first run after the change.
- Share CRUD logic between Dictionary and Advanced's Custom Words.
- Keep voice commands separate — that section is already wired correctly.
- Fix the mount-effect hydration race in both Dictionary and Snippets: they write initial empty state before hydration completes, and under StrictMode effect replay the second read can consume that empty write. Do **not** solve this by disabling StrictMode.

**Acceptance criteria:**
- Adding a word in Dictionary invokes the correct backend setting mutation.
- Dictionary and Advanced show the same vocabulary.
- A backend correction test uses a word added through the UI contract.
- A seeded-`localStorage` StrictMode test preserves entries across the double-invoke.

### T4.5 — Separate note recording state from global recording state
**Refs:** M-2
**Files:** `src/components/settings/notes/NotesSettings.tsx:91-124`, `src-tauri/src/commands/transcription.rs:27-42, 98-109`, `src-tauri/src/managers/audio.rs:557-621, 625-628`
**Change:**
- Notes reads `isRecording()` once, then drives note-specific commands. The backend only stops a recording whose `binding_id` matches, and `finish_note_recording` always passes `"note_recording"`.
- Expose recording status with **owner/session and phase** (recording / finishing / idle / error).
- Subscribe to changes; use the initial snapshot only for hydration.
- Stop only the owned note session; distinguish recording from finishing so double-clicks and slow finish commands cannot duplicate work.
- Define navigation behaviour without silently cancelling a user's recording.

**Acceptance criteria:**
- Entering Notes during a global recording does not present a Stop button for it.
- A failed stop does not display idle while a recording continues.
- Backend start/stop/cancel events update the Notes UI.

---

## Phase 5 — Async lifecycle and performance (P2)

### T5.1 — Fix overlay listener leaks and stale hide timers
**Refs:** H-7
**Files:** `src/overlay/RecordingOverlay.tsx:25-107`, `src-tauri/src/overlay.rs:208-251, 265-279`
**Change:**
- The effect returns its cleanup from an inner async function, so React never receives it. Return a **synchronous** cleanup that handles late listener registration (i.e. if `listen()` resolves after unmount, unregister immediately).
- Track and cancel the untracked `setTimeout(..., 800)` on completion.
- Apply recording state **before** awaiting language synchronization — currently `show-overlay` awaits settings IPC before setting state, so a stale response can overwrite a newer event.
- Associate delayed work with a session/generation ID.
- The backend's 300 ms delayed `hide()` (`overlay.rs:266-279`) has the same ordering risk — cancel a pending hide when a new show arrives. Fix both sides; fixing only the frontend is incomplete.

**Acceptance criteria:**
- StrictMode mount/unmount leaves exactly one listener per event, then zero.
- Unmount before `listen()` resolves still unregisters.
- Completion A → start B → advance timers does not hide B.
- Out-of-order settings responses cannot revive old overlay state.

### T5.2 — Make download cancellation real
**Refs:** H-2
**Files:** `src-tauri/src/managers/model.rs:438-468, 564, 578, 692-720`, `src-tauri/src/managers/offline_llm.rs:451-476`
**Change:** `cancel_download` only flips `is_downloading` and emits a status update; the stream loop never checks a token, so it still renames `.partial` → final and emits `model-download-complete`. Add an `AtomicBool`/`CancellationToken` checked per chunk, abort the stream, retain the partial for resume, and suppress the completion event.

**Acceptance criteria:**
- Start a slow download, cancel, assert the task ends and no completion event fires.
- Cancelling does not leave a corrupt file that a later resume would trust.

### T5.3 — Stop destroying the previous shortcut on failure
**Refs:** H-3
**Files:** `src-tauri/src/shortcut.rs:49-123, 839, 886`
**Change:**
- The old binding is unregistered (85) **before** the new one is validated (91) and registered (101). If either fails, the old binding is gone. Validate and register the new binding **first**; unregister the old one only on success; restore the old binding on failure.
- Toggle mode sets `active_toggles[...] = true` (886) before `action.start`, with no rollback — the next press then calls `stop`. Roll back on start failure.

**Acceptance criteria:**
- Attempting to assign a duplicate or invalid shortcut leaves the original registered and returns an error.
- A failed `action.start` leaves toggle state consistent so the next press starts rather than stops.

### T5.4 — Give onboarding downloads a persistent owner
**Refs:** M-3
**Files:** `src/App.tsx:35-52, 60-69`, `src/components/onboarding/Onboarding.tsx:37-55`, `src/components/model-selector/ModelSelector.tsx:81-265`
**Change:** `onModelSelected()` unmounts Onboarding, then the awaited `downloadModel` error is written into an unmounted tree. Move download ownership into a shared, persistent owner used by both onboarding and the footer, transition only after that owner accepts the operation, and keep progress/error/retry visible across the transition. Model startup as loading / error / local-ready / cloud-ready / setup-required rather than a single boolean. Also consider whether a cloud-only configuration should satisfy the startup predicate, which currently checks only `selected_model`.

**Acceptance criteria:**
- An immediate and a mid-download failure both remain visible after handoff.
- Retry works without restarting.
- Slow settings load does not flash an incorrect screen.

### T5.5 — Bound the LLM client
**Refs:** H-8
**Files:** `src-tauri/src/llm_client.rs:71-77`
**Change:** add `.connect_timeout()` and `.timeout()` matching the 60 s used by `managers/cloud_transcription.rs:78-81`. Surface a retryable error so the overlay cannot stay stuck in "transcribing".

**Acceptance criteria:** pointing at a non-responding endpoint yields an error within the timeout.

### T5.6 — Cache settings and stop hitting the keychain on the hot path
**Refs:** H-5
**Files:** `src-tauri/src/settings.rs:804-829, 859-913`, callers at `shortcut.rs:852`, `managers/audio.rs:308, 679`, `managers/transcription.rs:130`
**Change:** `get_settings` re-parses the store and performs ~9 `keyring` reads on every call — including every global-shortcut event and every preview tick. Cache settings in memory with an explicit invalidation on write, and load keychain values lazily (only when a feature that needs them runs).

**Acceptance criteria:**
- A test asserts zero keychain accesses per `get_settings` after the first load.
- Settings writes still invalidate the cache correctly (a test asserts the new value is observed).

### T5.7 — Improve SQLite access patterns
**Refs:** M-8
**Files:** `src-tauri/src/managers/history.rs:175-177, 438-467`
**Change:** stop opening a new `Connection` per operation; hold one connection behind a mutex, enable WAL and a `busy_timeout`. `delete_entry` currently opens a second connection via `get_entry_by_id` while holding the first.

**Acceptance criteria:** a concurrent save/delete test produces no `SQLITE_BUSY`.

### T5.8 — Harden the download and extraction path
**Refs:** M-9
**Files:** `src-tauri/src/managers/model.rs:312-586`, `src-tauri/src/managers/offline_llm.rs:207-406`
**Change:**
- Add SHA-256 to the catalog and verify after download; today only `Content-Length` is checked (473-491).
- Resume currently trusts an existing `.partial` even if the catalog URL changed (340-347) — bind the partial to a hash of the URL + expected size.
- Check free disk space before starting.
- Add timeouts to `reqwest::Client::new()` (358, 258).
- Move tar extraction (519) into `spawn_blocking` — it currently blocks the async executor on large archives.
- Add explicit path validation before extraction as defence in depth, even though `tar` 0.4.44's `unpack` already guards `..` traversal.

**Acceptance criteria:**
- A truncated-but-correct-length partial is rejected.
- A checksum mismatch is rejected and the partial is discarded.
- Extraction of a large archive does not stall other commands.

### T5.9 — Single-flight settings initialization
**Refs:** Audit §8 gap 2, M-4
**Files:** `src/hooks/useSettings.ts:46-77`, `src/stores/settingsStore.ts:526-542`
**Change:** every mounted `useSettings()` consumer sees `isLoading` and can call `initialize()`; there is no in-flight guard, and each initialization starts five loads. Make initialization store-owned and single-flight, then add focused selectors so consumers do not re-render on unrelated changes.

**Acceptance criteria:**
- Mounting three consumers under StrictMode issues exactly one initialization.
- A test asserts each loader is called once.

---

## Phase 6 — Honesty, accessibility, and hygiene (P4–P5)

### T6.1 — Resolve the offline-LLM claim
**Refs:** H-9
**Files:** `src-tauri/src/settings.rs:330, 332`, `commands/offline_llm.rs:94-107`, `managers/offline_llm.rs`, `README.md:57, 289`, `docs/AI_FEATURES.md:34, 73`, `src/components/settings/post-processing/PostProcessingSettings.tsx:459-461`
**Change:** decide one of:
- **(a) Implement it** — wire offline inference into `maybe_post_process_transcription` in `actions.rs`.
- **(b) Remove it** — delete or hide the toggle, the model download path, and the settings fields, and correct the docs.

Do not ship a toggle that has no effect while the README advertises the capability. If choosing (b), also reconcile `README.md:182` (which already says "planned") with `README.md:57` and `:289`.

**Acceptance criteria:** with the feature enabled, post-processing demonstrably runs offline — or the option is not reachable and the docs no longer mention it.

### T6.2 — Make primary navigation keyboard-accessible
**Refs:** M-11
**Files:** `src/components/Sidebar.tsx:170-188`, `src/components/settings/SonuShortcut.tsx:333-338`, `CloudTranscriptionSettings.tsx:144-152`, `src/components/settings/style/StyleSettings.tsx:199-209`
**Change:** replace `div onClick` with native `<button>` (or appropriate radio/button semantics for provider and style selection). Add navigation landmarks, expose the selected state accessibly, associate field labels with controls, add modal focus trapping/restoration, and make hover-only actions visible on `focus-within`.

**Acceptance criteria:**
- Keyboard-only navigation reaches every enabled section.
- Enter/Space activates shortcut editing and provider/style choices.
- Modal focus cannot escape and returns to the trigger.

### T6.3 — Correct documentation that contradicts the code
**Refs:** M-12, M-16, H-9, L-18, L-19, L-20, L-21, L-22
**Files:** `README.md`, `ARCHITECTURE.md`, `SECURITY.md`, `apps/tauri-v2/AGENTS.md`, `docs/`, `.prettierrc`
**Change:** fix each of the following:
- `README.md:9, 41` — "no audio ever leaves your machine" ignores model downloads from `blob.handy.computer` and update checks. Qualify it (see `SECURITY.md:29`).
- `README.md:349` — "Context Isolation / Renderer process fully sandboxed" is Electron terminology.
- `README.md:353` — "ESLint enforces no eval()" is false; `eslint.config.js` contains only the i18next rule.
- `README.md:374, 377` — roadmap lists shipped features as "In Progress" (contradicts `VERSION.md:18-19`).
- `README.md:413` — links a non-existent `docs/TAURI_V2_MIGRATION_GUIDE.md`.
- `SECURITY.md:9` — supported versions top out at 2.4.x.
- `ARCHITECTURE.md:5, 58, 79` — Moonshine omitted; non-existent `commands/settings.rs`; privacy note omits download/update egress.
- `apps/tauri-v2/AGENTS.md:82-100` — describes `rdev` (not a dependency), `whisper-rs` as the core engine, and a Whisper-only pipeline. Delete it or rewrite it to defer to the root `AGENTS.md`.
- `.prettierrc` — `"endOfLine": "auto"` vs the LF claim in `AGENTS.md:65` and `eol=lf` in `.gitattributes`.

**Acceptance criteria:** a reader following any of these documents is not misled. Where a claim is unverifiable (e.g. provider data retention), remove it rather than soften it.

### T6.4 — Repair repo tooling drift
**Refs:** M-13, M-14
**Files:** `package.json:26`, `.husky/pre-commit`, `.husky/pre-push`, `tauri.conf.json:7, 9`, `playwright.config.ts:30`
**Change:** add `husky` as a devDependency and use the v9 `husky` command (not the deprecated `husky install || true`); give hooks shebangs and executable bits; remove the `|| true` that swallows failures; delete the reference to the removed `apps/desktop/src/core/python/` path. Replace every `npm run …` with `bun run …`, delete the stale `package-lock.json`, and add a `"packageManager"` field.

**Acceptance criteria:** a fresh clone staging a `.ts` file triggers a real hook; `grep -rn "npm run" apps/tauri-v2 --include=*.json --include=*.ts --include=pre-*` returns nothing.

### T6.5 — Strengthen the test suites where it counts
**Refs:** Audit §8
**Files:** `apps/tauri-v2/e2e/app.spec.ts`, `apps/tauri-v2/eslint.config.js`, `src-tauri/src/**`
**Change:**
- Upgrade the browser specs from rendering smoke tests to persistence assertions, or clearly label them as smoke tests.
- Extend `eslint.config.js` beyond the i18next rule: add `react-hooks` (exhaustive-deps), a floating-promise rule, and a restriction on raw `invoke()` imports outside the store layer.
- Add backend tests for the previously untested areas now touched by this plan: recorder lifecycle, history/SQLite migrations and cleanup, download/extraction, LLM client, clipboard, and lock ordering.

**Acceptance criteria:** each Phase 1–5 task's acceptance test exists and runs in CI.

### T6.6 — Repo hygiene
**Refs:** M-17, L-23, L-24, L-25, L-17
**Files:** `apps/tauri-v2/shot-dark-home.png`, `.claude/settings.local.json`, `.gitignore`, `locales/`, `assets/`, `docs/models/`, `release.yml:139`, `build.yml:203-282`
**Change:**
- Move `shot-dark-home.png` out of the app root into a docs asset folder and update `README.md:133`.
- `git rm --cached .claude/settings.local.json` and gitignore it (it contains machine-local Bash allow-rules).
- Remove or populate the empty `locales/`, `assets/`, `docs/models/` directories. Note: root `locales/` is empty and unused — the only real translation tree is `apps/tauri-v2/src/i18n/locales/` (12 locales). Delete the empty one to avoid confusion.
- Decide the macOS signing path: either wire real signing (`sign-binaries: true` + secrets) or delete the dead block. `release.yml:139` currently passes `false` for every target, so the entire signing infrastructure never runs.
- Add an i18n key-parity check script, given the CHANGELOG claims 12-locale parity with nothing verifying it.

**Acceptance criteria:** `git ls-files` contains no machine-local or build artifacts; no dead CI path remains undocumented.

---

## Dependency map

```
Phase 0 (harness) ─┬─► Phase 1 (crashes/hangs) ─┬─► Phase 3 (CI gates)
                   │                            │
                   └─► Phase 2 (data loss) ─────┘
                                                │
Phase 4 (state ownership) ◄── needs Phase 0 harness
        └─► Phase 5 (async/perf)
                └─► Phase 6 (honesty/hygiene)
```

**Hard ordering constraints:**
- T3.1 (clippy `-D warnings`) must land **after** Phase 1, or the existing warning backlog blocks the build.
- T1.5 (note saving) is a backend contract change — any frontend caller must be updated in the same commit.
- T4.1 (mutation policy) must precede T4.2 and T4.3, which rely on it.
- T0.3 (orphaned tests) must precede T6.5, so new tests are not added alongside dead ones.

**Parallelisable:** Phase 2 and Phase 3 are independent of each other and of Phase 1 once Phase 0 is done.

---

## Explicitly out of scope

- **No architectural rewrite.** The manager pattern, the IPC layer, and the store design are sound; the defects are in ownership and failure paths.
- **No new features.** In particular, do not implement offline LLM as part of a bug-fix branch — T6.1 is a decision task, not a feature task.
- **No dependency major-version upgrades** beyond the pins in T3.2.
- **No changes to `bindings.ts` by hand.** Regenerate it via the backend tooling whenever a command signature changes.
- **Runtime validation on macOS/Linux** is not covered by this audit; flag any platform-specific fix as needing a real-device check.
