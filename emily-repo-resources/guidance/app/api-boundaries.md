---
title: "Backend API Boundaries And Compatibility"
description: "boundary validation, emly-common contract alignment, authorization and tenant scoping, /me wrappers, external calls, and compatibility scope."
order: 1
---

## Boundary Validation, API Contracts, And Compatibility
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

## `/me` Endpoints And Authenticated Identity
* **[STRICT]** `/me` contract shape rules live in `common/.ai/guidance/api-contract-rules.md#endpoint-shapes--me-usage`.
* **[STRICT]** App implementations of `/me/...` routes must keep wrapper logic in `app/src/api/me/MeRouterFactory.ts` and delegate to the same controllers/validators as the primary route.

## External Calls At Boundaries
* **[STRICT]** Must make external calls explicit with timeouts, retries, and idempotency considerations; must never block indefinitely on external calls.
  * **Example:** HTTP client calls set explicit timeout and bounded retries; do not retry non-idempotent operations without idempotency protection.
* **[GUIDELINE]** Prefer explicit pagination, filtering, and sorting shapes consistent with platform conventions; if bulk export is required, prefer async export jobs with progress tracking rather than returning unbounded collections.
* **[GUIDELINE]** Prefer explicit versioning and deprecation policies for public contracts; add new fields compatibly (optional/nullable by contract) before removing or renaming old ones.
  * **Example:** Introduce `statusV2` alongside `status` before deprecating `status`.
