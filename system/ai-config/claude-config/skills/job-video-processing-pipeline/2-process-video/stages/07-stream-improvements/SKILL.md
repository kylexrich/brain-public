---
name: 07-stream-improvements
description: "Analyze transcript chunks to surface specific, actionable process improvements for future stream sessions. Spawns chunk workers, merges and deduplicates results, and writes stream_improvement_recommendations.json. Not for VOD editing suggestions or content ideas — only future-stream process changes."
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

### 2. Chunk workers

Spawn chunk workers per
`system/ai-config/claude-config/skills/job-video-processing-pipeline/2-process-video/shared/patterns/chunk-worker.md`.
Lifecycle: `system/ai-config/claude-config/skills/job-video-processing-pipeline/2-process-video/shared/patterns/agent-lifecycle.md`.

Each worker receives:
- `chunk_file` — filename (e.g., `chunk_003.txt`)
- `chunk_file_path` — absolute path to the chunk file
- `candidates_dir` — absolute path to `<parent(output_file)>/candidates/`

Each worker reads its chunk, applies the criteria in `criteria.md`, and writes
`<candidates_dir>/<chunk_name>_improvements.json` — an array of recommendation objects matching the
`recommendations[*]` item schema in `stream_improvement_recommendations.output.template.jsonc`.

**Expect:** One `<chunk_name>_improvements.json` file per chunk in `candidates_dir`.
**On fail:** return `{"status":"error"}` and include worker failure details.

### 3. Combination worker

Spawn a combination worker per
`system/ai-config/claude-config/skills/job-video-processing-pipeline/2-process-video/shared/patterns/combination-worker.md`.

The worker:

1. Reads all `*_improvements.json` files from `candidates_dir`.
2. Deduplicates by theme/title similarity — merges near-duplicate recommendations.
3. Ranks remaining recommendations by severity (`HIGH` → `MEDIUM` → `LOW`).
4. Writes `output_file` conforming to `stream_improvement_recommendations.output.template.jsonc` with
   `generated_at`, `recommendation_count`, and the sorted `recommendations` array.

**Expect:** `output_file` contains valid JSON matching `stream_improvement_recommendations.output.template.jsonc`
**On fail:** return `{"status":"error"}` and include failure details.

### 5. Verify

- [ ] `output_file` exists and is non-empty
- [ ] JSON parses successfully
- [ ] `recommendations` array is present (may be empty if no improvements found)
- [ ] Each recommendation matches the item schema in `stream_improvement_recommendations.output.template.jsonc`
- [ ] List is sorted `HIGH` → `MEDIUM` → `LOW`
- [ ] `recommendation_count` matches `recommendations.length`

If any check fails: do not return success.
