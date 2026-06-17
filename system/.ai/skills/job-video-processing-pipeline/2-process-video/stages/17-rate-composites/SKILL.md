---
name: 17-rate-composites
description: "Spawn 3 independent sonnet quality raters per produced composite. Aggregate verdicts. Only composites that all 3 raters mark POST will be uploaded by stage 19."
---

# Stage 17 — Rate Composites

**Mission:** Same shape as stage 16 — apply a strict quality gate to each produced composite from stage 15 via 3 independent
quality-rater sub-agents. Aggregate to `publish | hold | reject`. Stage 19 (upload-composites) only uploads `publish`.

The bar is higher for composites than for clips because composites are longer (more minutes of viewer time) and require a real binding
thesis to land. Expect MOST composites to land `hold` — composites with genuine signal that need a human polish pass before publication.

---

## Interface

### Inputs

```yaml
composite_clip_production_manifest_file:
  type: string
  required: true
  description: Absolute path to composite_clip_production_manifest.json (stage 15 output).

chunks_dir:
  type: string
  required: true
  description: Absolute path to the chunks directory. Used to extract per-segment transcript text and concatenate it into a composite-level transcript window.

output_file:
  type: string
  required: true
  description: Absolute path where composite_rating_manifest.json will be written.

rater_count:
  type: integer
  required: false
  default: 3
  description: Number of independent raters per composite. Must be odd. Default 3.

force:
  type: boolean
  required: false
  default: false
```

### Outputs

```yaml
composite_rating_manifest:
  op: create
  path: "{output_file}"
  count: 1
  description: Per-composite rating results.
  template: composite_rating_manifest.output.template.jsonc
```

### Response Format

```jsonc
{
  "status": "success | skipped | error",
  "composite_count": 3,
  "publish_count": 1,
  "hold_count": 2,
  "reject_count": 0
}
```

### Aggregation rule

Same as stage 16:

```
all 3 raters = POST       → aggregate_verdict = "publish"
any rater    = REJECT     → aggregate_verdict = "reject"
otherwise                 → aggregate_verdict = "hold"
```

### Dependency Gate

Runs only when stage 15 (composite-clip-production) succeeded with at least one composite at `status = "success"`.

---

## Execution

### 1. Check idempotency

Same shape as stage 16 — skip already-completely-rated composites unless `force` is set.

### 2. Load inputs

1. Read `composite_clip_production_manifest_file`. Filter to composites with `status = "success"`.
2. For each composite, build the `transcript_window`: concatenate the transcript text covering each segment's `start_seconds` /
   `end_seconds` from the original stream timeline (NOT the composite's local timeline). Separate segments with a `--- SEGMENT BREAK ---`
   line so the rater can see segment boundaries.

### 3. Spawn raters

For each composite, spawn `rater_count` (default 3) **independent** quality-rater sub-agents in parallel using the pattern at
`shared/patterns/quality-rater.md`.

Each rater receives:

| Field                 | Value                                                                                                                                  |
|-----------------------|----------------------------------------------------------------------------------------------------------------------------------------|
| `rater_id`            | `rater-1`, `rater-2`, `rater-3`                                                                                                         |
| `subject_kind`        | `composite`                                                                                                                             |
| `subject_filename`    | The composite's `filename` from the production manifest                                                                                  |
| `subject_metadata`    | The composite's full metadata (title, description, binding_thesis, vibe_tier, format_category, narrative_thread, segments, etc.)         |
| `transcript_window`   | Per-segment transcripts concatenated with `--- SEGMENT BREAK ---` separators                                                            |
| `criteria_path`       | `…/stages/09-composite-clip-suggestions/criteria.md`                                                                                    |
| `vibe_context_path`   | `…/shared/vibe-context.md`                                                                                                              |
| `title_rules_path`    | `…/shared/clip-title-rules.md`                                                                                                          |
| `output_file`         | `<parent(output_file)>/composite-ratings/{composite_stem}.{rater_id}.json`                                                                |

Independence rule same as stage 16: raters MUST be spawned in parallel and MUST NOT see each other's outputs.

### 4. Aggregate

Same as stage 16. Apply the rule to each composite. Compute counts.

### 5. Write manifest

Write `output_file` conforming to `composite_rating_manifest.output.template.jsonc`.

### 6. Verify

- [ ] `output_file` exists and is non-empty
- [ ] Top-level keys `generated_at`, `source_composite_manifest`, `rater_count`, `aggregation_rule`, `composite_count`, `publish_count`, `hold_count`, `reject_count`, `composites` present
- [ ] `composite_count` matches `composites` array length
- [ ] Every composite has `raters` of length `rater_count` and a populated `aggregate_verdict`
- [ ] `publish_count + hold_count + reject_count == composite_count`

If any check fails: do not return success.
