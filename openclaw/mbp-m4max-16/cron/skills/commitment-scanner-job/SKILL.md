---
name: commitment-scanner-job
description: Scan Kyle's iMessages for commitments he made. In-person meeting commitments go to Google Calendar; all other commitments become Apple Reminders. Primarily used by the `daily-commitment-scanner` cron job — rarely invoked manually.
---

Scan Kyle's iMessages for commitments he made. ONLY scan 1:1 chats. SKIP all group chats.

Time window (strict):
- Only include messages from the last 24 hours in America/Vancouver.
- Use rolling time (now minus 24h to now), NOT calendar-day boundaries.

## Scan Steps

1) Run: imsg chats --limit 30 --json
2) Keep only 1:1 chats (no groups)
3) For each 1:1 chat, run: imsg history --chat-id <id> --limit 80 --json
4) Keep only messages within the strict last-24-hours window above
5) Identify commitment messages FROM Kyle (is_from_me=true): "I'll", "I will", "let me", "I'll send", "I'll check", "I'll follow up", "I'll call", etc. Also identify CONFIRMED in-person meeting agreements where BOTH parties explicitly agreed (see classification below).
6) Skip trivial commitments. Also skip unconfirmed proposals/suggestions — if Kyle proposed something (e.g., "we could do lunch Sunday") but the other person hasn't confirmed, that is NOT a commitment.

## Contact Resolution (for every commitment)

7) Resolve the contact by running this exact command with the best available identifier and display name from chat metadata:
   brain contact resolve --identifier "<identifier>" --mode reminder_title [--display-name "<display_name>"]
   - Parse the returned JSON.
   - If `resolved` is false or `label` is null, skip this item and count it as unresolved.

## Classification: In-Person Meeting vs Other Commitment

After identifying each commitment, classify it into one of two buckets:

### → Google Calendar Event (CONFIRMED in-person meetings ONLY)

This is the highest bar. BOTH conditions must be true:
1. The conversation is clearly about meeting in person (not a call, not remote)
2. **BOTH parties have explicitly confirmed.** Kyle said yes AND the other person said yes. There is mutual agreement on a specific plan.

Examples of CONFIRMED (calendar event):
- Sean: "Thursday around noon?" → Kyle: "Works for me! Lets do it" ✅ (both agreed, specific time)
- Kyle: "Want to grab dinner Friday?" → Friend: "Yes! 7pm works" → Kyle: "Perfect" ✅ (both agreed)

Examples of NOT CONFIRMED (do NOT create anything — not even a reminder):
- Kyle: "If available Sunday, we could do lunch" → other person hasn't responded yet ❌ (one-sided proposal)
- Kyle: "We should hang out sometime" → no specific plan ❌ (vague)
- Kyle: "Let me know if you want to grab coffee next week" → waiting for response ❌ (open question)
- Friend: "Want to meet up?" → Kyle hasn't responded yet ❌ (no confirmation from Kyle)

**Key principle:** A proposal or suggestion is NOT a commitment. Only mutual, explicit agreement counts. If one side proposed and the other hasn't confirmed, skip it entirely — no calendar event, no reminder.

**Also NOT in-person meetings** (these may still be reminders if Kyle committed to an action):
- "I'll call you", "I'll text you", "I'll send that", "I'll check on that", "I'll follow up"
- Phone/video calls, FaceTime
- Sending something, looking into something, any remote action

### → Apple Reminder (action commitments only)

Commitments where Kyle said he would DO something specific: follow-ups, calls, checks, sends, research, etc. These are actions Kyle owes someone.

### → Nothing (skip entirely)

- Proposals/suggestions that haven't been confirmed by both sides
- Trivial or vague statements
- Anything where the other person hasn't responded

## Action: Google Calendar Event (in-person meetings)

8a) Determine the meeting date and time from the conversation:
    - If a specific time is discussed (e.g., "Thursday around noon", "Sunday at 6pm") → use that time
    - If only a day is mentioned with no time (e.g., "Sunday", "next Wednesday") → default to 12:00 PM (noon)
    - Resolve relative days ("tomorrow", "Thursday", "next week") against the current date in America/Vancouver

9a) Create a 2-hour calendar event on Kyle's primary Google Calendar:
    gog calendar create primary --summary "<what> with <resolved contact name>" --from "<YYYY-MM-DDTHH:MM:SS-07:00>" --to "<YYYY-MM-DDTHH:MM:SS-07:00>"

    - Summary should be natural and descriptive (e.g., "Lunch with Sean Pearson", "Dinner with Devon Kraan", "Chess + food with Sean Pearson")
    - Pull context from the conversation to make the summary useful
    - NEVER add attendees — these are internal-only calendar blocks for Kyle
    - Always use America/Vancouver timezone offset in the ISO timestamps

## Action: Apple Reminder (other commitments)

8b) Determine due date:
    - If user text says "tomorrow" → tomorrow
    - "next week" → next Monday
    - otherwise default to 3 days out

9b) Create reminder only for resolved contacts:
    remindctl add --title "<action> - <resolved contact name>" --due "<YYYY-MM-DD>"

## OUTPUT RULES (CRITICAL — FOLLOW EXACTLY):
- If NO commitments were found or created: your ENTIRE response must be the single word NO_REPLY. Nothing else. No reasoning, no scan summary, no explanation, no "I scanned X chats" — literally just NO_REPLY.
- If commitments WERE created: reply with ONLY a concise summary of what was created (reminders AND/OR calendar events). If any were skipped due to unresolved contacts, add one line: "Skipped unresolved contacts: <count>"
- NEVER include intermediate work, debug output, SQL results, or narration in your response.
