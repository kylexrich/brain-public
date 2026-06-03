> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `client/AGENTS.md` _(this file)_ > `AGENTS.md` _(root)_

---

# `client/` EMLY Frontend Map For AI Contributors

`client/` is the Next.js 16 App Router package for EMLY. It owns the public marketing/CMS surfaces, authenticated app/dashboard routes, scheduling and widget surfaces, browser-side API integration, React Query server-state hooks, Zustand client-state stores, Tailwind v4 theme tokens, and frontend runtime configuration.

Strict rules in `client/.ai/guidance/` retain the same force as if they were inline here. Do not rely on `client/docs/` for agent-critical routing; current AI guidance lives under `client/.ai/guidance/`.

## Directory Layout

- `client/app/`: App Router routes, route groups, layouts, pages, route handlers, and route-local `_components`, `_hooks`, and `_lib` folders.
- `client/app/(app)/`: main public and authenticated product routes, including marketing, pricing, dashboard, scheduling, auth, welcome, account, widget, and health surfaces.
- `client/app/(payload)/`: Payload CMS admin and CMS API route integration.
- `client/components/`: shared reusable UI and site components that are not route-specific.
- `client/components/ui/`: low-level reusable primitives built from local tokens and, for complex interactions, Radix primitives.
- `client/lib/`: API helpers, React Query hooks, auth/session logic, Zustand stores, logging, motion constants, shared hooks, utilities, config, pricing data, workspace helpers, and other non-route logic.
- `client/lib/api/`: typed API wrappers, query keys, domain API modules, and React Query hook families.
- `client/lib/stores/`: Zustand stores and selectors for client-only global state.
- `client/lib/motion/`: shared Framer Motion variants and motion constants.
- `client/lib/logging/`: structured frontend logging helpers.
- `client/payload/`: Payload CMS configuration, access rules, blocks, collections, custom CMS components, migrations, and CMS helpers.
- `client/public/`: static assets served by Next.js.
- `client/scripts/`: runtime config, Payload import-map generation, and CMS bootstrap scripts.
- `client/styles/`: global CSS and Tailwind v4 `@theme` tokens.
- `client/.ai/guidance/`: focused frontend rules for AI retrieval.

## Package Scripts

- `dev`: writes runtime config with `client/scripts/write-runtime-config.mjs`, then starts Next.js dev mode with `next dev --no-server-fast-refresh`.
- `prod`: writes runtime config, then starts the production Next.js server with `next start`.
- `build`: runs `cms:generate:importmap:build`, then `next build`. It does not run `lint` or `type-check`; use root `npm run ci` or run those scripts separately.
- `type-check`: runs TypeScript with `--noEmit`.
- `lint`: runs ESLint across `client/`.
- `lint:fix`: runs ESLint with fixes.
- `payload`: runs the Payload CLI.
- `cms:env:local`, `cms:env:beta`, `cms:env:prod`: load the matching CMS env overlays through `dotenv-cli`.
- `cms:generate:types`: generates Payload CMS types.
- `cms:generate:importmap`: generates the Payload import map.
- `cms:generate:importmap:build`: generates the Payload import map with build-safe defaults for production build.
- `cms:bootstrap:founders`, `cms:bootstrap:founders:local`, `cms:bootstrap:founders:beta`, `cms:bootstrap:founders:prod`: seed founder CMS users through Payload.
- `cms:migrate:create`, `cms:migrate:up`, `cms:migrate:status`, `cms:migrate:down`, `cms:migrate:refresh`, `cms:migrate:reset`, `cms:migrate:fresh`: local Payload CMS migration commands; treat as human/operator commands unless explicitly directed.
- `cms:migrate:deploy:beta`, `cms:migrate:deploy:prod`, `cms:migrate:status:beta`, `cms:migrate:status:prod`: beta/prod Payload CMS migration commands. AI deployment restrictions are defined in `.ai/guidance/repository-rules.md#strict-no-deployments-ai-only`.

---

# `client/` Guidance & Rules (DO NOT EDIT. EDIT `client/.ai/guidance/` ONLY)

The rules below are the binding rules for this directory and every subdirectory beneath it. All agents operating within this scope must follow them, subject to the instruction precedence defined at the top of this `AGENTS.md` (most specific file wins on conflict).

## Frontend API Integration

Use this guidance when frontend work touches backend calls, route handlers, API contracts, secrets, webhook-driven updates, or browser/client logging.

### [STRICT] Shared API Helper

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

### [STRICT] No Direct Backend `fetch` In Components

Components must not call `fetch` directly to backend URLs. Components should use typed API helpers wrapped by React Query hooks.

The expected call stack is typed helpers, such as `apiGet` or `apiPost`, wrapped by React Query hooks.

### [GUIDELINE] Type-Safe API Responses And Authentication

Use explicit response type names such as `ProjectSummary` and `UserSettings` for API data, imported from `emly-common` when they represent backend payloads or derived near the consumer when they are view models. Attach auth centrally in API helpers. Handle `401` and `403` consistently through the existing auth/session patterns in `client/lib/auth/` and API error handling. Normalize errors into a common shape and show user-friendly UI messages.

### [STRICT] Use `emly-common` API Shapes

Treat Zod-inferred types from `emly-common` as the only source of truth for request and response types. Do not redeclare backend payload interfaces in `client/`.

If UI code needs derived view-model shapes, create them with TypeScript utility types or mapping functions near the consumer while keeping underlying API types unchanged. When the contract changes, update `common/src/zod/`, regenerate contract outputs with `npm run build --prefix common`, then adjust client code. See `common/AGENTS.md`.

### [STRICT] Route Handlers For Server-Side Logic

Use `client/app/api/*` route handlers when a frontend path needs to aggregate backend calls, hide secrets, inject server-side credentials, handle webhooks, or perform server-only actions.

### [GUIDELINE] Server Actions

Default to React Query mutations for consistency. Use Server Actions only for well-scoped cases where server-to-server calls materially improve performance and cache handling remains clear.

