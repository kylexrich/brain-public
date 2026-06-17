---
title: "Frontend Server And Client Components"
description: "Server Component defaults, Client Component triggers, SC-to-CC boundaries, server-only concerns, providers, streaming, and hydration."
order: 10
---

Use this guidance when deciding whether a file should remain a Server Component, become a Client Component, or split responsibilities across both.

## [STRICT] Pages And Layouts Are Server Components By Default

Files in `client/app/` without `'use client'` are Server Components. Keep top-level `page.tsx` and `layout.tsx` files as Server Components unless they must run client-side.

Server Components fetch data, render structure, and provide SEO-relevant content. Client Components handle interactions, local state, React Query, Zustand, Framer Motion, and browser APIs.

## [STRICT] When To Use Client Components

Any component using React hooks such as `useState` or `useEffect`, browser APIs such as `window` or `localStorage`, React Query, Zustand, Framer Motion, or another client-only library must be a Client Component with `'use client'` at the top.

## [GUIDELINE] Split At Logical Boundaries

Server Component pages should fetch and render structure, then pass minimal props to Client Components for interactions. Prefer this SC-to-CC split over refetching the same data on the client when server-rendered data is already available.

## [GUIDELINE] Minimize Server-To-Client Props

Large payloads should be fetched with React Query in a Client Component when SEO is not critical. Small or medium data such as flags, configs, and moderate lists can be passed as props.

## [STRICT] No Interactive State In Server Components

Do not attach event handlers or interactive form state to Server Components. If a page is mostly interactive, a Client Component page can be acceptable, but evaluate a hybrid Server Component plus Client Component split first.

## [GUIDELINE] Server-Only Concerns

Use Server Components or route handlers for cookies, headers, secrets, environment variables, and secure backend calls. Do not replicate these concerns in client code.

## [STRICT] Providers With Client Hooks Must Be Client Components

Providers that use client hooks such as React Query, Zustand, or theme hooks must be Client Components. Server layouts can wrap children with these providers but must not use client hooks directly. Current provider patterns start in `client/app/(app)/providers.tsx`.

## [GUIDELINE] Streaming And Hydration

Keep Client Components small and focused so Server Components can stream most HTML quickly. Use skeletons/spinners for heavy Client Components when needed. For important data surfaces, follow `client/.ai/guidance/react-query-server-state.md` for hydration versus skeleton decisions.
