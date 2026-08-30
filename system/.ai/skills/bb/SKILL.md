---
name: bb
description: "Sync AI config and commit the private Brain repository. Use when Kyle says 'sync brain', 'commit beliefs', 'save beliefs', or after creating or editing beliefs and sources. Public mirror export and commit are off by default and run only when Kyle explicitly requests a public sync or export. Does not push unless Kyle explicitly asks to push."
---

# Brain Sync

Sync AI config and commit the private Brain repository. Public mirror publication is a separate, opt-in phase owned by `$brain-public-export`.

## Workflow

1. Sync AI config: `brain repo sync-ai`
2. **Stage everything in the private repo — unconditional. Do this before any status read.**

   ```bash
   git -C "$BRAIN_ROOT" add -A
   ```

   Never assume a prior session staged what you need. Never read `git status` first and decide staging is unnecessary because content already appears under "Changes to be committed" — that section reflects a snapshot, not the full working tree, and the unstaged + untracked sections come **after** it. Skipping this step has previously caused commits to silently miss work.
3. **Verify the working tree is fully captured.** Run all three together — they must all succeed:

   ```bash
   git -C "$BRAIN_ROOT" diff --quiet \
     && [ -z "$(git -C "$BRAIN_ROOT" ls-files --others --exclude-standard)" ] \
     && echo "✓ tree fully staged" \
     || echo "✗ unstaged or untracked content remains — STOP and investigate"
   ```

   If you see `✗`, stop. Do not commit. Investigate the leftover paths before continuing.
4. If `git -C "$BRAIN_ROOT" diff --cached --quiet` exits 0 (nothing staged), tell Kyle there's nothing to commit and stop.
5. **Sanity-scan what's about to be committed:** `git -C "$BRAIN_ROOT" diff --cached --stat`
   - Read the FULL list. Never pipe to `head`/`tail`/`| less | quit-early` — important entries (especially stray dev files surfacing as new additions) can sit anywhere in the diff.
   - Look for files that don't belong: ad-hoc scripts at the repo root (`mock_*.py`, `scratch.*`, `tmp_*`), debugger output, editor swap files, IDE config, oversized binaries, accidental `node_modules`. If anything looks out of place, unstage it with `git -C "$BRAIN_ROOT" restore --staged <path>` and ask Kyle before continuing.
6. Write a commit message:
   - **Title:** `<type>(<scope optional>): <short description>` — imperative mood, ~50–72 chars
   - **Types:** `add` · `update` · `fix` · `sync` · `remove` · `chore`
   - **Scopes:** `vault` · `beliefs` · `sources` · `skills` · `config` · `pipeline` · `memory`
   - **Body:** 2–6 bullets covering the main themes. Include why/impact when not obvious. No blank lines between bullets.
   - Use a heredoc so bullets stay clean (no multiple `-m` flags):

   ```bash
   cat <<'EOF' | git -C "$BRAIN_ROOT" commit -F -
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
8. Stop after the private commit by default. Invoke `$brain-public-export` with the `export-and-commit` operation only when Kyle explicitly requests a public sync, export, or commit in the active instruction. Do not infer public-export authorization from `$bb`, "sync brain," "commit beliefs," "save beliefs," or a prior default. When explicitly authorized, pass the private commit SHA and relevant source context; do not reproduce, weaken, or shortcut the public/private policy or audit workflow here.
9. Report the private commit and, only when explicitly requested, the delegated public result. Push the private repository only when Kyle explicitly asks; `$brain-public-export` owns any public push.
