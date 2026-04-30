# TOOLS.md - Local Notes

## iMessage

- CLI: `/opt/homebrew/bin/imsg`
- Contact resolution: always use `skills/resolve-contact/SKILL.md`; it delegates to `brain contact resolve` for deterministic lookup before sending or labeling
- Before send: confirm recipient + exact message text with Kyle

## MCP (mcporter)

- Config: `~/Developer/brain/deprecated/openclaw/mbp-m4max-16/main/config/mcporter.json`
- Active servers:
  - `linear` (HTTP MCP)
- Routing convention: when Kyle says "Linear", treat it as MCP/mcporter by default

## Google Workspace (gog)

- CLI: `/opt/homebrew/bin/gog`
- Primary account: `kylexrich@gmail.com`
- Preflight check:
  - `~/Developer/brain/deprecated/openclaw/mbp-m4max-16/main/scripts/gog-preflight.sh`
  - (manual equivalent) `openclaw skills info gog` + `gog auth list`
- Gmail mark-all-read (no link opens):
  - list unread: `gog gmail messages search "is:unread" --all --account kylexrich@gmail.com --json`
  - bulk mark read: `gog gmail batch modify <messageIds...> --remove UNREAD --account kylexrich@gmail.com --no-input -y`

## Music

- Dedicated skill: `skills/music/SKILL.md`
**Speakers:**

| Name     | IP             |
|----------|----------------|
| Bathroom | 192.168.50.236 |
| Bedroom  | 192.168.50.39  |
| Kitchen  | 192.168.50.244 |
| Sonos    | 192.168.50.114 |

## Philips Hue (openhue)

- CLI: `/opt/homebrew/bin/openhue`
- Rooms:
  - `Sky Lounge` (lounge)
  - `Bathroom` (bathroom)
  - `Bedroom` (bedroom)
- Common commands:
  - `openhue get room`
  - `openhue get light`
  - `openhue set room "Sky Lounge" --off`
  - `openhue set room "Bedroom" --on --brightness 30`
- Sensor note:
  - Hue sensors are primarily readable (motion/light/temp/button) and used as automation inputs; lights/rooms/scenes are the control targets.

---

Add whatever helps you do your job. This is your cheat sheet.
