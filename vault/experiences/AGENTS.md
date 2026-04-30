> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `vault/experiences/AGENTS.md` _(this file)_ > `vault/AGENTS.md` > `AGENTS.md` _(root)_

---

# `/vault/experiences` Experiences

Things that happened and what Kyle took from them.

## Frontmatter Rules & Guidelines

All common frontmatter from `vault/AGENTS.md`.

| Field | Kind | Description |
|---|---|---|
| `status` | common | Default: `budding`. |
| `extraction_type` | common | **[STRICT]** When `creation_source: stream_extraction`, must be `direct`. Do not synthesize composite experiences. |

## Content Rules & Guidelines

What happened and what you took from it. No required sections — write in whatever structure fits.

- One event per file.
- **[STRICT]** Stream-extracted experiences must describe a concrete event or situation Kyle explicitly narrated or clearly lived through on stream. Do not create mash-up or inferred experiences by blending multiple moments into a new story.

> Also note "### Linking Standard [STRICT]" in and other rules in `vault/AGENTS.md`.
