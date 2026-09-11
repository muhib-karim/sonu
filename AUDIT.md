# SONU — Comprehensive Codebase Audit

**Date:** 2026-09-11
**Revision audited:** `2c04ba4` (`main`, clean working tree)
**Scope:** `apps/tauri-v2` — Rust/Tauri v2 backend (~12,100 LOC across 51 `.rs` files) + React/TypeScript frontend, plus repo-level tooling, CI/CD, dependencies, and documentation.
**Method:** Static source analysis with call-chain tracing across the IPC boundary. Findings were cross-checked against generated bindings (`src/bindings.ts`) and Rust handlers. Where a claim could not be reproduced by reading code, it is explicitly labelled **[risk]** rather than stated as a defect. Verification status for every Critical/High finding is recorded in [Appendix A](#appendix-a--verification-status).

**No application code was modified to produce this audit.**

---

## 1. Executive summary

SONU is a well-scoped, genuinely useful application with a solid foundation: typed IPC via `tauri-specta`, secrets held in the OS keychain and never serialized to the frontend, a real retention policy, and a download pipeline that handles range-requests and atomic installs. The architecture described in `ARCHITECTURE.md` broadly matches the code.

The problems are not architectural — they are **ownership and failure-path** problems:

1. **Several code paths abort the entire process.** The release profile sets `panic = "abort"` (`Cargo.toml:116`), so every `unwrap()`/`expect()`/slice-panic in shipped builds is a hard crash, not a recoverable error. Two of these are reachable from ordinary user input (a custom dictionary word, a non-standard microphone).
2. **Two lock-order inversions can deadlock the audio manager**, freezing recording with no recovery.
3. **A silently broken feature**: note recordings are never starred when AI post-processing is active, so completed notes disappear from the Notes tab. The source comment at `commands/transcription.rs:168-173` openly describes the shortcut taken.
4. **State is owned in two places.** Some settings live in Zustand, others are written directly to the backend from component-local state. The two copies drift, producing stale navigation, reverted style selections, and cloud language preferences overwritten by unrelated local settings.
5. **CI reports green while enforcing less than it claims.** The clippy step pipes through `tee` without `pipefail`, so it can never fail.

Nothing here requires a rewrite. The highest-value work is: eliminate the panic/hang class, make mutations and async lifecycles explicit, and make CI honest. Estimated as five focused phases in [`IMPROVEMENT_PLAN.md`](IMPROVEMENT_PLAN.md).

### Severity distribution

| Severity | Count | Character |
| :--- | :--- | :--- |
| **Critical** | 5 | Process abort, deadlock, or silent data loss |
| **High** | 12 | Data loss, broken features, security/supply-chain, misleading CI |
| **Medium** | 17 | Correctness bugs, resource leaks, accessibility, UX truthfulness |
| **Low** | 22 | Hardening, hygiene, documentation drift |

---

## 2. System overview

```
┌──────────────────────────────────────────────────────────────┐
│ Main webview (React 18 + StrictMode)                         │
│   App.tsx ── section switch (no router) ── Settings panels   │
│     ├─ Zustand settingsStore ──► typed commands.* ──┐        │
│     └─ component-local state ──► raw invoke() ──────┤        │
│                                                        │      │
│ Overlay webview (separate React root)                  │      │
│   RecordingOverlay ── Rust events ──► window hide/show │      │
├────────────────────────────────────────────────────────┼──────┤
│ Rust backend (Tauri v2)                                ▼      │
│   shortcut.rs ──► actions.rs ──► managers/audio.rs            │
│                        │              └─ audio_toolkit/ (CPAL,│
│                        │                 VAD, resample)       │
│                        ├──► managers/transcription.rs         │
│                        │      └─ transcribe-rs (Parakeet /    │
│                        │         Whisper / Moonshine)         │
│                        ├──► llm_client.rs (cloud post-process)│
│                        ├──► managers/cloud_transcription.rs   │
│                        ├──► clipboard.rs / input.rs (enigo)   │
│                        └──► managers/history.rs (SQLite + WAV)│
│   settings.rs ◄──► tauri-plugin-store + OS keychain           │
└──────────────────────────────────────────────────────────────┘
```

**Key observation:** two independent settings-mutation paths converge on the same backend store — a typed Zustand path and a raw `invoke()` path used by several components. This split is the root cause of findings H-1, H-6, M-4, and M-5.

---

## 3. Critical findings

### C-1 — Panic on non-ASCII punctuation in custom-word correction
**File:** `apps/tauri-v2/src-tauri/src/audio_toolkit/text.rs:112-133` · **Verified**

`extract_punctuation` counts **characters** but indexes **bytes**:

```rust
let prefix_end = word.chars().take_while(|c| !c.is_alphabetic()).count(); // 113 — char count
...
let prefix = if prefix_end > 0 { &word[..prefix_end] } else { "" };      // 121 — byte index
let suffix = if suffix_start > 0 { &word[word.len() - suffix_start..] }  // 127 — byte index
```

For `"😀helo"`, `prefix_end == 1`, so `&word[..1]` splits a 4-byte emoji → `byte index 1 is not a char boundary`. The same happens for any trailing multi-byte non-alphabetic character (CJK punctuation, emoji).

**Trigger:** a user has custom dictionary words configured and a fuzzy match is attempted on a token carrying an emoji or CJK punctuation. `trim_matches` strips the emoji, the match succeeds, and the slice panics.
**Impact:** process abort (`panic = "abort"`), losing any in-flight recording.
**Fix:** derive byte offsets from `char_indices`, or use `trim_start_matches`/`trim_end_matches` and take `.len()`.
**Test:** assert `extract_punctuation("😀hello")` and `apply_custom_words("😀helo", &["hello"], 0.5)` do not panic.

### C-2 — Panics inside the audio worker thread abort the process
**File:** `apps/tauri-v2/src-tauri/src/audio_toolkit/audio/recorder.rs:83-121` · **Verified**

```rust
let config = AudioRecorder::get_preferred_config(&thread_device)
    .expect("failed to fetch preferred config");          // 83-84
...
AudioRecorder::build_stream::<i16>(...).unwrap()          // 106-108 (and 99-116)
_ => panic!("unsupported sample format"),                 // 118
stream.play().expect("failed to start stream");           // 121
```

`cpal::SampleFormat` includes `U16`, `U32`, `U64`, `I64`, `F64`, none of which are matched — they fall through to `panic!`. Because `panic = "abort"`, this kills the whole application rather than failing the recording.

**Trigger:** a microphone reporting an unsupported format, a device unplugged between enumeration and stream build, an exclusive-mode/WASAPI conflict, or a device that fails to start.
**Impact:** hard crash on a routine hardware event.
**Fix:** return the error from the worker over the existing command/result channel and surface it from `try_start_recording`; replace the wildcard `panic!` with a descriptive error; the `vad_arc.lock().unwrap()` (line 295) and `v.lock().unwrap()` (line 331) should use the existing poison-tolerant `safe_lock` pattern.
**Test:** unit-test the `get_preferred_config` fallback and an injected `build_stream` failure.

### C-3 — Lock-order inversion deadlocks `AudioRecordingManager`
**File:** `apps/tauri-v2/src-tauri/src/managers/audio.rs` · **Verified**

Two independent AB-BA inversions:

| Path A | Path B |
| :--- | :--- |
| `apply_mute` locks `did_mute` (309) → `is_open` (310) | `start_microphone_stream` locks `is_open` (333) → `did_mute` (344) |
| `update_mode` locks `mode` (446) → `state` (453) | `try_start_recording` locks `state` (483) → `mode` (493) |

Both sides hold the first guard across the second acquisition, and the two sides run on different threads (Tauri command handler vs. global-shortcut handler / audio-feedback thread).

**Trigger:** change microphone mode or device in Settings while a global shortcut starts recording; or toggle always-on mic mid-start.
**Impact:** permanent deadlock of the audio manager — recording stops responding, only a process restart recovers.
**Fix:** enforce a single documented acquisition order across the manager (e.g. `state → mode → is_open → did_mute → recorder`) or collapse these flags into one struct behind one mutex. Add a comment block stating the invariant.
**Test:** concurrently call `try_start_recording`/`update_mode` and `apply_mute`/`start_microphone_stream` under a timeout; assert both complete.

### C-4 — `stop_microphone_stream` can block forever
**Files:** `apps/tauri-v2/src-tauri/src/managers/audio.rs:384-441`, `audio_toolkit/audio/recorder.rs:161-170,305-324` · **High confidence**

`close()` sends `Cmd::Shutdown` and then calls `h.join()`. But `run_consumer` only drains `cmd_rx` **after** `sample_rx.recv()` returns. If the device stops delivering callbacks — unplugged, muted at the OS level, or a stalled stream — the worker blocks in `recv()` indefinitely, so `join()` never returns while `is_open`, `did_mute`, and `recorder` are all still held.

**Trigger:** unplug or stall the active microphone while a recording is in progress and then stop it.
**Impact:** application freeze; the audio manager is permanently wedged.
**Fix:** make the consumer `select!` over both channels (or push a shutdown sentinel through `sample_rx`), drop the cpal stream before joining, and add a bounded join timeout that logs and detaches.
**Test:** drop the sample sender without delivering callbacks and assert `close()` returns.

### C-5 — Note recordings are silently lost when AI post-processing is active
**Files:** `apps/tauri-v2/src-tauri/src/commands/transcription.rs:157-188`, `managers/history.rs:216-233` · **Verified**

`save_transcription` always inserts with `saved = false` (`history.rs:228`). The command then tries to star the row by matching text:

```rust
if let Some(latest) = entries.first() {
    if latest.transcription_text == final_text {   // 181
        history_manager.toggle_saved_status(latest.id).await?;
    }
}
```

`transcription_text` holds the **raw** transcription; `final_text` holds the **post-processed** text. When post-processing changes anything, the comparison fails and the row is never starred. The Notes tab filters on `entry.saved`, so the note never appears. The pre-existing comment at lines 168-173 documents the shortcut:

> `// For now, let's just cheat and assume it's the latest one`

Secondary risks in the same block: identifying the row by "latest by timestamp" is racy under concurrent inserts, and an unstarred row is eligible for the unsaved-retention cleanup, so the audio can also be deleted.

**Trigger:** record a note with AI post-processing enabled and a prompt that changes wording or punctuation.
**Impact:** the recording completes, the UI reports success, and the note is absent from Notes.
**Fix:** add a `saved: bool` parameter (or a dedicated `save_note`) to `save_transcription`, return the inserted row ID, and star by ID — never by text equality or position.
**Test:** with post-processing on, assert exactly one row is created with `saved == true`; assert retention cleanup cannot remove it.

---

## 4. High findings

### H-1 — Cloud language preferences are overwritten on mount
**File:** `apps/tauri-v2/src/components/settings/cloud-transcription/CloudTranscriptionSettings.tsx:422-436, 457-474` · **Verified**

The component hydrates language state from **local** settings (`selected_language`, `translate_to_english` at 427-432), then persists those same values into **cloud** settings via `set_cloud_language` / `set_cloud_translate_to_english` in two effects (458-474). Because the effects run on hydration, simply opening the Cloud tab writes local values over the stored cloud values.

**Trigger:** local language is `auto`, cloud language is French; open the Cloud tab while cloud transcription is enabled.
**Impact:** cloud transcription silently changes language/translation behaviour. `loadData()` is also called after saving a key or switching provider, so this repeats.
**Fix:** hydrate from the typed `cloud_transcription` settings; move persistence into explicit user-change handlers; use generated commands with `Result` handling.

### H-2 — "Cancel download" is a no-op
**Files:** `apps/tauri-v2/src-tauri/src/managers/model.rs:692-720`, `managers/offline_llm.rs:451-476` · **High confidence**

`cancel_download` only flips an `is_downloading` flag and emits a status update. There is no cancellation token consulted in the streaming loop (438-468), so the in-flight future keeps downloading, still renames `.partial` → final (564), and still emits `model-download-complete` (578).

**Trigger:** start a multi-GB model download and press Cancel.
**Impact:** the UI claims cancellation while the file later appears; races with delete; wasted bandwidth.
**Fix:** an `AtomicBool`/`CancellationToken` checked per chunk; abort the stream and retain the partial for resume.
**Test:** start a slow download, cancel, assert the task ends and no completion event fires.

### H-3 — Changing a shortcut can permanently destroy the old binding
**File:** `apps/tauri-v2/src-tauri/src/shortcut.rs:49-123` · **High confidence**

The previous binding is unregistered (85) **before** the new one is validated (91) and registered (101). If validation fails, or registration fails (e.g. the duplicate check at 839), the function returns without restoring the old binding. Related: toggle mode sets `active_toggles[...] = true` (886) before `action.start`, with no rollback if start fails — the next press then calls `stop`.

**Trigger:** attempt to assign an already-registered or invalid shortcut.
**Impact:** the user loses a working hotkey with no error recovery.
**Fix:** validate and register the new binding first; unregister the old one only on success; roll back toggle state when start fails.

### H-4 — Clipboard contents are destroyed for non-text data
**Files:** `apps/tauri-v2/src-tauri/src/clipboard.rs:21, 50-52`, `actions.rs:594, 609` · **High confidence**

`clipboard.read_text().unwrap_or_default()` returns `""` when the clipboard holds an image or file list. After pasting, the code writes that `""` back, erasing the user's original clipboard. Early `?` returns (`clipboard.rs:26, 40-45`) also leave the transcription on the clipboard un-restored.

**Trigger:** copy an image, then trigger a dictation that pastes and restores.
**Impact:** silent loss of clipboard contents — a data-loss bug outside the app's own data.
**Fix:** record whether the original read succeeded; restore only in that case; use a guard so restoration runs on the error path too.

### H-5 — `get_settings` hits the OS keychain on every call
**File:** `apps/tauri-v2/src-tauri/src/settings.rs:804-829, 859-913` · **High confidence**

Each `get_settings` re-parses the store, runs `ensure_post_process_defaults`, and calls `load_api_keys_from_keychain`, which performs ~9 `keyring` reads. It is invoked on every global-shortcut event (`shortcut.rs:852`), every preview tick (`audio.rs:679`), mute (`audio.rs:308`), the idle watcher (`transcription.rs:130`), tray updates, and overlay show.

**Impact:** avoidable latency and permission-prompt risk on macOS in the recording hot path.
**Fix:** cache settings in memory; refresh the keychain only when keys change; load keys lazily.
**Test:** assert zero keychain accesses per `get_settings` after the first load.

### H-6 — Settings written outside Zustand leave navigation and controls stale
**Files:** `apps/tauri-v2/src/components/settings/advanced/AdvancedSettings.tsx:17-42`, `components/Sidebar.tsx:108-113, 148-152`, `components/settings/style/StyleSettings.tsx:132-155` · **High confidence**

`AdvancedSettings` keeps a local `llmEnabled` value and writes `change_post_process_enabled_setting` directly, while `Sidebar` derives the Post Process nav item's visibility from the Zustand store (`post_process_enabled`). There is no `settings-changed` subscription reconciling backend-originated writes. `StyleSettings` has the same split: `setStyleSelection()` updates the backend and local state but not the store, and its hydration effect re-runs on any store change.

**Trigger:** enable AI post-processing in Advanced after init; or select a style and then toggle Context-Aware Dictation.
**Impact:** the Post Process nav item can stay hidden despite the backend being enabled; a newly selected style can visually revert to a stale value.
**Fix:** route both through canonical store actions; add one owned subscription for backend-originated changes; validate the active section when its availability changes.

### H-7 — Overlay listeners are never cleaned up, and stale timers hide new recordings
**Files:** `apps/tauri-v2/src/overlay/RecordingOverlay.tsx:25-107`, `src-tauri/src/overlay.rs:266-279` · **High confidence**

The effect returns its cleanup from the inner async function rather than from the effect itself, so React never receives it:

```ts
const setupEventListeners = async () => { /* ... */ return () => { unlistenShow(); /* ... */ }; };
setupEventListeners();   // return value discarded
```

The completion path also creates an untracked `setTimeout(..., 800)` that hides the native window. The backend has a parallel 300 ms delayed hide in `overlay.rs:266-279`.

**Trigger:** StrictMode effect replay duplicates listeners; starting recording B within 800 ms of A completing lets A's timer hide B's overlay; a slow settings IPC in `show-overlay` can overwrite newer state.
**Fix:** return a synchronous cleanup that handles late listener registration; track and cancel timers; apply recording state before awaiting language sync; tag delayed work with a session/generation; guard the native hide on both sides.
**Test:** completion A → start B → advance timers → assert B remains visible.

### H-8 — LLM client has no timeout
**File:** `apps/tauri-v2/src-tauri/src/llm_client.rs:71-77` · **High confidence**

```rust
reqwest::Client::builder().default_headers(headers).build()
```

No `.timeout()` or `.connect_timeout()`, in contrast to `managers/cloud_transcription.rs:78-81` which sets 60 s. A stalled endpoint hangs `send_chat_completion`/`fetch_models` indefinitely and the overlay stays in "transcribing".
**Fix:** add bounded connect/request timeouts and surface a retryable error.

### H-9 — Offline LLM is advertised but not implemented
**Files:** `src-tauri/src/settings.rs:330, 332`, `commands/offline_llm.rs:94-107`, `managers/offline_llm.rs`; docs `README.md:57, 289`, `docs/AI_FEATURES.md:34, 73` · **Verified**

`offline_post_process_enabled` and `offline_llm_model` are read and written by the settings/commands layer only. The transcription pipeline (`actions.rs::maybe_post_process_transcription`) never consults them, and `OfflineLLMManager` exposes no inference method. `llm_client.rs` has no offline branch. The frontend already concedes this at `PostProcessingSettings.tsx:459-461` ("The offline LLM path is not wired yet"). Meanwhile `README.md:182` marks it "🚧 planned" while `README.md:57` and `:289` present it as available.

**Impact:** users download multi-GB models for a feature that does nothing; documentation contradicts itself.
**Fix:** either implement offline inference in the pipeline or remove/hide the feature and correct the docs. Do not ship a toggle with no effect.

### H-10 — Silent API-key loss on keychain failure
**File:** `src-tauri/src/settings.rs:916-940, 842-847` · **High confidence**

On `set_password` failure the code only logs a warning (923, 934). `write_settings` then clears keys from memory (842-847) and persists settings without them. The user believes the key was saved; it is gone. (There is correctly **no** plaintext fallback — that part is good.)
**Fix:** propagate the keychain error to the command and retain the key on failure.
**Test:** simulate a keychain error and assert the command returns `Err` and the key is retained.

### H-11 — CI's clippy step can never fail the build
**File:** `.github/workflows/ci.yml:108-111` · **Verified**

```yaml
run: cargo clippy 2>&1 | tee clippy-output.txt
```

Without `set -o pipefail`, the step's exit status is `tee`'s — always 0. The comment even notes "not using `-D warnings`". Root `AGENTS.md:56` claims CI runs "cargo fmt/clippy" as a gate. It does not.
**Impact:** false-green CI; lint regressions accumulate invisibly.
**Fix:** `cargo clippy --all-targets -- -D warnings` with `shell: bash` + `set -o pipefail` if output is captured.

### H-12 — Git dependencies track mutable refs
**File:** `apps/tauri-v2/src-tauri/Cargo.toml:67, 69` · **Verified**

```toml
vad-rs = { git = "https://github.com/cjpais/vad-rs", default-features = false }
rodio  = { git = "https://github.com/cjpais/rodio.git" }
```

Neither pins `rev`, `tag`, or `branch`, so they resolve to the fork's default branch HEAD. `Cargo.lock` currently pins commits, but any `cargo update` or non-`--locked` resolve floats to arbitrary HEAD; a force-push silently changes the build. `tauri-nspanel` (`Cargo.toml:110`) at least pins `branch = "v2.1"` — still mutable.
**Fix:** pin `rev = "<sha>"` for all three.

---

## 5. Medium findings

| # | Finding | Location | Impact |
| :-- | :--- | :--- | :--- |
| M-1 | **Dictionary vocabulary is disconnected from transcription.** `DictionarySettings` CRUD writes only to component state and `localStorage`; the correction pipeline reads `settings.custom_words` via `apply_custom_words`. Two unrelated word lists exist. | `components/settings/dictionary/DictionarySettings.tsx:19-73`; `managers/transcription.rs:554-560` | The headline Dictionary feature appears to save but has no effect on recognition. |
| M-2 | **Notes confuses global recording state with note-recording ownership.** It reads `isRecording()` once, then calls note-specific commands. The backend only stops a recording whose `binding_id` matches, and `finish_note_recording` always passes `"note_recording"`. | `components/settings/notes/NotesSettings.tsx:91-124`; `managers/audio.rs:557-621` | The mic button can offer "Stop" for a recording it cannot stop, then falsely display idle. |
| M-3 | **Onboarding unmounts before a download failure can be shown.** `onModelSelected()` removes the component, then the awaited `downloadModel` error is written into an unmounted tree. | `App.tsx:35-52, 60-69`; `components/onboarding/Onboarding.tsx:37-55` | First-run download failure drops the user into the app with no model and no explanation. |
| M-4 | **Settings rollback discards unrelated successful changes and swallows errors.** The generic updater restores the *whole* captured settings object, and several actions ignore `Result.status` entirely (e.g. `await commands.deleteHistoryEntry(id)`), so History's error alert is unreachable for backend string errors. | `stores/settingsStore.ts:261-304, 381-395, 398-458`; `bindings.ts:626-649` | Concurrent edits lose data; failures surface as nothing. |
| M-5 | **Stored credentials cannot be tested or removed.** Connection testing uses only the current input draft (empty after remount), and removal is blocked by `if (!apiKey) return`. Backend keychain persistence also skips empty values without deleting. | `CloudTranscriptionSettings.tsx:401, 523-534, 548-564`; `settings.rs:915-939` | Valid saved config appears broken; users cannot clear credentials. |
| M-6 | **WAV filename collision and orphaned files.** `format!("sonu-{}.wav", Utc::now().timestamp())` is second-resolution, so two transcriptions in the same second overwrite one WAV while the DB holds two rows. The WAV is written before the DB insert, with no transaction. | `managers/history.rs:187-203` · **Verified** | Silent audio loss; orphaned WAVs on DB failure. |
| M-7 | **Unvalidated history inputs.** `get_audio_file_path` joins a frontend-supplied `file_name` to the recordings dir without sanitization; `update_history_limit(0)` deletes all unsaved entries. | `commands/history.rs:32-41, 58-72`; `managers/history.rs:409-411` | Path escape (scope-limited by the asset protocol); unintended mass deletion. |
| M-8 | **SQLite connection-per-call, no busy timeout or WAL.** Every operation opens a new `Connection`; `delete_entry` opens a second while holding the first. | `managers/history.rs:175-177, 438-467` | `SQLITE_BUSY` ("database is locked") surfacing as a raw command error under concurrency. |
| M-9 | **Download integrity and robustness gaps.** No checksum/signature verification (only `Content-Length`), resume blindly trusts an existing `.partial` even if the catalog URL changed, no disk-space check, `reqwest::Client::new()` has no timeout, and tar extraction runs synchronously inside the async command. | `managers/model.rs:312-586`; `managers/offline_llm.rs:207-406` | Corruption is undetectable; large archives block the async executor. (Note: `tar` 0.4.44's `unpack` does guard against `..` traversal, so zip-slip is **not** currently exploitable — but there is no defence in depth.) |
| M-10 | **`stop_recording` returns `Some(vec![])` on recorder errors**, indistinguishable from a genuinely empty recording. | `managers/audio.rs:557-623` | Inconsistent "no audio" handling between callers. |
| M-11 | **Primary navigation is mouse-only.** Sidebar items and several key controls are `div onClick` with no focusability or keyboard activation. | `components/Sidebar.tsx:170-188`; `SonuShortcut.tsx:333-338`; `StyleSettings.tsx:199-209` | Keyboard-only users cannot navigate the app at all. |
| M-12 | **README security/offline claims contradict the config.** "no audio ever leaves your machine" ignores model downloads from `blob.handy.computer` and update checks; "Renderer process fully sandboxed" is Electron terminology; "ESLint enforces no eval()" is false — `eslint.config.js` contains only the i18next rule. | `README.md:9, 41, 349, 353` | Users are misled about egress and enforcement. |
| M-13 | **Husky hooks are effectively non-functional.** `husky install \|\| true` (deprecated in v9, swallows failure), `husky` absent from devDependencies, `.husky/pre-push` has no shebang, is not executable, and ends in `\|\| true`; `.husky/pre-commit` references a removed legacy path. | `package.json:26`; `.husky/pre-push:2`; `.husky/pre-commit` | No local gate actually runs. |
| M-14 | **npm is still invoked despite the Bun-only policy.** `beforeDevCommand`/`beforeBuildCommand`, the Playwright web server, and the pre-push hook all call `npm run …`. A stale 278 KB `package-lock.json` sits beside `bun.lock`. | `tauri.conf.json:7, 9`; `playwright.config.ts:30`; `.husky/pre-push:2` | Policy drift; ambiguous dependency resolution. |
| M-15 | **E2E is never run in CI.** No workflow invokes `test:e2e`, though `AGENTS.md:37` lists the command and Playwright config plus specs exist. | `.github/workflows/ci.yml` | Browser-level regressions are invisible until manual runs. |
| M-16 | **Stale duplicate `apps/tauri-v2/AGENTS.md`.** It describes `rdev` (absent from `Cargo.lock`), `whisper-rs` as the core engine, and a Whisper-only first-run download — contradicting the `transcribe-rs`/Parakeet default and the root `AGENTS.md`. | `apps/tauri-v2/AGENTS.md:82-100` | Misleads every agent that reads the nearest guidance file first. |
| M-17 | **Orphaned test files create a false impression of coverage.** `src/tests/{audio,model,settings}_tests.rs` are never declared in `lib.rs`, and `managers/transcription_tests.rs` is not declared in `managers/mod.rs`. They reference types that no longer exist (`ModelRequirements`, `DownloadStatus`, `TranscriptionError::ModelNotLoaded`) and would not compile if included. | `src/lib.rs`; `src/managers/mod.rs`; `src/tests/*` | Coverage looks broader than it is; dead code rots silently. |

---

## 6. Low findings

**Panic surface (each is an abort in release builds):**
- **L-1** `.expect()`/`.unwrap()` on tray icon/menu creation, signal setup, resource resolution, and binding lookup — `tray.rs:69, 71, 97, 105, 113, 116, 135, 148`; `lib.rs:158, 183, 185`; `shortcut.rs:877-878`; `settings.rs:951`.
- **L-2** `is_model_loading` returns `current_model.is_none()`, conflating "not loaded" with "loading" — `commands/models.rs:94-100`.
- **L-3** `Regex::new(...).unwrap()` three times per call — `commands/cloud_transcription.rs:216-229`.
- **L-4** `1..buckets.len()-1` underflows if `buckets == 0` (currently fixed at 16) — `audio_toolkit/audio/visualizer.rs:141`.
- **L-5** Resampler errors swallowed with `if let Ok`, silently dropping frames — `audio_toolkit/audio/resampler.rs:51-60, 66-84`.

**Correctness / hygiene:**
- **L-6** Deleting the active model is unguarded; settings still reference it — `commands/models.rs:38-45`; `commands/offline_llm.rs:39-45`.
- **L-7** `debug!("Found existing settings: {:?}", settings)` is safe only because keychain load happens later; `AppSettings` derives `Debug` over key maps — `settings.rs:760`. Add a redacting `Debug` impl.
- **L-8** Overlay `hide` race also exists server-side (300 ms delay) — `overlay.rs:266-279` (see H-7).
- **L-9** Home's dictation duration is estimated as `entries.length * 2`, not measured — `HomeSettings.tsx:77-94`.
- **L-10** Privacy copy claims end-to-end encryption and provider non-retention, which the source does not establish — `src/i18n/locales/en/translation.json:611-623`.
- **L-11** Style descriptions and cloud provider metadata bypass translation entirely.

**Security / supply chain / config:**
- **L-12** CSP allows `style-src 'unsafe-inline'`, omits `base-uri`/`form-action`, and whitelists `api.openai.com`/`anthropic.com`/`groq.com` in `connect-src` although the renderer performs no `fetch` — `tauri.conf.json:30`. Trim to what the renderer needs.
- **L-13** `capabilities/default.json:17-18` grants `fs:read-files` + `fs:allow-resource-read-recursive` and `opener:default`; verify the resolved fs scope is not broader than intended. **[risk]**
- **L-14** All GitHub Actions pinned to mutable tags rather than SHAs — `ci.yml:28, 30, 78, 82`; `build.yml` (12 sites); `release.yml:25, 29, 69, 155`.
- **L-15** No Dependabot/Renovate, no `cargo-audit`/`deny.toml` — no CVE or license scanning across ~500 crates.
- **L-16** Lockfiles not enforced in CI: bare `bun install` and cargo without `--locked` — `ci.yml:33, 50, 64, 106, 109`.
- **L-17** macOS signing/notarization path is dead: `release.yml:139` passes `sign-binaries: false` for every target, so the entire signing block in `build.yml:203-282` never executes. Releases are ad-hoc signed (`signingIdentity: "-"`). Intentional per `INSTALL.md:38-40`, but the infrastructure is misleading dead code.

**Documentation / repo:**
- **L-18** `SECURITY.md:9` supported-versions table tops out at 2.4.x while the app is 2.6.0.
- **L-19** `ARCHITECTURE.md` drift: `:58` lists a non-existent `commands/settings.rs`; `:5` omits Moonshine from the default set; `:79` omits download/update egress from the privacy note.
- **L-20** `README.md:413` links `docs/TAURI_V2_MIGRATION_GUIDE.md`, which does not exist.
- **L-21** `README.md:374, 377` list streaming transcription and voice commands as "In Progress" although `VERSION.md:18-19` says both shipped in 2.6.0.
- **L-22** `.prettierrc` sets `"endOfLine": "auto"` while `AGENTS.md:65` claims LF is enforced and `.gitattributes` sets `eol=lf`.
- **L-23** Tracked artifacts that should not be: `apps/tauri-v2/shot-dark-home.png` (app root) and `.claude/settings.local.json` (machine-local Bash allow-rules).
- **L-24** No i18n key-coverage tooling, despite CHANGELOG claims of "12-locale parity".
- **L-25** Empty directories on disk: root `locales/` (0 tracked files), `assets/`, `docs/models/`.

---

## 7. Strengths worth preserving

- **Typed IPC already exists.** `tauri-specta` generates `bindings.ts`; most infrastructure for standardising calls is present. Do not hand-maintain duplicate command types.
- **Secret handling is fundamentally sound.** Keys are keychain-backed and `#[serde(skip)]` (`settings.rs:31, 314`), cleared from memory before serialization (`842-847`), and never returned to the frontend. There is correctly no plaintext fallback. Fix the *failure path* (H-10), not the design.
- **`safe_lock` poison-tolerant wrappers** already exist (`audio.rs:269`, `transcription.rs:185`) — extend them rather than inventing a new pattern.
- **Download pipeline handles range-not-supported (370-383), final size verification (473-491), and atomic temp-dir + rename install (499-554)** with interrupted-extraction cleanup (236-240).
- **Retention cleanup correctly protects `saved` rows** (`saved = 0` filters at 290/331).
- **Cloud transcription client has a 60 s timeout and sanitizes errors.**
- **Condvar-gated model load** (`transcription.rs:488-497`) and a preview path that never unloads the model (458-460, 585-587).
- **UTF-8-safe, well-tested live-preview stabilization** (`audio.rs:162-215, 790-858`) and char-based voice-command replacement (`actions.rs:36-97`).
- **Frontend accessibility foundations exist** — shared `ToggleSwitch` semantics, radiogroup behaviour in appearance settings, global focus styles, reduced-motion handling (`ToggleSwitch.tsx:43-53`, `AppearanceSettings.tsx:72-132`, `App.css:317-321, 385-393`).
- **`AudioPlayer` has deliberate lifecycle management** — animation-frame cancellation, stable callbacks, awaited `play()` (`AudioPlayer.tsx:22-137`).
- **Several listener cleanups are correctly promise-aware** (History, Notes, model hooks). Do not apply the H-7 fix blanket-wise.

---

## 8. Test coverage assessment

**Compiled tests** (inline modules only): audio preview (7), transcription engine dispatch (4), voice commands (8), model catalog (6), settings appearance/voice (4), `text.rs` (5), keychain (2 — touches the real OS keychain, flaky in CI), clamshell (macOS-only), apple_intelligence (1).

**Frontend unit tests:** 5 files — `useSettings`, `useTheme`, overlay preview, `Button`, `format`. They cover useful basics but not the cross-component failures above.

**Critical gaps:**
1. **No realistic IPC/event harness.** `src/test/setup.ts:10-19, 28-98` mocks bindings broadly; some command names are obsolete, and successful mutation mocks return `undefined` rather than a real `Result`. Tests therefore cannot catch the `Result`-handling defects in M-4.
2. **No concurrency, StrictMode-cleanup, or delayed-registration tests** — the exact conditions behind C-3, H-7, and M-4.
3. **No backend tests for** recorder lifecycle, VAD smoothing, resampling, SQLite migrations/cleanup, download/extraction, LLM client, clipboard/input injection, the commands layer, lock ordering, keychain error paths, or settings atomicity.
4. **Browser "E2E" does not validate persistence.** `e2e/app.spec.ts:30-46, 110-126` explicitly runs without loaded settings, and some navigation assertions only check that `body` is visible. These are rendering smoke tests.
5. **Orphaned test files** (M-17) inflate the apparent coverage.
6. **Lint does not enforce the project's own rules.** `eslint.config.js:15-35` configures only `i18next/no-literal-string` — no hook-dependency checking, no floating-promise detection, no restriction on raw IPC imports.

---

## 9. Prioritised recommendations

Ordered by (impact × reachability) ÷ effort. Full task breakdown with acceptance criteria is in [`IMPROVEMENT_PLAN.md`](IMPROVEMENT_PLAN.md).

| Priority | Work | Addresses |
| :--- | :--- | :--- |
| **P0 — Stop the bleeding** | Fix the two panic sites and the two deadlock sites. These are the only findings that cost the user unsaved work or a frozen app. | C-1, C-2, C-3, C-4 |
| **P0** | Fix note saving so completed notes are never lost. | C-5 |
| **P1 — Make CI honest** | Fix the clippy pipe; add `--frozen-lockfile`/`--locked`; pin git deps and Actions. Cheap, and it prevents every future regression from landing silently. | H-11, H-12, L-14, L-16 |
| **P1 — Stop silent data loss** | Clipboard preservation, cloud preference overwrite, keychain failure propagation, WAV collision, history input validation. | H-1, H-4, H-10, M-6, M-7 |
| **P2 — Unify state ownership** | Route all settings mutations through the store; add one reconciliation subscription; fix rollback semantics. This is the single highest-leverage structural change. | H-6, M-4, M-5, M-1, M-2 |
| **P2 — Async lifecycle correctness** | Overlay cleanup and session tagging, download cancellation, shortcut rollback, LLM timeout, onboarding ownership. | H-2, H-3, H-7, H-8, M-3 |
| **P3 — Performance** | Settings/keychain caching, single-flight initialization, SQLite connection reuse with WAL, history rendering, `spawn_blocking` extraction. | H-5, M-8, M-9 |
| **P4 — Honesty and accessibility** | Correct or implement the offline-LLM claim, fix README security claims, make navigation keyboard-accessible, translate dynamic copy. | H-9, M-11, M-12, L-9, L-10, L-11 |
| **P5 — Hygiene** | Documentation drift, orphaned tests, repo artifacts, i18n tooling, husky/npm drift, dead signing path. | M-13 to M-17, L-18 to L-25 |

**Guiding principle for the implementer:** make small, regression-tested changes per subsystem. The largest reliability gains come from consistent state ownership, explicit `Result` handling, and session-safe asynchronous behaviour — not from restructuring the codebase.

---

## Appendix A — Verification status

| Finding | Status | How confirmed |
| :--- | :--- | :--- |
| C-1 | **Verified** | Read `text.rs:112-133`; char-count-as-byte-index confirmed by inspection of `&word[..prefix_end]`. |
| C-2 | **Verified** | Read `recorder.rs:83-121`; unmatched `cpal::SampleFormat` variants fall to `panic!`; `panic = "abort"` at `Cargo.toml:116`. |
| C-3 | **Verified** | Read both lock sequences in `managers/audio.rs`; guards held across second acquisition. |
| C-4 | High confidence | Channel-drain ordering read directly; not reproduced at runtime. |
| C-5 | **Verified** | Read `commands/transcription.rs:157-188` and `history.rs:216-233`; the `saved = false` insert and text-equality guard are both explicit. |
| H-1 | **Verified** | Read `CloudTranscriptionSettings.tsx:422-436, 457-474`; local hydration feeding cloud persistence confirmed. |
| H-2, H-3, H-4, H-5, H-6, H-7, H-8, H-10 | High confidence | Call chains traced across the IPC boundary; not reproduced at runtime. |
| H-9 | **Verified** | Frontend comment at `PostProcessingSettings.tsx:459-461` plus absence of any offline branch in `llm_client.rs`. |
| H-11 | **Verified** | Read `ci.yml:108-111`; no `pipefail`. |
| H-12 | **Verified** | Read `Cargo.toml:67, 69`; no `rev`/`tag`/`branch`. |
| M-6 | **Verified** | Read `history.rs:187-203`; second-resolution filename and write-before-insert confirmed. |
| M-17 | **Verified** | `lib.rs` and `managers/mod.rs` contain no `mod tests` declaration for those files. |
| Repo-level findings | Verified via `git ls-files` and config reads | See M-13 to M-17 and L-14 to L-25. |
| L-13 | **Risk** | Capability scope resolution not evaluated at runtime. |

**Not assessed:** runtime behaviour on macOS/Linux, live network/provider behaviour, actual performance profiling, and the contents of any model artifacts. Provider data-retention policies referenced by the privacy copy (L-10) were not researched.
