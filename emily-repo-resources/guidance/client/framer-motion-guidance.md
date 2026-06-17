---
title: "Frontend Motion"
description: "Framer Motion variant centralization, orchestration, helpful animation, safe properties, reduced motion, Client Component boundaries, and transition conflict rules."
order: 3
---

Use this guidance when adding or changing Framer Motion variants, animated components, transition behavior, or motion accessibility.

## [STRICT] Central Variant Definitions

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

## [GUIDELINE] Orchestration And Wrappers

Use parent/child variants with `staggerChildren` for list animations when appropriate. Lightweight wrappers such as `<FadeIn>` and `<SlideUp>` are acceptable when they reuse shared variants and keep repeated markup clear.

## [GUIDELINE] Central Motion Config

Keep shared durations and easing curves in the central motion module so motion remains consistent. Use named duration constants such as `ANIM_FAST` and `ANIM_MED` instead of scattering raw timing values through components.

## [STRICT] Only Animate Where Helpful

Use animation to clarify state changes, smooth appearance/disappearance, or direct attention. Avoid purely decorative or slow animations.

## [GUIDELINE] Subtle, Fast Animations

Typical durations should be about 150 to 400 milliseconds. Keep interactions responsive.

## [GUIDELINE] Layout Animations And AnimatePresence

Use Framer Motion layout animations for size/position transitions when performance is acceptable. Use `<AnimatePresence>` with exit variants when conditionally rendering overlays such as modals, dropdowns, and toasts.

## [STRICT] Performance-Safe Properties

Animate only `opacity` and `transform` properties such as `x`, `y`, `scale`, and `rotate` by default. Avoid animating expensive layout properties unless tested.

## [GUIDELINE] Consistent Easing And Accessibility

Use a small set of shared easing functions. Respect `prefers-reduced-motion`; use Tailwind `motion-safe:` and `motion-reduce:` where appropriate, or Framer Motion reduced-motion handling.

## [STRICT] Motion Components Are Client Components

Any component that uses Framer Motion must include `'use client'`. Keep motion-heavy components as leaf nodes and avoid turning large trees into Client Components only for animation.

## [STRICT] Avoid CSS Transition Conflicts

Framer Motion relies on a JS animation loop; generic CSS transitions (especially `transition: all`) fight for control of the same properties, causing jank/flickering.

Never use `transition-all` on `motion.*` components. Framer Motion controls geometry such as `x`, `y`, `scale`, `rotate`, and `layout`; do not also control those properties through CSS hover scale or transition-transform classes.

Geometry (`x`, `y`, `scale`, `rotate`, `layout`) must be handled by Framer Motion props such as `animate` and `whileHover`; do not use CSS `hover:scale-*` or `transition-transform` on the same element.

Paint changes such as `color`, `shadow`, and `border` can use specific CSS transitions like `transition-colors duration-200` when they do not overlap with Motion-controlled properties.
