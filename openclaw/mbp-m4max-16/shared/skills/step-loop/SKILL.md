---
name: step-loop
description: Execute an Approved multi-step task plan under `shared/docs/tasks/` by loading the full task folder, resolving dependencies, claiming ready steps, and looping until complete. Use when the user asks to run a task-planning plan or provides a task folder, context doc, steps guide, or steps doc as input. Parallelize only when prerequisites are satisfied and declared file/work-area scope is explicitly non-overlapping.
---

# Step Loop

Run an approved task plan from start to finish. Respect dependencies. Parallelize only when it is clearly safe.

## Inputs

Accept either the task folder or any file inside it:

- `shared/docs/tasks/YYYY-MM-DD/<slug>/`
- `shared/docs/tasks/YYYY-MM-DD/<slug>/*-context.md`
- `shared/docs/tasks/YYYY-MM-DD/<slug>/*-steps-guide.md`
- `shared/docs/tasks/YYYY-MM-DD/<slug>/*-steps-*.md`

Resolve the folder, then load:
- `*-context.md`
- `*-steps-guide.md`
- all `*-steps-*.md`
- `shared/docs/sop/SUB-AGENT-MODEL-STRATEGY.md`

## Preconditions

The task docs must already provide:
- context status (`Draft` or `Approved`)
- the execution root / working directory from the context doc
- each step's prereqs
- each step's file / work-area scope
- each step's execution mode (`Serial` or `Parallel-ready`)
- each step's status (`Incomplete`, `In progress`, `Blocked`, or `Complete`)

If any of these are missing:
- infer conservatively only when the answer is obvious
- otherwise stop and report the plan gap instead of guessing

Do **not** execute a plan whose context status is still `Draft`.
Only run `step-loop` when the context doc status is `Approved`.

## Model strategy

Use the `Multi-step execution / plans` section of `shared/docs/sop/SUB-AGENT-MODEL-STRATEGY.md`, plus `UI / UX work` only when the assigned step is explicitly client-facing UI / UX work.

For step-loop specifically:
- **Opus high** orchestrates the loop, claims steps, batches safe work, validates results, and challenges risky outputs
- **Codex xhigh** is the default executor for code / logic / implementation steps
- **Opus high** is the primary executor for client-facing UI / UX steps; Codex xhigh may review afterward for code quality and AGENTS compliance without changing UX intent

## Determine readiness

For each step, record:
- status: `Incomplete`, `In progress`, `Blocked`, or `Complete`
- owner/session, if present
- dependencies from the step doc; use the steps guide as an index / cross-check
- execution root
- file / work-area scope
- execution mode

If the context doc, steps guide, and step doc disagree on status, owner, prerequisites, or doc location, stop and report the inconsistency instead of guessing.

A step is **ready** only if:
- the overall plan is `Approved`
- the step status is `Incomplete`
- all prerequisites are `Complete`
- the step is not already `In progress`
- its execution root is known
- its scope is known well enough to execute safely

A step **conflicts** if it touches the same files, overlapping code areas, the same operational surface, or the same mutable state as another ready step.
If scope overlap is unclear, treat it as a conflict.

### Parallelism rule

A step may run in parallel only when:
- it is `Parallel-ready`
- all prerequisites are complete
- it is not already `In progress`
- its declared file / work-area scope is explicit
- its declared scope does not overlap any running or selected step

If scope is missing, broad, or ambiguous, run the step serially.

## Claim before spawn

Before spawning a selected step:
1. mark the step `In progress`
2. set `Owner` to the current orchestrator / session
3. persist that claim in both the steps guide and the step doc

Do not spawn work you have not claimed in the task docs.

## Core loop

```text
load approved plan

while incomplete steps remain:
  ready = incomplete steps with all dependencies satisfied
  if ready is empty:
    stop and report blocked steps, dependency issues, or cycles

  batch = a conflict-free set of ready steps
  if no step has explicit non-overlapping scope:
    batch = one serially safe step

  for each step in batch:
    claim the step in the guide and step doc

    if step is client-facing UI / UX:
      spawn one Opus high primary executor
      optionally queue a Codex xhigh quality pass after Opus completes
    else:
      if step is ambiguous, risky, architectural, or cross-cutting:
        spawn an Opus high challenger pass first
      spawn one Codex xhigh executor for the step

  wait for all spawned work to finish

  for each result:
    validate it
    mark the step `Complete` or `Blocked` in the guide and step doc

  recompute ready steps and continue
```

