---
name: 12-stream-title
description: "Generate the full YouTube video title for a stream. Resolves the day/part number from source_stream.json, spawns workers per dual-llm-selection.md to generate title suffixes, selects the stronger output, writes stream_title.json, and patches the title field of youtube-metadata.json. Not for summaries, descriptions, or other metadata fields."
---

# Stage 12 — Stream Title

**Mission:** Generate the complete YouTube video title — both the "Building in Public — Day N" prefix and the personality-driven suffix — by
spawning workers, selecting the stronger output, writing `stream_title.json`, and patching `youtube-metadata.json`.

---

## Interface

### Inputs

```yaml
chunks_dir:
  type: string
  required: true
  description: Absolute path to the chunks directory.
  constraints: Must exist and contain at least one chunk.

source_stream_file:
  type: string
  required: true
  description: Absolute path to source_stream.json; parent dir is scanned for sibling streams to determine part ordering.
  constraints: Must exist.

output_file:
  type: string
  required: true
  description: Absolute path for the output stream_title.json.

youtube_metadata_file:
  type: string
  required: true
  description: Absolute path to youtube-metadata.json (title field updated in-place).
  constraints: Must exist and be writable.

force:
  type: boolean
  required: false
  default: false
  description: Re-execute even if output_file already exists.
  constraints: Skips if output_file already exists.
```

### Outputs

```yaml
stream_title:
  op: create
  path: "{output_file}"
  count: 1
  description: "Title artifact — full title, day/part numbers, suffix, generation time."
  template: stream_title.output.template.jsonc

youtube_metadata:
  op: edit
  path: "{youtube_metadata_file}"
  count: 1
  description: Patches the title field with the assembled full title.
  template: —
```

### Response Format

```jsonc
// Return payload (not written to disk)
{
  "status": "success | skipped | error",
  "title": "Building in Public — Day 42 | OAuth at 3AM and Regrets",
  "reason": "<error description — only present when status is error>"
}
```

---

## Execution

### 1. Check idempotency

**When:** `output_file` exists and `force` is not `true`

1. Read the existing `title` from `output_file`.
2. Return `{"status": "skipped", "title": "<existing title>"}` and stop.

**Otherwise:**

1. Continue to the next step.

### 2. Resolve day and part number

1. Read `source_stream_file` to get the `stream_date` and `stream_key`.
2. Scan sibling directories in the same date directory to determine part ordering.
3. Compute `day_number` and `part_number` (null if only one stream that day).

### 3. Generate title candidates

1. Spawn workers per
   `system/ai-config/claude-config/skills/job-video-processing-pipeline/2-process-video/shared/patterns/dual-llm-selection.md`.
   Lifecycle: `system/ai-config/claude-config/skills/job-video-processing-pipeline/2-process-video/shared/patterns/agent-lifecycle.md`.
   Workers read all chunk files in `chunks_dir` chronologically.
2. Each worker generates **5 distinct title suffix candidates** following all rules in `title-rules.md`. Workers must return their candidates as a numbered list (e.g., `1. Suffix one\n2. Suffix two\n...`).
3. Validate all candidates against the validation rules in `title-rules.md`. Discard any that fail validation.

**On fail:** (both workers produce zero valid candidates) return `{"status": "error", "title": null}` with the error detail.

### 4. Select and assemble

1. Review all valid candidates from both workers (up to 10 total). Choose the strongest suffix — prefer the one that is most specific, memorable, and true to the stream's defining narrative.
2. Assemble the full title:
    - Single stream: `Building in Public — Day {N} | {suffix}`
    - Multi-part: `Building in Public — Day {N}, Part {M} | {suffix}`

### 5. Write output

1. Write `output_file` conforming to `stream_title.output.template.jsonc`.
2. Patch the `title` field of `youtube_metadata_file` with the assembled full title.

**On fail:** return `{"status": "error", "title": null}` with the write failure detail.

### 6. Verify

- [ ] `stream_title.json` exists at `output_file` and is non-empty JSON
- [ ] `title` field follows the format `Building in Public — Day N | suffix` (or `Day N, Part M | suffix`)
- [ ] `suffix` passes all validation rules in `title-rules.md`
- [ ] `youtube_metadata_file` `title` field matches the assembled full title
- [ ] Result `status` is `"success"` or `"skipped"`, not `"error"`

If any check fails: do not return success.
