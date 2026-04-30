---
name: validate-task
description: Validate task planning documents for accuracy, completeness, and logical correctness. Run after the `$task-planning` (`/task-planning`) skill to ensure the plan will actually achieve the objective.
allowed-tools: Bash, Read, Glob, Grep, WebSearch, WebFetch, Task, AskUserQuestion, Write
---

# Validate Task Skill

Validate existing task planning documents to ensure they will actually achieve the stated objective correctly and completely.

## When to Use

- After the `$task-planning` (`/task-planning`) skill has produced context and steps documents
- When additional context or objective changes are provided
- When a second opinion on a task plan is needed before execution

## Required Inputs

1. **Task documents** — Path to existing context and/or steps documents in `.ai/tasks/`
2. **Additional context** (optional) — Any new information or objective changes

## Single Source of Control

- `{.ai,.claude,.codex}/skills/validate-task/CHECKLIST.md` — All validation requirements

## Workflow

1. Read the task documents provided.
2. Follow the checklist end-to-end.
3. Use web searches to verify technical approaches and assumptions.
4. Fix any issues directly in the documents.
5. Summarize what was validated and any changes made.
