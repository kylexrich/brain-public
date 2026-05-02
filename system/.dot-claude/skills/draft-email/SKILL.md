---
name: draft-email
description: Draft an email in Kyle's EMLY Gmail account (kyle@emlyai.ca) via gog, with his EMLY AI signature appended. Use whenever Kyle asks to draft, compose, or write an email, reply to a thread, or send a message via Gmail — anything that ends up as a Gmail draft should route through this skill so the signature isn't forgotten and replies thread correctly.
user-invocable: true
allowed-tools:
  - Bash
  - Read
  - Write
  - mcp__cdc29489-c9b8-43a2-9279-fbf1e4723c91__search_meetings
  - mcp__cdc29489-c9b8-43a2-9279-fbf1e4723c91__list_meetings
  - mcp__cdc29489-c9b8-43a2-9279-fbf1e4723c91__get_meeting_summary
  - mcp__cdc29489-c9b8-43a2-9279-fbf1e4723c91__get_meeting_transcript
---

# /draft-email — Gmail draft via gog with EMLY signature

Creates a Gmail draft in Kyle's EMLY account via the `gog` CLI, with his branded HTML signature appended. The signature lives alongside this skill at `signature.html` (adapted from `~/Developer/emly/docs/marketing/email-signature.html`).

## Account targeting

This skill always targets the **EMLY** account. Use the env var `$EMLY_GOOGLE_ACCOUNT_EMAIL_ADDRESS` (set in `system/zshrc/.env`) — never hardcode the email. If Kyle wants to draft from his personal Google account, this is the wrong skill.

Every `gog` call must pass `--account "$EMLY_GOOGLE_ACCOUNT_EMAIL_ADDRESS"`. The OAuth client (`default`) is shared across both accounts and resolves implicitly.

## Why this exists

Gmail's web signature setting doesn't apply to drafts created via API. Without this skill, every AI-drafted email either ships unsigned or with an ad-hoc text sig. Replies created without `--reply-to-message-id` also break threading — they show up as new top-level messages instead of attaching to the original conversation. Route drafts through here so the brand stays consistent and threads stay clean.

## Workflow

### 1. Gather inputs

From the conversation, collect: recipients (`to`, optionally `cc` / `bcc`), subject, and the body Kyle wants to send. If anything required is missing and can't be reasonably inferred, ask once, briefly.

- **Thread continuity (default)** — for any recipient Kyle has emailed before, especially customers, prospects, partners, or anyone with an active business relationship, search Gmail for an existing thread first and **default to threading the new draft into the most recent relevant conversation** rather than starting a top-level email. This applies even when Kyle phrases the ask as "draft an email to X" without explicitly saying "reply" or "follow up". A continuing thread keeps the customer's mental model of the relationship intact and gives them all prior context in one place. Start a new thread only when:
  1. The topic is genuinely unrelated to anything in the existing thread (e.g. cold partnership pitch vs. ongoing customer support).
  2. The existing thread is clearly stale (months without traffic).
  3. Kyle explicitly says "send a new email", "fresh thread", or similar.
  4. The existing thread is messy enough (broadcast lists, stray misfires, dead-ends) that threading would create more confusion than clarity. In this case, **flag the trade-off** in your final report rather than silently starting a new thread, so Kyle can decide.
- **Meeting follow-ups** — if the draft recaps a call or meeting (phrases like "follow up on my call with X", "recap the demo", "send Jane the notes from earlier"), pull context from the Fathom MCP first. Use `search_meetings` or `list_meetings` to find the right recording, then `get_meeting_summary` for the recap or `get_meeting_transcript` for direct quotes. Ground the email in what actually happened — decisions, action items, next steps — not generic filler. Meeting follow-ups almost always belong in the existing thread with that contact, not a new one.

### 2. Locate the reply target (default for known recipients)

When threading into an existing conversation (which should be the default per Step 1), you need the **message ID of the latest message in the thread** for proper threading.