Do not pre-schedule later steps. Recompute after every batch.

## Spawn rules

Every spawned step executor must:
- act as a senior engineer, not a checklist robot
- use the full task folder, not just a summary
- read applicable `AGENTS.md` files for any touched path before editing
- confirm the step intent, declared scope, and required validation internally before making changes
- treat the step doc as a guide, not a complete specification
- use best judgment to resolve routine gaps or ordinary ambiguity without unnecessary escalation
- ask questions only when truly blocked by a real decision or ambiguity that cannot be resolved from context
- treat unrelated changes from other agents in the same worktree as expected; adapt if they affect the step, but do not stop just because the tree is shared
- complete the implied supporting work needed to finish the step end-to-end
- stay inside the declared file / work-area scope
- complete the step checklist and listed validation
- update the step doc and the steps guide before returning
- update the task docs as living artifacts when execution reveals critical errors, poor design choices, or missing edge cases in the plan/context
- leave all changes unstaged
- never stage, commit, or push unless the user explicitly asked for that

### Opus challenger pass

Use when a step is:
- architecturally significant
- cross-cutting
- risky to get wrong
- likely to benefit from a second-model challenge before implementation

Spawn with:
- `runtime: subagent`
- `model: opus`
- `thinking: high`
- `label: step-<N>-challenge`
- `cwd`: the step execution root

Ask the challenger to:
- critique the planned approach
- point out hidden risks, conflicts, missing context, or simpler alternatives
- stay read-only

### Codex step executor

Spawn with:
- `runtime: subagent`
- `model: codex`
- `thinking: xhigh`
- `label: step-<N>-<slug>`
- `cwd`: the step execution root

Pass the executor:
- the step number and title
- the full task folder path
- an instruction to read the context doc, steps guide, and assigned step doc before doing any work
- the step's execution root
- the step's file / work-area scope
- any Opus challenger notes if one ran
- these constraints:
  - execute only the assigned step
  - read applicable `AGENTS.md` files before touching files
  - update both the step doc and the steps guide before returning
  - do not stage, commit, or push
  - leave changes unstaged
  - stay inside the declared scope
  - report blockers and decisions clearly
  - summarize exactly what changed

### UI / UX primary executor

Use when the step is explicitly client-facing UI / UX work.

Spawn with:
- `runtime: subagent`
- `model: opus`
- `thinking: high`
- `label: step-<N>-uiux`
- `cwd`: the step execution root

Ask the Opus executor to:
- read the context doc, steps guide, and assigned step doc before doing any work
- implement the UI / UX directly
- keep the work inside scope
- update both the step doc and the steps guide before returning
- leave changes unstaged

If a follow-up Codex pass is needed, restrict it to:
- code quality
- correctness
- maintainability
- `AGENTS.md` compliance

Do **not** let the Codex pass change approved client-facing UX intent unless the user explicitly asked for that.

## Validate after each step

Opus high performs validation. This is active review, not just box-checking.

Check:
1. the executor did not report a blocker
2. expected files, checklist items, or operational outcomes were satisfied
3. step-specific validation passed
4. no obvious regressions appear in touched areas
5. the implementation stayed within declared scope
6. the step guide and step doc metadata were updated correctly
7. no staged changes remain
8. the result still matches the task context and design intent

If validation fails, or the challenger review surfaces unresolved concerns, mark the step `Blocked` with the reason.

## Failure handling

- **Step failure, timeout, or validation failure:** mark `Blocked`, record the reason, continue with other ready steps if any exist
- **User decision required:** stop and ask
- **Circular dependency or inconsistent plan:** stop and report it
- **All remaining steps blocked:** stop and report full status

## Guardrails

- Do not execute a `Draft` plan.
- Do not add, skip, or reorder steps beyond dependency resolution.
- Do not run conflicting steps in parallel.
- Do not let a sub-agent edit outside its declared scope.
- Do not auto-stage, auto-commit, or auto-push.
- Leave changes unstaged unless the user explicitly requested otherwise.
- When in doubt, run serially.

## Done

When the loop ends:

1. **Move completed tasks to `completed/`:** If all steps are complete, move the task folder from `shared/docs/tasks/YYYY-MM-DD/<slug>/` to `shared/docs/tasks/completed/<slug>-YYYY-MM-DD/`. Remove the now-empty date directory if nothing else is in it.

2. Report:
   - completed steps
   - blocked steps with reasons
   - validation that was run
   - any remaining risks or user decisions
   - a reminder that all changes are unstaged unless the user asked otherwise
