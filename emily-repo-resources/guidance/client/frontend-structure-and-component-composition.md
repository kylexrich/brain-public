---
title: "Frontend Structure And Composition"
description: "route structure, colocated feature files, shared components, client/lib boundaries, barrel files, component size, props/context/global-state composition, and container/presentational splits."
order: 7
---

Use this guidance when placing files, splitting components, choosing shared versus route-local ownership, or deciding between props, Context, and global state.

## [STRICT] Default Structure

`client/app/` is the main map of the app. Routes and feature entrypoints live there, with route-local `_components`, `_hooks`, and `_lib` folders for non-route files. Shared reusable UI lives in `client/components/`, shared non-UI logic lives in `client/lib/`, global CSS and Tailwind directives live in `client/styles/`, and static assets live in `client/public/`.

Use this strict default structure example when adding or reorganizing client areas:

```text
client/
├── app/                              # Routes & feature entrypoints
│   ├── layout.tsx                    # Root layout (SC; wraps Providers)
│   ├── providers.tsx                 # [CLIENT] Global providers
│   ├── page.tsx                      # Landing / marketing
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── projects/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Projects list (SC)
│   │   ├── _components/
│   │   │   ├── ProjectList.tsx       # [CLIENT] uses useProjectsQuery
│   │   │   ├── ProjectRow.tsx
│   │   │   └── ProjectFilter.tsx
│   │   ├── _hooks/
│   │   │   └── useProjectsQuery.ts
│   │   └── [id]/
│   │       ├── page.tsx              # Project details (SC)
│   │       └── _components/
│   │           ├── ProjectDetails.tsx
│   │           └── ActivityFeed.tsx
├── components/                       # Shared, reusable UI
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   └── Input.tsx
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Sidebar.tsx
│   └── feedback/
│       ├── Spinner.tsx
│       └── Toast.tsx
├── lib/                              # Shared logic (no React UI)
│   ├── api.ts                        # API helpers (fetch wrappers)
│   ├── queryClient.ts                # QueryClient config
│   ├── stores/                       # Zustand stores
│   ├── hooks/                        # Generic hooks
│   ├── utils/                        # Utilities
│   └── constants.ts
├── styles/
│   └── globals.css                   # Global CSS, Tailwind directives, and @theme tokens
└── public/                           # Public assets
```

This structure is the **[STRICT] default**.

Keep current route groups coherent with this shape when existing files live under grouped routes.

Current examples are in `client/app/(app)/dashboard/`, `client/app/(app)/pricing/`, `client/app/(app)/auth/`, `client/components/ui/`, `client/lib/api/`, `client/lib/stores/`, and `client/styles/globals.css`.

## [STRICT] Feature Directories Under `client/app/`

Each top-level route or sub-route represents a feature/page. Use underscore-prefixed subfolders such as `_components`, `_hooks`, and `_lib` for files that should not become routes.

## [STRICT] Co-Locate Page-Specific Components

Components used only by a route live in that route's `_components/`. Do not put route-specific components into global `client/components/`.

## [STRICT] Shared Components

`client/components/ui/` holds low-level primitives. `client/app/(app)/_components/` holds shared app-shell elements used across routes, such as navigation, footer, banners, and page headers. Shared components must not contain feature-specific logic and must not import from feature folders.

## [GUIDELINE] `client/lib/` For Non-React Logic

`client/lib/` holds API helpers, Zustand stores, generic hooks, utilities, constants, logging, motion definitions, auth/session logic, workspace helpers, pricing data, and other non-route logic. Avoid React UI components in `client/lib/`.

## [GUIDELINE] Optional Domain Grouping In `client/lib/`

Mirror domains in `client/lib/` when helpful, such as `client/lib/pricing/`, `client/lib/workspaces/`, `client/lib/auth/`, and `client/lib/api/`. Older flat examples such as `client/lib/projectsApi.ts` or `client/lib/hooks/useProjectsPolling.ts` are acceptable only when they fit the current package shape; prefer the existing domain folders when they exist. Keep route-specific UI implementation in `client/app/`.

