---
name: validate-task
description: Validate task planning documents for accuracy, completeness, and logical correctness. Run after the `$task-planning` (`/task-planning`) skill to ensure the plan will actually achieve the objective.
---

# Validate Task Skill

Validate existing task planning documents to ensure they will actually achieve the stated objective correctly and completely.

## When to Use

- After the `$task-planning` (`/task-planning`) skill has produced context and steps documents
- When additional context or objective changes are provided
- When a second opinion on a task plan is needed before execution

## Required Inputs

1. **Task documents** — Path to existing context and/or steps documents in `docs/tasks/`
2. **Additional context** (optional) — Any new information or objective changes

## Single Source of Control

- `{.ai,.claude,.codex}/skills/validate-task/CHECKLIST.md` — All validation requirements

## Provider Contract Validation Gate

For any third-party API that the plan calls, parses, or persists, run or verify the `$provider-contract-verification` (`/provider-contract-verification`) skill. Treat missing provider contract evidence as a validation failure.

> **[Ultracode] Validation swarm.** When running under ultracode (Claude Code only), do not walk this checklist as a single sequential pass. Author a Workflow that dispatches one verifier per checklist lens (Technical Accuracy; Completeness + Logical Correctness; External Research + Provider Contract; Risk + Missing Details + Edge Cases), adds adversarial skeptics that try to REFUTE "this plan achieves the objective" and each provider-contract claim (refuted on majority), adds a completeness critic, then synthesizes and fixes the documents in place. `CHECKLIST.md` stays the single source of truth for WHAT each verifier checks. See `{.ai,.claude,.codex}/skills/task-planning/references/ultracode-orchestration.md`. All other agents and non-ultracode runs: ignore this note and follow the Workflow below as written.

## Workflow

1. Read the task documents provided.
2. Follow the checklist end-to-end.
3. Use source-of-truth docs, FireCrawl/Context7 when available, and web searches to verify technical approaches and assumptions.
4. Fix any issues directly in the documents.
5. Run or verify the `$doc-alignment` (`/doc-alignment`) skill for the planned documentation impact; treat missing current-doc updates as validation failures.
6. Summarize what was validated and any changes made.
