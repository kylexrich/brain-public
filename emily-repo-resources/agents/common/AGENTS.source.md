> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `common/AGENTS.md` _(this file)_ > `AGENTS.md` _(root)_

---

# `/common` EMLY Common Package Guide for AI Contributors

This section captures /common-specific structure, tooling, and contract workflows.

## Repository Overview

- Contract package where Zod schemas in `common/src/zod/` are the **single source of truth** for API request/response shapes.
- OpenAPI docs in `common/openapi.yaml` are generated from Zod and published alongside `emly-common`.

### Directory Layout

- `common/openapi.yaml`: OpenAPI specification generated from Zod registry data.
- `common/src/zod/`: canonical Zod schemas and inferred types (domain-first).
  - `common/src/zod/domains/`: domain folders.
    - `common/src/zod/domains/<domain>/shared/core-models.ts` (or `core-models/` folder): core entity schemas.
    - `common/src/zod/domains/<domain>/shared/api-models.ts` (or `api-models/` folder): request schemas for Create/Update operations, response envelopes.
    - `common/src/zod/domains/<domain>/shared/params.ts`: shared path/query/header/etc. parameters.
    - `common/src/zod/domains/<domain>/<Operation>.ts`: per-endpoint Zod request/response schemas.
  - `common/src/zod/shared/`: cross-domain shared primitives and utility schemas.
  - `common/src/zod/openapi/`: OpenAPI registry + generator wiring.
- `common/src/index.ts`: export surface for `emly-common` consumers (`emly-common`).
- `common/src/util/`: shared helpers plus generated artifacts consumed by services (e.g., `apiNameMap.ts` and `apiNameMap.data.json`).
- `common/scripts/`: OpenAPI + API name map generation scripts.

## `common/package.json` `npm` Scripts

- `generate:openapi`: generates `common/openapi.yaml` from Zod.
- `generate:api-name-map`: generates API name map artifacts for consumers.
- `build`: runs `generate:openapi`, `generate:api-name-map`, compiles with `tsc`, then copies runtime assets needed for package consumers.
- `type-check`: runs the TypeScript compiler in `--noEmit` mode.

## Workflows

## Contract Changes (Zod-First Workflow)
1. Update Zod schemas in `common/src/zod/` first.
2. Register/refresh OpenAPI metadata in the registry (schemas, parameters, paths) as part of the Zod changes.
3. Regenerate OpenAPI and API name map from Zod (`npm run build --prefix common`).
4. Ensure every operation defines `operationId` so `common/scripts/generateApiNameMap.mjs` can produce deterministic entries.
5. Keep `common/src/util/apiNameMap.data.json` in sync via the generator.
6. **[STRICT]** Contract updates are applied in lockstep across `common/`, `app/`, and `client/` in the same commit; do not add backward-compatibility aliases or transitional endpoints unless explicitly requested.

# `/common` Rules

## Name Changes
- **[STRICT]** If names change, add/update `operationId` in `registry.registerPath(...)` and regenerate.

## Generated Artifacts
- **[STRICT]** Do not hand-edit `common/src/util/apiNameMap.data.json` or `common/dist/`.

## Schema Reuse and Composition
- **[STRICT]** Do not duplicate schema shapes for the same domain concept; reuse/compose the canonical schema to prevent drift.

## Core-Models vs API-Models Separation
- **[STRICT]** `core-models.ts` (or `core-models/` folder) must contain **only** entity schemas—the full resource shape returned by API responses (GET, POST create response, PATCH update response, etc.). These represent the domain model with all fields including `id`, timestamps, and computed/server-managed fields.
- **[STRICT]** `api-models.ts` (or `api-models/` folder) must contain **only** request schemas for Create/Update and response envelope schemas. Create schemas define required fields for resource creation. Update schemas define fields for updates. Also see other [STRICT] and [GUIDELINE] rules below.
- **[STRICT]** Never define Create or Update request schemas in `core-models`. Never define entity schemas in `api-models`.
  - *Example:* `core-models/user.ts` contains `UserSchema` (the full entity). `api-models/user.ts` contains `CreateUserRequestSchema` and `UpdateUserRequestSchema`.

## Schema Registration
- **[STRICT]** Component schemas must be registered via `registry.register(...)` before reuse in OpenAPI responses.
- **[STRICT]** Parameters intended for OpenAPI must be registered via `registry.registerParameter(...)` using `.openapi({ param: { name, in, required } })`.
- **[STRICT]** Request query/body schemas that are exported or reused must be registered via `registry.register(...)` (e.g., `*QueryRegister`) and referenced in `registry.registerPath(...)` instead of inline schemas.
- **[STRICT]** Every endpoint must call `registry.registerPath(...)` with `operationId`, `tags`, and explicit `responses`.

