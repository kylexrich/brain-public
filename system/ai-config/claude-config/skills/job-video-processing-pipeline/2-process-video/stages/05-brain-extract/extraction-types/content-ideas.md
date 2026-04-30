# Extraction Type: Content Ideas

## What Qualifies

Ideas for future content: video topics, stream themes, blog posts, series concepts, discussion prompts. Things Kyle wants to create,
explore, or cover.

Not product/business ideas — those go in `ideas`.

## Extraction Constraints

| Field             | Allowed                   |
|-------------------|---------------------------|
| `extraction_type` | `direct` or `synthesized` |
| `confidence`      | `high` or `medium`        |

Synthesized is expected for transcript-mined angles but must be grounded in a teachable moment, narrative arc, recurring pain point, or
strong opinion from the stream.

## Quality Criteria

- Focus on what to create and why it's interesting
- Must be anchored in something concrete from the stream
- One content idea per candidate

## What to Reject

- Production logistics or scheduling details
- Product/business ideas (use `ideas` type instead)
- Generic topic suggestions not grounded in stream content

## Destination

- Folder: `vault/content-ideas/` (subfolder by format)
    - `youtube-videos/` for `format: youtube-video`
    - `linkedin-posts/` for `format: linkedin-post`
    - `series/` for `format: series`
    - Root for `format: unspecified`
- Frontmatter: `type: content-idea`, `status: seedling`, `creation_source: stream_extraction`, `extraction_type: direct | synthesized`,
  `format: youtube-video | linkedin-post | series | unspecified`
