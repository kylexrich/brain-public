---
name: worktree-simple-task
description: Run a lightweight, isolated task end-to-end — create a named git worktree off the current working dir, do whatever in-session investigation the task naturally needs (no formal $task-planning, no $validate-task, no sub-agents), execute the work, run final $doc-alignment, run a single $commit, then rebase onto the latest local `dev` tip if `dev` has moved forward. Use whenever the user wants the worktree + single-commit + rebase-onto-dev hygiene without the heavy planning/validation pipeline for small or medium tasks where full $task-planning would be overkill.
---

# Worktree Simple Task

## Overview

A thin delegator that wraps a lightweight, isolated task pipeline. Same worktree + single-final-commit + rebase-onto-dev hygiene as `$worktree-task` (`/worktree-task`), but without the formal `$task-planning`, `$validate-task`, or `$phase-loop` machinery. Use for small or medium tasks where the AI's normal in-session investigation is sufficient and the work fits in a single commit.

## Inputs

- A task description, objective, or link to a spec — anything that describes what needs to get done.
- **Worktree name** (optional): a preferred name for the worktree. If omitted, derive one from the task slug.

## Workflow

1. Create a **named** git worktree off the current working dir (use whatever native worktree tooling is available; otherwise fall back to `git worktree add <path> -b <branch-name>`). Switch the session into it. **All** subsequent steps below run inside that worktree — never silently fall back to working on the base branch.
2. Do whatever lightweight investigation the task naturally needs in-session (read relevant files, search the codebase with `rg`, check existing patterns, look at adjacent tests). No formal planning doc, no sub-agents — just the normal in-session reasoning you would do before any task.
3. Execute the task end-to-end. Stay focused on what was asked; do not expand scope.
4. Run a final `$doc-alignment` (`/doc-alignment`) pass for all current source-of-truth docs touched by the task. Exclude historical `docs/tasks/` and `docs/rollout/` unless an active task or rollout artifact itself was edited.
5. Run the `$commit` (`/commit`) skill exactly once, to land all the work as a single coherent commit.
6. Rebase onto the latest local `dev` tip if `dev` has moved forward since the worktree was created (i.e., the worktree is now behind `dev`):
   - Resolve dev's tip: `DEV_SHA=$(git rev-parse dev)`.
   - If `git merge-base --is-ancestor "$DEV_SHA" HEAD` returns success, dev's tip is already in this branch's history — no rebase needed; skip.
   - Otherwise dev has moved forward: run the `$rebase` (`/rebase`) skill with `$DEV_SHA` as the target SHA (the rebase skill requires a SHA, not a branch name).

## Guardrails

- Treat every wrapped skill as authoritative for its own behavior — do not duplicate or restate their workflows here.
- All steps after Step 1 run inside the worktree from Step 1.
- Only the Step 5 `$commit` lands a commit during execution. Step 6 may produce additional commits via `$rebase`'s normal conflict-resolution flow — that is expected.
- Step 6 rebases onto **local `dev`** specifically, not `origin/dev` or `main`. Never push.
- If `$commit` or `$rebase` surfaces a blocker that needs a user decision, stop and ask — do not skip the failed skill.
- If the task turns out mid-execution to be larger, riskier, or more cross-cutting than it first appeared, stop and recommend escalating to `$worktree-task` (`/worktree-task`) — which adds `$task-planning`, `$validate-task`, and `$phase-loop` — rather than soldiering through with this lightweight pipeline.
- This pipeline is **single-commit only**. If the task would require more than a single commit and a single deploy (the rollout doc gate fires — see `docs/rollout/AGENTS.md` for the criteria), stop and escalate to `$worktree-task` (`/worktree-task`) so a multi-phase plan + rollout doc can be authored and validated, and `$phase-loop` can land the commits in the correct order.
