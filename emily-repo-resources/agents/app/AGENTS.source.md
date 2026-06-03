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

# `app/` Guidance & Rules (DO NOT EDIT. EDIT `app/.ai/guidance/` ONLY)

The rules below are the binding rules for this directory and every subdirectory beneath it. All agents operating within this scope must follow them, subject to the instruction precedence defined at the top of this `AGENTS.md` (most specific file wins on conflict).

## Backend API Boundaries And Compatibility

### Boundary Validation, API Contracts, And Compatibility
* **[STRICT]** Must keep transport concerns (HTTP, queues, CLI, files) at the edges; must map requests/responses to domain types at the boundary before invoking core logic; must not leak transport/framework types into domain/application layers.
  * **Example:** Controller parses request JSON, constructs domain value objects, calls service, and maps result to response DTO.
* **[STRICT]** Must validate and normalize untrusted inputs at system boundaries (HTTP, CLI, message queues, environment, file inputs) before invoking core logic. Once data passes the boundary and is converted to typed domain objects, internal code can trust those types; do not re-validate at every function call.
  * **Example:** Validate request JSON against a schema, construct domain types, then pass those types through services without re-checking.
* **[STRICT]** Invalid boundary inputs must produce stable, documented error codes/messages and must not leak internal exceptions, stack traces, or raw error strings to external callers.
  * **Example:** Return `400` with a structured validation error contract instead of propagating thrown exception messages.
* **[STRICT]** Public list/query endpoints must have explicit bounds: enforce mandatory pagination, stable ordering, validated filters, and maximum limits; never return unbounded collections from public APIs.
  * **Example:** Require `limit` (capped) and `cursor` for `GET /orders` and validate `status` filters against an enum.
* **[STRICT]** Must maintain backward compatibility for published interfaces unless a breaking change is explicitly authorized and accompanied by a migration path; must never silently repurpose a field's meaning. Internal monorepo API changes across `common/`, `app/`, and `client/` are lockstep and should not add aliases, legacy fields, or compatibility shims unless the user explicitly requests them.
  * **Example:** Deprecate a field and keep it readable for at least one release before removal. For an internal route consumed only by the monorepo client, update the schema, handler, and client together without a compatibility alias unless requested.
* **[STRICT]** Must define serialization formats, versioning strategy, and compatibility rules for integration boundaries; must never change wire formats silently.
  * **Example:** Adding a required JSON field is a breaking change unless versioned.
* **[STRICT]** Must design APIs to be composable and unsurprising: avoid hidden side effects, temporal coupling, and non-obvious required call order; if ordering is required, encode it in the API design.
  * **Example:** `beginCheckout()` returns a token required for `confirmCheckout(token)`.
* **[STRICT]** All access control, authorization, and ownership enforcement policy must be centralized, such as in `AccessControlMiddleware` for HTTP and a shared authorization policy/service for non-HTTP entrypoints. Controllers/services must not inline ownership checks or implicit self-scoping; they must invoke the centralized policy and pass explicit identifiers as defined by the contract.
* **[STRICT]** Repositories must enforce tenant/organization scoping as a data isolation invariant via query shape, such as `where: { id, orgId }`. This is not a replacement for authorization policy; it is a safety backstop that prevents cross-tenant reads/writes if an upstream guard is missed.

### `/me` Endpoints And Authenticated Identity
* **[STRICT]** `/me` contract shape rules live in `common/.ai/guidance/api-contract-rules.md#endpoint-shapes--me-usage`.
* **[STRICT]** App implementations of `/me/...` routes must keep wrapper logic in `app/src/api/me/MeRouterFactory.ts` and delegate to the same controllers/validators as the primary route.

### External Calls At Boundaries
* **[STRICT]** Must make external calls explicit with timeouts, retries, and idempotency considerations; must never block indefinitely on external calls.
  * **Example:** HTTP client calls set explicit timeout and bounded retries; do not retry non-idempotent operations without idempotency protection.
* **[GUIDELINE]** Prefer explicit pagination, filtering, and sorting shapes consistent with platform conventions; if bulk export is required, prefer async export jobs with progress tracking rather than returning unbounded collections.
* **[GUIDELINE]** Prefer explicit versioning and deprecation policies for public contracts; add new fields compatibly (optional/nullable by contract) before removing or renaming old ones.
  * **Example:** Introduce `statusV2` alongside `status` before deprecating `status`.

## Backend Code Quality Principles

### Global Principles And Safety
* **[STRICT]** App automated tests are allowed only under `app/src/__tests__/`. Tests are not required for every change; when adding, moving, or modifying tests, follow `app/src/__tests__/AGENTS.md`.
* **[STRICT]** Write straightforward, boring code: avoid clever/obscure patterns, over-abstraction, or "magic" constructs when a clear, direct approach is available.
* **[GUIDELINE]** Design for maintainability through simplicity and clarity: modular, consistent with existing patterns. Avoid adding flexibility for hypothetical future requirements - build what's needed now.
* **[GUIDELINE]** Lint warnings are acceptable when they are reasonable; resolve lint errors.
* **[STRICT]** Prefer a Java-style service structure: group related behavior into discrete service classes with explicit responsibilities and cohesive method sets, even when the class is stateless. Favor class-based services over scattered helper functions or micro-utility files. **Stateless does not mean static** - prefer instantiated services with explicit dependency injection when needed, not static utility classes. See `app/.ai/guidance/module-and-feature-layout.md#modules-architecture-and-file-structure`.

### Deduplication And Shared Helpers
* **[STRICT]** Deduplication and reuse rules live in `app/.ai/guidance/reuse-refactoring-and-object-design.md#dry-reuse-dead-code-and-code-generation`.
* **[GUIDELINE]** Shared helper placement and anti-fragmentation rules live in `app/.ai/guidance/module-and-feature-layout.md#modules-architecture-and-file-structure`.

### Internal Trust And Defensive Coding
* **[STRICT]** Do not add defensive null/undefined checks or fallback branches for values that cannot be null/undefined at that point in the code. If upstream logic guarantees a value exists, trust it. If you're tempted to add a defensive check, first verify whether the scenario can actually occur; if it cannot, do not add the check.
  * **Example:** If `getAuthenticatedUser()` only succeeds after auth middleware, do not write `if (!user)` checks in every downstream function.
* **[STRICT]** Before adding null/undefined handling, verify the type is correctly defined. If a value is marked optional but no business scenario allows it to be absent, fix the type to be required and update callers; do not add defensive branches for impossible states.
  * **Example:** If `user.organizationId` is optional but every user must have an organization, change the type to required and fix the data model; do not scatter `if (user.organizationId)` checks.
* **[GUIDELINE]** If an invariant violation would otherwise fail later with a confusing error, prefer a fail-fast invariant assertion over defensive branching. Assertions must not introduce alternate behavior; they must surface a clear, actionable error message.
  * **Example:** `invariant(user.organizationId !== undefined, "Expected organizationId to be set by auth middleware");`
* **[STRICT]** Do not add error handling, fallbacks, or validation for scenarios that cannot occur given current system design. Code should reflect actual invariants, not theoretical edge cases the system prevents.
  * **Example:** If a function is only called after successful validation, do not re-validate the same constraints inside the function.
