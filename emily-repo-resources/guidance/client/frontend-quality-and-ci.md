---
title: "Frontend Quality And CI"
description: "no-test policy, ESLint and TypeScript rules, suppressions, no as any, workflow scripts, docs upkeep, secrets, manual verification, and root CI."
order: 4
---

Use this guidance for client validation, no-test policy, TypeScript/ESLint expectations, suppressions, secrets, and manual verification.

## [STRICT] No Automated Tests

Do not add or keep automated tests of any kind under `client/`: unit, integration, end-to-end, component, snapshot, browser, or contract tests. Do not add test runners, test configs, test scripts, fixtures, mocks, or scaffolding. Remove test files or scaffolding added by templates.

## [STRICT] ESLint And Strict TypeScript

Use ESLint with React, hooks, Next.js, and relevant query/Tailwind rules. TypeScript must run in strict mode with `strict: true`, `noImplicitAny`, `noUnusedLocals`, and the package's other configured checks. There must be zero TypeScript or ESLint errors.

## [STRICT] Pre-Commit Hooks

Pre-commit hooks must run lint and safe fixes where configured. Commits failing lint must be blocked.

## [GUIDELINE] CI

PRs should not merge if build or lint/type checks fail. The client `build` script only runs Payload import-map generation and `next build`; it does not run `lint` or `type-check`. Before declaring client work complete, follow the `$ci` (`/ci`) skill (or see `{.ai,.claude,.codex}/skills/ci/SKILL.md`) from the repo root, or run the relevant separate scripts when a narrower validation is explicitly requested.

## [STRICT] TypeScript Suppressions

Use `@ts-expect-error` only when strictly necessary and with a comment explaining the reason. Avoid `@ts-ignore`.

## [STRICT] No `as any` Type Assertions

Never use `as any` in TypeScript code. Properly type the value, use existing types from `emly-common` for API data, reuse types already defined in the codebase, define a proper centralized type if truly new, derive with `Pick`/`Omit` or other utility types, or use `as unknown as SpecificType` only when absolutely necessary for narrowing. Prefer fixing the underlying type issue.

## [GUIDELINE] Editor And Scripts

Use VS Code with ESLint + Tailwind IntelliSense when available. Keep `client/.editorconfig` for consistent whitespace. Core client scripts are `npm run dev --prefix client`, `npm run prod --prefix client`, `npm run build --prefix client`, `npm run type-check --prefix client`, `npm run lint --prefix client`, and `npm run lint:fix --prefix client`. Maintain `client/.env.example` when adding required env variables.

## [GUIDELINE] Storybook And Docs

Storybook or similar tooling can be useful for core UI components, visual review, and documentation, but do not add test scaffolding as part of it. Keep frontend AI guidance under `client/.ai/guidance/` updated when patterns change.

## [STRICT] No Secrets Or Large Files In Git

Ensure `.gitignore` excludes `.env` and other secret or large artifacts. Never commit secrets or large binary assets that should reside elsewhere.

## [GUIDELINE] Manual Verification

Given the no-test policy, manually verify key flows per change, watch for console warnings/errors, and check adherence to `client/AGENTS.md` plus the relevant `client/.ai/guidance/` rules during review.

## Guidance Index

- State, React Query, Zustand, Server/Client Components, and caching: `client/.ai/guidance/`
- Structure and component composition: `client/.ai/guidance/frontend-structure-and-component-composition.md`
- Tailwind, theme tokens, primitives, and motion: `client/.ai/guidance/`
- API helpers, secrets, and logging: `client/.ai/guidance/api-integration.md`
- Performance: `client/.ai/guidance/frontend-rendering-and-runtime-performance.md`
