# HANDOFF: SONU v2.7.0

For the reviewer merging `upgrade/v2.7.0` and whoever works on SONU next.
Item-by-item status with RUN / INFERRED labels is in [TASKS.md](TASKS.md).

## What this branch does

1. **CI proves every release target on every PR.** `ci.yml` calls the
   reusable `build.yml` for Windows x64, macOS arm64, macOS x64 and Linux x64
   (deb, AppImage, rpm). Rust tests are blocking again (floor 75), plus a
   Whisper-tiny transcription regression on a public-domain clip, gitleaks,
   and a CodeQL workflow for the TypeScript.
2. **Root cause of the intermittent `SIGILL`, which also affected shipped
   installers.** whisper.cpp compiled with `-march=native` on whichever runner
   built it. `cmake/ggml-portable.cmake`, injected through
   `CMAKE_PROJECT_INCLUDE_BEFORE` (the only path `whisper-rs-sys` forwards),
   forces `GGML_NATIVE=OFF`; CI asserts it in whisper's CMake cache.
3. **Releases**: `release.yml` also runs on `v*` tags, never double-builds a
   version, uploads `SHA256SUMS` and Sigstore build-provenance attestations,
   and tags the exact built commit.
4. **Measured performance**: `benchmark.yml` + `managers/benchmark.rs` time
   catalog models through the app's own code on `ubuntu-24.04`; the table is
   in the README and on the site.
5. **Tests**: resampler, VAD smoothing, Silero guard, text post-processing,
   settings migration (Rust); settings input rules (Vitest).
6. **Fixes**: crash on an empty custom-dictionary entry; dependency advisories
   (rustls, rustls-webpki, webpki-roots, quinn-proto).
7. **Docs**: README refresh (badges, privacy, verification, performance,
   upstream provenance), site refresh, CHANGELOG, VERSION.md, version 2.7.0.

## CI evidence

| What | Run | Commit | Result |
| --- | --- | --- | --- |
| Slice 1 CI (all jobs) | 39683384926 | `95e9d1d` | success |
| Slice 1 CodeQL | 39683384939 | `95e9d1d` | success, 0 alerts |
| Benchmark (numbers in README/site) | 39687868674 | `01ea3b9` | success |
| Benchmark, first run (spread check) | 39685635867 | `b201521` | success |
| CI on b201521 | 39685636113 | `b201521` | clippy `large_enum_variant` in the new benchmark module; fixed in `ed25be4` |
| Latest head | see TASKS.md "Latest head" | | |

## Releasing v2.7.0

Merge, and `release.yml` starts from the `tauri.conf.json` change on `main`.
Tagging `v2.7.0` before or after is safe (one run builds, the other skips).
Expected assets: `SONU_2.7.0_x64-setup.exe`, `SONU_2.7.0_x64_en-US.msi`,
`SONU_2.7.0_aarch64.dmg`, `SONU_2.7.0_x64.dmg`, `.app.tar.gz` updater bundles,
`SONU_2.7.0_amd64.deb`, `SONU_2.7.0_amd64.AppImage`, `SONU-2.7.0-1.x86_64.rpm`,
the `.sig` files, `latest.json` and `SHA256SUMS`.

## Gotchas

- Many source files are committed with CRLF line endings despite
  `.gitattributes`; keep CRLF when editing them or the whole file shows as
  changed.
- `scripts/check-panic-ratchet.sh` counts every `.unwrap()` / `.expect(` in
  `src-tauri/src`, tests included; write tests with `?` and `let … else`.
- `whisper-rs-sys` has no `rerun-if-env-changed` for cmake flags: when
  `ggml-portable.cmake` changes, bump the rust-cache keys (`portable-ggml-v1`).
- Rust is never compiled on the development box (memory); all builds and tests
  run in Actions.

## Next steps

1. Give Whisper a CPU path on Linux (transcribe-rs `use_gpu` option or a
   non-Vulkan Linux build): today GPU-less Linux gets llvmpipe (RTF 7.4 for
   Small) and, per the whisper.cpp source, an abort with no Vulkan device.
2. Fix or remove the AppImage post-processing step in `build.yml`, which runs
   after the release upload.
3. Windows code signing (`bundle.windows.signCommand` + certificate).
4. Measure on real hardware (GPU, Windows, macOS) and add rows labelled as such.
