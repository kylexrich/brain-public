---
name: gog
description: Generic Google Workspace CLI access via the `gog` binary (Gmail / Calendar / Drive / Contacts / Tasks / Sheets / Docs / Slides / People / Chat / Forms / AppScript). Use as the FALLBACK for any Google-service request on Kyle's EMLY account (kyle@emlyai.ca) that isn't already exposed through a dedicated Claude MCP, and ALWAYS use it for any Google-service request on the PERSONAL account (kylexrich@gmail.com) — no MCPs are bound to that account. Always pass `--account` explicitly.
user-invocable: true
allowed-tools:
  - Bash
  - Read
  - Write
---

# /gog — Generic Google Workspace CLI

Wraps the `gog` CLI (`gogcli`, installed via Homebrew) for read/write access across all Google services on Kyle's two accounts. This is the catch-all when no dedicated MCP or specialized skill covers the request.

## Account routing

Pick the account based on the request, then pass it explicitly via `--account "$ENV_VAR"`. **Never hardcode the email** — it'll break the moment account ownership shifts.

| Account | Email | Env var | When to use |
|---------|-------|---------|-------------|
| **EMLY (work)** | `kyle@emlyai.ca` | `$EMLY_GOOGLE_ACCOUNT_EMAIL_ADDRESS` | EMLY business: company calendar, work emails (when `draft-email` skill doesn't apply), EMLY Drive / Docs / Sheets, EMLY Contacts, etc. |
| **Personal** | `kylexrich@gmail.com` | `$PERSONAL_GOOGLE_ACCOUNT_EMAIL_ADDRESS` | Anything personal: birthday calendar, personal emails, family Drive / Docs, personal contacts, etc. |

If the request is ambiguous ("what's on my calendar today?", "any unread emails?"), **default to the EMLY account**. The two accounts have separate calendars, inboxes, and contact lists, and EMLY is the right call for unqualified day-to-day requests. Switch to personal only when Kyle clearly signals it (mentions family, birthdays, personal contacts, or names the personal address explicitly).

## When NOT to use this skill

- **EMLY Gmail drafts** → use the `draft-email` skill (handles signature appending, broadcast BCC, and reply threading).
- **Anything covered by a dedicated MCP for the EMLY account** — if a future Calendar / Drive MCP gets added, prefer it for EMLY and use `gog` only for the personal-account version of the same request.

For the **personal account**, there are no MCPs bound — `gog` is always the answer.

## OAuth client

Both accounts share the `default` OAuth client (one Google Cloud project, one consent screen, two stored tokens). Don't pass `--client` — `gog` resolves it implicitly. If a second OAuth client ever gets registered (e.g. an EMLY-owned client), this skill will need updating.

## Command shape

Every call follows this base shape:
```bash
gog <service> <action> [args...] \
  --account "$EMLY_GOOGLE_ACCOUNT_EMAIL_ADDRESS"   # or PERSONAL
  [--json --results-only]                          # for parseable output
```

### Top-level services

| Service | Command prefix | Common actions |
|---------|---------------|----------------|
| Gmail | `gog gmail` | `search`, `thread get`, `messages get`, `drafts create/list/send`, `send`, `labels`, `batch` |
| Calendar | `gog calendar` | `events`, `create`, `list`, `delete`, `quick-add` |
| Contacts | `gog contacts` | `search`, `list`, `create` |
| Drive | `gog drive` | `list`, `get`, `upload`, `download`, `share` |
| Docs | `gog docs` | `get`, `create`, `update` |
| Sheets | `gog sheets` | `get`, `update`, `append` |
| Slides | `gog slides` | `get`, `create` |
| Tasks | `gog tasks` | `list`, `create`, `complete` |
| Chat | `gog chat` | `messages`, `send` |
| People | `gog people` | `search`, `list` |
| Forms | `gog forms` | `get`, `responses` |
| AppScript | `gog appscript` | `list`, `run` |

For exact flags on any command, read the inline help:
```bash
gog --help                       # all top-level services
gog <service> --help             # actions in a service
gog <service> <action> --help    # flags for one action
```

The `gog` CLI is well-documented inline. **Read the help before guessing argument shapes** — flag names vary by service.

## Useful global flags

- `--json --results-only` — clean JSON for parsing (drops envelope fields like `nextPageToken`)
- `--select "a,b,c"` — pick specific fields from the JSON output (supports dot paths)
- `--plain` — TSV output for shell pipelines
- `--no-input` — never prompt; fail fast (useful inside scripts)
- `-n, --dry-run` — print intended actions without executing
- `-y, --force` — skip confirmation on destructive ops (use with care)
- `-v, --verbose` — debug logging

## Examples

### Read today's calendar (personal)
```bash
gog calendar events primary --today --json --results-only \
  --account "$PERSONAL_GOOGLE_ACCOUNT_EMAIL_ADDRESS"
```

### Search EMLY Gmail for unread
```bash
gog gmail search "is:unread" --json --results-only \
  --account "$EMLY_GOOGLE_ACCOUNT_EMAIL_ADDRESS"
```

### List recent EMLY Drive activity
```bash
gog drive list --query "modifiedTime > '$(date -u -v-7d +%Y-%m-%dT%H:%M:%SZ)'" \
  --json --results-only \
  --account "$EMLY_GOOGLE_ACCOUNT_EMAIL_ADDRESS"
```

### Look up a personal contact
```bash
gog contacts search "Josh" --json --results-only \
  --account "$PERSONAL_GOOGLE_ACCOUNT_EMAIL_ADDRESS"
```

### Bulk-mark EMLY messages as read
```bash
gog gmail batch modify <messageId1> <messageId2> --remove UNREAD \
  --account "$EMLY_GOOGLE_ACCOUNT_EMAIL_ADDRESS" --no-input -y
```

## Auth troubleshooting

If a call fails with `invalid_grant` or "Token has been expired or revoked":
```bash
gog auth list                          # see what's currently bound
gog auth add kyle@emlyai.ca            # re-auth EMLY
gog auth add kylexrich@gmail.com       # re-auth personal
```
There is **no automatic refresh job** for `gog` tokens — re-auth manually when something breaks. The auth flow opens a browser; tokens persist in the macOS keychain via `gogcli`.

If the EMLY auth flow is rejected by the Workspace consent screen, the issue is the org-wide third-party app policy. The `default` client's ID needs to be added to the trusted-apps list at: admin.google.com → Security → Access and data control → API controls → Manage Third-Party App Access.

## Output discipline

- For **automation / parsing**, always use `--json --results-only` and pipe to `jq` (or similar) — never grep raw text output.
- For **human-readable** one-shot lookups, the default text output is fine.
- For **shell pipelines**, `--plain` gives stable TSV.
