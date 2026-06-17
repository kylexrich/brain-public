---
title: "Frontend Zustand"
description: "store/slice defaults, selectors, actions, shallow and narrow selection, action-only mutation, persistence, and reset boundaries."
order: 13
---

Use this guidance when adding or changing app-wide client-only state, store slices, selectors, actions, or persistence.

## [STRICT] Single Store With Slices By Default

Use a single Zustand store composed of slices such as `auth`, `ui`, and domain slices by default. Consider separate stores only when slices are fully independent and there is a clear reason.

## [GUIDELINE] Middleware In Development

Use Devtools or Immer middleware in development when helpful, but keep production behavior simple and predictable.

## [STRICT] Export Selectors, Not Raw Store

Do not export a generic raw store hook for arbitrary selection across the codebase. Expose small, focused selectors per concern, such as one selector for a specific state value and one selector for a concern's stable actions object. Current stores live under `client/lib/stores/`.

Selector exports should stay small and named for the concern:

```ts
export const useSidebarOpen = () =>
  useAppStore((state) => state.ui.sidebarOpen);

export const useUIActions = () =>
  useAppStore((state) => state.ui.actions);
```

Do **not** export a generic `useStore` for arbitrary selection. Expose small, focused selectors per concern.

## [STRICT] Shallow Comparison And Narrow Selectors

Avoid selectors that return large objects. Prefer single-value selectors or multi-value selectors with shallow comparison when needed so re-renders stay scoped.

## [GUIDELINE] Actions Under `actions`

Group state-changing functions under an `actions` object and export a concern-level actions selector such as `useUIActions()` so consumers get stable actions.

```ts
type UISlice = {
  sidebarOpen: boolean;
  actions: {
    toggleSidebar: () => void;
    openSettingsModal: () => void;
  };
};
```

Export `useUIActions()` to get a stable actions object.

## [STRICT] Mutate Only Via Actions

All state changes must go through store actions with `set` inside the slice. Do not call raw store `setState` directly across the codebase, including `useStore.setState`.

## [GUIDELINE] Store Organization And Persistence

Define slice types and compose them into the store type. Add concise public API contract comments only when they clarify what a slice owns. Use `persist` or localStorage selectively, and make persistence behavior explicit.

## [STRICT] Reset Sensitive State At Boundaries

On logout or workspace/session boundary changes, reset sensitive Zustand state and clear React Query as appropriate. Coordinate with `client/lib/auth/` and `client/lib/workspaces/` patterns before adding new persistent state.
