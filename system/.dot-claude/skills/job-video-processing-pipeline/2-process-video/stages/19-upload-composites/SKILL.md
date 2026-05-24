---
name: 19-upload-composites
description: "Upload each produced composite MP4 from stage 15 to YouTube — gated by stage 17 rating (only composites with aggregate_verdict='publish' are uploaded). Builds chapters from per-segment local timings. Pure automation — no LLM."
---

# Stage 19 — Upload Composites

**Mission:** Upload composites that passed the stage 17 quality gate. Build the final YouTube description (chapters substituted from
per-segment local-timings, source-stream URL substituted), call the YouTube Data API v3 `videos.insert` endpoint, and write the per-composite
upload manifest. Composites that landed `hold` or `reject` in stage 17 are recorded with `status = "skipped"` — they stay on disk for
manual review and never go to YouTube automatically.

---

## Interface

### Inputs

```yaml
composite_clip_production_manifest_file:
  type: string
  required: true
  description: Absolute path to composite_clip_production_manifest.json (stage 15 output).
  constraints: Must exist and contain a valid composites array with per-segment local timings.

composite_rating_manifest_file:
  type: string
  required: true
  description: Absolute path to composite_rating_manifest.json (stage 17 output). Gates the upload — only composites with aggregate_verdict='publish' are uploaded.
  constraints: Must exist on disk. Every composite in the production manifest must have a corresponding entry here.

source_stream_file:
  type: string
  required: true
  description: Absolute path to source_stream.json (used to substitute {source_stream_url}).
  constraints: Must exist on disk.

upload_manifest_file:
  type: string
  required: true
  description: Absolute path where composite_clip_upload_manifest.json will be written.

privacy_status:
  type: string
  required: false
  default: unlisted
  description: YouTube privacy status for the uploaded composites.
  constraints: One of `private | unlisted | public`.

force:
  type: boolean
  required: false
  default: false
  description: Re-upload composites even if upload_manifest_file already exists with successful records.
```

### Outputs

```yaml
composite_clip_upload_manifest:
  op: create
  path: "{upload_manifest_file}"
  count: 1
  description: Per-composite upload outcome.
  template: composite_clip_upload_manifest.output.template.jsonc
```

### Response Format

```jsonc
// Return payload (not written to disk)
{
  "status": "success | skipped | error",
  "composite_count": 3,
  "composites_uploaded": 3,
  "composites_failed": 0,
  "composites_skipped": 0,
  "reason": "<error description — only present when status is error>"
}
```

### Failure Modes

Mirror stage 16 — per-composite failures are recorded and the stage continues. The stage returns `success` if at least one composite
uploaded.

### Dependency Gate

Runs only when stage 15 (composite-clip-production) succeeded AND stage 17 (rate-composites) succeeded. If either failed, the orchestrator
skips this stage entirely — uploads are conditional on having ratings, never unrated.

---

## Execution

### 1. Check idempotency

Same shape as stage 16 — skip already-successfully-uploaded composites unless `force` is set.

### 2. Load inputs

1. Read `composite_clip_production_manifest_file` to get the produced composites with per-segment `local_start_sec` / `local_end_sec`.
2. Read `composite_rating_manifest_file` to get the rating verdict per composite.
3. Read `source_stream_file` to get the source-stream URL.
4. **Filter to composites with `production.status = "success"` AND `rating.aggregate_verdict = "publish"`.** Record `skip_reason`
   (`production_failed`, `rating_hold`, `rating_reject`) for every filtered-out composite so the upload manifest captures everything.

### 3. Build description per composite

For each composite:

1. **Build the chapters block from the `segments` array** in the composite. Format:
   ```
   0:00 {segment_1_title}
   M:SS {segment_2_title}
   ...
   ```
   Convert each segment's `local_start_sec` to `H:MM:SS` (or `M:SS` if under an hour). Validate YouTube's chapter rules:
   - First chapter MUST start at `0:00`
   - At least 3 chapters required for YouTube auto-parsing
   - Each chapter must be at least 10 seconds (verified via `local_end_sec - local_start_sec >= 10`)
   - If the composite has fewer than 3 segments OR any segment is under 10 seconds, **strip the chapters block entirely** (leave the `{chapters}` placeholder section empty and omit the `⏱️ Chapters` heading). YouTube only displays chapters when all rules pass; partial chapter sets confuse the parser.
2. **Substitute placeholders** in the composite's description:
   - `{chapters}` → the chapter block (or empty string if skipped — including the heading)
   - `{source_stream_url}` → value from `source_stream.json`
3. **Verify the AI-disclosure line is still present** after substitution.

### 4. Upload each composite

```sh
brain stream youtube-upload-clip \
  --file {composites_dir}/{filename} \
  --title "{title}" \
  --description "{substituted_description}" \
  --privacy {privacy_status} \
  --tags "building-in-public,AI-edited,{format_category_kebab},{vibe_tier_kebab}" \
  --output {temp_per_composite_result_json}
```

Same per-call shape as stage 16. Tags add the composite's format category for discoverability. Category defaults to **28 (Science &
Technology)** via the CLI — never falls back to 22 (People & Blogs). If a composite is pure chess content (`format_category =
GAME_RECAP`, `vibe_tier = CHESS_INSIGHT`) and you want to override to 20 (Gaming) or 27 (Education) for that specific composite, pass
`--category-id` explicitly.

### 5. Write manifest

Write `upload_manifest_file` conforming to `composite_clip_upload_manifest.output.template.jsonc` with the same shape as the clip upload
manifest, plus a per-composite `chapter_count` field recording how many chapters made it into the published description (0 if skipped).
Skipped composites (production failure or rating hold/reject) are recorded with `status = "skipped"` and a `skip_reason`.

### 6. Verify

- [ ] `upload_manifest_file` exists and is non-empty
- [ ] Top-level keys `generated_at`, `source_composite_manifest`, `source_rating_manifest`, `source_stream_url`, `default_privacy_status`, `composite_count`, `composites` are present
- [ ] `composite_count` matches `composites` array length
- [ ] Every composite entry has populated `filename`, `title`, `vibe_tier`, `format_category`, `aggregate_verdict`, `status` (`success`, `error`, or `skipped`)
- [ ] Every composite with `status: "success"` has a populated `video_id` (11 chars), `url`, `uploaded_at`, `privacy_status`, and `chapter_count`
- [ ] Every composite with `status: "error"` has a populated `error` field
- [ ] Every composite with `status: "skipped"` has a populated `skip_reason` (`production_failed`, `rating_hold`, or `rating_reject`)
- [ ] If any composites were rated `publish`, at least one such composite has `status: "success"`

If any check fails: do not return success.
