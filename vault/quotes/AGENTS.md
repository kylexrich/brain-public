> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `vault/quotes/AGENTS.md` _(this file)_ > `vault/AGENTS.md` > `AGENTS.md` _(root)_

---

# `/vault/quotes` Quotes

Quotes worth keeping.

## Frontmatter Rules & Guidelines

All common frontmatter from `vault/AGENTS.md`.

| Field | Kind | Description |
|---|---|---|
| `status` | common | Default: `evergreen`. |
| `links` | common | **[STRICT]** Must always include at least one source. |

## Content Rules & Guidelines

The quote and why it resonates. Concise by default.

- One quote per file.
- **[STRICT]** If sourced by AI (not given directly by Kyle), the quote must be verified — exact wording, correct attribution, from a reputable source. If it can't be confirmed, don't create the file.

> Also note "### Linking Standard [STRICT]" in and other rules in `vault/AGENTS.md`.
