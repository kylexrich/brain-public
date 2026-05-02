---
name: job-daily-brief
description: Prepare Kyle's daily morning brief as ONE concise plain-text iMessage. Primarily used by the `Daily Brief` scheduled task — rarely invoked manually.
---

Prepare Kyle's daily brief as ONE concise plain-text iMessage.

STEP 2 — Birthdays 🎂 (only if any today)
Run: gog calendar events "addressbook#contacts@group.v.calendar.google.com" --today --json -a "$PERSONAL_GOOGLE_ACCOUNT_EMAIL_ADDRESS"
If the "events" array is non-empty, list each as: - <Name>'s birthday
If none, omit this section entirely.

STEP 3 — Tasks 🎯 (due TODAY only — NOT overdue)
Run: remindctl today --json
From the JSON output, ONLY include items whose dueDate falls on TODAY's calendar date (compare the YYYY-MM-DD portion of dueDate against today's date in America/Vancouver). EXCLUDE any item whose dueDate is before today — those belong in the Overdue section.
List each matching item as a bullet: - <title>
If none match today, omit section.

STEP 4 — Overdue 🚨 (due BEFORE today — mutually exclusive with Tasks)
Run: remindctl overdue --json
These are items with due dates strictly before today. They must NOT also appear in Tasks above.
List each as a bullet: - <title>
If none, omit section.

STEP 5 — Text Messages 💬
Run this exact SQLite query:
sqlite3 ~/Library/Messages/chat.db "SELECT c.chat_identifier, c.display_name, datetime(MAX(m.date)/1000000000 + 978307200, 'unixepoch', 'localtime') as last_unread, CAST(julianday('now','localtime') - julianday(datetime(MAX(m.date)/1000000000 + 978307200, 'unixepoch', 'localtime')) AS INTEGER) as days_old FROM message m JOIN chat_message_join cmj ON cmj.message_id = m.ROWID JOIN chat c ON c.ROWID = cmj.chat_id WHERE m.is_from_me = 0 AND m.is_read = 0 AND m.service = 'iMessage' AND m.item_type = 0 AND m.is_system_message = 0 AND m.is_service_message = 0 AND m.is_finished = 1 AND (m.text IS NOT NULL OR m.attributedBody IS NOT NULL OR m.cache_has_attachments = 1) AND c.chat_identifier NOT LIKE 'chat%' AND c.chat_identifier NOT IN ('+16043684730', 'kyledvrich@gmail.com') AND m.date > (strftime('%s', 'now', '-30 days') - 978307200) * 1000000000 GROUP BY c.chat_identifier ORDER BY MAX(m.date) DESC"

For each result row, resolve the contact name:
brain contact resolve --identifier "<chat_identifier>" --mode report
Parse the JSON and use the 'label' field as the display name.

Group results:
🟢 Green (<1 week): days_old < 7
🟠 Orange (1–2 weeks): 7 ≤ days_old ≤ 13
🔴 Red (2+ weeks): days_old ≥ 14
Format: - <Name> — <Mon D> (<N days>)
Sort each group most-recent first. If a group is empty: - None
If ALL groups empty, omit the entire Text Messages section.

STEP 6 — Fitness 🏋️
Generate a short motivational fitness message using the SLOT=morning logic from the health-nag skill. The rules:
- 1-2 punchy sentences. Vary it every time.
- Pull from different angles: hype, accountability, challenge, simplicity, humor.
- Do NOT check workout data — nothing is expected done yet in the morning.
- Do NOT read the health-nag SKILL.md. The logic is right here.
- Examples (do NOT reuse these verbatim — make up fresh ones):
  - "New day, new gains. Let's get after it."
  - "Three boxes today — gym, run, stretch. No shortcuts."
  - "Your muscles miss you. Don't ghost them again."
This section is always included (never omitted). It is the LAST section in the brief.

STEP 6 — Errors ⚠️️(only if any during run)
Bullet points of errors that occurred (if any) during the execution of this skill.

FORMAT RULES:
- Plain text only. No markdown, no bold, no code blocks. TTS-friendly.
- Section headers with emoji exactly as shown above.
- Blank line between sections.
- Omit any section with no content.
- If ALL sections are empty, return exactly NO_REPLY.

OUTPUT RULES (CRITICAL):
- Your ENTIRE response must be ONLY the final message text, or exactly NO_REPLY.
- NEVER include reasoning, narration, tool output summaries, or preamble.
