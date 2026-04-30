> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `vault/goals/AGENTS.md` _(this file)_ > `vault/AGENTS.md` > `AGENTS.md` _(root)_

---

# `/vault/goals` Goals

Specific outcomes Kyle is working toward. Goals can be time-bound (with a deadline) or general (ongoing, no fixed end date). They are not beliefs, ideas, or open-ended aspirations.

## Frontmatter Rules & Guidelines

All common frontmatter from `vault/AGENTS.md`, plus:

| Field             | Kind | Description                                                                                                                        |
|-------------------|---|------------------------------------------------------------------------------------------------------------------------------------|
| `status`          | common | Default: `budding`.                                                                                                                |
| `creation_source` | common | **[STRICT]** Must be `prompt` (goals are Kyle-authored, not auto-generated).                                                       |
| `goal_status`     | new | `active`, `achieved`, `archived`, or `abandoned`.                                                                                  |
| `goal_type`       | new | `time-bound` or `high-level`. Whether this goal has a defined deadline or timeframe.                                               |
| `target_date`     | new | Target completion date (`YYYY-MM-DD`) or timeframe (e.g., `2026-Q2`). Only required when `time_bound`.                       |
| `domain`          | new | Area of life this goal relates to (e.g., `health`, `business`, `finance`, `personal-growth`, `engineering`). Free-text, lowercase. |

## Content Rules & Guidelines

What you want to achieve and why. Concise by default.

- One goal per file.
- Do not delete achieved or abandoned goals — update `goal_status` instead. They are part of the record.
- Time-bound goals should be specific enough to know when they are done.
- High-level goals represent ongoing standards or directions — they don't need a finish line.

**Example body sections** — use when the goal needs nuance, not by default:

- `## Why` — Motivation or reasoning behind the goal.
- `## Key Results` — Measurable milestones or sub-targets.
- `## Progress` — Running log of notable progress (date-stamped entries).
- `## Tensions With` — Other goals or beliefs this competes with for time/energy.

> Also note "### Linking Standard [STRICT]" in and other rules in `vault/AGENTS.md`.
