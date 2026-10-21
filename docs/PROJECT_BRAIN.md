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
- Slice 1 (CI, release, tests, provenance) and slice 2 (benchmark, README and
  site refresh, CHANGELOG 2.7.0, version bump, SKILLS_USED, TASKS, HANDOFF)
  done on `upgrade/v2.7.0`; code head `01ea3b9` green (CI 39687868677,
  CodeQL 39687868624, Benchmark 39687868674), 0 code-scanning alerts.
- Details and RUN/INFERRED labels: TASKS.md; reviewer notes: HANDOFF.md.

## Next step
- Coordinator: merge, then the release runs from main (or a v2.7.0 tag).
- Follow-ups in HANDOFF.md "Next steps" (Whisper CPU path on Linux, AppImage
  post-processing, Windows signing).

## Session log
- 2026-10-21 21:50Z claude-opus-5-5: slice 1 implemented (tests, CI, release, provenance); next: push and get CI green.
- 2026-10-21 22:20Z claude-opus-5-5: CI green on first push except the audit (new advisories); lockfile patched and pushed.
- 2026-10-21 23:20Z claude-opus-5-5: slice 2 done (benchmark, docs, site, version 2.7.0); final docs push pending CI.
