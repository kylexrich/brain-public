---
name: job-emly-prod-log-check
description: Scan EMLY production CloudWatch logs + alarm state for the recent window and post a health check to the EMLY #alarms Slack channel. Every run posts ONE new top-level message — a high-level summary phrased relative to the previous run (e.g. "1 new issue detected · 2 still open · details in thread") — and then drops ALL the in-depth debugging detail into a reply under that new message's own thread. Never replies into a prior run's thread. Always posts, even when clean. Primarily used by the three daily emly-prod-log-check scheduled tasks (morning/afternoon/evening) — rarely invoked manually.
---

# EMLY Prod Log-Health Check

Read EMLY's production logs and alarm state for a recent time window and surface it in the EMLY
`#alarms` Slack channel. Every run does exactly two posts, no exceptions:

1. **A new top-level message** — a short, high-level summary, **always phrased relative to the previous
   run's summary** (e.g. `⚠️ 1 new issue detected · 2 still open since last check · details in 🧵`, or
   `✅ All clear · nothing new since last check`). This is all that shows in the channel feed.
2. **One reply in that new message's own thread** — ALL the in-depth detail: full per-issue breakdown,
   samples, request ids, alarm state, and the re-pull commands for a debugging agent.

**Always a brand-new top-level message + its own fresh thread. Never reply into a prior run's thread.**
The "relative" wording comes from comparing this run's findings against the most recent prior summary,
which the run recovers by reading the channel (each run is a separate session — there is no in-process
memory). Because every run posts, silence is never mistaken for "all clear".

This is **read-only**. Never run any AWS command that creates, mutates, or deletes anything. Only
`logs filter-log-events`, `logs describe-log-groups`, and `cloudwatch describe-alarms`.

## INPUT

The caller provides:

```
SLOT: <morning | afternoon | evening>
```

If `SLOT` is missing, infer it from the current local hour (before 12:00 → morning, 12:00–17:59 →
afternoon, else evening).

## Config (from environment — do not hardcode)

| Var | Meaning |
|-----|---------|
| `$EMLY_PROD_AWS_PROFILE` | AWS CLI profile for the EMLY prod account |
| `$EMLY_PROD_AWS_REGION` | AWS region (all prod resources live here) |
| `$EMLY_PROD_LOG_GROUP_PREFIX` | Prod log-group prefix, e.g. the `api`/`sqs-worker`/`frontend` groups hang off it |
| `$EMLY_ALARMS_SLACK_CHANNEL_ID` | Slack channel id to post into |

If any required var is empty, post a failure check (see "If the check itself fails") rather than
silently doing nothing.

The application log groups are `${EMLY_PROD_LOG_GROUP_PREFIX}/api`,
`${EMLY_PROD_LOG_GROUP_PREFIX}/sqs-worker`, and `${EMLY_PROD_LOG_GROUP_PREFIX}/frontend`. Logs are
Pino-style JSON: numeric `level` (50/60 = error/fatal, 40 = warn, ≤30 = info/debug), plus `time`,
`msg`, `requestId`.

## Step 1 — Compute the window

Per-slot lookback (hours), chosen so the three daily runs tile the day with small, harmless overlaps:

| SLOT | Lookback |
|------|----------|
| morning | 13 |
| afternoon | 6 |
| evening | 7 |

```bash
LB=<lookback for this slot>
START_MS=$(( ($(date +%s) - LB*3600) * 1000 ))
WIN_START=$(date -r $((START_MS/1000)) '+%Y-%m-%d %H:%M %Z')
WIN_END=$(date '+%Y-%m-%d %H:%M %Z')
```

## Step 2 — Scan application logs

For `api` and `sqs-worker`, count errors and warns over the window (cap retrieved events with
`--max-items` to keep it cheap):

