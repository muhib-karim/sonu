# TASKS: v2.7.0 upgrade

Status of every Definition-of-Done item. **RUN** means executed and observed
(CI run id given). **INFERRED** means reasoned from code, configuration or a
partial check, not executed end to end.

Branch: `upgrade/v2.7.0`. Date: 2026-10-21.

## Definition of Done

| # | Item | Status | Evidence |
| --- | --- | --- | --- |
| 1 | CI matrix with `tauri build` on Windows, macOS arm64, Linux on every PR; clippy `-D warnings`; `cargo test`; typecheck + eslint + vitest; gitleaks; Dependabot (cargo, npm via bun, actions); CodeQL JS/TS | **RUN** | CI 39683384926 + CodeQL 39683384939 (`95e9d1d`): all 11 jobs green. Head run: see "Latest head" below. Dependabot config already covered cargo, bun (npm registry) and github-actions; unchanged. |
| 2 | Release workflow: on tag, signed-where-possible artifacts (msi/exe, dmg, AppImage/deb) + `SHA256SUMS` | **INFERRED** (not triggered: needs a tag) | Every release target (Windows x64, macOS arm64 + x64, Linux deb/AppImage/rpm) builds in PR CI through the same `build.yml`. The checksums job's asset listing and by-id download commands were run against the real v2.6.3 release (17 assets). actionlint clean. Signing: updater artifacts are minisign-signed (existing key); macOS Developer ID signing switches on when the Apple secrets exist; Windows Authenticode needs a `signCommand` + certificate (not configured). |
| 3 | Rust unit tests for pure audio pieces (resampling, VAD thresholds, text post-processing, settings migration); vitest for settings UI logic; transcription regression with the smallest model | **RUN** | Rust Check in CI 39683384926: at least 75 tests (floor enforced), Whisper-tiny regression transcribed the JFK clip correctly. Vitest: 16 new cases (54 total), run locally red then green and in CI. |
| 4 | Latency / RTF table per model size measured in CI on the Linux runner, labelled runner + date, in README and on the Pages site | **RUN** | Benchmark 39687868674 (`01ea3b9`, 2026-10-21, `ubuntu-24.04` image 20261018, 4 vCPU AMD EPYC 7763, 15 GB, no GPU), repeated from 39685635867 (`b201521`, image 20261012): every row within 0.07 RTF. Six models measured; Whisper Medium/Large/Turbo marked not measured. |
| 5 | README "Upstream and what this fork adds" | **RUN** (written; links checked against the tree) | README section with cjpais/Handy, v0.7.0 sync point, MIT notice, per-feature table with code links. |
| 6 | README homepage refresh (banner, badges per OS, release, downloads, licence, real screenshot, install per platform, privacy, architecture mermaid, links); Pages 200 | **RUN** for content; Pages 200 after merge is **INFERRED** | Live site currently returns 200 for the page and all three assets it copies. `pages.yml` deploys on `site/**` changes to `main`; the new page uses only those same assets. Rendered locally in headless Chromium at 1280 px and 390 px. |
| 7 | CHANGELOG `[2.7.0] - 2026-10-21`; version bump in Cargo.toml, tauri.conf.json, package.json, VERSION.md; SKILLS_USED.md; TASKS.md + HANDOFF.md | **RUN** | Version 2.7.0 in all four plus the `sonu-desktop` entry in Cargo.lock. |
| 8 | Branch pushed via push.sh, CI green on head | **RUN** | See "Latest head". |

## Model used

- Regression: Whisper **tiny** (`ggml-tiny.bin`, 75 MB, sha256
  `be07e048…1b21`, from the catalog), on `jfk.wav` from whisper.cpp v1.7.5
  (sha256 `59dfb9a4…860e`, public domain).
- Benchmark: Moonshine Base, Whisper Tiny / Base / Small, Parakeet V2 / V3,
  each verified with the app's own `verify_checksum` before loading.

## Latest head

Code head `01ea3b9` (everything after it is documentation only):

- CI **39687868677**: all 12 jobs green: Lint & Format, TypeScript Check,
  Unit Tests, Panic Ratchet, Secret Scan (gitleaks), Rust Check (clippy
  `-D warnings`, blocking tests, portable-ggml assertion, Whisper-tiny
  regression: correct transcript, 25.7 s for 11.0 s in the debug test binary),
  Rust Dependency Audit, and Tauri Build for Windows x64, macOS arm64, macOS x64
  and Linux x64 (deb, AppImage, rpm). Installers uploaded as artifacts.
- CodeQL **39687868624**: success; code-scanning alerts open on the branch: **0**.
- Benchmark **39687868674**: success (the published table).

The final documentation commit's CI is re-checked before handoff; the PR's
checks show it.

## Findings and known issues (not fixed in this release)

- **Whisper on GPU-less Linux is slow (RUN) and may abort without any Vulkan
  device (INFERRED from source).** transcribe-rs 0.2.1 always creates the
  whisper context with `use_gpu = true`; on Linux whisper.cpp is built with
  Vulkan, falls back to Mesa's llvmpipe (benchmark: Small at RTF 7.4), and
  `ggml_vk_instance_init` calls `GGML_ABORT` when no device exists. Fix needs
  a CPU-backend option upstream in transcribe-rs, or building whisper without
  Vulkan on Linux. Parakeet (the default) and Moonshine are unaffected.
- **Release AppImage post-processing is dead work (INFERRED).** `build.yml`
  strips `libwayland-client.so` from the AppImage after tauri-action has
  already uploaded the unprocessed file to the release, so releases ship the
  original (consistent with its updater `.sig`). Either upload the processed
  file and re-sign, or drop the step.
- **Windows installers are not Authenticode-signed**; Windows ARM64 is paused
  (issue #30).
- `zip` 4.6.1 advisories documented in `.cargo/audit.toml` until
  tauri-plugin-updater allows zip ≥ 9.

## Release steps for the coordinator

1. Merge the PR. The `tauri.conf.json` change starts `release.yml` on `main`.
2. Tagging `v2.7.0` afterwards is safe: the tag run waits in the `release`
   concurrency group and skips because the release is already published. If
   the tag is pushed first, the tag run builds and the main run skips.
3. Check the release has the installers, `.sig` files, `latest.json` and
   `SHA256SUMS`, then `gh attestation verify <asset> --repo muhib-karim/sonu`.
