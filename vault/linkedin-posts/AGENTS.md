> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `vault/linkedin-posts/AGENTS.md` _(this file)_ > `vault/AGENTS.md` > `AGENTS.md` _(root)_

---

# `/vault/linkedin-posts` LinkedIn Posts

LinkedIn drafts and published posts.

## Frontmatter Rules & Guidelines

All common frontmatter from `vault/AGENTS.md`, plus:

| Field | Kind | Description |
|---|---|---|
| `status` | common | Default: `seedling`. |
| `publish_status` | new | `draft` (working), `ready` (publish-ready), or `published` (posted live — must include `published_at`). |
| `published_at` | new | Date published (`YYYY-MM-DD`). Required when `publish_status: published`. |
| `linkedin_url` | new | URL to the live post. Add when available. |

## Content Rules & Guidelines

A LinkedIn post grounded in Kyle's Brain. Short, scannable paragraphs.

- Ground every draft in Kyle's Brain before writing. Read relevant files from `beliefs/`, `thoughts/`, `experiences/`, and `ideas/`. Read existing posts with `publish_status: published` to match tone, style, and structure.
- If Kyle gives a half-baked idea, preserve the core intent and strengthen: hook, narrative flow, takeaway, CTA (if useful).
- If Kyle gives no idea (e.g., "write me a LinkedIn post"), generate 2-3 angles from Brain files, then draft one complete post.
- Match Kyle's style: practical, opinionated, high-signal, operator/builder energy. Prefer concrete lessons and real examples over abstractions. Avoid generic corporate tone.

**Review checklist:**

- Is the opening line strong enough to stop scroll?
- Is there one clear core message?
- Does it align with Kyle's beliefs?
- Is there fluff that should be deleted?
- Are relevant Brain links included?

**Example body sections** — useful for structuring a post, not required:

- `## Core Claim` — One sentence: what this post is trying to say.
- `## Draft` — The post body.
- `## Notes` — Audience, alternate hooks, CTA options.

> Also note "### Linking Standard [STRICT]" in and other rules in `vault/AGENTS.md`.