* **[GUIDELINE]** Validation intensity decreases inward from system boundaries. HTTP/queue handlers: validate all external input. Services: trust that controllers passed valid domain objects. Repositories: trust that services passed valid data. Internal helpers: trust callers entirely. Only add validation at internal layers when the function is reused across different trust boundaries.
  * **Example:** A controller validates `limit` is a positive integer; the service and repository do not re-check this.

## Backend Error Handling

### Error Handling And Error Translation
**Note:** Error handling should be proportional to risk. Default to letting unexpected errors propagate to the top-level handler; do not wrap every call in try/catch. At trust boundaries and long-running consumers/loops, it is acceptable to catch only to translate to internal error types and/or add actionable context (identifiers, operation name, classification), then rethrow; do not add fallback behavior for impossible states.

* **[STRICT]** Translate external/library errors to internal error types defined in `app/src/errors/` or
  feature-specific error folders. Do not let Prisma errors, Stripe errors, or other third-party exception
  types propagate through your service layer.
  * **Example:** Catch `PrismaClientKnownRequestError` in the repository and throw a domain-specific `NotFoundError` or `ConflictError`.
* **[STRICT]** At HTTP boundaries, translate internal errors to stable API error responses. Do not leak internal exception types, stack traces, or error messages to clients.
  * **Example:** Map `NotFoundError` to a `404` with a stable error code; do not expose internal error details.
* **[STRICT]** When catching errors, either handle them meaningfully or rethrow as an internal error type with added context. Do not write empty catch blocks or catch-and-ignore.
  * **Example:** `catch (err) { throw new PaymentFailedError("Charge declined", { cause: err, orderId }); }`
* **[GUIDELINE]** Do not wrap every function call in try/catch. Let unexpected errors propagate to the top-level error handler. Only catch errors when you can do something useful: retry, fallback, translate to an internal error type, or add context.
  * **Example:** A service calling a repository does not need try/catch if the repository already throws internal error types that should propagate up.
* **[GUIDELINE]** Use exceptions for exceptional failures (things that should not happen in normal operation). For expected business outcomes like "user not found," either return `null`/`undefined` or throw a well-defined internal error type; be consistent within each module.
  * **Example:** `findUserById()` returns `null` when user does not exist; `getUserById()` throws `NotFoundError` when user must exist.

## Backend Integrations And Events

### External Integration Boundaries
* **[STRICT]** When integrating with external APIs (Stripe, Retell, OpenAI, etc.), translate their types and terminology at the adapter boundary. Do not let external API shapes leak into your service layer.
  * **Example:** Map Stripe's `payment_intent` fields to your internal `Payment` type in the adapter, not in business logic.
* **[GUIDELINE]** Use consistent terminology within the codebase. If an external system uses different names for the same concept, translate once at the boundary and use your internal term everywhere else.
  * **Example:** If Retell calls it `call_id` but you call it `retellCallId` internally, map it in the adapter.

### Events, Messaging, And Workflow Reliability
* **[STRICT]** Message handling must be idempotent and safe under at-least-once delivery; every consumer must tolerate duplicates and reordering unless the broker guarantees stronger semantics.
  * **Example:** Use a processed-message table keyed by `(messageId, consumer)`.
* **[STRICT]** Must version event/message schemas and maintain backward compatibility for consumers; must not
  remove or change meaning of fields without a version bump and migration plan. Internal changes still need
  safe migration or compatibility when any consumer exists.
  * **Example:** Add `discountCode` as optional; do not rename `orderId` to `id` without versioning.
* **[GUIDELINE]** Prefer transactional outbox/inbox patterns when persistence and messaging must stay consistent; avoid best-effort publishing that can lose events unless explicitly acceptable.
  * **Example:** Write `OrderPlaced` to an outbox table in the same DB transaction as the order update.
* **[GUIDELINE]** Prefer explicit workflow/process managers (sagas) for long-running, multi-step business processes; keep compensation logic explicit and testable.
  * **Example:** A `FulfillmentSaga` reacts to `PaymentCaptured` and `InventoryReserved` to drive shipment creation.
* **[GUIDELINE]** Prefer emitting domain events for significant business occurrences that other parts of the system react to; avoid emitting events for trivial internal field updates.

## Backend Functions, State, And Formatting

### Function Responsibility And Abstraction
* **[STRICT]** Each function must be cohesive with one primary responsibility and operate at one level of abstraction. Separate domain policy from low-level concerns (I/O, SQL, serialization) when the function exceeds ~30 lines, the policy logic is reused elsewhere, or mixing concerns obscures the core logic. For short, single-use handlers where the logic is straightforward, inline clarity is preferred over forced separation.
  * **Example:** A 50-line handler mixing validation, business rules, and DB calls should be split; a 15-line handler that validates, saves, and returns can stay inline.
  * **Note:** Prefer splitting into helper methods within the same service/file first; only extract into a new file when the anti-fragmentation rule is satisfied. See `app/.ai/guidance/module-and-feature-layout.md#modules-architecture-and-file-structure`.
* **[STRICT]** Every function must expose an explicit input/output contract (types, invariants, and error modes) that is enforceable via types and boundary validation and is clear at call sites.
  * **Example:** A pricing function must define how it handles invalid discounts and how it reports "not applicable" vs "error".
* **[GUIDELINE]** Keep domain calculations separate from external I/O when the calculation is reused or needs to be tested in isolation. For one-off logic that only exists in a single handler, inline clarity is acceptable; do not create abstractions for single-use code.
  * **Example:** If FX conversion happens in one place, calling `fetchFxRate()` inline is fine. If it is used across multiple services, extract an `FxRateProvider`.
* **[GUIDELINE]** Prefer composing workflows from small steps (validate, decide, then execute) with each step named after domain intent; deviate only when the split adds indirection without improving readability or testability.
  * **Example:** `processOrder()` delegates to `validateOrder()`, `priceOrder()`, `reserveInventory()`, `persistOrder()`.

### Function Size
* **[STRICT]** Oversized functions are a defect: if a function requires frequent scrolling to understand, mixes multiple responsibilities, or mixes abstraction levels, refactor by extracting cohesive steps and/or moving boundary concerns out. Use ~150 lines as a strong signal, not a hard rule; a longer function is acceptable when it is linear, low-branching, and reads clearly top-to-bottom.
  * **Example:** A factory selecting implementations by type is acceptable if each case is a one-liner constructor call.
  * **Note:** Extract within the same file/service by default; only split into new files when the anti-fragmentation rule is satisfied. See `app/.ai/guidance/module-and-feature-layout.md#modules-architecture-and-file-structure`.
  * **Exception:** Files in `app/src/api/voice-agents/compiler/domain/` (prompt builders, template builders, factory classes, node definitions) may exceed these limits when they are linear and low-branching (see `app/eslint.config.js`). Core business logic should still respect size guidelines.
