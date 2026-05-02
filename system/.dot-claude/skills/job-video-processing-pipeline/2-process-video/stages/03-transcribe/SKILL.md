---
name: 03-transcribe
description: "Generate the canonical transcript from a downloaded VOD using Whisper, write a sibling fillers JSON with raw filler-word counts, and regenerate the aggregate fillers timeline HTML. Use when you need to produce or refresh a transcript JSON from a local VOD file. Not for re-editing existing transcripts or producing summaries."
---

# Stage 03 — Transcribe

**Mission:** Run Whisper on a local VOD file to produce a structured transcript JSON, compute raw filler-word counts as a sibling JSON, and refresh the aggregate fillers timeline HTML so it reflects every stream processed to date. Transcription skips work when the output already exists and its duration matches; filler counting is idempotent via `--force`; timeline regeneration always runs because it aggregates across all streams.

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

fillers_output_file:
  type: string
  required: true
  description: Absolute path for the per-stream fillers JSON (sibling to the transcript).
  constraints: Canonical name is `<stream_key>_fillers.json`.

stream_videos_root:
  type: string
  required: true
  description: Absolute path to the top-level `vault/stream-videos/` directory.
  constraints: Must exist and be the directory containing all monthly stream folders.

timeline_output_file:
  type: string
  required: true
  description: Absolute path for the aggregate fillers timeline HTML.
  constraints: Canonical location is `<stream_videos_root>/fillers-timeline.html`.

force:
  type: boolean
  required: false
  default: false
  description: Always re-transcribe and always re-count fillers, ignoring existing outputs.
  constraints: When false, transcribe skips if `output_file` exists and its `duration_sec` matches the VOD's ffprobe duration; re-transcribes on duration mismatch. When false, filler counting skips if `fillers_output_file` already exists. Timeline regeneration always runs regardless.
```

### Outputs

```yaml
transcript:
  op: create
  path: "{output_file}"
  count: 1
  description: Transcript JSON written by brain stream transcribe.
  template: transcript.output.template.jsonc

fillers:
  op: create
  path: "{fillers_output_file}"
  count: 1
  description: Raw per-stream filler counts split into `pure_fillers` and `narration_markers`.

timeline:
  op: "create, edit"
  path: "{timeline_output_file}"
  count: 1
  description: Self-contained HTML visualization aggregating every `*_fillers.json` under `stream_videos_root`.
```

### Response Format

```jsonc
// Return payload (not written to disk)
{
  "status": "success | skipped | error",
  "transcript_file": "/absolute/path/to/transcript.json",
  "duration_sec": 25464.701,
  "fillers_file": "/absolute/path/to/<stream_key>_fillers.json",
  "fillers_status": "success | skipped",
  "timeline_file": "/absolute/path/to/fillers-timeline.html",
  "streams_included": 37,
  "reason": "<error description — only present when status is error>"
}
```

Top-level `status` is `"skipped"` only when both transcription and filler counting were skipped (existing outputs were current). Any sub-step error → `"error"`. Otherwise `"success"`.

---

## Execution

### Check transcription idempotency

**When:** `force` is `false` and `output_file` exists

1. Get the VOD duration via ffprobe.
   ```sh
   ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 {video_file}
   ```
   **Expect:** a decimal number (seconds)
   **On fail:** idempotency cannot be confirmed; skip the duration comparison and proceed to **Run transcription**.
2. Read `duration_sec` from the existing `output_file`.
3. Compare values. If they match, mark transcription as `skipped` and proceed to **Count fillers**.

**Otherwise:** Proceed to **Run transcription**.

### Run transcription

1. Run the transcribe command:
   ```sh
   brain stream transcribe --video-file {video_file} --output {output_file}
   ```
   **Expect:** exits 0; `output_file` is written conforming to `transcript.output.template.jsonc`.
   **On fail:** surface the error; return `status: "error"` with the stderr message. Do not proceed to filler counting.

### Count fillers

Run the count-fillers command against the transcript. Append `--force` if `force: true`.

```sh
brain stream count-fillers --transcript-file {output_file} --output {fillers_output_file} [--force]
```

**Expect:** exits 0; result JSON with `status: "success"` (new file written) or `status: "skipped"` (output existed and `--force` was not passed).
**On fail:** surface the stderr; return `status: "error"`. Do not proceed to timeline regeneration.

### Regenerate fillers timeline

Always regenerate — the timeline aggregates every stream's fillers JSON and must reflect the newly-computed data.

```sh
brain stream fillers-timeline --root {stream_videos_root} --output {timeline_output_file}
```

**Expect:** exits 0; result JSON with `status: "success"`, `timeline_file`, and `streams_included`.
**On fail:** surface the stderr; return `status: "error"`.

### Verify

- [ ] `output_file` exists and is non-empty; parses as valid JSON conforming to `transcript.output.template.jsonc`; `duration_sec` is a positive number; `segments` array is non-empty.
- [ ] `fillers_output_file` exists and is non-empty; contains `pure_fillers` and `narration_markers` objects.
- [ ] `timeline_output_file` exists and is non-empty.
- [ ] `streams_included` is at least 1.
- [ ] Result `status` is `"success"` or `"skipped"` (never `"error"`).

If any check fails: return `status: "error"` with a description; do not return success.
