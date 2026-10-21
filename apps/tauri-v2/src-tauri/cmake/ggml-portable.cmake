# Portable whisper.cpp build for CI and release binaries.
#
# ggml defaults to GGML_NATIVE=ON, i.e. `-march=native` (or MSVC's FindSIMD
# probe), so every object is tuned to the CPU of whichever machine compiled it.
# On GitHub runners that CPU varies between jobs: a binary built on an
# AVX-512 host dies with SIGILL on one without it. That was the intermittent
# "illegal instruction" in the Rust test job (rust-cache restored objects built
# on a different runner) and it also leaked into shipped installers.
#
# With GGML_NATIVE off, ggml falls back to its portable x86-64 baseline (AVX,
# AVX2, FMA, F16C; no AVX-512) and to the compiler default on arm64.
#
# whisper-rs-sys only forwards WHISPER_* and CMAKE_* environment variables to
# cmake, and the WHISPER_NATIVE compatibility alias can only switch the option
# on, so CI points CMAKE_PROJECT_INCLUDE_BEFORE at this file; it runs before
# whisper.cpp's and ggml's project() calls. Local builds are unaffected.
set(GGML_NATIVE OFF CACHE BOOL "ggml: enable -march=native flag" FORCE)
message(STATUS "SONU: GGML_NATIVE forced OFF for a portable build")
