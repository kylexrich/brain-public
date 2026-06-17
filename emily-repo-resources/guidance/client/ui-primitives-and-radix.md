---
title: "Frontend UI Primitives And Radix"
description: "Radix and shadcn/ui-style copy-in rules, source verification, token adaptation, Client Component boundaries, and UI framework restrictions."
order: 12
---

Use this guidance before building or copying shared interactive UI primitives, especially components based on Radix or shadcn/ui-style source code.

## [STRICT] Radix UI Primitives

For complex interactive patterns such as `Modal`, `Popover`, `Select`, `Dropdown`, `Accordion`, `Tooltips`, and `Tabs`, you **must** use Radix UI primitives. Do not build these interaction patterns from scratch.

## [STRICT] Shadcn/Radix Copy-Ins

You may copy shadcn/ui-style components built from Tailwind and Radix into the repo. Once copied, they become first-party code and must follow local tokens, file structure, naming, comment policy, lint rules, and TypeScript rules.

## [STRICT] Source Verification

Agents are authorized to browse `shadcn/ui` documentation, raw component code, and Radix documentation as starting points via available web/docs tools such as `web.run`. Pull reference implementations from authoritative docs and adapt them to this stack. Do not import shadcn project conventions wholesale or treat shadcn as a runtime dependency.

## [STRICT] Local Adaptation

After copy-in, refactor to match local design tokens and patterns. Avoid bringing extra styling, routing, or state stacks. Use only the minimal Radix packages needed.

## [STRICT] Placement And Imports

Global primitives live in `client/components/ui/`. Feature-only variants belong in the route's `_components/` folder, for example `client/app/<feature>/_components/*`. `client/components/ui/` must not import from `client/app/` or any `client/app/*` route implementation.

## [STRICT] Primitive Styling Contract

Shared primitives must use semantic Tailwind tokens and expose `variant` and `size` props where applicable instead of pushing styling onto consumers. Token details live in `client/.ai/guidance/tailwind-theme-and-design-tokens.md`.

## [STRICT] Client Component Boundaries

Any copied-in component that uses Radix, hooks, event handlers, or Framer Motion must be a Client Component. Keep these primitives leaf-level; do not convert pages or layouts into Client Components just to host them. Server/Client Component boundary details live in `client/.ai/guidance/server-and-client-component-boundaries.md`.

## [STRICT] No Competing UI Frameworks Or Theme Systems

Do not introduce new UI frameworks or theme systems such as MUI, Ant Design, or Chakra.
