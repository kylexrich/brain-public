---
title: "Backend Persistence And Prisma"
description: "database integrity, transactions, query bounds, selected fields, raw SQL, migrations, pagination, and concurrency controls."
order: 9
---

## Database, Prisma, Persistence, And Migrations
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
