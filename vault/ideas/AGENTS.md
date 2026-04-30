> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `vault/ideas/AGENTS.md` _(this file)_ > `vault/AGENTS.md` > `AGENTS.md` _(root)_

---

# `/vault/ideas` Ideas

Product, project, or business ideas.

## Frontmatter Rules & Guidelines

All common frontmatter from `vault/AGENTS.md`.

| Field | Kind | Description |
|---|---|---|
| `status` | common | Default: `seedling`. |
| `extraction_type` | common | When `creation_source: stream_extraction`, may be `direct` or `synthesized`, but `synthesized` ideas must still be obviously grounded in a problem, opportunity, or direction Kyle discussed on stream. |

## Content Rules & Guidelines

The idea. Can be a seed or a fully fleshed-out spec — flexible length.

- One idea per file.
- Do not use `synthesized` as permission to invent brand-new business or product directions Kyle never actually pointed toward. The stream still has to provide a clear grounding signal.

**Example body sections** — useful for fleshing out an idea, not required:

- `## The Problem` — What gap or frustration does this address?
- `## The Vision` — What is it? What does it do?
- `## How It's Different` — What exists today? What's the gap?
- `## How to Build It` — Architecture, stack, key technical decisions.
- `## Open Questions` — Unresolved decisions or unknowns.

> Also note "### Linking Standard [STRICT]" in and other rules in `vault/AGENTS.md`.
