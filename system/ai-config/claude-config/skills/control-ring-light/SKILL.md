---
name: control-ring-light
description: Toggle Kyle's Elgato Ring Light on or off via its local HTTP API. Primarily used by the `Ring light ON` and `Ring light OFF` scheduled tasks — rarely invoked manually. Expects an INPUT section specifying the action.
---

## INPUT

This skill expects the cron job message to include one of these actions:
- `ACTION=on` (turn ring light on)
- `ACTION=off` (turn ring light off)

## COMMAND

Run the matching curl against the Elgato API, then reply `NO_REPLY`.

ON:
```
curl -s -X PUT http://elgato-ring-light.local:9123/elgato/lights -H 'Content-Type: application/json' -d '{"numberOfLights":1,"lights":[{"on":1}]}'
```

OFF:
```
curl -s -X PUT http://elgato-ring-light.local:9123/elgato/lights -H 'Content-Type: application/json' -d '{"numberOfLights":1,"lights":[{"on":0}]}'
```

## OUTPUT RULES

- On success (HTTP 200 with `"on":0` or `"on":1` in the body matching the requested ACTION). DO NOT REPLY. No narration. No summary.
- On failure (non-200, empty body, curl error, or `on` value does not match ACTION): use /marvin-imsg with a one-line summary and the relevant error output, e.g. "Ring light ON failed: could not resolve elgato-ring-light.local".
- Do NOT include reasoning, narration, or any text beyond the result.
