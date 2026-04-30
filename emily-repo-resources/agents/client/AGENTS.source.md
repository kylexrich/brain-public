> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `client/AGENTS.md` _(this file)_ > `AGENTS.md` _(root)_

---

# `/client` EMLY Client Guide for AI Contributors

This section captures /client-specific structure, tooling, and frontend development workflows.

## Repository Overview

- Next.js 16 App Router app under `client/` using:
    - React 19 + TypeScript (ESM).
    - Tailwind CSS v4 for styling.
    - TanStack Query for server state.
    - Zustand for client-only global state.
    - Framer Motion for animation.

## `client/package.json` `npm` Scripts

- `dev`: starts the Next.js development server.
- `build`: builds the Next.js production bundle.
- `prod`: starts the Next.js production server.
- `lint`: runs ESLint checks.
- `lint:fix`: runs ESLint with auto-fix.
- `type-check`: runs TypeScript compiler in `--noEmit` mode.

## Workflows

> None for now

# `/client` Rules

## 1. Global Architecture Principles

### [STRICT] Feature‑First Modularity

* Organize code by **feature/domain**, not by technical layer.
* Keep each feature’s pages, components, hooks, and state together (e.g. `projects`, `settings`, `dashboard`).
* Shared primitives live in `components/` and shared logic in `lib/`, but default is **self‑contained features**.
* Aim to make adding/removing a feature mostly local to its folder.

### [STRICT] Server‑First Rendering & Data Fetching

* Default to **Server Components (SC)** for pages/layouts and SEO‑relevant content.
* Use **Client Components (CC)** only when you need:

    * Interactivity or local state.
    * Browser APIs (window, localStorage, etc.).
    * Client libraries (React Query, Zustand, Framer Motion).
* This minimizes JS shipped to the client on first paint.

### [STRICT] Clear State Responsibilities

* **Server state** (data from backend) → **TanStack Query**.
* **Client global state** (UI/session, not server‑derived) → **Zustand** (or Context for simple static values).
* **Local UI state** (forms, toggles, etc.) → `useState` / `useReducer` in components.
* Do **not** store server‑derived data in Zustand/Context by default.

### [STRICT] Single Source of Truth for Server Data

* Each backend dataset should have **one canonical query** (one key, one hook family).
* Multiple components requiring the same data must use the same query key.
* The React Query cache is the **only** client cache for server data.

### [GUIDELINE] Minimize Global State

* Keep state in the **smallest possible scope**:

    * Local component state if only one component uses it.
    * Localized context if only a subtree uses it.
    * Promote to Zustand only when truly needed app‑wide (e.g. theme, auth, global modals).
* Treat global state as a last resort.

### [GUIDELINE] Naming & Conventions

* Query hooks: `useXQuery`, `useXListQuery`, `useXMutation`.
* Zustand selectors: `useX()`, `useXActions()`.
* Components: PascalCase, descriptive (e.g. `ProjectList`, `ProjectListItem`).
* Stores: e.g. `useAppStore`, slices for `auth`, `ui`, `projects`.
* Folder names: lowercase or lowercase-with-hyphen.

### [GUIDELINE] Prefer Composition; [STRICT] Avoid Premature Abstraction

* Build UIs via **composition** of small components and hooks.
* Extract shared patterns only when reused in multiple places.
* Do **not** introduce super‑generic components or utilities without proven reuse.

### [STRICT] Explicit Over Implicit

* Data flow, state sources, and side effects must be obvious from imports and hooks.
* No "magic" globals or implicit injections.
* Favor explicit TypeScript types for state and return values.
* **[GUIDELINE]** Lint warnings are acceptable when they are reasonable; resolve lint errors.

### [STRICT] Comment Policy

* Write self-explanatory code; comments are the exception, not the rule.
* Allowed comments (only):
  * **TODO** – actionable, specific follow-ups.
  * **Why/intent for non-obvious constraints** – rationale for edge cases, security/compliance (esp. healthcare/PIPEDA), or surprising decisions.
  * **Public API contracts** – invariants/expectations for exported hooks, components, or store slices.
  * Required license or auto-generated headers.
* **[STRICT] Preserve human-authored context comments** that provide non-obvious, helpful rationale. Do not remove them unless the context is captured elsewhere with equal clarity. If stale, update; if unsure, ask before deleting.
* Forbidden and must be removed if found:
  * Incidental inline/block/JSDoc comments that restate the code (“what” or flow narration).
  * Legacy/explanatory prose, commented-out code without a TODO, or placeholder notes.
  * Commentary inside implementations where clearer naming/structure would suffice.
* Keep allowed comments concise and directly above the relevant code.

### [STRICT] Source‑of‑Truth Collocation

* Keep each main unit defined in one obvious place:

    * Stores in `lib/stores/…`.
    * Query hooks in feature or `lib/api/hooks`.
    * Display transforms near components or feature `lib/`.
* Avoid hidden cross‑file side effects.

### [GUIDELINE] Avoid Low-ROI Dependencies

* Avoid dependencies that replace our core stack (state, HTTP client, routing, styling) or meaningfully expand surface area without clear ROI.
* A dependency that meaningfully accelerates delivery (e.g., saves 2–6 weeks of UI work) is acceptable leverage, not “extra.”
* Prefer solutions that fit the existing stack; evaluate bundle size, maintenance cost, security, and long-term ownership before adding.
* When adding, document the rationale and intended default usage (e.g., dates, charts) so the team can standardize on it.

### [STRICT] Shadcn/Radix Copy-Ins

