---
name: 02-download
description: "Download a YouTube VOD to a local file using brain stream download. Not for general YouTube downloads."
---

# Stage 02 — Download

**Mission:** Download the YouTube VOD to the specified output path using `brain stream download`. Skips work when the output file already
exists and its duration matches the expected duration; re-downloads when forced or when a duration mismatch is detected.

---

## Interface

### Inputs

```yaml
youtube_metadata_file:
  type: string
  required: true
  description: Absolute path to youtube-metadata.json (provides youtube_url and vod_duration_sec).
  constraints: Must exist and contain youtube_url and vod_duration_sec.

output_file:
  type: string
  required: true
  description: Absolute path where the VOD file will be written.
  constraints: "Parent directory must exist; conventionally {stream_dir}/{stream_key}_vod.mp4."

force:
  type: boolean
  required: false
  default: false
  description: Re-download even if VOD duration already matches.
  constraints: When false, skips download when output_file exists and its duration matches vod_duration_sec from youtube_metadata_file.
```

### Outputs

```yaml
vod_file:
  op: create
  path: "{output_file}"
  count: 1
  description: Downloaded VOD video file (binary, typically .mp4).
  template: —
```

### Response Format

```jsonc
// Return payload (not written to disk)
{
  "status": "success | skipped | error", // "skipped" when output_file already exists with matching duration and force is false
  "video_file": "/absolute/path/to/<stream_key>_vod.mp4", // absolute path to the VOD file on disk; present on success or skipped; absent on error
  "reason": "<error description — only present when status is error>"
}
```

---

## Execution

### 1. Download VOD

1. Run the `brain` CLI to download the VOD. Append `--force` if `force: true`.

```sh
brain stream download --youtube-metadata-file {youtube_metadata_file} --output {output_file} [--force]
```

**Expect:** exits 0; `output_file` is written as a non-empty video file
**On fail:** surface the stderr; return `status: "error"`

### 2. Verify

- [ ] `output_file` exists and is non-empty
- [ ] `output_file` is a readable video file (ffprobe reports a positive duration)
- [ ] Returned result JSON matches the schema in `### Response Format` and contains `status: "success"` or `status: "skipped"`

If any check fails: return `status: "error"` with the failure detail; do not return success.
