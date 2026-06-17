---
title: "Frontend State Boundaries"
description: "local UI state, server state, app-wide client state, Context use, state-location heuristics, and date/time formatting."
order: 6
---

Use this guidance to choose the correct state owner before adding React state, React Query, Zustand, or Context.

## [STRICT] Local UI State

Use `useState`, `useReducer`, and refs for transient component-local UI such as form inputs, one modal's open/close state, hover/active flags, and other ephemeral toggles. If no other part of the app needs the state, keep it local.

## [STRICT] Server State Via TanStack Query

Any data that comes from or is persisted on the backend is server state. Manage it with React Query via `useQuery`, `useSuspenseQuery`, and `useMutation`. Do not implement `useEffect + useState` for backend data fetching.

## [STRICT] App-Wide Client State Via Zustand

Use Zustand for global UI state such as sidebar open state, theme mode, and global modals; client-only data that must persist across navigation, such as unsaved drafts; and session/identity state when it is not fully handled by external auth libraries. Organize Zustand by slices such as `auth`, `ui`, and domain slices in a single store by default.

## [GUIDELINE] Context For Simple, Mostly Static Globals

Use React Context for mostly static values such as a theme object or locale, and for external provider contexts. Prefer Zustand over Context for frequently changing global state.

## [GUIDELINE] State Location Heuristics

Server-fetched or persisted data belongs in React Query. Non-server data needed across distant components belongs in Zustand. State used only in one small subtree belongs in local state or subtree Context. Global user/session info can be held in Zustand when needed, possibly seeded from server/auth. UI preferences that must persist should use Zustand plus selective persistence through localStorage or the server.

## [GUIDELINE] Date And Time Formatting

Use `Intl.DateTimeFormat` for date/time formatting and avoid ad-hoc manual string building in components. Use the existing `date-fns` dependency when complex manipulation is needed. Keep shared formats in `client/lib/utils/` or feature-local helpers so displays stay consistent, and prefer pure helpers over in-component formatting.
