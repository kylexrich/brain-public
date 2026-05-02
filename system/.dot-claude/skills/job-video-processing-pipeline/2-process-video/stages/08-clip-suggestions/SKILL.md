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

### 3. Chunk workers

Spawn chunk workers per
`system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/patterns/chunk-worker.md`.
Lifecycle: `system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/patterns/agent-lifecycle.md`.

Pass each worker:

| Field                | Value                                                                                                                                     |
|----------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| `chunk_file`         | Filename (e.g., `chunk_003.txt`)                                                                                                          |
| `chunk_file_path`    | Absolute path to the chunk file                                                                                                           |
| `criteria_path`      | Absolute path to `system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/stages/08-clip-suggestions/criteria.md` |
| `privacy_rules_path` | Absolute path to `system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/privacy-rules.md`                |
| `candidates_dir`     | Absolute path to `<parent(output_file)>/candidates/`                                                                                       |

Each worker writes `<candidates_dir>/<chunk_name>_clips.json` with its suggestions array.

**Expect:** One `<chunk_name>_clips.json` file per chunk in `candidates_dir`.

### 4. Wide-view analysis

Spawn a wide-view analyst per
`system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/patterns/wide-view-analyst.md`.
Lifecycle: `system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/patterns/agent-lifecycle.md`.

Pass the analyst:

| Field                | Value                                                                                                                                     |
|----------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| `chunks_dir`         | Absolute path to the chunks directory                                                                                                     |
| `candidates_dir`     | Absolute path to `<parent(output_file)>/candidates/`                                                                                      |
| `output_dir`         | Absolute path to `<parent(output_file)>/wide-view-clips/`                                                                                 |
| `criteria_path`      | Absolute path to `system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/stages/08-clip-suggestions/criteria.md` |
| `privacy_rules_path` | Absolute path to `system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/privacy-rules.md`                |

The analyst reads all chunks chronologically, spawns range sub-agents, and writes:

- `<output_dir>/wide_view_candidates.json` — new cross-cutting clip candidates with `cross_chunk_sources`
- `<output_dir>/chunk_NNN_extensions.json` — augmentations to existing chunk candidates

**Graceful degradation:** If the wide-view analyst errors, log the error and proceed to step 5 with chunk worker candidates only.

**Expect:** `wide_view_candidates.json` in `<parent(output_file)>/wide-view-clips/`.

### 5. Combination worker

Spawn a combination worker per
`system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/patterns/combination-worker.md`.

The worker:

1. Reads all `*_clips.json` files from `candidates_dir`.
2. If `<parent(output_file)>/wide-view-clips/wide_view_candidates.json` exists, reads it and includes its candidates alongside chunk
   worker candidates.
3. If `<parent(output_file)>/wide-view-clips/chunk_*_extensions.json` files exist, applies augmentations to the corresponding chunk
   candidates: override confidence if `elevated_confidence` is non-null, attach `cross_references` and `extended_context` as metadata.
4. Flattens all `suggestions` arrays, sorts by `start_seconds` ascending.
5. Deduplicates overlapping time ranges: keeps the higher-confidence suggestion; breaks ties by preferring shorter duration.
6. Writes `output_file` conforming to `clip_suggestions.output.template.jsonc` with `generated_at`, `suggestion_count`, and the deduplicated `suggestions` array.

### 6. Verify

- [ ] `output_file` exists and is non-empty
- [ ] Top-level keys `generated_at`, `suggestion_count`, and `suggestions` are present
- [ ] `suggestion_count` matches `suggestions` array length
- [ ] Every suggestion has populated `start_seconds`, `end_seconds`, `format`, and `confidence`
- [ ] No overlapping time ranges remain after deduplication
- [ ] If `wide-view-clips/` directory exists: `wide_view_candidates.json` is valid JSON with `candidate_count` matching `candidates` array length
- [ ] If wide-view candidates exist: every candidate has a `cross_chunk_sources` array with at least 2 entries

If any check fails: do not return success.
