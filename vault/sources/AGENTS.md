> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `vault/sources/AGENTS.md` _(this file)_ > `vault/AGENTS.md` > `AGENTS.md` _(root)_

---

# `/vault/sources` Sources

Books, podcasts, articles, conversations.

## Directory Structure

Sources are organized by `source_type` into subfolders:

```
articles/
books/
podcasts/
youtube/
```

Conversations remain in the root `sources/` folder (or get a subfolder when volume justifies it).

## Frontmatter Rules & Guidelines

All common frontmatter from `vault/AGENTS.md`, plus:

| Field | Kind | Description |
|---|---|---|
| `status` | common | Default: `evergreen`. |
| `extraction_type` | common | **[STRICT]** When `creation_source: stream_extraction`, must be `direct`. Stream extraction can capture sources Kyle explicitly mentioned; synthesized source files belong under `ai_research`, not here. |
| `title` | new | Source title (matches the `# H1` heading). |
| `source_type` | new | One of: `book`, `podcast`, `article`, `conversation`, `youtube`. |
| `author` | new | Primary voice. Book/article → author, podcast → guest (or host if no guest), conversation → who Kyle spoke with. |
| `year` | new | Year published or recorded. |
| `consumed_at` | new | (Optional) Date Kyle consumed/read/listened to the source (`YYYY-MM-DD`). |
| `url` | new | (Optional) External link to the source. |

## Content Rules & Guidelines

The key ideas relevant to Kyle's thinking. Concise by default (focused summary bullets), but can be longer when needed for important context.

- One source per file.
- **[STRICT]** Every source must be real and correctly described — title, author, year, and claims must be verified. If sourced by AI, research via actual web searches, not training data recall. If it can't be verified, don't create the file.
- For `ai_research` sources, only use people and works that are widely respected and well-known. Established authors, proven founders, landmark books, foundational frameworks.
- Stream-extracted source files should only exist when Kyle clearly referenced the source on stream. Do not create a source file just because a synthesized candidate would benefit from one.

> Also note "### Linking Standard [STRICT]" in and other rules in `vault/AGENTS.md`.
