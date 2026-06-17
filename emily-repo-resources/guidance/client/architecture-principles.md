---
title: "Frontend Architecture Principles"
description: "feature-first modularity, server-first rendering, state responsibility, naming, comments, dependency discipline, dead-code removal, and API/library verification."
order: 2
---

Use this guidance for cross-cutting frontend architecture decisions that affect feature shape, naming, comments, dependency choices, dead-code cleanup, or external API/library verification.

## [STRICT] Feature-First Modularity

Organize code by feature/domain, not by technical layer. Keep each feature's pages, components, hooks, and state together, such as `client/app/(app)/dashboard/`, `client/app/(app)/pricing/`, or route-local `_components` and `_lib` folders.

Shared primitives live in `client/components/` and shared logic lives in `client/lib/`, but default to self-contained features. Adding or removing a feature should be mostly local to its folder.

Typical feature/domain names include `projects`, `settings`, and `dashboard`.

## [STRICT] Server-First Rendering And Data Fetching

Default pages and layouts to Server Components for initial loads and SEO-relevant content. Use Client Components only for interactivity, local state, browser APIs, React Query, Zustand, Framer Motion, or other client-only libraries.

This keeps first-paint JavaScript small and lets dynamic behavior hydrate only where needed. Detailed SC/CC boundaries live in `client/.ai/guidance/server-and-client-component-boundaries.md`.

## [STRICT] Clear State Responsibilities

Server state from backend APIs belongs in TanStack Query. App-wide client-only state belongs in Zustand, or Context for simple mostly static values. Local UI state belongs in component state via `useState`, `useReducer`, or refs.

Do not store server-derived data in Zustand or Context by default. Detailed state placement rules live in `client/.ai/guidance/frontend-state-boundaries.md`.

## [STRICT] Single Source Of Truth For Server Data

Each backend dataset should have one canonical query key and hook family. Multiple components requiring the same server data must use the same query key. The React Query cache is the only client cache for server data.

Details live in `client/.ai/guidance/react-query-server-state.md` and `client/.ai/guidance/react-query-caching-and-invalidation.md`.

## [GUIDELINE] Minimize Global State

Keep state in the smallest possible scope. Use local component state if only one component needs it, localized Context if only one subtree needs it, and Zustand only when state is truly app-wide, such as theme, auth/session, global modals, or cross-route UI. Treat global state as a last resort.

Details live in `client/.ai/guidance/frontend-state-boundaries.md` and `client/.ai/guidance/zustand-client-state-stores.md`.

## [GUIDELINE] Naming And Conventions

Use explicit, descriptive names. Query hooks use `useXQuery`, `useXListQuery`, and `useXMutation`. Zustand selectors use focused names such as `useX()` and `useXActions()`. Components use PascalCase names that describe the UI, such as `ProjectList` or `ProjectListItem`. Store modules should make their domain clear, such as `useAppStore`; folder names are lowercase or lowercase-with-hyphen.

Hook, query, and store naming details live in `client/.ai/guidance/react-query-server-state.md` and `client/.ai/guidance/zustand-client-state-stores.md`.

## [GUIDELINE] Prefer Composition; [STRICT] Avoid Premature Abstraction

Build UI from small components and hooks. Extract shared patterns only when reused in multiple places. Do not introduce super-generic components or utilities without proven reuse and a clear purpose.

## [STRICT] Explicit Over Implicit

Data flow, state sources, and side effects must be obvious from imports and hook calls. Avoid hidden globals and implicit injection. Favor explicit TypeScript types for state and return values. Lint warnings can be acceptable when reasonable, but lint errors must be resolved.

## [STRICT] Comment Policy

The base comment policy is defined in `.ai/guidance/repository-rules.md#strict-comment-rules`. Frontend-specific allowed public API contract examples include exported hooks, components, and store slices.

## [STRICT] Source-Of-Truth Collocation

Keep each main unit in one obvious place. Stores live in `client/lib/stores/`. Query hooks live in feature folders or `client/lib/api/hooks/`. Display transforms live near components or feature-local `client/lib/` code. Avoid hidden cross-file side effects.

## [GUIDELINE] Avoid Low-ROI Dependencies

Avoid dependencies that replace core stack choices such as state, HTTP client, routing, or styling, or that expand surface area without clear return. A package that meaningfully accelerates delivery is acceptable leverage, but it must fit the existing stack and be evaluated for bundle size, maintenance cost, security, and ownership.

Before implementing common logic such as validation, date formatting, or HTTP behavior, check `client/package.json` and relevant existing modules first. Use established libraries already in the package over custom implementations when they fit.

When adding, document the rationale and intended default usage (e.g., dates, charts) so the team can standardize on it.

## [STRICT] API And Library Usage Verification

Before using any library API, verify current non-deprecated usage and best practices through the available documentation MCPs. Use Context7 for library and framework documentation. Use AWS Knowledge MCP for AWS CDK and AWS service API signatures. Use the appropriate provider documentation source for provider-specific APIs.

For external libraries, confirm compatibility with the versions in `client/package.json`, check deprecation warnings, and replace deprecated patterns immediately. For React and Next.js, verify React 19 and Next.js 16 App Router patterns rather than legacy Pages Router patterns. For AWS/CDK work that touches the frontend delivery path, verify current construct/service patterns and prefer L2/L3 constructs where available.

## [STRICT] Aggressive Dead Code Elimination

Aggressively remove unused constants, variables, functions, classes, types, interfaces, imports, exports, components, hooks, CSS classes, Tailwind utility combinations, and entire files that become unreferenced. Remove commented-out code unless it has a specific TODO for future use.

When modifying or refactoring, check for code that becomes unused after your changes. Use search tools to verify references before deletion, especially for exported symbols, event handlers, and utilities. Audit `client/package.json` for dependencies that are no longer imported or used.

Use tools such as `rg`, `grep`, `Glob`, or IDE search to verify references before deletion. Pay special attention to exported symbols, event handlers, and utility functions.

Keep code marked with explicit TODO comments that describe future usage. Preserve temporarily disabled code only when an allowed comment explains when or why it will be re-enabled.
