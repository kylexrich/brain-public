---
title: "Frontend React Query"
description: "QueryClient placement, query keys, API helper usage, query organization, options, polling, SSR hydration decisions, query-hook UI states, mutations, and query footprint."
order: 9
---

Use this guidance when adding, changing, hydrating, polling, invalidating, or consuming server-state queries and mutations.

## [STRICT] Single QueryClient At App Root

Define one `QueryClient` and wrap the app in a Client Component provider. The current provider entrypoint is `client/app/(app)/providers.tsx`, and query configuration belongs near `client/lib/queryClient.ts`.

Use a global stale time that avoids immediate refetch after SSR/hydration, then override per query when data volatility requires it.

The default shape must remain a single root client with this baseline behavior:

```tsx
// client/app/(app)/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000 },
  },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

## [GUIDELINE] Query Keys And Colocation

Use array query keys and include all filters, pagination, workspace scopes, and IDs in the key. Do not use plain string keys or non-serializable key parts. Define canonical query keys and hooks near their feature or in `client/lib/api/hooks/` and `client/lib/api/queryKeys.ts`.

Concrete key examples:

- `['projects']`
- `['project', projectId]`
- `['projects', { status, page }]`

Define query hooks near their feature when route-local, for example `client/app/(app)/projects/_hooks/useProjectsQuery.ts`, or in the shared API hook area when reused across routes.

## [STRICT] Use Shared API Helper

Query and mutation functions use typed API helpers. The API helper contract and direct-fetch restrictions live in `client/.ai/guidance/api-integration.md`.

## [GUIDELINE] Organize Query Code

Keep low-level API calls in domain API modules under `client/lib/api/`, feature-local `api` or `services` modules, or shared helpers such as `apiGet` and `apiPost`. Expose hooks named `useXQuery`, `useXListQuery`, and `useXMutation`. Clearly separate read queries from write mutations.

## [GUIDELINE] Tune Query Options

Use per-query `staleTime` and `gcTime` based on data volatility. Use `enabled` when a query requires an ID, workspace, auth state, or other precondition. Use `initialData` only when data is already available through SSR or a parent. For mutations, use `onSuccess` to invalidate or update affected queries; use optimistic updates only when rollback is simple.

## [GUIDELINE] Polling For Near Real-Time

For active tasks or live status before WebSockets/SSE exists, use React Query `refetchInterval`. Polling queries should carry a concise TODO or rationale when they are expected to move to a push mechanism.

## [STRICT] Do Not Share Server Data Via Zustand Or Context

Do not copy React Query data into Zustand or Context as a pattern. Reuse the same query keys or pass data via props instead. Derived booleans and counts can be recomputed locally rather than globalized.

## [GUIDELINE] SSR And Hydration

Prefer Server Components for initial fetch and HTML. Use React Query hydration with `dehydrate` and `HydrationBoundary` when you need SSR performance plus client caching/refetch. Avoid duplicated fetch logic between SSR and the client; share the same fetcher and provide `initialData` or dehydrate data.

## [GUIDELINE] Hydration Vs Skeletons Decision Framework

Choose the strategy per page or feature. Hydrate with SSR prefetch, dehydrate, and `initialData` when data is available server-side, the page is primary or high-traffic, or a flash of empty state would hurt perceived quality. Keep stale time modest so the client can refresh.

Use client fetch with skeletons when data is highly volatile, SSR cost outweighs UX benefit, or the page is secondary enough that a brief skeleton is acceptable. Always decide intentionally and avoid visible flashes on key authenticated or marketing experiences.

When hydrating, use a per-request QueryClient on the server, dehydrate in the route, hydrate with `HydrationBoundary`, align hook query keys, and avoid parallel bespoke fetch paths that cause double-fetching.

## [GUIDELINE] Using Query Hooks In Components

Call query hooks at the top of components. Drive UI from React Query state:

- `isLoading` -> loading skeleton/spinner.
- `isError` -> error message plus optional retry.
- `data` (possibly `undefined` initially) -> main UI.

## [STRICT] Mutations And Cache Invalidation

Mutation invalidation and optimistic-update rules live in `client/.ai/guidance/react-query-caching-and-invalidation.md`. Apply those rules whenever a mutation changes server data.

## [GUIDELINE] Query Footprint And Fragmentation

Fetch only what the UI needs, but do not split tightly coupled data into many tiny queries used together on one screen. Balance bandwidth against complexity and render churn.