## [STRICT] No Mega Type-Only Folders

Do not create global "everything by type" folders such as `contexts/`. Keep code discoverable through route, feature, or domain ownership.

## [GUIDELINE] Route Groups

Use route groups such as `client/app/(app)/`, `client/app/(app)/(marketing)/`, `client/app/(app)/(scheduling)/`, and `client/app/(payload)/` for layout differences, public/authenticated sections, CMS surfaces, and routing organization. Groups can have their own layouts.

## [GUIDELINE] Alternative Feature Layout

An optional separate feature implementation folder, for example `client/features/`, is acceptable only when `client/app/` remains the routing map and delegates coherently. The result must still be feature-oriented and easy to navigate.

## [STRICT] Styles Location

Component-specific CSS modules live next to their component and should be rare because Tailwind is primary. `client/styles/` contains global CSS and Tailwind directives only. Tailwind token details live in `client/.ai/guidance/tailwind-theme-and-design-tokens.md`. Do not accumulate large ad-hoc CSS in global files.

## [GUIDELINE] Separation Of Concerns

`client/app/` contains routes, layouts, and pages. `client/components/` contains reusable UI. `client/lib/` contains logic, state, and utilities. Avoid circular dependencies; `client/lib/` should not import UI from `client/components/`.

## [STRICT] Barrel Index Files

Barrel `index.ts` files are allowed in select folders to simplify imports. If a barrel exists, keep it updated when adding or removing exports.

## [GUIDELINE] One Primary Component Responsibility

A component should primarily fetch/manage data, render UI from props, or manage local UI logic.

## [STRICT] Component Size & Complexity

If a file exceeds ~300 lines or has many hooks/effects, split it. Move large subsections into named child components and complex logic into custom hooks.

## [STRICT] Avoid Deeply Nested JSX

When JSX becomes deeply nested, extract named child components for each section, such as `UserInfoSection`, `BillingSection`, filters, or activity sections.

## [STRICT] Prefer Props

State ownership details live in `client/.ai/guidance/frontend-state-boundaries.md` and Zustand details live in `client/.ai/guidance/zustand-client-state-stores.md`.

Use props for parent-to-child data by default. Do not introduce global state just to avoid one to three levels of prop passing.

## [GUIDELINE] Limit Prop Drilling

After about two to three levels of unused prop forwarding, consider scoped Context for that subtree or Zustand if the state is truly cross-cutting.

## [GUIDELINE] Context For Subtree Concerns

Use feature-local Context for shared subtree state such as wizards or filter controllers. Keep context values minimal and split contexts when necessary.

## [STRICT] Do Not Abuse Context

Do not use Context as a general event bus or arbitrary global. Each Context must have a clear, documented contract.

## [STRICT] Avoid Global Store For Local Concerns

Local UI such as a single dropdown's open state or small form values must not go into Zustand. Add global state only when the state is truly shared and persistent.

## [GUIDELINE] Custom Hooks For Complex Logic

Move complex logic and effects to custom hooks to simplify components. Use explicit names that reveal domain and behavior, such as `useFilteredProjects` or `useProjectLiveUpdater`.

## [GUIDELINE] Localize Effects And Subscriptions

Subscriptions, timers, and similar effects belong in components or hooks that set them up in `useEffect` and clean them up on unmount.

## [STRICT] Avoid Tightly Coupled Responsibilities

Split components that handle unrelated concerns, such as auth handling versus profile display or list rendering versus an add-item modal.

## [GUIDELINE] Prefer Composition

Use composition for flexible structures. For example, `<Modal>` can accept body content via `children` and footer controls via an `actions` prop. Components can accept `children`, action slots, or explicit render props when that makes ownership clearer than global state or broad configuration.

## [STRICT] Container Vs Presentational

Containers live at page/feature boundaries and fetch data or manage side effects. Presentational components live under route `_components/` folders or `client/components/ui/` and receive data via props. Small self-contained components that fetch a small amount of data are allowed but should be exceptions.