### [GUIDELINE] Direct Vs Proxy Calls

Default to calling backend APIs from the browser through `client/lib/api/api.ts`. Use route handler proxies when CORS requires it or when backend URLs, credentials, or server-only details must be hidden.

### [STRICT] Webhook-Driven Updates Use Polling For Now

Until real-time infrastructure exists, use React Query refetching or polling for backend-driven status updates or new items. Mark future real-time areas with TODOs and avoid ad-hoc real-time hacks.

### [GUIDELINE] Plan For SSE Or WebSockets

When push infrastructure is added, centralize connection management in a shared module such as `client/lib/live.ts`. On messages, update React Query caches or Zustand; components should remain unaware of the transport.

### [STRICT] Keep Secrets Out Of Client Bundles

Only `NEXT_PUBLIC_*` env vars may be used in client code. Non-public env vars must only be used in route handlers, middleware, or Server Components that never serialize secrets.

### [STRICT] Backend Reality Checks

No hacky data flows or workaround wiring. Every frontend call must be grounded in the current OpenAPI contract and verified against the actual `app/` implementation. If behavior seems inconsistent, brittle, or incorrect in the current task, including missing or incorrect OpenAPI fields, stop immediately, notify the user, and wait for direction.

### [STRICT] Centralized Client Logging

All frontend logging must go through `client/lib/logging/logger.ts`. Do not call `console.*` directly for API/query errors or feature logs.

Use structured logs with `level`, scope, and context objects. API logs must include `method`, `path`, `status`, and `requestId` from `x-request-id` or response metadata when available. Prefer `logApiFailure` for API responses and `logQueryIssue` for React Query errors.

Default severity is `error` for 5xx and `warn` for unexpected 4xx. Override only when the status is expected for the current flow. Emit expected or ignored statuses at `debug` level with a concise `note`. Use `apiGetOptional`, `ignoreStatuses`, or explicit log levels for optional resources or expected auth gaps.

Avoid logging PII or secrets. Log identifiers and metadata, not full payloads. If error bodies are surfaced, keep them minimal and metadata-only. Feature diagnostics should use `logMessage({ scope: '<feature>', level, message, context })` with concise context keys.

## Frontend Architecture Principles

Use this guidance for cross-cutting frontend architecture decisions that affect feature shape, naming, comments, dependency choices, dead-code cleanup, or external API/library verification.

### [STRICT] Feature-First Modularity

Organize code by feature/domain, not by technical layer. Keep each feature's pages, components, hooks, and state together, such as `client/app/(app)/dashboard/`, `client/app/(app)/pricing/`, or route-local `_components` and `_lib` folders.

Shared primitives live in `client/components/` and shared logic lives in `client/lib/`, but default to self-contained features. Adding or removing a feature should be mostly local to its folder.

Typical feature/domain names include `projects`, `settings`, and `dashboard`.

### [STRICT] Server-First Rendering And Data Fetching

Default pages and layouts to Server Components for initial loads and SEO-relevant content. Use Client Components only for interactivity, local state, browser APIs, React Query, Zustand, Framer Motion, or other client-only libraries.

This keeps first-paint JavaScript small and lets dynamic behavior hydrate only where needed. Detailed SC/CC boundaries live in `client/.ai/guidance/server-and-client-component-boundaries.md`.

### [STRICT] Clear State Responsibilities

Server state from backend APIs belongs in TanStack Query. App-wide client-only state belongs in Zustand, or Context for simple mostly static values. Local UI state belongs in component state via `useState`, `useReducer`, or refs.

Do not store server-derived data in Zustand or Context by default. Detailed state placement rules live in `client/.ai/guidance/frontend-state-boundaries.md`.

### [STRICT] Single Source Of Truth For Server Data

Each backend dataset should have one canonical query key and hook family. Multiple components requiring the same server data must use the same query key. The React Query cache is the only client cache for server data.

Details live in `client/.ai/guidance/react-query-server-state.md` and `client/.ai/guidance/react-query-caching-and-invalidation.md`.

### [GUIDELINE] Minimize Global State

Keep state in the smallest possible scope. Use local component state if only one component needs it, localized Context if only one subtree needs it, and Zustand only when state is truly app-wide, such as theme, auth/session, global modals, or cross-route UI. Treat global state as a last resort.

Details live in `client/.ai/guidance/frontend-state-boundaries.md` and `client/.ai/guidance/zustand-client-state-stores.md`.

### [GUIDELINE] Naming And Conventions

Use explicit, descriptive names. Query hooks use `useXQuery`, `useXListQuery`, and `useXMutation`. Zustand selectors use focused names such as `useX()` and `useXActions()`. Components use PascalCase names that describe the UI, such as `ProjectList` or `ProjectListItem`. Store modules should make their domain clear, such as `useAppStore`; folder names are lowercase or lowercase-with-hyphen.

Hook, query, and store naming details live in `client/.ai/guidance/react-query-server-state.md` and `client/.ai/guidance/zustand-client-state-stores.md`.

### [GUIDELINE] Prefer Composition; [STRICT] Avoid Premature Abstraction

Build UI from small components and hooks. Extract shared patterns only when reused in multiple places. Do not introduce super-generic components or utilities without proven reuse and a clear purpose.

### [STRICT] Explicit Over Implicit

Data flow, state sources, and side effects must be obvious from imports and hook calls. Avoid hidden globals and implicit injection. Favor explicit TypeScript types for state and return values. Lint warnings can be acceptable when reasonable, but lint errors must be resolved.

### [STRICT] Comment Policy

The base comment policy is defined in `.ai/guidance/repository-rules.md#strict-comment-rules`. Frontend-specific allowed public API contract examples include exported hooks, components, and store slices.

### [STRICT] Source-Of-Truth Collocation

Keep each main unit in one obvious place. Stores live in `client/lib/stores/`. Query hooks live in feature folders or `client/lib/api/hooks/`. Display transforms live near components or feature-local `client/lib/` code. Avoid hidden cross-file side effects.

