---
name: emly-prod-log-check-evening
description: Evening EMLY prod log-health check → posts digest to Slack #alarms
---

Automated EMLY production log-health check (evening run).

INPUT:
SLOT: evening

Execute the job-emly-prod-log-check skill exactly. The skill reads EMLY production CloudWatch logs and alarm state for the recent window using the $EMLY_PROD_AWS_PROFILE / $EMLY_PROD_AWS_REGION / $EMLY_PROD_LOG_GROUP_PREFIX environment variables, decides whether anything looks wrong, and posts ONE templated digest to the EMLY #alarms Slack channel (channel id $EMLY_ALARMS_SLACK_CHANNEL_ID) using the available Slack send-message tool. It posts on EVERY run — "✅ No issues found" when clean, full issue diagnostics + a debug-handoff section when not. It is strictly read-only: never run any AWS command that mutates state.

Do not narrate to the transcript; the Slack post is the deliverable. Reply with a single status line when done.

/job-emly-prod-log-check