> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `vault/AGENTS.md` _(this file)_ > `AGENTS.md` _(root)_

---

# `/vault` — Knowledge Graph Content

A knowledge graph of linked markdown files. The value is in the links, not the files.

## Directory Structure

```
beliefs/          — Personal convictions Kyle holds or embodies
thoughts/         — Observations, reactions, reflections
experiences/      — Things that happened and what Kyle took from them
goals/            — Specific outcomes Kyle is working toward (time-bound or general)
quotes/           — Quotes worth keeping
sources/          — Books, podcasts, articles, conversations
ideas/            — Product, project, or business ideas
content-ideas/    — Ideas for future content: video topics, stream themes, blog posts, series concepts, discussion prompts
concepts/         — Established knowledge: rules, laws, biases, mental models, named principles, facts, definitions, frameworks
statistics/       — Specific, citable data points with source attribution
notes/            — Freeform notes
preferences/      — Personal likes and dislikes (wine, food, tools, places, anything)
linkedin-posts/   — LinkedIn drafts and published posts
writing-examples/ — Writing samples and drafts
```

## Rules

1. **[STRICT] Kebab-case filenames** — the file's core idea (e.g., `win-win-is-the-only-sustainable-deal.md`).
2. **[STRICT] Every content file must start with a `# H1` title** that accurately captures the document's content, immediately after the frontmatter.
3. **[GUIDELINE] No duplicates.** Search before creating. Update or link instead.

### Linking Standard [STRICT]
- **YAML `links`** — paths relative to vault root (e.g., `sources/books/getting-to-yes.md`). Clean metadata, not markdown.
- **Every frontmatter `links` entry must appear somewhere in the file body** as a markdown link relative to the file (e.g., `[Title](../sources/books/getting-to-yes.md)`).
- **Inline is preferred** when natural. If not natural, use a `## Related` section at the bottom with a short description per link (e.g., `- [File Title](../folder/file.md) — why this link matters.`).
- **Bidirectional.** If A links to B, B must link back to A.
- **YAML and in-body markdown links must stay in sync.**

## Workflows

### Typical Brain-Dump Workflow

#### 1. Listen and Classify

Kyle will brain-dump — could be one sentence, could be a rambling paragraph. Your job:
- Map what Kyle is saying to the appropriate folder(s) in the Directory Structure above.
- A single brain dump often produces multiple files (e.g., a belief + a source + two quotes).
- Read the relevant folder's `AGENTS.md` for type-specific rules.
- If unclear, default to `vault/thoughts/`.

#### 2. Research (when relevant)

**When Kyle mentions specific content**
Create files for what he mentioned. Research to fill in missing frontmatter (author, year, URL, etc.) and verify accuracy.

**When Kyle doesn't mention specific content**
Proactively find supporting material. Create corresponding quote and source files alongside the belief.

**[STRICT]**
* **Real Web Searches:** Research means **actual web searches** — verifying claims against reputable, published sources. Not recalling from training data. Not guessing.
* **Quality bar for `ai_research` files:** Only create quotes and sources from people and works that are widely respected and well-known. Established authors, proven founders, landmark books, foundational frameworks. If Kyle wouldn't respect the source, don't create the file.
* **Accuracy is non-negotiable.** Every quote must be correctly attributed with verified wording. Every source must be real and correctly described. If there's any doubt — do more research. If it can't be verified, say so and don't create the file.

#### 3. Check for Existing Files

Before creating anything, search `~/Developer/brain/vault/` for related files.

#### 4. Write the Files

Read the relevant folder's `AGENTS.md` for type-specific frontmatter and content rules.

#### 5. Cross-Link Everything

**This is the most important step.** The graph is the product. Follow the **Linking Standard** below. Scan the entire vault for related content — even files created weeks or months ago. Every brain operation is a linking opportunity.

## Frontmatter [STRICT]

Every content file has YAML frontmatter. This is the machine-readable index — keep it accurate.

### Common fields

