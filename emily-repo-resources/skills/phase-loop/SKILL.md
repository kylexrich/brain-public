---
name: phase-loop
description: Use when executing a task plan that needs to land with commits aligned to plan-level phases (one commit per phase). Primarily used by `$worktree-task` to commit at phase boundaries; works uniformly for single-phase plans (1 commit) and multi-phase rollouts (N commits).
---

# Phase Loop

## Overview

Execute a full task plan by running `$step-execution` (`/step-execution`) on every step in dependency order, and committing once at each plan-level phase boundary. The plan's `Phase` column in the steps guide step index and per-step `**Phase:**` metadata are the source of truth for commit boundaries.

- **Single-phase plan** (no rollout doc gate fired in `$task-planning`): all steps belong to one implicit phase (Phase 1) → **1 commit** when the plan completes. This is the 99% case.
- **Multi-phase plan** (rollout doc gate fired in `$task-planning`): N phases → **N commits**, one per phase boundary, in plan order.

The model is uniform: every plan has at least one phase, and phase-loop produces exactly one commit per phase.

## Inputs

- **Any task document path** (`*-steps-guide.md`, `*-steps-<range>.md`, or `*-context.md`). The path is only a starting point for locating the full task folder and all related docs.

## Workflow

1. Resolve the task folder from the provided path and load:
   - the context document
   - the steps guide (if present)
   - all steps documents in that folder
2. Identify step order, dependencies, completion status, and **phase membership**:
   - If the steps guide has a `Phase` column and/or steps carry a `**Phase:**` metadata field, partition steps by phase using those values.
   - If no phase metadata is present (single-deploy task), treat the entire plan as a single implicit phase (Phase 1).
3. For each phase, in phase order:
   - Loop through every incomplete step in that phase, in dependency order:
     - Run the `$step-execution` (`/step-execution`) skill for that step.
     - Ensure `$doc-alignment` (`/doc-alignment`) has run for the affected current-doc scope before the step is marked complete.
     - Update the steps guide index and the steps doc metadata/checklists for that step.
     - **Do NOT commit between steps within a phase.** Commits happen at the phase boundary only. (See `STEPS_TEMPLATE.md`'s **OVERRIDE 2** clause for the canonical wording that applies to per-step checklists.)
   - When every step in the current phase is complete, run a phase-boundary `$doc-alignment` (`/doc-alignment`) pass for the phase's affected current-doc scope, stage only that phase's intended files, then run the `$commit` (`/commit`) skill exactly once in staged-only mode. This produces that phase's commit.
   - Proceed to the next phase.
4. Run a final `$doc-alignment` (`/doc-alignment`) pass for all current source-of-truth docs touched by the completed task. Exclude historical `docs/tasks/` and `docs/rollout/` unless the active task or rollout artifact itself was edited. If this pass changes docs, fold the fix into the appropriate phase commit before finishing.
5. End-state: **one commit per phase**, in plan order, all landed end-to-end inside this session.

## Guardrails

- Treat the `$step-execution` (`/step-execution`) skill as the authoritative implementation process for each step.
- **Override `$step-execution`'s per-step commit prompt:** when steps are executed via `$phase-loop`, do NOT commit at the end of each step. Defer commits to the phase boundary. The step-doc `**OVERRIDE 2:**` clause explicitly allows for this.
- Within a phase, fully complete every step (including its review, doc-alignment, and CI checklist items), then run the phase-boundary `$doc-alignment` pass before running the phase's `$commit`. A phase commit must represent a coherent, working slice of the plan that could in theory be deployed alone.
- Direct `git commit`, `git commit -m`, or bare one-line commit creation inside `$phase-loop` is a process bug. `$phase-loop` owns commit timing only; `$commit` owns validation, message composition, and the actual commit command.
- **The AI prepares the commit chain in the worktree; the AI does NOT deploy any phase.** The human operator checks out each commit in order and performs the deploy + scripts + external-system changes per `docs/rollout/<slug>.md`. See `docs/rollout/AGENTS.md` "Roles and execution model" and the root `AGENTS.md` [STRICT] rule "No Deployments (AI Only)".
- If a step reveals a significant blocker that requires a user decision, stop and ask. Otherwise, use best judgment and continue.

## Relationship to other loop skills

- `$step-loop` (`/step-loop`): one commit **per step**. Use when you want a fine-grained, step-by-step commit history. **Not used by `$worktree-task`.**
- `$phase-loop` (this skill): one commit **per phase**. Used by `$worktree-task` to land a plan as either a single commit (single-phase, 99% case) or as an ordered multi-commit chain (multi-phase rollout).

## Example inputs

- `docs/tasks/2026-02-26/issue-5-durable-queue-webhook-runtime-duplication/issue-5-durable-queue-webhook-runtime-duplication-context.md`
- `docs/tasks/2026-02-26/issue-5-durable-queue-webhook-runtime-duplication/issue-5-durable-queue-webhook-runtime-duplication-steps-guide.md`
