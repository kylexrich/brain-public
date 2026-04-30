# OAuth Re-Auth SOP (YouTube + Google Workspace)

**When:** `brain token refresh-youtube` fails with `invalid_grant`
**Why:** Google revokes refresh tokens after ~7 days of non-use when the OAuth app is in "Testing" mode. If the `refresh-tokens` cron job is disabled or broken, the token silently dies.
**Impact:** Stream pipeline discovery can't see new YouTube broadcasts. Existing incomplete streams still process, but no new Day N streams are discovered.

## Fix (2 commands in Terminal)

### Step 1 — Re-authorize (opens browser)

```bash
brain stream youtube-auth
```

- Browser opens → sign in with **kylexrich@gmail.com** (the YouTube channel owner)
- If Google shows "This app is in testing" warning → click **Continue**
- Click **Allow** on the permissions screen
- Wait for Terminal to print JSON with `"has_refresh_token": true`

### Step 2 — Verify

```bash
brain token refresh-youtube
```

Expected output: `[refresh-youtube] Access token still fresh enough. No refresh needed.`

That's it. The next pipeline run at 11 PM will pick up any missed streams automatically.

## Permanent fix (prevents recurrence)

The OAuth app is in Google's **Testing** mode, which enforces a 7-day refresh token expiry. Switch it to **Production**:

1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Select the **OpenClaw YouTube Upload** project
3. Click **Publish App** (or look for Publishing Status → In Production)
4. This removes the 7-day token death window

After that, refresh tokens last indefinitely as long as they're used within 6 months (which the cron handles).

## Root cause of this incident (2026-03-28)

1. `refresh-tokens` cron job was **disabled** on March 22
2. Last successful YouTube refresh was March 19
3. Google revoked the refresh token ~7 days later (March 26-27)
4. Pipeline discovery returned `invalid_grant` errors — silently found no new streams
5. Pipeline sessions still ran (processing incomplete backlog from prior streams) so the cron looked "ok"

## Cron job status

The `refresh-tokens` cron (`c8e12767-b7aa-4cf4-8374-a986327b6a3a`) should be **enabled** and running at `0 6,18 * * *` (6 AM + 6 PM daily). If it's disabled, re-enable it.

Note: The Attio half of the refresh job has been broken separately (missing `~/.claude/.credentials.json`) since ~March 6. That's a separate issue from YouTube.

---

## Google Workspace (gog) — Re-Auth

**When:** Any `gog` command fails with `invalid_grant` or "Token has been expired or revoked"
**Impact:** Daily brief birthdays, calendar queries, Gmail, Drive — all silently fail.

### Fix (1 command in Terminal)

```bash
gog auth add kylexrich@gmail.com
```

Browser opens → sign in → approve → done.

### Verify

```bash
gog calendar list --today --json --account kylexrich@gmail.com
```

Should return events (or empty `[]`), not an error.

### Notes

- gog uses a separate OAuth flow from the YouTube `brain` CLI token — they must be re-authed independently.
- There is currently NO cron job refreshing the gog token. If it expires, it fails silently until manually re-authed.
