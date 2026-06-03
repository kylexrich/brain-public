---
name: job-emly-prod-log-check
description: Scan EMLY production CloudWatch logs + alarm state for the recent window and post a templated health digest to the EMLY #alarms Slack channel. Always posts — "no issues found" when clean, full diagnostics when not. Primarily used by the three daily emly-prod-log-check scheduled tasks (morning/afternoon/evening) — rarely invoked manually.
---

# EMLY Prod Log-Health Check

Read EMLY's production logs and alarm state for a recent time window, decide whether anything looks
wrong, and post ONE templated digest to the EMLY `#alarms` Slack channel. Post **every run**, even when
everything is healthy — silence must never be mistaken for "all clear".

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
| `$EMLY_ALARMS_SLACK_CHANNEL_ID` | Slack channel id to post the digest into |

If any required var is empty, post a failure digest (see "If the check itself fails") rather than
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

## Step 3 — Group the errors

For each error/fatal event, parse the JSON `message` and bucket by a **normalized signature**: prefer
`msg` (strip volatile bits — ids, numbers, request paths' query strings), else an error `code`/`name`.
For each bucket capture: count, earliest + latest `time`, one sample `requestId`, and one sample raw
line truncated to ~300 chars. Drop/avoid echoing any `authorization`/`cookie` material (the app already
redacts these as `[REDACTED]`; keep it that way). Keep the top 5 buckets by count.

## Step 4 — Check alarm state (the "metrics" signal)

```bash
aws cloudwatch describe-alarms --state-value ALARM --region "$EMLY_PROD_AWS_REGION" \
  --profile "$EMLY_PROD_AWS_PROFILE" --query 'MetricAlarms[].{n:AlarmName,r:StateReason}' --output json
```

Keep only **production, non-autoscaling** alarms: name contains `production` AND is NOT an autoscaling
alarm (drop names containing `TargetTracking`, `ScaleIn`, `ScaleOut`, `AlarmLow`, `AlarmHigh` — those
are normal capacity churn, not incidents). What remains (e.g. `[SEV1]`/`[SEV2]` alarms, DLQ alarms,
4xx/5xx alarms) is real and goes in the digest.

## Step 5 — Decide status

- **⚠️ Issues** if there is **any** error/fatal event in `api` or `sqs-worker`, OR any error-ish
  `frontend` event, OR any production non-autoscaling alarm currently in `ALARM`.
- **✅ No issues found** otherwise. (Warns alone do not flip the status — report their counts, don't alarm on them.)

## Step 6 — Post the digest to Slack

Post to channel id `$EMLY_ALARMS_SLACK_CHANNEL_ID` using the available Slack send-message tool. Use one
of the two templates below verbatim (fill the placeholders). The header always marks it as an automated
message from Marvin so the team never confuses it with a real CloudWatch alarm page.

**Clean template:**

```
🐤 *Marvin · EMLY Prod Log Digest* _(automated)_
*Slot:* {SLOT}  ·  *Window:* {WIN_START} → {WIN_END}
*Status:* ✅ No issues found

• `api` — {api_err} errors · {api_warn} warns
• `sqs-worker` — {wrk_err} errors · {wrk_warn} warns
• `frontend` — {fe_err} error-ish
• Prod alarms (non-autoscaling): none active

_Automated digest from Marvin 🐤 — read-only, no action needed._
```

**Issues template:**

```
🐤 *Marvin · EMLY Prod Log Digest* _(automated)_
*Slot:* {SLOT}  ·  *Window:* {WIN_START} → {WIN_END}
*Status:* ⚠️ {N} thing(s) worth a look

*Issues* (top {k} by volume)
*1. {short title}* — {count}× · first {t1} · last {t2}
  • Group: `{log group}`
  • Signature: `{normalized msg/code}`
  • Sample requestId: `{req_...}`
  • Sample:
    ```{truncated raw line}```
{…repeat per bucket…}

*Active prod alarms:*
• {alarm name} — {short state reason}
{…or "• none"…}

*For a debugging agent:*
• Scope: production · region `{region}` · AWS profile `{profile}` · all read-only
• Re-pull errors:
  ```aws logs filter-log-events --log-group-name {group} --region {region} --profile {profile} --start-time {START_MS} --filter-pattern '{ $.level >= 50 }'```
• Trace one request: re-run with `--filter-pattern '{ $.requestId = "req_…" }'`
• Deeper dive: EMLY repo debug skill (`.ai/skills/debug`, scope=production).

_Automated digest from Marvin 🐤._
```

Hold the message under Slack's per-element limit: cap at 5 issue buckets, truncate sample lines to
~300 chars.

## If the check itself fails

If config is missing or any AWS call errors out, still post — so a broken check is visible, not silent:

```
🐤 *Marvin · EMLY Prod Log Digest* _(automated)_
*Slot:* {SLOT}  ·  *Status:* ⚠️ Log check failed to run

Could not complete the scan: {one-line reason, e.g. "aws logs filter-log-events returned ExpiredToken on /emly/production/api"}.
Prod health is UNKNOWN for this window — someone should check manually.

_Automated digest from Marvin 🐤._
```

## Output

After posting, respond with a single status line (no narration), e.g.
`Posted ✅ clean digest to #alarms ({slot}).` or `Posted ⚠️ {N}-issue digest to #alarms ({slot}).`
Do not print log contents to the transcript — the digest is the deliverable.
