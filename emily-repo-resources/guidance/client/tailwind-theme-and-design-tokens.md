---
title: "Frontend Tailwind And Theme"
description: "Tailwind v4 tokens, semantic colors, dark mode, spacing rules, utility usage, CSS boundaries, core UI, theme source of truth, accessibility, and theming limits."
order: 11
---

Use this guidance when changing Tailwind classes, design tokens, dark mode, CSS boundaries, UI primitive styling, or theme behavior.

## [STRICT] Tokens In Tailwind V4 Theme

All design tokens for colors, spacing, typography, radii, and shared structure must be defined in `client/styles/globals.css` via Tailwind v4 `@theme` or an explicit token system. Use semantic names such as `primary`, `primary-hover`, `surface`, `background`, `success`, `danger`, `text-title`, and `text-body`.

Do not use ad-hoc hex codes or magic numbers in components; add or reuse tokens instead.

## [STRICT] Tailwind Setup

Tailwind setup must stay centralized. Current Tailwind v4 theme tokens live in `client/styles/globals.css` via `@theme`, with project PostCSS wiring in `client/postcss.config.mjs`. Legacy guidance that the Tailwind config lives at the project root is stale for the current v4 setup; if a Tailwind config is intentionally reintroduced, it belongs at the client project root as `client/tailwind.config.*`, not inside route, component, or feature folders.

## [GUIDELINE] Semantic Colors

Use semantic utilities such as `bg-primary`, `text-danger`, `surface`, and `background` instead of raw palette names such as `bg-blue-500` where possible. Map tokens to CSS variables so themes can change without touching component code.

## [GUIDELINE] Dark Mode Via Class And CSS Variables

Use a class-based dark mode strategy, equivalent to `darkMode: 'class'` when a Tailwind config is present. Define CSS variables at `:root` and override them in `.dark`. Use Tailwind classes that reference these variables, such as `bg-app` and `text-app`, so theme changes stay token-driven.

## [STRICT] Avoid Arbitrary Values For Layout

**[MANDATE] Strict "On-Grid" Spacing**: Always prefer standard Tailwind spacing and sizing for grid-based layout, such as `p-4`, `m-2`, and `w-64`. Use approximate values from designs if they are close to the scale; if a design is 19px, use `p-5` (20px) or `p-4` (16px). Do not use arbitrary values for grid-based layout.

Arbitrary values (`[...]`) are permitted only for pixel-perfect one-off adjustments, such as `top-[1px]` to align an icon or `z-[100]` for a specific stacking context.

Create named tokens in `client/styles/globals.css` via `@theme` only for shared structural values, such as `--sidebar-width` or `--header-height`, or reusable design system elements such as a specific brand border radius when the standard scale is insufficient.

Summary: stick to the grid first. Use arbitrary values for unique tweaks. Use named tokens for shared structure.

## [STRICT] Prefer Tailwind Utilities In JSX

Style components primarily with Tailwind utilities in `className`. Custom CSS files or modules are rare exceptions when Tailwind cannot express the pattern cleanly.

## [GUIDELINE] Encapsulate Reused Patterns

For repeated class combinations, prefer a reusable React component such as `<Button variant="primary" />` or another variant-driven primitive. Secondarily use a utility class through `@apply` inside the UI library.

## [GUIDELINE] Avoid Utility Soup

Keep long class lists readable by grouping layout, spacing, typography, color, and state classes. Use existing helpers such as `clsx`, `cn`, and `tailwind-merge` patterns from `client/lib/utils/` for conditional classes. Split complex elements into smaller components.

## [STRICT] Use Tailwind Variants Instead Of Custom CSS Or JS

Use responsive variants such as `sm:`, `md:`, and `lg:`, and state variants such as `hover:`, `focus:`, and `disabled:`. Do not write custom media queries or JS styling when Tailwind can express the behavior.

## [GUIDELINE] Tailwind Plugins And Documentation

Use only needed official plugins. Document common class patterns for core elements through the relevant UI primitive or design guidance rather than scattered component comments.

## [STRICT] Core UI In `client/components/ui/`

Core primitive placement and API rules live in `client/.ai/guidance/ui-primitives-and-radix.md`. This file owns the Tailwind token rules those primitives consume.

## [STRICT] Single Theme With Dark Mode

Implement one theme with light/dark modes using CSS variables. Toggle dark mode by adding or removing `.dark` on `<html>` or `<body>`. Do not maintain duplicate dark-mode class sets; rely on tokens and variables.

## [STRICT] Semantic Color And Surface Tokens

Use paired semantic tokens such as `primary`, `on-primary`, `surface`, `on-surface`, `background`, `error`, `warning`, and `success`. Pair foreground and background tokens correctly, such as `bg-primary` with `text-on-primary`.

## [GUIDELINE] Future Multi-Brand Support

Keep tokens generic rather than brand-named. Plan for scoped themes such as `[data-theme="..."]` only when needed; do not implement multi-brand theming prematurely.

## [GUIDELINE] CSS Variables For Theming And Motion

Use CSS variables for colors and, where helpful, shared spacing modes, radii, blur values, and motion durations.

## [STRICT] Theme Source Of Truth

Store theme mode in one place, such as `useUIStore((s) => s.themeMode)` or ThemeContext. A top-level client provider reads theme mode and toggles root theme classes/attributes. Components should not branch on theme mode in business logic; they rely on CSS.

## [GUIDELINE] Accessibility And Contrast

Ensure tokens meet acceptable contrast for text/background pairs, primary actions, and status colors.

## [GUIDELINE] Keep Theme Out Of Business Logic

Theme affects visuals only. It must not affect data flow, permissions, or feature access.

## [STRICT] No Inline Styles For Theming

Do not set theme-related styles through inline `style={{ ... }}` props or direct JS DOM mutations. JS behavior should be limited to toggling theme classes or attributes.