| Field | Description |
|---|---|
| `type` | Content type (matches folder name). Defined in each folder's `AGENTS.md`. |
| `tags` | Array of tags from the Tag Registry below. |
| `created_at` | Date the file was created (`YYYY-MM-DD`). |
| `updated_at` | Date the file was last modified (`YYYY-MM-DD`). See `updated_at` below. |
| `last_reviewed_at` | Date Kyle last reviewed the content (`YYYY-MM-DD`). Blank by default. |
| `creation_source` | How this file came to exist. See `creation_source` below. |
| `status` | Evergreen maturity. See `status` below. |
| `links` | Array of paths relative to vault root (e.g., `sources/books/getting-to-yes.md`). See **Linking Standard** below. |
| `extraction_type` | Required for new `stream_extraction` writes. See `extraction_type` below. |

Each folder's `AGENTS.md` defines any additional type-specific fields.

#### `updated_at`

Any time a content file is modified — body, frontmatter, links, tags, anything — set `updated_at` to today's date (`YYYY-MM-DD`) before saving. No exceptions. This includes edits triggered by cross-linking (if you update file B to add a backlink, bump B's `updated_at` too).

#### `creation_source`

Indicates how a file came to exist. The key distinction: if Kyle mentioned the specific content (source, quote, concept, etc.) — even if the AI did additional research to verify, flesh out, or find links — that's `prompt`. Only use `ai_research` when the AI independently found and created the file without Kyle mentioning it.

| Source | Meaning |
|---|---|
| `prompt` | Kyle directly mentioned or asked for it. |
| `ai_research` | AI independently found and created this file as supporting material. |
| `stream_extraction` | Extracted from Kyle's stream transcript by the brain-extract pipeline. Kyle said it on stream; the AI structured and filed it. |
| `automation` | Created by an automated process (e.g., scanning messages). |

#### `extraction_type`

Only applies when `creation_source: stream_extraction`.

| Value | Meaning |
|---|---|
| `direct` | The file is grounded in something Kyle directly stated, endorsed, preferred, experienced, or explicitly referenced on stream. The AI may structure it, but it must not invent the core claim. |
| `synthesized` | The file is a transcript-grounded AI abstraction, normalization, or derived content angle rather than a discrete thing Kyle directly stated on stream. |

Rules:
- New `stream_extraction` writes should include `extraction_type` explicitly.
- Folder-specific `AGENTS.md` files decide whether `synthesized` is allowed.
- Historical `stream_extraction` files that predate this field should be treated as `direct` for backward compatibility.
- Do not auto-rewrite old files just to backfill this field.
- If a later source trim marks brain extraction stale, that stale signal lives in pipeline state. It does **not** authorize automatic rewrites of old vault files or transcript backlinks. Existing backlinks remain valid until an intentional rerun or manual cleanup updates them.

#### `status`

Evergreen maturity model:

| Status | Meaning |
|---|---|
| `seedling` | 🌱 Rough, just planted. Incomplete or unrefined. |
| `budding` | 🌿 Developing. Has substance but still growing. |
| `evergreen` | 🌲 Mature, well-developed, stable. Unlikely to change significantly. |

Each folder's `AGENTS.md` defines the default status for that type. Promote as content is refined, cross-linked, and reviewed.

#### `tags`

- Lowercase, hyphenated (e.g., `negotiation`, `product-strategy`).
- **Tags are immutable once used.** Renaming requires find-and-replace across every file.
- Tags describe *topics*, not content types (folder determines type).
- A file can have as many tags as relevant.
- New tags go alphabetically in the registry below.

- `ai-tooling`
- `business`
- `chess`
- `communication`
- `conflict-resolution`
- `culture`
- `decision-making`
- `design`
- `engineering`
- `finance`
- `health`
- `healthcare`
- `hiring`
- `leadership`
- `marketing`
- `negotiation`
- `open-source`
- `personal-growth`
- `product`
- `psychology`
- `sales`
- `self-knowledge`
- `startups`
- `teaching`
- `values`
