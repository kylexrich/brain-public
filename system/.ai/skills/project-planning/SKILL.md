---
name: project-planning
description: Simple entrypoint for establishing a project under .context/plans. Use when the user wants the complete lightweight project-planning flow rather than invoking its focused skills separately. Create or reuse one task folder, compose understand-codebase, research-provider, and define-project, and produce exactly project.md, codebase.md, and provider.md. Do not produce implementation plans, task breakdowns, approval gates, or additional artifacts.
---

# Project Planning

Create the project folder and its three concise living documents. This skill is a wrapper, not a fourth planning discipline.

## Workflow

1. Read the user's direction and supplied material.
2. Resolve one stable `.context/plans/YYYY-MM-DD/<slug>/` directory. Reuse an existing matching directory; otherwise create it, including any missing parent directories, using the project's start date and a clear slug.
3. Run `$understand-codebase` for that exact directory and direction to produce `codebase.md`.
4. Run `$research-provider` for that exact directory and direction to produce `provider.md`.
5. Run `$define-project` last so `project.md` can use the codebase and provider findings, independently research relevant design principles, patterns, and best practices, and capture concrete core contract shapes.
6. Confirm the directory contains the three documents, each fact or decision has one clear home, and none has become an exhaustive specification.

## Boundaries

- Produce exactly `project.md`, `codebase.md`, and `provider.md`.
- Keep the wrapper simple; follow each component skill rather than copying its instructions here.
- Do not create a wrapper report, README, context document, research diary, checklist, validation record, or status file.
- Do not require approval or completeness before the user can begin development.
- Do not create implementation steps, tasks, commits, pull-request plans, or rollout instructions.
- Do not invoke implementation, commit, push, publication, deployment, migration, or provider mutation.

Return the task-directory path, the three document paths, and only material unresolved fundamentals.
