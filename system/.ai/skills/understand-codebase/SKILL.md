---
name: understand-codebase
description: Create or refine the concise codebase document under .context/plans. Use when a project needs a grounded understanding of the repository principles that materially constrain or guide development. Capture only relevant current ownership boundaries, seams, conventions, and invariants with exact code anchors. Do not produce an exhaustive file map, desired architecture, or implementation plan.
---

# Understand Codebase

Create or update exactly one `codebase.md` in the project's `.context/plans/YYYY-MM-DD/<slug>/` directory. Reuse the project's stable directory when it exists; otherwise create it, including any missing parent directories.

## Work

1. Verify the literal checkout and read every applicable `AGENTS.md`.
2. Read the user's direction and the existing task documents.
3. Inspect the maintained code and documentation that own the relevant behavior.
4. Capture only codebase principles that materially affect this project.
5. Back each principle with a small number of exact repository paths.

Describe current reality, not an aspirational redesign.

## Boundaries

- Keep it concise, clear, simple, straightforward, and non-duplicative.
- Do not inventory every file, dependency, layer, or call path.
- Do not repeat project direction or provider facts.
- Do not turn incidental implementation details or existing debt into principles.
- Do not add file-change lists, tasks, or delivery mechanics.
- When a fact does not change development judgment, leave it out.

Return the document path and a brief summary of material findings.
