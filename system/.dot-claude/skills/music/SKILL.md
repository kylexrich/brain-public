---
name: music
description: Handle music and speaker control on Kyle's Sonos system, including play/pause/resume/skip, volume changes, room targeting, grouping, and fuzzy artist/album/playlist requests. Use when Kyle asks to play music, pause/resume, change volume, switch rooms, or adjust playback behavior.
---

# Music

Four CLIs, all on PATH:
- `sonos-pr3` — transport, volume, grouping, mode, Apple Music catalog search+play
- `brain music applemusic` — Kyle's personal Apple Music data (playlists, recent, heavy rotation, library)
- `brain music play-playlist` — plays personal library playlists (ones `sonos-pr3` can't find in catalog)
- `brain music play-artist` — queues an artist's full discography (artists aren't directly queueable on Sonos)
- `brain music volume-set` — sets all grouped speakers to the same absolute volume level

## Speakers

| Name | IP |
|------|----|
| Bathroom | 192.168.50.236 |
| Bedroom | 192.168.50.39 |
| Kitchen | 192.168.50.244 |
| Living Room | 192.168.50.114 |

Target with `--name "<Room>"`. IPs rarely needed — `--name` handles discovery.

## Smart Defaults

Apply when Kyle doesn't specify. Use `session_status` or current time for time-of-day.

| Parameter | Default                                                                                 |
|-----------|-----------------------------------------------------------------------------------------|
| **Room** | All speakers — `sonos-pr3 group party --to "Living Room"` then target `--name "Living Room"` |
| **Volume** | All times are **Kyle's local time (Pacific Time — PST/PDT)**. Run `date` to get current local time before applying. 08:00–18:00 → `20`. 18:00–21:00 → `15`. 21:00–23:00 → `8`. 23:00–08:00 → `4`. |
| **Mode** | Album → `repeat` (front-to-back, repeat all). Artist/playlist/vague → `shuffle` (shuffle + repeat all). |

## Play History

State file: `~/Developer/brain/system/.dot-claude/skills/music/state/music-history.json`

This is a JSON array of recent picks. Each entry has: `timestamp`, `request` (what Kyle asked), `picked` (what you chose), `type` (album/library-playlist/artist/catalog-playlist), `id` (Apple Music ID).

**Before every content pick** (not transport controls), read this file. Use it to avoid repetition:
- This only matters for vague/mood requests ("play music", "chill vibes", "something upbeat", etc.). If Kyle asks for something specific ("play Shadows by Cannons"), play it regardless of history.
- Repetition avoidance is **scoped by request category**, not global. The `category` field captures the general intent (e.g. "chill", "upbeat", "generic", "focus"). Similar requests map to the same category — use judgment. Examples:
  - "play chill music" / "chill vibes" / "something calm" → category: `chill`
  - "play music" / "put something on" → category: `generic`
  - "something upbeat" / "energetic" → category: `upbeat`
  - "focus music" / "something to work to" → category: `focus`
- When picking, filter history to entries **with the same category**. Repetition avoidance is an **extremely soft** preference — basically just a tiebreaker between two equally good options. Replaying the same content back-to-back is totally fine if it's a good fit. Never skip a strong match just for variety's sake.
- Cross-category repeats are totally fine. Playing Chill Kyle for a "generic" request and then again for a "chill" request is not repetitive — different ask, different context.

**After every content pick**, append a new entry to the file (include the `category`). Keep the last 20 entries max — trim older ones when writing.

## Execution Model

Four steps, every time:

0. **Health check** — verify speaker reachability and recover if needed (see below).
1. **Intent** — what does Kyle want? (transport control, content playback, room change, info)
2. **Resolve** — if content: figure out what to play. If transport/room: skip to execute.
3. **Execute** — run the commands, set mode/volume per defaults, verify with `sonos-pr3 status`.

### Step 0: Speaker Health Check (mandatory)

`sonos-pr3` queries the **group coordinator** for ZoneGroupTopology before every command. If the coordinator is unreachable, **all commands fail** — even with `--ip` or `--name` targeting a different speaker. This is the single most common cause of total playback failure.

**Always run this first:**