## OpenAPI Generation Inputs
- **[STRICT]** Add new domain endpoint files to `common/src/zod/openapi/generator.ts`; missing imports mean missing OpenAPI output.
- **[STRICT]** Ensure `common/src/index.ts` re-exports any new schemas/types needed by `emly-common` consumers.

## Endpoint Shapes & `/me` Usage
- **[STRICT]** Non-`/me` routes must not infer the authenticated user; require explicit identifiers (prefer path params; query/body allowed only when the contract defines them).
- **[STRICT]** `/me/...` endpoints are optional conveniences; define them only when they materially simplify callers. Implement wrappers in `app/src/api/me/MeRouterFactory.ts` that inject the authenticated userId and delegate to the same controllers/validators as the primary route—no divergent logic or duplicated business rules.

##  HTTP Methods
- **[STRICT]** Map HTTP methods to operations as follows:
  - `GET` – Retrieve resource(s). Must be safe and idempotent. Never mutate state.
  - `POST` – Create a new resource or trigger a non-idempotent action.
  - `PUT` – Full replacement of a resource. Client sends complete representation. Idempotent.
  - `PATCH` – Partial update of a resource. Idempotent when using merge-patch semantics.
  - `DELETE` – Remove a resource. Idempotent.
- **[STRICT]** Return `201 Created` with a created resource in the response body for successful `POST` requests that create resources.
- **[STRICT]** Return `204 No Content` for successful `DELETE` requests (or `200 OK` with the deleted resource if confirmation is needed).

## Naming Conventions

### URI Paths
- **[STRICT]** Use lowercase kebab-case for multi-word path segments. Never use camelCase, snake_case, or UPPER_CASE in URI paths.
  - *Example:* `/v1/workspaces/{workspaceId}/inbox-items` not `/v1/workspaces/{workspaceId}/inboxItems`
- **[STRICT]** Use plural nouns for collection resources. Use the plural form consistently even when referencing a singleton within that collection.
  - *Example:* `/users`, `/users/{userId}`, `/users/{userId}/addresses`
- **[STRICT]** Never include trailing slashes in endpoint definitions. Configure servers to redirect or reject trailing-slash variants consistently.
  - *Example:* `/v1/users` not `/v1/users/`
- **[STRICT]** Use path segments (not colons) for action endpoints. Represent non-CRUD operations as sub-resources using a slash-separated verb noun.
  - *Example:* `/v1/workspaces/{workspaceId}/inbox-items/search` not `/v1/workspaces/{workspaceId}/inbox-items:search`
  - *Rationale:* Colon-based custom methods (Google AIP style) introduce tooling compatibility issues with many web frameworks, routers, and client libraries. Slash-based action endpoints are universally supported.

### Request/Response Body Fields
- **[STRICT]** For internal endpoints without an external wire-format requirement, use consistent casing for all JSON field names. Choose camelCase and apply it universally.
  - *Example:* `{"firstName": "Alice", "lastName": "Smith", "createdAt": "2025-01-15T10:00:00Z"}`
- **[STRICT]** External standards or provider contracts override internal casing and envelope conventions. If an endpoint implements a published standard (for example OAuth 2.0 token responses) or a provider-mandated wire format (Retell execution payloads), follow the standard verbatim—even if it uses `snake_case`, a different envelope, or non-camel query parameters. Do not normalize these payloads; keep translation at the boundary only when the contract allows it, and document the exception in schema descriptions. Standard payloads are immutable for our API surface; never camelCase or re-envelope OAuth token fields or other standardized wire names.
- **[STRICT]** Do not borrow external-standard casing or envelopes for internal endpoints. Only opt into non-camel casing or non-standard envelopes when the endpoint explicitly implements a published standard or provider contract, and document the exception in the schema description.
- **[STRICT]** Do not prefix boolean fields with `is` or `has` in the JSON schema. The field name should be a clear adjective or past participle.
  - *Example:* `{"active": true, "verified": false}` not `{"isActive": true, "hasVerified": false}`

### Enum Definition
* **[STRICT]** Define enums as TypeScript `enum` declarations, then wrap with `z.enum()`. Do not use `z.nativeEnum()`—`z.enum()` supports TypeScript enums directly.
  ```typescript
  export enum CallStatus {
      registered = 'registered',
      not_connected = 'not_connected',
      ongoing = 'ongoing',
      ended = 'ended',
      error = 'error'
  }
  export const CallStatusSchema = z.enum(CallStatus);
  ```
  * *Rationale:* TypeScript enums provide autocomplete, refactoring support, and compile-time safety. Wrapping with `z.enum()` adds runtime validation while preserving type inference.
  * *Avoid:* Inline array syntax `z.enum(['value1', 'value2'])` for standalone enums.

