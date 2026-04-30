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
   - Run the `$step-execution` (`/step-execution`) skill for that step using the input to the current `$step-execution` (`/step-execution`) skill.
4. After each step:
   - Ensure the steps guide index and the steps doc metadata/checklists are updated, and the `$commit` (`/commit`) skill is run to commit the fully completed step. Goal: One commit per step.
   - If the step reveals a significant blocker that requires a user decision, stop and ask. In most cases, use your best judgment and continue.
5. Continue until all steps are marked complete.

## Guardrails

- Treat the `$step-execution` (`/step-execution`) skill workflow as authoritative implementation process for each step.

## Example inputs

- `.ai/tasks/2026-01-09/retell-webhook-processing/retell-webhook-processing-context.md`
- `.ai/tasks/2026-01-09/retell-webhook-processing/retell-webhook-processing-steps-guide.md`
