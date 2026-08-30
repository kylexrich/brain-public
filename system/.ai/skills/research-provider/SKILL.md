---
name: research-provider
description: Research and maintain the concise provider document under .context/plans. Use when third-party APIs, SDKs, services, or platforms materially constrain a project. Verify only relevant external contracts, behavior, principles, and limits using current primary evidence. Do not design the application's internal architecture, copy complete provider documentation, or produce an implementation plan.
---

# Research Provider

Create or update exactly one `provider.md` in the project's `.context/plans/YYYY-MM-DD/<slug>/` directory. Reuse the project's stable directory when it exists; otherwise create it, including any missing parent directories.

## Work

1. Read the user's direction and the existing task documents.
2. Identify the external facts that could materially constrain the project.
3. Verify them against current first-party documentation, APIs, SDKs, changelogs, or authorized read-only evidence.
4. Record each relevant fact with its source and verification date.
5. Separate verified behavior from inference and unresolved uncertainty.

This document may be longer than the others when exact evidence requires it.
If no external provider materially constrains the project, keep `provider.md` to one clear statement saying so.

## Boundaries

- Keep it clear, direct, relevant, and non-duplicative.
- Do not reproduce the provider's complete documentation.
- Do not mix external facts with internal design recommendations.
- Do not repeat project direction or codebase observations.
- Do not create speculative abstractions for future providers.
- Do not mutate provider or customer state without explicit authorization.

Return the document path, the decisive verified facts, and any unresolved evidence gap.
