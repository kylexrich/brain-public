---
name: worktree-task
description: Run a rigorous, isolated task pipeline end-to-end — create a named git worktree off the current working dir, then chain $task-planning → $validate-task (with N parallel sub-agents) → $provider-contract-verification → $phase-loop → final $doc-alignment → $rebase onto the latest local dev tip if dev has moved forward since the worktree was created. Use whenever the user asks for the full validated workflow, a "rigorous" or "thorough" task run, anything phrased as "do this in a worktree with planning + validation", or any plan-then-execute request that should land as one commit per plan phase (single-phase plans land as 1 commit; multi-phase rollouts land as N commits in plan order).
---

# Worktree Task

## Overview

A thin delegator that wraps the rigorous, isolated task pipeline. All real work is done by the wrapped skills — this skill only sequences them and locks in the worktree + heavy-validation + one-commit-per-plan-phase + rebase-onto-dev conventions.

## Inputs

- A task description, objective, or link to a spec — same shape `$task-planning` (`/task-planning`) accepts.
- **`sub_agents`** (optional, integer): number of parallel sub-agents to dispatch in Step 3. **Defaults to `2`** when not specified. Treat any value the user mentions ("with 4 sub-agents", "use 6 agents", "extensively with 4+") as the override.

  > **[Ultracode]** When running under ultracode (Claude Code only) and the user gave no explicit value, disregard the default of `2`: author a Workflow that swarms `$validate-task` (`/validate-task`) to the concurrency cap with adversarial + completeness verification (one verifier per checklist lens minimum). An explicit user value still wins, and the `2` default remains authoritative for all other agents and non-ultracode runs. See `{.ai,.claude,.codex}/skills/task-planning/references/ultracode-orchestration.md`.
- **Worktree name** (optional): a preferred name for the worktree. If omitted, derive one from the task slug.

## Workflow

1. Create a **named** git worktree off the current working dir (use whatever native worktree tooling is available; otherwise fall back to `git worktree add <path> -b <branch-name>`). Switch the session into it. **All** subsequent steps below run inside that worktree — never silently fall back to working on the base branch.
2. Run the `$task-planning` (`/task-planning`) skill to produce the context, steps guide, and steps documents. If the rollout doc gate fires (see `docs/rollout/AGENTS.md`), the plan groups steps into phases.
3. Run the `$validate-task` (`/validate-task`) skill — dispatch **`sub_agents` parallel sub-agents** (default `2`, override with the input above), each scoped to an independent slice of the validation checklist (e.g., codebase / technical accuracy, completeness + logical correctness, external research + best practices, risks + missing details + edge cases). Resolve every issue surfaced before moving on.
4. Run a blocking external provider contract gate for any third-party API touched by the task:
   - Run or verify the `$provider-contract-verification` (`/provider-contract-verification`) skill.
   - Do not proceed to Step 5 until provider response shapes used by code are proven and encoded in tests or fixtures with exact observed casing.
5. Run the `$doc-alignment` (`/doc-alignment`) skill against the planned documentation impact before execution, so missing current-doc work is folded into the plan before implementation.
6. Run the `$phase-loop` (`/phase-loop`) skill to execute the full plan and land commits at plan phase boundaries:
   - **Single-phase plan** (no rollout doc gate fired in Step 2): `$phase-loop` produces exactly **1 commit** containing all of the work. This is the 99% case.
   - **Multi-phase plan** (rollout doc gate fired): `$phase-loop` produces **N commits**, one per plan phase, in plan order. Each phase commit contains the code changes, migration files, backfill scripts, cleanup scripts, and rollout-doc updates for that phase. The rollout doc itself is authored by plan steps during this loop and is complete by the time the final phase commit lands.
   - In either case, the AI prepares the commit chain only; it does **not** run deploys, run migrations or backfills in production, or make any external-system changes (AWS Secrets Manager, Stripe, etc.). The human operator performs the rollout afterward by checking out each commit in order and following `docs/rollout/<slug>.md`. See `docs/rollout/AGENTS.md` "Roles and execution model" and the root `AGENTS.md` [STRICT] rule "No Deployments (AI Only)".
7. Run a final `$doc-alignment` (`/doc-alignment`) pass against all current-doc source-of-truth areas touched by the completed task. Exclude `docs/tasks/` and `docs/rollout/` except for the active task/rollout artifacts that were edited. If this pass produces fixes, fold them into the appropriate phase commit before rebasing.
8. Rebase onto the latest local `dev` tip if `dev` has moved forward since the worktree was created (i.e., the worktree is now behind `dev`):
   - Resolve dev's tip: `DEV_SHA=$(git rev-parse dev)`.
   - If `git merge-base --is-ancestor "$DEV_SHA" HEAD` returns success, dev's tip is already in this branch's history — no rebase needed; skip.
   - Otherwise dev has moved forward: run the `$rebase` (`/rebase`) skill with `$DEV_SHA` as the target SHA (the rebase skill requires a SHA, not a branch name). `$rebase` handles multi-commit worktrees cleanly, replaying each commit and resolving conflicts per commit.

## Guardrails

- Treat every wrapped skill as authoritative for its own behavior — do not duplicate or restate their workflows here.
- Step 3's sub-agent count comes from the `sub_agents` input. If the user did not specify, default to **2**. The sub-agents must run in parallel; running them sequentially defeats the purpose.
- Steps 2-8 all run inside the worktree from Step 1.
- Step 6's `$phase-loop` is the only producer of commits during execution. It commits at plan phase boundaries - once for single-phase plans (the 99% default), N times for multi-phase rollouts. Do not call `$commit` directly from this skill; `$phase-loop` owns commit timing.
- Step 8 may produce additional commits via `$rebase`'s normal conflict-resolution flow - that is expected.
- Step 8 rebases onto **local `dev`** specifically, not `origin/dev` or `main`. Never push.
- If a wrapped skill fails or surfaces a blocker that needs a user decision, stop and ask — do not skip the failed skill or substitute a lighter-weight one.