* **[GUIDELINE]** Prefer smaller functions when they improve naming, testability, and reuse; avoid over-extraction when it creates indirection without semantic gain. Some naturally cohesive functions are longer; prioritize clarity and single responsibility over arbitrary line counts. Extract locally within the same file first; only split into new files when the module is hard to understand or mixes responsibilities. See `app/.ai/guidance/module-and-feature-layout.md#modules-architecture-and-file-structure`.
  * **Example:** Extract `computeDiscount(order)` when it removes branching from `priceOrder()` and enables focused testing, not merely to hit a line target.

### Side Effects, Purity, And State
* **[STRICT]** Must make side effects explicit and localized: never hide I/O, time, randomness, global state changes, or non-obvious mutation behind names that imply purity or simple querying.
  * **Example:** `loadUserFromDb()` is acceptable; `getUser()` must not hit the database.
* **[STRICT]** Must never mutate input parameters unless the type and name explicitly encode "mutable out parameter" semantics and the language idiom requires it; otherwise return a new value or a rich result object.
  * **Example:** Prefer `normalizeEmail(email: string): string` over `normalizeEmail(user: User): void` that mutates `user.email`.
* **[STRICT]** Must isolate side effects at system boundaries (I/O, persistence, time, randomness) and keep core domain logic as pure and deterministic as feasible; side-effect sources must be injectable or abstracted behind ports when time/randomness affects business outcomes (expiration, scheduling, billing). Incidental timestamps such as logging and audit `createdAt` can use `Date.now()` directly.
  * **Example:** Inject `Clock` into billing/scheduling services; use `Date.now()` for log timestamps.
* **[STRICT]** Must avoid shared global mutable state; if shared state is required, encapsulate it behind a concurrency-safe abstraction with explicit ownership and lifecycle. Never mutate configuration at runtime unless explicitly designed and tested for it.
  * **Example:** Build an immutable `Config` object at startup; do not read environment variables throughout the codebase.
* **[GUIDELINE]** Prefer pure, deterministic logic for business rules and transformations, whether implemented as functions or service methods, and isolate impure code behind interfaces (repositories, gateways, clocks, random sources). Deviate only for performance or required state management, and add a short comment describing the trade-off and constraints.
  * **Example:** `// Reuse buffer to avoid allocations on hot path; not thread-safe.`
* **[GUIDELINE]** Prefer keeping state local and default to immutability; expose necessary mutation behind small, explicit APIs that can be reasoned about and tested.
  * **Example:** Keep a private cache behind `getOrCompute(key)` rather than exporting a mutable map.
* **[GUIDELINE]** Prefer command-query separation at API boundaries: queries must not mutate state, and commands must not return more state than needed. When violating, document the reason and ensure side effects are explicit and observable.
  * **Example:** `POST /payments` returns `paymentId` and status, not a full mutable payment aggregate.

### Parameters, Options, And Behavioral Switching
* **[STRICT]** Must prevent uncontrolled parameter growth: never introduce or refactor a function to take more than 5 positional parameters. If more than 5 parameters are required, introduce a typed options/parameter object with validated fields for related data or split the function so each has a smaller, coherent parameter set.
  * **Example:** Replace `createInvoice(a,b,c,d,e,f)` with `createInvoice(input: CreateInvoiceRequest)` or split responsibilities.
* **[GUIDELINE]** Prefer 0-3 parameters; allow 4-5 only when each parameter is essential, independently meaningful, and call sites remain readable. If call sites become unclear, prefer a typed options object or split the function. Prefer domain types over primitives to encode invariants and reduce ambiguity.
  * **Example:** Use `Money`, `CustomerId`, `Duration` instead of `number`/`string`/`number`.

### Flags And Modes
* **[GUIDELINE]** Avoid boolean flags that fundamentally change a function's purpose or switch between unrelated code paths; prefer distinct functions or a discriminated union. Flags that modify a single behavior (`dryRun`, `includeDeleted`, `verbose`) are acceptable when call-site intent is clear.
  * **Example:** Replace `process(data, fastMode: boolean)` with `processFast(data)` and `processSafe(data)` if the implementations diverge significantly; keep `deleteUser(id, dryRun: boolean)` when the paths share most logic.
* **[GUIDELINE]** If a single API must support multiple variants, prefer a typed options object with named fields and a constrained enum/discriminant; validate incompatible combinations early. Use this only when a unified API materially improves usability and does not obscure behavior.
  * **Example:** `render(report, { format: "pdf", includeCharts: true })` and reject `"csv"` + charts at validation.

### Control Flow, Complexity, And Formatting
* **[STRICT]** Must prefer guard clauses and early exits for invalid states to keep the "happy path" visually prominent; avoid deep nesting. If branching becomes difficult to follow, extract helpers named after domain intent and flatten control flow.
  * **Example:** Replace nested validations with `requireAuthenticated(req)`, `requireValidPayload(req.body)`, `requireAuthorized(user, action)`.
* **[GUIDELINE]** Prefer structured branching (`switch`, pattern matching, well-named local functions) when it improves readability for complex but coherent flows; prefer table-driven dispatch or polymorphism over long conditional ladders when adding new cases is likely.
  * **Example:** Use a `Map<EventType, Handler>` for event routing instead of a growing `if/else if`.

### Readability And Linting
* **[STRICT]** Must always use braces for control flow; must prefer early returns; must fix lint issues at the source. Do not use `eslint-disable` broadly or permanently. Targeted `eslint-disable-next-line` is allowed only with (1) a brief rationale comment, (2) a clear removal condition, and (3) a note in the change summary message describing why it was necessary. Broader disables require approval.
* **[GUIDELINE]** Prefer grouping related statements, minimizing vertical whitespace, and keeping imports/destructuring/object arguments on one line when <=120 characters.

### Line Length And Object Literals
* **[STRICT]** Object literals, especially log payloads, must stay inline when <=120 characters; if they exceed, wrap minimally to respect the limit. Must not prebuild log payload objects for later spreading.
  * **Example:** Keep `logger.info({ msg: "Appointments listed", orgId, contactId, totalCount, returnedCount: appointments.length });` inline when it fits.
* **[GUIDELINE]** A small local `logContext` object is allowed when reused across multiple log lines within the same scope and it improves consistency of stable keys such as `requestId` and `orgId`. Keep it local, explicitly typed, and do not use it to hide large or dynamic payload construction.
* **[STRICT]** Must keep each log line within 120 characters; wrap only when required to respect the limit.

## Backend Modules And Feature Layout

### Modules, Architecture, And File Structure
* **[STRICT]** Must enforce dependency direction: high-level policy and core domain/application logic must not depend on low-level details or infrastructure frameworks (ORMs, web frameworks, message brokers). Infrastructure must depend on domain/application via interfaces/ports.
  * **Example:** Domain depends on `UserRepository` interface; Prisma repository implements it in infrastructure.
* **[STRICT]** Must define explicit module boundaries with clear ownership and responsibilities; must avoid cyclic dependencies between modules/layers. If two modules need to collaborate, break cycles via interfaces, events, or a shared contract module.
  * **Example:** Extract `UserRepository` interface into a stable contracts layer to break infra<->domain imports.
