# Extraction Type: Preferences

## What Qualifies

Personal likes and dislikes — wine, food, products, activities, places, tools, anything. No justification required, though context is
welcome.

## Extraction Constraints

| Field             | Allowed            |
|-------------------|--------------------|
| `extraction_type` | `direct` only      |
| `confidence`      | `high` or `medium` |

Preferences must be explicitly expressed, not inferred from tone or one-off choices.

## Quality Criteria

- Kyle must say or strongly imply the preference directly
- Brief is fine — even a single sentence
- One preference per candidate

## What to Reject

- Inferences from vibe, tone, or one-off choices
- Preferences that are actually implementation opinions (those might be beliefs)
- Duplicates of existing preferences

## Destination

- Folder: `vault/preferences/`
- Frontmatter: `status: seedling`, `creation_source: stream_extraction`, `extraction_type: direct`, `stance: like | dislike`
- Optional: `category` (freeform grouping like `wine`, `food`, `software`)
