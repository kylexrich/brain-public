# BlueBubbles inbound 404 incident — root cause and exact manual fix

Date: 2026-03-13

## TL;DR

This was **not** a BlueBubbles config mistake.
It was **not** multiple configs.
It was **not** multiple gateways.
It was **not** the BB password.

This was an **OpenClaw plugin-registry / HTTP-route lifecycle bug** in the local installed package.

BlueBubbles successfully registered its webhook route, but the gateway HTTP server was dispatching requests against a **different plugin registry object** than the one BlueBubbles registered into.

Result:
- BlueBubbles said: `webhook listening on /bluebubbles-webhook-bot`
- gateway still returned `404` for POSTs to that path
- inbound iMessages never reached the agent

A second related problem also existed:
- later internal plugin loads could replace the global active plugin registry with a new/empty one
- that could effectively make the route disappear again in-process

## User-visible symptom

BlueBubbles server log showed:

```text
Dispatching event to webhook: http://127.0.0.1:18789/bluebubbles-webhook-bot?password=*******
Failed to dispatch event to webhook
Request failed with status code 404
```

Live HTTP behavior before fix:

- `GET /bluebubbles-webhook-bot` -> `200` (SPA fallback, not the webhook)
- `POST /bluebubbles-webhook-bot?...` -> `404`

## What was ruled out

These were checked and were **not** the issue:

- multiple OpenClaw gateway processes
- multiple active OpenClaw config files
- wrong LaunchAgent target
- wrong BlueBubbles webhook path
- wrong BB password / env var
- BlueBubbles server being down
- BB REST API being unreachable
- old config vs new config differences

Specific facts:

- only one gateway process was running
- LaunchAgent pointed at the expected config
- BlueBubbles server on `127.0.0.1:1234` was healthy
- `OPENCLAW_BLUEBUBBLES_PASSWORD` matched the password BB was sending
- restoring the old config did **not** fix the bug

## Root cause

### Actual bug

There were **two plugin-registry realities** inside the running gateway:

1. **BlueBubbles runtime path** registered the webhook into the **current active plugin registry**
2. **Gateway HTTP request handling** used a **captured registry object** that could be stale/empty

So BlueBubbles could truthfully log that the webhook was registered, while the HTTP server would still say "no such route" and fall through to `404`.

### Worse: registry resets

Later, unrelated internal calls to `loadOpenClawPlugins(...)` could swap the global active registry to a new object that had no runtime-added BB route. That made the split-brain even worse.

So there were effectively two failure modes:

1. **split registry bug**: BB writes route into registry A, HTTP server checks registry B
2. **route loss bug**: later plugin-loading code swaps active registry and loses runtime-added HTTP routes

## Proof gathered during incident

### Proof 1: BB runtime really did register the route

Instrumented BlueBubbles logs showed:

```text
[ocdebug] registerBlueBubblesWebhookTarget path=/bluebubbles-webhook-bot targetCount=1 registryVersion=22 routeCount=1 hasPath=true routes=[/bluebubbles-webhook-bot:plugin:exact]
[ocdebug] monitorBlueBubblesProvider registered path=/bluebubbles-webhook-bot registryVersion=22 routeCount=1 hasPath=true routes=[/bluebubbles-webhook-bot:plugin:exact]
```

That proves the BB side **did** register the route.

### Proof 2: gateway HTTP server was initially checking a different registry

Instrumented gateway logs showed:

```text
[ocdebug] gateway plugin handler precheck url=/bluebubbles-webhook-bot/avatar/main?meta=1 capturedRouteCount=0 activeRouteCount=1 sameRegistry=false captured=[] active=[/bluebubbles-webhook-bot]
```

Meaning:
- the HTTP handler's captured registry had `0` routes
- the current global active registry had `1` route
- they were **not the same object**

That is the smoking gun.

### Proof 3: later the active registry also became empty

Later logs showed:

```text
[ocdebug] gateway plugin handler precheck url=/bluebubbles-webhook-bot?password=******* capturedRouteCount=0 activeRouteCount=0 sameRegistry=true captured=[] active=[]
```

That proves the active registry later got replaced/reset and lost the route entirely.

### Proof 4: after fix, the route matched correctly

After the fix:

```text
[ocdebug] gateway plugin handler precheck url=/bluebubbles-webhook-bot?password=******* capturedRouteCount=1 activeRouteCount=1 effectiveRouteCount=1 sameRegistry=true usingActive=true captured=[/bluebubbles-webhook-bot] active=[/bluebubbles-webhook-bot] effective=[/bluebubbles-webhook-bot]
[ocdebug] gateway plugin handler match url=/bluebubbles-webhook-bot?password=******* canonical=/bluebubbles-webhook-bot matched=/bluebubbles-webhook-bot:bluebubbles
```

Manual POST test returned:

```http
HTTP/1.1 200 OK
...

ok
```

## Exact local manual fix that was applied

This fix was applied **directly to the installed OpenClaw package** under:

```text
~/.nvm/versions/node/v24.12.0/lib/node_modules/openclaw/
```

### Important

This means a future `npm install -g openclaw@...` / reinstall / update may overwrite the fix.

## Files changed

### Diagnostic-only changes

These were added only to prove the failure mode and can be removed later:

1. `extensions/bluebubbles/src/monitor.ts`
   - added `[ocdebug]` logs around webhook registration / unregister / abort
   - imported registry runtime for debug snapshots

### Functional fix changes

These are the real repair:

2. `dist/gateway-cli-C42NwqHk.js`
3. `dist/gateway-cli-Bmg642Lj.js`
   - patched `createGatewayPluginRequestHandler(...)`

4. `dist/registry-BbhZ8aJW.js`
5. `dist/registry-B23eaqdH.js`
   - patched `setActivePluginRegistry(...)`

