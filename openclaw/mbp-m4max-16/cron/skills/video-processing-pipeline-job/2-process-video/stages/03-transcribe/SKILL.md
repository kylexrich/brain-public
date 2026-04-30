---
name: 03-transcribe
description: "Generate the canonical transcript from a downloaded VOD using Whisper. Use when you need to produce or refresh a transcript JSON from a local VOD file. Not for re-editing existing transcripts or producing summaries."
---

# Stage 03 — Transcribe

**Mission:** Run Whisper on a local VOD file to produce a structured transcript JSON at the specified output path. Skips work when output
already exists and is current; re-transcribes when forced or when duration has changed.

---

## Interface

### Inputs

```yaml
video_file:
  type: string
  required: true
  description: Absolute path to the VOD file.
  constraints: Must exist on disk.

output_file:
  type: string
  required: true
  description: Absolute path for the output transcript JSON.
  constraints: Parent directory must be writable.

force:
  type: boolean
  required: false
  default: false
  description: Always re-transcribe, ignoring existing output.
  constraints: When false, skips if output_file exists and its duration_sec matches the VOD's ffprobe duration; re-transcribes on duration mismatch.
```

### Outputs

```yaml
transcript:
  op: create
  path: "{output_file}"
  count: 1
  description: Transcript JSON written by brain stream transcribe.
  template: transcript.output.template.jsonc
```

### Response Format

```jsonc
// Return payload (not written to disk)
{
  "status": "success | skipped | error",
  "transcript_file": "/absolute/path/to/transcript.json",
  "duration_sec": 25464.701,
  "reason": "<error description — only present when status is error>"
}
```

---

## Execution

### Check idempotency

**When:** `force` is `false` and `output_file` exists

1. Get the VOD duration via ffprobe.
   ```sh
   ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 {video_file}
   ```
   **Expect:** a decimal number (seconds)
   **On fail:** idempotency cannot be confirmed; skip the duration comparison and proceed to **Run transcription**.
2. Read `duration_sec` from the existing `output_file`.
3. Compare values. If they match, skip to **Verify** and return `status: "skipped"`.

**Otherwise:** Proceed to **Run transcription**.

### Run transcription

1. Run the transcribe command:
   ```sh
   brain stream transcribe --video-file {video_file} --output {output_file}
   ```
   **Expect:** exits 0; `output_file` is written conforming to `transcript.output.template.jsonc`
   **On fail:** surface the error; return `status: "error"` with the stderr message.

### Verify

- [ ] `output_file` exists and is non-empty
- [ ] `output_file` parses as valid JSON conforming to `transcript.output.template.jsonc`
- [ ] `duration_sec` field is present and a positive number
- [ ] `segments` array is present and non-empty
- [ ] `status` in the result is `"success"` or `"skipped"` (never `"error"`)

If any check fails: return `status: "error"` with a description; do not return success.
