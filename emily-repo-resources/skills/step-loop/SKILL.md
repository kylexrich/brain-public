---
name: step-loop
description: Iterate through every step in a task steps guide (or its sibling context document) and execute the full plan end-to-end by delegating each step to the $step-execution (`/step-execution`) skill. Use when the user asks to run an entire multi-step task/plan until all steps are complete.
---

# Step Loop

## Overview

Execute a full task plan by repeatedly running the $step-execution (`/step-execution`) skill for each incomplete step, in order, until all steps are complete across the plan.

## Inputs

- **Any task document path** (`*-steps-guide.md`, `*-steps-<range>.md`, or `*-context.md`). The path is only a starting point for locating the full task folder and all related docs.

## Workflow

1. Resolve the task folder from the provided path and load:
   - the context document
   - the steps guide (if present)
   - all steps documents in that folder
2. Identify step order, dependencies, completion status, and the steps doc for each step using the steps guide when present; otherwise derive ordering from step numbers across all steps docs.
3. Loop through steps in dependency order:
   - Select the next incomplete step.
   - Run the `$step-execution` (`/step-execution`) skill for that step using the resolved task folder and selected step from the current `$step-loop` (`/step-loop`) invocation.
4. After each step:
   - Ensure `$doc-alignment` (`/doc-alignment`) has run for the affected current-doc scope.
   - Ensure the steps guide index and the steps doc metadata/checklists are updated, and the `$commit` (`/commit`) skill is run to commit the fully completed step. Goal: One commit per step.
   - If the step reveals a significant blocker that requires a user decision, stop and ask. In most cases, use your best judgment and continue.
5. Continue until all steps are marked complete.
6. Run a final `$doc-alignment` (`/doc-alignment`) pass for all current source-of-truth docs touched by the completed task. Exclude historical `docs/tasks/` and `docs/rollout/` unless the active task or rollout artifact itself was edited. If this pass changes docs, commit the fix with the relevant final step.

## Guardrails

- Treat the `$step-execution` (`/step-execution`) skill workflow as authoritative implementation process for each step.
- `$step-loop` owns the commit policy when it invokes `$step-execution`: do not ask the user after each step; commit each fully completed step exactly once with the `$commit` (`/commit`) skill.

## Example inputs

- `docs/tasks/2026-02-26/issue-5-durable-queue-webhook-runtime-duplication/issue-5-durable-queue-webhook-runtime-duplication-context.md`
- `docs/tasks/2026-02-26/issue-5-durable-queue-webhook-runtime-duplication/issue-5-durable-queue-webhook-runtime-duplication-steps-guide.md`
