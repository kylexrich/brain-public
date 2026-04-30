---
name: 08-clip-suggestions
description: "Analyze transcript chunks and produce timestamped standalone clip candidates (shorts, highlights, tutorials, stories)."
---

# Stage 08 — Clip Suggestions

**Mission:** Analyze transcript chunks to identify moments worth publishing as standalone content. Produce a ranked, deduplicated
`clip_suggestions.json` output file and return a compact result to the caller.

---

## Interface

### Inputs

```yaml
chunks_dir:
  type: string
  required: true
  description: Absolute path to the chunks directory.
  constraints: Must contain .txt chunk files (plain or timestamped).

output_file:
  type: string
  required: true
  description: Absolute path for the output clip_suggestions.json.

force:
  type: boolean
  required: false
  default: false
  description: Re-execute even if output already exists.
  constraints: When false, skips if output_file exists.
```

### Outputs

```yaml
clip_suggestions:
  op: create
  path: "{output_file}"
  count: 1
  description: Clip suggestions with timestamps, formats, and confidence scores.
  template: clip_suggestions.output.template.jsonc
```

### Response Format

```jsonc
// Return payload (not written to disk)
{
  "status": "success | skipped | error",
  "suggestion_count": 3,
  "reason": "<error description — only present when status is error>"
}
```

### Failure Modes

- Invalid or unreadable chunk files: return `{"status": "error", "suggestion_count": 0, "reason": "<description>"}`.
- Worker failures that prevent merge completion: return `{"status": "error", "suggestion_count": 0, "reason": "<description>"}`.
- Output write or verification failure: return `{"status": "error", "suggestion_count": 0, "reason": "<description>"}`.

---

## Execution

### 1. Check idempotency

**When:** `output_file` already exists and `force` is not `true`

1. Read `suggestion_count` from the existing `output_file`.
2. Return `{"status": "skipped", "suggestion_count": <value>}` and stop.

**Otherwise:**

1. Continue to Step 2.

### 2. List chunks

1. List all `.txt` chunk files in `chunks_dir`.
2. Preserve deterministic order for worker assignment.

### 3. Spawn workers

1. Read `openclaw/mbp-m4max-16/cron/skills/video-processing-pipeline-job/2-process-video/shared/worker-contract.md` for worker parameters (
   model, concurrency, mode) and result contract.
2. Spawn 1 worker per chunk file with these inputs:

   | Field                | Value                                                                                                                                     |
            |----------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
   | `chunk_file`         | Filename (e.g., `chunk_003.txt`)                                                                                                          |
   | `chunk_file_path`    | Absolute path to the chunk file                                                                                                           |
   | `criteria_path`      | Absolute path to `openclaw/mbp-m4max-16/cron/skills/video-processing-pipeline-job/2-process-video/stages/08-clip-suggestions/criteria.md` |
   | `privacy_rules_path` | Absolute path to `openclaw/mbp-m4max-16/cron/skills/video-processing-pipeline-job/2-process-video/shared/privacy-rules.md`                |

3. Collect one result per chunk file and ensure each result matches the worker contract.

### 4. Merge and deduplicate

1. Flatten all worker `suggestions` arrays into one list.
2. Sort by `start_seconds` ascending.
3. Deduplicate overlapping time ranges: keep the higher-confidence suggestion; break confidence ties by preferring the shorter duration.
4. Count the final suggestions.

### 5. Write output file

1. Build the output object conforming to `clip_suggestions.output.template.jsonc`.
2. Set `generated_at` to current ISO8601 timestamp.
3. Set `suggestion_count` to the merged count.
4. Write the object to `output_file`.

### 6. Verify

- [ ] `output_file` exists and is non-empty
- [ ] Top-level keys `generated_at`, `suggestion_count`, and `suggestions` are present
- [ ] `suggestion_count` matches `suggestions` array length
- [ ] Every suggestion has populated `start_seconds`, `end_seconds`, `format`, and `confidence`
- [ ] No overlapping time ranges remain after deduplication

If any check fails: do not return success.
