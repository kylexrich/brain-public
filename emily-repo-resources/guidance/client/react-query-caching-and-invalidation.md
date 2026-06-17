---
title: "Frontend Caching"
description: "React Query cache defaults, live versus archival data, mutation invalidation, large lists, optimistic updates, logout cleanup, N+1 prevention, and single caching system."
order: 8
---

Use this guidance for React Query cache policy, data freshness, mutation invalidation, list scale, optimistic updates, logout cleanup, and N+1 prevention.

## [GUIDELINE] Global Defaults

Use sensible React Query global defaults, typically a `staleTime` around 30 to 60 seconds and a `gcTime` around five minutes. In older React Query wording, `cacheTime` maps to the current v5 `gcTime` concept. Override per query based on volatility.

Use short stale times, focus refetch, or polling for very dynamic data; `staleTime: 0` is appropriate when data must be treated as immediately stale. Use longer stale times for archival or stable data.

## [GUIDELINE] Live Vs Archival Data

Live data that changes frequently uses short stale times plus polling or future push mechanisms. Archival data that rarely changes uses longer stale times and refetches on mutations or explicit user action.

## [STRICT] Invalidate After Mutations

After mutations, always invalidate or update relevant caches, including list and detail queries as needed. Use targeted invalidation, such as `['project', id]`, to avoid unnecessary refetches.

## [GUIDELINE] Large Lists

Use pagination or infinite queries for large datasets, and include page and filters in query keys. Use `keepPreviousData` for paginated lists to avoid blanking during transitions; in TanStack Query v5, use the supported `placeholderData: keepPreviousData` pattern.

## [GUIDELINE] Optimistic Updates

Use optimistic updates only when changes are easy to roll back and the UX gain is significant, such as simple toggles or status flags. For complex or high-risk operations, prefer invalidation plus refetch.

## [STRICT] Avoid Stale Data And Leaks

On logout, call `queryClient.clear()` and reset sensitive Zustand state. Ensure timers and subscriptions are cleaned up in effects. Prefer React Query mechanisms over manual intervals when possible.

## [STRICT] Data Fetching And N+1 Prevention

Use React Query for all server state. Do not iterate over a list of items and fetch details for each item individually. Prefer a single bulk API call or an endpoint that includes required relations, such as `include=user`. If a change would require `Promise.all(items.map(fetchItem))`, stop and change the API/data contract instead of shipping N+1 fetching.

Configure stale time intentionally and use invalidation for mutations to keep data fresh.

## [GUIDELINE] Single Caching System

Use React Query as the only client caching layer for server data. Do not mix SWR or experimental data hooks for the same data.
