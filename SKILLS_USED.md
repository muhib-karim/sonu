# Skills used

Which agent skill drove which change. Only skills that were actually loaded
and applied are listed; practices followed without loading a skill are named
as practices, not skills.

## v2.7.0

| Skill | What it drove |
| --- | --- |
| `ci-cd-and-automation` | The CI shape: every gate on every PR (no path filter), the full `tauri build` matrix for Windows x64 / macOS arm64 / Linux x64 through the reusable `build.yml`, and turning `cargo test` from advisory back into a blocking gate after fixing the cause of the `SIGILL` instead of silencing it. Also the gitleaks job, the CodeQL workflow and the release checksums/provenance job. |
| `verification-before-completion` | Nothing was reported done without evidence: every completion claim cites a CI run id, the code-scanning alert count was read from the API rather than assumed, and the release workflow's asset listing and download commands were exercised against the real v2.6.3 release before relying on them. Items that could not be run (the tag-triggered release itself) are marked INFERRED in `TASKS.md`. |
| `impeccable` | The Pages site refresh (`site/index.html`), run as a narrow refinement of the existing dark design: kept the palette and structure, corrected copy that over-claimed ("100% offline", an unqualified "Real-time", context awareness without its Windows-only limit), added the measured-speed table with tabular numerals, the privacy and verification sections, themed selection and focus states, a reduced-motion fallback, and replaced `innerHTML` with DOM construction. |

Practices applied without a dedicated skill load:

- **Test-first for the bug fix**: the empty custom-word crash in
  `audio_toolkit/text.rs` was pinned by a regression test written alongside the
  guard. The Vitest suite for `settingsInput.ts` was written first and run red
  (module missing) and then green locally before the components were rewired.
- **Root-cause debugging**: the intermittent `SIGILL` was traced from the CI
  logs to whisper.cpp's `GGML_NATIVE` default by reading the vendored
  `whisper-rs-sys` build script and ggml's CMake; the obvious fix
  (`WHISPER_NATIVE=OFF`) was rejected after reading that the compatibility alias
  can only switch the option on.
- **Honest measurement**: the latency table reports what the runner actually
  does (Whisper on Mesa's llvmpipe software Vulkan device, ONNX models on the
  CPU) and marks every unmeasured model as not measured.
