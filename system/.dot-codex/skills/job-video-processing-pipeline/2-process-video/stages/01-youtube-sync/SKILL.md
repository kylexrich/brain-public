---
name: 01-youtube-sync
description: "Fetch the current YouTube title, description, and duration for a video and write them to youtube-metadata.json. Not for general YouTube API queries."
---

# Stage 01 — YouTube Sync

**Mission:** Fetch the current YouTube video title, description, and duration for a stream and write them to a local `youtube-metadata.json`
file. Guarantees the output file is present and populated on success.

---

## Interface

### Inputs

```yaml
source_stream_file:
  type: string
  required: true
  description: Absolute path to source_stream.json, which contains video_id.
  constraints: Must exist and contain video_id.

output_file:
  type: string
  required: true
  description: Absolute path for the output youtube-metadata.json.
  constraints: Parent directory must exist.
```

### Outputs

```yaml
youtube_metadata:
  op: create
  path: "{output_file}"
  count: 1
  description: YouTube metadata fetched from the API.
  template: youtube_metadata.output.template.jsonc
```

### Response Format

```jsonc
// Return payload (not written to disk)
{
  "status": "success | error",
  "video_id": "abc123",        // YouTube video id resolved from source_stream_file
  "vod_duration_sec": 12345,   // duration in integer seconds from the YouTube metadata fetch
  "reason": "<error description — only present when status is error>"
}
```

---

## Execution

### 1. Sync YouTube metadata

1. Run the `brain` CLI to fetch YouTube metadata and write the output file.

```sh
brain stream youtube-sync --source-file {source_stream_file} --output {output_file}
```

**Expect:** exits 0; `output_file` is written matching the shape in `youtube_metadata.output.template.jsonc`
**On fail:** surface the error

### 2. Verify

- [ ] `output_file` exists and is non-empty
- [ ] Output JSON contains `title`, `description`, `vod_duration_sec`, `youtube_url`, and `generated_at`
- [ ] Returned result JSON contains `status: "success"`, `video_id`, and `vod_duration_sec`

If any check fails: return `status: "error"` with the failure detail.
