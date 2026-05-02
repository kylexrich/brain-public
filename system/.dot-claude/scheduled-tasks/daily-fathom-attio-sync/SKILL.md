---
name: daily-fathom-attio-sync
description: Daily 10pm sync of Fathom meetings into Attio for both Kyle's and Josh's accounts.
---

Run the `sync-fathom-to-attio` skill for both Kyle's and Josh's Fathom accounts to push today's meetings into Attio.

Steps:
1. Invoke the `sync-fathom-to-attio` skill (located at `~/Developer/brain/system/.dot-claude/skills/sync-fathom-to-attio/SKILL.md` — read it before acting). The skill is scoped to a single Fathom account, so run it twice in sequence.
2. First run — inputs:
   - API key env var: `KYLE_FATHOM_API_KEY`
   - Time range: **today in PST** — i.e. the current calendar date in `America/Los_Angeles` (00:00:00 → 23:59:59 local), converted to UTC for the Fathom API. The cron fires at 10pm PT, so "today PST" = the day that's about to end. Compute it with `TZ=America/Los_Angeles date +%Y-%m-%d` to get the local date, then build the UTC window (PT → UTC offset is +7h during PDT, +8h during PST). Do **not** use UTC's "today" — once it's past 4–5pm PT, UTC has already rolled to tomorrow and you'll skip the day's meetings.
   - Connection-strength behavior: `judgment` (default)
3. Second run — inputs:
   - API key env var: `JOSH_FATHOM_API_KEY`
   - Time range: same as above (today PST, converted to UTC)
   - Connection-strength behavior: `judgment`
4. If a key is unset or set to the literal string `placeholder`, skip that account and call it out — don't fail the whole run.
5. Aggregate both per-account reports into one final summary covering: meetings fetched, notes created, skips (sentinel match vs. probable manual duplicate), and any connection-strength changes. Surface any failures explicitly — don't bury them.

Constraints:
- Never echo or log the API key value; reference keys only by env var name.
- Don't dedupe across the two account runs manually — the per-person sentinel check inside the skill handles cross-account overlap automatically.
- Don't downgrade `custom_connection_strength`; flag concerns in the report instead.