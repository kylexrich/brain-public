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
11. **Leak audit — what's actually private?** Run `git -C ~/Developer/brain-public status` and `git -C ~/Developer/brain-public diff`, then walk the changed files. The brain repo is intentionally public; default is openness. Flag a file only if publishing it would expose something Kyle hasn't already chosen to publish, or third-party data he has no right to share. The bar is "actually exploitable or genuinely private," not "anything that looks like an identifier." Concretely:
    - **Secrets and credentials.** `.env`, `credentials.*`, API keys, OAuth tokens, refresh tokens, anything that grants access to a system if it leaks. Always private.
    - **Memory and agent-memory contents.** Top-level `MEMORY.md`, per-agent memory dirs, memsearch snapshots. Always private — they record what Kyle said in past sessions and what Marvin learned about people.
    - **Runtime state with third-party content.** A per-chat state file that captures who replied, what they said, or quotes message bodies — private. Generic Kyle-only state (his music listening history, his own preferences) — fine.
    - **Detailed profiles of specific third parties.** Personality write-ups, ethnicity, addresses, incidents involving named individuals, message-by-message dossiers. Names alone are fine; *who someone is* and *what they did* isn't.
    - **Verbatim conversation content.** iMessage transcripts, meeting transcripts, Fathom recordings, email bodies — anything that quotes a third party. Skill prose that uses first names in illustrative examples is fine; real captured exchanges aren't.
    - **What is NOT a red flag.** Chat IDs, BlueBubbles GUIDs, Messages.app GUIDs, SQLite ROWIDs (local pointers, not exploitable without Kyle's machine). Kyle's own phone number and emails (already canonical and intentional in skill descriptions). First names of friends/coworkers used in examples. Kyle's own listening/usage history. Don't waste audit cycles on these.
    - **When in doubt, ask:** "if a stranger had this file, what could they actually do with it, or what would they learn about a third party that Kyle hasn't chosen to publish?" If the answer is "nothing meaningful," let it through.
12. **If anything in step 11 is genuinely private**, do NOT stage. Instead:
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
