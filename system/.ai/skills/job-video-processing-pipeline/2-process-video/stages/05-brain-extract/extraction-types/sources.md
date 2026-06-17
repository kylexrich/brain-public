# Extraction Type: Sources

## What Qualifies

External references Kyle explicitly mentioned on stream: books, podcasts, articles, conversations, YouTube videos. One source per candidate.

## Extraction Constraints

| Field             | Allowed       |
|-------------------|---------------|
| `extraction_type` | `direct` only |
| `confidence`      | `high` only   |

Sources must be real and verifiable. If it can't be verified via web search, don't extract it.

## Quality Criteria

- Kyle must have explicitly referenced the source on stream
- Title, author, and year must be accurate and verifiable
- One source per candidate

## What to Reject

- Sources Kyle didn't explicitly mention
- Unverifiable or vaguely referenced materials
- AI-research sources (those have separate rules outside stream extraction)

## Destination

- Folder: `vault/sources/` (subfolder by type)
    - `articles/` for `source_type: article`
    - `books/` for `source_type: book`
    - `podcasts/` for `source_type: podcast`
    - `youtube/` for `source_type: youtube`
    - Root for `source_type: conversation`
- Frontmatter: `status: evergreen`, `creation_source: stream_extraction`, `extraction_type: direct`,
  `source_type: book | podcast | article | conversation | youtube`, `author`, `year`
