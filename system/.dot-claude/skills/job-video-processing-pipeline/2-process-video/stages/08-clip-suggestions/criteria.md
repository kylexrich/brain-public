# Clip Suggestions Criteria

A clip suggestion is a moment from a Building-in-Public stream that could be published as **standalone content** — a HIGHLIGHT, TUTORIAL, or STORY video. It must make sense on its own without needing the full stream for context, and it must fit one of the channel's vibe tiers.

**Read first:** the channel voice document at `system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/vibe-context.md`. Every rule in this file presumes that voice. Generic editorial rules that conflict with it are wrong here.

---

## Hard gates (ALL must be true)

A candidate is rejected unless every one of these holds true inside the clip window. There is no soft-scoring tradeoff — if a gate fails, the clip is not a candidate, no matter how much energy or momentum the moment has.

1. **Thesis present.** The window contains at least one sentence stating the claim, insight, or position. A viewer who didn't watch the rest of the stream can extract a one-sentence summary from the clip itself.
2. **Payoff inside the window.** The answer / punchline / result / consequence is in the clip, not implied beyond it. Setup-without-payoff is rejected — even if the setup is dramatic.
3. **Self-contained references.** Every pronoun, "this", "that", "he/she/they/it" resolves to a noun **inside the clip**. No "going back to what I said earlier", no "remember when…", no unresolved callbacks.
4. **Named subject.** A concrete entity is named — a tool (`Retell`, `Codex`, `Linear`, `FUB`, `Stripe`), an opponent rating, a specific bug/incident, a code construct, a named chess line. Not "the thing" / "that AI" / "this guy". Specificity is the gate.
5. **Clean exit.** The clip ends on a complete sentence with a landing, not mid-clause. The last beat is a conclusion, reaction, or punctuation moment — not a trail-off.
6. **No required prior context.** Phrases that signal external context dependency are disqualifying: "as we were discussing", "like I mentioned", "to continue from before", "back to the…".
7. **Fits a vibe tier.** The candidate must map cleanly to exactly one of the seven vibe tiers in `vibe-context.md` (`FAILURE_AND_RECOVERY`, `CHESS_CODE_FUSION`, `ENGINEERING_OPINION`, `AI_ORCHESTRATION_MOMENT`, `LIVE_INCIDENT`, `CHESS_INSIGHT`, `FOUNDER_LIFE`). If it doesn't fit a tier, it's not a clip.
8. **Substance over momentum.** The clip contains a verifiable claim, a specific number, a named technique, or a concrete decision — not just emphatic phrasing, laughter, or voice-energy spike. AI tools default to picking energy peaks; this channel's audience punishes that.

If any gate fails, **do not include the candidate**. Per-stream output is hard-capped: **maximum 6 candidates per stream**, with confidence honestly distributed. If a stream has fewer than 6 moments that pass all eight gates, return fewer — never pad.

## Format categories (SHORT is excluded)

`SHORT` is intentionally NOT a supported format. The channel does not produce vertical/Shorts content. Only these three formats are valid:

| Category    | Description                                                                                                                       | Typical duration |
|-------------|-----------------------------------------------------------------------------------------------------------------------------------|------------------|
| `HIGHLIGHT` | A standout moment that lands in 1–4 min — a sharp opinion, a reaction, a chess turning point with named insight, a live incident. | 60 – 240 s       |
| `TUTORIAL`  | A teaching/walkthrough segment with a concrete claim and a worked example. Must include the conclusion, not just the setup.       | 90 – 480 s       |
| `STORY`     | A narrative with setup → tension → resolution. Failure-and-recovery arcs live here.                                                | 90 – 360 s       |

Duration is descriptive, not prescriptive — what matters is the gate set above. A 30-second moment that hits all gates is rare but valid; a 6-minute moment with no payoff still fails.

## Title rules

Mirror the channel's existing title pattern (see `vibe-context.md`). Specifically:

- **Lead with the thesis or the surprise**, not a generic teaser
- **Use an em-dash to fuse two halves** when it sharpens the title (e.g. `"I was sure I had mate in 5 — then the opponent showed me I didn't"`)
- **Name the specific thing** — tool, opponent rating, bug class, code construct
- **No clickbait registers** — no "you won't believe", no "the MOMENT when…", no all-caps, no trailing emoji
- **40–80 characters** typically; longer is fine if it's information, not padding

## Vibe tier assignment

Pick the SINGLE best-fitting tier per candidate. If two tiers seem to fit, pick the one that better captures *why this specific moment* works — not the broader topic. Examples:

- A chess blunder where Kyle confidently announced mate → `FAILURE_AND_RECOVERY` (the arc IS the clip), not `CHESS_INSIGHT`
- An opinion about how Codex handles a refactor → `AI_ORCHESTRATION_MOMENT` (channel-defining), not `ENGINEERING_OPINION`
- A migration that broke prod, narrated live with the rollback → `LIVE_INCIDENT`, not `FAILURE_AND_RECOVERY`

## Description per clip

Each suggestion produces a `description` field that becomes the YouTube description. Structure:

```
<one sentence stating what the clip is, in Kyle's voice>

<optional second sentence naming the specific detail — chess line, bug, tool>

📝 This clip was assembled from livestream footage by an automated AI editor; commentary and analysis are Kyle's.

🎥 Watch the full Day {N} stream: {source_stream_url}

—

🔗 Links
• EMLY AI: https://emlyai.ca/
• LinkedIn: https://www.linkedin.com/in/kylexrich/
• GitHub: https://github.com/kylexrich
• Brain repo (public mirror): https://github.com/kylexrich/brain-public
• Chess.com: https://www.chess.com/member/dreamyduckling
```

Description must NOT include hashtag spam, generic CTAs, or motivational closers. Source stream URL is filled in by the upload stage from `source_stream.json`.

## Hard-rejection patterns (anti-examples)

Reject candidates that match these patterns even if they look strong on first read:

- **Voice-energy spike only**: laughter peak, dramatic emphatic line, voice-volume jump — but no claim, no decision, no named subject. AI tools default to these. Reject.
- **Setup-only**: the moment ends right before the payoff would land. The question is asked, the surprise is built, but the answer/resolution is outside the window.
- **Topic drift**: the candidate window covers two unrelated topics. Either split into two stronger candidates or reject both.
- **Generic banter**: low-information conversation, ambient narration, thinking-out-loud without a destination.
- **Off-vibe**: doesn't fit any of the seven vibe tiers. Even if punchy, it doesn't compound the channel's identity.
- **Requires prior context**: the clip references an off-clip antecedent. Pronouns don't resolve. Callbacks to earlier-in-stream moments.

When in doubt, **reject**. A high-quality channel of 6 great clips beats a noisy channel of 12 mediocre ones. The fix for the current "too many clips" symptom is to be brutal here.