- If Kyle gave a Gmail URL, parse the thread ID from it (URL format: `mail.google.com/mail/u/0/#inbox/<threadId>`, or `#all/<threadId>`, etc.).
- Otherwise, search for the original message:
  ```bash
  gog gmail search "<gmail-query>" --account "$EMLY_GOOGLE_ACCOUNT_EMAIL_ADDRESS" --json --results-only
  ```
  Use Gmail query syntax (`from:`, `subject:`, `to:`, date ranges) — narrow enough to surface a single thread. The result includes the thread `id`.
- Get the thread to find the latest message:
  ```bash
  gog gmail thread get <threadId> --account "$EMLY_GOOGLE_ACCOUNT_EMAIL_ADDRESS" --json --results-only
  ```
  Take the **last** entry in `thread.messages[]` — its `id` is what you'll pass to `--reply-to-message-id`. (For single-message threads, thread ID and message ID are the same.)
- Set the subject to `Re: <original subject>` (don't double the `Re:` if it's already there).

### 3. Voice-match from Kyle's sent mail

Before writing anything, pull a handful of his recent sent emails so the draft sounds like him, not like a generic LLM:
```bash
gog gmail search "in:sent -from:noreply -category:promotions -label:marketing" --account "$EMLY_GOOGLE_ACCOUNT_EMAIL_ADDRESS" --json --results-only
```
Read 3–5 recent threads via `gog gmail thread get <threadId> --account "$EMLY_GOOGLE_ACCOUNT_EMAIL_ADDRESS" --json --results-only`. Skip marketing-flavored threads — newsletters, cold outbound, bulk announcements — those are written in brand voice, not personal voice. Look for how he opens, how he closes, sentence length, contractions, formality, recurring phrases. Match that register. If the recipient is someone Kyle has emailed before, bias toward threads with that person specifically.

### 4. Read the signature

Use the `Read` tool on `signature.html` in this skill's directory to get the current HTML signature markup verbatim.

### 5. Compose the bodies

**HTML body** — convert Kyle's text into simple HTML (wrap paragraphs in `<p>`, blank lines = paragraph breaks; clean — no heavy styling that fights the signature). Append two `<br>` for visual separation, then the full signature HTML verbatim.

