#!/usr/bin/env bash
#
# Publish the reason a CI step failed as a GitHub check annotation.
#
# Why this exists: downloading a job log requires admin rights on the repository,
# and uploaded artifacts require authentication, so a failure in this repo used
# to leave no evidence reachable from outside it. Annotations *are* readable
# through the public API and render in the UI, so they are the one channel that
# works without privileged access.
#
# Usage: ci-annotate-failure.sh <log-file> <annotation-title> [headline-pattern]
#
# Two details that are easy to get wrong and cost real debugging time:
#   * `shell: bash` on GitHub implies `-eo pipefail`, so a `grep | head` pipeline
#     dies with SIGPIPE (141) once head has its lines. This script relaxes both.
#   * Cargo colourises its output, so an "error:" line carries a leading escape
#     sequence and never matches a `^error` anchor. Strip ANSI before matching.
#
# Never exits non-zero: a reporter that fails the job it is reporting on is worse
# than no reporter.

set +o pipefail
set +e

log_file="${1:-}"
title="${2:-CI failure}"
pattern="${3:-^error|^ *--> |FAILED|panicked at|^test result:|^failures:}"

if [ -z "$log_file" ]; then
  printf '::error title=%s::ci-annotate-failure.sh called without a log file\n' "$title"
  exit 0
fi

if [ -s "$log_file" ]; then
  clean=$(sed -e 's/\x1b\[[0-9;]*[a-zA-Z]//g' "$log_file" | tr -d '\r')

  # The headlines identify *what* broke, and list every site at once rather than
  # only the first.
  body=$(printf '%s\n' "$clean" | grep -E "$pattern" | head -n 12)

  # ...but for some failures the actionable detail sits *after* the line that
  # matches: a `custom build command` failure prints the panic line and only then
  # the cmake output that explains it. So append the lines following the first
  # match. (The *first*, not the last — the final "could not compile" line has
  # nothing useful after it.)
  first=$(printf '%s\n' "$clean" | grep -n -E "$pattern" | head -n 1 | cut -d: -f1)
  if [ -n "$first" ]; then
    after=$(printf '%s\n' "$clean" | sed -n "$((first + 1)),$((first + 20))p")
    body=$(printf '%s\n%s\n' "$body" "$after")
  fi

  if [ -z "$body" ]; then
    body=$(printf '%s\n' "$clean" | tail -n 15)
  fi
  footer="[${log_file}: $(wc -l < "$log_file") lines / $(wc -c < "$log_file") bytes]"
else
  body=""
  footer="[${log_file} was empty or missing - the failure was in an earlier step]"
fi

if [ -z "$body" ]; then
  body="$footer"
  footer=""
fi

# A workflow command must be a single line: escape % and join with %0A. The
# headline goes first because annotation messages are truncated from the end.
if [ -n "$footer" ]; then
  msg=$(printf '%s\n%s\n' "$body" "$footer")
else
  msg=$(printf '%s\n' "$body")
fi
msg=$(printf '%s\n' "$msg" | sed 's/%/%25/g' | awk '{printf "%s%%0A", $0}')
msg=$(printf '%s' "$msg" | cut -c1-1900)

printf '::error title=%s::%s\n' "$title" "$msg"
exit 0
