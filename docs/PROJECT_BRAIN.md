# PROJECT_BRAIN — SONU

Handoff note for whoever (human or agent) picks this repo up next. Short on purpose.

## What this is
SONU: offline voice typing desktop app (Tauri v2, Rust + React/TS), a fork of
cjpais/Handy. App lives in `apps/tauri-v2/`; Rust backend in `src-tauri/`.

## Hard constraints
- Rust/Tauri compiles run only in GitHub Actions (the dev box is memory-tight).
  Local work: edit, format, frontend lint/unit tests if deps are installed.
- Branch work only; never push to `main`, never force-push.

## Current task: v2.7.0 upgrade (branch `upgrade/v2.7.0`)
Slice 1 (this slice): CI matrix + release workflow + tests + provenance.
Slice 2 (later): latency/RTF table, README refresh, CHANGELOG/version bump,
SKILLS_USED.md, TASKS.md, HANDOFF.md.

Plan for slice 1:
1. CI (`ci.yml`): run on every PR and on `upgrade/**` pushes; full `tauri build`
   matrix (Windows x64, macOS arm64, Linux x64) via the reusable `build.yml`;
   clippy `-D warnings`; `cargo test` as a blocking gate; eslint + prettier,
   `tsc`, vitest; gitleaks job.
2. Root-cause the intermittent `SIGILL` in the Rust test binary: whisper.cpp
   builds with `GGML_NATIVE=ON` (`-march=native`) by default and rust-cache
   restores those objects on runners with a different CPU. Fix with
   `WHISPER_NATIVE=OFF` (mapped to `GGML_NATIVE`) plus a cache-key bump. Same
   flag in `build.yml` so shipped binaries stop depending on the runner CPU.
3. CodeQL (JS/TS) workflow, default query suite, 0 open alerts.
4. Release: `release.yml` also triggers on `v*` tags (no duplicate workflow),
   serialised with the main-push path, uploads `SHA256SUMS` and Sigstore build
   provenance attestations; native signing when the secrets exist.
5. Tests: Rust unit tests for resampler, SmoothedVad, Silero threshold guard,
   settings migration; vitest for settings-input helpers; whisper-tiny
   transcription regression job on a public-domain WAV.
6. README "Upstream and what this fork adds" section.

## Status
- Slice 1 code complete and committed: Rust unit tests (resampler, VAD,
  Silero guard, text, settings migration), vitest for settings inputs,
  whisper-tiny regression test, CI matrix + gitleaks, CodeQL, release
  checksums/provenance, portable ggml build, README provenance section.
- Fixed on the way: empty custom word panicked in soundex; rustls and
  quinn-proto advisories (lockfile only); zip advisory documented (no fix
  upstream).
- Gotchas: many source files are CRLF in the index; keep CRLF when editing.
  whisper-rs-sys forwards only WHISPER_*/CMAKE_* env to cmake, and the
  WHISPER_NATIVE alias cannot switch native off.

- First branch CI run (d2c87bd): every job green except the advisory audit,
  which flagged rustls-webpki/webpki-roots advisories published 2026-10-19/20;
  lockfile bumped. CodeQL: 0 open alerts. Regression: whisper-tiny got the JFK
  line right, 25.1 s for 11 s of audio (RTF 2.29) in the debug test binary on
  ubuntu-24.04. For the slice-2 latency table measure a release build and
  check whether whisper chose Vulkan/lavapipe or the CPU backend.

## Next step
- Confirm CI green on the lockfile bump, then slice 2 (items 4, 6, 7, 8).

## Session log
- 2026-10-21 21:50Z claude-opus-5-5: slice 1 implemented (tests, CI, release, provenance); next: push and get CI green.
- 2026-10-21 22:20Z claude-opus-5-5: CI green on first push except the audit (new advisories); lockfile patched and pushed.
