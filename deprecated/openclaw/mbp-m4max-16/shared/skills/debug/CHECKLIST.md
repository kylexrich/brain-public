# Debug Investigation Checklist

Use the sections that fit the bug. Skip irrelevant checks. Back every checked item with file paths, logs, queries, or command output.

## 1) Intake

- [ ] Capture observed behavior, expected behavior, and exact error/stack trace
- [ ] Record reproduction steps; reproduce if possible
- [ ] Capture the exact failing command / request / test and observed output when available
- [ ] Note timeframe, frequency, and affected users/entities/IDs
- [ ] Map the project's actual environments and evidence sources (`local`, `ci`, `preview`, `staging`, `beta`, `prod`, hosted, etc.)
- [ ] Confirm the exact target environment for this investigation
- [ ] Note recent deploys, releases, config changes, or incidents
- [ ] Read applicable `AGENTS.md`, README, runbooks, and incident docs before deep investigation

## 2) Code Path

- [ ] Identify every entry point: route, handler, CLI, cron, job, webhook, consumer, event listener
- [ ] Trace the success path and the failure path end to end
- [ ] Check branching logic, flags, middleware, retries, and background work
- [ ] Check validation, parsing, serialization, transformations, and null handling
- [ ] Check error handling, fallbacks, and returned error types
- [ ] Mark suspicious `file:line` locations

## 3) Recent Changes

- [ ] Review `git log` / `git diff` on affected paths
- [ ] Find the last known-good state
- [ ] Check shared utilities, schema/migration changes, and config changes
- [ ] Check dependency bumps, reverts, and hotfixes

## 4) Data & State

- [ ] Validate inputs: null/empty/wrong type/boundary/encoding/timezone/size
- [ ] Verify DB/cache/file state, relationships, timestamps, and status values
- [ ] Check for stale cache, partial writes, orphaned records, or corrupted state
- [ ] Check lifecycle/state-machine transitions and rollback behavior

## 5) Timing & Concurrency

- [ ] Look for races, duplicate work, out-of-order events, stale reads, or TOCTOU gaps
- [ ] Check locking, transactions, optimistic concurrency, and idempotency
- [ ] Check timeouts: HTTP, DB, queue, worker, DNS, TLS
- [ ] Check retries, circuit breakers, and retry storms
- [ ] Check flaky-test factors: order dependence, random seed, clock/time assumptions, shared-state cleanup, parallel execution, and test pollution

## 6) External Systems

- [ ] Check third-party API errors, schema/contract changes, rate limits, and auth expiry
- [ ] Check queues, storage, cache, search, and serverless/runtime limits
- [ ] Check network, DNS, TLS, proxy, load balancer, and routing issues

## 7) Auth & Permissions

- [ ] Check tokens, sessions, cookies, CORS, OAuth/OIDC, and API keys
- [ ] Check roles, ownership, tenancy, quotas, or subscription gates
- [ ] Check stale permission caches or cross-tenant leakage risks

## 8) Errors & Logs

- [ ] Start with the newest logs first; expand backward only as needed
- [ ] Search exact error text, stack traces, timestamps, and request/correlation IDs
- [ ] Look for spikes, repeats, cliff-edge drops, and silent failures
- [ ] Check swallowed errors, generic wrappers, unhandled async failures, and crash recovery
- [ ] Check log quality: levels, timestamps, structured fields, missing context, secret leakage

## 9) Config & Build

- [ ] Check env vars, feature flags, config syntax, precedence, and secret validity
- [ ] Check lockfiles, transitive conflicts, native builds, and platform mismatches
- [ ] Check stale artifacts, hot reload/watch issues, and wrong binaries/images
- [ ] Check resource limits, pool sizes, health checks, and service discovery

## 10) Local Scope

- [ ] Read recent local logs
- [ ] Verify local services, ports, filesystem, disk, and permissions
- [ ] Verify local DB/cache state
- [ ] Verify the running build matches current source

## 11) Deployed Scope

- [ ] Identify affected environment, region, instance, and user subset
- [ ] Review app logs, platform logs, metrics, traces, and alert history
- [ ] Review deployment history and recent config/infra changes
- [ ] Check service health, restarts, OOMs, queue depth, DB pressure, LB health, DNS, TLS
- [ ] Use read-only queries and inspections only; document every query

## 12) Bug Archetypes

- [ ] Data flow / serialization / header / routing mismatch
- [ ] Cache staleness / state corruption / migration drift
- [ ] Off-by-one / boolean / float / date-time / timezone logic
- [ ] Contract mismatch between producer and consumer
- [ ] Platform-specific behavior: OS, filesystem, container, CI
- [ ] Memory leak, handle leak, or gradual degradation

## 13) Evidence & Synthesis

- [ ] For each finding, record location, raw evidence snippet, interpretation, confidence, and corroboration / conflict
- [ ] Separate root cause from symptoms
- [ ] Explain what changed and why it surfaced now
- [ ] List unknowns and contradictory evidence explicitly
- [ ] Check whether multiple agents independently support the same root cause
- [ ] Check whether both Opus-side and Codex-side investigations support the same conclusion, or document the disagreement clearly
- [ ] If evidence is insufficient, report `no confirmed root cause` instead of forcing certainty

## 14) Fix Verification

- [ ] Define a deterministic reproduction
- [ ] Define the immediate mitigation, if any
- [ ] Define the root fix
- [ ] Add or update tests for the exact bug path
- [ ] Define regression scope and post-fix monitoring
- [ ] Define rollback and any required data cleanup
