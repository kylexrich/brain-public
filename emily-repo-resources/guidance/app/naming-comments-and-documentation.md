---
title: "Backend Naming And Comments"
description: "explicit naming, units and formats in identifiers, comment limits, TODO requirements, and documentation expectations."
order: 7
---

## Naming
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

## Comments And Documentation
* **[STRICT]** Base comment rules live in `.ai/guidance/repository-rules.md#strict-comment-rules`.
* **[GUIDELINE]** Backend comments should prefer domain intent, invariants, incident constraints, or performance trade-offs that cannot be expressed clearly through names and structure.
* **[GUIDELINE]** Document contracts at external API boundaries (HTTP endpoints, published SDK methods, message queue contracts): accepted inputs, validation rules, error semantics, side effects. Internal exports can rely on types and naming for clarity; avoid verbose JSDoc on every internal function.
  * **Example:** For `POST /payments`, document idempotency-key behavior and the structured error shape for duplicate keys. Internal service methods do not need JSDoc if the signature is clear.
* **[STRICT]** Must never use commented-out code as version control; delete dead code and rely on history. TODO/FIXME notes must be actionable (what/why and the condition for removal) and include a link to a Linear issue.
  * **Example:** `// TODO(remove after Q2 migration): accept legacy field "warehouseId" until clients upgrade. See https://linear.app/emlyai/issue/EML-520/discuss-with-team-roadmap-cost-revenue-projections-breakdowns-then`
* **[GUIDELINE]** Prefer decision records for architectural trade-offs that affect multiple modules; keep them short and linkable from code at the boundary, or place a brief rationale comment near the module entry point if no ADR system exists.
  * **Example:** A module README explains why an append-only model was chosen and the rollback plan.
