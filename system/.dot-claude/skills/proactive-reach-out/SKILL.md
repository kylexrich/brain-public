---
name: proactive-reach-out
description: Decide whether — and how — to initiate a message in a long-running BlueBubbles group chat after a scheduler `notify` event fires (job_name=proactive-<chat>, e.g. proactive-marv-sucks). Owns the activity gate, the random-target gate, the category pick, the message composition, and the per-chat state file. Make sure to invoke this skill any time the session receives a `<channel source="scheduler" job_name="proactive-...">` event — never try to handle that trigger by ad-hoc reasoning, because the gates and state file are the entire point. Don't invoke for normal user-typed requests to send a message; this skill is purely for scheduler-driven proactive outreach inside a chat-owning BlueBubbles agent.
---

# Proactive Reach-Out

## What this is

You're inside a long-running BlueBubbles agent that normally just *responds* to messages. A scheduler cron has now nudged you with the suggestion: "consider initiating something." That's not the same as "send something" — most invocations end in silence, because the chat is already alive or the random-target window hasn't arrived yet. The skill exists so the *whether* and *how* of initiating are decided consistently, and so per-chat state advances correctly when you do send.

When you do send, the message has to read like a member of the chat decided to say something on their own. Not a bot pinging in. Not "just checking in." Not narration. The whole reason this lives behind a random target window (7–35 days) is so the cadence feels human; if your phrasing breaks that illusion, the cadence work was wasted.

## Trigger

A scheduler event in the agent's session:

```
<channel source="scheduler" job_id="..." job_name="proactive-<chat>" kind="cron">
```

`<chat>` is the chat identifier (e.g. `marv-sucks`). The same skill serves every chat by adding a row to the routing table below.

## Per-chat routing

| chat         | imsg `--chat-id` (read) | bluebubbles tool                       | bluebubbles chat GUID                    |
|--------------|------------------------|----------------------------------------|------------------------------------------|
| `marv-sucks` | `<IMSG_GROUP_CHAT_ID>`                 | `mcp__bluebubbles-marv-sucks__reply`   | `<BLUEBUBBLES_GROUP_CHAT_ID>` |

To wire up another chat: add a row, drop in a `state/<chat>.json` state file with default zeros, and the same skill works. Don't hard-code chat-specific values in the step logic — keep the routing table the single source of truth.

## State

Lives in `state/<chat>.json` (a sibling `state/` directory of this skill) — same pattern as `music/state/music-history.json`. The `state/` subdir is excluded from the public mirror so chat-specific contents stay private. The full schema is shown in `state.example.json`. Default shape on first read (or if the file is missing):

```json
{ "version": 3, "chat": "<chat>", "next_target_at_ms": 0, "recent_sends": [] }
```

| field               | meaning                                                                                                          |
|---------------------|------------------------------------------------------------------------------------------------------------------|
| `version`           | schema version, currently `3`.                                                                                   |
| `chat`              | chat identifier, matches the routing table.                                                                      |
| `next_target_at_ms` | epoch ms of the next eligible send window. While `Date.now() < next_target_at_ms`, the skill stays silent.       |
| `recent_sends`      | up to the last 50 sends, oldest first. Each entry: `{ timestamp, category, message, engagement_level?, engagement_summary? }`. See below. |

A `recent_sends` entry:

| field                 | meaning                                                                                                                                           |
|-----------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| `timestamp`           | ISO 8601 with timezone offset (e.g. `2026-04-15T22:34:11-07:00`). The moment the send went out.                                                   |
| `category`            | the kebab-case category label that produced the message (see Content categories).                                                                 |
| `message`             | the exact text that was sent. Used as grounding for future picks so the next send doesn't echo this one in substance.                             |
| `engagement_level`    | optional. One of `none`, `low`, `medium`, `high`, `negative`. Filled in by the engagement-rating step ~24h after the send. Absent until then.     |
| `engagement_summary`  | optional. One- or two-sentence prose summary of *what actually happened* in the chat after the send — who replied, what worked, what fell flat.   |

The `message` field matters more than the category label — repeating a category with a fresh angle is fine; repeating the same subject matter, named person, or joke beat is what makes the chat feel scripted. The `engagement_*` fields are how the skill learns over time: future picks read them to bias toward angles that landed and away from ones that didn't.

You are the only writer. Read once at the start of a fire; write whenever something material changes (new engagement rating, new send, target rotation). The cap of 50 keeps the file small enough to reason over while giving the engagement-feedback loop real signal.

## Decision flow

Run these in order. Step 2 (engagement rating) is usually a cheap no-op — it only fires once per send-cycle, when the most recent send becomes 24h+ old and gets retroactively rated. Step 3 (target gate) is what bails out ~96% of cron fires before any chat history is pulled. That's the design that keeps hourly cron affordable.

### 1. Load state

Read `<skill-dir>/state/<chat>.json`. If missing, treat the default shape as the in-memory state. Capture `now_ms = Date.now()`.

### 2. Rate any unrated send that's old enough

