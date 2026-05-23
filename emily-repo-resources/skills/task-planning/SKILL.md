---
name: task-planning
description: Create comprehensive context and steps documents for large or complex tasks that require multi-step execution.
allowed-tools: Bash, Read, Glob, Grep, WebSearch, WebFetch, Task, AskUserQuestion, Write
---

# Task Planning Skill

Create the authoritative planning documents for large or complex work:
1) a context document,
2) a steps guide document, and
3) one or more steps documents.

## When to Use

- Large or complex tasks that cannot be completed in one session
- Any explicit request for a task plan or task documents

Do NOT use for small tasks unless the user explicitly requests planning.

## Single Source of Control

Detailed requirements live only in:
- `{.ai,.claude,.codex}/skills/task-planning/CHECKLIST.md` for planning and research requirements
- `{.ai,.claude,.codex}/skills/task-planning/CONTEXT_TEMPLATE.md` for context document structure
- `{.ai,.claude,.codex}/skills/task-planning/STEPS_GUIDE_TEMPLATE.md` for steps guide document structure
- `{.ai,.claude,.codex}/skills/task-planning/STEPS_TEMPLATE.md` for steps document structure

## Provider Contract Gate

For third-party API work, run the `$provider-contract-verification` (`/provider-contract-verification`) skill before planning is complete. Record its evidence block in the context document, and do not finalize a plan that depends on unproven provider response fields or casing.

## Rollout Doc Gate

`docs/rollout/AGENTS.md` is the **single source of truth** for when a rollout doc is required. Read it before answering the gate question.

In short:
- **Default (99% of tasks):** single commit, single deploy, optionally with one Prisma migration and/or one backfill. **No rollout doc.**
- **Gate fires:** see the criteria in `docs/rollout/AGENTS.md`. A rollout doc at `docs/rollout/<slug>.md` becomes required.

**At task-planning time, do NOT author the rollout doc itself, and do NOT author any migration, backfill, or cleanup scripts.** Those depend on details (script paths, exact column types, edge cases, function signatures) that only become concrete during implementation. Authoring them at planning time produces stale guesses that drift from reality.

Instead, when the gate fires:
- Decide the **phase shape** at the plan level: how many phases and the one-line purpose of each (for example, "Phase 1: expand", "Phase 2: backfill + verify", "Phase 3: contract"). Record it in the context doc's `Phase shape` section.
- Group plan steps into phases:
  - Add a `Phase` column to the steps guide step index, with a value for every step.
  - Add a `**Phase:**` metadata field to each step in each steps doc.
- **Add explicit plan steps** for: authoring `docs/rollout/<slug>.md` (skeleton early, refined as phases land), authoring each Prisma migration, each backfill script, and each cleanup script the rollout will need. These are real work items executed during step execution, not planning-time artifacts.
- In the context doc's `Rollout:` field, record `Multi-phase: see steps guide`.

During execution, `$worktree-task` (`/worktree-task`) runs `$phase-loop` (`/phase-loop`) to land one commit per plan phase (single-phase → 1 commit, multi-phase → N commits). The AI prepares the commit chain; the human operator performs the actual deploys per the completed rollout doc.

## Required Outputs

- `docs/tasks/YYYY-MM-DD/<slug>/<slug>-context.md`
- `docs/tasks/YYYY-MM-DD/<slug>/<slug>-steps-guide.md`
- `docs/tasks/YYYY-MM-DD/<slug>/<slug>-steps-1-5.md` (repeat in ranges of 5 steps; no limit)
- `docs/rollout/<slug>.md` is **not** a planning-time output. When the gate fires, the plan instead includes explicit steps that author this doc and any required migration/backfill/cleanup scripts during execution.

**Steps doc rules:**
- Max 5 steps per steps doc, with sequential step numbering across docs.
- The final step is always validation and must be the last step in the plan and in the final steps doc.
- When the rollout doc gate fires, every step must carry a `**Phase:**` metadata field, and the steps guide step index must include a `Phase` column.

## Workflow

1. Follow the checklist end-to-end.
2. Ask clarifying questions only if required to complete the documents.
3. Produce the context doc, steps guide doc, and the full set of steps docs using the templates.
4. Evaluate the Rollout Doc Gate (see above):
   - If it does **not** fire: record `Single deploy` in the context doc's `Rollout:` field. Done.
   - If it fires: record the phase shape in the context doc, add `Phase` column to the steps guide and `**Phase:**` metadata per step, add explicit plan steps for authoring the rollout doc and each migration/backfill/cleanup script, and record `Multi-phase: see steps guide` in the context doc's `Rollout:` field. Do not author the rollout doc or any scripts at this stage.
5. Run the `$doc-alignment` (`/doc-alignment`) skill against the planned markdown impact. Resolve required source-of-truth doc, `AGENTS.md`, `.ai/guidance/`, and source skill updates in the plan, including references for any new or moved guidance docs. Keep `docs/tasks/`/`docs/rollout/` out of current-product alignment unless the active task or rollout doc itself is in scope.
6. Summarize where the task docs live and list open questions or risks.
