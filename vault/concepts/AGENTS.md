> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `vault/concepts/AGENTS.md` _(this file)_ > `vault/AGENTS.md` > `AGENTS.md` _(root)_

---

# `/vault/concepts` Concepts

Established knowledge Kyle is aware of or has learned about — not things he personally embodies or advocates. The knowledge library counterpart to `beliefs/`.

## Frontmatter Rules & Guidelines

All common frontmatter from `vault/AGENTS.md`, plus:

| Field | Kind | Description |
|---|---|---|
| `status` | common | Default: `budding`. |
| `extraction_type` | common | When `creation_source: stream_extraction`, may be `direct` or `synthesized`. `synthesized` is allowed only for transcript-grounded normalization of established knowledge Kyle explained or referenced. |
| `domain` | new | The field this concept comes from (e.g., `psychology`, `philosophy`, `behavioral-economics`, `neuroscience`, `logic`, `management`, `engineering`, `science`). Free-text, lowercase. |

## Content Rules & Guidelines

A clear definition or explanation of the concept. Concise by default.

- One concept per file.
- Include the name and a clear definition/explanation.
- Include the domain or field it comes from.
- Optionally, a practical example or why it's worth knowing.
- If a stream-extracted concept is `synthesized`, it must still map to a real, established concept Kyle was clearly invoking or explaining. Do not invent a brand-new framework or quietly convert a personal belief into a concept file.

**Example body sections** — use when the concept benefits from more detail:

- `## Example` — A concrete real-world example or scenario.
- `## Why It Matters` — Why this concept is worth knowing or how it shows up in practice.

> Also note "### Linking Standard [STRICT]" in and other rules in `vault/AGENTS.md`.
