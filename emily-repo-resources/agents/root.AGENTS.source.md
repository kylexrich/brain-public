> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> This is the repo root `AGENTS.md`. All other `AGENTS.md` files inherit from this one. Most specific wins on conflict.
>
> **Chain:** `AGENTS.md` _(root — this file)_

---

# EMLY Repo Guide For AI Contributors

This file is the repo-wide orientation map. Keep stable facts here; long-form rules live in linked guidance docs and retain the same force as if they were inline.

## Explicit User Overrides

* A direct, explicit user instruction can override repo-level `AGENTS.md` rules, `.ai/guidance/` rules, skill instructions, and generated agent guidance for the specific requested action.
* The override must be concrete about the action and scope; do not infer permission from vague intent, frustration, or adjacent requests.
* User overrides do **not** override system or developer instructions, platform safety constraints, filesystem/tool sandbox limits, or missing credentials.
* When acting under an explicit user override, state that the action is using that override, run the narrowest command sequence that satisfies the request, and avoid broadening the action to other environments or unrelated operations.

## Tag Types

* **[STRICT]** - non-negotiable; violations must be fixed.
* **[GUIDELINE]** - default best practice or general instruction; deviate only with clear, documented reasons.
* Untagged sections are **[GUIDELINE]**.

## Operating Mode

* **Quality > Speed.** Favor correctness, maintainability, and explicitness.

## Repository Overview

TypeScript monorepo with npm workspaces containing a full-stack application: Express API, Next.js client, shared OpenAPI contract, and AWS CDK infrastructure.

## AWS Region

All AWS resources deploy in **`ca-central-1`** (Canada - Central). Always use `--region ca-central-1` for AWS CLI commands.

**Exception:** CloudFront certificates must reside in `us-east-1` per AWS requirements. `cdk/lib/stacks/cloudfront-certificate-stack.ts` deploys to `us-east-1`; all other stacks deploy to `ca-central-1`. See `cdk/AGENTS.md#aws-region`.

## Directory Layout

- `app/`: Express 5 API implemented in TypeScript with tsyringe dependency injection, Prisma persistence, SQS consumers, billing, integrations, and AI orchestration pipelines (Anthropic, OpenAI, Retell).
- `client/`: Next.js 16 App Router app (React 19, TypeScript, Tailwind CSS v4, TanStack Query, Zustand, Framer Motion), Payload CMS, marketing surfaces, dashboard, and widget frame.
- `common/`: API contract package with Zod schemas in `common/src/zod/` and generated OpenAPI docs in `common/openapi.yaml`. Published in the workspace as `emly-common`.
- `cdk/`: AWS CDK v2 infrastructure project with config, constructs, stacks, stages, and deployment assets.
- `docs/`: repo knowledge base for product, architecture, SOPs, rollout evidence, current and deferred task artifacts in `docs/tasks/`, research, marketing, and reference material.
- `scripts/`: durable repo utility scripts for deployment wrappers, agent/skill mirror sync, and skill length reporting.
- `.ai/`: source AI agent configuration containing guidance, skills, prompts, and rules.
- `.claude/skills/` and `.codex/skills/`: generated mirrors from `.ai/skills/`; do not edit directly.

## Root `package.json` `npm` Scripts

- `dev`: runs `app` and `client` dev servers concurrently.
- `widget:test`: opens the local manual widget test page at `client/public/widget-test.html`.
- `prod`: runs `npm run build`, then starts production builds of `app` and `client` in parallel.
- `deploy:beta`: cleans CDK output and deploys the `beta-cell` stage through `scripts/deploy.sh`.
- `deploy:prod`: cleans CDK output and deploys the `production-cell` stage through `scripts/deploy.sh`.
- `deploy:beta-cert`: builds the repo and deploys the beta CloudFront certificate stack.
- `deploy:prod-cert`: builds the repo and deploys the production CloudFront certificate stack.
- `build`: runs `script:sync:all`, then builds `common`, `app`, `client`, and `cdk` sequentially.
- `type-check`: runs TypeScript checks for `common`, `app`, `client`, and `cdk`.
- `lint`: executes lint workflows for `app` and `client`.
- `lint:fix`: runs lint-and-fix tasks for `app` and `client`.
- `test`: runs the app test suite.
- `ci`: clears `client/.next/`, regenerates compiler node prompts, then runs `type-check`, `lint:fix`, `build`, and app tests.
- `studio:beta`: runs Prisma Studio against beta from `app`.
- `studio:prod`: runs Prisma Studio against production from `app`.
- `script:reset:beta`: proxies the beta database reset script from `app`.
- `postinstall`: installs dependencies for `common`, `app`, `client`, and `cdk`.
- `script:sync:all`: runs `script:agents:sync`, `script:skills:sync`, and `script:skills:check` to sync agents and skills, then report skill file lengths.
- `script:agents:sync`: injects AGENTS precedence headers and generated guidance-map footers, then writes or refreshes `CLAUDE.md` and `GEMINI.md` pointer files beside each `AGENTS.md`.
- `script:skills:sync`: mirrors `.ai/skills/` to `.claude/skills/` and `.codex/skills/`.
- `script:skills:check`: reports `.ai/skills/` file lengths as soft-limit information only.
- `script:compiler-node-prompts`: regenerates voice-agent compiler node prompt docs from maintained compiler fixtures.

