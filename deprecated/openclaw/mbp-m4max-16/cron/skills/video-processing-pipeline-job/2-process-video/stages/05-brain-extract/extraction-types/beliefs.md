# Extraction Type: Beliefs

## What Qualifies

Personal convictions Kyle holds or embodies. Broad, durable, widely applicable principles — not low-level implementation opinions or
transient conclusions.

## Extraction Constraints

| Field             | Allowed       |
|-------------------|---------------|
| `extraction_type` | `direct` only |
| `confidence`      | `high` only   |

Beliefs must come from Kyle's own words. Synthesized beliefs are not allowed.

## Quality Criteria

- Must capture a generalized principle, not a literal low-level example
- Must be something Kyle explicitly stated or clearly demonstrated conviction about
- One belief per candidate

## What to Reject

- Implementation opinions or code review reactions
- Architecture decisions or provider-specific details
- Transient debugging conclusions
- Cross-chunk summaries or synthesized abstractions

## Destination

- Folder: `vault/beliefs/`
- Frontmatter: `status: budding`, `creation_source: stream_extraction`, `extraction_type: direct`, `belief_state: active`
