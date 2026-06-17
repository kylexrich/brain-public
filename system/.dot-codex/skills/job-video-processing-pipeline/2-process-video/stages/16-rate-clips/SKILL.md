---
name: 16-rate-clips
description: "Spawn 3 independent sonnet quality raters per produced clip. Aggregate verdicts. Only clips that all 3 raters mark POST will be uploaded by stage 18."
---

# Stage 16 — Rate Clips

**Mission:** Apply a strict quality gate to each produced clip from stage 14. For each clip, spawn 3 independent quality-rater sub-agents
(claude-sonnet-4-6) that read the channel voice, the stage 08 criteria, the clip's metadata, and the transcript window for the clip's time
range; each rater independently produces a verdict (`POST` / `BORDERLINE` / `REJECT`). The stage aggregates the three verdicts and writes a
rating manifest. Stage 18 (upload-clips) reads the manifest and only uploads clips with an aggregate verdict of `publish`.

This stage exists because suggestion-time hard gates aren't enough — they prevent obviously-bad clips, but they don't surface the
"technically passes gates but isn't actually publishable" cases. A typical 3-hour stream that produced 8 gate-passing suggestions will
typically produce only 1–3 POST-rated clips after this gate. That's by design.

---

## Interface

### Inputs

```yaml
clip_production_manifest_file:
  type: string
  required: true
  description: Absolute path to clip_production_manifest.json (stage 14 output).

chunks_dir:
  type: string
  required: true
  description: Absolute path to the chunks directory. Used to extract the transcript window covering each clip's time range.

output_file:
  type: string
  required: true
  description: Absolute path where clip_rating_manifest.json will be written.

rater_count:
  type: integer
  required: false
  default: 3
  description: Number of independent raters spawned per clip.
  constraints: Must be odd to avoid ties on a hypothetical majority rule. Default 3.

force:
  type: boolean
  required: false
  default: false
  description: Re-rate clips even if output_file already exists with ratings.
```

### Outputs

```yaml
clip_rating_manifest:
  op: create
  path: "{output_file}"
  count: 1
  description: Per-clip rating results — all rater verdicts plus the aggregate.
  template: clip_rating_manifest.output.template.jsonc
```

### Response Format

```jsonc
{
  "status": "success | skipped | error",
  "clip_count": 8,
  "publish_count": 2,
  "hold_count": 5,
  "reject_count": 1,
  "reason": "<error description — only present when status is error>"
}
```

### Aggregation rule

```
all 3 raters = POST       → aggregate_verdict = "publish"
any rater    = REJECT     → aggregate_verdict = "reject"
otherwise                 → aggregate_verdict = "hold"
```

`publish` clips get uploaded by stage 18. `hold` clips have signal but didn't fully land — they're not uploaded but kept on disk for manual
review. `reject` clips are filed away with the rationale.

### Dependency Gate

Runs only when stage 14 (clip-production) succeeded and produced at least one clip with `status = "success"`.

---

## Execution

### 1. Check idempotency

**When:** `output_file` exists and `force` is not true

1. Read existing manifest. If every clip in `clip_production_manifest_file` already has a complete rating set (3 raters, aggregate
   present), return `{"status": "skipped", ...}` with the existing counts.
2. Otherwise, rate only the clips that don't yet have a complete rating set.

**Otherwise:**

1. Continue to Step 2.

### 2. Load inputs

1. Read `clip_production_manifest_file`. Filter to clips with `status = "success"` — failed-production clips aren't candidates.
2. For each candidate clip, extract its transcript window:
   - Identify the chunk file(s) whose time ranges overlap the clip's `start_seconds` / `end_seconds`
   - Read the relevant chunks and slice out the text covering the clip's exact time range
   - This is the `transcript_window` passed to raters

### 3. Spawn raters

For each candidate clip, spawn `rater_count` (default 3) **independent** quality-rater sub-agents in parallel using the pattern at
`system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/patterns/quality-rater.md`.

Each rater receives:

| Field                 | Value                                                                                                                |
|-----------------------|----------------------------------------------------------------------------------------------------------------------|
| `rater_id`            | `rater-1`, `rater-2`, `rater-3`                                                                                       |
| `subject_kind`        | `clip`                                                                                                                |
| `subject_filename`    | The clip's `filename` from the production manifest                                                                    |
| `subject_metadata`    | The clip's full metadata block from the production manifest (title, description, vibe_tier, format, confidence, etc.) |
| `transcript_window`   | The transcript text for the clip's time range                                                                         |
| `criteria_path`       | `…/stages/08-clip-suggestions/criteria.md`                                                                            |
| `vibe_context_path`   | `…/shared/vibe-context.md`                                                                                            |
| `title_rules_path`    | `…/shared/clip-title-rules.md`                                                                                        |
| `output_file`         | `<parent(output_file)>/clip-ratings/{clip_stem}.{rater_id}.json`                                                       |

Raters MUST NOT see each other's outputs. They MUST be spawned in parallel (not sequentially), so no rater has read access to another's
file at the time it produces its verdict.

Clips themselves CAN be processed in parallel (multiple clips × 3 raters each = lots of simultaneous agents) or sequentially per the
orchestrator's agent-team budget. Independence within a clip is what matters.

### 4. Aggregate

After all raters for all clips have completed:

1. Read every per-rater verdict file from `<parent(output_file)>/clip-ratings/`.
2. For each clip, apply the aggregation rule (all-POST → publish; any-REJECT → reject; otherwise → hold).
3. Compute summary counts.

### 5. Write manifest

Write `output_file` conforming to `clip_rating_manifest.output.template.jsonc` with:
- `generated_at`
- `source_clip_manifest`: absolute path to the input
- `rater_count`
- `aggregation_rule`: the literal rule string used (so future reads know how the verdict was derived)
- `clip_count`, `publish_count`, `hold_count`, `reject_count`
- `clips`: per-clip array with all rater verdicts and the aggregate

### 6. Verify

- [ ] `output_file` exists and is non-empty
- [ ] Top-level keys `generated_at`, `source_clip_manifest`, `rater_count`, `aggregation_rule`, `clip_count`, `publish_count`, `hold_count`, `reject_count`, `clips` are present
- [ ] `clip_count` matches `clips` array length
- [ ] Every clip entry has `raters` of length `rater_count` and a populated `aggregate_verdict`
- [ ] Every rater entry has `rater_id`, `model`, `verdict`, `rationale`, `rated_at`
- [ ] `publish_count + hold_count + reject_count == clip_count`

If any check fails: do not return success.
