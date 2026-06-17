---
title: "Frontend API Integration"
description: "shared API helper, no direct component fetches, emly-common API types, route handlers, server actions, direct/proxy calls, webhook polling, secrets, backend reality checks, and logging."
order: 1
---

Use this guidance when frontend work touches backend calls, route handlers, API contracts, secrets, webhook-driven updates, or browser/client logging.

## [STRICT] Shared API Helper

All backend calls, including React Query functions, must go through the shared API helper in `client/lib/api/api.ts` and domain helpers under `client/lib/api/`. The helper is responsible for native `fetch`, credentials, response parsing, and throwing typed errors for non-2xx responses.

The helper contract should keep this concrete shape:

```ts
// client/lib/api/api.ts
const API_BASE_URL = typeof window === 'undefined'
  ? (process.env.SERVER_API_BASE_URL ?? 'http://localhost:3001/api')
  : '/api';

export class ApiError extends Error {
  statusCode: number;
  data?: unknown;

  constructor(statusCode: number, message: string, data?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const message = (data && (data.message as string)) || res.statusText || 'Request failed';
    throw new ApiError(res.status, message, data);
  }

  return data as T;
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    credentials: 'include',
  });

  return handleResponse<T>(res);
}
```

## [STRICT] No Direct Backend `fetch` In Components

Components must not call `fetch` directly to backend URLs. Components should use typed API helpers wrapped by React Query hooks.

The expected call stack is typed helpers, such as `apiGet` or `apiPost`, wrapped by React Query hooks.

## [GUIDELINE] Type-Safe API Responses And Authentication

Use explicit response type names such as `ProjectSummary` and `UserSettings` for API data, imported from `emly-common` when they represent backend payloads or derived near the consumer when they are view models. Attach auth centrally in API helpers. Handle `401` and `403` consistently through the existing auth/session patterns in `client/lib/auth/` and API error handling. Normalize errors into a common shape and show user-friendly UI messages.

## [STRICT] Use `emly-common` API Shapes

Treat Zod-inferred types from `emly-common` as the only source of truth for request and response types. Do not redeclare backend payload interfaces in `client/`.

If UI code needs derived view-model shapes, create them with TypeScript utility types or mapping functions near the consumer while keeping underlying API types unchanged. When the contract changes, update `common/src/zod/`, regenerate contract outputs with `npm run build --prefix common`, then adjust client code. See `common/AGENTS.md`.

## [STRICT] Route Handlers For Server-Side Logic

Use `client/app/api/*` route handlers when a frontend path needs to aggregate backend calls, hide secrets, inject server-side credentials, handle webhooks, or perform server-only actions.

## [GUIDELINE] Server Actions

Default to React Query mutations for consistency. Use Server Actions only for well-scoped cases where server-to-server calls materially improve performance and cache handling remains clear.

## [GUIDELINE] Direct Vs Proxy Calls

Default to calling backend APIs from the browser through `client/lib/api/api.ts`. Use route handler proxies when CORS requires it or when backend URLs, credentials, or server-only details must be hidden.

## [STRICT] Webhook-Driven Updates Use Polling For Now

Until real-time infrastructure exists, use React Query refetching or polling for backend-driven status updates or new items. Mark future real-time areas with TODOs and avoid ad-hoc real-time hacks.

## [GUIDELINE] Plan For SSE Or WebSockets

When push infrastructure is added, centralize connection management in a shared module such as `client/lib/live.ts`. On messages, update React Query caches or Zustand; components should remain unaware of the transport.

## [STRICT] Keep Secrets Out Of Client Bundles

Only `NEXT_PUBLIC_*` env vars may be used in client code. Non-public env vars must only be used in route handlers, middleware, or Server Components that never serialize secrets.

## [STRICT] Backend Reality Checks

No hacky data flows or workaround wiring. Every frontend call must be grounded in the current OpenAPI contract and verified against the actual `app/` implementation. If behavior seems inconsistent, brittle, or incorrect in the current task, including missing or incorrect OpenAPI fields, stop immediately, notify the user, and wait for direction.

## [STRICT] Centralized Client Logging

All frontend logging must go through `client/lib/logging/logger.ts`. Do not call `console.*` directly for API/query errors or feature logs.

Use structured logs with `level`, scope, and context objects. API logs must include `method`, `path`, `status`, and `requestId` from `x-request-id` or response metadata when available. Prefer `logApiFailure` for API responses and `logQueryIssue` for React Query errors.

Default severity is `error` for 5xx and `warn` for unexpected 4xx. Override only when the status is expected for the current flow. Emit expected or ignored statuses at `debug` level with a concise `note`. Use `apiGetOptional`, `ignoreStatuses`, or explicit log levels for optional resources or expected auth gaps.

Avoid logging PII or secrets. Log identifiers and metadata, not full payloads. If error bodies are surfaced, keep them minimal and metadata-only. Feature diagnostics should use `logMessage({ scope: '<feature>', level, message, context })` with concise context keys.
