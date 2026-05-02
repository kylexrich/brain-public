---
name: job-refresh-youtube-token
description: Refresh the YouTube OAuth token via brain CLI. Primarily used by the `refresh-youtube-token` scheduled task — rarely invoked manually.
---

Run `brain token refresh-youtube` and report the result.

OUTPUT RULES:
- If the token refreshed (or was still fresh): reply with a one-line summary, e.g. "Token OK: youtube ✓"
- If the token failed: use /marvin-imsg with the summary and the relevant error output.
- Do NOT include reasoning, narration, or any text beyond the result.