## Package Authorities

- Backend implementation rules: `app/AGENTS.md`
- Frontend implementation rules: `client/AGENTS.md`
- Common/API contract rules: `common/AGENTS.md`
- CDK/infrastructure rules: `cdk/AGENTS.md`
- Voice-agent compiler rules: `app/src/api/voice-agents/compiler/AGENTS.md`
- Rollout-doc gate: `docs/rollout/AGENTS.md`

---

# Guidance & Rules (DO NOT EDIT. EDIT `.ai/guidance/` ONLY)

The rules below are the binding rules for this directory and every subdirectory beneath it. All agents operating within this scope must follow them, subject to the instruction precedence defined at the top of this `AGENTS.md` (most specific file wins on conflict).

## Agent-First Documentation

This document records the documentation model used for EMLY AI contributors.

### Principles

- `AGENTS.md` files are maps, not manuals. Keep them short enough that an agent can load the right context quickly.
- AI guidance referenced from `AGENTS.md` belongs under the relevant scoped `.ai/guidance/` directory.
- Scoped `.ai/guidance/` directories are flat. Do not add nested category folders under `.ai/guidance/`.
- Each guidance file under `.ai/guidance/` must define YAML front matter with a non-empty `title`, `order`, and `description`; `scripts/agents-md-footer.js` inlines each guidance file's full content (titled by `title`, sequenced by `order`) into the scoped `AGENTS.md` guidance section.
- The `Guidance (DO NOT EDIT)` section at the bottom of each `AGENTS.md` is generated. Do not hand-edit it; update the guidance file's front matter or content, then run `npm run script:agents:sync`.
- `docs/` is the repository-local knowledge base for product, architecture, SOP, rollout, task, research, marketing, and reference content.
- Use progressive disclosure. A short index should point to category-sized documents; avoid one document per tiny rule and avoid one giant document per package.
- Task plans are checked-in execution artifacts under `docs/tasks/` and are evidence of how work was done, not automatically current product truth.
- Documentation freshness is mechanical work. When implementation and docs disagree, fix the source-of-truth doc or mark the stale document historical.

### Authority Levels

- **Current source of truth:** product behavior, architecture, operations, or package guidance that agents should treat as live.
- **Scoped authority:** a focused `AGENTS.md` or package doc that is still the best place for a narrow rule set.
- **Reference:** durable supporting material, generated architecture output, raw sample data, or provider/vendor notes.
- **Historical:** task plans, completed rollout notes, exported skills, old guidance, and dated implementation plans. Historical docs are preserved but do not override current code or current source-of-truth docs.

### Writing Rules

- Prefer category-sized guidance docs under scoped `.ai/guidance/` directories, not one file per rule.
- Do not duplicate content across docs. Link to the canonical file and keep only the context needed for navigation.
- Use repo-root paths in backticks, with trailing slashes for directories.
- If a document is intentionally stale or archival, say that at the top.

## Repository Rules

These repo-wide AI rules retain the same authority as root `AGENTS.md`.

### Global Rules

These cross-cutting constraints apply across package boundaries unless narrower guidance is more specific.

### **[STRICT] Dependency Reuse**
  * **Before implementing any common utility (validation, date formatting, HTTP clients, etc.), check the `package.json` of the relevant scope (root, `client`, `app`, etc.) to see if a package already exists for that purpose.**
    * **Example:** If a validation library exists, use it instead of writing custom validation logic.
* **Goal:** Prevent "Not Invented Here" syndrome and ensure we leverage existing, maintained, and standards-compliant libraries.

### **[STRICT] Prisma CLI Usage (AI Only)**
* **AI must not run Prisma CLI commands** (migrate apply/reset/deploy, studio, validate, format, etc.).
* **Exception:** AI may run `prisma dev` (for example, `npx prisma dev` from `app/`) whenever needed to start the local Prisma Postgres service for local development, migration creation, or validation. This is a local service-start command, not a schema apply/deploy command.
* **Exception:** AI may create a new draft migration only with `npm run migrate:create --prefix app -- --name <migration_name>`, which uses Prisma's create-only workflow and does not apply it.
* **AI must never create migration files/directories manually.**
* **Already-existing migration files are immutable and must not be edited after creation.** The only exception is the new migration generated by the current create-only workflow, which may be reviewed/customized before it is applied.
* **Exception:** `prisma generate` via `npm run build-client` when required by builds.

