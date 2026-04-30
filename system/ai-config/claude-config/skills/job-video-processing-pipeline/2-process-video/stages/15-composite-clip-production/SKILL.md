---
name: 15-composite-clip-production
description: "Assemble multi-segment composite clips from the source VOD using ffmpeg based on composite clip suggestions from stage 09. Pure automation — no LLM analysis."
---

# Stage 15 — Composite Clip Production

**Mission:** Take the multi-segment composite clip suggestions produced by stage 09 and use ffmpeg to extract each segment from the source
VOD, then concatenate them into standalone composite `.mp4` files. Produce a manifest tracking all composites and their production status.

---

## Interface

### Inputs

```yaml
composite_clip_suggestions_file:
  type: string
  required: true
  description: Absolute path to composite_clip_suggestions.json (stage 09 output).
  constraints: Must exist and contain a valid composites array.

vod_file:
  type: string
  required: true
  description: Absolute path to the source VOD file.
  constraints: Must exist on disk.

output_dir:
  type: string
  required: true
  description: Absolute path for the composite clips output directory.
  constraints: "Will be created if it does not exist."

manifest_file:
  type: string
  required: true
  description: Absolute path for the output composite_clip_production_manifest.json.

force:
  type: boolean
  required: false
  default: false
  description: Re-execute even if manifest already exists.
  constraints: When false, skips if manifest_file exists.
```

### Outputs

```yaml
composite_clip_production_manifest:
  op: create
  path: "{manifest_file}"
  count: 1
  description: Manifest of all produced composite clips with per-composite status.
  template: composite_clip_production_manifest.output.template.jsonc

composite_clip_files:
  op: create
  path: "{output_dir}/{NN}-{kebab-title}.mp4"
  count: "one per composite"
  description: Concatenated composite clip files assembled from VOD segments.
```

### Response Format

```jsonc
// Return payload (not written to disk)
{
  "status": "success | skipped | error",
  "composite_count": 3,
  "composites_produced": 3,
  "composites_failed": 0,
  "reason": "<error description — only present when status is error>"
}
```

### Failure Modes

- Missing or unreadable `composite_clip_suggestions_file`: return `{"status": "error", "composite_count": 0, "composites_produced": 0, "composites_failed": 0, "reason": "<description>"}`.
- Missing or unreadable `vod_file`: return `{"status": "error", "composite_count": 0, "composites_produced": 0, "composites_failed": 0, "reason": "<description>"}`.
- All individual composite assemblies fail: return `{"status": "error", ...}` with details.
- Partial failures: return `{"status": "success", ...}` with `composites_failed` > 0. Stage succeeds if at least one composite was produced.

### Dependency Gate

This stage only runs when stage 09 (composite-clip-suggestions) succeeded. If stage 09 did not succeed, the orchestrator skips this stage.

---

## Execution

### 1. Check idempotency

**When:** `manifest_file` already exists and `force` is not `true`

1. Read `composite_count` and `composites_produced` from the existing `manifest_file`.
2. Return `{"status": "skipped", "composite_count": <value>, "composites_produced": <value>, "composites_failed": 0}` and stop.

**Otherwise:**

1. Continue to Step 2.

### 2. Load composites

1. Read `composite_clip_suggestions_file` and extract the `composites` array.
2. If the array is empty, write an empty manifest and return `{"status": "success", "composite_count": 0, "composites_produced": 0, "composites_failed": 0}`.

### 3. Create output directory

1. Run `mkdir -p {output_dir}`.

### 4. Process each composite

For each composite (indexed from 1):

1. **Generate filename:** `{NN}-{kebab-title}.mp4` where:
   - `NN` = zero-padded index (01, 02, ...)
   - `kebab-title` = composite `title` converted to lowercase, non-alphanumeric characters removed (except hyphens), spaces replaced with hyphens, consecutive hyphens collapsed, truncated to 60 characters, trailing hyphens stripped.

2. **Create temp directory:** Create a temporary directory for segment extraction (e.g., via `mktemp -d`).

3. **Extract each segment:** For each segment in the composite's `segments` array (ordered by `start_seconds` ascending):
   ```sh
   ffmpeg -y -hide_banner -loglevel error -ss {start_seconds} -i {vod_file} -t {duration_sec} -c copy -movflags +faststart {temp_dir}/segment_{NN}.mp4
   ```
   - Segment files are named `segment_00.mp4`, `segment_01.mp4`, etc.
   - If any segment extraction fails, record the composite as `error` and skip to the next composite.

4. **Write concat list:** Create a text file `{temp_dir}/concat.txt` with one entry per segment:
   ```
   file 'segment_00.mp4'
   file 'segment_01.mp4'
   file 'segment_02.mp4'
   ```

5. **Concatenate segments:**
   ```sh
   ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i {temp_dir}/concat.txt -c copy -movflags +faststart {output_dir}/{filename}
   ```
   - `-f concat`: use the concat demuxer
   - `-safe 0`: allow relative paths in the concat list
   - `-c copy`: stream copy (no re-encoding — safe because all segments come from the same source VOD)

6. **Clean up temp directory:** Remove `{temp_dir}` and all its contents.

7. **Record result:** On success, record `status: "success"` and capture `file_size_bytes`. On failure, record `status: "error"` with the ffmpeg error message. Always clean up the temp directory regardless of success or failure.

### 5. Write manifest

1. Write `manifest_file` conforming to `composite_clip_production_manifest.output.template.jsonc` with:
   - `generated_at`: current ISO8601 timestamp
   - `source_vod`: absolute path to the VOD
   - `composites_dir`: absolute path to the output directory
   - `composite_count`: total number of composites processed
   - `composites`: array of per-composite results

### 6. Verify

- [ ] `manifest_file` exists and is non-empty
- [ ] Top-level keys `generated_at`, `source_vod`, `composites_dir`, `composite_count`, and `composites` are present
- [ ] `composite_count` matches `composites` array length
- [ ] Every composite entry has populated `filename`, `title`, `format_category`, `segment_count`, `status`
- [ ] For every composite with `status: "success"`, the corresponding file exists on disk in `output_dir`
- [ ] At least one composite has `status: "success"`
- [ ] No leftover temp directories remain

If any check fails: do not return success.
