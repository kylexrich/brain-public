> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `app/src/services/email-templates/AGENTS.md` _(this file)_ > `app/AGENTS.md` > `AGENTS.md` _(root)_

---

# `app/src/services/email-templates/` EMLY Email Templates Guide for AI Contributors

---

# `app/src/services/email-templates/` Guidance & Rules (DO NOT EDIT. EDIT `app/src/services/email-templates/.ai/guidance/` ONLY)

The rules below are the binding rules for this directory and every subdirectory beneath it. All agents operating within this scope must follow them, subject to the instruction precedence defined at the top of this `AGENTS.md` (most specific file wins on conflict).

## Email Template Rules

### Per-Template Folder Layout

Every email template lives in its own kebab-case folder under this directory and contains exactly these files:

* `<template-name>/<template-name>.ts` - the `buildXxxTemplate(params)` builder that returns an `EmailTemplate`.
* `<template-name>/desktop.html` - a fully rendered example of the email with realistic inlined sample values.
* `<template-name>/mobile.html` - a phone-frame wrapper that embeds `desktop.html` in a 390-wide iframe so the template's own `@media (max-width: 480px)` rules activate.

Shared types such as `EmailTemplate` live in `email-template-types.ts` at this folder's root and are imported as `../email-template-types.js` from inside each template folder.

### Keep Example HTML in Sync With the Builder

* When changing a template's parameters, HTML structure, subject line, or inline styles, regenerate both `desktop.html` and `mobile.html` in the same change so the previews reflect what real recipients see.
* Example HTML must be a complete, self-contained document that opens directly in a browser: no unresolved `${...}` placeholders, no build step required.
* Sample values should be realistic (plausible names, E.164 phone numbers, formatted dates, real-looking URLs) but must not include real customer data or secrets.

### [STRICT] Links Must Resolve To Real, Validated Routes

Every link in a customer-facing email must point to a real, working URL. A recipient clicking any link must never hit a 404. This applies to `href`s inside templates, any path appended to `config.server.appBaseUrl`, and any email URL built outside this folder (for example reconnect or deep links assembled in services).

* **Validate the destination against the live app before adding or changing any link — never assume or guess a path.** For in-app links, confirm the path resolves to a real Next.js App Router route: a `/a/b` URL must map to a `client/app/**/a/b/page.tsx` (route-group folders named `(group)` are stripped from the URL; `[param]` segments match one path segment), or be covered by a redirect in `client/next.config.ts`. Confirm the destination actually renders what the copy promises (a billing link must land on the billing page, a reset link on the reset form, etc.).
* **Use the canonical in-app path, not a plausible-looking guess.** Real 404s have been shipped to customers from guessed paths: billing is `/dashboard/settings/billing` (not `/settings/billing`); the password-reset entry is `/auth?mode=forgot-password` (not `/forgot-password`); integrations management is `/dashboard/core-agent/integrations` (not `/dashboard/agent-studio/integrations`); demo/session booking is `/schedule-session` (not `/schedule`).
* Keep the `desktop.html` example link pointing at the same real route as the builder so previews can be visually verified.
* When a link's path changes, also add a redirect in `client/next.config.ts` from the old path to the new one, so links already delivered in past emails keep resolving.
