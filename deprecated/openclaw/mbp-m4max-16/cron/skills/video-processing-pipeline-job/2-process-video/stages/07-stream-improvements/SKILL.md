---
name: 07-stream-improvements
description: "Analyze transcript chunks to surface specific, actionable process improvements for future stream sessions. Spawns one worker per chunk, merges and deduplicates results, and writes stream_improvement_recommendations.json. Not for VOD editing suggestions or content ideas — only future-stream process changes."
---

# Stage 07 — Stream Improvements

**Mission:** Analyze all transcript chunks for a stream and produce a ranked, deduplicated list of specific, actionable process improvements
the streamer can apply in future sessions. Output is a severity-sorted JSON file written to disk, with a compact result summary returned to
the caller.

---

## Interface

### Inputs

```yaml
chunks_dir:
  type: string
  required: true
  description: Absolute path to the chunks directory.
  constraints: Must exist and contain chunk files.

output_file:
  type: string
  required: true
  description: Absolute path for the output JSON file.
  constraints: Will be created; parent directory must exist.

force:
  type: boolean
  required: false
  default: false
  description: Re-execute even if output exists.
  constraints: Skips when output_file exists.
```

### Outputs

```yaml
stream_improvement_recommendations:
  op: create
  path: "{output_file}"
  count: 1
  description: Improvement recommendations JSON, sorted by severity.
  template: stream_improvement_recommendations.output.template.jsonc
```

### Response Format

```jsonc
// Return payload (not written to disk)
{
  "status": "success | skipped | error",
  "recommendation_count": 3,
  "reason": "<error description — only present when status is error>"
}
```

---

## Execution

### 1. Check idempotency

**When:** `output_file` already exists and `force` is not `true`

1. Read `recommendation_count` from the existing `output_file`.
2. Return `{"status": "skipped", "recommendation_count": <value>}` and stop.

**Otherwise:**

1. Continue to Step 2.

### 2. Dispatch workers

Follow `deprecated/openclaw/mbp-m4max-16/cron/skills/video-processing-pipeline-job/2-process-video/shared/worker-contract.md` for worker parameters (
model, concurrency, mode).

1. List all chunk files in `chunks_dir`.
2. Spawn one worker per chunk file:
    - Workers read chunk files directly from disk — never paste chunk content into the current context
3. Each worker receives:
    - `chunk_file` — filename (e.g., `chunk_003.txt`)
    - `chunk_file_path` — absolute path to the chunk file
4. Each worker reads its chunk, applies the criteria in `criteria.md`, and returns an array of recommendation objects matching the
   `recommendations[*]` item schema in `stream_improvement_recommendations.output.template.jsonc`.

**Expect:** `Array<recommendation[]>` where each recommendation matches the template item schema
**On fail:** return `{"status":"error"}` and include worker failure details.

### 3. Merge and rank

1. Collect all worker result arrays.
2. Deduplicate by theme/title similarity — merge near-duplicate recommendations.
3. Rank remaining recommendations by severity (`HIGH` → `MEDIUM` → `LOW`).

**Expect:** `recommendations` array sorted `HIGH` → `MEDIUM` → `LOW`
**On fail:** return `{"status":"error"}` and include merge/ranking failure details.

### 4. Write output

1. Assemble the final object to match `stream_improvement_recommendations.output.template.jsonc`.
2. Populate dynamic values (`generated_at`, `recommendation_count`, `recommendations`).
3. Write to `output_file`.

**Expect:** `output_file` contains valid JSON matching `stream_improvement_recommendations.output.template.jsonc`
**On fail:** return `{"status":"error"}` and include write failure details.

### 5. Verify

- [ ] `output_file` exists and is non-empty
- [ ] JSON parses successfully
- [ ] `recommendations` array is present (may be empty if no improvements found)
- [ ] Each recommendation matches the item schema in `stream_improvement_recommendations.output.template.jsonc`
- [ ] List is sorted `HIGH` → `MEDIUM` → `LOW`
- [ ] `recommendation_count` matches `recommendations.length`

If any check fails: do not return success.