```bash
G="$EMLY_PROD_LOG_GROUP_PREFIX/api"
# error/fatal count + up to 50 sample events
aws logs filter-log-events --log-group-name "$G" --region "$EMLY_PROD_AWS_REGION" --profile "$EMLY_PROD_AWS_PROFILE" \
  --start-time "$START_MS" --filter-pattern '{ $.level >= 50 }' --max-items 50 \
  --query 'events[].{t:timestamp,m:message}' --output json
# warn count only
aws logs filter-log-events --log-group-name "$G" --region "$EMLY_PROD_AWS_REGION" --profile "$EMLY_PROD_AWS_PROFILE" \
  --start-time "$START_MS" --filter-pattern '{ $.level = 40 }' --max-items 1 --query 'length(events)' --output text
```

For `frontend` (Next.js — format is not guaranteed Pino), best-effort error scan:

```bash
aws logs filter-log-events --log-group-name "$EMLY_PROD_LOG_GROUP_PREFIX/frontend" --region "$EMLY_PROD_AWS_REGION" \
  --profile "$EMLY_PROD_AWS_PROFILE" --start-time "$START_MS" \
  --filter-pattern '?error ?Error ?ERROR ?exception ?Exception ?unhandledRejection' --max-items 50 \
  --query 'events[].{t:timestamp,m:message}' --output json
```

A group with zero matched events is healthy for that group — note it and move on. If a `filter-log-events`
call errors (bad creds, expired session, throttling), treat the whole check as failed (see below).

## Step 3 — Group the errors into signatures

