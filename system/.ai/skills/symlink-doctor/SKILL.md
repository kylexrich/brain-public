---
name: symlink-doctor
description: "Validate and fix broken symlinks from the brain repo manifest. Use when asked to check, validate, fix, or repair symlinks, after system updates, or when a config file has drifted from the brain repo version."
user-invocable: true
allowed-tools:
  - Bash
  - Read
  - Write
---

# Symlink Doctor

Audit all symlinks declared in `system/symlinks/mbp-m4max-16/symlinks.conf`, fix any that are broken, and ensure the brain repo stays the source of truth for user configuration.

## Workflow

### 1. Check status

```bash
"$BRAIN_ROOT"/system/symlinks/mbp-m4max-16/symlinks.sh status
```

If all green, report "all healthy" and stop.

### 2. Diagnose broken entries

For each broken entry, determine the cause:

| Status | Meaning | Fix |
|--------|---------|-----|
| `!` exists but not a symlink | Live file has replaced the symlink (e.g., an app overwrote it) | Merge + re-symlink |
| `?` points to wrong target | Symlink target changed | Remove and recreate |
| `-` not created | Symlink was never set up | Run setup |
| `✗` target missing | Brain-side file was deleted | Investigate — recreate brain copy if needed |

### 3. Fix: merge + re-symlink (most common)

When a live file exists as a regular file instead of a symlink (the `!` case):

1. **Back up the live file:**
   ```bash
   cp <live_path> <live_path>.bak
   ```

2. **Compare the files.** For JSON files, use a script to diff keys and values:
   - Brain repo = source of truth for **user configuration** (settings, MCP servers, preferences you set intentionally)
   - Live file = source of truth for **runtime state** (counters, caches, session data, timestamps, feature flags)
   - If a key exists only in live and looks like a real user setting (not a counter/cache), pull it into brain

3. **Merge into the brain copy:**
   - Start with brain as the base
   - Overlay runtime/ephemeral fields from live (counters, caches, timestamps, session IDs)
   - Add any new user-configuration keys from live that brain is missing
   - For counters (e.g., `numStartups`, `tipsHistory`), take the higher value

4. **Replace live with symlink:**
   ```bash
   rm <live_path>
   ln -s <brain_abs_path> <live_path>
   ```

5. **Verify:**
   ```bash
   "$BRAIN_ROOT"/system/symlinks/mbp-m4max-16/symlinks.sh verify
   ```

### 4. Fix: missing or wrong target

For entries that just need (re)creation, run:

```bash
"$BRAIN_ROOT"/system/symlinks/mbp-m4max-16/symlinks.sh setup
```

The setup script handles creating missing symlinks and skips healthy ones.

### 5. Post-fix

After fixing, suggest running `$brain-sync` to commit the changes if brain-side files were modified during the merge.

## Merge Heuristics for JSON Config Files

Determining what's "user config" vs "runtime state":

- **User config** (brain wins): MCP servers, permissions, preferences, hooks, env vars, enabled plugins, settings the user deliberately set
- **Runtime state** (live wins): `numStartups`, `tipsHistory`, `promptQueueUseCount`, `btwUseCount`, `cachedStatsigGates`, `cachedGrowthBookFeatures`, `cachedDynamicConfigs`, `groveConfigCache`, `overageCreditGrantCache`, `passesEligibilityCache`, `lastReleaseNotesSeen`, `changelogLastFetched`, `lastPlanModeUse`, `projects` (session tracking), `skillUsage`
- **Ambiguous** (ask Kyle): anything that doesn't clearly fit either category
