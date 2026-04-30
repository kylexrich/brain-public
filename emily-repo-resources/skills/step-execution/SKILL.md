---
name: step-execution
description: Execute a step from a task steps guide or steps document end-to-end.
allowed-tools: Bash, Read, Glob, Grep, Edit, Write, Task, AskUserQuestion
---

# Step Execution Skill

Execute a step from the specified task steps guide or steps document.

## When to Use

Activate when the user asks to execute a step and provides a task document path.

## Inputs

- **Task document path** (required) — can be any task doc:
  - A steps guide doc (`*-steps-guide.md`)
  - A steps doc (`*-steps-<range>.md`)
  - A context doc (`*-context.md`)
  Use the provided path only as a starting point to locate the full task folder and all related task docs.
- **Step number or name** (optional) — if not specified, defaults to the first incomplete step in dependency order across the entire plan

**IMPORTANT:** Do NOT ask clarifying questions about which document to use. Always resolve the full task folder from the provided path, load the steps guide if present, and load all steps docs in that folder. If no step is specified, automatically pick the first incomplete step across the entire plan. A specific step is only executed when the user explicitly calls it out. Just proceed to "### Phase 1: Load context and validate prerequisites".

## Workflow

### Phase 1: Load context and validate prerequisites

1. Resolve the task folder from the provided path and read:
   - the context document
   - the steps guide document (if present)
   - all steps documents in that folder
2. Identify the target step:
   - If a step was specified, locate it in the steps guide index or by scanning all steps docs, then open the referenced steps doc. Verify all prerequisite steps are complete before proceeding
   - If no step was specified, find the first incomplete step in dependency order across the entire plan using the steps guide index if present; otherwise derive ordering from step numbers across all steps docs
3. Read all applicable `AGENTS.md` files for paths in scope
4. Skim adjacent steps for dependencies and intent context

> **NOTE:** Another AI agent may be completing an independent step in the same git worktree or branch at the same time. This is expected.
> Ignore unrelated changes from other agents. If their changes affect your work (e.g., new conflicts, shifted patterns, or shared code), adapt as needed to integrate cleanly or fix issues as they arise.

### Phase 2: Confirm step intent (internal, do not ask user)

Internally verify you understand:
- Objective
- Scope (packages/areas)
- Required reviews and checks

**Only ask questions if truly blocked** — e.g., the step references a design decision that wasn't made, or there's a genuine ambiguity that cannot be resolved from context. Routine uncertainty should be resolved using best judgment, not by asking.

### Phase 3: Execute the step

> **Guiding principle:** Act as a senior engineer.
> Treat the step as a guide, **not** a complete spec. Use best judgment to interpret intent and fill in missing implementation details needed to achieve the outcome. 
> Complete work end-to-end—do not skip essential tasks just because they aren't explicitly listed.
> The task context and plan documents are living artifacts. Update them if you discover critical errors, poor design choices, gaps, or missing edge cases.

1. Implement the step end-to-end, including necessary supporting work implied by the objective, even if not explicitly listed
2. Use best judgment to resolve missing details and ensure the core outcome is achieved
3. Follow existing patterns and conventions
4. If required work materially expands the step's objective or conflicts with future steps, stop and ask to update the plan
5. Complete the step's requirements and checklist items as written, without skipping required work

## Output

Provide:
- Summary of changes made
- Step status updates
- Any remaining blockers or questions
- Prompt for next action (commit, continue, etc.)