For each error/fatal event, parse the JSON `message` and bucket by a **normalized signature**: prefer
`msg` (strip volatile bits — ids, numbers, request paths' query strings), else an error `code`/`name`.
For each bucket capture: count, earliest + latest `time`, one sample `requestId`, and one sample raw
line truncated to ~300 chars. Drop/avoid echoing any `authorization`/`cookie` material (the app already
redacts these as `[REDACTED]`; keep it that way). Keep the top 5 buckets by count.

Then derive a **stable signature key** (`sigKey`) for each bucket — this is how the run recognizes the
same issue across runs. Make it deterministic from the normalized signature: lowercase it, replace every
run of non-alphanumeric characters with a single `-`, trim leading/trailing `-`, cap at ~40 chars.
Example: `Usage period is not open for usage increment` → `usage-period-is-not-open-for-usage-increme`. Two
runs that see the same issue must produce the same `sigKey`.

## Step 4 — Check alarm state (the "metrics" signal)

```bash
aws cloudwatch describe-alarms --state-value ALARM --region "$EMLY_PROD_AWS_REGION" \
  --profile "$EMLY_PROD_AWS_PROFILE" --query 'MetricAlarms[].{n:AlarmName,r:StateReason}' --output json
```

Keep only **production, non-autoscaling** alarms: name contains `production` AND is NOT an autoscaling
alarm (drop names containing `TargetTracking`, `ScaleIn`, `ScaleOut`, `AlarmLow`, `AlarmHigh` — those
are normal capacity churn, not incidents). What remains (e.g. `[SEV1]`/`[SEV2]` alarms, DLQ alarms,
4xx/5xx alarms) is real. Give each a `sigKey` of `alarm-<slugified alarm name>` so it participates in
the same new/still-open diff as log issues.

## Step 5 — Diff against the previous summary

Let **currentSigs** = the set of `sigKey`s from Step 3 (top buckets) plus Step 4 (active prod alarms),
each with its count.

Recover the previous run's signatures by reading the channel newest-first and taking the **most recent
top-level message** (a parent — not itself a thread reply) whose text contains a `marv-sigs:` line:

```
slack_read_channel(channel_id=$EMLY_ALARMS_SLACK_CHANNEL_ID, limit=30)
```

Parse that line into **priorSigs** (its keys). If no prior summary exists (first run ever), treat
`priorSigs` as empty and phrase the summary without "since last check". Then:

- **new** = `currentSigs − priorSigs` (not in the last check)
- **stillOpen** = `currentSigs ∩ priorSigs` (was in the last check, still here)
- **cleared** = `priorSigs − currentSigs` (was in the last check, gone now)

## Step 6 — Post: new top-level summary, then its thread detail

Use the available Slack send-message tool against `$EMLY_ALARMS_SLACK_CHANNEL_ID`. Cap at 5 issue
buckets; truncate sample lines to ~300 chars. The header marks it automated-from-Marvin so the team
never confuses it with a real CloudWatch alarm page.

### 6a — Post the summary (top-level, no `thread_ts`)

This is the only thing in the channel feed: a high-level, relative status. Capture the returned message
`ts` as `SUMMARY_TS`. Pick the status line:

- `new` non-empty → `⚠️ {Nnew} new issue(s) detected · {NstillOpen} still open since last check · details in 🧵`
- `new` empty, `stillOpen` non-empty → `✅ No new issues · {NstillOpen} still open since last check · details in 🧵`
- `new` empty, `stillOpen` empty, `cleared` non-empty → `✅ All clear — {Ncleared} issue(s) from last check have cleared · details in 🧵`
- everything empty → `✅ All clear · nothing new since last check · details in 🧵`
- first run ever (no prior): drop "since last check" — `⚠️ {N} issue(s) detected · details in 🧵` or `✅ All clear · details in 🧵`

```
🐤 *Marvin · EMLY Prod Log Check* _(automated · {SLOT})_
{status line}
_{WIN_START} → {WIN_END}_
_marv-sigs: {sigKey1=count1, sigKey2=count2, … | none}_
```

The `marv-sigs:` line is required — the next run diffs against it. List a key for **every** current
bucket and active alarm (or `none`).

### 6b — Post the detail (one reply, `thread_ts=SUMMARY_TS`)

All the depth goes here, under the message just posted. Always post this reply, even on a clean run
(then it's just the group stats + "no errors"). Tag each issue 🆕 (new this check) or ↩︎ (still open).

```
*Details · {SLOT}* · _{WIN_START} → {WIN_END}_

• `api` — {api_err} errors · {api_warn} warns
• `sqs-worker` — {wrk_err} errors · {wrk_warn} warns
• `frontend` — {fe_err} error-ish

{if any issue buckets:}
*Issues* (top {k} by volume)
*1. {short title}* {🆕|↩︎} — {count}× · first {t1} · last {t2}
  • Group: `{log group}`
  • Signature: `{normalized msg/code}`
  • Sample requestId: `{req_...}`
  • Sample:
    ```{truncated raw line}```
{…repeat per bucket…}

{if `cleared` non-empty:}
*✅ Cleared since last check:* {comma-list of titles}

*Active prod alarms:*
• {alarm name} — {short state reason}
{…or "• none"…}

*For a debugging agent:*
• Scope: production · region `{region}` · AWS profile `{profile}` · all read-only
• Re-pull errors:
  ```aws logs filter-log-events --log-group-name {group} --region {region} --profile {profile} --start-time {START_MS} --filter-pattern '{ $.level >= 50 }'```
• Trace one request: re-run with `--filter-pattern '{ $.requestId = "req_…" }'`
• Deeper dive: EMLY repo debug skill (`.ai/skills/debug`, scope=production).
```

## If the check itself fails

If config is missing or any AWS call errors out, still do both posts — a broken check must be visible.

Summary (top-level):

```
🐤 *Marvin · EMLY Prod Log Check* _(automated · {SLOT})_
⚠️ Log check failed to run — prod health UNKNOWN this window · details in 🧵
_marv-sigs: none_
```

Then a thread reply (`thread_ts=SUMMARY_TS`) with the one-line reason, e.g.
`Could not complete the scan: aws logs filter-log-events returned ExpiredToken on /emly/production/api. Someone should check manually.`

## Markers (machine-readable, keep verbatim)

- `marv-sigs: {key=count, … | none}` — on **every** top-level summary. The next run finds the most
  recent top-level message carrying this line and diffs against its keys. Do not rename or reformat it.

## Output

After posting, respond with a single status line (no narration), e.g.
`Posted ⚠️ 1-new / 2-open check to #alarms (afternoon).` or `Posted ✅ all-clear check to #alarms (evening).`
Do not print log contents to the transcript — the Slack posts are the deliverable.
