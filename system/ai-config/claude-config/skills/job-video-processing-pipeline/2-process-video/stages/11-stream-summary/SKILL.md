---
name: 11-stream-summary
description: "Generate a concise stream summary from transcript chunks."
---

# Stage 11 — Stream Summary

**Mission:** Produces a short summary of the stream for use in the YouTube description.

---

## Interface

### Inputs

```yaml
chunks_dir:
  type: string
  required: true
  description: Absolute path to the chunks directory.

output_file:
  type: string
  required: true
  description: Absolute path for the output stream_summary.json.

youtube_metadata_file:
  type: string
  required: true
  description: Absolute path to youtube-metadata.json (updated with summary).

force:
  type: boolean
  required: false
  default: false
  description: Re-execute even if output already exists.
  constraints: Skips if output_file already exists.
```

### Outputs

```yaml
stream_summary:
  op: create
  path: "{output_file}"
  count: 1
  description: Stream summary JSON.
  template: stream_summary.output.template.jsonc

youtube_metadata:
  op: edit
  path: "{youtube_metadata_file}"
  count: 1
  description: Summary section of description field updated.
  template: system/ai-config/claude-config/skills/job-video-processing-pipeline/2-process-video/shared/youtube-description-template.md
```

### Response Format

```jsonc
// Return payload (not written to disk)
{
  "status": "success | skipped | error",
  "summary": "Plain text summary, or null if skipped/error",
  "reason": "<error description — only present when status is error>"
}
```

---

## Execution

### 1. Check idempotency

**When:** `force` is `false` and `output_file` already exists

1. Return `{"status": "skipped", "summary": null}` and stop.

**Otherwise:**

1. _(Skip this step.)_

### 2. Generate summary

1. Spawn workers per
   `system/ai-config/claude-config/skills/job-video-processing-pipeline/2-process-video/shared/patterns/dual-llm-selection.md`.
   Lifecycle: `system/ai-config/claude-config/skills/job-video-processing-pipeline/2-process-video/shared/patterns/agent-lifecycle.md`.
   Workers read all chunk files in `chunks_dir` chronologically.
2. Workers generate a summary per `summary-rules.md`.

**On fail:** return `{"status": "error", "summary": null}` with the error detail.

### 3. Write output

1. Write `output_file` conforming to `stream_summary.output.template.jsonc`.
2. Update the summary section of `youtube_metadata_file` per
   `system/ai-config/claude-config/skills/job-video-processing-pipeline/2-process-video/shared/youtube-description-template.md`.

**On fail:** return `{"status": "error", "summary": null}` with the write failure detail.

### 4. Verify

- [ ] `output_file` exists and is non-empty
- [ ] `summary` field conforms to `summary-rules.md` constraints
- [ ] `youtube_metadata_file` description section updated with the summary
- [ ] Result `status` is `success` or `skipped`

If any check fails: do not return success.
