---
name: 14-clip-production
description: "Extract individual clips from the source VOD using ffmpeg based on clip suggestions from stage 08. Pure automation — no LLM analysis."
---

# Stage 14 — Clip Production

**Mission:** Take the timestamped clip suggestions produced by stage 08 and use ffmpeg to extract each clip from the source VOD as a
standalone `.mp4` file. Produce a manifest tracking all clips and their production status.

---

## Interface

### Inputs

```yaml
clip_suggestions_file:
  type: string
  required: true
  description: Absolute path to clip_suggestions.json (stage 08 output).
  constraints: Must exist and contain a valid suggestions array.

vod_file:
  type: string
  required: true
  description: Absolute path to the source VOD file.
  constraints: Must exist on disk.

output_dir:
  type: string
  required: true
  description: Absolute path for the clips output directory.
  constraints: "Will be created if it does not exist."

manifest_file:
  type: string
  required: true
  description: Absolute path for the output clip_production_manifest.json.

force:
  type: boolean
  required: false
  default: false
  description: Re-execute even if manifest already exists.
  constraints: When false, skips if manifest_file exists.
```

### Outputs

```yaml
clip_production_manifest:
  op: create
  path: "{manifest_file}"
  count: 1
  description: Manifest of all produced clips with per-clip status.
  template: clip_production_manifest.output.template.jsonc

clip_files:
  op: create
  path: "{output_dir}/{NN}-{kebab-title}.mp4"
  count: "one per suggestion"
  description: Individual clip files extracted from the VOD.
```

### Response Format

```jsonc
// Return payload (not written to disk)
{
  "status": "success | skipped | error",
  "clip_count": 8,
  "clips_produced": 7,
  "clips_failed": 1,
  "reason": "<error description — only present when status is error>"
}
```

### Failure Modes

- Missing or unreadable `clip_suggestions_file`: return `{"status": "error", "clip_count": 0, "clips_produced": 0, "clips_failed": 0, "reason": "<description>"}`.
- Missing or unreadable `vod_file`: return `{"status": "error", "clip_count": 0, "clips_produced": 0, "clips_failed": 0, "reason": "<description>"}`.
- All individual clip extractions fail: return `{"status": "error", ...}` with details.
- Partial failures: return `{"status": "success", ...}` with `clips_failed` > 0. Stage succeeds if at least one clip was produced.

### Dependency Gate

This stage only runs when stage 08 (clip-suggestions) succeeded. If stage 08 did not succeed, the orchestrator skips this stage.

---

## Execution

### 1. Check idempotency

**When:** `manifest_file` already exists and `force` is not `true`

1. Read `clip_count` and `clips_produced` from the existing `manifest_file`.
2. Return `{"status": "skipped", "clip_count": <value>, "clips_produced": <value>, "clips_failed": 0}` and stop.

**Otherwise:**

1. Continue to Step 2.

### 2. Load suggestions

1. Read `clip_suggestions_file` and extract the `suggestions` array.
2. If the array is empty, write an empty manifest and return `{"status": "success", "clip_count": 0, "clips_produced": 0, "clips_failed": 0}`.

### 3. Create output directory

1. Run `mkdir -p {output_dir}`.

### 4. Process each clip

For each suggestion (indexed from 1):

1. **Generate filename:** `{NN}-{kebab-title}.mp4` where:
   - `NN` = zero-padded index (01, 02, ...)
   - `kebab-title` = suggestion `title` converted to lowercase, non-alphanumeric characters removed (except hyphens), spaces replaced with hyphens, consecutive hyphens collapsed, truncated to 60 characters, trailing hyphens stripped.
2. **Run ffmpeg:**
   ```sh
   ffmpeg -y -hide_banner -loglevel error -ss {start_seconds} -i {vod_file} -t {duration_sec} -c copy -movflags +faststart {output_dir}/{filename}
   ```
   - `-y`: overwrite without prompting
   - `-hide_banner -loglevel error`: suppress noisy output
   - `-ss` before `-i`: fast input seeking (seeks to nearest keyframe)
   - `-t`: duration in seconds (since `-ss` before `-i` resets timestamp origin)
   - `-c copy`: stream copy, no re-encoding
   - `-movflags +faststart`: move moov atom for web-compatible playback
3. **Record result:** On success, record `status: "success"` and capture `file_size_bytes` (via `stat` or `ls -l`). On failure, record `status: "error"` with the ffmpeg error message.

### 5. Write manifest

1. Write `manifest_file` conforming to `clip_production_manifest.output.template.jsonc` with:
   - `generated_at`: current ISO8601 timestamp
   - `source_vod`: absolute path to the VOD
   - `clips_dir`: absolute path to the output directory
   - `clip_count`: total number of suggestions processed
   - `clips`: array of per-clip results

### 6. Verify

- [ ] `manifest_file` exists and is non-empty
- [ ] Top-level keys `generated_at`, `source_vod`, `clips_dir`, `clip_count`, and `clips` are present
- [ ] `clip_count` matches `clips` array length
- [ ] Every clip entry has populated `filename`, `title`, `start_seconds`, `end_seconds`, `duration_sec`, `format`, `status`
- [ ] For every clip with `status: "success"`, the corresponding file exists on disk in `output_dir`
- [ ] At least one clip has `status: "success"`

If any check fails: do not return success.
