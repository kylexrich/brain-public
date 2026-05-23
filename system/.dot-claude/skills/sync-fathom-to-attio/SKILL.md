---
name: sync-fathom-to-attio
description: Sync Fathom meetings to Attio for one Fathom account — for each external attendee, upsert the person record and add a note summarizing the meeting (summary + action items). Optionally bumps the person's Custom Connection Strength. Inputs are a Fathom API key (env var name) and a time range. Use when Kyle says "sync Fathom to Attio", "log this week's meetings in Attio", "create Attio notes from my recent calls", or similar.
user-invocable: true
allowed-tools:
  - Bash
  - mcp__attio__list-attribute-definitions
  - mcp__attio__search-records
  - mcp__attio__upsert-record
  - mcp__attio__update-record
  - mcp__attio__create-note
  - mcp__attio__list-records
  - mcp__attio__search-notes-by-metadata
  - mcp__attio__semantic-search-notes
  - mcp__attio__get-note-body
---

# /sync-fathom-to-attio — Fathom meetings → Attio notes (single account)

Pulls Fathom meetings over a time range using **one** Fathom API key, and for each external attendee in Attio's People object: upserts the person, attaches a note with the meeting summary and action items, and (when warranted) updates `custom_connection_strength`.

This skill is **scoped to a single Fathom account**. To sync multiple accounts (e.g., Kyle's and Josh's), invoke it once per account — see "Running for multiple accounts" at the bottom.

## Why this exists

Fathom captures the meeting; Attio is where customer/lead context lives. Without this skill, every call's notes rot in Fathom and never reach the CRM. This skill pushes the structured bits — summary, action items, attendee list — onto the right people records so they're searchable next to the rest of the relationship history.

## Inputs

The caller supplies (via natural language or explicit args):

1. **API key env var name** — which Fathom key to use, e.g. `KYLE_FATHOM_API_KEY` or `JOSH_FATHOM_API_KEY`. The skill reads the value from env; the caller never passes the key value directly.
2. **Time range** — e.g. "today", "this week", "last 7 days", "April 1–7", or explicit ISO timestamps. Convert to UTC ISO 8601 (`YYYY-MM-DDTHH:MM:SSZ`) for the API.
3. **Connection-strength behavior** (optional, default `judgment`) — see "Connection strength" below. Values: `judgment` (let the agent decide per person), `skip` (never touch it), `force:<value>` (set every synced person to a specific value).

If the time range isn't clear, ask once — don't guess "last 24 hours" silently for a vague request.

## Workflow

### 1. Validate the API key

Read the value from env using the var name the caller specified. The key is usable iff it's set AND not the literal string `placeholder`:

```bash
KEY="${!KEY_VAR_NAME}"  # e.g. ${!KYLE_FATHOM_API_KEY}
[ -n "$KEY" ] && [ "$KEY" != "placeholder" ]
```

If the key is missing or set to `placeholder`, stop. Tell the user: "`<KEY_VAR_NAME>` is not set in `~/Developer/brain/system/zshrc/.env` — populate it first."

Never echo the key value into the conversation. Reference it only by the env var name.

### 2. Fetch meetings from Fathom

Call:

```bash
curl -sS 'https://api.fathom.ai/external/v1/meetings' \
  -H "X-Api-Key: $KEY" \
  -G \
  --data-urlencode "created_after=2026-04-17T00:00:00Z" \
  --data-urlencode "created_before=2026-04-24T23:59:59Z" \
  --data-urlencode "include_summary=true" \
  --data-urlencode "include_action_items=true"
```

Notes:
- The endpoint paginates via `next_cursor`. If it's present in the response, follow it (`--data-urlencode "cursor=..."`) until exhausted.
- Pass the key only via the `-H` arg, never in URL or stdout.
- Store the raw JSON in a temp file (e.g. `/tmp/fathom-$KEY_VAR_NAME-$(date +%s).json`) so you can `jq` over it without re-fetching.