Scan `recent_sends` for entries where `engagement_level` is missing AND the entry's timestamp is at least 24 hours old. The 24h delay matters — by then the chat has either reacted or it hasn't, so the rating is based on real signal rather than a snapshot taken too soon.

If there are any such entries:

1. Pull chat history (the same `imsg history --chat-id <chat-id> --limit 300 --json` call that step 4 uses). You already need it for the rating; if step 3 also passes later, reuse it instead of pulling twice.
2. For each unrated, eligible entry:
   - Find every chat message with timestamp newer than the entry's `timestamp`. (Anything older isn't a reaction.)
   - Read those messages and judge the engagement.
   - Set `engagement_level` to one of:
     - `none` — nobody replied. The message landed in silence.
     - `low` — one or two short replies, no real conversation came of it.
     - `medium` — multiple participants chimed in, brief exchange, then it tapered.
     - `high` — multiple participants, sustained back-and-forth that ran for a while.
     - `negative` — explicit pushback or annoyance. ("ok marv weird", "lol who asked", chat-rename to mock you, etc.) This rating is the loudest signal — treat it as a hard "don't repeat that move."
   - Set `engagement_summary` to one or two sentences naming who responded and what specifically worked or didn't. Examples: *"Travis took the bait, debated for 5 messages. Harry chimed in with a counter. Landed."* / *"No replies. Probably too obscure — nobody knew the reference."* / *"Harry called the callback stale and the chat moved on. Don't reuse this angle."* The named details are what makes the summary useful to future picks; "got some replies" is useless.
3. Save the state file with the new ratings even if the rest of the flow bails — losing a rating to a later cron miss is the failure mode to avoid.

If there are no unrated-eligible entries, this step is a no-op cost-wise (just a check against `recent_sends`).

If `recent_sends` has unrated entries that are still <24h old, leave them. They'll get rated on a future cron tick once 24h has passed.

### 3. Target gate — random 7–35 day window (cheap; runs first for sends)

If `now_ms < state.next_target_at_ms`, exit silently. Don't pull chat history, don't do anything else. The randomised target hasn't arrived yet, and ~96% of cron fires will bail here on a small state-file read — that's why this gate is first.

**First-run special case.** If `state.next_target_at_ms === 0`, you've never run for this chat before. Don't treat that as "due now" — that would make the very first cron tick fire the moment the system was wired up, which is predictable and uncanny. Instead: compute the next target via the formula below, write the state, and exit silently. The first real send happens when that target arrives.

**Computing `next_target_at_ms`** (used in this step on first run, and in step 9 after a successful send):

1. Start with `base = now_ms + randomBetween(7d, 35d)`.
2. With ~30% probability, slide `base` forward to the next Friday or Saturday (i.e. advance one day at a time until `dayOfWeek(base)` is Friday or Saturday in local time). Otherwise leave it alone.
3. Set the time-of-day on `base` to a random hour in `[19, 22]` and a random minute in `[0, 59]` (local time). The send fires at the next cron tick after the target opens, so this hour-of-day picker is what randomises *when* in the evening the message lands — without it, every send goes out on whatever single hour the cron is hard-coded to.
4. The result is `next_target_at_ms`.

The Fri/Sat slide is a slight day-of-week bias. The time-of-day randomisation is the thing that prevents the "Marvin always pipes up at 9pm sharp" tell. Pair this skill with a cron like `0 19-22 * * *` (hourly, evening window) so the cron tick that catches the target lands close to whichever hour the skill picked.

(`d = 86_400_000` ms throughout.)

### 4. Pull recent chat history (only reached if step 3 passed)

```bash
imsg history --chat-id <chat-id> --limit 300 --json
```

