# Vibe Context — Kyle's Channel Voice

Reference document for any stage that picks, titles, or describes clips. Read this before generating any clip-facing text (titles, descriptions, vibe tiers). It encodes the channel's actual voice — generic editorial best practices that conflict with this voice are wrong for this channel.

---

## Channel identity

**"Building in Public — Day N"** is a daily livestream of a full unscripted workday. The source material is 8–14 hours of raw stream per day. Recurring themes:

- **EMLY product engineering** — building AI voice agents for real estate, prompt design, integrations (Retell, FUB, Stripe), live production incidents, schema/architecture decisions
- **AI agent orchestration** — Claude Code, Codex, sub-agents, worktrees, OpenClaw → Claude Code migration, custom skills, the brain repo itself, Linear workflow
- **Chess journey** — current rating ~1080–1150, goal 1500 by EOY 2026. London / Caro-Kann / Nimzo-Indian openings, blunders + recoveries narrated live, daily-puzzle commitment
- **Founder life** — runway anxiety, co-founder dynamics, intern onboarding, Web Summit, real-estate GTM calls, Vancouver tech scene
- **The pipeline meta** — Kyle references his own AI editing pipeline, sub-agent swarms, and the brain repo on stream

## Audience

Engineers, AI-orchestration nerds, chess-journey watchers, build-in-public followers. They came for **specificity and journey**, not for algorithmic hits. They will punish fake hooks. They reward concrete details, named tools, named opponents, named bugs, specific numbers.

## Title pattern (stream-level)

Every stream title is `Building in Public — Day N | <vivid moment>, <chess moment>, <self-deprecating beat>`. Real examples:

- `Day 38 | Hung a Piece, Bailed the Mate, Swarmed the Backend with 10 Subagents`
- `Day 33 | Deployed Migrations to Prod by Accident, Survived`
- `Day 41 | Twilio Math, Modal Wars, Time-Pressure Resignation`
- `Day 32, Part 1 | FUB Webhooks, Donated a Queen, Reference Name Bug`
- `Day 37 | 100 Subs, Corrupted Agent, and a Web Summit Contact Who Vanished`

Notice: no clickbait, no "you won't believe", no power-emoji. Specificity. Mixed registers (technical + chess + self-deprecating). Lists of concrete moments separated by commas.

## Clip titles must mirror this voice

**Good clip title examples** (from actual high-confidence outputs):

- `I was sure I had mate in 5 — then the opponent showed me I didn't`
- `Test calls should never touch real data — a founder catches a bug live`
- `Dynamic variables vs metadata — stop making it hacky`
- `Hats off — when your 1100 opponent refuses to be mated`
- `Codex one-shotted the UI change I thought it would struggle with`

Notice: thesis present in title, often with an em-dash holding two halves together. Specific. Self-aware. The viewer knows what they're getting.

**Bad clip title patterns to reject:**

- "The MOMENT when everything changed" — fake stakes, generic
- "What I learned from this mistake" — generic, no specifics
- "AI is changing coding forever" — broad opinion with no anchor
- "POV: when your code finally works" — TikTok register, off-brand
- Any title without a named subject, specific tool, or concrete claim
- Any title with all-caps emphasis or trailing emoji

## Vibe tiers — the only acceptable clip categories

Every clip suggestion MUST fit one of these tiers. If a candidate moment doesn't fit a tier, it is not a clip. There is no "miscellaneous" bucket.

| Tier                       | What it is                                                                                                                                | Example                                                                          |
|----------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------|
| `FAILURE_AND_RECOVERY`     | Kyle confidently announces something, gets punished, sits with it, names the lesson. The arc IS the clip.                                  | "I was sure I had mate in 5 — then the opponent showed me I didn't"              |
| `CHESS_CODE_FUSION`        | A chess decision and an engineering decision rhyme. The fusion is what makes the clip unique to this channel.                              | Talking about pruning lines while pruning a code branch; cost of seeing-but-not-calculating |
| `ENGINEERING_OPINION`      | Sharp, contrarian, opinionated take on a specific engineering practice with a clear thesis sentence in the clip.                           | "Dynamic variables vs metadata — stop making it hacky"                           |
| `AI_ORCHESTRATION_MOMENT`  | Sub-agent / Claude / Codex / OpenClaw / brain-repo moment with a concrete outcome (worked / failed / surprised). Channel-defining content. | "Codex one-shotted the UI change I thought it would struggle with"               |
| `LIVE_INCIDENT`            | A production fire / migration accident / broken thing fixed live on stream with a clear before-after.                                      | "Test calls should never touch real data — a founder catches a bug live"         |
| `CHESS_INSIGHT`            | Pure chess content with a teachable moment or principle named explicitly. Not just "I played a game."                                       | "Hats off — when your 1100 opponent refuses to be mated"                         |
| `FOUNDER_LIFE`             | A founder-specific moment with stakes — runway, decision under pressure, public emotional honesty. Used sparingly; on-brand only when real.| "Six-month runway, two-month TFSA — what I'm cutting"                            |

## Tone rules

- **Self-deprecation lands.** Vulnerability about chess blunders, schema mistakes, or burned hours is on-brand. Use it when the source material supports it.
- **Self-aware about AI editing.** The audience knows the channel uses AI for editing. Acknowledge it briefly in descriptions; don't pretend the clip was human-cut.
- **No motivational posturing.** No "and that's why discipline matters" closers. End where the source ends.
- **Specificity over emphasis.** A named tool (`Retell`, `Sonos`, `Codex`, `Linear`) beats an adjective ("incredible", "huge").
- **Mixed registers OK.** Engineering jargon and chess jargon and dry humor can sit in the same sentence — that's the channel's voice.

## What NOT to clip

Categories that look like clips but consistently don't work for this channel:

- Voice-energy spikes with no concrete claim (laughter, emphatic phrasing, dramatic pause) — research shows AI tools default to these and they underperform here
- Setup without payoff — the payoff sentence must be inside the clip window, not implied
- Moments that require prior stream context — pronouns that don't resolve inside the clip, callbacks to earlier jokes, "as I was saying"
- Generic banter, ambient narration, "thinking out loud" without a destination
- Single-claim moments that don't fit any vibe tier — even if punchy, they don't compound the channel's identity

## Description tone

YouTube description for any clip/composite produced from this stream should:

1. Open with one sentence stating what the clip is, in Kyle's voice
2. Optional second sentence with the specific detail (the chess line, the bug, the tool)
3. AI-disclosure line: `📝 This clip was assembled from livestream footage by an automated AI editor; commentary and analysis are Kyle's.`
4. Link to the source full stream by URL
5. Standard channel-level links footer (copy from `youtube-description-template.md`)

Descriptions must NOT include hashtag spam, fake calls-to-action, or generic "if you enjoyed, smash that like button" closers.
