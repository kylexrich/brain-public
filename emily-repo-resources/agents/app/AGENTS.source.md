> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `app/AGENTS.md` _(this file)_ > `AGENTS.md` _(root)_

---

# `app/` EMLY API Guide For AI Contributors

## Repository Overview

- Express 5 API authored in TypeScript (ESM).
- `app/` owns HTTP APIs, Prisma-backed persistence, SQS workers, billing, integrations, Retell
  voice-agent orchestration, backend runtime services, operational scripts, and the server-side
  implementation of the shared OpenAPI contract from `common/`.
- tsyringe handles dependency injection; Prisma Client provides data access through `PrismaService`;
  Pino powers structured logging.
- Rate limiting, request-id, metrics context, and structured logging are wired through middleware at startup.
- Swagger UI is served from the shared OpenAPI contract in `common/openapi.yaml`.

## Directory Layout

- `app/src/index.ts`: process entrypoint that boots the server, selects service role behavior, and enforces
  production secrets.
- `app/src/Server.ts`: Express server startup for middleware, CORS, rate limiting, routers, Swagger, and
  top-level error handling.
- `app/src/RouterLoader.ts`: central registration point for feature routers.
- `app/src/DependencyInjector.ts`: tsyringe container wiring for services, repositories, compiler modules,
  and provider adapters.
- `app/src/api/<api category>/`: HTTP feature modules and application workflows. Primary layout, layering,
  service/assembler/util split, and internal type rules: `app/.ai/guidance/module-and-feature-layout.md#api-feature-layout-and-layering`
  and `app/.ai/guidance/typescript-and-domain-semantics.md#typescript-types-and-contract-discipline`.
- `app/src/repositories/<feature>/`: Prisma-backed data access abstractions. Primary repository and database
  access rules: `app/.ai/guidance/module-and-feature-layout.md#api-feature-layout-and-layering` and
  `app/.ai/guidance/prisma-persistence-and-database-integrity.md`.
- `app/src/sqs/`: queue consumers and asynchronous workers. Route work through the same service layer used
  by HTTP when the workflow is shared.
- `app/src/services/`: infrastructure and external provider services such as persistence, payments,
  telephony, email, integrations, AI, crypto, and email templates.
- `app/src/middleware/`: authentication, authorization, validation, metrics, not-found, error, and
  request-id middleware.
- `app/src/metrics/`: metric names, dimensions, and request context storage.
- `app/src/config/`: server and logger configuration derived from environment variables.
- `app/src/shared/`: domain-agnostic helpers shared by two or more API folders or across SQS/API layers.
  Primary shared-helper placement rules: `app/.ai/guidance/module-and-feature-layout.md#api-feature-layout-and-layering`.
- `app/src/errors/`: all error types and mappers.
- `app/src/scripts/`: durable operator, repair, seed, export, and code-generation scripts, not tests.
- `app/src/__tests__/`: the only allowed app automated test tree.
- `app/prisma/`: Prisma schema and migrations.
- `app/logs/`: default structured log output path, configurable through `LOG_DIR` and `LOG_FILE`.
- `app/.ai/guidance/`: backend AI guidance referenced by this file. These are rules for agents, not
  product or architecture docs.

## Scoped Authorities

- App tests: `app/src/__tests__/AGENTS.md`
- Voice-agent compiler: `app/src/api/voice-agents/compiler/AGENTS.md`
- Scripts: `app/src/scripts/AGENTS.md` and `docs/sop/app-operator-scripts.md`
- Email templates: `app/src/services/email-templates/AGENTS.md`
- Repo-wide API contract workflow: `common/AGENTS.md`

## Package Scripts

`app/package.json` is the primary source for exact script names, env overlays, flags, and command bodies.
This section is only a category map.

- Runtime/build/validation scripts: `dev`, `prod`, `worker:sqs`, `build`, `type-check`, `lint`, `lint:fix`,
  `test`, and `build-client`; exact commands live in `app/package.json`.
- Prisma and Studio scripts: `migrate:*` and `studio:*`; AI restrictions live in
  `.ai/guidance/repository-rules.md#strict-prisma-cli-usage-ai-only`.
- Durable operator scripts: `script:*`; ownership and dry-run/apply expectations live in
  `app/src/scripts/AGENTS.md` and `docs/sop/app-operator-scripts.md`.

---

## Guidance Map (DO NOT EDIT)

The documents linked below are the binding rules for this directory and every subdirectory beneath it. All agents operating within this scope must follow them, subject to the instruction precedence defined at the top of this `AGENTS.md` (most specific file wins on conflict).

- `app/.ai/guidance/api-boundaries.md`: boundary validation, emly-common contract alignment, authorization and tenant scoping, /me wrappers, external calls, and compatibility scope.
- `app/.ai/guidance/code-quality-principles.md`: app test placement, boring code, service structure, deduplication, and internal trust versus defensive branching.
- `app/.ai/guidance/error-handling.md`: error translation, proportional catch/rethrow behavior, and stable HTTP error responses.
- `app/.ai/guidance/external-integrations-and-events.md`: external provider translation, event/message compatibility, transactional outbox/inbox, workflow/process managers, and domain-event emission rules.
- `app/.ai/guidance/functions-state-and-formatting.md`: function responsibility, size, side effects, parameter growth, flags/modes, guard clauses, linting, and 120-character object/log-line formatting.
- `app/.ai/guidance/module-and-feature-layout.md`: dependency direction, anti-fragmentation, file sizing, API feature folders, repository-only database access, shared helper placement, and service/assembler/util/category splits.
- `app/.ai/guidance/naming-comments-and-documentation.md`: explicit naming, units and formats in identifiers, comment limits, TODO requirements, and documentation expectations.
- `app/.ai/guidance/observability-and-telemetry.md`: structured logging, redaction, stable keys, actionable error context, metrics, and tracing.
- `app/.ai/guidance/prisma-persistence-and-database-integrity.md`: database integrity, transactions, query bounds, selected fields, raw SQL, migrations, pagination, and concurrency controls.
- `app/.ai/guidance/reuse-refactoring-and-object-design.md`: single sources of truth, dead code, code generation, refactoring discipline, cohesive classes, interfaces, and encapsulated state.
- `app/.ai/guidance/runtime-configuration-feature-flags-and-package-dependencies.md`: validated runtime configuration, feature flags, dependency reuse, dependency version discipline, adapter boundaries, and dependency injection.
- `app/.ai/guidance/typescript-and-domain-semantics.md`: canonical shared types, runtime schemas from emly-common, explicit annotations, constants, absence, time, units, and wrapper/value-type limits.
- `app/.ai/guidance/work-bounding-concurrency-and-idempotency.md`: bounded CPU, memory, and I/O; retry loops; resource lifecycle; performance evidence; Promise handling; idempotency; and stateless request handling.
