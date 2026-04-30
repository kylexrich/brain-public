# Chapter Rules

Rules for identifying and formatting YouTube chapter boundaries.

## What qualifies as a chapter boundary

A chapter marks a **meaningful topic or activity transition** — not every minor tangent or pause.

Good boundaries:

- Switching from one project/task to another
- Starting a chess game, returning to coding
- Beginning a new discussion topic
- Coming back from a break

Bad boundaries:

- Brief asides that return to the same topic
- Minor context switches within the same task
- Pauses or filler

## Worker rules

- Use **exact timestamps** from the `[H:MM:SS]` prefixes in the chunk file — do not invent timestamps
- Only identify boundaries from content within the current chunk
- Each boundary needs a `time_seconds` (integer) and a `title`

## Title formatting

- **2-6 words**, specific to what's happening
- **Privacy-safe** — no external people's names (see [privacy-rules.md](../../shared/privacy-rules.md))
- No generic placeholders like "Continued Work" or "More Coding"

## Merge rules

After all workers complete, the finalizer:

1. Merges all boundary candidates chronologically
2. Deduplicates boundaries within 60 seconds of each other, keeping the better title
3. Ensures first chapter is `0:00:00` with a title grounded in the actual stream start
4. Enforces minimum 10-second gap between consecutive chapters
5. Does not pad the chapter count — fewer good chapters is better than many vague ones

## Skip condition

Skip chapter generation entirely if the stream is under 5 minutes.
