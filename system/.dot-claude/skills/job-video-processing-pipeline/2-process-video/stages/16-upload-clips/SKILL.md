---
name: 16-upload-clips
description: "Upload each produced clip MP4 from stage 14 to YouTube as a standalone video with a per-clip title/description, and write a local upload manifest. Pure automation — no LLM."
---

# Stage 16 — Upload Clips

**Mission:** Take the produced clip MP4 files from stage 14, upload each one to YouTube as a new standalone video via the YouTube Data API
v3 `videos.insert` endpoint, and produce a manifest recording the upload outcome (video ID, URL, privacy status) per clip. All upload
metadata is stored locally alongside the source MP4.

---

## Interface

### Inputs

```yaml
clip_production_manifest_file:
  type: string
  required: true
  description: Absolute path to clip_production_manifest.json (stage 14 output).
  constraints: Must exist and contain a valid clips array.

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

This stage only runs when stage 14 (clip-production) succeeded and produced at least one clip with `status = "success"`. If stage 14 did not
succeed, the orchestrator skips this stage.

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
2. Read `source_stream_file` to get the source-stream YouTube URL — used to substitute `{source_stream_url}` into each clip's description.
3. Filter the clips list to only those with `status = "success"` (clips that failed production cannot be uploaded).

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
- `source_stream_url`: the substituted URL from `source_stream.json`
- `default_privacy_status`: the privacy_status used as default for this run
- `clip_count`: total clips attempted
- `clips`: array of per-clip upload results

### 5. Verify

- [ ] `upload_manifest_file` exists and is non-empty
- [ ] Top-level keys `generated_at`, `source_clip_manifest`, `source_stream_url`, `default_privacy_status`, `clip_count`, and `clips` are present
- [ ] `clip_count` matches `clips` array length
- [ ] Every clip entry has populated `filename`, `title`, `vibe_tier`, `privacy_status`, `status` (`success` or `error`)
- [ ] Every clip with `status: "success"` has a populated `video_id` (11 chars) and a `url`
- [ ] Every clip with `status: "error"` has a populated `error` field
- [ ] At least one clip has `status: "success"`

If any check fails: do not return success.
