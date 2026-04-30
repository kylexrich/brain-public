> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `vault/content-ideas/AGENTS.md` _(this file)_ > `vault/AGENTS.md` > `AGENTS.md` _(root)_

---

# `/vault/content-ideas` Content Ideas

Ideas for future content: video topics, stream themes, blog posts, series concepts, discussion prompts. These are things Kyle wants to create, explore, or cover — not product/business ideas (those go in `ideas/`).

## Directory Structure

Content ideas are organized by `format` into subfolders:

```
youtube-videos/
linkedin-posts/
series/
```

Ideas with `format: unspecified` or no format remain in the root `content-ideas/` folder until classified.

## Frontmatter Rules & Guidelines

All common frontmatter from `vault/AGENTS.md`, plus:

| Field | Kind | Description |
|---|---|---|
| `type` | common | Always `content-idea`. |
| `status` | common | Default: `seedling`. |
| `extraction_type` | common | When `creation_source: stream_extraction`, may be `direct` or `synthesized`. `synthesized` is expected for many transcript-mined content angles, but it still must be grounded in the stream. |
| `format` | new | The intended content format: `youtube-video`, `series`, `linkedin-post`, or `unspecified`. Default: `unspecified`. |
| `priority` | new | Optional. `high`, `medium`, `low`. Omit if unknown. |

## Content Rules & Guidelines

The content idea. Can be a one-liner seed or a fleshed-out outline — flexible length.

- One content idea per file.
- **[STRICT]** Place the file in the subfolder matching its `format`: `youtube-videos/` for `youtube-video`, `linkedin-posts/` for `linkedin-post`, `series/` for `series`. Unclassified ideas stay in the root.
- Focus on *what* to create and *why* it would be interesting, not on production logistics.
- Stream-extracted `synthesized` content ideas are allowed when they are clearly anchored in a teachable moment, narrative arc, recurring pain point, or strong opinion from the transcript. Do not create random speculative ideas that are only loosely inspired by the stream.

**Example body sections** — useful for fleshing out an idea, not required:

- `## Hook` — What grabs attention? The opening angle or question.
- `## Key Points` — What to cover or discuss.
- `## Target Audience` — Who would care about this?
- `## Related Content` — Similar videos/posts that exist (for differentiation or inspiration).
- `## Open Questions` — Unresolved decisions or unknowns.

> Also note "### Linking Standard [STRICT]" and other rules in `vault/AGENTS.md`.
