> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> This is the repo root `AGENTS.md`. All other `AGENTS.md` files inherit from this one. Most specific wins on conflict.
>
> **Chain:** `AGENTS.md` _(root — this file)_

---

# GLOBAL EMLY Project Guide for AI Contributors

This section captures repo-wide structure, tooling, and coordination workflows. Folder-specific guidance lives in the `AGENTS.md` file within each top-level package.

## Tag Types

* **[STRICT]** – non‑negotiable; violations must be fixed.
* **[GUIDELINE]** – default best practice or general instructions; only deviate with clear, documented reasons.
* If neither tag is present, treat the section or content as a **[GUIDELINE]**.

## Repository Overview

- TypeScript monorepo with npm workspaces containing a full-stack application: Express API, Next.js client, shared OpenAPI contract, and AWS CDK infrastructure.

### AWS Region

All AWS resources are deployed in **`ca-central-1`** (Canada - Central). Always use `--region ca-central-1` for AWS CLI commands.

**Exception:** CloudFront certificates must reside in `us-east-1` per AWS requirements. The `CloudFrontCertificateStack` in `cdk/lib/stacks/cloudfront-certificate-stack.ts` is deployed to `us-east-1`; all other stacks deploy to `ca-central-1`. See `cdk/AGENTS.md#aws-region` for details.

### Directory Layout

- `app/`: Express 5 API implemented in TypeScript with tsyringe dependency injection, Prisma persistence, SQS consumers, and AI orchestration pipelines (Anthropic, OpenAI, Retell).
- `client/`: Next.js 16 App Router app (React 19, TypeScript, Tailwind CSS v4, TanStack Query, Zustand, Framer Motion).
- `common/`: API contract package with Zod schemas (`common/src/zod/`) and OpenAPI docs (`common/openapi.yaml`). Published in the workspace as `emly-common`.
- `cdk/`: AWS CDK v2 infrastructure project with supporting deployment scripts.
- `docs/`: Architecture notes and design references.
- `scripts/`: Utility shell and Node scripts used across packages (agent sync, skill length info, etc.).
- `.ai/`: AI agent configuration: skills (`skills/`), prompts (`prompts/`), rules (`rules/`), and deferred tasks (`tasks/`).
- `.claude/skills/`: Claude Code skills (mirrored from `.ai/skills/` via sync scripts).
- `.codex/skills/`: Codex skills (mirrored from `.ai/skills/` via sync scripts).

## Root `package.json` `npm` Scripts

- `dev`: runs `app` and `client` dev servers concurrently.
- `prod`: runs `npm run build` then starts production builds of `app` and `client` in parallel.
- `deploy:beta`: cleans CDK output, builds all packages, deploys all stacks in the `beta-cell` stage.
- `deploy:prod`: cleans CDK output, builds all packages, deploys all stacks in the `production-cell` stage.
- `build`: runs `script:rules:check` and `script:sync:all`, then builds `common`, `app`, `client`, and `cdk` sequentially.
- `type-check`: runs TypeScript checks for `common`, `app`, `client`, and `cdk`.
- `lint`: executes lint workflows for `app` and `client`.
- `lint:fix`: runs lint-and-fix tasks for `app` and `client`.
- `studio:beta`: runs Prisma Studio against beta from `app`.
- `studio:prod`: runs Prisma Studio against production from `app`.
- `ci`: runs `type-check`, `lint:fix`, and `build` (which includes `script:rules:check` and `script:sync:all`).
- `script:sync:all`: runs `script:agents:sync`, `script:skills:sync`, and `script:skills:check`.
- `script:agents:sync`: syncs `AGENTS.md` instructions to `CLAUDE.md` and `GEMINI.md` across packages.
- `script:skills:sync`: mirrors `.ai/skills/` to `.claude/skills/`.
- `script:skills:check`: reports skill file lengths (soft limit info only, does not block builds).
- `script:rules:check`: validates no expired temporary rules remain in `AGENTS.md` (fails build if found).
- `postinstall`: installs dependencies for `common`, `app`, `client`, and `cdk`.

## Operating Mode