**Plain-text body** (fallback for clients that don't render HTML) — Kyle's text followed by:
```
Kyle Rich
Co-Founder & CEO, EMLY AI
emlyai.ca | kyle@emlyai.ca
```

### 6. Write bodies to temp files

Multi-line content flows safely through the shell when it's piped from a file. Use the `Write` tool:
- `/tmp/draft-body.html` ← HTML body
- `/tmp/draft-body.txt` ← plain-text body

### 7. Create the draft

```bash
gog gmail drafts create \
  --account "$EMLY_GOOGLE_ACCOUNT_EMAIL_ADDRESS" \
  --to "<to-list>" \
  [--cc "<cc-list>"] \
  --bcc "<bcc-list-including-broadcast@emlyai.ca>" \
  --subject "<subject>" \
  --body-file /tmp/draft-body.txt \
  --body-html "$(cat /tmp/draft-body.html)" \
  [--reply-to-message-id "<latestMessageId>"] \
  --json --results-only
```

- **Always include `broadcast@emlyai.ca` in `--bcc`** — this is the EMLY broadcast inbox and every outgoing draft from Kyle is archived there. If Kyle specified other BCC recipients, append `broadcast@emlyai.ca` rather than replacing them. Don't mention the BCC in the visible body.
- Omit `--cc` entirely if there are no CCs (don't pass an empty string).
- Include `--reply-to-message-id` only for replies — it sets `In-Reply-To`/`References` headers and threads the draft under the existing conversation.
- `--body-file` is safe for arbitrary plain text. `--body-html` uses `$(cat ...)` because gog has no `--body-html-file` flag; command substitution captures the file content as a single literal argument (no shell re-evaluation of HTML contents).

### 8. Clean up and report

- `rm -f /tmp/draft-body.html /tmp/draft-body.txt`
- Report back with the draft ID, recipient list, threading status (new vs. reply, with the thread ID if reply), and a one-line confirmation. **Don't send.**

## Signature rules

- Use the signature exactly as stored in `signature.html`. Don't edit wording, colors, or links inline — if it needs to change, edit `signature.html` (which should stay in sync with `~/Developer/emly/docs/marketing/email-signature.html`).
- The signature is a `<table>`-based layout for email-client compatibility. Do not wrap it in extra `<div>`s, `<p>`s, or style tags that could break rendering in Gmail / Outlook.
- The signature goes at the very bottom, after Kyle's content. Never above.
- Don't duplicate the signature if Kyle's provided body already ends with one — check for `emlyai.ca` or `EMLY AI` near the tail and skip appending if it's clearly already there.

## Booking / scheduling links

Whenever a draft includes a "book a call", "schedule a meeting", "find a time", reschedule, or rebooking CTA, follow these rules.

### Pick the right URL

There are two canonical booking links. Default to the first; only swap to the second when the email is specifically about an EMLY product consultation.

**1. Default — Kyle's personal booking page (use this for almost every meeting request):**
```
https://cal.com/emly-ai/chat-with-kyle-emly-ai
```
Use this for general "chat with Kyle", intros, catch-ups, partner/investor/sales convos, anyone wanting time on his calendar that isn't specifically an EMLY product demo.

**2. EMLY AI consultation (only when the email is specifically about an EMLY consultation/demo):**
```
https://emlyai.ca/schedule-session/personal
```
Use this only for reschedules / reminders / follow-ups on an EMLY consultation booking — i.e., when the recipient already booked a "30 Min Intro Meeting" / consultation and you're getting them back into that same flow. The page wraps the EMLY consultation Cal embed.

For team/group sessions (rare; 2-hour workshops), `https://emlyai.ca/schedule-session/team` exists — use only if Kyle explicitly asks.

Never link to:
- The bare `https://emlyai.ca/schedule-session` index (it's just a chooser between personal and team — adds an unnecessary click).
- Old Google Calendar appointment URLs (`calendar.google.com/appointments/schedules/...`).

### Always personalize the link

Cal.com's documented prefill params work on both URLs (the EMLY page forwards them into its Cal embed). URL-encode every value (spaces → `%20`, `@` → `%40`, etc.). Build the personalized URL once, then use it identically in the HTML body's `href` and the plain-text body's URL.

**Auto-include (always, no confirmation needed):**

| Param | Rule | Example |
|---|---|---|
| `name` | Always include if you can find a name on the contact | `name=Nicole%20Kabongo` |
| `email` | Always include if you can find an address on the contact | `email=info%40realtornicolekabongo.com` |

Pull from any source you have — recipient line on the email itself, calendar event invitee list, prior email threads, Fathom attendee list, Attio record. Don't invent values; if you can't find one, omit the param. No need to ask before including these.

**Never auto-include — confirm-after-the-fact only:**

| Param | Rule |
|---|---|
| `notes` | Do NOT auto-include. The draft goes out first without it. |
| `guests` | Do NOT auto-include. The draft goes out first without it. |

If — *after creating the draft* — you have a high-confidence reason to think `notes` or `guests` would meaningfully improve the booking flow (e.g., the original calendar invite had a clear business-name/industry/pain-point context worth carrying forward, or the original meeting had additional attendees who should also be invited to the rebooked call), report the draft as done and then offer the recommendation as a follow-up. Use this shape:

> Draft created — [draftId]. I think `notes` and/or `guests` would be beneficial here and I feel confident. My recommendations:
> - **notes:** "Real estate — phone-management pain point" (pulled from the original Cal.com booking form responses)
> - **guests:** none
>
> Want me to update the draft to include these?

Only offer when you actually have something specific and useful — don't fish. If neither would clearly help, ship the draft and stop. Kyle can always ask afterward.

**Note on first/last name split:** Cal.com's documented embed prefill is the single combined `name` field — don't try `firstName` / `lastName` query params unless you've verified the specific Cal event type's booking form actually supports them. Default to `name`.

## Defaults

- If Kyle doesn't specify a sign-off (e.g. `Best,`) but the message reads like it needs one, add `Best,` on its own line before the signature. If the message is already complete, leave it alone.
- If no subject is provided and the content doesn't suggest one, ask.
- Never send the draft — `gog gmail drafts create` only stages it; Kyle reviews and sends himself. (Sending would use `gog gmail drafts send <draftId>`, which this skill never invokes.)
