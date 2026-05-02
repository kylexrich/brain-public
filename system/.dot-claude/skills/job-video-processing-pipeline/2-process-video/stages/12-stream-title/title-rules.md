# Title Rules

Rules for generating the title suffix appended to "Building in Public — Day N".

## Format

- 2-15 words (bias toward 3-6, go longer only for chaotic multi-themed streams)
- No quotes, pipes (`|`), em dashes (`—`), or newlines
- No "Building in Public", "Day", "Part", dates, or "stream"

## Content

- Catchy, personality-driven, specific to this stream's narrative
- Reflect the defining moment, failure, breakthrough, or running joke
- Concrete specificity over vague business-speak
- Comma-separated arcs are fine for chaotic streams
- No clickbait or unsupported claims
- Follow [privacy-rules.md](../../shared/privacy-rules.md)

## Examples

Good:

- `Killed by OOM at 128GB`
- `Intro, Lies, & More Lies`
- `Crushed 15km, Crushed 2 Cajun Chicken Burgs, Now Crushing Chess`
- `Closing the Mobile Gap`
- `OAuth at 3AM and Regrets`
- `Ran 15k, Donated a Bishop, Tilted to Bed`
- `Opus Overloaded, Sticky Notes, & Climbing Trees`

Bad:

- `Productive Day of Coding` (vague)
- `Building the Future of AI` (hype)
- `Stream Highlights and Updates` (generic)

## Validation

- Trim whitespace
- Reject if contains quotes, `|`, `—`, or newlines
- Reject if not 2-15 words
- If invalid, surface the issue — do not silently rewrite