### **[STRICT] Comment Rules**
* **Write self-explanatory code; comments are exceptions.**
* **Only the following comment types are allowed:**
  * **TODO** — actionable, specific follow-ups.
  * **Why/intent for non-obvious constraints** — rationale for edge cases, security/compliance, or other surprising decisions.
  * **Public API contracts** — invariants/expectations for exported functions, hooks, components, or store slices.
  * Required license or auto-generated headers.
* **Preserve human-authored context comments** that provide non-obvious, helpful rationale.
  * If stale, update; if unsure, ask before deleting.
* **Remove these if found:**
  * Incidental inline/block/JSDoc comments that restate the code (“what” or flow narration).
  * Legacy/explanatory prose, commented-out code without a TODO, or placeholder notes.
  * Commentary where clearer naming/structure would suffice.
* **Keep allowed comments concise and directly above the relevant code.**

### **[STRICT] Explicit Naming**
* **Prefer explicit, unambiguous names (e.g., `outcomeKey` over `key`) to optimize for clarity and future extensibility.**
  * **Example:** Prefer `workspaceId` over `id`, `inboundCallerPhoneNumber` over `phoneNumber`, `knowledgeBaseSourceType` over `type`, `billingInterval` over `interval`, and `isInboundCall` over `isInbound`.
  * **Example:** Prefer `agentVersionNumber` over `version`, `retellCallId` over `callId`, `phoneNumberE164` over `number`, `integrationProviderKey` over `provider`, and `isTrialEligible` over `eligible`.
  * **Example:** Prefer `availablePhoneNumbers` over `numbers`, `defaultAgentPresetId` over `presetId`, `callOutcomeSummary` over `summary`, `toolExecutionStatus` over `status`, and `inboxItemReadAt` over `readAt`.

### **[STRICT] Import from `emly-common`**
* **Always import API types and shared interfaces from `emly-common`—never duplicate or redefine them in `app/` or `client/`.**
* If an API-related type doesn't exist and should be shared, add it to `common/src/zod/` so the generated `common/openapi.yaml` reflects it.
* If a non-API-related type doesn't exist and should be shared, add it to `common/src/`.

### **[STRICT] Retell Constants**
* **All Retell dynamic variables and post-call analysis field keys must be defined in `common/src/util/retell-constants.ts`.**
* Import and reuse these constants across `app/` and `client/` wherever Retell integration requires them.
* Never hardcode Retell dynamic variable names or post-call analysis field keys inline—always reference the canonical constants. Add more as needed.

### **[STRICT] No Documentation or Skill Duplication**
* **NEVER duplicate information across multiple `.md` documents or skills. ALWAYS cross-reference where applicable.**
* **Before creating or editing any `.md` document or skill:**
  1. Search for overlapping information or context in existing documents and skills.
  2. If overlap exists, either:
     * **Cross-reference** the existing document or skill (e.g., "See `docs/product/billing.md` for billing rules" or "Delegate to the `$ci` (`/ci`) skill").
     * **Extract** the shared content into its own document or skill, then cross-reference from all locations that originally contained it.
* **Skills should be reusable and atomic**—prefer invoking existing skills over duplicating their logic.
* **Goal:** Single source of truth for each piece of information or behavior—easier maintenance, no contradictions, no stale duplicates.

### **[STRICT] Session Tool Inventory**
* **Do not hard-code MCP server, connector, plugin, or tool inventories in repo documentation.** Agents must use the tools and connectors exposed in the active session.
* **Only document repo-specific tool workflows when they are stable and actionable.** Keep durable guidance focused on how this repo uses a tool, not which tools may exist in a given agent runtime.

### **[STRICT] File Path Reference Standardization**
When referencing any repo file or directory (in any markdown doc, issue, PR description, or comment):
* **Always use repo-root paths** (relative to the repository root), with **forward slashes**.
  * Correct: `app/src/server/index.ts`
  * Incorrect: `/app/src/server/index.ts`, `C:\repo\app\src\server\index.ts`, `../../src/server/index.ts`, `./billing.md`
* **Always wrap paths in inline code backticks** and **do not use markdown link syntax** for repo paths.
  * Correct: `docs/architecture/overview.md`
  * Incorrect: `[overview](docs/architecture/overview.md)`
* **Directories must end with a trailing slash**.
  * Example: `app/src/`
