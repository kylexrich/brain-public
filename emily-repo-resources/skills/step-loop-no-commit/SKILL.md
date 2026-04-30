---
name: step-loop-no-commit
description: Run the full $step-loop (`/step-loop`) workflow for a task plan, but leave changes uncommitted between steps. Use when the user wants every step executed and validated without creating per-step commits.
---

# Step Loop No Commit

## Overview

Use the `$step-loop` (`/step-loop`) skill as the authoritative workflow for executing the full task plan.

## Inputs

- Same inputs accepted by the `$step-loop` (`/step-loop`) skill

## Workflow

1. Follow the `$step-loop` (`/step-loop`) skill exactly.
2. Preserve the normal post-step documentation updates.
3. Override one behavior from `$step-loop`:
   - After each completed step, update the steps guide index and the steps doc metadata/checklists as usual.
   - Run the `$ci` (`/ci`) skill instead of the `$commit` (`/commit`) skill.
   - Do not create a commit unless the user explicitly asks for one later.
4. Continue until all steps are marked complete.

## Guardrails

- Treat the `$step-loop` (`/step-loop`) skill as authoritative for everything except the per-step commit requirement.
- Keep all completed work uncommitted throughout the loop unless the user explicitly requests a commit.