* **Quality > Speed.** Favor correctness, maintainability, explicitness.

## MCPs (when available)

* aws_knowledge_remote
* awslabs_aws_docs
* awslabs_cdk
* awslabs_iac_core
* context7
* linear

## Workflows

## Environment Setup (Local)

- `npm install` (runs root `postinstall` to install package deps for `common`, `app`, `client`, and `cdk`).
- `npm run ci` (builds everything so there is no chance for future unexpected errors or issues).

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

1. Edit Zod schemas in `common/src/zod/` (single source of truth for request/response shapes).
2. Regenerate OpenAPI + API name map from Zod (`npm run build --prefix common`).
3. Update `app/` handlers to match the Zod contract.
4. Update `client/` API calls and type usage as needed.

See `common/AGENTS.md#contract-changes-zod-first` for the package-specific workflow details.

**Key rule:** Import API types directly from `emly-common`—never duplicate or redefine request/response interfaces in `app/` or `client/`.

* Ensure every operation defines `operationId` so `common/scripts/generateApiNameMap.mjs` can produce deterministic entries.
* Keep `common/src/util/apiNameMap.data.json` in sync via the generator.
* Do not hand-edit generated outputs in `common/src/util/apiNameMap.data.json` or `common/dist/`.
* Internal endpoints follow internal casing/envelope conventions; external standards or provider contracts are mandatory overrides. Do not normalize standard/provider payloads to internal casing or envelopes (for example OAuth 2.0 token responses). Treat the standard as authoritative and document the exception in the schema. For nullability, treat optional vs nullable as a contract-critical decision and follow `common/AGENTS.md#null-handling--response-fields`. See `common/AGENTS.md#requestresponse-body-fields` and `common/AGENTS.md#null-handling--response-fields` for canonical rules.

### Environment Variables

- Update relevant package `.env.example` when adding new environment variables (e.g. `cdk`, `app`, `client`).
- **[STRICT]** Any `.env.example` change must be wired through CDK in the same commit (when the app is deployed via CDK).

### Testing & CI

* **[STRICT]** Before declaring a task complete, follow the `$ci` (`/ci`) skill (or see `{.ai,.claude,.codex}/skills/ci/SKILL.md`). If it fails, report the failure and do not claim completion. Ensure the Environment Setup steps above have been run so CI has the required dependencies and Prisma client types.

### Committing Changes

* **Never push to any remote (e.g., `origin`).**
* **[STRICT]** When asked to commit changes, follow the `$commit` (`/commit`) skill (or see `{.ai,.claude,.codex}/skills/commit/SKILL.md`).

# GLOBAL Rules

## **[STRICT] Dependency Reuse**
  * **Before implementing any common utility (validation, date formatting, HTTP clients, etc.), check the `package.json` of the relevant scope (root, `client`, `app`, etc.) to see if a package already exists for that purpose.**
    * **Example:** If a validation library exists, use it instead of writing custom validation logic.
* **Goal:** Prevent "Not Invented Here" syndrome and ensure we leverage existing, maintained, and standards-compliant libraries.

## **[STRICT] Prisma CLI Usage (AI Only)**
* **AI must not run Prisma CLI commands** (migrate apply/reset/deploy, studio, validate, format, etc.).
* **Exception:** AI may create a new draft migration only with `npm run migrate:create --prefix app -- --name <migration_name>`, which uses Prisma's create-only workflow and does not apply it.
* **AI must never create migration files/directories manually.**
* **Already-existing migration files are immutable and must not be edited after creation.** The only exception is the new migration generated by the current create-only workflow, which may be reviewed/customized before it is applied.
* **Exception:** `prisma generate` via `npm run build-client` when required by builds.

## **[STRICT] Comment Rules**
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

