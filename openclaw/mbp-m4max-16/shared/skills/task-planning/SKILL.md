---
name: task-planning
description: Create execution-ready context, steps-guide, and steps documents under `shared/docs/tasks/` for large, risky, or multi-session work. Use when the user asks for a plan, task doc, or step-by-step execution guide, or when work needs dependency tracking, safe parallelism, or handoff-friendly documentation across any repo, docs tree, or operational workflow.
---

# Task Planning Skill

Create the authoritative planning documents for work that is too large, risky, or multi-step to execute ad hoc.

This skill produces:
1. a context document,
2. a steps guide, and
3. one or more steps documents.

## Use

Use this skill for large, cross-cutting, or multi-session work, explicit planning requests, or tasks that need dependency tracking, safe parallelism, or handoff-friendly docs. Skip small tasks unless the user explicitly wants a plan.

This skill is project-agnostic. Model the actual project shape instead of assuming code, web apps, TypeScript, CI, or review tooling when the target does not use them.

## Single source of control

Detailed planning requirements live in the sibling files in this directory:
- `CHECKLIST.md`
- `CONTEXT_TEMPLATE.md`
- `STEPS_GUIDE_TEMPLATE.md`
- `STEPS_TEMPLATE.md`

Use the checklist for planning requirements and the templates for document structure.

## Required outputs

All task documents live in the shared docs tree:

- `shared/docs/tasks/YYYY-MM-DD/<slug>/<slug>-context.md`
- `shared/docs/tasks/YYYY-MM-DD/<slug>/<slug>-steps-guide.md`
- `shared/docs/tasks/YYYY-MM-DD/<slug>/<slug>-steps-1-5.md`
- additional `*-steps-N-M.md` files as needed, max 5 steps per file

## Planning requirements that matter for execution

Your plan must be directly executable by `step-loop` without extra guesswork.

That means the docs must clearly capture:
- the **target project/workspace**
- the **execution root** sub-agents should run in
- the relevant files, components, or work areas
- the dependency graph
- which steps are safe to run in parallel
- the file/work-area scope for each step
- a final validation step that stays last

## Multi-agent model strategy

Use the `Multi-step execution / plans` section of `shared/docs/sop/SUB-AGENT-MODEL-STRATEGY.md`.

Planning uses a **parallel-create → combine → challenge → refine** pipeline:

```
Codex xhigh (create) ──┐
                        ├──→ Codex xhigh (combine) ──→ Opus high (challenge) ──→ Codex xhigh (refine)
Opus high (create)   ───┘
```

1. **Parallel create:** Spawn **Codex xhigh** and **Opus high** with the same planning prompt. They independently produce draft planning docs (context, steps guide, steps). Neither sees the other's output.
2. **Combine:** **Codex xhigh** receives both drafts and synthesizes a single unified plan — taking the strongest elements from each, resolving conflicts, and producing one coherent set of planning docs.
3. **Challenge:** **Opus high** reviews the combined plan. It pressure-tests architecture, dependency ordering, unnecessary complexity, and clean/simple design. Opus produces a challenge document with specific, actionable feedback — **no direct edits** to the planning docs.
4. **Refine:** **Codex xhigh** receives the combined plan + Opus challenge notes and makes final edits. This is the only agent that writes the final planning docs.
5. Set the context doc status to `Approved` only after the refine pass is complete.

## Commit policy

Planning docs may describe validation and completion, but they must **not** assume automatic per-step commits.
Default to leaving implementation changes unstaged unless the user explicitly asks for staging/commit behavior.

## Workflow

### Phase 1 — Research and setup
1. Read the checklist and gather the minimum project context needed to plan correctly.
2. Exhaust local repo/docs/web research first; ask clarifying questions only when they are required to finish the task docs.
3. Choose a clear task slug and create the task folder in `shared/docs/tasks/YYYY-MM-DD/<slug>/`.

### Phase 2 — Parallel create
4. Spawn **Codex xhigh** and **Opus high** in parallel with the same planning prompt. Each independently produces a full draft set of planning docs (context, steps guide, steps). Neither sees the other's output. Leave context status as `Draft`.

### Phase 3 — Combine
5. **Codex xhigh** receives both drafts and synthesizes a single unified plan — strongest elements from each, conflicts resolved, one coherent set of docs. Context status remains `Draft`.

### Phase 4 — Challenge
6. **Opus high** reviews the combined plan (read-only). Produces specific, actionable challenge notes on architecture, dependency ordering, unnecessary complexity, and clean/simple design. **No direct edits** to the planning docs.

### Phase 5 — Refine
7. **Codex xhigh** receives the combined plan + Opus challenge notes and makes final edits to the planning docs.
8. Set the context doc status to `Approved`.

### Phase 6 — Verify
9. Verify the docs are dependency-correct, execution-ready, and free of placeholder fluff.
10. Summarize where the docs live, plus any true open questions or residual risks.
