---
name: 13-youtube-publish
description: "Push a stream's YouTube metadata to YouTube. Reads youtube-metadata.json and source_stream.json, calls brain stream youtube-publish, and writes youtube_publish.json."
---

# Stage 13 — YouTube Publish

**Mission:** Read the living `youtube-metadata.json` and push its title and description to YouTube, producing a `youtube_publish.json` that
records what was published and whether each field succeeded.

---

## Interface

### Inputs

```yaml
youtube_metadata_file:
  type: string
  required: true
  description: Absolute path to youtube-metadata.json (the living document to publish).
  constraints: Must exist on disk.

source_stream_file:
  type: string
  required: true
  description: Absolute path to source_stream.json (used to resolve the video ID).
  constraints: Must exist on disk.

output_file:
  type: string
  required: true
  description: Absolute path where youtube_publish.json will be written.
  constraints: Parent directory must exist.
```

### Outputs

```yaml
youtube_publish:
  op: create
  path: "{output_file}"
  count: 1
  description: Publish result record.
  template: youtube_publish.output.template.jsonc
```

### Response Format

```jsonc
// Return payload (not written to disk)
{
  "status": "success | partial | error",
  "video_id": "<string>",
  "published_title": "<boolean>",
  "published_description": "<boolean>",
  "reason": "<error description — only present when status is error>"
}
```

---

## Execution

### 1. Publish to YouTube

```sh
brain stream youtube-publish --metadata-file {youtube_metadata_file} --source-file {source_stream_file} --output {output_file}
```

**Expect:** exits 0; `output_file` written with the shape from `youtube_publish.output.template.jsonc`
**On fail:** surface the error; do not retry automatically.

### 2. Verify

- [ ] `output_file` exists and is non-empty
- [ ] `output_file` contains `video_id`, `published_title`, `published_description`, and `generated_at`
- [ ] Returned result contains `status` set to `success` or `partial` (not `error`)

If any check fails: do not return success.
