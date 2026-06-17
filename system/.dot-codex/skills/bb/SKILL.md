---
name: bb
description: "Sync AI config, commit the brain repo, export the public mirror, and optionally commit `brain-public`. Use when Kyle says 'sync brain', 'commit beliefs', 'save beliefs', or after creating/editing beliefs and sources. Does NOT push unless Kyle explicitly asks to push."
---

# Brain Sync

Sync AI config into `~/Developer/brain/`, commit the private repo, export the public mirror into `~/Developer/brain-public/`, and commit the public repo if it changed. Push only if explicitly requested.

## Workflow

1. Sync AI config: `brain repo sync-ai`
2. **Stage everything in the private repo — unconditional. Do this before any status read.**

   ```bash
   git -C ~/Developer/brain add -A
   ```

   Never assume a prior session staged what you need. Never read `git status` first and decide staging is unnecessary because content already appears under "Changes to be committed" — that section reflects a snapshot, not the full working tree, and the unstaged + untracked sections come **after** it. Skipping this step has previously caused commits to silently miss work.
3. **Verify the working tree is fully captured.** Run all three together — they must all succeed:

   ```bash
   git -C ~/Developer/brain diff --quiet \
     && [ -z "$(git -C ~/Developer/brain ls-files --others --exclude-standard)" ] \
     && echo "✓ tree fully staged" \
     || echo "✗ unstaged or untracked content remains — STOP and investigate"
   ```

   If you see `✗`, stop. Do not commit. Investigate the leftover paths before continuing.
4. If `git -C ~/Developer/brain diff --cached --quiet` exits 0 (nothing staged), tell Kyle there's nothing to commit and stop.
5. **Sanity-scan what's about to be committed:** `git -C ~/Developer/brain diff --cached --stat`
   - Read the FULL list. Never pipe to `head`/`tail`/`| less | quit-early` — important entries (especially stray dev files surfacing as new additions) can sit anywhere in the diff.
   - Look for files that don't belong: ad-hoc scripts at the repo root (`mock_*.py`, `scratch.*`, `tmp_*`), debugger output, editor swap files, IDE config, oversized binaries, accidental `node_modules`. If anything looks out of place, unstage it with `git -C ~/Developer/brain restore --staged <path>` and ask Kyle before continuing.
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

    **First check — net-new paths in the mirror.** Any path appearing in `brain-public` that wasn't there before must be a path you (or Kyle) consciously allowlisted, not an accidental inclusion from a too-broad glob. For every new directory/file: open the source, confirm what it actually contains, and confirm that publishing it is what Kyle would want. If the path was previously **excluded** from the allowlist, treat that as a deliberate decision and do not re-include it without explicit Kyle confirmation — even if the file looks superficially benign. Past exclusions encode privacy intent that grep can't always detect.

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
13. **Stage everything in the public mirror — unconditional, same rule as step 2:** `git -C ~/Developer/brain-public add -A`
14. **Verify the public working tree is fully captured** (same paired check as step 3, against `~/Developer/brain-public`):

    ```bash
    git -C ~/Developer/brain-public diff --quiet \
      && [ -z "$(git -C ~/Developer/brain-public ls-files --others --exclude-standard)" ] \
      && echo "✓ public tree fully staged" \
      || echo "✗ unstaged or untracked content remains — STOP and investigate"
    ```
15. Review the public diff: `git -C ~/Developer/brain-public diff --cached --stat`
16. Write a public-safe commit message based only on the exported diff:
    - Use the same title/body format as the private repo.
    - Describe only files that exist in `brain-public`.
    - Never mention private-only files or withheld content.
17. Commit `brain-public` using the heredoc approach above, swapping the repo path to `~/Developer/brain-public`.
18. Confirm both commits to Kyle. **Do NOT push unless Kyle explicitly asks.**

## Leak discovered AFTER commit, BEFORE push

**This overrides the global "never `--amend`" rule.** `brain-public` history is publicly visible the moment it's pushed; a forward-fix commit on top of a leaky commit leaves the leak permanently in the public commit graph with a tombstone pointing right at it. Anyone reading the diff between the leaky commit and the fix commit sees exactly what was meant to stay private. **A follow-up "remove the leaky thing" commit is wrong.**

If a leak is identified in `brain-public` (or in the `.public-export.json` allowlist on the `brain` side) after `git commit` but before `git push`, fix history in place:

1. Identify the offending commit and how many commits back it is from `HEAD`.
2. Confirm `git rev-parse origin/main` is at or behind that commit on the affected repo. If `origin/main` is at or past the leaky commit, **stop** — it's already pushed, and recovery requires a force-push conversation with Kyle. Do not proceed silently.
3. Fix the underlying allowlist / sanitize / exclude rule in the private repo first if the leak came from `.public-export.json`. Re-run `brain repo export-public`.
4. Rewrite history on the affected repo. Two safe shapes:
   - **One leaky commit, no follow-up yet:** `git -C <repo> commit --amend` after restaging the corrected working tree.
   - **Leaky commit + follow-up "fix" commit already exist:** `git -C <repo> reset --soft HEAD~N` to roll back to the parent of the leaky commit (where N covers both the leaky and any follow-up fix commits), then commit once with a clean message that describes only what should have been there.
5. Verify the leak is gone from `git log --all -p` for the affected paths.
6. Apply the same rewrite to the private repo too if it carried a corresponding `.public-export.json` mistake — keeps the two repos' narratives consistent and avoids a stale "fix" commit on the private side referencing a leak that no longer exists publicly.

## Pushing

Only push when Kyle explicitly says to push (e.g., "push brain", "push it", "push to origin").
When pushing is explicitly requested, treat `~/Developer/brain/` and `~/Developer/brain-public/` as separate repos and push each one deliberately.