* **[STRICT]** Each file/module must have a single clear responsibility and a stable reason to change; never create catch-all "misc" modules or "utility dumping grounds." A single responsibility can still include multiple tightly related helpers; do not split into micro-files to satisfy this rule. See the anti-fragmentation rule in this file.
  * **Example:** Do not add domain-specific formatting to `StringUtils`; keep it near the relevant domain type.
* **[STRICT]** Preserve domain cohesion and discoverability: when two or more files share a business domain, naming prefix, or lifecycle phase, place them together in a dedicated subfolder named for that concept instead of spreading them across a flat directory.
  * **Example:** `RetellPostCall*Service.ts` files live in `post-call/` alongside other post-call logic, not mixed with unrelated services.
* **[STRICT]** Anti-Fragmentation: keep related logic together; do not create micro-files. Default to colocating helper functions, local types, and constants with their primary module. Split into additional files only when **both** of the following are true:
  1. The primary module is hard to understand due to size/branching or it mixes distinct responsibilities; **and**
  2. The extracted content forms a cohesive, independently meaningful unit, not a single tiny helper.
  * **Hard limits:** Do not create new helper/utility files under ~40 lines or containing a single trivial helper. If you need to extract, group related helpers/types into a single cohesive file adjacent to the primary module, such as `BillingService.ts` plus `billing-helpers.ts`, instead of multiple tiny files.
  * **Single-use helpers stay local:** If a helper is used by only one module/feature, keep it in the same file as the primary module unless the module is genuinely hard to parse.
  * **Shared helpers are still grouped:** If extraction is required for reuse across domains, prefer one shared file that groups related helpers rather than multiple single-function files. This is consistent with `app/src/shared/` usage for two or more features.
  * **Enforcement:** When refactoring for readability or deduplication, always consider merging adjacent tiny helpers before creating new files.
* **[STRICT]** Must minimize the public surface area: export only what consumers need and keep implementation details private; public APIs must be intentionally designed and difficult to misuse.
  * **Example:** Export `createOrderService()` but keep `buildOrderAggregate()` internal.
* **[STRICT]** Must not use barrel re-exports for internal module wiring; import from the defining file. Must use inline named exports at declaration time.
  * **Example:** `export function parseIncludes(...) { ... }` and import from that file directly.
* **[GUIDELINE]** A single curated "public API barrel" is allowed at a package/feature boundary, such as `index.ts`, to define the exported surface area; do not use it for internal cross-module imports.
* **[GUIDELINE]** Prefer high cohesion and low coupling; avoid temporal coupling by exposing higher-level operations rather than requiring callers to orchestrate fragile sequences.
  * **Example:** Provide `checkout.placeOrder()` rather than requiring callers to manually call `reserveInventory()`, then `persistOrder()`, then `publishEvent()` in the correct order.
* **[GUIDELINE]** Prefer composition over inheritance; use inheritance only when substitutability is valid, shared behavior is stable, and the hierarchy is shallow; avoid overriding as a control-flow mechanism.
  * **Example:** Use a retrying decorator `RetryingHttpClient` rather than subclassing and overriding internal methods.
* **[STRICT]** Introduce interfaces/abstractions only at seams that require substitution (testing seams, multiple implementations, or boundary adapters). Do not introduce abstractions solely for uniformity when only one stable implementation exists. When adding a new interface/abstraction, document the substitution reason in an ADR/module README or a brief rationale comment at the boundary.
  * **Example:** Introduce `Clock`; avoid `IUserService` without a real alternate implementation need.
* **[GUIDELINE]** Do not introduce interfaces for pure utilities or standard library-style helpers; prefer plain functions and direct imports unless a genuine substitution need exists.
* **[GUIDELINE]** Keep orchestrators small: move provider/variant-specific validation or logic into dedicated sub-services/modules so primary services stay readable and focused on workflow sequencing.
  * **Example:** Put Stripe-specific validation in `StripeBillingService` rather than bloating `BillingService`.

### File And Folder Sizing
* **[GUIDELINE]** Target 500-700 lines per file (one primary class/interface plus helpers). Do not split files just to hit a line count; prefer cohesion and the anti-fragmentation rule.
  * **Exception:** Files in `app/src/api/voice-agents/compiler/domain/` (prompt builders, template builders, factory classes, node definitions) may exceed these limits when they are linear and low-branching (see `app/eslint.config.js`). Core business logic should still respect size guidelines.

### API Feature Layout And Layering
* **[GUIDELINE]** Prefer inward dependencies: routers/controllers depend on services, services depend on repositories/utilities, repositories depend on Prisma; avoid importing HTTP/Express or ORM types into lower layers.
  * **Example:** Map HTTP DTOs to domain types in the controller/assembler boundary, not in repositories.
* **[GUIDELINE]** Create a new API folder under `app/src/api/<feature>/` when a new OpenAPI base route is introduced; prefer matching the top-level path segment (singular). Keep base route constants beside the router and register routers in `app/src/RouterLoader.ts`.
  * **Example:** `app/src/api/orders/` for `/orders` and `ORDERS_BASE_ROUTE` beside `OrdersRouterFactory`.
* **[GUIDELINE]** Prefer a consistent feature folder shape: `contracts.ts`, `*RouterFactory.ts`, `*Validator.ts`, `*Controller.ts`, `*Service.ts`, plus `*Assembler.ts` when aggregates are composed; omit unnecessary files rather than creating empty shells.
  * **Example:** Controllers parse and delegate; services orchestrate; repositories handle persistence.
* **[GUIDELINE]** Under a feature folder, use `services/` only when there are multiple service classes and there
  is no category split. If multiple categories exist, use `<category>/` instead to group related services,
  assemblers, and utilities together.
* **[GUIDELINE]** Use the service layer as the application boundary: orchestrate business logic, cross-repository transactions, and domain-level decisions here. Route all entrypoints (HTTP, queues, cron) through the same services to avoid duplicated workflows.
  * **Example:** Both an HTTP controller and a queue consumer call `OrderService.placeOrder()`.
* **[STRICT]** All database access must live in repositories under `app/src/repositories/` and be invoked by services/controllers/helper classes/utilities only through repository methods. Services/controllers/helper classes/utilities must not issue Prisma queries or call `PrismaService` directly; when new access patterns are needed, introduce or extend a repository, including specialized repositories for complex scenarios. For multi-repository flows, services may coordinate `PrismaService.$transaction` or `BaseRepository.withTransaction` and pass the executor down to repositories.
  * **Example:** `OrderService` opens a transaction and passes `tx` into `OrderRepository` and `InventoryRepository`, which perform the Prisma calls.
* **[GUIDELINE]** Shared helpers belong in `app/src/shared/` only when they are truly domain-agnostic and
  reused across multiple features; consolidate duplicated logic here, while shared feature logic must live
  under the feature or `app/src/services/`. Examples include `app/src/shared/cache/`,
  `app/src/shared/http/`, `app/src/shared/parsing/`, `app/src/shared/prisma/`,
  `app/src/shared/time/`, `app/src/shared/validation/`, and `app/src/shared/types/`. Structure is flexible,
  and files/subfolders may be adjusted, added, or removed as needed.
  * **Example:** Keep `includesUtil` in helpers; keep billing proration rules inside the billing feature/domain.
