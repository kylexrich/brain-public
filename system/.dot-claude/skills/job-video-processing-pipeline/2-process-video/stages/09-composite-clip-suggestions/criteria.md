# Composite Clip Suggestions Criteria

A composite clip suggestion is a **multi-segment compilation** — several moments from one Building-in-Public stream that, stitched together, tell a single bound story. Unlike standalone clips (stage 08), individual segments don't have to stand alone; the value comes from the binding.

**Read first:** the channel voice document at `system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/vibe-context.md`. The same vibe tiers and tone rules apply.

---

## Hard gates (ALL must be true)

A composite is rejected unless every gate holds. A composite that "shares a topic" but doesn't bind into one video is just a bag of clips — that's what stage 08 is for. Stage 09 produces actual standalone videos.

1. **Binding thesis present and writeable.** The model MUST produce a single declarative sentence stating what binds all the segments together — not "these moments share a topic" but "this video argues / shows / explores X". If the model cannot write that sentence in one try, the composite fails this gate. The sentence is the `binding_thesis` output field.
2. **Escalation across segments.** Segments must compound — stakes rise, depth increases, the question gets bigger, or the failure gets worse before resolution. Segments that are interchangeable in order do NOT pass this gate. If shuffling segment order doesn't change the meaning, reject.
3. **First and last segment carry their roles.** First segment opens the question / states the surprising thesis / names the stake. Last segment lands the resolution / payoff / conclusion. A composite that starts in the middle or ends mid-arc fails this gate.
4. **Fits a vibe tier.** Must map to exactly one of the seven tiers in `vibe-context.md`. Composites work best for tiers that span time within one stream: `FAILURE_AND_RECOVERY`, `CHESS_CODE_FUSION`, `LIVE_INCIDENT`, `CHESS_INSIGHT`. `AI_ORCHESTRATION_MOMENT` composites work when there's a multi-stage agent run. `FOUNDER_LIFE` composites are rare — only when a stake/decision genuinely arcs across the stream.
5. **No required external context.** Every segment must be intelligible in the composite without prior-stream context. Pronouns and callbacks resolve inside the composite. (Within a segment, references can resolve to earlier segments in the same composite.)
6. **Single-stream sourcing.** All segments come from the same stream chunks. No cross-stream composites in this stage.
7. **Editorial effort = LOW or MEDIUM.** Reject any composite that would need `HIGH` editorial effort — heavy narration bridges, context cards, or transition voiceovers. Pure AI assembly of "needs bridges to make sense" content produces slop. If the segments don't bind with minor cuts only, the composite fails.
8. **Length sanity.** Estimated total duration `>= 120s` and `<= 900s` (2–15 min). Below 120s is just a clip — reject and let stage 08 handle it. Above 900s is too long for AI-assembled content without human polish.

Per-stream hard cap: **maximum 3 composites per stream**. If fewer pass all gates, return fewer.

## Format categories

| Category            | Description                                                                                                                  |
|---------------------|------------------------------------------------------------------------------------------------------------------------------|
| `GAME_RECAP`        | A chess game from opening through analysis with named moments (the line, the blunder, the recovery). Strong on this channel. |
| `TOPIC_DEEP_DIVE`   | Extended exploration of one engineering topic across multiple stream moments — Retell prompt design, sub-agent orchestration, schema design. Must have a thesis, not just "things said about X". |
| `JOURNEY_ARC`       | Progression narrative — failure → bigger failure → breakthrough, or rusty start → climb. Stakes must compound across segments. |
| `LIVE_INCIDENT_ARC` | A production fire that unfolded across the stream — discovery, debugging, fix, postmortem. Requires real resolution inside the composite. |

`THEME_COMPILATION` and `TOPIC_MERGE` from the previous schema are removed — they tended to produce bag-of-clips outputs that failed the escalation gate.

## Segment roles

| Role     | Position    | Purpose                                                                |
|----------|-------------|------------------------------------------------------------------------|
| `INTRO`  | First only  | Opens the thesis, names the stake, frames the question                 |
| `BODY`   | Middle      | Develops the binding — adds depth, adds tension, raises stakes         |
| `PAYOFF` | Last only   | Resolves the thread — lands the conclusion, delivers the breakthrough  |

A composite MUST have exactly one INTRO and exactly one PAYOFF. BODY segments are optional but useful for arcs longer than ~4 minutes.

## Title rules

Same as stage 08 — read `vibe-context.md`. A composite title typically:

- Names the binding arc, not just the topic (`"From hung piece to passed pawn — clawing back from 1080"` not `"Day 38 chess games"`)
- Uses em-dash to fuse the binding thesis with the specific
- 40–90 chars, no clickbait, no all-caps, no trailing emoji

## Description per composite

Each composite produces a `description` that becomes the YouTube description. Structure:

```
<one-sentence statement of the binding thesis>

<one optional sentence with the specific detail — the chess line, the incident name, the tool>

⏱️ Chapters
{chapters}

📝 This compilation was assembled from livestream footage by an automated AI editor; commentary and analysis are Kyle's.

🎥 Watch the full Day {N} stream: {source_stream_url}

—

🔗 Links
• EMLY AI: https://emlyai.ca/
• LinkedIn: https://www.linkedin.com/in/kylexrich/
• GitHub: https://github.com/kylexrich
• Brain repo (public mirror): https://github.com/kylexrich/brain-public
• Chess.com: https://www.chess.com/member/dreamyduckling
```

`{chapters}` is filled in by the upload stage from the segment list — first chapter must start at `0:00` (the composite's local timeline, not the source stream timeline), each chapter must be at least 10 seconds, and each chapter title comes from the segment's title field. Composites with fewer than 3 segments skip the chapters section entirely.

`{source_stream_url}` is filled in by the upload stage from `source_stream.json`.

## Hard-rejection patterns

- **Bag of clips**: segments share a topic but don't compound — no escalation, interchangeable order. Common AI failure mode. Reject.
- **No binding thesis**: model can't produce the one-sentence summary. Either the binding isn't real, or the segments don't actually fit.
- **Heavy-bridge needed**: needs voiceover or context cards to make sense. We have no human editor in the loop. Reject.
- **Missing INTRO or PAYOFF**: composite opens in the middle or ends mid-arc.
- **Pad-to-length**: extra segments added that don't advance the binding — they exist only to hit a target duration. Reject the composite, not just the segment.
- **Off-vibe**: doesn't fit any vibe tier, or fits poorly. The seven tiers are the channel's identity — content outside them dilutes the channel.

When in doubt, **reject**. The previous output volume was the symptom; 0–3 great composites per stream beats 5 mediocre ones every time.
