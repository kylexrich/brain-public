---
name: video-processing-pipeline-job
description: "YouTube VOD processing pipeline orchestrator. Runs discovery then process-video for each stream found. Triggered by cron schedule or manual invocation for a specific date."
---

# Video Processing Pipeline

**Mission:** Discover completed streams for a target date and process each video through atomic stages. Guarantees that all discovered
videos are processed (or explicitly failed) and produces a pipeline state summary.

---

## Interface

### Inputs

```yaml
stream_date:
  type: string
  required: false
  default: today (Pacific)
  description: Date to discover and process streams for.
  constraints: YYYY-MM-DD format.

force:
  type: boolean
  required: false
  default: false
  description: Delete existing state and re-run the entire pipeline from scratch.
```

### Outputs

```yaml
pipeline_state:
  op: "create, edit"
  path: "vault/stream-videos/YYYY-MM/YYYY-MM-DD/pipeline-state.json"
  count: 1
  description: Pipeline orchestration state tracking all video runs.
  template: pipeline-state.template.jsonc
```

### Response Format

```jsonc
// Return payload (not written to disk)
{
  "status": "completed | failed",
  "total_videos": 2,
  "completed": 1,
  "failed": 1,
  "reason": "<error description — only present when status is failed>"
}
```

---

## Progress Checklist

```
- [ ] 1. Initialize Pipeline State
- [ ] 2. Discover Streams
- [ ] 3. Process Videos
- [ ] 4. Finalize
- [ ] 5. Verify
```

---

## Execution

### 1. Initialize Pipeline State

**When:** `force` is `true`

1. Delete existing `pipeline-state.json` and all `video-state.json` files at the target date path.
2. Initialize a fresh `pipeline-state.json` conforming to `pipeline-state.template.jsonc`.

**Otherwise:**

1. Check for existing `pipeline-state.json` at `vault/stream-videos/YYYY-MM/YYYY-MM-DD/pipeline-state.json`.
2. If status is `discovering`, `processing`, or `failed` → resume: re-read the existing work queue.
3. If status is `completed` or no existing state → initialize a fresh `pipeline-state.json` conforming to `pipeline-state.template.jsonc`.

### 2. Discover Streams

**When:** State is fresh, or resuming and `discovery.status` is not `success`

1. Run `1-discovery/SKILL.md` to build the work queue.
2. Record discovery result in pipeline state. Write `pipeline-state.json` to disk.

**Otherwise:** Skip this step.

### 3. Process Videos

**Over:** work queue
**As:** `video`

1. Record `video` as `processing` in pipeline state. Write `pipeline-state.json` to disk.
2. Invoke `2-process-video/SKILL.md` with `video`. Pass `force: true` if `force` was set.
3. Record `video` outcome in pipeline state. Write `pipeline-state.json` to disk.

### 4. Finalize

1. Finalize pipeline state with summary counts.
2. Return the result JSON per the Response Format.

### 5. Verify

- [ ] `pipeline-state.json` exists at the target date path
- [ ] Pipeline status is `completed` or `failed`
- [ ] All videos have a terminal status (`completed` or `failed`)
- [ ] Summary counts match actual video outcomes

If any check fails: do not return success.
