#!/bin/bash
# SessionStart hook — injects brain env vars and PATH into Claude Code sessions.

BRAIN_ROOT="${BRAIN_ROOT:-$HOME/Developer/brain}"
ENV_FILE="$BRAIN_ROOT/system/zshrc/.env"

if [[ -n "$CLAUDE_ENV_FILE" && -r "$ENV_FILE" ]]; then
  # Extract only active export lines; skip comments, blank lines, and any PATH
  # exports (PATH is injected explicitly below using the safe echo pattern).
  grep '^export ' "$ENV_FILE" | grep -v '^export PATH=' >> "$CLAUDE_ENV_FILE"

  # Add brain CLI to PATH. Single-quoted so $HOME and $PATH expand in the target
  # shell at source time — not here in the hook where expansion could be wrong.
  echo 'export BRAIN_ROOT="${BRAIN_ROOT:-$HOME/Developer/brain}"' >> "$CLAUDE_ENV_FILE"
  echo 'export PATH="$BRAIN_ROOT/cli/bin:$PATH"' >> "$CLAUDE_ENV_FILE"
fi

exit 0
