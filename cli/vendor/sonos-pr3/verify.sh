#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BIN="${1:-$WORKSPACE_DIR/bin/sonos-pr3}"

if [[ ! -x "$BIN" ]]; then
  echo "Binary not found or not executable: $BIN" >&2
  exit 1
fi

echo "binary: $BIN"
file "$BIN"
shasum -a 256 "$BIN"

echo

go version -m "$BIN"

echo
if [[ -f "$SCRIPT_DIR/current-build.json" ]]; then
  echo "current-build.json:"
  cat "$SCRIPT_DIR/current-build.json"
else
  echo "current-build.json: (not found)"
fi