### Enum Values
* **[STRICT]** Use `lower_snake_case` for all enum values (wire format). This clearly distinguishes enum values from field names (which are `lowerCamelCase`) and improves readability in JSON payloads.
  * *Example:* `{"status": "in_progress"}`, `{"priority": "high"}`, `{"paymentMethod": "credit_card"}`
  * *Avoid:* `"IN_PROGRESS"`, `"InProgress"`, `"in-progress"`
* **[STRICT]** Enum values must be stable strings that never change once published. Use a separate `displayName` or localization layer for human-readable labels.
  * *Example:* Enum value `"pending_review"` persists in storage and APIs; UI displays "Pending Review" via localization.

### Query Parameters
- **[STRICT]** Use the same casing convention for query parameters as for JSON body fields (camelCase consistently), unless an external standard or provider contract requires otherwise.
  - *Example:* `/users?sortBy=createdAt&filterStatus=active`
- **[GUIDELINE]** Keep query parameter names concise but unambiguous. Avoid abbreviations unless universally understood.

## Request & Response Design

### Null Handling & Response Fields
- **[STRICT]** Omit fields with null values from GET responses unless the field's absence is semantically different from null, or unless using JSON Merge Patch (RFC 7396) where explicit null communicates "delete this field." This reduces payload size and avoids ambiguity.
  - *Example:* `{"name": "Alice", "email": null}` → `{"name": "Alice"}` (email omitted)
  - *Exception:* If a client must distinguish "field not present" from "field explicitly set to null" (e.g., for audit or merge-patch semantics), include the null.
- **[STRICT]** Model optional vs nullable explicitly in Zod schemas. Use `.optional()` when a field may be omitted. Use `.nullable()` only when `null` is a meaningful wire value. Use `.optional().nullable()` only when both omission and explicit null are valid and distinct (commonly in merge-patch request bodies).
- **[GUIDELINE]** Prefer `.optional().nullable()` over `.nullish()` so the wire semantics are explicit in reviews and diffs.
- **[GUIDELINE]** For GET response schemas, prefer `.optional()` without `.nullable()` to align with null omission. If a response field must allow `null`, document why in the schema description.
- **[STRICT]** Never use empty strings (`""`) as a substitute for null. An empty string is a valid value; null signifies absence.
  - *Example:* `{"middleName": ""}` means the user has an empty middle name; `{"middleName": null}` or field omission means unknown/not provided.
- **[GUIDELINE]** Always return empty arrays (`[]`) rather than null for collection fields. This enables safe iteration without null checks.
  - *Example:* `{"items": []}` not `{"items": null}`

### Request/Response Consistency
- **[STRICT]** The response schema for a resource must be identical whether returned from `GET`, `POST` (create), `PUT`, or `PATCH`. Do not use different field sets for the same resource across methods.

### PATCH Semantics
- **[STRICT]** Use JSON Merge Patch (RFC 7396) with `Content-Type: application/merge-patch+json` for partial updates. Only send the fields to be changed. Omitted fields remain unchanged; fields set to `null` are deleted.
  - *Example:* `PATCH /users/123` with `{"email": "new@example.com"}` updates only email; `{"middleName": null}` deletes middleName.
- **[GUIDELINE]** Defer to JSON Patch (RFC 6902) with `Content-Type: application/json-patch+json` only when you need atomic operations, array index manipulation, move/copy operations, or the ability to set a field's value to literal `null` (which JSON Merge Patch cannot express).
  - *Example:* `[{"op": "replace", "path": "/items/2/quantity", "value": 5}]`
- **[STRICT]** Document clearly in the OpenAPI spec which PATCH semantics each endpoint uses. Never mix conventions within the same endpoint.

### Pagination
- **[STRICT]** Follow the approach already established in the codebase.

## Error Responses
- **[STRICT]** Follow the error shape approach already established in the codebase.
- **[STRICT]** Use appropriate HTTP status codes. Never return `200 OK` for error conditions. Common mappings:
  - `400` – Bad Request (malformed syntax, invalid JSON)
  - `401` – Unauthorized (missing or invalid authentication)
  - `403` – Forbidden (authenticated but not permitted)
  - `404` – Not Found (resource does not exist)
  - `409` – Conflict (state conflict, duplicate resource)
  - `422` – Unprocessable Entity (validation errors on well-formed request)
  - `429` – Too Many Requests (rate limit exceeded)
  - `500` – Internal Server Error (unexpected server failure)

## Idempotency
- **[GUIDELINE]** Support client-supplied idempotency keys (e.g., `Idempotency-Key` header) for `POST` requests that create resources or trigger actions. If the same key is resubmitted, return the original response.
  - *Example:* `POST /orders` with `Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000` creates order once; retries return the same order.
