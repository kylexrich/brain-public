# Privacy Rules

Kyle streams live, and sensitive moments sometimes happen on stream. These rules tell workers how to handle sensitive content when producing
outputs.

**Used by:** clip-suggestions, composite-clip-suggestions, stream-chapters, stream-summary, stream-title.

## Public outputs: omit entirely

For anything published to YouTube (chapter titles, clip suggestions, summaries, video titles) — do not reference, summarize, or hint at
sensitive content. If a segment is sensitive, skip it.

**Example:** If Kyle accidentally shows credentials on stream, do not write a chapter title like "Addressing a Security Concern." Just skip
that segment.

## Incidents: abstract, do not omit (and never drag the identifiers along)

A production incident is often genuinely good content — the bug, the debugging, and especially the lessons. Do **not** drop it. But **abstract
it**: keep the generic incident and the takeaways, and strip every identifying or sensitive specific.

- **Keep:** "a production bug surfaced in the onboarding flow," "traced to a downstream provider's breaking API change," and the lessons
  (alarming, integration testing, escape hatches, proactive monitoring). Kyle's own feelings, mistakes, and learnings are always fair game.
- **Strip — but only *other people's* chips:** anything that identifies or characterizes the *affected customer* (see `sensitive-information.md`
  §4 — "high-value customer," their vertical/brokerage, the lunch-and-learn, the live relationship status), and any customer PII / prod logs /
  database rows shown on screen.
- **Do NOT strip Kyle's OWN material.** His financials, investor deck (TAM/SAM/SOM, COGS, ARPU, margins), tech stack, the vendors he openly uses
  (e.g. Retell — it's in his public codebase), and his own mistakes and lessons are *intentionally* public — building in public is the strategy.
  None of that is sensitive for him. (§5 financials, §7 vendor, §9 named-company rules apply to genuinely private or third-party information, not
  to material Kyle deliberately shares on stream.)

The failure mode to avoid: treating the *customer's* stakes as narrative fuel and including "a high-value customer who was introducing us to
their brokerage" because it makes the story better. The story does not need the customer's identity. **The line is whose chips they are: cover
Kyle's lessons freely; protect the customer's identity and data.**

## What counts as sensitive

See `sensitive-information.md` in this directory for the full definition.
