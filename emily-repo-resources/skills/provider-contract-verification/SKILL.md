---
name: provider-contract-verification
description: Verify exact third-party/provider API contracts before planning, validating, or implementing integrations. Use when a task calls, parses, maps, persists, tests, or documents external provider APIs, especially response body shape/casing, endpoint parameters, auth, webhooks, SDK versions, or API version assumptions.
---

# Provider Contract Verification

Verify provider API behavior at the level implementation depends on. Endpoint existence is not enough when code parses or maps provider payloads.

## Workflow

1. Identify every provider contract surface the task touches:
   - Request method/path
   - Query or body parameters
   - Auth headers or credential format
   - Response envelope and fields parsed by code
   - Webhook event names and payload fields
   - API or SDK version assumptions
2. Collect source-of-truth evidence:
   - Prefer official docs through FireCrawl/Context7 when available.
   - Use full-page scrape/map or official examples when extracted docs are sparse.
   - If safe test credentials or a sandbox exist, run a live read-only smoke check against the exact endpoint and parameters the implementation will call.
   - Do not store secrets in task docs, logs, fixtures, or code.
3. Record provider contract evidence in the task context or validation notes:
   - Source URL, retrieval tool, and retrieval date
   - Exact method/path, parameters, and auth requirements
   - Exact response envelope, field names, and field casing used by the implementation
   - Evidence source for response shape: official example, full scrape, captured docs example, or live read-only smoke result
4. Fail closed:
   - Do not infer provider response fields from internal naming conventions.
   - Treat docs that only prove endpoint existence or parameters as incomplete when response parsing is in scope.
   - If the shape cannot be proven safely, mark it as a blocker or explicit risk before implementation proceeds.
5. Encode the contract:
   - Add or update fixtures/tests using the exact observed provider payload shape and casing.
   - Parser code may normalize into internal types after the fixture boundary, but the test input must remain provider-shaped.

## Output

Produce a concise evidence block:

```md
### Provider contract evidence

- Provider/API:
- Source URL:
- Retrieved with:
- Retrieved at:
- Request contract:
- Response contract:
- Evidence source:
- Live smoke:
- Fixture/test coverage:
- Remaining risk:
```
