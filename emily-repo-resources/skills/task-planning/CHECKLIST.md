# Task Planning Checklist

This checklist is the single source of detailed planning requirements.
Use `{.ai,.claude,.codex}/skills/task-planning/CONTEXT_TEMPLATE.md`, `{.ai,.claude,.codex}/skills/task-planning/STEPS_GUIDE_TEMPLATE.md`, and `{.ai,.claude,.codex}/skills/task-planning/STEPS_TEMPLATE.md` for structure only, and avoid duplicating these requirements elsewhere.

## 0) How to use this checklist and the templates

- The output documents are the contents of the fenced ```md blocks in the templates. Everything outside the fences is instruction.
- Remove placeholder bullets you do not fill in; do not leave empty sections.
- If a section is not relevant, omit it entirely instead of writing "N/A" or "None".
- Do not include conditional labels like "optional" or "if applicable" in outputs; omit the section or item instead.
- If a section is omitted, remove any dependent checklist items that only apply when that section exists.

### Context doc construction

- Optional sections:
  - 9) Data model and contracts: omit any irrelevant subsection (OpenAPI changes, Data model changes, Example shapes)
  - 10) Package-level impact: omit package subsections with no impact (`common/`, `app/`, `client/`, `cdk/`, `docs/`)
  - 13) Operational readiness
  - 14) Research and references
  - 15) Open questions

### Steps doc construction

- Optional sections:
  - References
  - Plan snippets
  - Completion Notes
- Reviews live only in the Step checklist; do not add a standalone Reviews section.
- In the Step checklist, include only the review skill line(s) that match the step scope; remove the rest.

### Steps guide construction

- The steps guide is the single place for coordination rules, dependency rules, and the step index table.
- Every step in the plan must be listed in the index, including the final validation step.

## 1) Intake and scope

- [ ] Capture the objective, success criteria, and why this matters
- [ ] Define scope boundaries and explicit non-goals
- [ ] List constraints (time, policy, tech, compliance, UX)
- [ ] Identify stakeholders and user personas
- [ ] Search `docs/tasks/` for similar or related plans
- [ ] Define explicit acceptance criteria (what must be true for the change to be considered complete)
- [ ] List out-of-scope edge cases to avoid over-engineering (unlikely scenarios intentionally not addressed)

## 2) Foundational context

- [ ] Read `docs/product/scenario.md`
- [ ] Read any relevant docs under `docs/`
- [ ] Read all applicable `AGENTS.md` files for impacted paths
- [ ] Note any product or business rules that must be preserved

## 3) Codebase research

- [ ] Search for existing patterns and similar features (use `rg`)
- [ ] Identify current flows and key file paths
- [ ] Check relevant `package.json` files for existing dependencies
- [ ] Note existing helpers/utilities to reuse

## 4) Contracts and data

- [ ] Review `common/openapi.yaml` for relevant endpoints
- [ ] Identify contract changes (new fields, endpoints, response shapes)
- [ ] Review `app/prisma/schema.prisma` when data changes are likely
- [ ] Identify migration needs and backward compatibility concerns

## 5) Package-specific investigation

### Backend (`app/`)

- [ ] Review services in `app/src/services/`
- [ ] Review controllers/services/validators in the relevant `app/src/api/<feature>/` folders
- [ ] Review DI registration in `app/src/DependencyInjector.ts`
- [ ] Review route registration in `app/src/RouterLoader.ts`
- [ ] Identify data access patterns and transaction boundaries

### Frontend (`client/`)

- [ ] Review route components in `client/app/`
- [ ] Review shared components in `client/components/`
- [ ] Review hooks, stores, and API helpers in `client/lib/`
- [ ] Identify UI patterns, loading states, and error handling conventions

### Contracts (`common/`)

- [ ] Confirm where generated types are used
- [ ] Identify downstream impact of schema changes

### Infrastructure (`cdk/`)

- [ ] Determine if new env vars are needed
- [ ] Check CDK stack definitions for required wiring
- [ ] Verify IAM/permissions implications

## 6) External research and best practices

- [ ] When integrations are involved, review third-party API docs
- [ ] For third-party APIs touched by the task, run the `$provider-contract-verification` (`/provider-contract-verification`) skill and add its evidence block to the context doc
- [ ] Treat sparse provider docs or missing response body examples as incomplete evidence, not as permission to infer fields from internal naming style
- [ ] Research best practices for the domain (security, UX, reliability)
- [ ] Note relevant standards or compliance requirements
- [ ] Summarize findings and design implications
- [ ] Resolve researchable questions from docs/best practices; do not defer them to open questions
- [ ] Prefer the **FireCrawl MCP** and/or **Context7 MCP** when available for verifying API and other documentation — they pull live, source-of-truth docs and beat training-data recall. Only fall back to generic web search if neither MCP is connected.
- [ ] Verify you are referencing the **most recent / best** API version (model IDs, SDK versions, endpoint shapes, deprecations) — confirm via FireCrawl/Context7 (or web search as a fallback). Do not rely on training-data versions.

## 7) Requirements and design decisions

- [ ] Define functional requirements (what must happen)
- [ ] Define non-functional requirements (performance, reliability, UX)
- [ ] Document assumptions and constraints
- [ ] Capture decisions and rationale (and alternatives considered)
- [ ] Identify concurrency/race condition risks and ordering assumptions
- [ ] Determine idempotency requirements for operations that may be retried
- [ ] Define retry/backoff strategy for transient failures when retries are used

## 8) Risk and rollout

- [ ] Identify risks and mitigations
- [ ] Identify observability needs (logs, metrics)
- [ ] Evaluate the rollout doc gate. Read `docs/rollout/AGENTS.md` (single source of truth for when the gate fires); default is **no rollout doc** unless that doc's criteria are met
- [ ] If the gate fires:
  - Record the **phase shape** (list of phases with a one-line purpose each, e.g., expand / backfill / contract) in the context doc's "Phase shape" section
  - Add a `Phase` column to the steps guide step index, with a value for every step
  - Add a `**Phase:**` metadata field to each step in each steps doc
  - Add explicit plan steps for: authoring `docs/rollout/<slug>.md` (using `docs/rollout/TEMPLATE.md`), authoring each Prisma migration, each backfill script, and each cleanup script the rollout will need
  - Do **NOT** author the rollout doc or any of those scripts at planning time — they are produced during step execution when paths, names, and edge cases are known
- [ ] Set the context doc's `Rollout:` field to either `Single deploy` or `Multi-phase: see steps guide`

## 9) Validation

- [ ] Define how correctness will be verified
- [ ] Identify documentation updates required
- [ ] Run the `$doc-alignment` (`/doc-alignment`) skill for the planned scope and reflect required current-doc updates in the plan

## 10) Dependency ordering and step design

**Critical:** Each step must be completable by a single agent in one session.

- [ ] Map dependencies and ordering constraints across packages
- [ ] Break work into small-to-medium steps (prefer medium when possible)
- [ ] Do not optimize for fewer steps or fewer documents; use as many steps as needed to fully cover the request
- [ ] Split steps into multiple steps docs with a maximum of 5 steps per doc; create as many steps docs as needed
- [ ] Ensure each step includes a checklist, clear "Done When" criteria, and any information needed to execute the step
- [ ] **DO NOT REMOVE** the "**OVERRIDE:**" comment. This is meant to stay within the step checklist directly.
- [ ] Add a final step that verifies end-to-end using `$e2e-review` (`/e2e-review`) and `$doc-alignment` (`/doc-alignment`), and keep it last in the step index and in the final steps doc
- [ ] Explicitly declare dependencies for each step:
  - If a step depends on other steps, list them in **Prereqs** (e.g., `1, 2`)
  - If a step has no dependencies, use `None`
- [ ] Order steps logically:
  - Steps with dependencies must come after their prerequisites
  - Independent steps should be placed where they make most sense given the overall flow

## 11) Final review

- [ ] Context doc is complete, specific, and non-placeholder
- [ ] Steps guide doc is complete, accurate, and matches the steps docs
- [ ] Steps docs are ordered, dependency-correct, and executable
- [ ] Open questions pass the "researchable" filter (see below)

### [STRICT] Open Questions Filter

**Before listing any open question, you MUST attempt to answer it yourself.**

A question is **NOT** an open question if it can be answered by:
- Reading the codebase (patterns, conventions, existing implementations)
- Reading project documentation (`docs/`, `AGENTS.md`, etc.)
- Checking `package.json` for existing dependencies
- Searching the web for best practices or library documentation
- Reviewing third-party API docs
- Any other research you can do without human input

**Open questions are ONLY for:**
- True design decisions requiring human/stakeholder judgment
- Business rules or product decisions not documented anywhere
- Conflicting information in the codebase (or between the codebase and the task description) that can't be reconciled
- Trade-offs where multiple valid approaches exist and preference is unclear
- Ambiguous requirements that remain ambiguous after research

**If you can answer a question by doing research, it's not an open question—it's research you haven't done yet. Do the research.**
