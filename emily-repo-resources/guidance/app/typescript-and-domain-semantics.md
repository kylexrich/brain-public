---
title: "Backend TypeScript And Domain Semantics"
description: "canonical shared types, runtime schemas from emly-common, explicit annotations, constants, absence, time, units, and wrapper/value-type limits."
order: 12
---

## TypeScript Types And Contract Discipline
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

## Utilities Vs Domain Types
* **[STRICT]** Class-based service defaults, utility placement, and anti-micro-file rules live in `app/.ai/guidance/module-and-feature-layout.md#modules-architecture-and-file-structure`.

## Constants And Canonical Keys
* **[GUIDELINE]** Prefer extracting magic numbers/strings into named constants tied to a domain concept or protocol contract; avoid anonymous literals in core logic.
  * **Example:** Define `MAX_PAGE_SIZE = 100` used by all list endpoints instead of repeated `100`.

## Domain Types, Invariants, And Semantics
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
