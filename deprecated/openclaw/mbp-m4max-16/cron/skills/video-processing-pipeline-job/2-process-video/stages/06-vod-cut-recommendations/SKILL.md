---
name: 06-vod-cut-recommendations
description: "Analyze transcript chunks to flag segments that should be trimmed from the published VOD for privacy, security, or extended-absence reasons."
---

# Stage 06 — VOD Cut Recommendations

**Mission:** Analyze transcript chunks and produce a sorted list of time-range recommendations for segments that should be cut from the
published VOD. Outputs a single `vod_cut_recommendations.json` file and returns a compact result summary to the caller.

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
  description: Cut recommendations sorted by kyle_explicitly_requested_cut (TRUE first), severity (HIGH first), then start_seconds ascending.
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

### 3. Spawn workers

1. Read `deprecated/openclaw/mbp-m4max-16/cron/skills/video-processing-pipeline-job/2-process-video/shared/worker-contract.md` for model, concurrency,
   and mode parameters.
2. Spawn one worker per chunk file, passing the fields below. Workers read chunk files directly from disk — never paste chunk content into
   the current context.

   | Field                     | Value                                                    |
            |---------------------------|----------------------------------------------------------|
   | `chunk_file`              | Filename (e.g., `chunk_003.txt`)                         |
   | `chunk_file_path`         | Absolute path to the chunk file                          |
   | `cut_rubric_path`         | Absolute path to `deprecated/openclaw/mbp-m4max-16/cron/skills/video-processing-pipeline-job/2-process-video/stages/06-vod-cut-recommendations/cut-rubric.md` |
   | `transcript_duration_sec` | Total stream duration in seconds                         |

3. Each worker reads its chunk file, identifies segments matching `cut-rubric.md`, and returns JSON matching
   `vod_cut_recommendations.worker-result.schema.jsonc`. Each recommendation object must conform to
   `vod_cut_recommendations.output.template.jsonc`.
   - **[CRITICAL] Workers must treat Kyle's explicit verbal cut requests as the highest-priority detection target.** Read the
     "Kyle's explicit cut requests" section of `cut-rubric.md` carefully — it defines what counts and common false positives.
     Missing an explicit verbal request is the single worst failure mode. When in doubt, flag it.
   - For every flagged recommendation, workers must set `kyle_explicitly_requested_cut` to `"TRUE"` when Kyle verbally
     requested the cut, or `"FALSE"` when the recommendation was AI-detected without Kyle's verbal acknowledgment.
4. Collect all worker JSON results.

### 4. Merge and sort results

1. Collect all `recommendations` arrays from worker results.
2. Deduplicate overlapping time ranges (merge ranges that overlap or are adjacent within the same category).
3. Sort the merged list: sort kyle_explicitly_requested_cut (`TRUE` → `FALSE`), severity descending (`HIGH` → `MEDIUM` → `LOW`), then `start_seconds` ascending.
4. Count the final recommendations.

**Expect:** Deduplicated recommendation list sorted by kyle_explicitly_requested_cut (TRUE first), severity (HIGH first), then `start_seconds`
**On fail:** return `status: error` and stop.

### 5. Write output file

1. Write `output_file` conforming to `vod_cut_recommendations.output.template.jsonc`.
2. Set `generated_at` to the current ISO8601 timestamp.
3. Set `recommendation_count` to the final count.

**Expect:** Valid JSON at `output_file` matching `vod_cut_recommendations.output.template.jsonc`
**On fail:** return `status: error` and stop.

### 6. Verify

- [ ] `output_file` exists and is non-empty
- [ ] `recommendation_count` matches the actual length of the `recommendations` array
- [ ] `output_file` JSON matches `vod_cut_recommendations.output.template.jsonc` (including all required recommendation object fields)
- [ ] Every recommendation has `kyle_explicitly_requested_cut` set to `"TRUE"` or `"FALSE"` (string, not boolean)
- [ ] List is sorted by `kyle_explicitly_requested_cut` (`TRUE` first), then severity (HIGH first), then `start_seconds` ascending
- [ ] **[CRITICAL] No explicit verbal cut requests from Kyle were missed** — every instance where Kyle verbally asks for a cut, acknowledges an accidental exposure, or says something needs to be removed from the VOD is present with `kyle_explicitly_requested_cut: "TRUE"`
- [ ] No actual secrets, credentials, or exploit mechanics appear in any `reason` field (describe risk class only — per `cut-rubric.md`)

If any check fails: do not return success.