### [GUIDELINE] Avoid Low-ROI Dependencies

Avoid dependencies that replace core stack choices such as state, HTTP client, routing, or styling, or that expand surface area without clear return. A package that meaningfully accelerates delivery is acceptable leverage, but it must fit the existing stack and be evaluated for bundle size, maintenance cost, security, and ownership.

Before implementing common logic such as validation, date formatting, or HTTP behavior, check `client/package.json` and relevant existing modules first. Use established libraries already in the package over custom implementations when they fit.

When adding, document the rationale and intended default usage (e.g., dates, charts) so the team can standardize on it.

### [STRICT] API And Library Usage Verification

Before using any library API, verify current non-deprecated usage and best practices through the available documentation MCPs. Use Context7 for library and framework documentation. Use AWS Knowledge MCP for AWS CDK and AWS service API signatures. Use the appropriate provider documentation source for provider-specific APIs.

For external libraries, confirm compatibility with the versions in `client/package.json`, check deprecation warnings, and replace deprecated patterns immediately. For React and Next.js, verify React 19 and Next.js 16 App Router patterns rather than legacy Pages Router patterns. For AWS/CDK work that touches the frontend delivery path, verify current construct/service patterns and prefer L2/L3 constructs where available.

### [STRICT] Aggressive Dead Code Elimination

Aggressively remove unused constants, variables, functions, classes, types, interfaces, imports, exports, components, hooks, CSS classes, Tailwind utility combinations, and entire files that become unreferenced. Remove commented-out code unless it has a specific TODO for future use.

When modifying or refactoring, check for code that becomes unused after your changes. Use search tools to verify references before deletion, especially for exported symbols, event handlers, and utilities. Audit `client/package.json` for dependencies that are no longer imported or used.

Use tools such as `rg`, `grep`, `Glob`, or IDE search to verify references before deletion. Pay special attention to exported symbols, event handlers, and utility functions.

Keep code marked with explicit TODO comments that describe future usage. Preserve temporarily disabled code only when an allowed comment explains when or why it will be re-enabled.

## Frontend Motion

Use this guidance when adding or changing Framer Motion variants, animated components, transition behavior, or motion accessibility.

### [STRICT] Central Variant Definitions

Define common Framer Motion variants centrally in `client/lib/motion/motion.ts` and reuse them for modals, dropdowns, panels, lists, and related surfaces. Prefer existing variants for consistency.

```ts
export const FADE_IN = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

export const SLIDE_UP = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.2 } },
  exit: { y: 10, opacity: 0, transition: { duration: 0.1 } },
};
```

Prefer existing variants such as `FADE_IN` and `SLIDE_UP` to maintain a cohesive feel across the application.

It is acceptable to add a new named variant when a UI pattern requires a distinct feel, provided it is exported from the central motion module and not duplicated locally in components. Do not duplicate equivalent variants across components; centralize them first.

### [GUIDELINE] Orchestration And Wrappers

Use parent/child variants with `staggerChildren` for list animations when appropriate. Lightweight wrappers such as `<FadeIn>` and `<SlideUp>` are acceptable when they reuse shared variants and keep repeated markup clear.

### [GUIDELINE] Central Motion Config

Keep shared durations and easing curves in the central motion module so motion remains consistent. Use named duration constants such as `ANIM_FAST` and `ANIM_MED` instead of scattering raw timing values through components.

### [STRICT] Only Animate Where Helpful

Use animation to clarify state changes, smooth appearance/disappearance, or direct attention. Avoid purely decorative or slow animations.

### [GUIDELINE] Subtle, Fast Animations

Typical durations should be about 150 to 400 milliseconds. Keep interactions responsive.

### [GUIDELINE] Layout Animations And AnimatePresence

Use Framer Motion layout animations for size/position transitions when performance is acceptable. Use `<AnimatePresence>` with exit variants when conditionally rendering overlays such as modals, dropdowns, and toasts.

### [STRICT] Performance-Safe Properties

Animate only `opacity` and `transform` properties such as `x`, `y`, `scale`, and `rotate` by default. Avoid animating expensive layout properties unless tested.

### [GUIDELINE] Consistent Easing And Accessibility

Use a small set of shared easing functions. Respect `prefers-reduced-motion`; use Tailwind `motion-safe:` and `motion-reduce:` where appropriate, or Framer Motion reduced-motion handling.

### [STRICT] Motion Components Are Client Components

Any component that uses Framer Motion must include `'use client'`. Keep motion-heavy components as leaf nodes and avoid turning large trees into Client Components only for animation.

### [STRICT] Avoid CSS Transition Conflicts

Framer Motion relies on a JS animation loop; generic CSS transitions (especially `transition: all`) fight for control of the same properties, causing jank/flickering.

Never use `transition-all` on `motion.*` components. Framer Motion controls geometry such as `x`, `y`, `scale`, `rotate`, and `layout`; do not also control those properties through CSS hover scale or transition-transform classes.

Geometry (`x`, `y`, `scale`, `rotate`, `layout`) must be handled by Framer Motion props such as `animate` and `whileHover`; do not use CSS `hover:scale-*` or `transition-transform` on the same element.

Paint changes such as `color`, `shadow`, and `border` can use specific CSS transitions like `transition-colors duration-200` when they do not overlap with Motion-controlled properties.

## Frontend Quality And CI

Use this guidance for client validation, no-test policy, TypeScript/ESLint expectations, suppressions, secrets, and manual verification.

### [STRICT] No Automated Tests

Do not add or keep automated tests of any kind under `client/`: unit, integration, end-to-end, component, snapshot, browser, or contract tests. Do not add test runners, test configs, test scripts, fixtures, mocks, or scaffolding. Remove test files or scaffolding added by templates.

### [STRICT] ESLint And Strict TypeScript