* **[GUIDELINE]** Reserve `app/src/services/` for infrastructural/external concerns (caching, messaging, email, crypto, third-party APIs); business-domain workflows should stay in feature services and use adapters/ports to avoid coupling to vendors.
* **[GUIDELINE]** Keep route shapes and request/response bodies aligned with `common/openapi.yaml` and the generated `emly-common` types; parse includes/filters via `includesUtil`/`requestUtil`, assemble DTOs via `DtoMapper` and feature assemblers, and return through `ResponseHandler`. If a temporary mismatch is unavoidable, document it at the call site and follow up to align the contract.

## Backend Naming And Comments

### Naming
* **[STRICT]** Must use intention-revealing names that communicate purpose, domain meaning, and constraints; names must be understandable without requiring comments. Never use vague placeholders such as `data`, `info`, `temp`, or `thing` except in trivial, tightly scoped contexts where meaning is unambiguous from immediate usage, and never use misleading names.
  * **Example:** Use `retryBackoffMs` not `tmp`, and `callOutcomeSummary` not `summary`.
* **[STRICT]** Must encode units, precision, format, and relevant constraints in identifiers whenever ambiguity could cause defects or misuse. Never mix units or formats without explicit conversion at a boundary, and reflect that conversion in names.
  * **Example:** Use `timeoutMs`, `amountCents`, `phoneNumberE164`, `isoTimestamp`; perform `secondsFromConfig * 1000` in a config/adapter boundary.
* **[STRICT]** Must use consistent vocabulary for the same domain concept across files and layers within the same bounded context; never introduce synonyms internally. If an external system uses different terminology, translate only at the boundary and use the internal term everywhere else.
  * **Example:** Internally use `FulfillmentCenter`; map external `warehouse` fields in the repository/adapter.
* **[STRICT]** Must name booleans as predicates or states (`is*`, `has*`, `can*`, `should*` or language-idiomatic equivalents) and ensure the name matches truthiness semantics. Never use double negatives or inverted meanings unless required by an external interface; if required, map the negation at the boundary and keep internal names positive.
  * **Example:** Map `CACHE_DISABLED` to `isCacheEnabled = !cacheDisabledFromEnv`.
* **[GUIDELINE]** Avoid 1-3 character identifiers in non-trivial scopes. Short names are acceptable for loop indices (`i`, `j`), widely accepted conventions (`id`, `tx`, `db`, `fn`), request/response (`req`, `res`), and other cases where meaning is obvious from immediate context.
  * **Example:** Allow `i` in a loop, `id` for identifiers, `tx` for transactions; avoid `cfg`, `obj`, `rb` where a descriptive name would be clearer.
* **[STRICT]** Must name side-effecting operations explicitly to signal mutation or external interaction; never give a side-effecting function a pure/computational name. Keep pure functions free of verbs that imply external effects.
  * **Example:** Use `persistOrder(order)` and `sendInvoiceEmail(invoice)`; do not name them `handleOrder` or `processInvoice`.
* **[STRICT]** Must maintain consistent naming conventions across the codebase for files and folders and apply them mechanically: folder names use kebab-case for multi-word names; API feature folders match the top-level route segment (singular); primary-class files use UpperCamelCase; utility-only files use kebab-case; base route constants are named `*_BASE_ROUTE` and live beside the router.
  * **Example:** `routes/orders/`, `OrderService.ts`, `date-parsing.ts`, `ORDERS_BASE_ROUTE`.
* **[GUIDELINE]** Prefer one primary export/class per file, but allow tightly coupled helper functions and local types to be colocated when it improves readability and reduces navigation overhead. Do not split into micro-files to satisfy this guideline; see `app/.ai/guidance/module-and-feature-layout.md#modules-architecture-and-file-structure`.
* **[GUIDELINE]** Prefer names that are searchable, pronounceable, and consistent with project and language conventions; avoid cryptic abbreviations and non-standard casing unless the shortened form is an established domain term and unambiguous in context.
  * **Example:** Prefer `userIndex` over `idx` in multi-step logic; allow `SLA` when used consistently as a domain term.
* **[GUIDELINE]** Prefer "what" over "how" in names at higher abstraction levels (public APIs, domain services, application use-cases), and reserve "how" details for private helpers. If an implementation detail must appear in a name, isolate it behind a private boundary.
  * **Example:** Public `persistOrder()` may call private `insertOrderRow()`.
* **[GUIDELINE]** Prefer names that read as correct sentences at call sites, especially for predicates and commands; optimize for call-site clarity over brevity of the callee name.
  * **Example:** `if (isRateLimitExceeded(userId)) { ... }`.
* **[GUIDELINE]** Prefer domain terminology over generic role words (`Manager`, `Helper`, `Util`) unless the responsibility is truly narrow, generic, and stable across contexts; if a component coordinates multiple responsibilities, split it and name each part after its single responsibility.
  * **Example:** Prefer `FulfillmentPolicy` over `RulesManager`.
* **[GUIDELINE]** Prefer not encoding type information in names when the language/type system already makes it obvious, but include domain qualifiers when they prevent confusion or unit/format errors.
  * **Example:** Prefer `createdAt` when typed, but keep `amountCents` and `phoneNumberE164`.

### Comments And Documentation
* **[STRICT]** Base comment rules live in `.ai/guidance/repository-rules.md#strict-comment-rules`.
* **[GUIDELINE]** Backend comments should prefer domain intent, invariants, incident constraints, or performance trade-offs that cannot be expressed clearly through names and structure.
* **[GUIDELINE]** Document contracts at external API boundaries (HTTP endpoints, published SDK methods, message queue contracts): accepted inputs, validation rules, error semantics, side effects. Internal exports can rely on types and naming for clarity; avoid verbose JSDoc on every internal function.
  * **Example:** For `POST /payments`, document idempotency-key behavior and the structured error shape for duplicate keys. Internal service methods do not need JSDoc if the signature is clear.
* **[STRICT]** Must never use commented-out code as version control; delete dead code and rely on history. TODO/FIXME notes must be actionable (what/why and the condition for removal) and include a link to a Linear issue.
  * **Example:** `// TODO(remove after Q2 migration): accept legacy field "warehouseId" until clients upgrade. See https://linear.app/emlyai/issue/EML-520/discuss-with-team-roadmap-cost-revenue-projections-breakdowns-then`
* **[GUIDELINE]** Prefer decision records for architectural trade-offs that affect multiple modules; keep them short and linkable from code at the boundary, or place a brief rationale comment near the module entry point if no ADR system exists.
  * **Example:** A module README explains why an append-only model was chosen and the rollback plan.

## Backend Observability

### Logging And Observability
* **[STRICT]** Must log at boundaries and key decisions using structured, stable keys; logs must be searchable and consistent across services. Must redact secrets, credentials, tokens, and sensitive personal data.
  * **Example:** Log `requestId`, `userId`, and `errorCategory`; never log `Authorization` headers.
