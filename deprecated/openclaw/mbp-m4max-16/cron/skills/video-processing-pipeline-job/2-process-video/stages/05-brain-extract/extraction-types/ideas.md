# Extraction Type: Ideas

## What Qualifies

Product, project, or business ideas. Things Kyle could build, launch, or explore as ventures.

Not content ideas — those go in `content-ideas`.

## Extraction Constraints

| Field             | Allowed                   |
|-------------------|---------------------------|
| `extraction_type` | `direct` or `synthesized` |
| `confidence`      | `high` or `medium`        |

Synthesized ideas must be obviously grounded in a problem, opportunity, or direction Kyle discussed on stream.

## Quality Criteria

- Must have a clear grounding signal from the stream
- One idea per candidate

## What to Reject

- Content creation ideas (use `content-ideas` type instead)
- Brand-new business directions Kyle never discussed
- Ideas where the stream provides no grounding signal

## Destination

- Folder: `vault/ideas/`
- Frontmatter: `status: seedling`, `creation_source: stream_extraction`, `extraction_type: direct | synthesized`