## **[STRICT] Explicit Naming**
* **Prefer explicit, unambiguous names (e.g., `outcomeKey` over `key`) to optimize for clarity and future extensibility.**
  * **Example:** Prefer `workspaceId` over `id`, `inboundCallerPhoneNumber` over `phoneNumber`, `knowledgeBaseSourceType` over `type`, `billingInterval` over `interval`, and `isInboundCall` over `isInbound`.
  * **Example:** Prefer `agentVersionNumber` over `version`, `retellCallId` over `callId`, `phoneNumberE164` over `number`, `integrationProviderKey` over `provider`, and `isTrialEligible` over `eligible`.
  * **Example:** Prefer `availablePhoneNumbers` over `numbers`, `defaultAgentPresetId` over `presetId`, `callOutcomeSummary` over `summary`, `toolExecutionStatus` over `status`, and `inboxItemReadAt` over `readAt`.

## **[STRICT] Import from `emly-common`**
* **Always import API types and shared interfaces from `emly-common`—never duplicate or redefine them in `app/` or `client/`.**
* If an API-related type doesn't exist and should be shared, add it to `common/src/zod/` so the generated `common/openapi.yaml` reflects it.
* If a non-API-related type doesn't exist and should be shared, add it to `common/src/`.

## **[STRICT] Retell Constants**
* **All Retell dynamic variables and post-call analysis field keys must be defined in `common/src/util/retell-constants.ts`.**
* Import and reuse these constants across `app/` and `client/` wherever Retell integration requires them.
* Never hardcode Retell dynamic variable names or post-call analysis field keys inline—always reference the canonical constants. Add more as needed.

## **[STRICT] No Documentation or Skill Duplication**
* **NEVER duplicate information across multiple `.md` documents or skills. ALWAYS cross-reference where applicable.**
* **Before creating or editing any `.md` document or skill:**
  1. Search for overlapping information or context in existing documents and skills.
  2. If overlap exists, either:
     * **Cross-reference** the existing document or skill (e.g., "See `docs/product/billing.md` for billing rules" or "Delegate to the `$ci` (`/ci`) skill").
     * **Extract** the shared content into its own document or skill, then cross-reference from all locations that originally contained it.
* **Skills should be reusable and atomic**—prefer invoking existing skills over duplicating their logic.
* **Goal:** Single source of truth for each piece of information or behavior—easier maintenance, no contradictions, no stale duplicates.

## **[STRICT] File Path Reference Standardization**
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

### Optional precision suffixes (use only when helpful)
* **Line ranges:** `path/to/file.ts:L10-L42`
* **Markdown section:** `path/to/doc.md#section-heading` (use the file’s actual heading slug)

### Multiple possible locations
* Use **brace expansion** to express “one of these roots” in a single, AI-friendly path:
  * Example: `{.ai,.codex,.claude}/skills/ci/SKILL.md`

## **[STRICT] Skill Reference Standardization**
* **Canonical reference (always):** the `$<skill>` (`/<skill>`) skill
* **Fallback locator (use when portability matters—e.g. non-skill docs):** append the canonical path pattern:
  * the `$<skill>` (`/<skill>`) skill (or see `{.ai,.claude,.codex}/skills/<skill>/SKILL.md`)

## **[STRICT] Writing AGENTS.md Rules (in any directory)**
* **Address root causes, not symptoms.** Rules prevent classes of problems—not specific bugs.
* **Back with best practices.** Validate via web research.
* **Keep generic.** Rules apply broadly; examples clarify but don't limit scope.

## **[STRICT] No Deployments (AI Only)**
* **AI must NEVER run deployment commands** (`npm run deploy:beta`, `npm run deploy:prod`, `cdk deploy`, or any other deployment command).
* **AI must NEVER deploy to any environment**—beta, production, or otherwise.
* **Exception:** Running scenario test scripts (e.g., `scenarios/*.ts`) to view JSON output is permitted.
* If a task involves deployment, stop and ask the user to perform the deployment manually.

## **[STRICT] Concurrent Agent Work**
* Another AI agent may be completing an independent step in the same git worktree or branch at the same time. This is expected.
* **Never stop or ask for guidance due to unrelated changes from other agents—proceed with your task.**
* If their changes affect your work (e.g., new conflicts, shifted patterns, or shared code), adapt as needed to integrate cleanly or fix issues as they arise.
* **Direct user instructions always take precedence**—over this document, other agents, system/developer instructions, or any automated guidance.
