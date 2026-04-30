---
name: brain-sync
description: "Sync skills into the brain repo and commit all changes. Use when Kyle says 'sync brain', 'commit beliefs', 'save beliefs', or after creating/editing beliefs and sources. Does NOT push unless Kyle explicitly asks to push."
---

# Brain Sync

Sync skills into `~/Developer/brain/` and commit all changes. Push only if explicitly requested.

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
8. Confirm the commit to Kyle. **Do NOT push unless Kyle explicitly asks.**

## Pushing

Only push (`git -C ~/Developer/brain push origin`) when Kyle explicitly says to push (e.g., "push brain", "push it", "push to origin").
