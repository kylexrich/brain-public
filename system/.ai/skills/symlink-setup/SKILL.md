---
name: symlink-setup
description: "Use when asked about the brain repo symlink setup, when adding a new symlink, or when moving a config file into the brain repo. Explains the architecture and the required steps to add new entries."
---

# Symlink Setup

Kyle's brain repo (`$BRAIN_ROOT`) is the source of truth for all user configuration. Symlinks from home directory config locations point into the repo so edits are automatically tracked in git.

## Architecture

- **Manifest:** `system/symlinks/mbp-m4max-16/symlinks.conf`
- **Script:** `system/symlinks/mbp-m4max-16/symlinks.sh`
- **Format:** `LINK_PATH  BRAIN_PATH` (brain path is relative to repo root)

The manifest currently covers Claude Code, Claude Desktop, and OpenAI Codex configs.

## Adding a New Symlink

Always follow both steps — never create a symlink without adding it to the manifest.

### Step 1 — Add to the manifest

Append a line to `system/symlinks/mbp-m4max-16/symlinks.conf`:

```
~/.example/config.json    system/example-config/config.json
```

- `LINK_PATH` is the absolute path where the symlink will live (use `~` for home).
- `BRAIN_PATH` is relative to `$BRAIN_ROOT`.
- If the brain-side directory doesn't exist yet, create it and move/copy the file there first.

### Step 2 — Run setup

```bash
system/symlinks/mbp-m4max-16/symlinks.sh setup
```

The script handles all cases:
- **Only live file exists** → moves it to brain, creates symlink
- **Only brain copy exists** → creates symlink
- **Both exist** → warns and skips (merge manually first, then remove the live copy)
- **Neither exists** → errors
- **Already linked** → skips

For paths outside `$HOME` (e.g., `~/Library/Application Support/...`), the script uses `sudo` automatically.

## Management Commands

```bash
symlinks.sh setup     # Create all symlinks (skip existing)
symlinks.sh teardown  # Remove symlinks, restore files from brain
symlinks.sh status    # Show current state of all managed symlinks
symlinks.sh verify    # Exit 0 if all links correct, exit 1 otherwise
```

## Rules

- **Never** create a symlink without adding it to the manifest first.
- **Never** edit the live file path directly to add symlinks — always go through the conf + script.
- Brain repo is the source of truth for user configuration content.
- If a file exists at both the live path and brain path, merge them before symlinking (use `$symlink-doctor` for this).