Each meeting in `items[]` exposes (the fields we care about):
- `recording_id`, `url`, `share_url`
- `title` (calendar subject), `meeting_title` (Fathom's cleaned title — fall back to `title` if missing)
- `recording_start_time`, `recording_end_time`, `scheduled_start_time`
- `recorded_by` `{ name, email, team }`
- `calendar_invitees[]` `{ name, email, is_external }`
- `default_summary.markdown_formatted`
- `action_items[]` `{ description, completed, recording_timestamp, recording_playback_url, assignee: { name, email } }`

### 3. Pick the people to sync

For each meeting, the people who get notes are: **calendar invitees with `is_external: true`**, excluding any whose email matches `recorded_by.email` (the Fathom user themselves).

If a meeting has zero external attendees, skip it entirely — it's an internal call and doesn't belong in CRM.

If two meetings produce notes for the same person in the same run, that's fine — add both. Don't dedupe across meetings; each meeting is its own record. **DO NOT ADD MEETINGS WHOSE ONLY ATTENDEES END IN @emlyai.ca**.

### 4. Upsert the person in Attio

For each external attendee, use `mcp__attio__upsert-record`:

- `object`: `people`
- `matching_attribute`: `email_addresses`
- `data` should include:
  - `email_addresses`: the invitee's email
  - `name`: split the Fathom `name` into `first_name` / `last_name` (split on first space; if only one token, put it in `first_name`)

If the person already exists, `upsert-record` returns the existing record without overwriting other fields — that's what we want.

### 5. Dedupe against existing notes on the person

Before creating a note, check whether this exact meeting is already on the person's record. There are two layers:

**Tier 1 — sentinel match (deterministic):**
Every note we create ends with a stable sentinel line:

```
[fathom-recording-id:{recording_id}]
```

Use `mcp__attio__search-notes-by-metadata` filtered to `parent_object: people` and `parent_record_id: {the upserted person's id}` to list existing notes on this person. For each note whose title starts with `Fathom:` (cheap pre-filter), call `mcp__attio__get-note-body` and look for `[fathom-recording-id:{recording_id}]`. If you find a match — skip note creation for this (meeting, person) pair entirely. Count it in the report under "skipped (already synced)".

This sentinel check is also what makes multi-account runs safe: if Kyle's account already created a note for a meeting that Josh also attended, Josh's run will see the sentinel on that person's record and skip — no cross-account coordination needed.

**Tier 2 — content-similarity fallback (for notes that lack the sentinel — usually human-written, or from a prior version of this skill):**

If no Tier 1 hit, look for an existing note that's clearly about the same conversation, even when a human wrote it without any Fathom reference. Read like a human comparing two notes on the same call: same topic, same date-ish, same people — same conversation.

1. Pull notes on the person record within roughly **±14 days** of `recording_start_time` (people sometimes write notes days late, or jot prep notes ahead of a call). Don't gate on a tighter ±24h window — that misses the common case.
2. Run `mcp__attio__semantic-search-notes` scoped to this person record. Use the meeting's `meeting_title` plus the first ~500 chars of `default_summary.markdown_formatted` as the query. Take the top 3 hits.
3. For each hit inside the date window, fetch the body via `mcp__attio__get-note-body` and judge whether it covers the same meeting. Signals:
   - **Topic overlap.** Body content discusses the same decisions, action items, attendees, or subject matter as the Fathom summary. This is the strongest signal.
   - **Title alignment.** Title paraphrases the meeting (e.g. "Acme intro call notes" ≈ a Fathom meeting titled "Intro between Kyle and Acme") — exact substring not required.
   - **Date alignment.** Note created within the window above.

   You don't need a Fathom URL, the literal word "Fathom", or any other marker — humans writing manual notes won't include those, and that's exactly the case this tier exists for. Use judgment the way a person reading both notes side-by-side would: if it's clearly the same conversation, it's a duplicate.

4. If a hit clearly matches: **skip note creation**. Report under "skipped (probable manual duplicate)" with `{person email} — existing note: '{title}' ({note_date})`.
5. If genuinely borderline (some overlap but the topics don't fully line up — e.g. a related-but-distinct earlier conversation), proceed and flag under "creating despite possible overlap" so Kyle can verify.

This logic is per (meeting, person) pair — a single meeting may dedupe for one attendee and create for another, depending on what's already on each record.

### 6. Build the note body

Notes in Attio are stored as plain text — markdown isn't rendered. We still write markdown-style markers (`###`, `-`) because they read fine as plain text and structure the content visually.

Use this template exactly (no leading/trailing blank lines, single blank line between sections):

```
Fathom: {meeting_title} — {YYYY-MM-DD}

Recorded by: {recorded_by.name} <{recorded_by.email}>
When: {recording_start_time → HH:MM}–{recording_end_time → HH:MM} UTC ({duration_minutes} min)
Recording: {url}

### Summary
{default_summary.markdown_formatted, trimmed}

### Action Items
- [ ] {description} — assignee: {assignee.name or "unassigned"} ({recording_timestamp})
- [x] {description} — assignee: {…} ({…})    ← if completed=true
(omit this section entirely if action_items is empty)

### Attendees
- {name} <{email}> (external)
- {name} <{email}>
…

[fathom-recording-id:{recording_id}]
```

Rules:
- Strip any `## Summary` heading that's already inside `markdown_formatted` so we don't end up with a duplicate header.
- Convert times to a stable format. Local time isn't worth the complexity — keep it UTC and label it.
- If `default_summary.markdown_formatted` is empty/null, write `_no summary captured_` under the Summary heading rather than leaving it blank.
- Keep the note compact — don't paste transcripts. The recording URL is enough for anyone who needs the full content.
- The sentinel must be the **last line** of the body (no trailing whitespace) and use the literal `recording_id` integer from Fathom — don't reformat it. This is what step 5 grep matches against on future runs.

### 7. Create the note in Attio

For each (meeting, external attendee) pair, call `mcp__attio__create-note`:

- `parent_object`: `people`
- `parent_record_id`: the upserted person's record id
- `title`: `Fathom: {meeting_title} — {YYYY-MM-DD}` (same as the body's first line)
- `format`: `plaintext` (Attio doesn't render markdown for our workspace; even if it did, our content is markdown-flavored plain text and we want it stored verbatim)
- `content`: the body from step 6

### 8. Connection strength (judgment-based by default)

The Attio attribute is `custom_connection_strength` (writable, select). Allowed options:

| Title    | When it fits                                                                 |
|----------|------------------------------------------------------------------------------|
| Strong   | Active customer, repeat meetings, high engagement / advocacy.                |
| Warm     | Booked + held meeting, ongoing thread, real interest.                        |
| Light    | One-off intro / casual chat, low signal so far, unclear next step.           |
| Cold     | No engagement, reached out and went silent — usually NOT a meeting outcome.  |
| Unknown  | Genuinely no signal; default for fresh records that haven't been worked.     |

Default behavior (`judgment`):
- For any external attendee who actually had a recorded meeting, the floor is **Light** and the typical mapping is **Warm** (a held meeting *is* warmth).
- Only **upgrade** existing values. If they're already `Warm` and this was a real conversation, leave them. If they're already `Strong`, definitely leave them. If they're `Cold` or `Unknown` and you just had a real meeting, bump to `Warm`.
- If a person clearly fits **Strong** (e.g. multi-meeting customer, signed contract context in the summary), set it.
- **Never downgrade** automatically. If something feels worse, surface it to Kyle in the report instead of writing it.

Other modes:
- `skip` → don't touch the field for anyone.
- `force:<value>` → set every synced person to that value (validate against the table above first).

To update, call `mcp__attio__update-record` with `object: people`, `record_id`, and `data: { custom_connection_strength: "Warm" }` (use the title string; the MCP resolves it to the option id).

If you change the value, mention it in the report. If you leave it because it's already higher, don't bother mentioning.

### 9. Report back

End with a compact summary, e.g.:

```
Fathom account: KYLE_FATHOM_API_KEY
Range: 2026-04-17 → 2026-04-24
Meetings fetched: 5 (2 internal-only, skipped).
Notes created: 6 (across 5 unique people).
Skipped (already synced — sentinel match): 3.
Skipped (probable manual duplicate): 1.
  - jane@acme.com — existing note: 'Acme intro call notes (Apr 22)'
Connection strength changes:
  - alice@acme.com: Unknown → Warm
  - bob@beta.com: Cold → Warm
```

If anything failed (e.g. rate-limited, person upsert errored), list it explicitly. Don't bury failures.

## Constraints

- **Don't ever log or print the API key value.** Reference it only by env var name.
- **Don't run this against production Attio with a `placeholder` key.** The check in step 1 prevents this; don't bypass it.
- **Don't overwrite existing person fields** beyond `email_addresses` and `name` during upsert. We're recording history, not editing identities.
- **Don't downgrade `custom_connection_strength` automatically.** If you think a person belongs lower, raise it in the report and let Kyle decide.
- **Don't include transcripts in notes.** Summary + action items + recording URL only — the transcript is one click away in Fathom.

## Edge cases

- **Same person, multiple meetings in range** → one note per meeting, all on the same person record. Don't merge.
- **Person matches via email but the Fathom name disagrees with Attio** → leave Attio's name alone (upsert with email match shouldn't overwrite name on existing records; if it tries to, drop the `name` field from the upsert data for that person).
- **Meeting has only internal attendees** → skip the whole meeting.
- **Action items reference internal assignees** → still include them; they're part of the meeting record.
- **Empty / null summary** → still create the note (the action items + attendees + URL are useful on their own); write `_no summary captured_` under the Summary heading.

## Running for multiple accounts

To sync both Kyle's and Josh's Fathom accounts, invoke this skill **twice in sequence** — once with `KYLE_FATHOM_API_KEY` and once with `JOSH_FATHOM_API_KEY`. No coordination is required between the runs:

- The Attio per-person dedupe in step 5 catches any meeting that both accounts attended (the second run sees the sentinel from the first and skips).
- Each run produces its own report; aggregate them for the user if the original ask was "sync both."

If the user said "sync Fathom to Attio" without specifying an account, default to running for both accounts. If they named one ("sync my Fathom" / "sync Josh's"), run only that one. If a key is unset / `placeholder`, skip that account and call it out in the final aggregate.
