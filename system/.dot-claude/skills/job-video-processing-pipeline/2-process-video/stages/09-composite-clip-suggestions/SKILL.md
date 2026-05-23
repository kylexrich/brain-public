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

**Otherwise:**

1. Continue to Step 2.

### 2. List chunks

1. List all `.txt` chunk files in `chunks_dir`.
2. Preserve deterministic order for worker assignment.

### 3. Chunk workers

Spawn chunk workers per
`system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/patterns/chunk-worker.md`.
Lifecycle: `system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/patterns/agent-lifecycle.md`.

Each worker receives:

| Field                | Value                                                                                                                                               |
|----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| `chunk_file`         | Filename (e.g., `chunk_003.txt`)                                                                                                                    |
| `chunk_file_path`    | Absolute path to the chunk file                                                                                                                     |
| `criteria_path`      | Absolute path to `system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/stages/09-composite-clip-suggestions/criteria.md` |
| `vibe_context_path`  | Absolute path to `system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/vibe-context.md`                           |
| `title_rules_path`   | Absolute path to `system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/clip-title-rules.md`                       |
| `description_template_path` | Absolute path to `system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/clip-description-template.md`       |
| `privacy_rules_path` | Absolute path to `system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/privacy-rules.md`                          |
| `candidates_dir`     | Absolute path to `<parent(output_file)>/candidates/`                                                                                                 |

Workers MUST read `vibe_context_path` BEFORE applying criteria.

Each worker:

1. Reads the chunk file at `chunk_file_path`.
2. Applies all composite criteria from `criteria.md` and exclusions from `privacy-rules.md`.
3. Writes `<candidates_dir>/<chunk_name>_composites.json` conforming to
   `composite_clip_suggestions.worker-result.schema.jsonc`.

**Expect:** One `<chunk_name>_composites.json` file per chunk in `candidates_dir`.

### 4. Wide-view analysis

Spawn a wide-view analyst per
`system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/patterns/wide-view-analyst.md`.
Lifecycle: `system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/patterns/agent-lifecycle.md`.

Pass the analyst:

| Field                | Value                                                                                                                                               |
|----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| `chunks_dir`         | Absolute path to the chunks directory                                                                                                               |
| `candidates_dir`     | Absolute path to `<parent(output_file)>/candidates/`                                                                                                |
| `output_dir`         | Absolute path to `<parent(output_file)>/wide-view-composites/`                                                                                      |
| `criteria_path`      | Absolute path to `system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/stages/09-composite-clip-suggestions/criteria.md` |
| `vibe_context_path`  | Absolute path to `system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/vibe-context.md`                           |
| `title_rules_path`   | Absolute path to `system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/clip-title-rules.md`                       |
| `description_template_path` | Absolute path to `system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/clip-description-template.md`       |
| `privacy_rules_path` | Absolute path to `system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/privacy-rules.md`                          |

The analyst reads all chunks chronologically, spawns range sub-agents, and writes:

- `<output_dir>/wide_view_candidates.json` — new cross-cutting composite candidates with `cross_chunk_sources`
- `<output_dir>/chunk_NNN_extensions.json` — augmentations to existing chunk candidates

**Graceful degradation:** If the wide-view analyst errors, log the error and proceed to step 5 with chunk worker candidates only.

**Expect:** `wide_view_candidates.json` in `<parent(output_file)>/wide-view-composites/`.

### 5. Combination worker

Spawn a combination worker per
`system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/patterns/combination-worker.md`.

The worker:

1. Reads all `*_composites.json` files from `candidates_dir`.
2. If `<parent(output_file)>/wide-view-composites/wide_view_candidates.json` exists, reads it and includes its candidates alongside chunk
   worker candidates.
3. If `<parent(output_file)>/wide-view-composites/chunk_*_extensions.json` files exist, applies augmentations to the corresponding chunk
   candidates: override confidence if `elevated_confidence` is non-null, attach `cross_references` and `extended_context` as metadata.
4. Groups candidates by compatible binding into composite suggestions.
5. Within each composite, orders segments by `start_seconds` ascending and assigns roles (`INTRO` → first, `PAYOFF` → last, `BODY` → middle).
6. **Re-validates hard gates.** Drops any composite missing a populated `gates_passed` block, any with any gate marked `false`, any
   missing `binding_thesis`, any with `editorial_effort = "HIGH"`, any with `format_category` not in `GAME_RECAP | TOPIC_DEEP_DIVE |
   JOURNEY_ARC | LIVE_INCIDENT_ARC`, any with `vibe_tier` not in the seven allowed tiers, and any with `segment_count < 2`. Also drops
   composites without exactly one `INTRO` and one `PAYOFF` segment. Does NOT impose any duration cap — long composites are explicitly
   fine when the binding thesis supports them.
7. Deduplicates overlapping arcs: when two composites share more than half their segments, keeps the higher-confidence one; breaks ties by preferring tighter binding (composite with the more specific thesis).
8. Computes `estimated_duration_sec` for each composite as the sum of its segment `duration_sec` values (recomputes after gate validation).
9. **Hard-cap output at 3 composites per stream.** Rank by confidence (`high` before `medium`), then by tier diversity, then by editorial
   effort (`LOW` before `MEDIUM`). Drop the rest. If fewer than 3 survive validation, return what remains — never pad.
10. Writes `output_file` conforming to `composite_clip_suggestions.output.template.jsonc` with `generated_at`, `composite_count`, and the
    deduplicated, gate-validated, hard-capped `composites` array.

### 6. Verify

- [ ] `output_file` exists and is non-empty
- [ ] Top-level keys `generated_at`, `composite_count`, and `composites` are present
- [ ] `composite_count` matches `composites` array length
- [ ] `composite_count <= 3` (hard cap — quality > volume)
- [ ] Every composite has populated `title`, `description`, `binding_thesis`, `vibe_tier`, `format_category`, `narrative_thread`, `editorial_effort`, `gates_passed`, `estimated_duration_sec`, `confidence`, and at least one segment
- [ ] Every composite's `vibe_tier` is one of the seven allowed tiers
- [ ] Every composite's `format_category` is one of `GAME_RECAP | TOPIC_DEEP_DIVE | JOURNEY_ARC | LIVE_INCIDENT_ARC`
- [ ] Every composite's `editorial_effort` is `LOW` or `MEDIUM` (never `HIGH`)
- [ ] Every composite's `gates_passed` block has all eight fields set to `true`
- [ ] Every composite has exactly one segment with role `INTRO` and exactly one with role `PAYOFF`
- [ ] Every composite's `estimated_duration_sec` is `>= 120` and `<= 900`
- [ ] Every composite's `description` contains the `{chapters}` placeholder, the AI-disclosure line, and the `{source_stream_url}` placeholder
- [ ] Every segment has a `role`, `title`, `start_seconds`, `end_seconds`, and `duration_sec`
- [ ] No two composites share more than half their segments after deduplication
- [ ] If `wide-view-composites/` directory exists: `wide_view_candidates.json` is valid JSON with `candidate_count` matching `candidates` array length
- [ ] If wide-view candidates exist: every candidate has a `cross_chunk_sources` array with at least 2 entries

If any check fails: do not return success.
