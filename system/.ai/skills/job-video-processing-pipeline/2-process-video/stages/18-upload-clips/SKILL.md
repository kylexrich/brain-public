---
name: 18-upload-clips
description: "Upload each produced clip MP4 from stage 14 to YouTube — gated by stage 16 rating (only clips with aggregate_verdict='publish' are uploaded). Pure automation — no LLM."
---

# Stage 18 — Upload Clips

**Mission:** Upload the produced clip MP4s that passed the stage 16 quality gate (3-rater aggregate verdict = `publish`) to YouTube as
standalone videos. Skip clips that landed `hold` or `reject` — those stay on disk for manual review but never go to YouTube
automatically. Per-clip upload outcomes are written to a local manifest.

---

## Interface

### Inputs

```yaml
clip_production_manifest_file:
  type: string
  required: true
  description: Absolute path to clip_production_manifest.json (stage 14 output).
  constraints: Must exist and contain a valid clips array.

clip_rating_manifest_file:
  type: string
  required: true
  description: Absolute path to clip_rating_manifest.json (stage 16 output). Gates the upload — only clips with aggregate_verdict='publish' are uploaded.
  constraints: Must exist on disk. Every clip in clip_production_manifest_file must have a corresponding entry here.

source_stream_file:
  type: string
  required: true
  description: Absolute path to source_stream.json (used to substitute {source_stream_url} into descriptions).
  constraints: Must exist on disk.

upload_manifest_file:
  type: string
  required: true
  description: Absolute path where clip_upload_manifest.json will be written.

privacy_status:
  type: string
  required: false
  default: unlisted
  description: YouTube privacy status for the uploaded clips.
  constraints: One of `private | unlisted | public`. Default is `unlisted` so clips are sharable by URL but don't flood the channel
    feed before review. Switch via the `--privacy` flag on the CLI.

force:
  type: boolean
  required: false
  default: false
  description: Re-upload clips even if upload_manifest_file already exists and records successful uploads.
  constraints: When false, skips clips that already have status `success` in the existing manifest.
```

### Outputs

```yaml
clip_upload_manifest:
  op: create
  path: "{upload_manifest_file}"
  count: 1
  description: Per-clip upload outcome (video_id, url, privacy_status, errors).
  template: clip_upload_manifest.output.template.jsonc
```

### Response Format

```jsonc
// Return payload (not written to disk)
{
  "status": "success | skipped | error",
  "clip_count": 6,
  "clips_uploaded": 5,
  "clips_failed": 1,
  "clips_skipped": 0,
  "reason": "<error description — only present when status is error>"
}
```

### Failure Modes

- Missing or unreadable `clip_production_manifest_file`: return `error`.
- Missing `source_stream_file`: return `error` (we can't substitute the source-stream URL without it).
- YouTube auth failure (token expired, missing scope, project not audited): return `error` with the underlying error message.
- Per-clip upload failure: record the error in the manifest and continue with the next clip — one bad clip does not block the rest.
- Partial success: stage returns `success` as long as at least one clip uploaded successfully. `clips_failed` is non-zero.

### Dependency Gate

This stage only runs when stage 14 (clip-production) succeeded AND stage 16 (rate-clips) succeeded. If either failed, the orchestrator
skips this stage entirely — uploads are conditional on having ratings, never unrated.

---

## Execution

### 1. Check idempotency

**When:** `upload_manifest_file` already exists and `force` is not `true`

1. Read the existing manifest. For each clip already marked `status = "success"`, treat it as already uploaded and do not re-upload.
2. If every clip in the production manifest is already successfully uploaded, return `{"status": "skipped", "clip_count": N, "clips_uploaded": N, "clips_failed": 0, "clips_skipped": N}` and stop.
3. Otherwise, continue to step 2 and only upload the clips not yet successfully uploaded.

**Otherwise:**

1. Continue to Step 2.

### 2. Load inputs

1. Read `clip_production_manifest_file` to get the list of produced clips with their per-clip metadata (title, description, format, vibe_tier, etc.).
2. Read `clip_rating_manifest_file` to get the rating verdict per clip.
3. Read `source_stream_file` to get the source-stream YouTube URL — used to substitute `{source_stream_url}` into each clip's description.
4. **Filter the clips list to only those with `production.status = "success"` AND `rating.aggregate_verdict = "publish"`.** Clips that
   failed production cannot be uploaded; clips with rating `hold` or `reject` are intentionally not uploaded. Record the skip reason
   (`production_failed`, `rating_hold`, `rating_reject`) for every filtered-out clip so the upload manifest captures the full picture.

### 3. Upload each clip

For each clip:

1. **Substitute placeholders in the description.** Replace `{source_stream_url}` with the value from `source_stream.json`. Verify the
   AI-disclosure line is still present after substitution.
2. **Call the upload CLI:**
   ```sh
   brain stream youtube-upload-clip \
     --file {clips_dir}/{filename} \
     --title "{title}" \
     --description "{substituted_description}" \
     --privacy {privacy_status} \
     --tags "building-in-public,AI-edited,{vibe_tier_kebab}" \
     --output {temp_per_clip_result_json}
   ```
   `vibe_tier_kebab` = vibe tier converted to lowercase kebab-case (e.g., `failure-and-recovery`).
   The CLI default category is **28 (Science & Technology)** — the channel's primary category for AI/engineering/chess content.
   Do not pass `--category-id` to fall back to a different category unless the clip is genuinely off-topic (rare). Never use 22
   (People & Blogs). If a future clip is pure chess content and you want to override to 20 (Gaming) or 27 (Education), pass
   `--category-id` explicitly.
3. **Capture the result.** The CLI writes a small JSON with `video_id`, `url`, `privacy_status`, `category_id`, and any error. Move the
   per-clip result into the in-memory clips array.
4. **On per-clip failure:** record `status: "error"` with the error message and move on. Do not abort the stage.

### 4. Write manifest

Write `upload_manifest_file` conforming to `clip_upload_manifest.output.template.jsonc` with:

- `generated_at`: current ISO8601 timestamp
- `source_clip_manifest`: absolute path to the input clip production manifest
- `source_rating_manifest`: absolute path to the input clip rating manifest
- `source_stream_url`: the substituted URL from `source_stream.json`
- `default_privacy_status`: the privacy_status used as default for this run
- `clip_count`: total clips considered (production-success ∪ rating-evaluated)
- `clips`: array of per-clip results — uploaded clips have `status = "success"` and an upload payload; skipped clips have `status = "skipped"` and a `skip_reason` of `production_failed`, `rating_hold`, or `rating_reject`

### 5. Verify

- [ ] `upload_manifest_file` exists and is non-empty
- [ ] Top-level keys `generated_at`, `source_clip_manifest`, `source_rating_manifest`, `source_stream_url`, `default_privacy_status`, `clip_count`, and `clips` are present
- [ ] `clip_count` matches `clips` array length
- [ ] Every clip entry has populated `filename`, `title`, `vibe_tier`, `aggregate_verdict`, `status` (`success`, `error`, or `skipped`)
- [ ] Every clip with `status: "success"` has a populated `video_id` (11 chars), `url`, and `privacy_status`
- [ ] Every clip with `status: "error"` has a populated `error` field
- [ ] Every clip with `status: "skipped"` has a populated `skip_reason` (`production_failed`, `rating_hold`, or `rating_reject`)
- [ ] If any clips were rated `publish`, at least one such clip has `status: "success"` (i.e. uploads actually ran)

If any check fails: do not return success.
