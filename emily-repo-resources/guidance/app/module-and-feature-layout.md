---
title: "Backend Modules And Feature Layout"
description: "dependency direction, anti-fragmentation, file sizing, API feature folders, repository-only database access, shared helper placement, and service/assembler/util/category splits."
order: 6
---

## Modules, Architecture, And File Structure
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

## File And Folder Sizing
* **[GUIDELINE]** Target 500-700 lines per file (one primary class/interface plus helpers). Do not split files just to hit a line count; prefer cohesion and the anti-fragmentation rule.
  * **Exception:** Files in `app/src/api/voice-agents/compiler/domain/` (prompt builders, template builders, factory classes, node definitions) may exceed these limits when they are linear and low-branching (see `app/eslint.config.js`). Core business logic should still respect size guidelines.

## API Feature Layout And Layering
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
