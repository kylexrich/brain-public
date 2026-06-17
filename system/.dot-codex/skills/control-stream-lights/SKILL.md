---
name: control-stream-lights
description: Toggle Kyle's stream lights on or off via the local Elgato HTTP API. Controls the Elgato Key Light, Key Light Neo, and Ring Light together. Primarily used by the scheduled stream-light tasks; rarely invoked manually. Expects an INPUT section specifying the action.
---

## INPUT

This skill expects the cron job message to include one of these actions:
- `ACTION=on` (turn all Elgato lights on)
- `ACTION=off` (turn all Elgato lights off)

## DEVICES

Control all three devices every time:

- Elgato Key Light: `elgato-key-light-mk-2-aac0.local:9123`
- Elgato Key Light Neo: `elgato-key-light-neo-e8e5.local:9123`
- Elgato Ring Light: `elgato-ring-light.local:9123`

## COMMAND

Run the matching curl against every Elgato device, then reply `NO_REPLY` only if all three calls succeed and every response body reports the requested `on` value.

ON:
```bash
desired=1
failures=0
for host in \
  elgato-key-light-mk-2-aac0.local \
  elgato-key-light-neo-e8e5.local \
  elgato-ring-light.local
do
  body=$(curl -sS --fail -m 5 -X PUT "http://$host:9123/elgato/lights" \
    -H 'Content-Type: application/json' \
    -d '{"numberOfLights":1,"lights":[{"on":1}]}') || {
      echo "$host: curl failed"
      failures=1
      continue
    }
  actual=$(printf '%s' "$body" | jq -r '.lights[0].on // empty')
  if [ "$actual" != "$desired" ]; then
    echo "$host: expected on=$desired, got body: $body"
    failures=1
  fi
done
exit "$failures"
```

OFF:
```bash
desired=0
failures=0
for host in \
  elgato-key-light-mk-2-aac0.local \
  elgato-key-light-neo-e8e5.local \
  elgato-ring-light.local
do
  body=$(curl -sS --fail -m 5 -X PUT "http://$host:9123/elgato/lights" \
    -H 'Content-Type: application/json' \
    -d '{"numberOfLights":1,"lights":[{"on":0}]}') || {
      echo "$host: curl failed"
      failures=1
      continue
    }
  actual=$(printf '%s' "$body" | jq -r '.lights[0].on // empty')
  if [ "$actual" != "$desired" ]; then
    echo "$host: expected on=$desired, got body: $body"
    failures=1
  fi
done
exit "$failures"
```

## OUTPUT RULES

- On success for all three devices (HTTP 200 with `"on":0` or `"on":1` in each body matching the requested ACTION): DO NOT REPLY. No narration. No summary.
- On failure for any device (non-200, empty body, curl error, or `on` value does not match ACTION): use /marvin-imsg with a one-line summary and the relevant error output, e.g. "Elgato lights ON failed: could not resolve elgato-key-light-neo-e8e5.local".
- Do NOT include reasoning, narration, or any text beyond the result.
