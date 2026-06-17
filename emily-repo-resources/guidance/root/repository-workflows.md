---
title: "Repository Workflows"
description: "repo workflows, local setup, validation, skill execution, API contract changes, environment variables, and commit rules."
order: 3
---

Root `AGENTS.md` owns tag types, repository overview, AWS region, directory layout, operating mode, and the root `package.json` script catalog. This file owns repo-wide execution workflows.

## Environment Setup (Local)

- `npm install` (runs root `postinstall` to install package deps for `common`, `app`, `client`, and `cdk`).
- `npm run ci` validates the workspace before completion.

### [STRICT] Making Common Changes

1. **Understand** — Clarify requirements; read business docs and specs before touching code.
2. **Research** — Search for existing patterns, read related files, and understand current conventions.
3. **Plan** — Present the approach for approval before implementing.

**Decision: Is the task significantly large or complex, requires robust understanding/research, or would be difficult to complete in one session?**
If so, ask the user whether they want to break it down into a task.

**If yes (use task planning):**
1. Use the `$task-planning` (`/task-planning`) skill (or see `{.ai,.claude,.codex}/skills/task-planning/SKILL.md`) to create comprehensive task documentation.
2. Complete the first incomplete step using the `$step-execution` (`/step-execution`) skill (or see `{.ai,.claude,.codex}/skills/step-execution/SKILL.md`).

**If no (or the task is not significantly large/complex):**
1. **Implement** — Follow existing patterns; make focused, incremental changes.
2. **Verify** — Run the `$ci` (`/ci`) skill (or see `{.ai,.claude,.codex}/skills/ci/SKILL.md`).
3. **Commit** — **ONLY** when asked, use the `$commit` (`/commit`) skill (or see `{.ai,.claude,.codex}/skills/commit/SKILL.md`).

### [STRICT] Skill Execution

1. **Read the skill directory** — Skills live in `.ai/skills/<name>/` (synced to `.claude/skills/` and `.codex/skills/` via sync scripts)
2. **Follow SKILL.md** — The primary instruction file; read it fully before acting
3. **Use supporting files** — If the skill references other skills, or other files, use them as directed by `SKILL.md`
4. **Execute sequentially** — Follow the skill's workflow phases in order; don't skip steps
5. **Meet quality standards** — Each skill defines its own; verify you've met them before completing

### [STRICT] API Contract Changes (Zod-first)

`common/.ai/guidance/api-contract-rules.md` is canonical for API contract rules. At the repo workflow level:
edit Zod schemas in `common/src/zod/`, regenerate OpenAPI and API name-map artifacts with `npm run build --prefix common`,
then update `app/` and `client/` consumers in the same change when an internal contract shifts. See
`common/AGENTS.md#contract-changes-zod-first-workflow` for the package map.

### Environment Variables

- Update relevant package `.env.example` when adding new environment variables (e.g. `cdk`, `app`, `client`).
- **[STRICT]** Any `.env.example` change must be wired through CDK in the same commit (when the app is deployed via CDK).

### Package Test Policy

* **[STRICT]** Folder-specific `AGENTS.md` files define whether automated tests are allowed and where they belong. Before adding, moving, or deleting tests, follow the most specific applicable `AGENTS.md` for the target path.

### Validation & CI

* **[STRICT]** Before declaring a task complete, follow the `$ci` (`/ci`) skill (or see `{.ai,.claude,.codex}/skills/ci/SKILL.md`). If it fails, report the failure and do not claim completion. Ensure the Environment Setup steps above have been run so CI has the required dependencies and Prisma client types.

### Committing Changes

* **Never push to any remote (e.g., `origin`).**
* **[STRICT]** When asked to commit changes, follow the `$commit` (`/commit`) skill (or see `{.ai,.claude,.codex}/skills/commit/SKILL.md`).
