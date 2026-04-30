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

## Required Outputs

- `.ai/tasks/YYYY-MM-DD/<slug>/<slug>-context.md`
- `.ai/tasks/YYYY-MM-DD/<slug>/<slug>-steps-guide.md`
- `.ai/tasks/YYYY-MM-DD/<slug>/<slug>-steps-1-5.md` (repeat in ranges of 5 steps; no limit)

**Steps doc rules:**
- Max 5 steps per steps doc, with sequential step numbering across docs.
- The final step is always validation and must be the last step in the plan and in the final steps doc.

## Workflow

1. Follow the checklist end-to-end.
2. Ask clarifying questions only if required to complete the documents.
3. Produce the context doc, steps guide doc, and the full set of steps docs using the templates.
4. Summarize where the task docs live and list open questions or risks.
