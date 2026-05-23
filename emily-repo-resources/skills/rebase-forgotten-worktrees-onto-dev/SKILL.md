---
name: rebase-forgotten-worktrees-onto-dev
description: Walk every git worktree, find the ones with commits inside a user-specified time range whose tips aren't already in `dev`'s history, and rebase each onto the latest local `dev` tip via the $rebase skill. Use whenever the user asks to "rebase forgotten worktrees", "catch up old / stale worktrees onto dev", "rebase any worktrees I left behind in the last <X>", or wants to clean up worktrees that drifted while ignored. Requires a time-range input (e.g., "5 hours", "2 days", "7 days").
---

# Rebase Forgotten Worktrees onto Dev

## Overview

Discovery + orchestration only. Lists every worktree attached to the repo, filters to the ones that had commits inside the given time range and whose tips aren't already in `dev`'s history, and rebases each survivor onto the current local `dev` tip. The actual rebase + conflict resolution is delegated to the `$rebase` (`/rebase`) skill — this skill does not duplicate that logic.

## Inputs

- **`time_range`** (required, string): how far back to scan for worktree commits. Accepts anything `git log --since=<expr>` understands — e.g., `"5 hours"`, `"2 days"`, `"7 days"`, `"3 weeks"`, an ISO timestamp. If the user hasn't given one, ask before proceeding — there is no safe default.

## Workflow

1. **Resolve dev's tip.** `DEV_SHA=$(git rev-parse dev)`. If `dev` does not exist locally, stop and surface that — this skill is dev-anchored.
2. **Enumerate worktrees.** `git worktree list --porcelain`. Parse each entry's `worktree` (absolute path) and `branch` (`refs/heads/<name>`, or absent for detached HEAD).
3. **Per worktree, decide whether it's a candidate:**
   - Skip the worktree whose branch is `dev` itself — that's the rebase target, not a candidate.
   - Skip worktrees with detached HEAD — no branch to rebase.
   - Skip if the path no longer exists on disk (prunable entries).
   - Check the time-range filter: `git -C <worktree-path> log -1 --since="<time_range>" --format=%H` — if empty, no commits landed in that window, skip.
   - Check whether the work is already in dev: `WT_SHA=$(git -C <worktree-path> rev-parse HEAD)`. If `git merge-base --is-ancestor "$WT_SHA" "$DEV_SHA"` succeeds, the tip is already part of dev's history — skip (already integrated).
   - Check whether the committed branch tree has no effective diff from dev: if `git -C <worktree-path> status --porcelain` is empty and `git -C <worktree-path> diff --quiet "$DEV_SHA" "$WT_SHA" --` succeeds, skip as `no diff from dev` even when `WT_SHA` is not an ancestor of `DEV_SHA` (for example, duplicate commits already landed on dev through another branch). If the worktree is dirty, defer this decision until after dirty normalization.
   - Anything that survives these filters is a "forgotten" worktree.
4. **Normalize dirty candidate worktrees before rebasing.** For each survivor:
   - Inspect `git -C <worktree-path> status --porcelain` and `git -C <worktree-path> diff --stat`.
   - Ignore accidental generated agent-instruction churn: changes limited to `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md` files whose diffs only reflect worktree-local path rewrites, generated precedence-header/sync noise, or equivalent path replacement artifacts. Do not commit or amend those changes; restore only those verified accidental files before proceeding. If an instruction file contains substantive human-authored rule changes, treat it as meaningful work instead.
   - If meaningful dirty changes remain and the branch has commits in `FORK..HEAD`, stage only meaningful changes and amend the current branch tip with `git commit --amend --no-edit`.
   - If meaningful dirty changes remain and the branch has no commits in `FORK..HEAD`, stage only meaningful changes and create exactly one commit before rebasing. Infer a concise commit message from the changed files; if the intent is unclear, use `chore: Capture worktree changes before rebase`.
   - Recompute `WT_SHA`, `FORK`, and candidate status after any amend or capture commit so the rebase summary reports the normalized old HEAD.
   - After normalization, run the no-diff check again. If `git diff --quiet "$DEV_SHA" "$WT_SHA" --` succeeds, skip as `no diff from dev`; do not invoke `$rebase` for that worktree and do not report it as a rebased change.
   - If dirty changes cannot be confidently classified or staged without including accidental instruction churn, stop on that worktree and report it as blocked.
5. **Rebase each forgotten worktree.** For each survivor:
   - Operate inside that worktree (switch the session into it, or run subsequent commands with `git -C <worktree-path>` — whichever the host environment supports).
   - Run the `$rebase` (`/rebase`) skill with `$DEV_SHA` as the target SHA (the rebase skill requires a SHA, not a branch name).
   - Record the old HEAD → new HEAD for the final summary.
   - Record the human-readable change set from `FORK..old HEAD`: commit subjects, feature areas, commits that became empty or were skipped as already superseded by `dev`, and any non-trivial conflict-resolution decisions from the `$rebase` skill.
   - After the rebase, check `git diff --quiet "$DEV_SHA" HEAD --`. If it succeeds, classify the worktree as `no diff from dev after rebase` rather than a meaningful rebased change. Include it only in the skipped/no-op section.
6. **Report.** End with a concise final report that includes:
   - A 3-4 sentence change summary written for the user, explaining only meaningful work rebased onto local `dev`, worktrees excluded as no-diff/superseded, and any blockers or validation issues.
   - A short bullet list of meaningful rebased change sets grouped by worktree or feature area. Do not list no-diff branches here. Do not only list SHAs; include the user-facing purpose of the commits being replayed.
   - Dirty worktree normalization performed, including ignored accidental instruction-file churn, amended commits, and one-off capture commits.
   - Worktrees scanned and skipped, grouped by reason (`dev`, detached, missing path, no commits in range, already in `dev`, no diff from `dev`, blocked).
   - Meaningful worktrees rebased with old SHA → new SHA, plus validation status for each.

## Guardrails

- Treat the `$rebase` (`/rebase`) skill as authoritative for the actual rebase and conflict resolution. Do not duplicate or restate its workflow.
- Anchor on **local `dev`** only — never `origin/dev`, never `main`. Never push.
- Process one worktree at a time. If `$rebase` surfaces a blocker on one, stop and ask the user before moving to the next — silently skipping a conflicted worktree hides work.
- Do not discard dirty changes except for verified accidental generated `AGENTS.md`/`CLAUDE.md`/`GEMINI.md` churn described above.
