---
name: remind
description: "Handle reminder and scheduled check-in requests from any surface. Defaults to Apple Reminders for most cases; falls back to one-shot cron jobs only for same-day casual nudges or timed notification sequences. Use when Kyle says 'remind me', 'check in on me', 'wake me up', 'text me at', or describes a sequence of timed messages."
---

# Remind

Handle reminder requests. **Default to Apple Reminders.** Only use cron jobs for same-day push notifications.

## Routing Decision

### → Apple Reminders (default)

Use for **any reminder that represents a task, follow-up, or thing Kyle needs to do** — regardless of when it's due (today, tomorrow, next week, whenever).

Examples:
- "Remind me to email Jad on Tuesday"
- "Remind me to text Andy next week"
- "Remind me to take out the laundry"
- "Remind me about the report due Friday"
- "Remind me to call Harrison back"
- "Remind me to follow up with the accountant in 2 weeks"
- "Remind me to buy groceries tomorrow"

**Why:** These are trackable tasks. They sync to Kyle's phone, show up in his Reminders app, and persist until completed. This is the right default for 90%+ of requests.

### → Cron Job (text Kyle via iMessage)

Use **only** when ALL of these are true:
1. **Same-day** — the reminder is for today, not a future date
2. **Casual/ephemeral** — it's a push notification, not a task to track
3. **Time-sensitive delivery matters** — Kyle wants to be *texted* at a specific moment

Examples:
- "Remind me in 20 minutes" (same-day, casual nudge)
- "Text me at 3pm to leave for the airport" (same-day, time-critical push)
- "Check in on me every hour this morning" (same-day sequence)
- "Set up wake-up reminders for my 5:45am departure" (same-day timed chain)
- "Send me a few reminders throughout the morning to stay on track" (same-day motivational nudges)

**Why:** These are ephemeral — the value is in being *pinged at the right moment*, not in tracking a task. Apple Reminders notifications are easy to miss; a text message gets attention.

### Edge Cases

- **"Remind me in 2 hours" and it's a task** (e.g., "remind me in 2 hours to call the dentist") → Apple Reminder. The task matters more than the ping.
- **"Remind me in 20 minutes"** with no specific task, just a general nudge → Cron job. It's same-day and ephemeral.
- **Ambiguous?** Default to Apple Reminders. When in doubt, a tracked reminder is more useful than a fleeting text.

## Workflow: Apple Reminders Path

1. **Parse the request:**
   - What: the task or thing to remember
   - When: resolve the due date/time against `America/Vancouver`
   - "Tomorrow morning" = 9:00 AM, "end of day" = 5:00 PM, "tonight" = 8:00 PM, "next week" = next Monday 9:00 AM (unless context says otherwise)

2. **Resolve contacts** (if the reminder involves a person):
   - Run the deterministic resolver directly:
     ```bash
     brain contact resolve --identifier "<identifier>" --mode reminder_title [--display-name "<display_name>"]
     ```
   - Parse the JSON result and use `label` when present.
   - If unresolved, use a neutral person-less title or ask for clarification

3. **Create the Apple Reminder:**
   ```bash
   remindctl add --title "<concise reminder text>" --due "<YYYY-MM-DD HH:mm>"
   ```
   - Title should be actionable and concise: "Email Jad", "Call Harrison", "Take out laundry"
   - If no specific time, use a sensible default for the day (9:00 AM for morning, etc.)

4. **Confirm** to Kyle: what reminder was created, when it's due.

## Workflow: Cron Job Path (Same-Day Push Only)

1. **Parse the request:**
   - What: the message(s) to send
   - When: the time(s), resolved against current time in `America/Vancouver`
   - Use judgment for sequences (spacing, escalating urgency, etc.)

2. **Resolve contacts** (if applicable):
   - Same as above — run `brain contact resolve ...` and use the returned JSON

3. **Create one-shot cron job(s):**
   - One job per timed message
   - `schedule.kind = "at"` with ISO-8601 datetime
   - `sessionTarget: "isolated"` with `payload.kind: "agentTurn"`
   - `delivery.mode: "announce"`, `delivery.channel: "bluebubbles"`, `delivery.to: "+16043684730"`
   - Jobs auto-delete after firing (`deleteAfterRun: true`)
   - Keep the agent prompt concise: describe what to say, include context, end with "Output ONLY the message text."

4. **Confirm** to Kyle: what, when, how many messages are scheduled.

## Key Rules

- **Send exactly ONE message to Kyle: the final confirmation.** No intermediate progress updates.
- Always use `America/Vancouver` timezone
- Keep reminder text actionable and concise
- If contact resolution fails, prefer a neutral title or ask a quick clarification
- If the time is ambiguous, pick the most reasonable interpretation and confirm
- For sequences (cron path), use judgment on spacing and tone — earlier messages gentler, later ones more urgent

## Examples

**"Remind me to call Harrison next Tuesday"**
→ Apple Reminder: "Call Harrison", due next Tuesday 9:00 AM ✅

**"Remind me to email Gwen on Friday"**
→ Resolve Gwen's contact info
→ Apple Reminder: "Email Gwen", due Friday 9:00 AM ✅

**"Remind me to take out the laundry in 2 hours"**
→ Apple Reminder: "Take out laundry", due in 2 hours ✅

**"Remind me in 20 minutes"** (no specific task, just a nudge)
→ Cron job: texts Kyle in 20 min with a casual ping 📱

**"Text me at 3pm to head to the airport"**
→ Same-day push → Cron job at 3:00 PM, texts "Time to head to the airport" 📱

**"Set up morning check-ins for my 8:45am flight, leaving at 5:45am, waking up at 3am"**
→ Same-day sequence → 4 cron jobs: 3:00 AM, 3:30 AM, 5:15 AM, 5:45 AM 📱

**"Remind me to follow up with the accountant next month"**
→ Apple Reminder: "Follow up with accountant", due next month ✅
