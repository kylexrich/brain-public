---
name: inplace-task
description: Run a rigorous task pipeline in the current working directory (no git worktree) — chain $task-planning → $validate-task (with N parallel sub-agents) → $provider-contract-verification → $doc-alignment (pre-execution) → $phase-loop → final $doc-alignment. Use when the user asks for the full validated planning + execution workflow but explicitly does NOT want worktree isolation (e.g., "do this in place", "no worktree", "on the current branch", "same workflow as worktree-task but here"), or for any plan-then-execute request that should land as one commit per plan phase (single-phase plans land as 1 commit; multi-phase rollouts land as N commits in plan order) directly on the active branch.
---

# Inplace Task

## Overview

A thin delegator that wraps the rigorous task pipeline **without** the worktree isolation or rebase-onto-dev steps from `$worktree-task` (`/worktree-task`). Same planning, validation, provider-contract, doc-alignment, and phase-loop machinery — just run in the current working directory on the active branch. Use when the user wants the heavy validated workflow but has explicitly opted out of worktree isolation.

All real work is done by the wrapped skills — this skill only sequences them and locks in the heavy-validation + one-commit-per-plan-phase conventions.

## Inputs

- A task description, objective, or link to a spec — same shape `$task-planning` (`/task-planning`) accepts.
- **`sub_agents`** (optional, integer): number of parallel sub-agents to dispatch in Step 2. **Defaults to `2`** when not specified. Treat any value the user mentions ("with 4 sub-agents", "use 6 agents", "extensively with 4+") as the override.

## Workflow

1. Run the `$task-planning` (`/task-planning`) skill to produce the context, steps guide, and steps documents. If the rollout doc gate fires (see `docs/rollout/AGENTS.md`), the plan groups steps into phases.
2. Run the `$validate-task` (`/validate-task`) skill — dispatch **`sub_agents` parallel sub-agents** (default `2`, override with the input above), each scoped to an independent slice of the validation checklist (e.g., codebase / technical accuracy, completeness + logical correctness, external research + best practices, risks + missing details + edge cases). Resolve every issue surfaced before moving on.
3. Run a blocking external provider contract gate for any third-party API touched by the task:
   - Run or verify the `$provider-contract-verification` (`/provider-contract-verification`) skill.
   - Do not proceed to Step 4 until provider response shapes used by code are proven and encoded in tests or fixtures with exact observed casing.
4. Run the `$doc-alignment` (`/doc-alignment`) skill against the planned documentation impact before execution, so missing current-doc work is folded into the plan before implementation.
5. Run the `$phase-loop` (`/phase-loop`) skill to execute the full plan and land commits at plan phase boundaries:
   - **Single-phase plan** (no rollout doc gate fired in Step 1): `$phase-loop` produces exactly **1 commit** containing all of the work. This is the 99% case.
   - **Multi-phase plan** (rollout doc gate fired): `$phase-loop` produces **N commits**, one per plan phase, in plan order. Each phase commit contains the code changes, migration files, backfill scripts, cleanup scripts, and rollout-doc updates for that phase. The rollout doc itself is authored by plan steps during this loop and is complete by the time the final phase commit lands.
   - In either case, the AI prepares the commit chain only; it does **not** run deploys, run migrations or backfills in production, or make any external-system changes (AWS Secrets Manager, Stripe, etc.). The human operator performs the rollout afterward by checking out each commit in order and following `docs/rollout/<slug>.md`. See `docs/rollout/AGENTS.md` "Roles and execution model" and the root `AGENTS.md` [STRICT] rule "No Deployments (AI Only)".
6. Run a final `$doc-alignment` (`/doc-alignment`) pass against all current-doc source-of-truth areas touched by the completed task. Exclude `docs/tasks/` and `docs/rollout/` except for the active task/rollout artifacts that were edited. If this pass produces fixes, fold them into the appropriate phase commit before finishing.

## Guardrails

- Treat every wrapped skill as authoritative for its own behavior — do not duplicate or restate their workflows here.
- Step 2's sub-agent count comes from the `sub_agents` input. If the user did not specify, default to **2**. The sub-agents must run in parallel; running them sequentially defeats the purpose.
- All steps run in the **current working directory on the active branch** — do not silently create a worktree, switch branches, or stash work. Run wherever the user invoked the skill; do not gate on branch name.
- Step 5's `$phase-loop` is the only producer of commits during execution. It commits at plan phase boundaries — once for single-phase plans (the 99% default), N times for multi-phase rollouts. Do not call `$commit` directly from this skill; `$phase-loop` owns commit timing.
- Do not bypass `$phase-loop`/`$commit` with direct `git commit` commands. Phase commits must use `$commit`'s full title/body format, including staged-only mode when the active worktree contains unrelated user changes.
- **No rebase step.** Unlike `$worktree-task`, this skill does not rebase onto `dev` at the end. The active branch's relationship to `dev` is the user's to manage. Never push.
- If a wrapped skill fails or surfaces a blocker that needs a user decision, stop and ask — do not skip the failed skill or substitute a lighter-weight one.
- If mid-execution the task turns out to need worktree isolation (e.g., concurrent work on the same files, risky migrations, long-running rollout), stop and recommend escalating to `$worktree-task` (`/worktree-task`).