* **[STRICT]** Logs must be actionable: include correlation identifiers, component names, and error categories; avoid vague messages.
  * **Example:** Prefer "DB timeout on GetOrders (warehouseId=..., requestId=...)" over "Something went wrong."
* **[STRICT]** Must keep each log line within 120 characters; wrap only to respect the limit.
* **[GUIDELINE]** Prefer metrics and tracing for performance and reliability insights rather than adding verbose logs everywhere; prefer consistent error taxonomy and log levels across services to support unified alerting.

## Backend Persistence And Prisma

### Database, Prisma, Persistence, And Migrations
* **[STRICT]** Must preserve data integrity: enforce critical constraints in the database (unique, foreign keys, not-null) and align application validation with those constraints; must not rely solely on application logic for critical integrity.
  * **Example:** Add a unique index on `(tenantId, emailNormalized)` rather than only checking in code.
* **[STRICT]** Must use transactions for multi-step operations that require atomicity and must define isolation/locking strategy when consistency matters; must never perform partial writes that can leave persistent state inconsistent on failure.
  * **Example:** Wrap "create order + reserve inventory + record payment intent" in a transaction or an explicitly designed compensating workflow.
* **[STRICT]** Must keep database transactions short and DB-only; must never perform network I/O, AI calls, queues, or long-running computation inside Prisma interactive transactions. If external side effects are required, run them outside the transaction, then re-lock/revalidate state and commit in a short transaction with idempotency/optimistic checks.
  * **Example:** Charge payment outside the transaction; persist results in a new short transaction guarded by idempotency keys.
* **[STRICT]** Must prevent injection and unsafe query construction: must never interpolate untrusted input into raw SQL; raw SQL must be parameterized and justified.
  * **Example:** Use Prisma safe parameter mechanisms for `$queryRaw`; do not concatenate user input into SQL strings.
* **[STRICT]** Must avoid N+1 query patterns and unbounded result sets; must bound list queries and must select only required fields.
  * **Example:** Use `where: { id: { in: ids } }` and `include`/`select` instead of querying per item inside a loop.
* **[STRICT]** Must bound all Prisma `findMany`/list queries with `take` (limit) and stable `orderBy`; must never ship a Prisma query that can return an unbounded dataset.
  * **Example:** `findMany({ where, orderBy: { createdAt: "desc" }, take: 50, cursor })`.
* **[STRICT]** Must control selected fields and relation loading to avoid over-fetching; must use `select` for projections and `include` only when relation data is required; must never return or process sensitive fields when not needed.
  * **Example:** Select `{ id, name, status }` and avoid fetching `passwordHash` or large blob/text columns unnecessarily.
* **[STRICT]** Must make persistence boundaries explicit; domain logic must not depend on ORM-specific lazy-loading side effects. Repositories must return fully defined aggregates or explicit projections.
  * **Example:** `getOrderWithItems(orderId)` explicitly loads items rather than relying on implicit lazy loads.
* **[STRICT]** Must treat schema and migrations as first-class code: changes must be versioned, reviewed, and applied via migrations; must never rely on manual production edits. Must never run destructive migrations without an explicit data preservation/backfill and compatibility plan.
  * **Example:** Expand -> backfill -> enforce NOT NULL later; do not drop a column before readers are migrated.
* **[GUIDELINE]** Prefer explicit query shape and stable ordering for pagination; offset pagination is acceptable for small datasets, but prefer cursor pagination for large or frequently updated datasets and constrain maximum offsets/limits when offset is used.
  * **Example:** Cursor paginate by `(createdAt, id)` for deterministic ordering.
* **[GUIDELINE]** Prefer Prisma Client query APIs over raw SQL; use raw queries only when Prisma cannot express the required operation or performance is demonstrably insufficient. Raw queries must be isolated behind a repository method with tests that validate shape and constraints.
  * **Example:** Wrap a window-function query in `OrderAnalyticsRepository.getDailyCounts()` and keep it parameterized.
* **[GUIDELINE]** Prefer using `findUnique` with truly unique constraints; if `findFirst` is used, document why uniqueness is not enforced.
  * **Example:** Add `@@unique([tenantId, externalId])` then use `findUnique` on the compound key.
* **[GUIDELINE]** Prefer explicit concurrency control (optimistic locking/version fields or unique constraints) for invariants under contention; document how conflicts are detected and resolved.
  * **Example:** Use a version column and retry on conflict for low-contention updates.

## Backend Reuse, Refactoring, And Object Design

### DRY, Reuse, Dead Code, And Code Generation
* **[STRICT]** Must keep rules/algorithms/constants in a single authoritative place; must reuse existing helpers/types before adding new ones; must not duplicate knowledge that must stay consistent across the system.
  * **Example:** If both API and DB need the same enum, define it once or generate one from the other.
* **[STRICT]** Must aggressively remove unused code/branches; if removal breaks something, must fix the usage or delete the dependent path too. Must not keep dead paths "just in case."
* **[STRICT]** Must not use copy-paste as a long-term solution for shared business rules or invariants; if duplication is temporarily required, it must be explicitly annotated with the single source of truth and a consolidation plan.
  * **Example:** `// Duplicates rule in UserPolicy.validateEmail(); consolidate after migration.`
* **[STRICT]** Must not create "shared" abstractions that couple independent capabilities without a stable, shared owner and versioning strategy; sharing must not force synchronized deployments unless explicitly intended.
  * **Example:** Do not move unrelated DTOs into a shared library consumed by multiple services without governance/versioning.
* **[GUIDELINE]** Prefer readable duplication over premature abstraction when the abstraction would be speculative, hide important differences, or couple unrelated modules; remove duplication once the commonality stabilizes.
* **[GUIDELINE]** Prefer generating repetitive boilerplate (clients, DTOs, serializers) from schemas over hand-maintaining parallel representations when schemas are the stable source of truth.

### Refactoring Discipline
* **[STRICT]** Must keep refactors behavior-preserving unless explicitly performing a behavior change; behavior changes must be separately justified and covered by tests. Must not mix large refactors with feature work without incremental checkpoints.
  * **Example:** First extract a repository and ensure checks pass; then add the new query feature separately.
* **[STRICT]** Must perform refactoring in small, reversible steps with frequent test runs and version control checkpoints; if tests are missing, must add characterization tests before changing behavior.
  * **Example:** Add golden-master checks for legacy output before restructuring a parser.
* **[GUIDELINE]** Prefer addressing obvious "broken windows" (misleading names, dead code, stale comments) when touching code, as long as the change is safe and test-backed; avoid cosmetic churn that destabilizes history or increases merge conflicts.
* **[GUIDELINE]** Prefer refactoring toward clearer boundaries and simpler dependencies rather than micro-optimizing style; prefer established refactoring patterns (extract function, introduce parameter object, replace conditional with polymorphism) over bespoke transformations.

### Object Design, Interfaces, And Encapsulation
* **[STRICT]** Classes and modules must be cohesive with a single primary reason to change; must never create god objects that coordinate unrelated concerns; must split by responsibility and compose explicitly when a unit grows beyond a clear responsibility.
  * **Example:** Split `UserService` into focused services and keep a thin orchestrator only if needed.
