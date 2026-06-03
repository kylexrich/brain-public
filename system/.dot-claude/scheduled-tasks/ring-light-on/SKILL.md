---
name: ring-light-on
description: Turn on Kyle's Elgato stream lights at 7am daily
---

Turn Kyle's Elgato stream lights ON. This controls the Key Light, Key Light Neo, and Ring Light together.

Invoke the `$control-stream-lights` skill with this INPUT:

ACTION=on

Follow the skill's output rules exactly: on success for all three devices, stay completely silent (no reply, no narration). Only if a device fails, send a one-line failure summary via the `$marvin-imsg` skill.

/control-stream-lights
