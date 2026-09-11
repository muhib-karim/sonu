#!/usr/bin/env bash
#
# Ratchet against new panic sites in the Rust backend.
#
# `panic = "abort"` is set for release builds (see src-tauri/Cargo.toml), so a
# panic in ANY thread terminates the whole application — there is no unwinding
# and no recovery. `unwrap()` and `expect()` are the most common way that
# happens, and two of them were previously reachable from ordinary user input.
#
# This is a ratchet, not a purity gate. It does not require fixing the ~87
# existing sites; it only stops new ones from being added. When you remove a
# panic site, lower the baseline in the same commit so the gain is locked in.
#
# Usage (from apps/tauri-v2):
#   ./scripts/check-panic-ratchet.sh
#
set -euo pipefail

cd "$(dirname "$0")/.." || exit 1

SRC_DIR="src-tauri/src"
BASELINE_FILE="scripts/panic-baseline.txt"

if [[ ! -d "$SRC_DIR" ]]; then
  echo "error: $SRC_DIR not found (run this from apps/tauri-v2)" >&2
  exit 1
fi

if [[ ! -f "$BASELINE_FILE" ]]; then
  echo "error: $BASELINE_FILE not found" >&2
  exit 1
fi

current=$(grep -rhoE '\.unwrap\(\)|\.expect\(' --include='*.rs' "$SRC_DIR" | wc -l | tr -d ' ')

# The baseline file is documented with `#` comments; take the first bare number.
baseline=$(grep -oE '^[0-9]+' "$BASELINE_FILE" | head -1)

if ! [[ "$baseline" =~ ^[0-9]+$ ]]; then
  echo "error: no numeric baseline found in $BASELINE_FILE" >&2
  exit 1
fi

echo "panic sites in $SRC_DIR: current=$current baseline=$baseline"

if (( current > baseline )); then
  cat >&2 <<EOF

ERROR: $(( current - baseline )) new unwrap()/expect() call(s) added.

The release profile sets panic = "abort", so any panic in any thread kills the
process. Prefer propagating a Result. If the panic is genuinely unreachable,
say so in a comment and raise the baseline in $BASELINE_FILE
with a note explaining why.

Locate them with:
  grep -rnE '\\.unwrap\\(\\)|\\.expect\\(' --include='*.rs' $SRC_DIR
EOF
  exit 1
fi

if (( current < baseline )); then
  echo "Nice: $(( baseline - current )) panic site(s) removed."
  echo "Lower the baseline to $current in $BASELINE_FILE to lock the gain in."
fi

echo "OK"