Use ESLint with React, hooks, Next.js, and relevant query/Tailwind rules. TypeScript must run in strict mode with `strict: true`, `noImplicitAny`, `noUnusedLocals`, and the package's other configured checks. There must be zero TypeScript or ESLint errors.

### [STRICT] Pre-Commit Hooks

Pre-commit hooks must run lint and safe fixes where configured. Commits failing lint must be blocked.

### [GUIDELINE] CI

PRs should not merge if build or lint/type checks fail. The client `build` script only runs Payload import-map generation and `next build`; it does not run `lint` or `type-check`. Before declaring client work complete, follow the `$ci` (`/ci`) skill (or see `{.ai,.claude,.codex}/skills/ci/SKILL.md`) from the repo root, or run the relevant separate scripts when a narrower validation is explicitly requested.

### [STRICT] TypeScript Suppressions

Use `@ts-expect-error` only when strictly necessary and with a comment explaining the reason. Avoid `@ts-ignore`.

### [STRICT] No `as any` Type Assertions

Never use `as any` in TypeScript code. Properly type the value, use existing types from `emly-common` for API data, reuse types already defined in the codebase, define a proper centralized type if truly new, derive with `Pick`/`Omit` or other utility types, or use `as unknown as SpecificType` only when absolutely necessary for narrowing. Prefer fixing the underlying type issue.

### [GUIDELINE] Editor And Scripts

Use VS Code with ESLint + Tailwind IntelliSense when available. Keep `client/.editorconfig` for consistent whitespace. Core client scripts are `npm run dev --prefix client`, `npm run prod --prefix client`, `npm run build --prefix client`, `npm run type-check --prefix client`, `npm run lint --prefix client`, and `npm run lint:fix --prefix client`. Maintain `client/.env.example` when adding required env variables.

### [GUIDELINE] Storybook And Docs

Storybook or similar tooling can be useful for core UI components, visual review, and documentation, but do not add test scaffolding as part of it. Keep frontend AI guidance under `client/.ai/guidance/` updated when patterns change.

### [STRICT] No Secrets Or Large Files In Git

Ensure `.gitignore` excludes `.env` and other secret or large artifacts. Never commit secrets or large binary assets that should reside elsewhere.

### [GUIDELINE] Manual Verification

Given the no-test policy, manually verify key flows per change, watch for console warnings/errors, and check adherence to `client/AGENTS.md` plus the relevant `client/.ai/guidance/` rules during review.

### Guidance Index

- State, React Query, Zustand, Server/Client Components, and caching: `client/.ai/guidance/`
- Structure and component composition: `client/.ai/guidance/frontend-structure-and-component-composition.md`
- Tailwind, theme tokens, primitives, and motion: `client/.ai/guidance/`
- API helpers, secrets, and logging: `client/.ai/guidance/api-integration.md`
- Performance: `client/.ai/guidance/frontend-rendering-and-runtime-performance.md`

## Frontend Performance

Use this guidance when work may affect render cost, bundle size, image/font behavior, large lists, or main-thread responsiveness.

### [STRICT] Keep Heavy Work Out Of Render And Interactions

Do not do expensive work directly in render or high-frequency handlers. Use memoization, move computation to the server, or offload to a Web Worker when needed.

### [GUIDELINE] Memoization And Referential Stability

Use `React.memo` for heavy child components with stable props. Use `useCallback` and `useMemo` to keep props stable when children are memoized. For Context values, wrap derived objects in `useMemo`.

### [GUIDELINE] Zustand Selectors And Batching

Always select the minimal necessary state from Zustand. Prefer single store updates that update multiple related fields over multiple separate updates.

Selector details live in `client/.ai/guidance/zustand-client-state-stores.md`.

### [STRICT] Image And Font Optimization

Use Next `<Image>` instead of raw `<img>` tags when feasible. Use `next/font` (or equivalent) for custom fonts. Use the project's current font-loading strategy rather than ad-hoc remote font loading.

### [GUIDELINE] Code Splitting

Dynamically import heavy, rarely used components such as rich editors, charts, and admin tools. Avoid importing heavy libraries into shared layouts or providers.

### [GUIDELINE] Large Data Sets

For very large lists, start with pagination or infinite scroll. Add virtualization, for example `react-window`, when required by real rendering cost. Watch DOM size and re-render frequency.

### [GUIDELINE] Monitoring And Leaks

Use profiling tools such as React DevTools or bundle analyzers for suspected performance issues. Always clean up intervals, timeouts, and subscriptions.

### [STRICT] No Heavy Work On Main Thread During Interactions

Offload CPU-intensive tasks away from the main UI thread through Web Workers or backend work.

## Frontend State Boundaries

Use this guidance to choose the correct state owner before adding React state, React Query, Zustand, or Context.

### [STRICT] Local UI State

Use `useState`, `useReducer`, and refs for transient component-local UI such as form inputs, one modal's open/close state, hover/active flags, and other ephemeral toggles. If no other part of the app needs the state, keep it local.

### [STRICT] Server State Via TanStack Query

Any data that comes from or is persisted on the backend is server state. Manage it with React Query via `useQuery`, `useSuspenseQuery`, and `useMutation`. Do not implement `useEffect + useState` for backend data fetching.

### [STRICT] App-Wide Client State Via Zustand

Use Zustand for global UI state such as sidebar open state, theme mode, and global modals; client-only data that must persist across navigation, such as unsaved drafts; and session/identity state when it is not fully handled by external auth libraries. Organize Zustand by slices such as `auth`, `ui`, and domain slices in a single store by default.

### [GUIDELINE] Context For Simple, Mostly Static Globals

Use React Context for mostly static values such as a theme object or locale, and for external provider contexts. Prefer Zustand over Context for frequently changing global state.

### [GUIDELINE] State Location Heuristics

Server-fetched or persisted data belongs in React Query. Non-server data needed across distant components belongs in Zustand. State used only in one small subtree belongs in local state or subtree Context. Global user/session info can be held in Zustand when needed, possibly seeded from server/auth. UI preferences that must persist should use Zustand plus selective persistence through localStorage or the server.

