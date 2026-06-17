---
title: "Frontend Performance"
description: "render and interaction cost, memoization, Zustand selector performance, images, fonts, code splitting, large lists, monitoring, and main-thread limits."
order: 5
---

Use this guidance when work may affect render cost, bundle size, image/font behavior, large lists, or main-thread responsiveness.

## [STRICT] Keep Heavy Work Out Of Render And Interactions

Do not do expensive work directly in render or high-frequency handlers. Use memoization, move computation to the server, or offload to a Web Worker when needed.

## [GUIDELINE] Memoization And Referential Stability

Use `React.memo` for heavy child components with stable props. Use `useCallback` and `useMemo` to keep props stable when children are memoized. For Context values, wrap derived objects in `useMemo`.

## [GUIDELINE] Zustand Selectors And Batching

Always select the minimal necessary state from Zustand. Prefer single store updates that update multiple related fields over multiple separate updates.

Selector details live in `client/.ai/guidance/zustand-client-state-stores.md`.

## [STRICT] Image And Font Optimization

Use Next `<Image>` instead of raw `<img>` tags when feasible. Use `next/font` (or equivalent) for custom fonts. Use the project's current font-loading strategy rather than ad-hoc remote font loading.

## [GUIDELINE] Code Splitting

Dynamically import heavy, rarely used components such as rich editors, charts, and admin tools. Avoid importing heavy libraries into shared layouts or providers.

## [GUIDELINE] Large Data Sets

For very large lists, start with pagination or infinite scroll. Add virtualization, for example `react-window`, when required by real rendering cost. Watch DOM size and re-render frequency.

## [GUIDELINE] Monitoring And Leaks

Use profiling tools such as React DevTools or bundle analyzers for suspected performance issues. Always clean up intervals, timeouts, and subscriptions.

## [STRICT] No Heavy Work On Main Thread During Interactions

Offload CPU-intensive tasks away from the main UI thread through Web Workers or backend work.
