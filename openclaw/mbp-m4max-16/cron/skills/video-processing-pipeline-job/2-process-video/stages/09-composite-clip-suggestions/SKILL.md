---
name: 09-composite-clip-suggestions
description: "Analyze transcript chunks and produce multi-segment composite clip suggestions (game recaps, topic deep dives, journey arcs, theme compilations)."
---

# Stage 09 — Composite Clip Suggestions

**Mission:** Analyze transcript chunks to identify multi-segment narrative arcs, theme compilations, and topic deep dives that could be
assembled into standalone composite content. Produce a ranked, deduplicated `composite_clip_suggestions.json` output file and return a
compact result to the caller.

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
  description: Absolute path for the output composite_clip_suggestions.json.

force:
  type: boolean
  required: false
  default: false
  description: Re-execute even if output already exists.
  constraints: When false, skips if output_file exists.
```

### Outputs

```yaml
composite_clip_suggestions:
  op: create
  path: "{output_file}"
  count: 1
  description: Composite clip suggestions with segments, roles, narrative threads, and confidence scores.
  template: composite_clip_suggestions.output.template.jsonc
```

### Response Format

```jsonc
// Return payload (not written to disk)
{
  "status": "success | skipped | error",
  "composite_count": 2,
  "reason": "<error description — only present when status is error>"
}
```

### Failure Modes

- Invalid or unreadable chunk files: return `{"status": "error", "composite_count": 0, "reason": "<description>"}`.
- Worker failures that prevent merge completion: return `{"status": "error", "composite_count": 0, "reason": "<description>"}`.
- Output write or verification failure: return `{"status": "error", "composite_count": 0, "reason": "<description>"}`.

---

## Execution

### 1. Check idempotency

**When:** `output_file` already exists and `force` is not `true`

1. Read `composite_count` from the existing `output_file`.
2. Return `{"status": "skipped", "composite_count": <value>}` and stop.
3. 
**Otherwise:**

1. Skip this step.

### 2. List chunks

1. List all `.txt` chunk files in `chunks_dir`.
2. Preserve deterministic order for worker assignment.

### 3. Spawn workers

Follow `openclaw/mbp-m4max-16/cron/skills/video-processing-pipeline-job/2-process-video/shared/worker-contract.md` for worker parameters (
model, concurrency, mode).

Spawn 1 worker per chunk file. Each worker receives:

| Field                | Value                                                                                                                                               |
|----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| `chunk_file`         | Filename (e.g., `chunk_003.txt`)                                                                                                                    |
| `chunk_file_path`    | Absolute path to the chunk file                                                                                                                     |
| `criteria_path`      | Absolute path to `openclaw/mbp-m4max-16/cron/skills/video-processing-pipeline-job/2-process-video/stages/09-composite-clip-suggestions/criteria.md` |
| `privacy_rules_path` | Absolute path to `openclaw/mbp-m4max-16/cron/skills/video-processing-pipeline-job/2-process-video/shared/privacy-rules.md`                          |

Each worker must:

1. Read the chunk file at `chunk_file_path`.
2. Apply all composite criteria from
   `openclaw/mbp-m4max-16/cron/skills/video-processing-pipeline-job/2-process-video/stages/09-composite-clip-suggestions/criteria.md`.
3. Apply all exclusions from `openclaw/mbp-m4max-16/cron/skills/video-processing-pipeline-job/2-process-video/shared/privacy-rules.md`.
4. Return JSON conforming to
   `openclaw/mbp-m4max-16/cron/skills/video-processing-pipeline-job/2-process-video/stages/09-composite-clip-suggestions/composite_clip_suggestions.worker-result.schema.jsonc`.

### 4. Merge and group composites

1. Collect all worker `composites` arrays into a flat candidate list.
2. Group candidates by compatible `candidate_theme` and `format_category` to form full composite suggestions.
3. Within each composite, order segments by `start_seconds` ascending and assign roles (`INTRO` → first, `PAYOFF` → last, `BODY` → middle).
4. Deduplicate overlapping arcs: when two composites share more than half their segments, keep the higher-confidence one; break confidence
   ties by preferring the longer estimated duration.
5. Compute `estimated_duration_sec` for each composite as the sum of its segment `duration_sec` values.
6. Count the final composites.

### 5. Write output file

1. Build the output object conforming to `composite_clip_suggestions.output.template.jsonc`.
2. Set `generated_at` to current ISO8601 timestamp.
3. Set `composite_count` to the merged count.
4. Write the object to `output_file`.

### 6. Verify

- [ ] `output_file` exists and is non-empty
- [ ] Top-level keys `generated_at`, `composite_count`, and `composites` are present
- [ ] `composite_count` matches `composites` array length
- [ ] Every composite has populated `title`, `hook`, `format_category`, `narrative_thread`, `editorial_effort`, `confidence`, and at least
  one segment
- [ ] Every segment has a `role`, `start_seconds`, `end_seconds`, and `duration_sec`
- [ ] No two composites share more than half their segments after deduplication

If any check fails: do not return success.