### [GUIDELINE] Date And Time Formatting

Use `Intl.DateTimeFormat` for date/time formatting and avoid ad-hoc manual string building in components. Use the existing `date-fns` dependency when complex manipulation is needed. Keep shared formats in `client/lib/utils/` or feature-local helpers so displays stay consistent, and prefer pure helpers over in-component formatting.

## Frontend Structure And Composition

Use this guidance when placing files, splitting components, choosing shared versus route-local ownership, or deciding between props, Context, and global state.

### [STRICT] Default Structure

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

### [STRICT] Feature Directories Under `client/app/`

Each top-level route or sub-route represents a feature/page. Use underscore-prefixed subfolders such as `_components`, `_hooks`, and `_lib` for files that should not become routes.

### [STRICT] Co-Locate Page-Specific Components

Components used only by a route live in that route's `_components/`. Do not put route-specific components into global `client/components/`.

### [STRICT] Shared Components

`client/components/ui/` holds low-level primitives. `client/app/(app)/_components/` holds shared app-shell elements used across routes, such as navigation, footer, banners, and page headers. Shared components must not contain feature-specific logic and must not import from feature folders.

### [GUIDELINE] `client/lib/` For Non-React Logic

`client/lib/` holds API helpers, Zustand stores, generic hooks, utilities, constants, logging, motion definitions, auth/session logic, workspace helpers, pricing data, and other non-route logic. Avoid React UI components in `client/lib/`.

### [GUIDELINE] Optional Domain Grouping In `client/lib/`

Mirror domains in `client/lib/` when helpful, such as `client/lib/pricing/`, `client/lib/workspaces/`, `client/lib/auth/`, and `client/lib/api/`. Older flat examples such as `client/lib/projectsApi.ts` or `client/lib/hooks/useProjectsPolling.ts` are acceptable only when they fit the current package shape; prefer the existing domain folders when they exist. Keep route-specific UI implementation in `client/app/`.

### [STRICT] No Mega Type-Only Folders

Do not create global "everything by type" folders such as `contexts/`. Keep code discoverable through route, feature, or domain ownership.

### [GUIDELINE] Route Groups

Use route groups such as `client/app/(app)/`, `client/app/(app)/(marketing)/`, `client/app/(app)/(scheduling)/`, and `client/app/(payload)/` for layout differences, public/authenticated sections, CMS surfaces, and routing organization. Groups can have their own layouts.

### [GUIDELINE] Alternative Feature Layout

An optional separate feature implementation folder, for example `client/features/`, is acceptable only when `client/app/` remains the routing map and delegates coherently. The result must still be feature-oriented and easy to navigate.

### [STRICT] Styles Location

Component-specific CSS modules live next to their component and should be rare because Tailwind is primary. `client/styles/` contains global CSS and Tailwind directives only. Tailwind token details live in `client/.ai/guidance/tailwind-theme-and-design-tokens.md`. Do not accumulate large ad-hoc CSS in global files.

### [GUIDELINE] Separation Of Concerns

`client/app/` contains routes, layouts, and pages. `client/components/` contains reusable UI. `client/lib/` contains logic, state, and utilities. Avoid circular dependencies; `client/lib/` should not import UI from `client/components/`.

### [STRICT] Barrel Index Files

Barrel `index.ts` files are allowed in select folders to simplify imports. If a barrel exists, keep it updated when adding or removing exports.

### [GUIDELINE] One Primary Component Responsibility

A component should primarily fetch/manage data, render UI from props, or manage local UI logic.

### [STRICT] Component Size & Complexity

If a file exceeds ~300 lines or has many hooks/effects, split it. Move large subsections into named child components and complex logic into custom hooks.

### [STRICT] Avoid Deeply Nested JSX

When JSX becomes deeply nested, extract named child components for each section, such as `UserInfoSection`, `BillingSection`, filters, or activity sections.

### [STRICT] Prefer Props

State ownership details live in `client/.ai/guidance/frontend-state-boundaries.md` and Zustand details live in `client/.ai/guidance/zustand-client-state-stores.md`.

Use props for parent-to-child data by default. Do not introduce global state just to avoid one to three levels of prop passing.

### [GUIDELINE] Limit Prop Drilling

After about two to three levels of unused prop forwarding, consider scoped Context for that subtree or Zustand if the state is truly cross-cutting.

### [GUIDELINE] Context For Subtree Concerns

Use feature-local Context for shared subtree state such as wizards or filter controllers. Keep context values minimal and split contexts when necessary.

### [STRICT] Do Not Abuse Context

Do not use Context as a general event bus or arbitrary global. Each Context must have a clear, documented contract.

### [STRICT] Avoid Global Store For Local Concerns

Local UI such as a single dropdown's open state or small form values must not go into Zustand. Add global state only when the state is truly shared and persistent.

### [GUIDELINE] Custom Hooks For Complex Logic

Move complex logic and effects to custom hooks to simplify components. Use explicit names that reveal domain and behavior, such as `useFilteredProjects` or `useProjectLiveUpdater`.

### [GUIDELINE] Localize Effects And Subscriptions

Subscriptions, timers, and similar effects belong in components or hooks that set them up in `useEffect` and clean them up on unmount.

### [STRICT] Avoid Tightly Coupled Responsibilities

Split components that handle unrelated concerns, such as auth handling versus profile display or list rendering versus an add-item modal.

### [GUIDELINE] Prefer Composition

Use composition for flexible structures. For example, `<Modal>` can accept body content via `children` and footer controls via an `actions` prop. Components can accept `children`, action slots, or explicit render props when that makes ownership clearer than global state or broad configuration.

### [STRICT] Container Vs Presentational

Containers live at page/feature boundaries and fetch data or manage side effects. Presentational components live under route `_components/` folders or `client/components/ui/` and receive data via props. Small self-contained components that fetch a small amount of data are allowed but should be exceptions.

## Frontend Caching

