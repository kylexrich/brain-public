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
11. Stage all public mirror changes: `git -C ~/Developer/brain-public add -A`
12. Review the public diff: `git -C ~/Developer/brain-public diff --cached --stat`
13. Write a public-safe commit message based only on the exported diff:
   - Use the same title/body format as the private repo.
   - Describe only files that exist in `brain-public`.
   - Never mention private-only files or withheld content.
14. Commit `brain-public` using the heredoc approach above, swapping the repo path to `~/Developer/brain-public`.
15. Confirm both commits to Kyle. **Do NOT push unless Kyle explicitly asks.**

## Pushing

Only push when Kyle explicitly says to push (e.g., "push brain", "push it", "push to origin").
When pushing is explicitly requested, treat `~/Developer/brain/` and `~/Developer/brain-public/` as separate repos and push each one deliberately.
