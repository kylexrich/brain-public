# steps-guide.md

```md
# [Title] - Steps Guide

**Context doc (source of truth):**
- `shared/docs/tasks/YYYY-MM-DD/<slug>/<slug>-context.md`

**Steps docs (max 5 steps per doc):**
- `shared/docs/tasks/YYYY-MM-DD/<slug>/<slug>-steps-1-5.md`
- `shared/docs/tasks/YYYY-MM-DD/<slug>/<slug>-steps-6-10.md`

## Coordination rules

**Execution model:** Follow `shared/docs/sop/SUB-AGENT-MODEL-STRATEGY.md`.

**Plan approval rule:** `step-loop` should execute this plan only after the context doc status is `Approved`.

**Orchestration rule:** The orchestrating agent handles dependency resolution, batching, and conflict checks.
Implementation agents execute individual steps.

**Parallelism rule:** A step may run in parallel only when all prerequisites are complete, the step is not already `In progress`, and its declared file/work-area scope does not overlap any running or selected step.
If scope is unknown or overlap is unclear, run serially.

**Claim rule:** Before spawning a step, mark it `In progress` and record the current owner/session in both the steps guide and the step doc.

**Commit policy:** Steps produce unstaged changes unless the user explicitly requested staging/commit behavior.
Do not assume one commit per step.

> **NOTE:** Multiple agents may work in the same worktree concurrently on independent steps. This is expected.
> Ignore unrelated changes from other agents. If their changes affect your work, adapt cleanly instead of fighting the worktree.

---

## Step index

| Step | Name | Status | Owner / session | Prereqs | Scope | Mode | Doc |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | [Name] | Incomplete | [agent handle or session key] | None | `[paths / systems / docs touched]` | Parallel-ready | `shared/docs/tasks/YYYY-MM-DD/<slug>/<slug>-steps-1-5.md` |
| N | Final validation & cleanup (required, always last) | Incomplete | [agent handle or session key] | All prior | `entire task scope` | Serial | `shared/docs/tasks/YYYY-MM-DD/<slug>/<slug>-steps-N-M.md` |

---

## Steps doc ranges

- Max 5 steps per steps doc.
- Steps are numbered sequentially across docs.
- The final step is always validation and must live in the last steps doc.

```
