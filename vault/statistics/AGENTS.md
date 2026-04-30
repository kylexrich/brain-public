> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `vault/statistics/AGENTS.md` _(this file)_ > `vault/AGENTS.md` > `AGENTS.md` _(root)_

---

# `/vault/statistics` Statistics

Specific, citable data points with source attribution. Quantitative claims with a specific source and date, not general knowledge or definitions.

## Frontmatter Rules & Guidelines

All common frontmatter from `vault/AGENTS.md`, plus:

| Field | Kind | Description |
|---|---|---|
| `status` | common | Default: `evergreen`. |
| `links` | common | Should include at least one source when a matching `sources/` file exists. |
| `domain` | new | The field this statistic relates to (e.g., `startups`, `healthcare`, `ai`, `economics`, `saas`). Free-text, lowercase. |
| `source_name` | new | Human-readable source attribution (e.g., `"CB Insights, 2023"`, `"McKinsey Global Survey, 2024"`). |
| `source_url` | new | Direct URL to the source when available. |
| `stat_date` | new | When the data was published or collected (`YYYY-MM-DD` or `YYYY`). Blank if unknown. |

## Content Rules & Guidelines

The data point stated clearly and precisely, with source and date.

- One statistic (or tightly related cluster from the same source) per file.
- **[STRICT]** Every statistic must be verified — exact numbers, correct source attribution, and accurate date. Research via actual web searches, not training data recall. If it can't be confirmed, don't create the file.
- For `ai_research` statistics, only use reputable, widely cited sources.

**Example body sections** — use when the statistic benefits from more context:

- `## Context` — Methodology, sample size, or caveats worth noting.
- `## Why It Matters` — Why this data point is worth keeping on file.

> Also note "### Linking Standard [STRICT]" in and other rules in `vault/AGENTS.md`.