* **Paths must match exact casing** and be copy/paste navigable.

#### Optional precision suffixes (use only when helpful)
* **Line ranges:** `path/to/file.ts:L10-L42`
* **Markdown section:** `path/to/doc.md#section-heading` (use the file’s actual heading slug)

#### Multiple possible locations
* Use **brace expansion** to express “one of these roots” in a single, AI-friendly path:
  * Example: `{.ai,.codex,.claude}/skills/ci/SKILL.md`

### **[STRICT] Skill Reference Standardization**
* **Canonical reference (always):** the `$<skill>` (`/<skill>`) skill
* **Fallback locator (use when portability matters—e.g. non-skill docs):** append the canonical path pattern:
  * the `$<skill>` (`/<skill>`) skill (or see `{.ai,.claude,.codex}/skills/<skill>/SKILL.md`)

### **[STRICT] Writing AGENTS.md Rules (in any directory)**
* **Address root causes, not symptoms.** Rules prevent classes of problems—not specific bugs.
* **Back with best practices.** Validate via web research.
* **Keep generic.** Rules apply broadly; examples clarify but don't limit scope.

### **[STRICT] No Deployments (AI Only)**
* Unless root `AGENTS.md#explicit-user-overrides` applies, AI must not run deployment commands (`npm run deploy:beta`, `npm run deploy:prod`, `cdk deploy`, or any other deployment command).
* Unless root `AGENTS.md#explicit-user-overrides` applies, AI must not deploy to any environment—beta, production, or otherwise.
* **Exception:** Running scenario scripts (e.g., `scenarios/*.ts`) to view JSON output is permitted.
* If a task involves deployment and root `AGENTS.md#explicit-user-overrides` does not apply, stop and ask the user to perform the deployment manually.

### **[STRICT] Concurrent Agent Work**
* Another AI agent may be completing an independent step in the same git worktree or branch at the same time. This is expected.
* **Never stop or ask for guidance due to unrelated changes from other agents—proceed with your task.**
* If their changes affect your work (e.g., new conflicts, shifted patterns, or shared code), adapt as needed to integrate cleanly or fix issues as they arise.
* Root `AGENTS.md#explicit-user-overrides` is the only repo-level authority for user override behavior.

## Repository Workflows

Root `AGENTS.md` owns tag types, repository overview, AWS region, directory layout, operating mode, and the root `package.json` script catalog. This file owns repo-wide execution workflows.

### Environment Setup (Local)

- `npm install` (runs root `postinstall` to install package deps for `common`, `app`, `client`, and `cdk`).
- `npm run ci` validates the workspace before completion.

#### [STRICT] Making Common Changes

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

#### [STRICT] Skill Execution

1. **Read the skill directory** — Skills live in `.ai/skills/<name>/` (synced to `.claude/skills/` and `.codex/skills/` via sync scripts)
2. **Follow SKILL.md** — The primary instruction file; read it fully before acting
3. **Use supporting files** — If the skill references other skills, or other files, use them as directed by `SKILL.md`
4. **Execute sequentially** — Follow the skill's workflow phases in order; don't skip steps
5. **Meet quality standards** — Each skill defines its own; verify you've met them before completing

#### [STRICT] API Contract Changes (Zod-first)

`common/.ai/guidance/api-contract-rules.md` is canonical for API contract rules. At the repo workflow level:
edit Zod schemas in `common/src/zod/`, regenerate OpenAPI and API name-map artifacts with `npm run build --prefix common`,
then update `app/` and `client/` consumers in the same change when an internal contract shifts. See
`common/AGENTS.md#contract-changes-zod-first-workflow` for the package map.

#### Environment Variables

- Update relevant package `.env.example` when adding new environment variables (e.g. `cdk`, `app`, `client`).
- **[STRICT]** Any `.env.example` change must be wired through CDK in the same commit (when the app is deployed via CDK).

#### Package Test Policy

* **[STRICT]** Folder-specific `AGENTS.md` files define whether automated tests are allowed and where they belong. Before adding, moving, or deleting tests, follow the most specific applicable `AGENTS.md` for the target path.

#### Validation & CI

* **[STRICT]** Before declaring a task complete, follow the `$ci` (`/ci`) skill (or see `{.ai,.claude,.codex}/skills/ci/SKILL.md`). If it fails, report the failure and do not claim completion. Ensure the Environment Setup steps above have been run so CI has the required dependencies and Prisma client types.

#### Committing Changes

* **Never push to any remote (e.g., `origin`).**
* **[STRICT]** When asked to commit changes, follow the `$commit` (`/commit`) skill (or see `{.ai,.claude,.codex}/skills/commit/SKILL.md`).