If step 2 already pulled the history this run, reuse it instead of pulling again. You need this twice over: to check the activity gate, and as grounding for the message itself (callbacks weeks deep, who hasn't been the focus, what running jokes are alive). 300 is intentionally deep — the categories that need history (`callback`, `inside-reference`, `curiosity-ping`) only work if you can actually see what was said weeks ago. The cost is fine here because the target gate already filtered out ~96% of fires.

### 5. Activity gate — 48 hours

If any message in the chat is newer than `now_ms - 48*60*60*1000`, exit silently. Don't write state. Don't message the chat. Don't DM Kyle.

The reason: the chat is talking to itself. An LLM-generated icebreaker landing on top of a live conversation reads like a barge-in even when the message itself is decent. Genuine quiet is what makes a proactive send land.

### 6. Pick a category

Pick one of the eleven categories below. Use judgment — the chat's recent state is the input; the category list is the menu, not a queue. Three soft pressures, in order of strength:

- **Learn from past engagement.** This is the biggest signal. Read `recent_sends[].engagement_level` and `engagement_summary` for every entry that has them. Categories that produced `high` engagement are worth revisiting (with a fresh angle); categories that produced `negative` are strong avoid signals — the chat already told you they didn't like that move. `none` and `low` are weaker negatives ("didn't connect, but no harm done"). The summaries name *what specifically* worked or failed — read them, don't just count levels. If the last send was `negative`, lean toward a noticeably different category and probably a longer next-target offset (closer to the 35d end of the range).
- **Bias toward freshness, but don't enforce uniqueness.** Look at `recent_sends` (oldest first; the *end* of the list is the most recent). Categories near the end are stronger "avoid" candidates; categories near the start are mid-tier; categories absent from the list entirely are the best picks. Hard exclusion would force exhaustion — repeating a category is fine if the angle, subject, or named person is genuinely different from the prior send, which is exactly what `recent_sends.message` lets you check.
- **It has to fit the chat history.** `inside-reference` only works if there's a real running joke to reference; `targeted-checkin` only works if the named person has been off-screen recently. If your preferred category doesn't fit, pick another.

### 7. Compose the message

One message. 1–3 sentences. Casual punctuation. No markdown, no bullet points, no emoji spam. Match the response-style rules of the agent definition that owns this chat — if the agent normally writes lowercase one-liners, you write lowercase one-liners.

The single hardest constraint: **it has to read like a participant decided to say it, not like a system fired.** Read it back before sending and ask: would anyone in this chat actually type this out and hit send? If the answer is no, rewrite or bail. If you can't get there, exiting silently is a perfectly fine outcome — the next cron tick is one day away and the random target stays where it was.

Things that break the illusion:

- **Preambles.** "Just checking in" / "thought I'd say hi" / "Marvin here" — none of those.
- **Meta-commentary about the message itself.** "Random thought but..." / "out of the blue..." The send time is already random; you don't need to flag it.
- **Doing two things at once.** A hot take *and* a check-in *and* a question. Pick one move and make it.

### 8. Send

Call the chat's bluebubbles tool from the routing table with the composed text. Use the chat GUID from the table — never derive a chat GUID from `imsg` CLI output, because BlueBubbles uses a different namespace and the wrong GUID hangs silently for ~25s before failing.

### 9. Update state — only on confirmed send

If the bluebubbles tool returned success:

- Append `{ timestamp: <now as ISO 8601 with offset>, category: <picked>, message: <exact text sent> }` to `recent_sends`. **Leave `engagement_level` and `engagement_summary` unset** — they get filled in by step 2 on a future cron tick once 24h has passed. If the array is now longer than 50, drop the oldest entry.
- Recompute `next_target_at_ms` using the formula in step 3 (random 7–35 day offset, optional Fri/Sat slide, random evening hour). If the most recent rated entry was `negative`, lean toward the long end of the 7–35d range when picking the offset.

Write the file.

If the send failed: do **not** touch state. The next cron tick re-attempts naturally, and you avoid the silent-failure mode where state shows a send that never reached the chat.

## Content categories

These exist so the message reads like a real participant rather than an LLM doing outreach. Use the kebab-case label exactly when writing to `recent_sends[].category` — the freshness check compares strings.

1. **callback** — follow up on something a member mentioned weeks ago (an interview, a trip, a recurring problem). No preamble.
2. **debate-starter** — "okay settle this" + a hypothetical specific to the group's interests.
3. **hot-take** — Marvin has an unprompted opinion on something and shares it.
4. **media-reaction** — image/link with Marvin's actual perspective on it (not "what do you think?").
5. **targeted-checkin** — "how's [the thing] going?" to one named person, no "just checking in" framing.
6. **current-event** — Marvin's take on something real, framed to invite a take back.
7. **recommendation-ask** — specific enough to feel real ("need something to watch that won't ruin my week").
8. **curiosity-ping** — "hey [name] what are you up to these days" to someone who hasn't been the focus recently.
9. **trivia-stumble** — "did you know [thing]" framed as something Marvin just found out.
10. **inside-reference** — callback to a running joke; valid only if the chat history pulled in step 3 actually contains the joke.
11. **banter** — low-stakes friendly ribbing or teasing with no agenda — "how were the beers last night", "kyle stop replying within 4 seconds we all know you're bored at work", a playful jab about something a member did or said. Could be about a recent specific event, an ongoing trait, or just a light poke. No take to defend, no question to answer, just being a guy in the chat. Often the right pick when the other categories feel too structured for the moment.

## What not to do

A handful of things will silently break this skill if you do them, even when everything else looks fine:

- **Don't send anything to the chat on a no-op.** Failures, gate trips, "hmm, nothing today" — the bluebubbles tool stays unused. Silence is the correct outcome on a no-op; the chat should never see proactive-skill metadata.
- **Don't advance state on a failed send.** A run that bumped `next_target_at_ms` but didn't actually deliver looks fine on disk while the chat saw nothing — re-attempt on the next tick instead.
- **Don't shorten the 7–35 day range without Kyle's say-so.** A "feels too long" reaction in the moment is exactly the wrong signal; the range is invisible from inside any one window, which is the whole point.
- **Don't run via spawn-mode delivery.** A `spawn` scheduler job opens a fresh `claude -p` headless session that has no BlueBubbles session continuity, so even a successful send would be detached from the chat the responses come back to. Always `notify`-mode, always inside the existing long-running agent.
