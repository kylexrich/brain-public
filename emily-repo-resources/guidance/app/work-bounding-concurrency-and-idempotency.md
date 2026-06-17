---
title: "Backend Work Bounding And Concurrency"
description: "bounded CPU, memory, and I/O; retry loops; resource lifecycle; performance evidence; Promise handling; idempotency; and stateless request handling."
order: 13
---

## Performance, Resource Management, And Work Bounding
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

## Concurrency And Parallelism
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