* **[MANDATE] Radix UI Primitives**: For complex interactive patterns (Modal, Popover, Select, Dropdown, Accordion, Tooltips, Tabs), you **MUST** use [Radix UI](https://www.radix-ui.com/) primitives. Do not build these from scratch.
* You may copy “shadcn/ui-style” components (Tailwind + Radix primitives) into the repo; once added they become first-party code and must follow all repo conventions (tokens, file structure, naming, comment policy, lint/types).
* **AI Retrieval**: Agents are explicitly authorized to browse `shadcn/ui` documentation or raw component code (via `web.run` / `read_url_content`) to use as a starting point.
* When sourcing, agents must pull reference implementations from authoritative docs (shadcn/ui + Radix) via `web.run` and adapt them to our stack; do **not** import shadcn project conventions wholesale or treat them as third-party dependencies.
* After copy-in, refactor to match our design tokens and patterns; avoid bringing extra styling/routing/state stacks. Use only the minimal Radix packages required.
* Global primitives live in `components/ui/*`; feature-only variants belong in `app/<feature>/_components/*`. `components/ui/*` must not import from `app/*`.
* Shared primitives must use semantic Tailwind tokens (no ad-hoc palette classes) and expose `variant`/`size` props where applicable instead of pushing styling onto consumers.
* Any copied-in component that uses Radix, hooks, event handlers, or Framer Motion must be a Client Component (`'use client'`). Keep these primitives leaf-level; do not convert pages/layouts into Client Components just to host them.
* Do not introduce new UI frameworks or theme systems (MUI/Ant/Chakra/etc.).

### [STRICT] Aggressive Dead Code Elimination

* **Aggressively remove** all unused/unreferenced code:
    * Delete unused constants, variables, functions, classes, types, and interfaces
    * Remove entire files that are no longer referenced or imported anywhere
    * Eliminate unused imports and exports
    * Remove commented-out code blocks (unless marked with specific TODO for future use)
    * Delete unused React components and hooks
    * Remove unused CSS classes and Tailwind utility combinations
    * **[STRICT] Audit package.json**: Identify and remove any dependency that is not imported or used in the codebase
* When modifying or refactoring code:
    * **Always** check for code that becomes unused after your changes
    * Use tools like `grep`, `Glob`, or IDE search to verify references before deletion
    * Pay special attention to: exported symbols, event handlers, utility functions
* Exceptions:
    * Keep code marked with explicit TODO comments that describe future usage
    * Preserve code that's temporarily disabled but will be re-enabled soon (must have comment explaining when/why)

### [STRICT] API & Library Usage Verification

* **[STRICT] Check `package.json` First**: Before implementing any custom logic or common pattern (e.g., validation, date formatting, HTTP calls), **check `package.json`** for existing dependencies. Use established libraries over custom implementations whenever possible to ensure correctness and completeness.
* **Always verify** you're using the most current, non-deprecated APIs and best practices:
    * Before using any library API, check its documentation via MCP servers (Context7, AWS Knowledge, etc.)
    * Verify you're not using deprecated fields, methods, or patterns
    * Ensure you're following the latest best practices for each library/framework
* When working with external libraries:
    * Use Context7 or appropriate MCP server to fetch current documentation
    * Check for deprecation warnings in the library's latest version
    * Verify compatibility with the project's current dependency versions
    * Replace deprecated patterns with recommended alternatives immediately
* For React/Next.js specifically:
    * Ensure you're using React 19 and Next.js 16 patterns (not legacy patterns)
    * Verify App Router patterns (not Pages Router)
    * Check for deprecated lifecycle methods or hooks
* For AWS CDK and services:
    * Use AWS Knowledge MCP to verify current API signatures
    * Check for newer construct versions or patterns
    * Ensure you're using L2/L3 constructs where available instead of L1

---

## 2. Data & State

### 2.1 State Boundaries

#### [STRICT] Local UI State

* Use `useState`, `useReducer`, refs for **transient, component‑local UI**:

    * Form inputs, open/close of a single modal, hover/active flags, etc.
* If no other part of the app needs the state, keep it local.

#### [STRICT] Server State via TanStack Query

* Any data that comes from or is persisted on the backend is **server state**.
* Manage it via React Query (`useQuery`/`useSuspenseQuery`, `useMutation`).
* Do **not** implement `useEffect + useState` for data fetching.

#### [STRICT] App‑Wide Client State via Zustand

* Use **Zustand** for:

    * Global UI (sidebar open, theme mode, global modals).
    * Client‑only data that must persist across navigation (e.g. unsaved drafts).
    * Session/identity state if not fully handled by external auth libraries.
* Organize as slices (`auth`, `ui`, `projects`, etc.) in a single store by default.

#### [GUIDELINE] Context for Simple, Mostly Static Globals

* Use React Context for:

    * Mostly static values (theme object, locale).
    * External provider contexts (Next/Auth, etc.).
* Prefer Zustand over Context for frequently changing global state.

#### [GUIDELINE] State Location Heuristics

* **Server‑fetched or persisted?** → React Query.
* **Needed across distant components, not server‑derived?** → Zustand.
* **Used only in one small subtree?** → local state or subtree Context.
* **Global user/session info?** → Zustand (possibly seeded from server).
* **UI preferences that should persist?** → Zustand + persistence (localStorage or server).

#### [GUIDELINE] Date & Time Formatting

* Use **Intl.DateTimeFormat** for parsing/formatting dates and times; avoid ad-hoc manual string building scattered across components. If complex manipulation is needed, install **date-fns**.
* Keep shared formats in `lib/utils/date` (or a feature-local helper) so displays stay consistent.
* Prefer pure helpers over in-component formatting to keep render logic lean.

---

### 2.2 TanStack Query

#### [STRICT] Single QueryClient at App Root

```tsx
// app/providers.tsx
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000 }, // tune as needed
  },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

* Define one `QueryClient` and wrap the app in a **Client** providers component.
* Use a global `staleTime` that avoids immediate refetch after SSR/hydration.

#### [GUIDELINE] Query Keys & Colocation

* Use array keys: `['projects']`, `['project', projectId]`, `['projects', { status, page }]`.
* Include all filters/pagination in the key; no plain string or non‑serializable keys.
* Define query hooks near their feature (e.g. `app/projects/_hooks/useProjectsQuery.ts`).

#### [STRICT] Use `fetch` via Shared API Helper

* All query/mutation functions must call the shared `lib/api` helper (see §9).
* The helper must:

    * Use native `fetch`.
    * Throw on non‑2xx responses so React Query sees an error.
* Do **not** call `fetch` directly in components or hooks against the backend.

#### [GUIDELINE] Organize Query Code

* Per feature:

    * `api` or `services` files with low‑level `apiGet`/`apiPost` calls.
    * Hook files exposing `useXQuery`, `useXMutation`.
* Clearly separate read (queries) vs write (mutations).

#### [GUIDELINE] Tune Query Options

* Use per‑query options:

    * `staleTime`, `cacheTime` based on data volatility.
    * `enabled` for queries requiring an ID/precondition.
    * `initialData` when you already have data (SSR or parent).
* For mutations:

    * Use `onSuccess` to invalidate/update relevant queries.
    * Use optimistic updates only when rollback is simple.

#### [GUIDELINE] Polling for Near Real‑Time

* For frequently updating data (active tasks, live status) before WebSockets/SSE:

    * Use `refetchInterval` in React Query.
* Clearly comment polling queries so they can later switch to push mechanisms.

#### [STRICT] Do Not Share Server Data via Zustand/Context

* Do **not** copy React Query data into Zustand or Context as a pattern.
* Reuse the same query keys or pass data via props instead.
* Derived booleans or counts can be recomputed locally; no need to globalize.

#### [GUIDELINE] SSR & Hydration

* Prefer **Server Components** for initial fetch & HTML.
* Use React Query hydration (`dehydrate`/`HydrationBoundary`) when you need SSR performance **and** client caching/refetch.
* Avoid duplicating fetch logic between SSR and client; reuse the same functions and provide `initialData` or dehydrate.

#### [GUIDELINE] Hydration vs Skeletons — Decision Framework

* Goal: zero-noticeable flicker on important flows; the site should feel polished, fast, and “established.” Choose the strategy per page/feature:
  * **Hydrate (SSR prefetch + dehydrate + `initialData`)** when: data is already available server-side (cookies/session), the page is a primary or high-traffic UX surface, or a flash of empty state would hurt perceived quality. Keep `staleTime` modest so the client refetches to stay fresh.
  * **Client fetch with skeletons** when: the data is highly volatile, SSR cost outweighs UX benefit, or the page is secondary/low-traffic and a brief loading skeleton is acceptable.
* Implementation pattern when hydrating: share the same fetcher between server and client; use a **per-request QueryClient** on the server; dehydrate in the route; hydrate with `HydrationBoundary`; pass `initialData` to hooks so query keys align; avoid parallel bespoke fetch paths or duplicated queries that cause double-fetching.
* Always decide intentionally—don’t add SSR “just because,” and don’t ship visible flashes on key authenticated or marketing experiences.

#### [GUIDELINE] Using Query Hooks in Components

* Call query hooks at the top of components.
* Drive UI from state:

    * `isLoading` → loading skeleton/spinner.
    * `isError` → error message + optional retry.
    * `data` (possibly `undefined` initially) → main UI.

#### [STRICT] Mutations & Cache Invalidation

* Every mutation that changes server data **must**:

    * Invalidate affected queries (`queryClient.invalidateQueries(queryKey)`), or
    * Update their cache entries (`setQueryData`).
* Default: prefer invalidation + refetch for correctness.
* Use optimistic updates only when UX benefit is clear and rollback is simple.

#### [GUIDELINE] Query Footprint & Fragmentation

* Fetch only what the UI needs; avoid over‑fetching huge payloads.
* Don’t split tightly coupled data into many tiny queries used together on one screen.
* Balance bandwidth vs complexity.

---

### 2.3 Zustand

#### [STRICT] Single Store with Slices (Default)

* Use a single Zustand store composed of slices (`auth`, `ui`, `projects`, etc.).
* Consider separate stores only if slices are fully independent and you have a clear reason.

#### [GUIDELINE] Middleware in Dev

* In development, use Devtools/Immer middleware if helpful.
* Keep production behavior simple and predictable.

#### [STRICT] Export Selectors, Not Raw Store

```ts
export const useSidebarOpen = () =>
  useAppStore((state) => state.ui.sidebarOpen);

export const useUIActions = () =>
  useAppStore((state) => state.ui.actions);
```

* Do **not** export a generic `useStore` for arbitrary selection.
* Expose small, focused selectors per concern.

#### [STRICT] Shallow Comparison / Narrow Selectors

* Avoid selectors returning large objects.
* Prefer:

    * Single-value selectors; or
    * Multi-value selectors with shallow compare when needed.
* This keeps re‑renders scoped.

#### [GUIDELINE] Actions Under `actions`

```ts
type UISlice = {
  sidebarOpen: boolean;
  actions: {
    toggleSidebar: () => void;
    openSettingsModal: () => void;
  };
};
```

* Export `useUIActions()` to get a stable actions object.

#### [STRICT] Mutate Only via Actions

* All state changes must go through actions (`set` inside slice).
* Do **not** call `useStore.setState` directly across the codebase.

#### [GUIDELINE] Store Organization & Persistence

* Define slice types; compose them into the store type.
* Add brief comments on what each slice owns.
* Use `persist` (or localStorage) **selectively** and document persistence behavior.

---

### 2.4 Server vs Client Components

#### [STRICT] Pages/Layout Are Server Components by Default

* Files in `app/` without `'use client'` are Server Components.
* All top‑level `page.tsx` and `layout.tsx` stay Server Components unless they **must** be client‑side.

Pattern:

* SC:

    * Fetches data.
    * Renders overall structure and SEO‑relevant content.
* CC:

    * Handles interactions, local state, React Query/Zustand, Framer Motion.

#### [STRICT] When to Use Client Components

* Any component that uses:

    * React hooks (`useState`, `useEffect`, etc.).
    * Browser APIs (`window`, `localStorage`, etc.).
    * React Query, Zustand, Framer Motion, etc.
* Must be a Client Component (`'use client'` at top of file).

#### [GUIDELINE] Split at Logical Boundaries

* SC pages fetch and render structure; they pass minimal props to CCs for interactions.
* Prefer this SC→CC split over refetching the same data on the client.

#### [GUIDELINE] Minimize SC→CC Props

* Large payloads (thousands of items) should be fetched via React Query in CC when SEO is not critical.
* Small or medium data (flags, configs, moderate lists) can be passed as props.

#### [STRICT] No Interactive State in Server Components

* Do **not** attach event handlers or interactive form state to SCs.
* If a page is mostly interactive, you may make the page a CC, but consider hybrid SC + CC first.

#### [GUIDELINE] Server‑Only Concerns

* Use SCs or route handlers for:

    * Cookies/headers.
    * Secrets/environment variables.
    * Secure backend calls.
* Do **not** replicate these concerns in client code.

#### [STRICT] Providers with Client Hooks Must Be Client Components

* Providers that use client hooks (React Query, Zustand, Theme) must be Client Components (e.g. `app/providers.tsx`).
* Server `layout.tsx` can wrap children with these client providers but **must not** use client hooks itself.

#### [GUIDELINE] Streaming & Hydration

* Keep CCs small and focused so SCs can stream most HTML quickly.
* Use loading skeletons/spinners for heavy CCs as needed.
* When deciding between skeletons vs hydration, follow the **Hydration vs Skeletons** framework above so SSR choices stay intentional and consistent.

---

### 2.5 Caching Strategy (React Query)

#### [GUIDELINE] Global Defaults

* Set global `staleTime` (~30–60s) and `cacheTime` (~5m) as sensible defaults.
* Override per query:

    * Very dynamic: `staleTime: 0` + refetch on focus/polling.
    * Archival/stable: longer `staleTime`.

#### [GUIDELINE] Live vs Archival

* **Live** (frequent changes): short `staleTime`, polling or future push.
* **Archival** (rare changes): long `staleTime`, refetch only on mutations or user action.

#### [STRICT] Invalidate After Mutations

* After mutations, always invalidate or update relevant caches (lists + details as needed).
* Use targeted invalidation (`['project', id]`, etc.) to avoid unnecessary refetches.

#### [GUIDELINE] Large Lists

* Use pagination/infinite queries for large datasets; include page and filters in keys.
* Use `keepPreviousData` for paginated lists to avoid blanking during transitions.

#### [GUIDELINE] Optimistic Updates

* Use optimistic updates when:

    * Changes are easy to roll back.
    * UX gains are significant (toggles, status flags).
* For complex/high‑risk operations, prefer invalidation + refetch.

#### [STRICT] Avoid Stale Data & Leaks

* On logout:

    * Call `queryClient.clear()` and reset sensitive Zustand state.
* Ensure timers/subscriptions are cleaned up in effects.
* Use React Query mechanisms over manual intervals when possible.

#### [STRICT] Data Fetching & N+1 Prevention
- Use **React Query** for all server state.
- **NO N+1 FETCHING**:
    - **NEVER** iterate over a list of items and fetch details for each one individually.
    - **ALWAYS** prefer a single bulk API call or an endpoint that includes necessary relations (e.g., `include=user`).
    - If you find yourself writing `Promise.all(items.map(fetchItem))`, **STOP**. You are doing it wrong. Change the API to support the data need.
- Configure `staleTime` appropriately (default to 30s-1m for most data).
- Use `invalidateQueries` for mutations to keep data fresh.

#### [GUIDELINE] Single Caching System

* Use **React Query** as the only client caching layer.
* Do **not** mix SWR or experimental data hooks for the same data.

---

## 3. Folder & File Structure

### 3.1 Default Structure (Example)

```text
app/                             # Routes & feature entrypoints
├── layout.tsx                   # Root layout (SC; wraps Providers)
├── providers.tsx                # [CLIENT] Global providers
├── page.tsx                     # Landing / marketing
├── dashboard/
│   ├── layout.tsx
│   └── page.tsx
├── projects/
│   ├── layout.tsx
│   ├── page.tsx                 # Projects list (SC)
│   ├── _components/
│   │   ├── ProjectList.tsx      # [CLIENT] uses useProjectsQuery
│   │   ├── ProjectRow.tsx
│   │   └── ProjectFilter.tsx
│   ├── _hooks/
│   │   └── useProjectsQuery.ts
│   └── [id]/
│       ├── page.tsx             # Project details (SC)
│       └── _components/
│           ├── ProjectDetails.tsx
│           └── ActivityFeed.tsx
components/                      # Shared, reusable UI
├── ui/
│   ├── Button.tsx
│   ├── Modal.tsx
│   └── Input.tsx
├── layout/
│   ├── Navbar.tsx
│   └── Sidebar.tsx
└── feedback/
    ├── Spinner.tsx
    └── Toast.tsx
lib/                             # Shared logic (no React UI)
├── api.ts                       # API helpers (fetch wrappers)
├── queryClient.ts               # QueryClient config
├── stores/                      # Zustand stores
├── hooks/                       # Generic hooks
├── utils/                       # Utilities
└── constants.ts
styles/
├── globals.css
└── tailwind.css                 # Tailwind directives
public/                          # Public assets
```

This structure is the **[STRICT] default**.

### 3.2 Structural Rules

#### [STRICT] Feature Directories Under `app/`

* Each top‑level route/sub‑route represents a feature/page.
* Use underscore‑prefixed subfolders (`_components`, `_hooks`, `_lib`) for non‑route files.

#### [STRICT] Co‑Locate Page‑Specific Components

* Components used only by a route live in that route’s `_components/`.
* Do **not** put route‑specific components into global `components/`.

#### [STRICT] Shared Components in `components/` and `app/_components`

* `components/ui/` holds low‑level primitives.
* `app/_components/` holds shared app‑shell elements used across routes (Navbar, Footer, banners, page headers).
* Shared components must **not** contain feature‑specific logic and must not import from feature folders.

#### [GUIDELINE] `lib/` for Non‑React Logic

* `lib/` holds:

    * API helpers.
    * Zustand stores.
    * Generic hooks.
    * Utilities and constants.
* Avoid React UI components in `lib/`.

#### [GUIDELINE] Optional Domain Grouping in `lib/`

* Mirror domains when helpful:

    * `lib/projectsApi.ts`, `lib/hooks/useProjectsPolling.ts`, etc.

#### [STRICT] No Mega Type‑Only Folders

* Do **not** create global “everything by type” directories (e.g. `contexts/` with all contexts).
* `app/` is the main map of the app.

#### [GUIDELINE] Route Groups

* Use route groups (`(app)`, `(marketing)`) for:

    * Auth vs public sections.
    * Layout differences.
* Groups can have their own layouts.

#### [GUIDELINE] Alternative `features/` Layout

* Optional:

    * Keep pages in `app/` that delegate to `features/…` implementation.
* This is acceptable if still feature‑oriented and coherent.

#### [STRICT] Styles & Tests Location

* Component‑specific CSS modules live next to the component file (rare; Tailwind is primary).
* Tests (if introduced later) should also live next to components.

#### [STRICT] Tailwind Setup

* `styles/` contains global CSS and Tailwind directives only.
* Tailwind config lives at project root.
* Do not accumulate large ad‑hoc CSS in global files.

#### [GUIDELINE] Separation of Concerns

* `app/` – routes, layouts, pages.
* `components/` – reusable UI.
* `lib/` – logic/state/utilities.
* Avoid circular dependencies (`lib` should not import `components`).

#### [STRICT] Barrel Index Files

* Barrel (`index.ts`) files are allowed in select folders to simplify imports.
* If a barrel exists, keep it updated when adding/removing exports.

---

## 4. Styling & Theming (Tailwind)

### 4.1 Design Tokens & Tailwind Usage

#### [STRICT] Tokens in Tailwind Config

* All design tokens (colors, spacing, typography, radii) must be defined in Tailwind config or a token system.
* Use **semantic** names:

    * Colors: `primary`, `primary-hover`, `surface`, `background`, `success`, `danger`, etc.
    * Typography: `text-title`, `text-body`, etc.
* No ad‑hoc hex codes or magic numbers in components; add tokens instead.

#### [GUIDELINE] Semantic Colors

* Use semantic utilities (`bg-primary`, `text-danger`) instead of raw palette names (`bg-blue-500`) where possible.
* Map tokens to CSS variables so themes can change without touching component code.

#### [GUIDELINE] Dark Mode via Class + CSS Variables

* Use Tailwind `darkMode: 'class'`.
* Define CSS variables at `:root` and override them in `.dark`.
* Use Tailwind classes that reference these variables (`bg-app`, `text-app`, etc.).

#### [STRICT] Avoid Arbitrary Values

* **[MANDATE] Strict "On-Grid" Spacing**: Always prefer standard Tailwind spacing (e.g., `p-4`, `m-2`, `w-64`). Use "approximate" values from designs if they are close to the scale (e.g., if design is 19px, use `p-5` (20px) or `p-4` (16px)). **Do not use arbitrary values for grid-based layout.**
* **Arbitrary Values (`[...]`)**: Permitted **only** for "pixel-perfect" one-off adjustments (e.g., `top-[1px]` to align an icon, `z-[100]` for a specific stacking context).
* **Named Tokens**: Create new named tokens in `globals.css` (`@theme`) **only** for:
    *   **Shared structural values** (e.g., `--sidebar-width`, `--header-height`).
    *   **Reusable design system elements** (e.g., specific brand border radius if not using standard size).
* **Summary**: Stick to the grid first. Use arbitrary values for unique tweaks. Use named tokens for shared structure.

#### [STRICT] Prefer Tailwind Utilities in JSX

* Style components primarily via `className` with Tailwind utilities.
* Custom CSS files/modules are rare exceptions when Tailwind cannot express the pattern cleanly.

#### [GUIDELINE] Encapsulate Reused Patterns

* For repeated class combinations:

    * Prefer a reusable React component (`<Button variant="primary" />`).
    * Secondarily, a utility class via `@apply` within the UI library.

#### [GUIDELINE] Avoid Utility Soup

* Keep long class lists readable:

    * Group by spacing/layout/typography/colors/state.
    * Use `clsx` (or similar) for conditional classes.
    * Split complex elements into smaller components.

#### [STRICT] Use Tailwind Variants Instead of Custom CSS/JS

* Use `sm:`, `md:`, `lg:` for responsive design.
* Use `hover:`, `focus:`, `disabled:`, etc. for states.
* Do not write custom media queries or JS styling when Tailwind can do it.

#### [GUIDELINE] Tailwind Plugins & Documentation

* Use only needed official plugins (typography, forms, etc.).
* Document common class patterns for core elements (buttons, cards, badges).

---

### 4.2 Design System & Theme Management

#### [STRICT] Core UI in `components/ui`

* Maintain a small core set:

    * `Button`, `Input`, `TextArea`, `Select`, `Checkbox`, `Toggle`.
    * `Modal`, `Card`, `Badge`, etc.
* These must:

    * Use Tailwind + tokens.
    * Expose props (`variant`, `size`) instead of requiring raw class strings.
    * **CVA Recommended**: Use **class-variance-authority (CVA)** to define `variant`/`size` class recipes for primitives (e.g., Button, Badge) so styling remains centralized and consistent.

#### [STRICT] Single Theme with Dark Mode

* Implement a single theme with light/dark modes using CSS variables.
* Toggle dark mode by adding/removing `.dark` on `<html>` or `<body>`.
* Do **not** maintain duplicate dark mode class sets; rely on tokens/variables.

#### [STRICT] Semantic Color & Surface Tokens

* Use tokens like `primary`, `on-primary`, `surface`, `on-surface`, `background`, `error`, `warning`, `success`.
* Pair foreground/background tokens correctly (e.g. `bg-primary` + `text-on-primary`).

#### [GUIDELINE] Future Multi‑Brand Support

* Keep tokens generic (not brand‑named).
* Plan for `[data-theme="..."]` or similar scopes, but do not implement until needed.

#### [GUIDELINE] CSS Variables for Theming & Motion

* Use CSS variables for:

    * Colors (already required).
    * Potential spacing modes, radii, blur, motion durations.

#### [STRICT] Theme Source of Truth

* Store theme mode in a single place (e.g. `useUIStore((s) => s.themeMode)` or ThemeContext).
* A top‑level client provider:

    * Reads theme mode.
    * Adds/removes `.dark` on root.
* Components should **not** branch on theme mode in logic; they rely on CSS.

#### [GUIDELINE] Accessibility & Contrast

* Ensure tokens meet acceptable contrast for text vs background, primary actions, and status colors.

#### [GUIDELINE] Keep Theme Out of Business Logic

* Theme affects visuals only; never data flow or feature access.

#### [STRICT] No Inline Styles for Theming

* Do **not** set theme‑related styles via `style={{ … }}` or direct JS DOM mutations.
* The only JS behavior is toggling theme classes / attributes.

---

## 5. Motion & Animation (Framer Motion)

### 5.1 Shared Motion Patterns

#### [STRICT] Central Variant Definitions

```ts
// e.g. lib/motion.ts
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

* Define common variants centrally and reuse them for modals, dropdowns, panels, etc.
* **[GUIDELINE] Preference for Consistency**: Prefer using existing variants (`FADE_IN`, `SLIDE_UP`, etc.) to maintain a cohesive feel across the application.
* **[GUIDELINE] Acceptance of New Variants**: It is **entirely acceptable** to add new animation variants if a specific UI pattern requires a distinct feel (e.g., a "bouncy" card or "smooth" sidebar), provided they are:
    1. Defined as named exports in `lib/motion/motion.ts` (centralized).
    2. Not duplicated locally in components.
* Do **not** duplicate equivalent variants across components; centralize them first.

#### [GUIDELINE] Orchestration & Wrappers

* Use parent/child variants with `staggerChildren` for list animations.
* Optionally define wrappers (`<FadeIn>`, `<SlideUp>`) using shared variants.

#### [GUIDELINE] Central Motion Config

* Keep shared constants for durations (e.g. `ANIM_FAST`, `ANIM_MED`) and easing curves.

### 5.2 Motion Usage Rules

#### [STRICT] Only Animate Where Helpful

* Use animation to:

    * Clarify state changes.
    * Smooth appearance/disappearance.
    * Direct attention.
* Avoid purely decorative or slow animations.

#### [GUIDELINE] Subtle, Fast Animations

* Typical durations: 150–400ms; keep things snappy.

#### [GUIDELINE] Layout Animations & AnimatePresence

* Use `layout` for size/position transitions when performance is acceptable.
* Use `<AnimatePresence>` + exit variants when conditionally rendering overlays (modals, dropdowns, toasts).

#### [STRICT] Performance‑Safe Properties

* Animate only `opacity` and `transform` (`x`, `y`, `scale`, `rotate`) by default.
* Avoid animating expensive layout properties unless tested.

#### [GUIDELINE] Consistent Easing & Accessibility

* Use a small set of shared easing functions.
* Respect `prefers-reduced-motion`; use Tailwind `motion-safe:` / `motion-reduce:` where appropriate.

#### [STRICT] Motion Components Are Client Components

* Any component that uses Framer Motion must include `'use client'`.
* Keep motion‑heavy components as leaf nodes; avoid turning big trees into CCs just for animation.

#### [STRICT] Avoid CSS Transition Conflicts

* **Root Cause:** Framer Motion relies on a JS animation loop; generic CSS transitions (especially `transition: all`) fight for control of the same properties, causing jank/flickering.
* **Rule**: **NEVER** use `transition-all` on `motion.*` components.
* **Geometry vs. Paint**:
    *   **Geometry (`x`, `y`, `scale`, `rotate`, `layout`)**: Must be handled by Framer Motion (`animate`, `whileHover` props). Do not use CSS `hover:scale-*` or `transition-transform`.
    *   **Paint (`color`, `shadow`, `border`)**: May use **specific** CSS transitions (e.g., `transition-colors duration-200`) for performance, provided they don't overlap with Motion-controlled properties.

---

## 6. Components & Composition

### 6.1 Responsibilities & Size

#### [GUIDELINE] One Primary Responsibility

* A component should primarily:

    * Fetch/manage data (container), **or**
    * Render UI from props (presentational), **or**
    * Manage local UI logic.

#### [STRICT] Component Size & Complexity

* If a file exceeds ~300 lines or has many hooks/effects, split it.
* Break out:

    * Large sub‑sections into child components.
    * Complex logic into custom hooks.

#### [STRICT] Avoid Deeply Nested JSX

* When JSX becomes deeply nested, extract named child components for each section (e.g. `UserInfoSection`, `BillingSection`).

### 6.2 Data Flow: Props, Context, Global State

#### [STRICT] Prefer Props

* Use props for parent → child data by default.
* Do **not** introduce global state just to avoid 1–3 levels of prop passing.

#### [GUIDELINE] Limit Prop Drilling

* After ~2–3 levels of unused prop forwarding, consider:

    * A scoped Context for that subtree, or
    * A store (Zustand) if state is truly cross‑cutting.

#### [GUIDELINE] Context for Subtree Concerns

* Use feature‑local Context for shared subtree state (wizards, filter controllers, etc.).
* Keep context values minimal; split contexts if necessary.

#### [STRICT] Do Not Abuse Context

* Do **not** use Context as a general event bus or for arbitrary globals.
* Each Context must have a clear, documented contract.

#### [STRICT] Avoid Global Store for Local Concerns

* Local UI (single dropdown open state, small form values) must **not** go into Zustand.
* Add new global state only when the state is truly shared and persistent.

#### [GUIDELINE] Custom Hooks for Complex Logic

* Move complex logic and effects to custom hooks (e.g. `useFilteredProjects`, `useProjectLiveUpdater`) to simplify components.

#### [GUIDELINE] Localize Effects & Subscriptions

* Subscriptions (WebSockets, timers, etc.) belong in components or hooks that:

    * Set up in `useEffect`.
    * Clean up on unmount.

### 6.3 Patterns & Anti‑Patterns

#### [STRICT] Avoid Tightly Coupled Responsibilities

* Split components that handle unrelated concerns:

    * E.g. auth handling vs profile display; list vs “add item” modal.

#### [GUIDELINE] Prefer Composition

* Use composition for flexible structures:

    * `<Modal>` accepts body via `children` and footer via `actions` prop, etc.

#### [STRICT] Container vs Presentational

* **Containers**:

    * Live at page/feature boundaries.
    * Fetch data, manage side effects.
* **Presentational components**:

    * Live under `_components/` or `components/ui/`.
    * Receive data via props and render UI only.
* Small self‑contained components that fetch their own small data are allowed but should be exceptions.

---

## 7. Performance & Optimization

### 7.1 Re‑renders & Computation

#### [STRICT] Keep Heavy Work Out of Render & Interactions

* Do not do expensive work directly in render or high‑frequency handlers.
* Use `useMemo` or move computation to the server or a Web Worker.

#### [GUIDELINE] Memoization & Referential Stability

* Use `React.memo` for heavy child components with stable props (e.g. list items).
* Use `useCallback` and `useMemo` to keep props stable when children are memoized.
* For Context values, wrap derived objects in `useMemo`.

#### [GUIDELINE] Zustand Selectors & Batching

* Always select the minimal necessary state from Zustand.
* Prefer single `set` calls updating multiple fields over multiple `set`s.

### 7.2 Bundles, Images, and Lists

#### [STRICT] Image & Font Optimization

* Use Next `<Image>` instead of `<img>` when feasible.
* Use `next/font` (or equivalent) for custom fonts.

#### [GUIDELINE] Code Splitting

* Dynamically import heavy, rarely used components (rich editors, charts, admin tools).
* Avoid importing heavy libraries into shared layouts/providers.

#### [GUIDELINE] Large Data Sets

* For very large lists:

    * Start with pagination or infinite scroll.
    * Use virtualization (e.g. `react-window`) when required.
* Watch overall DOM size and re-render frequency.

#### [GUIDELINE] Monitoring & Leaks

* Use profiling tools (React DevTools, bundle analyzers) for suspected performance issues.
* Always clean up intervals, timeouts, and subscriptions.

#### [STRICT] No Heavy Work on Main Thread During Interactions

* Offload CPU‑intensive tasks away from the main UI thread (web workers or backend).

---

## 8. API & Backend Integration

### 8.1 Central API Layer

#### [STRICT] Shared API Helper

```ts
// lib/api.ts
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

* All backend calls (including React Query functions) must go through this helper.

#### [STRICT] No Direct `fetch` in Components

* Components must not call `fetch` directly to backend URLs.
* They should call:

    * Typed API helpers, wrapped by
    * React Query hooks.

#### [GUIDELINE] Type‑Safe API Responses & Authentication

* Define response types (`ProjectSummary`, `UserSettings`, etc.).
* Attach auth (cookies/tokens) centrally in the API helper.
* Handle `401`/`403` consistently (e.g. clear auth store, redirect to login).

#### [STRICT] Use `emly-common` API Shapes

* Treat the Zod-inferred types in `emly-common` as the **only** source of truth for request/response types.
* Do **not** re-declare interfaces for backend payloads in the client; import the Zod types directly.
* If the UI needs derived/view-model shapes, create them via `Pick`/`Omit`/mapping functions near the consumer, while keeping the underlying API types unchanged.
* When the contract changes, update `common/src/zod/`, regenerate the contract outputs via `npm run build --prefix common`, and then adjust client code to the new shapes (see `common/AGENTS.md`).

#### [GUIDELINE] Error UX & Logging

* Normalize errors into a common shape.
* Show user‑friendly messages in UI.
* Optionally log important failures in development/production.

### 8.2 Next.js Integration & Secrets

#### [STRICT] Route Handlers for Server‑Side Logic

* Use `app/api/*` route handlers when:

    * You need to aggregate backend calls.
    * You must hide secrets or inject server‑side credentials.
    * You handle webhooks or server‑only actions.

#### [GUIDELINE] Server Actions

* Default to React Query mutations for consistency.
* Only use Server Actions for well‑scoped cases where server‑to‑server calls significantly improve performance and cache handling is acceptable.

#### [GUIDELINE] Direct vs Proxy Calls

* Default: call backend APIs directly from the browser via `lib/api`.
* Use route handler proxies if:

    * CORS issues arise, or
    * You must hide backend URLs / attach secure credentials.

#### [STRICT] Webhook‑Driven Updates Use Polling For Now

* Until real‑time infrastructure exists:

    * Use React Query refetching or polling to pick up backend‑driven changes (e.g. statuses, new items).
* Mark future real‑time areas with TODOs; avoid ad‑hoc real‑time hacks.

#### [GUIDELINE] Plan for SSE/WebSockets

* When added, centralize connection management (e.g. `lib/live.ts`).
* On messages, update React Query caches or Zustand; components should remain unaware of the transport.

#### [STRICT] Keep Secrets Out of Client Bundles

* Only `NEXT_PUBLIC_*` env vars may be used in client code.
* All non‑public env vars must only be used in:

    * Route handlers.
    * Middleware.
    * Server Components that never serialize secrets.

### 8.3 Backend Reality Checks

* **[STRICT]** No hacky data flows or workaround wiring. Every frontend call must be grounded in the **current** OpenAPI contract **and** verified against the actual `app/` implementation; if behavior seems inconsistent, brittle, or incorrect (including missing/incorrect OpenAPI fields) in the approach you are implementing (or just implemented) in the current task, stop immediately, notify the user, and wait for direction.

### 8.4 Centralized Client Logging

* **[STRICT]** All frontend logging must go through `lib/logging/logger.ts`; do not call `console.*` directly for API/query errors or feature logs.
* **[STRICT]** Use structured logs with level + scope + context objects. API logs must include `method`, `path`, `status`, and `requestId` (from `x-request-id` or response meta). Prefer `logApiFailure` for API responses and `logQueryIssue` for React Query errors.
* **[STRICT]** Default severity mapping: 5xx → `error`, unexpected 4xx → `warn`. Only override when the status is expected for the current flow.
* **[GUIDELINE]** Emit expected/ignored HTTP statuses (e.g., intentional 404s) at `debug` level with a short `note` explaining why they were ignored to reduce console noise while keeping breadcrumbs.
* **[GUIDELINE]** For optional resources or expected auth gaps, use `apiGetOptional`/`ignoreStatuses` or pass an explicit `level` to `logQueryIssue` so expected states avoid warn/error logs.
* **[STRICT]** Avoid logging PII or secrets; log identifiers and metadata, not full payloads. If error bodies are surfaced, keep them minimal and metadata-only.
* **[GUIDELINE]** When adding feature-level diagnostics, prefer `logMessage({ scope: '<feature>', level, message, context })` with concise context keys so logs remain ingestible by browser/remote collectors.

---

## 9. Testing & Developer Experience

### 9.1 Testing Policy

#### [STRICT] No Automated Tests for Now

* Do **not** add automated tests (unit, integration, E2E).
* Remove any test scaffolding/configs added by templates.

#### [GUIDELINE] Future Testing

* Architecture (containers vs presentational, hooks for logic) should make future testing easier if policy changes.

### 9.2 Linting, Types, and CI

#### [STRICT] ESLint & Strict TypeScript

* Use ESLint with:

    * React + hooks rules.
    * Next.js rules.
    * React Query/Tailwind plugins where helpful.
* TypeScript must run in strict mode (`strict: true`, `noImplicitAny`, `noUnusedLocals`, etc.).
* There must be **zero** TypeScript or ESLint errors.

#### [STRICT] Pre‑Commit Hooks

* Pre‑commit hook must run lint (and `--fix` where safe).
* Commits failing lint must be blocked.

#### [GUIDELINE] CI

* CI should run `npm run build` (includes lint & type checks).
* PRs should not merge if build or lint/type checks fail.

#### [STRICT] TypeScript Suppressions

* Use `@ts-expect-error` only when strictly necessary and with a comment.
* Avoid `@ts-ignore`.

#### [STRICT] No "as any" Type Assertions

* **Never** use `as any` type assertions in TypeScript code.
* If type issues arise, properly type the value or use more specific type assertions.
* Using `as any` bypasses TypeScript's type checking and violates the principle of explicit typing.
* Acceptable alternatives:
    * Use existing types from `emly-common` whenever dealing with API data
    * Reuse existing types already defined in the codebase (check `lib/types`, feature folders, or components)
    * Define proper types/interfaces in a centralized location if truly new
    * Use `Pick`, `Omit`, or other utility types to derive from existing types
    * Use `as unknown as SpecificType` if absolutely necessary for type narrowing
    * Fix the underlying type issue rather than suppressing it

### 9.3 Developer Workflow

#### [GUIDELINE] Editor & Scripts

* Recommended:

    * VS Code with ESLint + Tailwind IntelliSense.
    * `.editorconfig` for consistent whitespace.
* Core scripts:

    * `npm run dev`
    * `npm run prod`
    * `npm run build`
    * `npm run type-check`
    * `npm run lint`
    * `npm run lint:fix`
* Maintain `.env.example` with required env variables.

#### [GUIDELINE] Storybook & Docs

* Storybook (or similar) is recommended for:

    * Core UI components.
    * Visual review and documentation.
* Keep this architecture guide (or this file) in the repo and update when patterns change.

#### [STRICT] No Secrets or Large Files in Git

* Ensure `.gitignore` excludes `.env` and other secret/large artifacts.
* Never commit secrets or large binary assets that should reside elsewhere.

#### [GUIDELINE] Manual Verification

* Given no tests:

    * Manually verify key flows per PR.
    * Watch for console warnings/errors and fix them.
    * Ensure adherence to this guide during review.

---

## 10. Quick Reference for Agents

* **State**

    * [STRICT] All server‑derived data uses **React Query**.
    * [STRICT] Global UI/session state uses **Zustand**; local UI uses React state.
    * [STRICT] Do not copy React Query data into Zustand or Context.

* **Components & Structure**

    * [STRICT] Organize by feature under `app/`; use `_components`/`_hooks` for route internals.
    * [STRICT] Pages/layouts are **Server Components** by default; CCs only when needed.
    * [STRICT] Keep components small and focused; split large/complex ones.

* **Styling & UI**

    * [STRICT] Use Tailwind utilities with semantic tokens from Tailwind config.
    * [STRICT] Build & reuse core primitives in `components/ui`.
    * [STRICT] Implement theme and dark mode via tokens + `.dark` class only.

* **API & Data**

    * [STRICT] All backend calls use `lib/api` (with `fetch` under the hood).
    * [STRICT] After mutations, invalidate or update queries so UI stays fresh.
    * [STRICT] No secrets in client bundle; only `NEXT_PUBLIC_*` env vars in client components.

* **Performance & DX**

    * [STRICT] Don’t do heavy work in render/handlers; keep UI responsive.
    * [STRICT] Use Next Image/fonts; avoid unoptimized assets.
    * [STRICT] Enforce ESLint + strict TypeScript; fix all errors before merging.
    * [STRICT] No automated tests for now; rely on types, lint, and manual verification.

If in doubt, follow the **[STRICT]** rules above and prefer the patterns in this guide.

* **Testing After Changes **
 * [STRICT] follow the `$ci` (`/ci`) skill (or see `{.ai,.claude,.codex}/skills/ci/SKILL.md`) from the repo root