Use this guidance for React Query cache policy, data freshness, mutation invalidation, list scale, optimistic updates, logout cleanup, and N+1 prevention.

### [GUIDELINE] Global Defaults

Use sensible React Query global defaults, typically a `staleTime` around 30 to 60 seconds and a `gcTime` around five minutes. In older React Query wording, `cacheTime` maps to the current v5 `gcTime` concept. Override per query based on volatility.

Use short stale times, focus refetch, or polling for very dynamic data; `staleTime: 0` is appropriate when data must be treated as immediately stale. Use longer stale times for archival or stable data.

### [GUIDELINE] Live Vs Archival Data

Live data that changes frequently uses short stale times plus polling or future push mechanisms. Archival data that rarely changes uses longer stale times and refetches on mutations or explicit user action.

### [STRICT] Invalidate After Mutations

After mutations, always invalidate or update relevant caches, including list and detail queries as needed. Use targeted invalidation, such as `['project', id]`, to avoid unnecessary refetches.

### [GUIDELINE] Large Lists

Use pagination or infinite queries for large datasets, and include page and filters in query keys. Use `keepPreviousData` for paginated lists to avoid blanking during transitions; in TanStack Query v5, use the supported `placeholderData: keepPreviousData` pattern.

### [GUIDELINE] Optimistic Updates

Use optimistic updates only when changes are easy to roll back and the UX gain is significant, such as simple toggles or status flags. For complex or high-risk operations, prefer invalidation plus refetch.

### [STRICT] Avoid Stale Data And Leaks

On logout, call `queryClient.clear()` and reset sensitive Zustand state. Ensure timers and subscriptions are cleaned up in effects. Prefer React Query mechanisms over manual intervals when possible.

### [STRICT] Data Fetching And N+1 Prevention

Use React Query for all server state. Do not iterate over a list of items and fetch details for each item individually. Prefer a single bulk API call or an endpoint that includes required relations, such as `include=user`. If a change would require `Promise.all(items.map(fetchItem))`, stop and change the API/data contract instead of shipping N+1 fetching.

Configure stale time intentionally and use invalidation for mutations to keep data fresh.

### [GUIDELINE] Single Caching System

Use React Query as the only client caching layer for server data. Do not mix SWR or experimental data hooks for the same data.

## Frontend React Query

Use this guidance when adding, changing, hydrating, polling, invalidating, or consuming server-state queries and mutations.

### [STRICT] Single QueryClient At App Root

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

### [GUIDELINE] Query Keys And Colocation

Use array query keys and include all filters, pagination, workspace scopes, and IDs in the key. Do not use plain string keys or non-serializable key parts. Define canonical query keys and hooks near their feature or in `client/lib/api/hooks/` and `client/lib/api/queryKeys.ts`.

Concrete key examples:

- `['projects']`
- `['project', projectId]`
- `['projects', { status, page }]`

Define query hooks near their feature when route-local, for example `client/app/(app)/projects/_hooks/useProjectsQuery.ts`, or in the shared API hook area when reused across routes.

### [STRICT] Use Shared API Helper

Query and mutation functions use typed API helpers. The API helper contract and direct-fetch restrictions live in `client/.ai/guidance/api-integration.md`.

### [GUIDELINE] Organize Query Code

Keep low-level API calls in domain API modules under `client/lib/api/`, feature-local `api` or `services` modules, or shared helpers such as `apiGet` and `apiPost`. Expose hooks named `useXQuery`, `useXListQuery`, and `useXMutation`. Clearly separate read queries from write mutations.

### [GUIDELINE] Tune Query Options

Use per-query `staleTime` and `gcTime` based on data volatility. Use `enabled` when a query requires an ID, workspace, auth state, or other precondition. Use `initialData` only when data is already available through SSR or a parent. For mutations, use `onSuccess` to invalidate or update affected queries; use optimistic updates only when rollback is simple.

### [GUIDELINE] Polling For Near Real-Time

For active tasks or live status before WebSockets/SSE exists, use React Query `refetchInterval`. Polling queries should carry a concise TODO or rationale when they are expected to move to a push mechanism.

### [STRICT] Do Not Share Server Data Via Zustand Or Context

Do not copy React Query data into Zustand or Context as a pattern. Reuse the same query keys or pass data via props instead. Derived booleans and counts can be recomputed locally rather than globalized.

### [GUIDELINE] SSR And Hydration

Prefer Server Components for initial fetch and HTML. Use React Query hydration with `dehydrate` and `HydrationBoundary` when you need SSR performance plus client caching/refetch. Avoid duplicated fetch logic between SSR and the client; share the same fetcher and provide `initialData` or dehydrate data.

### [GUIDELINE] Hydration Vs Skeletons Decision Framework

Choose the strategy per page or feature. Hydrate with SSR prefetch, dehydrate, and `initialData` when data is available server-side, the page is primary or high-traffic, or a flash of empty state would hurt perceived quality. Keep stale time modest so the client can refresh.

Use client fetch with skeletons when data is highly volatile, SSR cost outweighs UX benefit, or the page is secondary enough that a brief skeleton is acceptable. Always decide intentionally and avoid visible flashes on key authenticated or marketing experiences.

When hydrating, use a per-request QueryClient on the server, dehydrate in the route, hydrate with `HydrationBoundary`, align hook query keys, and avoid parallel bespoke fetch paths that cause double-fetching.

### [GUIDELINE] Using Query Hooks In Components

Call query hooks at the top of components. Drive UI from React Query state:

- `isLoading` -> loading skeleton/spinner.
- `isError` -> error message plus optional retry.
- `data` (possibly `undefined` initially) -> main UI.

### [STRICT] Mutations And Cache Invalidation

Mutation invalidation and optimistic-update rules live in `client/.ai/guidance/react-query-caching-and-invalidation.md`. Apply those rules whenever a mutation changes server data.

### [GUIDELINE] Query Footprint And Fragmentation

