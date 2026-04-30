> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `vault/preferences/AGENTS.md` _(this file)_ > `vault/AGENTS.md` > `AGENTS.md` _(root)_

---

# `/vault/preferences` Preferences

Personal likes and dislikes — things Kyle wants to log for future reference. Wine, food, products, activities, places, tools, anything. No justification required, though context is welcome.

## Frontmatter Rules & Guidelines

All common frontmatter from `vault/AGENTS.md`, plus:

| Field | Kind | Description |
|---|---|---|
| `status` | common | Default: `seedling`. |
| `extraction_type` | common | **[STRICT]** When `creation_source: stream_extraction`, must be `direct`. Preferences must be explicitly expressed, not inferred. |
| `stance` | new | `like` or `dislike`. Required. |
| `category` | new | Freeform topic grouping (e.g., `wine`, `food`, `software`, `travel`, `music`). Optional but encouraged. |

## Content Rules & Guidelines

- One preference per file (keep it atomic).
- Brief is fine — even a single sentence. Add detail if Kyle provides it.
- If a preference changes (liked → disliked or vice versa), update `stance` and add a note about the change rather than deleting.
- No research required — these are subjective.
- Do not infer preferences from vibe, tone, or one-off convenience choices. For stream extraction, Kyle needs to say or strongly imply the preference directly.

> Also note "### Linking Standard [STRICT]" and other rules in `vault/AGENTS.md`.
