---
name: job-video-processing-pipeline
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
  path: "vault/stream-videos/YYYY-MM/YYYY-MM-DD_day-N/pipeline-state.json"
  count: 1
  description: Pipeline orchestration state tracking all video runs. The day directory (YYYY-MM-DD_day-N) is resolved by scanning existing directories or created by the discovery CLI — never create it manually.
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

**Resolve day directory first:** Run `ls vault/stream-videos/YYYY-MM/` via Bash and look for a directory matching `YYYY-MM-DD_day-*`. **Do NOT use Glob — it only matches files, not directories, and will falsely report no match.** If found, that is the day directory. If not found, **do not create one** — the discovery CLI will create it in Step 2.

**When:** `force` is `true` and day directory exists

1. Delete existing `pipeline-state.json` and all `video-state.json` files at the day directory.
2. Initialize a fresh `pipeline-state.json` conforming to `pipeline-state.template.jsonc`.

**When:** day directory exists and contains `pipeline-state.json`

1. Read existing `pipeline-state.json`.
2. If status is `discovering`, `processing`, or `failed` → resume: re-read the existing work queue.
3. If status is `completed` → initialize a fresh `pipeline-state.json` conforming to `pipeline-state.template.jsonc`.

**Otherwise (no existing day directory or no pipeline-state.json):**

1. Skip to Step 2 (Discover Streams). The discovery CLI creates the day directory; pipeline-state.json is written after discovery completes.

### 2. Discover Streams

**When:** State is fresh, or resuming and `discovery.status` is not `success`

1. Run `1-discovery/SKILL.md` to build the work queue.
2. Record discovery result in pipeline state. Write `pipeline-state.json` to disk.

**Otherwise:** Skip this step.

### 3. Process Videos

**Over:** work queue (sequentially, one video at a time. Do not process in parallel.)
**As:** `video`

1. Record `video` as `processing` in pipeline state. Write `pipeline-state.json` to disk.
2. Invoke `2-process-video/SKILL.md` with `video`. Pass `force: true` if `force` was set.
3. Record `video` outcome in pipeline state. Write `pipeline-state.json` to disk.
4. Proceed to the next video only after the current one completes or fails.

### 4. Finalize

1. Finalize pipeline state with summary counts.
2. Return the result JSON per the Response Format.

### 5. Verify

- [ ] `pipeline-state.json` exists at the day directory path (`YYYY-MM-DD_day-N/`)
- [ ] Pipeline status is `completed` or `failed`
- [ ] All videos have a terminal status (`completed` or `failed`)
- [ ] Summary counts match actual video outcomes

If any check fails: do not return success.