Fetch only what the UI needs, but do not split tightly coupled data into many tiny queries used together on one screen. Balance bandwidth against complexity and render churn.

## Frontend Server And Client Components

Use this guidance when deciding whether a file should remain a Server Component, become a Client Component, or split responsibilities across both.

### [STRICT] Pages And Layouts Are Server Components By Default

Files in `client/app/` without `'use client'` are Server Components. Keep top-level `page.tsx` and `layout.tsx` files as Server Components unless they must run client-side.

Server Components fetch data, render structure, and provide SEO-relevant content. Client Components handle interactions, local state, React Query, Zustand, Framer Motion, and browser APIs.

### [STRICT] When To Use Client Components

Any component using React hooks such as `useState` or `useEffect`, browser APIs such as `window` or `localStorage`, React Query, Zustand, Framer Motion, or another client-only library must be a Client Component with `'use client'` at the top.

### [GUIDELINE] Split At Logical Boundaries

Server Component pages should fetch and render structure, then pass minimal props to Client Components for interactions. Prefer this SC-to-CC split over refetching the same data on the client when server-rendered data is already available.

### [GUIDELINE] Minimize Server-To-Client Props

Large payloads should be fetched with React Query in a Client Component when SEO is not critical. Small or medium data such as flags, configs, and moderate lists can be passed as props.

### [STRICT] No Interactive State In Server Components

Do not attach event handlers or interactive form state to Server Components. If a page is mostly interactive, a Client Component page can be acceptable, but evaluate a hybrid Server Component plus Client Component split first.

### [GUIDELINE] Server-Only Concerns

Use Server Components or route handlers for cookies, headers, secrets, environment variables, and secure backend calls. Do not replicate these concerns in client code.

### [STRICT] Providers With Client Hooks Must Be Client Components

Providers that use client hooks such as React Query, Zustand, or theme hooks must be Client Components. Server layouts can wrap children with these providers but must not use client hooks directly. Current provider patterns start in `client/app/(app)/providers.tsx`.

### [GUIDELINE] Streaming And Hydration

Keep Client Components small and focused so Server Components can stream most HTML quickly. Use skeletons/spinners for heavy Client Components when needed. For important data surfaces, follow `client/.ai/guidance/react-query-server-state.md` for hydration versus skeleton decisions.

## Frontend Tailwind And Theme

Use this guidance when changing Tailwind classes, design tokens, dark mode, CSS boundaries, UI primitive styling, or theme behavior.

### [STRICT] Tokens In Tailwind V4 Theme

All design tokens for colors, spacing, typography, radii, and shared structure must be defined in `client/styles/globals.css` via Tailwind v4 `@theme` or an explicit token system. Use semantic names such as `primary`, `primary-hover`, `surface`, `background`, `success`, `danger`, `text-title`, and `text-body`.

Do not use ad-hoc hex codes or magic numbers in components; add or reuse tokens instead.

### [STRICT] Tailwind Setup

Tailwind setup must stay centralized. Current Tailwind v4 theme tokens live in `client/styles/globals.css` via `@theme`, with project PostCSS wiring in `client/postcss.config.mjs`. Legacy guidance that the Tailwind config lives at the project root is stale for the current v4 setup; if a Tailwind config is intentionally reintroduced, it belongs at the client project root as `client/tailwind.config.*`, not inside route, component, or feature folders.

### [GUIDELINE] Semantic Colors

Use semantic utilities such as `bg-primary`, `text-danger`, `surface`, and `background` instead of raw palette names such as `bg-blue-500` where possible. Map tokens to CSS variables so themes can change without touching component code.

### [GUIDELINE] Dark Mode Via Class And CSS Variables

Use a class-based dark mode strategy, equivalent to `darkMode: 'class'` when a Tailwind config is present. Define CSS variables at `:root` and override them in `.dark`. Use Tailwind classes that reference these variables, such as `bg-app` and `text-app`, so theme changes stay token-driven.

### [STRICT] Avoid Arbitrary Values For Layout

**[MANDATE] Strict "On-Grid" Spacing**: Always prefer standard Tailwind spacing and sizing for grid-based layout, such as `p-4`, `m-2`, and `w-64`. Use approximate values from designs if they are close to the scale; if a design is 19px, use `p-5` (20px) or `p-4` (16px). Do not use arbitrary values for grid-based layout.

Arbitrary values (`[...]`) are permitted only for pixel-perfect one-off adjustments, such as `top-[1px]` to align an icon or `z-[100]` for a specific stacking context.

Create named tokens in `client/styles/globals.css` via `@theme` only for shared structural values, such as `--sidebar-width` or `--header-height`, or reusable design system elements such as a specific brand border radius when the standard scale is insufficient.

Summary: stick to the grid first. Use arbitrary values for unique tweaks. Use named tokens for shared structure.

### [STRICT] Prefer Tailwind Utilities In JSX

Style components primarily with Tailwind utilities in `className`. Custom CSS files or modules are rare exceptions when Tailwind cannot express the pattern cleanly.

### [GUIDELINE] Encapsulate Reused Patterns

For repeated class combinations, prefer a reusable React component such as `<Button variant="primary" />` or another variant-driven primitive. Secondarily use a utility class through `@apply` inside the UI library.

### [GUIDELINE] Avoid Utility Soup

Keep long class lists readable by grouping layout, spacing, typography, color, and state classes. Use existing helpers such as `clsx`, `cn`, and `tailwind-merge` patterns from `client/lib/utils/` for conditional classes. Split complex elements into smaller components.

### [STRICT] Use Tailwind Variants Instead Of Custom CSS Or JS

Use responsive variants such as `sm:`, `md:`, and `lg:`, and state variants such as `hover:`, `focus:`, and `disabled:`. Do not write custom media queries or JS styling when Tailwind can express the behavior.

### [GUIDELINE] Tailwind Plugins And Documentation

Use only needed official plugins. Document common class patterns for core elements through the relevant UI primitive or design guidance rather than scattered component comments.

