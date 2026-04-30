> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `vault/beliefs/AGENTS.md` _(this file)_ > `vault/AGENTS.md` > `AGENTS.md` _(root)_

---

# `/vault/beliefs` Beliefs

Personal convictions Kyle holds or embodies. Beliefs can be in tension with each other and can evolve over time.

## Frontmatter Rules & Guidelines

All common frontmatter from `vault/AGENTS.md`, plus:

| Field | Kind | Description |
|---|---|---|
| `status` | common | Default: `budding`. |
| `creation_source` | common | **[STRICT]** Must be `prompt` or `stream_extraction` (beliefs must come from Kyle's own words, not AI invention). |
| `extraction_type` | common | **[STRICT]** When `creation_source: stream_extraction`, must be `direct`. Synthesized beliefs are not allowed. |
| `belief_state` | new | `active` or `retired`. |
| `tensions_with` | new | Array of vault-root-relative paths to other **active belief** files in tension with this one. Only for belief↔belief tensions Kyle currently agrees with. |

## Content Rules & Guidelines

What you believe and why. Concise by default.

- One belief per file.
- Beliefs should be broad, durable, and widely applicable across contexts.
- A specific anecdote, quote, or implementation complaint can still justify a belief file if the actual belief is abstracted upward into a broader principle Kyle appears to endorse.
- The file should capture the generalized belief, not the literal low-level example that sparked it.
- Keep the concrete example, quote, or triggering incident in the body as supporting evidence, context, or an example of the belief in practice.
- Do not create beliefs for low-level implementation opinions, code review reactions, architecture decisions for a specific codebase, provider-specific integration details, or transient debugging conclusions.
- **[STRICT]** Do not create belief files from synthesized stream abstractions or cross-chunk summaries. If Kyle did not clearly endorse the generalized belief on stream, skip it or file it somewhere else.
- Do not delete old beliefs just because perspective changes entirely — retire them instead (minor adjustments without retiring are acceptable).
- When Kyle states a belief, see `vault/AGENTS.md` workflow instructions regarding research.
- Research should include at least one counterpoint. Counterpoints should be credible objections from similarly reputable sources.

**Example body sections** — use when the belief needs nuance, not by default:

- `## Example` — The specific incident, quote, or implementation case that revealed or reinforced the broader belief.
- `## Tensions With` — Explain nuance behind `tensions_with` links (why they conflict, how you resolve the tradeoff).
- `## Applies When` — Contexts where this belief should dominate.
- `## Fails When` — Contexts where this belief should not be applied.
- `## Counterpoints` — Credible objections or competing views Kyle currently does not adopt.

> Also note "### Linking Standard [STRICT]" in and other rules in `vault/AGENTS.md`.