```bash
# Quick reachability check — curl each speaker's description endpoint
for ip in 192.168.50.236 192.168.50.39 192.168.50.244 192.168.50.114; do
  echo -n "$ip: "
  curl -s --connect-timeout 2 "http://$ip:1400/xml/device_description.xml" \
    | grep -o '<roomName>[^<]*</roomName>' || echo "DOWN"
done
```

**If all speakers respond:** proceed normally with `sonos-pr3 group status --format json`.

**If any speaker is DOWN and it might be the group coordinator:** run the recovery procedure (see Known Limitation #7). You must fix coordinator reachability before any `sonos-pr3` command will work.

**If all speakers are DOWN:** report to Kyle — nothing can be done.

## Queue Intent

Three patterns for how content enters the queue:

| Intent Signal | Behavior | Example |
|---|---|---|
| **"play X"** | Clear queue, replace everything | "play Shadows by Cannons" |
| **"play X next"** | Insert after current track, keep rest of queue | "play Crazy next" |
| **"queue X"** | Append to end of queue | "queue St. Elsewhere" |

These are guidelines, not rigid rules — interpret naturally. Phrases like "add this after" or "throw this on" map to the closest pattern by intent.

**"play X next"**: get current track from `status`, then `sonos-pr3 play applemusic --position <track+1>` to insert right after. Don't clear the queue. The existing queue shifts down and continues after the inserted content.

**"queue X"**: standard append — `sonos-pr3 play applemusic --enqueue` appends via `AddURIToQueue`, so skip the `queue clear` step.

**"play X"**: the existing default — `queue clear` first, then play.

## Commands

### Status & Discovery

```
sonos-pr3 discover --format json
sonos-pr3 status --name "<Room>" --format json
brain music applemusic status --format json
```

### Transport

```
sonos-pr3 play --name "<Room>"            # resume
sonos-pr3 pause --name "<Room>"
sonos-pr3 stop --name "<Room>"
sonos-pr3 next --name "<Room>"
sonos-pr3 prev --name "<Room>"
```

### Volume

```
sonos-pr3 volume get --name "<Room>"
sonos-pr3 volume set --name "<Room>" <0-100>          # WARNING: always sets coordinator, ignores --name
brain music volume-set <0-100> --name "<Room>"        # set ALL grouped speakers to exact same level
```

⚠️ `sonos-pr3 volume set` **ignores `--name` entirely** — it always sets the coordinator's volume regardless of which room you name. `sonos-pr3 volume get` has the same limitation: it returns the coordinator's volume, not the named speaker's. Use `brain music volume-set` to set all grouped speakers uniformly.

**To set one speaker to a different volume from the rest of the group**, use UPnP RenderingControl directly on that speaker's IP:

```bash
# Workflow: all at base volume, one speaker louder
brain music volume-set 4 --name "Living Room"   # set everyone to base

# Then target the individual speaker directly by IP:
curl -s "http://<speaker-ip>:1400/MediaRenderer/RenderingControl/Control" \
  -X POST \
  -H "Content-Type: text/xml; charset=utf-8" \
  -H 'SOAPACTION: "urn:schemas-upnp-org:service:RenderingControl:1#SetVolume"' \
  -d '<?xml version="1.0" encoding="utf-8"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/encoding/"><s:Body><u:SetVolume xmlns:u="urn:schemas-upnp-org:service:RenderingControl:1"><InstanceID>0</InstanceID><Channel>Master</Channel><DesiredVolume>40</DesiredVolume></u:SetVolume></s:Body></s:Envelope>'

# Verify via RenderingControl GetVolume (returns actual speaker volume, not coordinator):
curl -s "http://<speaker-ip>:1400/MediaRenderer/RenderingControl/Control" \
  -X POST \
  -H "Content-Type: text/xml; charset=utf-8" \
  -H 'SOAPACTION: "urn:schemas-upnp-org:service:RenderingControl:1#GetVolume"' \
  -d '<?xml version="1.0" encoding="utf-8"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/encoding/"><s:Body><u:GetVolume xmlns:u="urn:schemas-upnp-org:service:RenderingControl:1"><InstanceID>0</InstanceID><Channel>Master</Channel></u:GetVolume></s:Body></s:Envelope>' \
  | grep -o '<CurrentVolume>[^<]*</CurrentVolume>'
```

Speaker IPs: Bathroom `192.168.50.236`, Bedroom `192.168.50.39`, Kitchen `192.168.50.244`, Sonos `192.168.50.114`.

### Grouping

```
sonos-pr3 group status --name "<Room>" --format json
sonos-pr3 group party --to "<Room>"                   # all speakers join this room
sonos-pr3 group join --name "<Room>" --to "<Target>"  # one speaker joins target
sonos-pr3 group solo --name "<Room>"                  # ungroup this room
sonos-pr3 group dissolve --name "<Room>"              # ungroup all members of group
```

### Mode

```
sonos-pr3 mode get --name "<Room>"
sonos-pr3 mode normal --name "<Room>"            # sequential, no repeat
sonos-pr3 mode shuffle-norepeat --name "<Room>"  # shuffle, no repeat
sonos-pr3 mode shuffle --name "<Room>"           # shuffle + repeat
sonos-pr3 mode repeat --name "<Room>"            # repeat all
sonos-pr3 mode repeat-one --name "<Room>"        # loop single track
```

### Play Content (Apple Music)

```bash
# Catalog content (albums, songs, catalog playlists)
sonos-pr3 queue clear --name "<Room>"   # ALWAYS clear first
sonos-pr3 play applemusic "<query>" --name "<Room>"
sonos-pr3 play applemusic "<query>" --category <songs|albums|playlists> --name "<Room>"
sonos-pr3 play applemusic "<query>" --category albums --index <n> --name "<Room>"  # index is 0-based
sonos-pr3 play applemusic "<query>" --position <n> --name "<Room>"               # insert at queue position (1-based), implies --enqueue
sonos-pr3 play applemusic "<query>" --enqueue --name "<Room>"                    # append to end without starting playback

# Search without playing — use when disambiguation is needed
sonos-pr3 search applemusic "<query>" --category <songs|albums|playlists> --limit 10 --format json

# Artist playback (queues all albums by the artist)
sonos-pr3 queue clear --name "<Room>"
brain music play-artist <artist-id> --name "<Room>" --title "<artist name>" [--singles]

# Personal library playlists
sonos-pr3 queue clear --name "<Room>"
brain music play-playlist <playlist-id> --name "<Room>" --title "<playlist name>"
```

For artist and library playlist scripts, follow with `sonos-pr3 play --name "<Room>"` to start playback (transport is pre-configured to the queue).

### Play Personal Library Playlists

`sonos-pr3 play applemusic` can't find personal playlists (catalog-only search). Use this instead:

```
# 1. Find the playlist ID
brain music applemusic playlists --limit 50 --format json   # look for the id field (e.g. p.xraeWJMCEp1xrZ)

# 2. Clear queue + enqueue + play
sonos-pr3 queue clear --name "<Room>"
brain music play-playlist <playlist-id> --name "<Room>" --title "<display name>"
sonos-pr3 play --name "<Room>"
```

### Sonos Favorites

⚠️ **`favorites open` is broken for streaming content** — see Known Limitations. List works fine; open fails with UPnP error 714 on container URIs.

```
sonos-pr3 favorites list --format json
# sonos-pr3 favorites open "<title>" --name "<Room>"   # BROKEN for playlists/albums — do not use
```

**Workaround:** Use `favorites list` to find the playlist ID from the URI (it contains the library playlist ID, e.g. `libraryplaylist%3Ap.xraeWJMCEp1xrZ`), then play via `brain music play-playlist`.

### Queue

```
sonos-pr3 queue list --name "<Room>" --format json
sonos-pr3 queue clear --name "<Room>"
sonos-pr3 queue play <n> --name "<Room>"   # 1-based
```

### Personal Library Data (`brain music applemusic`)

Use when the request references Kyle's own listening — playlists, recently played, heavy rotation, library browsing.

```
brain music applemusic playlists --limit 50 --format json
brain music applemusic playlist-tracks <playlistId> --limit 100 --format json
brain music applemusic recent-played --limit 20 --format json            # API max 20
brain music applemusic recent-tracks --types songs --limit 30 --format json
brain music applemusic heavy-rotation --limit 10 --format json           # API max 10
brain music applemusic recently-added --limit 25 --format json           # API max 25
brain music applemusic library-songs --limit 100 --format json
brain music applemusic library-albums --limit 100 --format json
brain music applemusic library-artists --limit 100 --format json
```

## Known Limitations

### 1. Catalog search vs personal library

`sonos-pr3 search/play applemusic` searches the **Apple Music catalog**, not Kyle's personal library. Personal/library playlists (like "Chill Kyle") have no catalog ID and will never appear in search results. A search for a personal playlist name will return unrelated catalog results instead.

**Root cause:** The Apple Music API search endpoint (`/v1/catalog/{storefront}/search`) only indexes catalog content. Library playlists use `/v1/me/library/playlists` which is a separate, private endpoint. The `brain music applemusic` command accesses the library endpoints; `sonos-pr3` only accesses the catalog.

**Fix:** Use `brain music play-playlist` to play personal playlists directly:
```bash
sonos-pr3 queue clear --name "<Room>"
brain music play-playlist <playlist-id> --name "<Room>" --title "<name>"
sonos-pr3 play --name "<Room>"
```
This constructs the correct Sonos container URI from the library playlist ID and uses `AddURIToQueue` (which works) instead of `SetAVTransportURI` (which doesn't).

### 2. `favorites open` broken (UPnP error 714)

`sonos-pr3 favorites open` fails for container-type favorites (playlists, albums from streaming services) with UPnP error 714.

**Root cause:** The command uses `SetAVTransportURI` with `x-rincon-cpcontainer:...` URIs. Sonos rejects container URIs on `SetAVTransportURI` — containers must be loaded via `AddURIToQueue` first. This is the same flow `sonos-pr3 play applemusic` correctly uses for catalog albums (AddURIToQueue → SetAVTransportURI to the queue → Seek). `favorites open` skips the queue step and tries to set the container URI directly as the transport, which Sonos doesn't support.

**Fix:** Extract the playlist ID from the favorites URI and use `brain music play-playlist`. The URI format in favorites is `x-rincon-cpcontainer:1006206clibraryplaylist%3A{id}?sid=204&...` — the playlist ID follows `libraryplaylist%3A`.

### 3. `--category artists` not supported (UPnP error 800) — SOLVED

`sonos-pr3 play applemusic --category artists` fails with UPnP error 800.

**Root cause:** Artist URIs are navigational containers (`object.container.person.musicArtist`) — Sonos can't queue them. Even the Sonos favorites system stores artist favorites with empty URIs. Artists don't map to a single queueable resource the way albums and playlists do.

**Fix:** Use `brain music play-artist`:
```bash
# 1. Find the artist ID
sonos-pr3 search applemusic "<artist>" --category artists --format json
# 2. Queue their discography
sonos-pr3 queue clear --name "<Room>"
brain music play-artist <artist-id> --name "<Room>" --title "<artist name>"
sonos-pr3 play --name "<Room>"
sonos-pr3 mode shuffle --name "<Room>"
```
This fetches the artist's albums from the Apple Music catalog API and queues each one via `AddURIToQueue`. Use `--singles` to include singles/EPs.

### 4. Queue bleeding (stale tracks in shuffle)

`sonos-pr3 play applemusic` uses `AddURIToQueue` which **appends** to the existing queue. It then seeks to the new content. With shuffle mode, Sonos can jump back to old tracks from the previous queue.

**Root cause:** `sonos-pr3 play applemusic` does: `AddURIToQueue` → `SetAVTransportURI` (to queue) → `Seek` (to new item). Old items remain in the queue.

**Fix:** Always run `sonos-pr3 queue clear` before `sonos-pr3 play applemusic`.

### 5. `EnqueueAsNext` ignored by Sonos for Apple Music

The UPnP `EnqueueAsNext` parameter (sent via `AddURIToQueue`) is silently ignored by Sonos for Apple Music service tracks. Items always append to the end regardless of the flag value.

**Fix:** Use `--position <n>` instead, which sets `DesiredFirstTrackNumberEnqueued` directly. To insert after the current track: get the current track number from `status`, then use `--position <track+1>`.

### 6. Album disambiguation (wrong version plays)

The first search result may be a deluxe/expanded/midnight edition instead of the standard album.

**Fix:** When the specific album version matters, or when a first attempt plays wrong content:
1. `sonos-pr3 search applemusic "<query>" --category albums --limit 5 --format json`
2. Identify the correct result (usually the shorter, non-"Edition" title)
3. `sonos-pr3 play applemusic "<query>" --category albums --index <n>`

### 7. Unreachable group coordinator blocks all commands

If the current Sonos group coordinator is unreachable (powered off, network issue, etc.), **every `sonos-pr3` command fails** — including commands targeting other speakers via `--name` or `--ip`. The CLI always queries the coordinator for topology first, and there is no flag to skip this.

**Root cause:** `sonos-pr3` discovers speakers via SSDP multicast. A speaker can respond to SSDP (UDP) even when its TCP port 1400 is unreachable (common with network flakiness). The CLI picks the first discovered speaker to query ZoneGroupTopology, and if that speaker happens to be the (unreachable) coordinator, every subsequent operation routes through it and times out.

**Symptoms:**
- All `sonos-pr3` commands fail with `dial tcp <ip>:1400: connect: host is down` or `context deadline exceeded`
- The failing IP is always the same speaker regardless of `--name`/`--ip` target
- `sonos-pr3 discover` still lists the unreachable speaker

**Fix — UPnP recovery procedure:**

```bash
# 1. Identify a reachable speaker IP (from the health check)
WORKING_IP="192.168.50.114"  # example: Sonos

# 2. Make each reachable speaker its own standalone coordinator
for ip in <all reachable IPs>; do
  curl -s --connect-timeout 3 "http://$ip:1400/MediaRenderer/AVTransport/Control" \
    -X POST \
    -H "Content-Type: text/xml; charset=utf-8" \
    -H 'SOAPACTION: "urn:schemas-upnp-org:service:AVTransport:1#BecomeCoordinatorOfStandaloneGroup"' \
    -d '<?xml version="1.0" encoding="utf-8"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/encoding/"><s:Body><u:BecomeCoordinatorOfStandaloneGroup xmlns:u="urn:schemas-upnp-org:service:AVTransport:1"><InstanceID>0</InstanceID></u:BecomeCoordinatorOfStandaloneGroup></s:Body></s:Envelope>'
done

# 3. Pick a coordinator for the new group (use --ip to target it)
COORD_IP="$WORKING_IP"

# 4. Join other reachable speakers to the new coordinator via UPnP
COORD_UUID="<UUID of coordinator>"  # get from discover output (udn field)
for ip in <other reachable IPs>; do
  curl -s --connect-timeout 3 "http://$ip:1400/MediaRenderer/AVTransport/Control" \
    -X POST \
    -H "Content-Type: text/xml; charset=utf-8" \
    -H 'SOAPACTION: "urn:schemas-upnp-org:service:AVTransport:1#SetAVTransportURI"' \
    -d "<?xml version=\"1.0\" encoding=\"utf-8\"?><s:Envelope xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\" s:encodingStyle=\"http://schemas.xmlsoap.org/encoding/\"><s:Body><u:SetAVTransportURI xmlns:u=\"urn:schemas-upnp-org:service:AVTransport:1\"><InstanceID>0</InstanceID><CurrentURI>x-rincon:${COORD_UUID}</CurrentURI><CurrentURIMetaData></CurrentURIMetaData></u:SetAVTransportURI></s:Body></s:Envelope>"
done

# 5. Now sonos-pr3 works again — use --ip "$COORD_IP" for all commands
sonos-pr3 queue clear --ip "$COORD_IP"
sonos-pr3 status --ip "$COORD_IP" --format json
```

**After recovery:** use `--ip "$COORD_IP"` on all `sonos-pr3` commands for the rest of the session. The `--name` flag may still route through the stale cached topology. `--ip` with a known-good coordinator is the safe path.

**Speaker UUIDs (for reference):**

| Name | IP | UUID |
|------|----|------|
| Bathroom | 192.168.50.236 | RINCON_804AF295E39201400 |
| Bedroom | 192.168.50.39 | RINCON_804AF28C931801400 |
| Kitchen | 192.168.50.244 | RINCON_804AF299AA2601400 |
| Living Room | 192.168.50.114 | RINCON_F0F6C1641FFA01400 |

**Volume on grouped speakers after recovery:** `sonos-pr3 volume set` only sets the coordinator's volume. Use `brain music volume-set <level> --name "<coordinator>"` to set every group member to the exact same absolute level via RenderingControl UPnP.

### 8. `sonos-pr3 volume set/get` ignores `--name` — always targets coordinator

`sonos-pr3 volume set --name "Bathroom" 40` does NOT set the Bathroom's volume. It sets the group coordinator's volume, regardless of what `--name` you pass. `sonos-pr3 volume get` has the same bug — it returns the coordinator's volume, not the named speaker's.

**Root cause:** The CLI routes all volume operations through the ZoneGroupTopology coordinator. Individual group member volume is controlled via each speaker's own RenderingControl service, which `sonos-pr3` doesn't expose per-member.

**Fix:** When you need different volumes across grouped speakers, use `brain music volume-set` for the uniform base, then UPnP RenderingControl directly on each speaker's IP for the outliers. See the Volume commands section above for the full curl template and verification command.

## Workflows

### Play something by name (artist, album, song, playlist)

Infer `--category` from intent. For artists, use `brain music play-artist` instead of `--category artists`.

```bash
# 1. Always clear queue first
sonos-pr3 queue clear --name "<Room>"

# 2. Set mode BEFORE play — shuffle from the previous session bleeds in if you do this after
sonos-pr3 mode repeat --name "<Room>"    # for albums
# sonos-pr3 mode shuffle --name "<Room>" # for artists / playlists

# 3. Resolve and play based on content type:

# For albums:
sonos-pr3 search applemusic "<query>" --category albums --limit 5 --format json  # disambiguate versions
sonos-pr3 play applemusic "<query>" --category albums --index <n> --name "<Room>"
sonos-pr3 queue play 1 --name "<Room>"   # ALWAYS seek to track 1 — non-negotiable for albums

# For songs/catalog playlists:
sonos-pr3 play applemusic "<query>" --category <songs|playlists> --name "<Room>"

# For artists:
sonos-pr3 search applemusic "<query>" --category artists --format json  # get artist ID
brain music play-artist <artist-id> --name "<Room>" --title "<artist name>"
sonos-pr3 play --name "<Room>"

# For personal library playlists:
brain music applemusic playlists --format json  # get playlist ID
brain music play-playlist <playlist-id> --name "<Room>" --title "<name>"
sonos-pr3 play --name "<Room>"

# 4. Set volume
brain music volume-set <per defaults> --name "<Room>"  # sets all grouped speakers uniformly

# 5. Verify
sonos-pr3 status --name "<Room>" --format json
```

**Mode rules:**
- **Album request** → `repeat` (front-to-back, repeats when done). Always.
- **Artist request** → `shuffle` (all their albums queued, shuffled across the discography, repeats)
- **Playlist request** → `shuffle` (shuffle + repeat)
- **Mood/vibe request** → follow the resolved content type: if it resolves to an album, use `repeat`; if playlist/artist, use `shuffle`

**Album non-negotiables (violations will play the wrong track):**
- Mode MUST be set before `sonos-pr3 play applemusic` — not after. Shuffle bleeds in from the previous session's mode if you reverse the order.
- `sonos-pr3 queue play 1` MUST follow every album play. Without it, playback starts at whatever track the queue cursor was at — not track 1.

### Play from personal library (recent, my playlists, heavy rotation)

1. Fetch with `brain music applemusic` — pull from multiple sources for the best picture:
   - `recent-played` — albums/playlists/stations Kyle has listened to lately
   - `heavy-rotation` — what Kyle listens to most
   - `playlists` — Kyle's curated playlists (titles are descriptive of vibe/mood)
   - `recently-added` — new additions to Kyle's library
2. Pick best match based on the request (or ask if ambiguous)
3. Resolve and play:
   - If the match is a catalog album/playlist → `queue clear` + `sonos-pr3 play applemusic`
   - If the match is a personal library playlist → `queue clear` + `brain music play-playlist <id>` + `sonos-pr3 play`
4. Set mode + volume per defaults, verify

### No specific request ("play music", "put something on")

1. Pull `brain music applemusic recent-played` and `brain music applemusic heavy-rotation`
2. Pick a random album or playlist from the results — variety is good, don't always pick the first item
3. Clear queue, play via `sonos-pr3 play applemusic`, shuffle mode
4. Set volume per defaults, verify

### Mood / vibe request ("chill vibes", "something upbeat", "focus music")

1. Pull from multiple personal sources to find the best fit:
   - `brain music applemusic recent-played` + `heavy-rotation` — check album/artist names and genre tags
   - `brain music applemusic playlists` — playlist titles often describe the vibe directly (e.g. a playlist named "chill" for a chill request)
2. Use the genre tags in the response data (available on albums/songs, not playlists) plus general knowledge of the artists/albums to judge which items match the requested mood
3. Pick the best fit — personal playlists are now playable via `brain music play-playlist`
4. Clear queue, play via `sonos-pr3 play applemusic`
5. Set mode based on what was resolved: album → `normal`, playlist/artist → `shuffle-norepeat`
6. Only fall back to broad Apple Music catalog search if nothing in Kyle's personal data fits the mood
7. If too ambiguous to make a confident pick, ask one short question

### Transport (pause, resume, skip, volume)

Direct execution — no content resolution. Apply volume defaults if setting volume without a specific number.

### Room / grouping changes

Use group commands. "Play everywhere" = `group party`. "Just in the bedroom" = `group solo` on bedroom first if currently grouped, then target bedroom.

## Principles

- Interpret requests fuzzily — never require exact titles or spellings.
- **Resolve ambiguity with historical data, never by asking.** When a search returns multiple results (e.g. Vol. 1, Vol. 2, Vol. 3 of the same series), check recent-played, heavy-rotation, and music-history.json. If Kyle has listened to one of them before, that's the answer — play it without asking. Only ask when there's genuine ambiguity that history can't resolve (e.g. two completely different artists with the same name, neither in history).
- **Always bias toward Kyle's own music first** — playlists, recently played, heavy rotation, recently added, library. Only fall back to broad Apple Music catalog search when nothing in his personal data fits.
- **Blocked playlist:** never play `Bedroom Chill` (`p.EYWr620uoL9XZG`) for any automatic pick (generic/mood/chill/etc.). Treat it as hard-blocked unless Kyle explicitly asks to override this preference.
- Use genre tags, artist names, album/playlist titles, and general knowledge of the music to make intelligent picks that match the request's vibe or mood.
- **Mode is dictated by the resolved content type**, not the request type. Albums always play front-to-back with repeat (`repeat`). Playlists and artist-substitutes always shuffle with repeat (`shuffle`).
- **Never bail on a pick because of low track count.** If a playlist or album has few songs, that's fine — play it. Short playlists are still curated and intentional. Don't second-guess a good match just because it's only 9 tracks.
- **Never queue a single song** unless Kyle explicitly asks for a specific song by name. Always prefer `--category albums` or `--category playlists` so there's continuous playback. A single song will stop after it finishes.
- **Always clear the queue** (`queue clear`) before playing new content to prevent stale tracks from bleeding into the new playback.
- **Never use `--category artists`** — it fails with UPnP error 800. Use `brain music play-artist` instead.
- **Never use `favorites open`** — it fails with UPnP error 714 for streaming content. Use `brain music play-playlist` or catalog search instead.
- **Never use Spotify.** No `search spotify`, `play spotify`, `open <spotify:uri>`, or any Spotify commands. Apple Music only.

## Guardrails

- **Always run the speaker health check first (Step 0).** If a speaker is down and was the group coordinator, all `sonos-pr3` commands will fail silently or timeout. Run the UPnP recovery procedure before attempting anything else. This takes priority over everything.
- **After recovery, use `--ip` not `--name`.** Once you've rebuilt the group via raw UPnP, `sonos-pr3`'s cached topology may still point to the dead coordinator. Pass `--ip <coordinator-ip>` explicitly on every command for the rest of the session.
- **Always clear queue before playing.** This is the single most important step to prevent playback issues.
- **Set mode BEFORE `sonos-pr3 play applemusic`.** The play command starts playback immediately — setting mode after it is too late; the previous session's shuffle state bleeds in. Always: clear → set mode → play → seek.
- **For albums, ALWAYS run `sonos-pr3 queue play 1` after play.** Without this explicit seek, playback starts at whatever queue cursor position was left over. No exceptions.
- Verify playback changes with `sonos-pr3 status` — check that the `nowPlaying` artist/album matches what you intended.
- If `sonos-pr3 play applemusic` returns unexpected results, use `sonos-pr3 search applemusic --format json` to preview results and pick with `--index`.
- When the first result is a deluxe/expanded edition, check for the standard album at a higher index.
- If a command fails, return the exact error and one concrete next step.
- Multiple strong candidates → check history first (recent-played, heavy-rotation, music-history.json). If one candidate appears in Kyle's listening history and others don't, pick it. Only ask if history provides no signal AND the candidates are genuinely different content.
