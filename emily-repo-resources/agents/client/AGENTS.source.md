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

## Guidance Map (DO NOT EDIT)

The documents linked below are the binding rules for this directory and every subdirectory beneath it. All agents operating within this scope must follow them, subject to the instruction precedence defined at the top of this `AGENTS.md` (most specific file wins on conflict).

- `client/.ai/guidance/api-integration.md`: shared API helper, no direct component fetches, emly-common API types, route handlers, server actions, direct/proxy calls, webhook polling, secrets, backend reality checks, and logging.
- `client/.ai/guidance/architecture-principles.md`: feature-first modularity, server-first rendering, state responsibility, naming, comments, dependency discipline, dead-code removal, and API/library verification.
- `client/.ai/guidance/framer-motion-guidance.md`: Framer Motion variant centralization, orchestration, helpful animation, safe properties, reduced motion, Client Component boundaries, and transition conflict rules.
- `client/.ai/guidance/frontend-quality-and-ci.md`: no-test policy, ESLint and TypeScript rules, suppressions, no as any, workflow scripts, docs upkeep, secrets, manual verification, and root CI.
- `client/.ai/guidance/frontend-rendering-and-runtime-performance.md`: render and interaction cost, memoization, Zustand selector performance, images, fonts, code splitting, large lists, monitoring, and main-thread limits.
- `client/.ai/guidance/frontend-state-boundaries.md`: local UI state, server state, app-wide client state, Context use, state-location heuristics, and date/time formatting.
- `client/.ai/guidance/frontend-structure-and-component-composition.md`: route structure, colocated feature files, shared components, client/lib boundaries, barrel files, component size, props/context/global-state composition, and container/presentational splits.
- `client/.ai/guidance/react-query-caching-and-invalidation.md`: React Query cache defaults, live versus archival data, mutation invalidation, large lists, optimistic updates, logout cleanup, N+1 prevention, and single caching system.
- `client/.ai/guidance/react-query-server-state.md`: QueryClient placement, query keys, API helper usage, query organization, options, polling, SSR hydration decisions, query-hook UI states, mutations, and query footprint.
- `client/.ai/guidance/server-and-client-component-boundaries.md`: Server Component defaults, Client Component triggers, SC-to-CC boundaries, server-only concerns, providers, streaming, and hydration.
- `client/.ai/guidance/tailwind-theme-and-design-tokens.md`: Tailwind v4 tokens, semantic colors, dark mode, spacing rules, utility usage, CSS boundaries, core UI, theme source of truth, accessibility, and theming limits.
- `client/.ai/guidance/ui-primitives-and-radix.md`: Radix and shadcn/ui-style copy-in rules, source verification, token adaptation, Client Component boundaries, and UI framework restrictions.
- `client/.ai/guidance/zustand-client-state-stores.md`: store/slice defaults, selectors, actions, shallow and narrow selection, action-only mutation, persistence, and reset boundaries.
