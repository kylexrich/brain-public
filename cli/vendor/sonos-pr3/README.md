# sonos-pr3 (build source of truth)

This folder is the canonical build/provenance location for the local `sonos-pr3` binary.

## What is sonos-pr3?

`sonos-pr3` is a compiled Go CLI used for Sonos + Apple Music flows.

Active runtime binary path (used by skills):

- `sonos-pr3`

## Generation pipeline

1. Source pin is defined in `SOURCE.json`.
2. Build script clones that repo/ref and compiles the package.
3. Binary is installed to `sonos-pr3`.
4. Copy is also stored at `dist/sonos-pr3`.
5. Build metadata is written to:
   - `current-build.txt`
   - `current-build.json`

## Commands

Build from pinned source:

```bash
~/Developer/brain/vendor/sonos-pr3/build.sh
```

Verify existing binary + metadata:

```bash
~/Developer/brain/vendor/sonos-pr3/verify.sh
```

## Override build inputs (optional)

```bash
SONOSCLI_REF=<branch-or-commit> ~/Developer/brain/vendor/sonos-pr3/build.sh
SONOSCLI_REPO=<repo-url> SONOSCLI_REF=<commit> ~/Developer/brain/vendor/sonos-pr3/build.sh
```

## Notes

- We do **not** patch the binary directly.
- Changes should come from source + rebuild, or from explicit companion tools (e.g. `brain music applemusic`).
