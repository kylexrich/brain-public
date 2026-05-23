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

## Guidance Map (DO NOT EDIT)

The documents linked below are the binding rules for this directory and every subdirectory beneath it. All agents operating within this scope must follow them, subject to the instruction precedence defined at the top of this `AGENTS.md` (most specific file wins on conflict).

- `.ai/guidance/agent-first-documentation.md`: agent-facing documentation model, authority levels, historical-doc handling, and guidance-map expectations.
- `.ai/guidance/repository-rules.md`: repo-wide strict rules for dependencies, Prisma CLI, comments, naming, imports, Retell constants, documentation, paths, deployments, and concurrency.
- `.ai/guidance/repository-workflows.md`: repo workflows, local setup, validation, skill execution, API contract changes, environment variables, and commit rules.
