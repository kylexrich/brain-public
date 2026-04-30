---
name: health-nag-job
description: Check Kyle's Apple Health workout data for the day and nag him about missing activities (gym, run, stretch). Primarily used by health-nag cron jobs at different times of day — rarely invoked manually. Expects an INPUT section specifying the time slot.
---

## INPUT

This skill expects the cron job message to include one of these time slots:
- `SLOT=morning` (morning brief embed)
- `SLOT=noon` (12:00 PM check)
- `SLOT=afternoon` (2:30 PM check)
- `SLOT=evening` (6:30 PM check)
- `SLOT=night` (8:30 PM check)
- `SLOT=latenight` (9:30 PM check)

## DATA SOURCE

Read today's workout file:
```
/Users/kylerich/Library/CloudStorage/GoogleDrive-kylexrich@gmail.com/My Drive/Health Auto Export/Apple Health Workouts/HealthAutoExport-YYYY-MM-DD.json
```
Use today's date in America/Vancouver timezone for the filename.

If the file doesn't exist or is empty, assume NO workouts have been done today.

## DETECTION RULES

Parse `data.workouts[]` and check for:

1. **Gym (strength training):** Any workout where `name` is `"Traditional Strength Training"`
2. **Run (5km+):** Any workout where `name` contains `"Run"` AND `distance.qty >= 5.0` (km). Short runs under 5km (like warm-up jogs to/from gym) do NOT count.
3. **Stretch:** Any workout where `name` is `"Flexibility"`

## TIME SLOT BEHAVIOR

### SLOT=morning (morning brief)
This slot is embedded inside the daily brief — it's NOT a standalone message. Output ONLY the motivational text (no emoji header, no "Fitness" label — the daily brief adds those).
- Ignore today's workout data. Nothing is expected to be done yet.
- Generate a short, random motivational message to start the day. Vary it every time — pull from different angles:
  - Hype/energy: "New day, new gains. Let's get after it."
  - Accountability: "Three boxes today — gym, run, stretch. No shortcuts."
  - Challenge: "Yesterday's version of you is watching. Make him proud."
  - Simplicity: "Move your body today. That's the whole plan."
  - Humor: "Your muscles miss you. Don't ghost them again."
- Keep it to 1-2 sentences. Punchy, not preachy. No corporate motivational poster energy.
- Do NOT reference yesterday's results or any specific workout data.

### SLOT=noon (12:00 PM)
For each activity NOT yet completed today, include a reminder. Tone: encouraging nudge.
- Gym: "You haven't hit the gym yet today — still time!"
- Run: "No run logged yet — get those 5k in."
- Stretch: "Don't forget to stretch today."
If ALL three are done, say something like "Crushed it already — gym, run, and stretch all done before noon. Beast."

### SLOT=afternoon (2:30 PM)
Same as noon — remind about any activity NOT yet completed. Tone: slightly more urgent.
- Gym: "Still no gym today — afternoon session?"
- Run: "Still haven't run — there's daylight left."
- Stretch: "Stretching still not done — make time for it."
If ALL three are done, brief congrats and move on.

### SLOT=evening (6:30 PM)
This is the cutoff for gym and run. Tone shifts depending on status:
- **Gym not done:** It's too late now. Give him shit but be motivational about tomorrow. Example: "No gym today. That's a miss — own it and get after it tomorrow morning."
- **Run not done:** Same — too late. "Didn't get the run in. Tomorrow, no excuses — 5k minimum."
- **Stretch not done:** This is still possible. Be strict: "Kyle, you haven't stretched yet and you only have a few hours left. Seriously — go stretch. Right now."
- If everything is done, genuine props.

### SLOT=night (8:30 PM)
ONLY mention stretching. Gym and run are irrelevant at this point — do not bring them up at all.
- **Stretch not done:** Be very strict and direct. "Kyle. It's 8:30 and you still haven't stretched. Stop what you're doing and go stretch. No excuses. This is non-negotiable."
- **Stretch done:** Brief acknowledgment, nothing more. "Stretching done. Good night."

### SLOT=latenight (9:30 PM)
The day is done. Nothing can be changed. This is a final scorecard — blunt and honest.
- Check all three activities. Summarize what got done and what didn't.
- **Everything done:** Short genuine props. "Clean sweep today. Gym, run, stretch — all done. Get some sleep."
- **Anything missing:** Give him shit. Be real, not cruel — but don't sugarcoat it. The tone is "you know you could've done better." Call out exactly what was missed. End with motivation for tomorrow — tomorrow is a fresh start, no excuses.
- Keep it short. 2-3 sentences max. No pep talks, no lists, no breakdowns. Just the truth and a push for tomorrow.

## COMMON RULES

- Plain text only. No markdown, no bold, no code blocks. TTS-friendly.
- Keep messages concise but with personality. Be direct, not corporate.
- Vary the wording naturally — don't use the exact example phrases every time.
- When giving shit, be real but motivational. Not mean, not soft. Like a friend who actually cares.
- Do NOT list workout stats or durations. Just whether it's done or not.
- Do NOT mention the 5km threshold explicitly. Just say "run" or "get your run in."
- If an activity isn't completed, just say it's not done. Do NOT add context about partial/insufficient progress (e.g., don't mention warm-up jogs, short runs, or anything that didn't count). Incomplete is incomplete — state it and move on.

## OUTPUT RULES (CRITICAL)

- Your ENTIRE response must be ONLY the message text Kyle will read.
- NEVER include reasoning, narration, tool call summaries, or preamble.
- The delivered message IS your entire reply.