* **[STRICT]** Must encapsulate mutable state and collections; must never expose internal mutable arrays/maps/fields for external mutation; must provide intent-revealing methods that preserve invariants.
  * **Example:** Provide `cart.addItem(item)` and do not expose `cart.items` as a mutable array.
* **[STRICT]** Constructors/factories must establish a valid invariant-complete instance; must never publish partially initialized objects. If initialization can fail, use a factory returning a typed error/result or throwing a domain-specific exception.
  * **Example:** `Order.create(dto)` validates totals and line items before producing an `Order`.
* **[STRICT]** Implementations must adhere to substitutability for interfaces/base types: must not strengthen preconditions or weaken postconditions relative to the contract; if substitutability is unclear, split the interface.
  * **Example:** If one payment implementation cannot support refunds, it must not implement `RefundablePayment`.
* **[GUIDELINE]** Prefer cohesive interfaces that represent a single capability. Avoid god interfaces that mix unrelated concerns, but do not split interfaces that naturally belong together just because some consumers use a subset; fragmented interfaces harm discoverability.
  * **Example:** Keep `UserRepository` as one interface with read/write methods; split only if read-only access is a genuinely separate capability, such as a reporting module that must not write.
* **[GUIDELINE]** Prefer readonly/immutable fields for state that should not change after construction; expose necessary mutation only through narrow methods with clear preconditions/postconditions.
  * **Example:** `transitionTo(status)` enforces allowed status transitions.

## Backend Configuration And Dependencies

### Configuration And Feature Flags
* **[STRICT]** Must keep configuration outside code and inject it via environment/config files/secret stores appropriate to the platform; must never hardcode environment-specific values (hosts, credentials, feature flags) in source.
  * **Example:** Read DB URL from `DATABASE_URL`, not a repository constant.
* **[STRICT]** Must validate configuration at startup and fail fast and clearly when required settings are missing or invalid; errors must not leak secrets.
  * **Example:** Refuse to start if `JWT_SIGNING_KEY` is missing in production.
* **[STRICT]** Must not branch behavior on environment in scattered places; must centralize environment-specific choices behind configuration flags and adapters.
  * **Example:** Select S3 vs local storage via a `StorageProvider` chosen in composition root, not via `if (NODE_ENV === "production")` throughout.
* **[STRICT]** Feature flags must be safe: default behavior must be well-defined; flag evaluation must not create inconsistent partial updates within a single request/transaction. Evaluate a flag once per request and pass the decision downward.
  * **Example:** Compute `useNewPricingEngine` once and thread it through, rather than re-checking mid-flight.
* **[GUIDELINE]** Prefer typed, schema-validated configuration with explicit documentation of each setting, including units and allowed ranges; avoid over-parameterization.
  * **Example:** Validate `REQUEST_TIMEOUT_MS` is an integer within an allowed range.
* **[GUIDELINE]** Prefer feature flags for incremental rollout of risky changes; flags must be observable, have owners, and include an expiration/removal condition.
  * **Example:** `FEATURE_NEW_CHECKOUT` with metrics and `// Remove after 100% rollout and 2 weeks stable.`
* **[GUIDELINE]** Prefer separating configuration (environment-specific constants) from domain policy (business rules); business rules should live in versioned code or explicitly versioned policy stores with audit trails.

### Dependencies And Third-Party Integrations
* **[STRICT]** Before adding new helpers or utilities, must check `app/package.json` to ensure no existing package covers the use case; must use established libraries for standard problems instead of rolling custom solutions.
* **[STRICT]** Must not introduce a new third-party dependency for trivial functionality if the standard library or existing dependencies suffice; must not rely on undocumented or unstable internals of dependencies.
* **[STRICT]** Must pin and manage dependency versions predictably (lockfiles, explicit ranges) and avoid dependency churn that destabilizes builds.
* **[STRICT]** Must encapsulate external service clients (payment processors, telephony providers, AI services, CRMs) behind adapter boundaries; their types/exceptions must not leak into domain APIs. Utility libraries such as date parsing, string manipulation, and validation do not require wrapper abstractions.
  * **Example:** Wrap Stripe/Retell/OpenAI clients in adapters that expose domain types; use date-fns or zod directly without wrapping.
* **[STRICT]** Must inject dependencies explicitly for services and components with external dependencies; object creation for these must occur at a composition root. Must not hide service dependencies behind global singletons or service locators. Pure utility functions may create internal helper objects (formatters, parsers) without injection.
  * **Example:** Inject `PaymentGateway` and `UserRepository` into services; a `formatCurrency()` utility can internally use `Intl.NumberFormat`.
* **[GUIDELINE]** Prefer a "dependency diet": reduce transitive dependency surface, especially for security-critical or runtime-critical components; prefer small, well-maintained libraries with clear licensing.
* **[GUIDELINE]** Prefer writing adapters around unstable APIs; keep integration code thin and isolate retries/backoff, rate limits, pagination, and error normalization so provider changes are localized to the adapter.

## Backend TypeScript And Domain Semantics

### TypeScript Types And Contract Discipline
* **[STRICT]** Must use canonical types and schemas from designated shared packages and Prisma-generated types; never duplicate or alias shapes when a canonical definition exists.
  * **Example:** Import the canonical `UserDTO`/Prisma type instead of redefining `{ id: string; ... }` in a feature module.
* **[STRICT]** For runtime validation in `app/`, use `*Schema` exports from `emly-common` (`parseRequestParams`, `parseRequestQuery`, `parseRequestBody`). Do **not** import or reference `*Register`/OpenAPI registry types in runtime validation; those are for `common` OpenAPI registration only.
* **[STRICT]** Must avoid `any` and unnecessary casts; never cast to silence the type system when a guard, generic, or discriminated union can express the constraint. Must remove casts if TypeScript already type-checks without them.
  * **Example:** Use `if (isPaymentEvent(x))` to narrow instead of `x as PaymentEvent`.
* **[GUIDELINE]** Prefer `enum` for fixed sets when the set is stable and benefits from nominal typing; prefer `as const` objects when you need computed values, better type inference, or iteration over entries. Use plain `const` for standalone primitives.
  * **Example:** Use `enum PaymentStatus { Pending, Paid }` for status fields; use `as const` for lookup tables or when values must be iterable.
* **[GUIDELINE]** Prefer explicit types at module boundaries: annotate exported functions, public methods, and externally consumed objects with parameter/return types.
  * **Example:** `export function createOrder(input: CreateOrderRequest): Promise<CreateOrderResponse> { ... }`
* **[STRICT]** Prefer explicit type annotations for locals and members when declaring variables, constants, and class fields. Do not rely on inference for non-trivial values, even if the type seems obvious from the initializer.
  * **Example:** `const compositionPatches: readonly GraphPatch<NodeIR, EdgeIR>[] = this.compositionEngine.buildPatches(ctx);`
  * **Example:** `private readonly retryBackoffMs: number = config.retryBackoffMs;`
