#!/usr/bin/env bash
# symlinks.sh — Manage symlinks declared in symlinks.conf
#
# Usage:
#   system/symlinks/mbp-m4max-16/symlinks.sh setup     Create all symlinks (skip existing)
#   system/symlinks/mbp-m4max-16/symlinks.sh teardown  Remove all managed symlinks
#   system/symlinks/mbp-m4max-16/symlinks.sh status    Show current state of all managed symlinks
#   system/symlinks/mbp-m4max-16/symlinks.sh verify    Exit 0 if all links are correct, 1 otherwise

set -euo pipefail

# Resolve paths (system/symlinks/mbp-m4max-16/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BRAIN_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CONF="$SCRIPT_DIR/symlinks.conf"

if [[ ! -f "$CONF" ]]; then
  echo "❌ symlinks.conf not found at $CONF"
  exit 1
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
DIM='\033[0;90m'
NC='\033[0m'

# Expand ~ in paths
expand_path() {
  echo "${1/#\~/$HOME}"
}

# Prefix command with sudo when the target path is outside $HOME
_cmd() {
  local path="$1"; shift
  if [[ "$path" != "$HOME"* ]]; then
    sudo "$@"
  else
    "$@"
  fi
}

# Parse conf — outputs "link_abs|brain_abs|link_disp|brain_disp" per line
# Uses | as separator so paths with spaces (e.g. ~/Library/Application Support/...) are handled correctly.
parse_conf() {
  grep -v '^\s*#' "$CONF" | grep -v '^\s*$' | while IFS= read -r raw_line; do
    # brain_rel is always the last whitespace-separated token (brain paths never contain spaces)
    brain_rel=$(awk '{print $NF}' <<< "$raw_line")
    # Strip brain_rel and the preceding whitespace from the end, then rtrim
    link_path="${raw_line%[[:space:]]*${brain_rel}}"
    link_path="${link_path%"${link_path##*[![:space:]]}"}"
    local link_abs brain_abs
    link_abs="$(expand_path "$link_path")"
    brain_abs="$BRAIN_ROOT/$brain_rel"
    printf '%s|%s|%s|%s\n' "$link_abs" "$brain_abs" "$link_path" "$brain_rel"
  done
}

cmd_setup() {
  local count=0 skipped=0 created=0 errors=0
  while IFS='|' read -r link_abs brain_abs link_disp brain_disp; do
    count=$((count + 1))

    # If already a correct symlink, skip
    if [[ -L "$link_abs" ]] && [[ "$(readlink "$link_abs")" == "$brain_abs" ]]; then
      printf "${DIM}  skip${NC}  %s → %s (already exists)\n" "$link_disp" "$brain_disp"
      skipped=$((skipped + 1))
      continue
    fi

    # If something else exists at link path, we need to move it to brain first
    if [[ -e "$link_abs" ]] && [[ ! -e "$brain_abs" ]]; then
      mkdir -p "$(dirname "$brain_abs")"
      _cmd "$link_abs" mv "$link_abs" "$brain_abs"
      _cmd "$link_abs" ln -s "$brain_abs" "$link_abs"
      printf "${GREEN}  move${NC}  %s → %s (moved & linked)\n" "$link_disp" "$brain_disp"
      created=$((created + 1))
      continue
    fi

    # If both exist, warn
    if [[ -e "$link_abs" ]] && [[ -e "$brain_abs" ]]; then
      printf "${YELLOW}  warn${NC}  %s — exists at both source and brain, skipping\n" "$link_disp"
      errors=$((errors + 1))
      continue
    fi

    # If brain copy exists but link doesn't, just create symlink
    if [[ -e "$brain_abs" ]] && [[ ! -e "$link_abs" ]]; then
      _cmd "$link_abs" mkdir -p "$(dirname "$link_abs")"
      _cmd "$link_abs" ln -s "$brain_abs" "$link_abs"
      printf "${GREEN}  link${NC}  %s → %s\n" "$link_disp" "$brain_disp"
      created=$((created + 1))
      continue
    fi

    # Neither exists
    printf "${RED}  err ${NC}  %s — neither source nor brain copy exists\n" "$link_disp"
    errors=$((errors + 1))
  done < <(parse_conf)

  echo ""
  echo "Done: $created created, $skipped skipped, $errors errors ($count total)"
}

cmd_teardown() {
  local count=0 removed=0 skipped=0
  while IFS='|' read -r link_abs brain_abs link_disp brain_disp; do
    count=$((count + 1))

    if [[ -L "$link_abs" ]]; then
      _cmd "$link_abs" rm "$link_abs"
      # Restore the original file/dir from brain
      if [[ -e "$brain_abs" ]]; then
        _cmd "$link_abs" cp -a "$brain_abs" "$link_abs"
        printf "${RED}  rm  ${NC}  %s (restored from brain)\n" "$link_disp"
      else
        printf "${RED}  rm  ${NC}  %s (no brain copy to restore)\n" "$link_disp"
      fi
      removed=$((removed + 1))
    else
      printf "${DIM}  skip${NC}  %s (not a symlink or doesn't exist)\n" "$link_disp"
      skipped=$((skipped + 1))
    fi
  done < <(parse_conf)

  echo ""
  echo "Done: $removed removed, $skipped skipped ($count total)"
}

cmd_status() {
  local ok=0 broken=0 missing=0
  while IFS='|' read -r link_abs brain_abs link_disp brain_disp; do
    if [[ -L "$link_abs" ]]; then
      local actual
      actual="$(readlink "$link_abs")"
      if [[ "$actual" == "$brain_abs" ]] && [[ -e "$link_abs" ]]; then
        printf "${GREEN}  ✓${NC}  %s → %s\n" "$link_disp" "$brain_disp"
        ok=$((ok + 1))
      elif [[ "$actual" == "$brain_abs" ]]; then
        printf "${RED}  ✗${NC}  %s → %s (target missing)\n" "$link_disp" "$brain_disp"
        broken=$((broken + 1))
      else
        printf "${YELLOW}  ?${NC}  %s → %s (expected %s)\n" "$link_disp" "$actual" "$brain_disp"
        broken=$((broken + 1))
      fi
    elif [[ -e "$link_abs" ]]; then
      printf "${YELLOW}  !${NC}  %s exists but is not a symlink\n" "$link_disp"
      broken=$((broken + 1))
    else
      printf "${DIM}  -${NC}  %s (not created)\n" "$link_disp"
      missing=$((missing + 1))
    fi
  done < <(parse_conf)

  echo ""
  echo "Status: $ok ok, $broken issues, $missing not created"
}

cmd_verify() {
  local all_ok=true
  while IFS='|' read -r link_abs brain_abs link_disp brain_disp; do
    if [[ -L "$link_abs" ]] && [[ "$(readlink "$link_abs")" == "$brain_abs" ]] && [[ -e "$link_abs" ]]; then
      continue
    else
      all_ok=false
      break
    fi
  done < <(parse_conf)

  if $all_ok; then
    echo "All symlinks verified ✓"
    exit 0
  else
    echo "Symlink verification failed — run 'system/symlinks/mbp-m4max-16/symlinks.sh status' for details"
    exit 1
  fi
}

# Dispatch
case "${1:-}" in
  setup)    cmd_setup ;;
  teardown) cmd_teardown ;;
  status)   cmd_status ;;
  verify)   cmd_verify ;;
  *)
    echo "Usage: system/symlinks/mbp-m4max-16/symlinks.sh {setup|teardown|status|verify}"
    exit 1
    ;;
esac