## Functional fix details

### Fix A: gateway HTTP dispatch should use the effective live registry

Problem before:

`createGatewayPluginRequestHandler(params)` closed over a `registry` object and always dispatched against that captured object.

That breaks when BlueBubbles later registers its route into the current active registry instead of that captured one.

### Manual code change

In both hashed gateway CLI files, inside `createGatewayPluginRequestHandler(params)`, the logic was changed conceptually from:

```js
const matchedRoutes = findMatchingPluginHttpRoutes(registry, pathContext)
```

To:

```js
const activeRegistry = getActivePluginRegistry();
const effectiveRegistry = activeRegistry && (activeRegistry.httpRoutes ?? []).length > 0
  ? activeRegistry
  : registry;
const matchedRoutes = findMatchingPluginHttpRoutes(effectiveRegistry, pathContext)
```

Also the empty-route early return now uses `effectiveRegistry.httpRoutes`, not just `registry.httpRoutes`.

### Why this matters

If the current active registry has the live runtime-added BlueBubbles route, the HTTP server now uses it instead of blindly trusting the stale captured registry.

## Fix B: preserve runtime-added HTTP routes when active registry is swapped

Problem before:

`setActivePluginRegistry(registry, cacheKey)` replaced the global active registry object wholesale.

If the old active registry had runtime-added routes (like the BB webhook) and the new registry did not, those routes vanished.

### Manual code change

In both hashed registry files, `setActivePluginRegistry(...)` was changed conceptually from:

```js
state.registry = registry;
state.key = cacheKey ?? null;
state.version += 1;
```

To:

```js
const previous = state.registry;
const previousRoutes = Array.isArray(previous?.httpRoutes) ? previous.httpRoutes : [];
if (previous !== registry && previousRoutes.length > 0) {
  const nextRoutes = Array.isArray(registry?.httpRoutes) ? registry.httpRoutes : [];
  if (nextRoutes.length === 0) registry.httpRoutes = previousRoutes.slice();
}
state.registry = registry;
state.key = cacheKey ?? null;
state.version += 1;
```

### Why this matters

If OpenClaw internally swaps the active plugin registry to a fresh object, runtime-added routes are no longer silently discarded.

## How to verify the bug if it comes back

### Step 1: verify symptom

From the host:

```bash
curl -i -X POST 'http://127.0.0.1:18789/bluebubbles-webhook-bot?password=YOUR_PASSWORD' \
  -H 'Content-Type: application/json' \
  -d '{"type":"new-message","data":{}}'
```

Broken behavior:
- `404 Not Found`

Working behavior:
- `200 OK`
- body `ok`

### Step 2: prove split registry

Instrument the BB registration path and the gateway plugin request handler the same way as this incident did.

Things to look for:

- BB side says route exists:
  - `routeCount=1 hasPath=true`
- gateway side says captured routes are empty:
  - `capturedRouteCount=0`
- and/or:
  - `sameRegistry=false`

That combination proves the same bug.

## How a future agent should fix it manually

If this reappears after an OpenClaw upgrade:

1. Find the current installed OpenClaw package root
   - likely under something like:
   - `~/.nvm/versions/node/.../lib/node_modules/openclaw/`

2. Search for these functions by name, **not by hashed filename only**
   - `createGatewayPluginRequestHandler`
   - `setActivePluginRegistry`
   - `registerBlueBubblesWebhookTarget`
   - `monitorBlueBubblesProvider`

3. Re-apply the two functional fixes:
   - use effective live registry for gateway plugin HTTP dispatch
   - preserve runtime-added httpRoutes when swapping active registries

4. Restart the gateway as a real process restart
   - not just an in-process config reload if you suspect stale loaded code

5. Verify with manual POST + real iMessage test

## Commands that were useful during this incident

### Check process / single gateway

```bash
ps aux | grep openclaw-gateway | grep -v grep
```

### Check BB server health

```bash
curl -s 'http://127.0.0.1:1234/api/v1/server/info?password=YOUR_PASSWORD'
```

### Check webhook behavior

```bash
curl -i -X POST 'http://127.0.0.1:18789/bluebubbles-webhook-bot?password=YOUR_PASSWORD' \
  -H 'Content-Type: application/json' \
  -d '{"type":"new-message","data":{}}'
```

### Inspect logs

```bash
openclaw logs --limit 200 --plain | grep -i 'bluebubbles\|ocdebug\|webhook'
```

## Current state after fix

At the end of the incident:

- BB webhook route matched correctly
- manual POST returned `200 OK`
- real BB inbound flow worked again

## Important caveat

This is currently a **local installed-package patch**, not an upstreamed OpenClaw fix.

So yes: a future upgrade may overwrite it.

But if it breaks again, the right mental model is:

> Do not waste time first assuming a bad BB password, duplicate configs, or multiple gateways.
> First suspect plugin-registry / runtime HTTP-route loss.

## Recommended cleanup later

Once this is no longer needed for debugging:

- remove the `[ocdebug]` log lines from:
  - `extensions/bluebubbles/src/monitor.ts`
  - the two hashed `gateway-cli-*.js` files
- keep the functional fix unless/until upstream has a real fix

## Search anchors for future agents

Use these strings to quickly find the modified sections:

- `[ocdebug] registerBlueBubblesWebhookTarget`
- `[ocdebug] gateway plugin handler precheck`
- `function setActivePluginRegistry(registry, cacheKey)`
- `function createGatewayPluginRequestHandler(params)`

## Bottom-line classification

This incident should be classified as:

- **OpenClaw runtime bug**
- category: plugin registry / runtime webhook route lifecycle
- not user misconfiguration
- not BlueBubbles server failure
- not duplicate gateway/config issue
