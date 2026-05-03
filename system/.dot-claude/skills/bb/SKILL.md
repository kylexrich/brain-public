---
name: bb
description: "Sync AI config, commit the brain repo, export the public mirror, and optionally commit `brain-public`. Use when Kyle says 'sync brain', 'commit beliefs', 'save beliefs', or after creating/editing beliefs and sources. Does NOT push unless Kyle explicitly asks to push."
---

# Brain Sync

Sync AI config into `~/Developer/brain/`, commit the private repo, export the public mirror into `~/Developer/brain-public/`, and commit the public repo if it changed. Push only if explicitly requested.

## Workflow

1. Sync AI config: `brain repo sync-ai`
2. Run `git -C ~/Developer/brain status` to see what changed.
3. If no changes, tell Kyle and stop.
4. Stage all changes: `git -C ~/Developer/brain add -A`
5. Review the diff: `git -C ~/Developer/brain diff --cached --stat`
6. Write a commit message:
   - **Title:** `<type>(<scope optional>): <short description>` — imperative mood, ~50–72 chars
   - **Types:** `add` · `update` · `fix` · `sync` · `remove` · `chore`
   - **Scopes:** `vault` · `beliefs` · `sources` · `skills` · `config` · `pipeline` · `memory`
   - **Body:** 2–6 bullets covering the main themes. Include why/impact when not obvious. No blank lines between bullets.
   - Use a heredoc so bullets stay clean (no multiple `-m` flags):

   ```bash
   cat <<'EOF' | git -C ~/Developer/brain commit -F -
   <type>(<scope>): <short description>

   - <primary change 1>
   - <primary change 2>
   - <why/impact if unclear>
   EOF
   ```

   Examples:
   ```
   add(beliefs): win-win negotiation framework
   sync(config): skills, hooks, and scheduled tasks
   update(pipeline): Apr 8 stream outputs and chapters
   ```
7. Commit using the heredoc approach above.
8. Export the public mirror: `brain repo export-public`
9. Run `git -C ~/Developer/brain-public status` to see whether the public mirror changed.
10. If `brain-public` has no changes, confirm the private commit to Kyle and stop.
11. **Leak audit — review what's going public BEFORE staging.** Run `git -C ~/Developer/brain-public status` and `git -C ~/Developer/brain-public diff` and walk every changed file (especially new files and unfamiliar paths). For each one, ask: *would Kyle hand this file to a stranger?* Treat these as red flags requiring a human-readable justification before they're allowed through:
    - Anything in a folder named `state/`, `memory/`, `cache/`, `logs/`, `tmp/`, `.local/`, `attachments/`, or `secrets/`
    - Files with names like `*-history.json`, `*-state.json`, `<chat>.json`, `MEMORY.md`, `*.log`, `*.env`, `credentials.*`, `tts-settings.json`, `jobs.json`
    - Files containing chat IDs, phone numbers, real email addresses (other than `kyle@emlyai.ca` or `kylexrich@gmail.com` in canonical config), iMessage GUIDs, API keys, OAuth tokens, names of private contacts, verbatim message text
    - New skill subdirs added by skills you don't recognize — open the SKILL.md and check whether any of its referenced files contain runtime state
    - Verbatim transcripts, meeting notes, or anything that names third parties
12. **If anything in step 11 shouldn't be public**, do NOT stage. Instead:
    1. Update `.public-export.json` in the private repo — add an `exclude` glob, a `sanitize` rule (with a matching `verify` rule), or move the file under a path that the existing convention already excludes (e.g. `system/.dot-claude/skills/<name>/state/...` is excluded by the `skills/*/state/**` rule).
    2. If you moved/renamed source files, commit that fix to the private repo first (a follow-up `chore(config): tighten public export` commit is fine, or amend by creating a new commit on top — never `--amend`).
    3. Re-run `brain repo export-public`.
    4. Re-run `git -C ~/Developer/brain-public status` and confirm the offending paths are gone from the working tree.
    5. Loop back to step 11 until the audit comes up clean.
13. Stage all public mirror changes: `git -C ~/Developer/brain-public add -A`
14. Review the public diff: `git -C ~/Developer/brain-public diff --cached --stat`
15. Write a public-safe commit message based only on the exported diff:
    - Use the same title/body format as the private repo.
    - Describe only files that exist in `brain-public`.
    - Never mention private-only files or withheld content.
16. Commit `brain-public` using the heredoc approach above, swapping the repo path to `~/Developer/brain-public`.
17. Confirm both commits to Kyle. **Do NOT push unless Kyle explicitly asks.**

## Pushing

Only push when Kyle explicitly says to push (e.g., "push brain", "push it", "push to origin").
When pushing is explicitly requested, treat `~/Developer/brain/` and `~/Developer/brain-public/` as separate repos and push each one deliberately.
