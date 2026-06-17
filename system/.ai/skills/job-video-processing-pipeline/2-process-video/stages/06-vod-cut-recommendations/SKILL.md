---
name: 06-vod-cut-recommendations
description: "Strict-explicit-only: flag only segments where Kyle verbally requests a cut on stream (cut/claw/delete/edit-out the VOD)."
---

# Stage 06 — VOD Cut Recommendations

**Mission:** Analyze transcript chunks for moments where Kyle **literally and verbally requests a cut** (cut, claw, delete, edit-out, remove this part, etc.). Output a sorted list of time-range recommendations for those segments only. Outputs a single `vod_cut_recommendations.json` file and returns a compact result summary to the caller.

**Out of scope.** This stage does NOT flag AI-detected sensitive content, privacy concerns, or security exposures. If Kyle did not verbally request a cut, it does not get flagged here.

---

## Interface

### Inputs

```yaml
chunks_dir:
  type: string
  required: true
  description: Absolute path to the chunks directory.
  constraints: Must exist and contain at least one chunk file.

transcript_duration_sec:
  type: number
  required: true
  description: Total stream duration in seconds.
  constraints: Positive integer.

output_file:
  type: string
  required: true
  description: Absolute path for the output vod_cut_recommendations.json.
  constraints: Parent directory must be writable.

force:
  type: boolean
  required: false
  default: false
  description: Always re-execute even if output already exists.
  constraints: When false, skip if output_file exists.
```

### Outputs

```yaml
vod_cut_recommendations:
  op: create
  path: "{output_file}"
  count: 1
  description: Cut recommendations sorted by severity (HIGH first), then start_seconds ascending. Every recommendation has kyle_explicitly_requested_cut="TRUE" by definition of this stage.
  template: vod_cut_recommendations.output.template.jsonc
```

### Response Format

```jsonc
// Return payload (not written to disk)
{
  "status": "success | skipped | error",
  "recommendation_count": 4,
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

1. Continue to the next step.

### 2. List chunks

1. List all chunk files in `chunks_dir` (plain or timestamped format).
2. If no chunk files are found, stop as a precondition failure (do not continue).

**Expect:** Non-empty chunk file list
**On fail:** return `status: error` and stop.

### 3. Chunk workers

Spawn chunk workers per
`system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/patterns/chunk-worker.md`.
Lifecycle: `system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/patterns/agent-lifecycle.md`.

Pass each worker:

| Field                     | Value                                                    |
|---------------------------|----------------------------------------------------------|
| `chunk_file`              | Filename (e.g., `chunk_003.txt`)                         |
| `chunk_file_path`         | Absolute path to the chunk file                          |
| `cut_rubric_path`         | Absolute path to `system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/stages/06-vod-cut-recommendations/cut-rubric.md` |
| `transcript_duration_sec` | Total stream duration in seconds                         |
| `candidates_dir`          | Absolute path to `<parent(output_file)>/candidates/`     |

Each worker:

1. Reads its chunk file and identifies segments matching `cut-rubric.md`.
2. Writes `<candidates_dir>/<chunk_name>_cuts.json` conforming to `vod_cut_recommendations.worker-result.schema.jsonc`.
   Each recommendation object must conform to `vod_cut_recommendations.output.template.jsonc`.
   - **[CRITICAL] This stage is strict-explicit-only.** A recommendation is emitted ONLY when the transcript contains a verbatim
     trigger phrase from Kyle (cut / claw / delete / trim / edit out / remove this part) that clearly refers to cutting THIS VOD.
     Read `cut-rubric.md` carefully — it defines the trigger phrases, the core test, and the common false positives.
   - **Do NOT flag AI-detected sensitive content, privacy mode switches, off-screen prevention, or any other inferred concern.**
     If Kyle did not say a trigger phrase, do not emit a recommendation. Empty output is the correct answer for most chunks.
   - Every emitted recommendation must have `kyle_explicitly_requested_cut: "TRUE"`. There is no `"FALSE"` branch in this stage.

**Expect:** One `<chunk_name>_cuts.json` file per chunk in `candidates_dir`.
**On fail:** surface the error and stop.

### 4. Combination worker

Spawn a combination worker per
`system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/patterns/combination-worker.md`.

The worker:

1. Reads all `*_cuts.json` files from `candidates_dir`.
2. Deduplicates overlapping time ranges (merge ranges that overlap or are adjacent within the same category).
3. Sorts: severity descending (`HIGH` → `MEDIUM` → `LOW`), then `start_seconds` ascending.
4. Writes `output_file` conforming to `vod_cut_recommendations.output.template.jsonc`.
5. Sets `generated_at` to the current ISO8601 timestamp and `recommendation_count` to the final count.

**Expect:** Valid JSON at `output_file` matching `vod_cut_recommendations.output.template.jsonc`
**On fail:** return `status: error` and stop.

### 6. Verify

- [ ] `output_file` exists and is non-empty
- [ ] `recommendation_count` matches the actual length of the `recommendations` array
- [ ] `output_file` JSON matches `vod_cut_recommendations.output.template.jsonc` (including all required recommendation object fields)
- [ ] Every recommendation has `kyle_explicitly_requested_cut: "TRUE"` (string, not boolean). No `"FALSE"` entries are permitted in this stage.
- [ ] List is sorted by severity (HIGH first), then `start_seconds` ascending
- [ ] **[CRITICAL] Every recommendation is anchored to a verbatim cut trigger phrase from Kyle** (cut / claw / delete / trim / edit out / remove this part) clearly referring to THIS VOD — see `cut-rubric.md`. AI-inferred sensitive-content flags are NOT permitted.
- [ ] **[CRITICAL] No explicit verbal cut requests from Kyle were missed** — every chunk with a qualifying trigger phrase produced a recommendation
- [ ] Every recommendation has a `transcript_excerpt` containing the verbatim transcript text between its start and end timestamps, INCLUDING the trigger phrase
- [ ] No actual secrets, credentials, or exploit mechanics appear in any `reason` field (describe risk class only — per `cut-rubric.md`)

If any check fails: do not return success.