### [STRICT] Core UI In `client/components/ui/`

Core primitive placement and API rules live in `client/.ai/guidance/ui-primitives-and-radix.md`. This file owns the Tailwind token rules those primitives consume.

### [STRICT] Single Theme With Dark Mode

Implement one theme with light/dark modes using CSS variables. Toggle dark mode by adding or removing `.dark` on `<html>` or `<body>`. Do not maintain duplicate dark-mode class sets; rely on tokens and variables.

### [STRICT] Semantic Color And Surface Tokens

Use paired semantic tokens such as `primary`, `on-primary`, `surface`, `on-surface`, `background`, `error`, `warning`, and `success`. Pair foreground and background tokens correctly, such as `bg-primary` with `text-on-primary`.

### [GUIDELINE] Future Multi-Brand Support

Keep tokens generic rather than brand-named. Plan for scoped themes such as `[data-theme="..."]` only when needed; do not implement multi-brand theming prematurely.

### [GUIDELINE] CSS Variables For Theming And Motion

Use CSS variables for colors and, where helpful, shared spacing modes, radii, blur values, and motion durations.

### [STRICT] Theme Source Of Truth

Store theme mode in one place, such as `useUIStore((s) => s.themeMode)` or ThemeContext. A top-level client provider reads theme mode and toggles root theme classes/attributes. Components should not branch on theme mode in business logic; they rely on CSS.

### [GUIDELINE] Accessibility And Contrast

Ensure tokens meet acceptable contrast for text/background pairs, primary actions, and status colors.

### [GUIDELINE] Keep Theme Out Of Business Logic

Theme affects visuals only. It must not affect data flow, permissions, or feature access.

### [STRICT] No Inline Styles For Theming

Do not set theme-related styles through inline `style={{ ... }}` props or direct JS DOM mutations. JS behavior should be limited to toggling theme classes or attributes.

## Frontend UI Primitives And Radix

Use this guidance before building or copying shared interactive UI primitives, especially components based on Radix or shadcn/ui-style source code.

### [STRICT] Radix UI Primitives

For complex interactive patterns such as `Modal`, `Popover`, `Select`, `Dropdown`, `Accordion`, `Tooltips`, and `Tabs`, you **must** use Radix UI primitives. Do not build these interaction patterns from scratch.

### [STRICT] Shadcn/Radix Copy-Ins

You may copy shadcn/ui-style components built from Tailwind and Radix into the repo. Once copied, they become first-party code and must follow local tokens, file structure, naming, comment policy, lint rules, and TypeScript rules.

### [STRICT] Source Verification

Agents are authorized to browse `shadcn/ui` documentation, raw component code, and Radix documentation as starting points via available web/docs tools such as `web.run`. Pull reference implementations from authoritative docs and adapt them to this stack. Do not import shadcn project conventions wholesale or treat shadcn as a runtime dependency.

### [STRICT] Local Adaptation

After copy-in, refactor to match local design tokens and patterns. Avoid bringing extra styling, routing, or state stacks. Use only the minimal Radix packages needed.

### [STRICT] Placement And Imports

Global primitives live in `client/components/ui/`. Feature-only variants belong in the route's `_components/` folder, for example `client/app/<feature>/_components/*`. `client/components/ui/` must not import from `client/app/` or any `client/app/*` route implementation.

### [STRICT] Primitive Styling Contract

Shared primitives must use semantic Tailwind tokens and expose `variant` and `size` props where applicable instead of pushing styling onto consumers. Token details live in `client/.ai/guidance/tailwind-theme-and-design-tokens.md`.

### [STRICT] Client Component Boundaries

Any copied-in component that uses Radix, hooks, event handlers, or Framer Motion must be a Client Component. Keep these primitives leaf-level; do not convert pages or layouts into Client Components just to host them. Server/Client Component boundary details live in `client/.ai/guidance/server-and-client-component-boundaries.md`.

### [STRICT] No Competing UI Frameworks Or Theme Systems

Do not introduce new UI frameworks or theme systems such as MUI, Ant Design, or Chakra.

## Frontend Zustand

Use this guidance when adding or changing app-wide client-only state, store slices, selectors, actions, or persistence.

### [STRICT] Single Store With Slices By Default

Use a single Zustand store composed of slices such as `auth`, `ui`, and domain slices by default. Consider separate stores only when slices are fully independent and there is a clear reason.

### [GUIDELINE] Middleware In Development

Use Devtools or Immer middleware in development when helpful, but keep production behavior simple and predictable.

### [STRICT] Export Selectors, Not Raw Store

Do not export a generic raw store hook for arbitrary selection across the codebase. Expose small, focused selectors per concern, such as one selector for a specific state value and one selector for a concern's stable actions object. Current stores live under `client/lib/stores/`.

Selector exports should stay small and named for the concern:

```ts
export const useSidebarOpen = () =>
  useAppStore((state) => state.ui.sidebarOpen);

export const useUIActions = () =>
  useAppStore((state) => state.ui.actions);
```

Do **not** export a generic `useStore` for arbitrary selection. Expose small, focused selectors per concern.

### [STRICT] Shallow Comparison And Narrow Selectors

Avoid selectors that return large objects. Prefer single-value selectors or multi-value selectors with shallow comparison when needed so re-renders stay scoped.

### [GUIDELINE] Actions Under `actions`

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

### [STRICT] Mutate Only Via Actions

All state changes must go through store actions with `set` inside the slice. Do not call raw store `setState` directly across the codebase, including `useStore.setState`.

### [GUIDELINE] Store Organization And Persistence

Define slice types and compose them into the store type. Add concise public API contract comments only when they clarify what a slice owns. Use `persist` or localStorage selectively, and make persistence behavior explicit.

### [STRICT] Reset Sensitive State At Boundaries

On logout or workspace/session boundary changes, reset sensitive Zustand state and clear React Query as appropriate. Coordinate with `client/lib/auth/` and `client/lib/workspaces/` patterns before adding new persistent state.
