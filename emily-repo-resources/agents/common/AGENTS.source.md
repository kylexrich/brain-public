> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `common/AGENTS.md` _(this file)_ > `AGENTS.md` _(root)_

---

# `common/` Map for AI Contributors

`common/` is the Zod-first API contract package. It owns request/response schemas, OpenAPI generation, API name-map generation, and shared contract/runtime helpers published as `emly-common`. OpenAPI docs in `common/openapi.yaml` are generated from Zod and published alongside `emly-common`.

## Directory Layout

- `common/openapi.yaml`: OpenAPI specification generated from Zod registry data.
- `common/src/zod/`: canonical Zod schemas and inferred types (domain-first).
- `common/src/zod/domains/`: domain folders with this layout:
  - `common/src/zod/domains/<domain>/shared/core-models.ts` or `common/src/zod/domains/<domain>/shared/core-models/`: core entity schemas.
  - `common/src/zod/domains/<domain>/shared/api-models.ts` or `common/src/zod/domains/<domain>/shared/api-models/`: Create/Update request schemas and response envelope schemas.
  - `common/src/zod/domains/<domain>/shared/params.ts`: shared path, query, header, and other parameter schemas.
  - `common/src/zod/domains/<domain>/<Operation>.ts`: per-endpoint Zod request and response schemas.
- `common/src/zod/shared/`: cross-domain shared primitives and utility schemas.
- `common/src/zod/openapi/`: OpenAPI registry and generator wiring.
- `common/src/index.ts`: export surface for `emly-common` consumers.
- `common/src/util/`: shared helpers plus generated artifacts consumed by services (e.g., `apiNameMap.ts` and `apiNameMap.data.json`).
- `common/scripts/`: OpenAPI, API name-map, and runtime-asset generation scripts.
- `common/.ai/guidance/`: agent-critical common package rules that are referenced from this map.

## Package Scripts

- `build`: runs `generate:openapi`, `generate:api-name-map`, compiles with `tsc`, then copies runtime assets needed for package consumers.
- `copy:runtime-assets`: copies runtime assets into `common/dist/`.
- `type-check`: runs TypeScript with `--noEmit`.
- `generate:openapi`: generates `common/openapi.yaml` from Zod.
- `generate:api-name-map`: generates API name map artifacts for consumers.

## Contract Changes (Zod-First Workflow)

`common/.ai/guidance/api-contract-rules.md` is canonical for the full Zod-first workflow and contract rules. At a high level, edit Zod schemas first, keep OpenAPI registry metadata aligned, regenerate OpenAPI and the API name map with `npm run build --prefix common`, and update `app/` and `client/` consumers in the same change when an internal contract shifts.

---

## Guidance Map (DO NOT EDIT)

The documents linked below are the binding rules for this directory and every subdirectory beneath it. All agents operating within this scope must follow them, subject to the instruction precedence defined at the top of this `AGENTS.md` (most specific file wins on conflict).

- `common/.ai/guidance/api-contract-rules.md`: common testing policy, Zod source-of-truth, schema registration, OpenAPI generator inputs, endpoint shape, request/response design, naming, nullability, pagination, errors, idempotency, generated artifacts, schema exports, schema composition, and testing policy.