* **[GUIDELINE]** Prefer interfaces with explicitly typed fields for object contracts and type aliases for unions/tuples/primitives; avoid `any` in nearly all cases. Use `unknown` at trust boundaries for unvalidated external data and narrow it via parsing/validation immediately; do not allow `unknown` past the boundary into domain/application layers.
  * **Example:** Use `interface RenderOptions { format: RenderFormat; includeCharts: boolean }` and `type RenderFormat = "pdf" | "csv"`. Use `unknown` for `req.body` before schema parsing, then pass typed DTOs inward.
* **[GUIDELINE]** Prefer expressing intent with `private`/`readonly` plus type guards/narrowing instead of `any` or heavy casting.
  * **Example:** Keep `private readonly clock: Clock` and narrow union inputs via a guard before access.

### Utilities Vs Domain Types
* **[STRICT]** Class-based service defaults, utility placement, and anti-micro-file rules live in `app/.ai/guidance/module-and-feature-layout.md#modules-architecture-and-file-structure`.

### Constants And Canonical Keys
* **[GUIDELINE]** Prefer extracting magic numbers/strings into named constants tied to a domain concept or protocol contract; avoid anonymous literals in core logic.
  * **Example:** Define `MAX_PAGE_SIZE = 100` used by all list endpoints instead of repeated `100`.

### Domain Types, Invariants, And Semantics
* **[GUIDELINE]** Use plain primitives (`string`, `number`, `boolean`) for most values. Only create wrapper/branded types when confusion between values has caused or would likely cause real bugs, such as mixing currencies or mixing milliseconds with seconds in the same calculation. Descriptive parameter names and clear function signatures are usually sufficient.
  * **Example:** Use plain `string` for `customerId`, `orderId`, `email`. Use a `Money` type only if you actually do currency math that requires precision rules or multi-currency handling.
* **[GUIDELINE]** Do not create wrapper types, value objects, or branded types preemptively. If you have not seen a bug caused by value confusion, you probably do not need a wrapper type. Add them reactively when a real problem emerges, not proactively "just in case."
  * **Example:** Do not create `EmailAddress`, `PhoneNumber`, or `UserId` wrapper classes. Validate format at the boundary and use `string` internally.
* **[STRICT]** Must never represent absence or invalidity using ambiguous sentinels such as `-1`, `""`, or `"N/A"` unless a boundary protocol forces it; represent meaningful absence explicitly (`null`/`undefined`/`Option`) and document it in the contract.
  * **Example:** Use `deliveredAt: Date | null` rather than `new Date(0)`.
* **[STRICT]** Must define canonical units and time semantics and never mix units implicitly; conversions must be explicit and localized to boundaries.
  * **Example:** Store money as integer cents in domain/DB and convert to formatted currency strings only at presentation boundaries.
* **[STRICT]** Must use a single canonical time basis for storage and comparison (prefer UTC) and require explicit timezone handling for any local-time behavior; never rely on ambient locale/timezone defaults in core logic.
  * **Example:** Store timestamps in UTC and convert to `America/Vancouver` only at UI/report boundaries.
* **[STRICT]** Must maintain a single authoritative source of truth for a piece of state and define ownership; never keep duplicated mutable representations that can drift without an explicit synchronization/reconciliation strategy.
  * **Example:** Do not store both `order.total` and `sum(order.lines)` unless one is derived and is consistently recomputed or validated.
* **[GUIDELINE]** Service class grouping details live in `app/.ai/guidance/module-and-feature-layout.md#modules-architecture-and-file-structure`.
* **[GUIDELINE]** Do not create domain-specific wrapper types (`Money`, `Duration`, `Percent`) unless you have actual bugs from unit confusion or complex rounding/precision logic that benefits from centralization. For most cases, use descriptive variable names (`amountCents`, `durationMs`, `percentValue`) and keep logic inline.
  * **Example:** `const totalCents = subtotalCents + taxCents` is fine. Only create a `Money` type if you're doing multi-currency math with conversion rates.

## Backend Work Bounding And Concurrency

### Performance, Resource Management, And Work Bounding
* **[STRICT]** Must not introduce unbounded CPU, memory, or I/O work in request/consumer handlers; any loop that touches external resources must have explicit limits and batching; must reject or degrade gracefully when limits are exceeded.
  * **Example:** Cap import rows per request and process in batches.
* **[STRICT]** Must avoid unbounded loops (`for (;;)` and similar); pagination/retry loops must use explicit counters, maximum attempts, and clear exit conditions.
  * **Example:** Retry up to `maxAttempts` with a clear success/failure exit path.
* **[STRICT]** Must deterministically manage resources (files, sockets, DB connections, threads): acquisition and release must be paired even on error paths.
  * **Example:** Use `try/finally` or language RAII/`using` to ensure connections are closed.
* **[STRICT]** Must not optimize at the expense of correctness or clarity unless performance constraints are explicit and measured; performance changes require evidence (profiles, benchmarks, or metrics).
  * **Example:** Do not replace readable logic with micro-optimizations without profiling data showing a bottleneck.
* **[GUIDELINE]** Prefer linear work and bounded fan-out; avoid designs that amplify load during outages.
* **[GUIDELINE]** Prefer algorithmic improvements (fewer round-trips, better complexity) over micro-optimizations.
  * **Example:** Replace N+1 queries with a single batched query before tuning loop internals.
* **[GUIDELINE]** Prefer measuring before and after significant performance refactors and capturing the benchmark in code when it guards a known regression risk.
* **[GUIDELINE]** Prefer caching only when correctness and invalidation are well-defined; caches must have explicit TTL/eviction and observability; avoid caching as a substitute for fixing poor data access patterns.

### Concurrency And Parallelism
**Note:** Node.js is single-threaded for application code. Traditional thread-safety concerns such as mutexes and synchronization do not apply within a single process. However, with multiple ECS services, webhook handlers, and queue consumers, concurrent requests across instances can conflict on shared database state; use database-level concurrency controls.

* **[STRICT]** Await all Promises that perform side effects. Do not fire-and-forget async operations in request handlers; if background work is needed, use a queue or explicitly handle failures.
  * **Example:** Do not write `sendEmail(user)` without `await`; either await it or push to a queue for async processing.
* **[STRICT]** For operations where concurrent requests, including webhooks from external services, could conflict on the same database row, use database transactions with appropriate isolation or optimistic locking. Do not rely on application-level locks; they do not work across ECS instances.
  * **Example:** Use `SELECT ... FOR UPDATE` or a version column for inventory reservation; for webhook handlers, use idempotency keys to handle duplicate deliveries.
* **[STRICT]** Webhook handlers and queue consumers must be idempotent. External services such as Stripe and Retell may deliver the same event multiple times. Use idempotency keys or processed-event tracking to ensure reprocessing is safe.
  * **Example:** Store `stripeEventId` after processing; skip if already seen.
* **[GUIDELINE]** Keep request handlers stateless. Do not store request-scoped data in module-level variables; use request context or pass data explicitly.
* **[GUIDELINE]** When making multiple independent async calls, use `Promise.all()` for parallel execution. Avoid sequential awaits when the calls do not depend on each other.
  * **Example:** `const [user, orders] = await Promise.all([getUser(id), getOrders(id)])` instead of two sequential awaits.
