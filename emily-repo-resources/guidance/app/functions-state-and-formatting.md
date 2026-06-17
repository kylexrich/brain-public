---
title: "Backend Functions, State, And Formatting"
description: "function responsibility, size, side effects, parameter growth, flags/modes, guard clauses, linting, and 120-character object/log-line formatting."
order: 5
---

## Function Responsibility And Abstraction
* **[STRICT]** Each function must be cohesive with one primary responsibility and operate at one level of abstraction. Separate domain policy from low-level concerns (I/O, SQL, serialization) when the function exceeds ~30 lines, the policy logic is reused elsewhere, or mixing concerns obscures the core logic. For short, single-use handlers where the logic is straightforward, inline clarity is preferred over forced separation.
  * **Example:** A 50-line handler mixing validation, business rules, and DB calls should be split; a 15-line handler that validates, saves, and returns can stay inline.
  * **Note:** Prefer splitting into helper methods within the same service/file first; only extract into a new file when the anti-fragmentation rule is satisfied. See `app/.ai/guidance/module-and-feature-layout.md#modules-architecture-and-file-structure`.
* **[STRICT]** Every function must expose an explicit input/output contract (types, invariants, and error modes) that is enforceable via types and boundary validation and is clear at call sites.
  * **Example:** A pricing function must define how it handles invalid discounts and how it reports "not applicable" vs "error".
* **[GUIDELINE]** Keep domain calculations separate from external I/O when the calculation is reused or needs to be tested in isolation. For one-off logic that only exists in a single handler, inline clarity is acceptable; do not create abstractions for single-use code.
  * **Example:** If FX conversion happens in one place, calling `fetchFxRate()` inline is fine. If it is used across multiple services, extract an `FxRateProvider`.
* **[GUIDELINE]** Prefer composing workflows from small steps (validate, decide, then execute) with each step named after domain intent; deviate only when the split adds indirection without improving readability or testability.
  * **Example:** `processOrder()` delegates to `validateOrder()`, `priceOrder()`, `reserveInventory()`, `persistOrder()`.

## Function Size
* **[STRICT]** Oversized functions are a defect: if a function requires frequent scrolling to understand, mixes multiple responsibilities, or mixes abstraction levels, refactor by extracting cohesive steps and/or moving boundary concerns out. Use ~150 lines as a strong signal, not a hard rule; a longer function is acceptable when it is linear, low-branching, and reads clearly top-to-bottom.
  * **Example:** A factory selecting implementations by type is acceptable if each case is a one-liner constructor call.
  * **Note:** Extract within the same file/service by default; only split into new files when the anti-fragmentation rule is satisfied. See `app/.ai/guidance/module-and-feature-layout.md#modules-architecture-and-file-structure`.
  * **Exception:** Files in `app/src/api/voice-agents/compiler/domain/` (prompt builders, template builders, factory classes, node definitions) may exceed these limits when they are linear and low-branching (see `app/eslint.config.js`). Core business logic should still respect size guidelines.
* **[GUIDELINE]** Prefer smaller functions when they improve naming, testability, and reuse; avoid over-extraction when it creates indirection without semantic gain. Some naturally cohesive functions are longer; prioritize clarity and single responsibility over arbitrary line counts. Extract locally within the same file first; only split into new files when the module is hard to understand or mixes responsibilities. See `app/.ai/guidance/module-and-feature-layout.md#modules-architecture-and-file-structure`.
  * **Example:** Extract `computeDiscount(order)` when it removes branching from `priceOrder()` and enables focused testing, not merely to hit a line target.

## Side Effects, Purity, And State
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

## Parameters, Options, And Behavioral Switching
* **[STRICT]** Must prevent uncontrolled parameter growth: never introduce or refactor a function to take more than 5 positional parameters. If more than 5 parameters are required, introduce a typed options/parameter object with validated fields for related data or split the function so each has a smaller, coherent parameter set.
  * **Example:** Replace `createInvoice(a,b,c,d,e,f)` with `createInvoice(input: CreateInvoiceRequest)` or split responsibilities.
* **[GUIDELINE]** Prefer 0-3 parameters; allow 4-5 only when each parameter is essential, independently meaningful, and call sites remain readable. If call sites become unclear, prefer a typed options object or split the function. Prefer domain types over primitives to encode invariants and reduce ambiguity.
  * **Example:** Use `Money`, `CustomerId`, `Duration` instead of `number`/`string`/`number`.

## Flags And Modes
* **[GUIDELINE]** Avoid boolean flags that fundamentally change a function's purpose or switch between unrelated code paths; prefer distinct functions or a discriminated union. Flags that modify a single behavior (`dryRun`, `includeDeleted`, `verbose`) are acceptable when call-site intent is clear.
  * **Example:** Replace `process(data, fastMode: boolean)` with `processFast(data)` and `processSafe(data)` if the implementations diverge significantly; keep `deleteUser(id, dryRun: boolean)` when the paths share most logic.
* **[GUIDELINE]** If a single API must support multiple variants, prefer a typed options object with named fields and a constrained enum/discriminant; validate incompatible combinations early. Use this only when a unified API materially improves usability and does not obscure behavior.
  * **Example:** `render(report, { format: "pdf", includeCharts: true })` and reject `"csv"` + charts at validation.

## Control Flow, Complexity, And Formatting
* **[STRICT]** Must prefer guard clauses and early exits for invalid states to keep the "happy path" visually prominent; avoid deep nesting. If branching becomes difficult to follow, extract helpers named after domain intent and flatten control flow.
  * **Example:** Replace nested validations with `requireAuthenticated(req)`, `requireValidPayload(req.body)`, `requireAuthorized(user, action)`.
* **[GUIDELINE]** Prefer structured branching (`switch`, pattern matching, well-named local functions) when it improves readability for complex but coherent flows; prefer table-driven dispatch or polymorphism over long conditional ladders when adding new cases is likely.
  * **Example:** Use a `Map<EventType, Handler>` for event routing instead of a growing `if/else if`.

## Readability And Linting
* **[STRICT]** Must always use braces for control flow; must prefer early returns; must fix lint issues at the source. Do not use `eslint-disable` broadly or permanently. Targeted `eslint-disable-next-line` is allowed only with (1) a brief rationale comment, (2) a clear removal condition, and (3) a note in the change summary message describing why it was necessary. Broader disables require approval.
* **[GUIDELINE]** Prefer grouping related statements, minimizing vertical whitespace, and keeping imports/destructuring/object arguments on one line when <=120 characters.

## Line Length And Object Literals
* **[STRICT]** Object literals, especially log payloads, must stay inline when <=120 characters; if they exceed, wrap minimally to respect the limit. Must not prebuild log payload objects for later spreading.
  * **Example:** Keep `logger.info({ msg: "Appointments listed", orgId, contactId, totalCount, returnedCount: appointments.length });` inline when it fits.
* **[GUIDELINE]** A small local `logContext` object is allowed when reused across multiple log lines within the same scope and it improves consistency of stable keys such as `requestId` and `orgId`. Keep it local, explicitly typed, and do not use it to hide large or dynamic payload construction.
* **[STRICT]** Must keep each log line within 120 characters; wrap only when required to respect the limit.
