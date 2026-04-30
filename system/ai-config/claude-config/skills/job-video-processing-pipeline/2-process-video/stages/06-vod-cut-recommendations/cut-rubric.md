# Cut Rubric

Rules for what segments should be flagged for trimming from the published VOD.

**This stage is strict-explicit-only.** The ONLY thing to flag is moments where Kyle, on stream, **literally and verbally tells the audience or himself to cut, claw, delete, edit, or remove a specific moment from the VOD**. Nothing else. Empty output is the correct answer for most chunks.

Do **not** flag AI-detected sensitive content, privacy concerns, security exposures, or anything else inferred from screen state. If Kyle didn't say it out loud, it doesn't go on the list.

## What to flag

A recommendation MUST come from a verbatim verbal cue in the transcript. The trigger is Kyle's words, not the surrounding context.

### Trigger phrases (non-exhaustive)

The phrase must clearly refer to cutting **this VOD**. Look for:

- **"Cut"** — especially repeated/emphatic forms: "cut, cut, cut", "cut this", "cut that out", "cut that part"
- **"Claw"** / **"clawed"** / **"claw it out"** / **"claw that out"** (Kyle's slang for cut)
- **"Delete"** — when applied to the stream/VOD: "delete this part", "delete this moment", "mark this to delete"
- **"Trim"** / **"edit out"** / **"cut out"** — "trim this out", "edit that out", "we need to cut that out"
- **"Remove"** — applied to the VOD: "remove this from the VOD", "remove this part"
- **"Mark this"** — when followed by cut/delete/remove intent: "mark this as a point to delete", "mark this for removal"

### The core test

For every candidate, both must be true:

1. The transcript contains one of the trigger phrases above (or an unambiguous equivalent).
2. The phrase clearly refers to **cutting this VOD/stream** — not unrelated uses of the same word.

If either is unclear, do NOT flag it.

## What does NOT count (common false positives)

These look similar but are NOT cut requests. Skip them.

- **Programming/git/database language** — "delete this file", "delete this branch", "delete this row", "remove this import", "cut this function".
- **"Cut" about other media** — "I need to cut that video clip shorter" (editing a marketing video, a YouTube short, etc., not the VOD itself).
- **Chess/gameplay** — "whoops", "cut my losses", "I should claw that piece back". Game talk, not VOD talk.
- **Past-tense / hypothetical references to other streams** — "I should have cut that out last stream", "if I had said X I'd cut it".
- **Privacy mode / off-screen prevention** — "going into privacy mode", "let me move this off screen", "I'm still in private mode", "doing this off camera". These are PREVENTION, not cut requests. Even if they imply caution, they do not satisfy the trigger phrase rule.
- **Near-misses Kyle resolves** — "whoa that was close... we're fine, nothing showed". No exposure → no cut.
- **General privacy/security discussion** — explaining concepts, designing features, talking about best practices.
- **"Whoops" / "oops" alone** — a bare exclamation is NOT a cut request unless Kyle follows it with one of the trigger phrases.
- **Editing / cutting metaphors** — "cut to the chase", "cut a deal", "cut corners".

## Edge cases

- "Cut. Cut. Cut." (repeated emphatically) → YES, flag it.
- "Claw that out" / "we gotta claw that out" → YES, flag it.
- "Mark this as a point in the stream that I need to delete" → YES, flag it.
- "I need to cut that part out" → YES, flag it.
- "Going into privacy mode real quick" with no follow-up cut phrase → NO.
- "Shoot, you guys saw that" with no follow-up cut phrase → NO. (Used to count under the old rubric. It does not anymore. We need a literal cut/claw/delete trigger.)
- "Delete this row from the database" → NO, it's a SQL action.

## Time range

For every flagged segment:

- Start the cut a few seconds **before** Kyle's trigger phrase, at the natural beginning of the moment he wants removed (e.g., when the sensitive thing first appeared, or when the topic began).
- End at or shortly after the trigger phrase resolves.
- If Kyle gives an explicit time range ("cut from 1:23 to 1:45"), honor that exactly.
- Recommend actual cut intervals with timestamps, not vague commentary.

## Field guidance

- `kyle_explicitly_requested_cut` — always `"TRUE"` for any recommendation emitted by this rubric. There is no `"FALSE"` branch anymore.
- `category` — pick `PRIVACY` or `SECURITY` based on what Kyle was reacting to. If unclear, default to `PRIVACY`.
- `transcript_excerpt` — must include the verbatim trigger phrase.
- `reason` — describe the risk class broadly. Never include the actual secret, credential, or exploit mechanics.
