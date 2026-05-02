---
name: process-video
description: "Single-video processing orchestrator. Runs all stages for one video in sequence, accumulating context and managing per-video state. Invoked by the pipeline job for each video that needs processing. Not for running individual stages in isolation."
---

# Process Video

**Mission:** Orchestrate all processing stages for a single video, running them in the correct dependency order, accumulating context
between stages, and tracking per-stage status in a persistent state file. A successful run means every stage completed or was intentionally
skipped.

---

## Interface

### Inputs

```yaml
stream_dir:
  type: string
  required: true
  description: Absolute path to stream directory.
  constraints: Must exist on disk.

stream_key:
  type: string
  required: true
  description: Canonical stream identifier.
  constraints: "Format: YYYY-MM-DD_HH-MM-SS."

youtube_video_id:
  type: string
  required: true
  description: YouTube video ID.

force:
  type: boolean
  required: false
  default: false
  description: Force all stages to re-execute. Passed down into each stage skill.
  constraints: When absent, no additional argument is provided to each stage skill.
```

### Outputs

```yaml
video_state:
  op: "create, edit"
  path: "{stream_dir}/meta/pipeline/video-state.json"
  count: 1
  description: Per-video state tracking all stages.
  template: video_state.output.template.jsonc
```

### Response Format

```jsonc
// Return payload (not written to disk)
{
  "stream_key": "YYYY-MM-DD_HH-MM-SS",
  "status": "completed | failed",
  "stages_succeeded": [],
  "stages_failed": [],
  "stages_skipped": [],
  "reason": "<error description — only present on catastrophic failure before stages begin>"
}
```

### Failure Modes

A blocking stage failure (download, transcribe, chunk-transcript) stops all remaining stages. Generation and publication stages can fail
independently — their failures are recorded in `video-state.json` and reported in the result without halting other stages.

---

## Progress Checklist

```
- [ ] 1. Load State
- [ ] 2. Construct Paths
- [ ] 3. YouTube Sync
- [ ] 4. Blocking Stages
- [ ] 5. Generation Stages
- [ ] 6. YouTube Publish
- [ ] 7. Clip Production Stages
- [ ] 8. Finalize State
- [ ] 9. Verify
```

---

## Execution

### Agent Team

Create an agent team via `TeamCreate` before starting the stages. You (the orchestrator) execute every stage directly — you do NOT delegate to a per-video sub-agent. For stages that require chunk or combination workers, you spawn those workers inline (Agent calls with `team_name`) as each stage instructs. The team is never used to hand off entire videos or stages. Never ever assign a team agent to an entire video, or an entire processing stage, unless explicitly instructed by other instructions.

### Stage Sequence Reference

| #  | Stage                      | Type        | Notes                                         |
|----|----------------------------|-------------|-----------------------------------------------|
| 01 | youtube-sync               | Setup       | Fetch current YouTube state                   |
| 02 | download                   | Blocking    | Error → stop                                  |
| 03 | transcribe                 | Blocking    | Error → stop                                  |
| 04 | chunk-transcript           | Blocking    | Error → stop                                  |
| 05 | brain-extract              | Generation  | Chunks → vault artifacts                      |
| 06 | vod-cut-recommendations    | Generation  | Chunks → trim suggestions                     |
| 07 | stream-improvements        | Generation  | Chunks → process feedback                     |
| 08 | clip-suggestions           | Generation  | Chunks → standalone clip suggestions          |
| 09 | composite-clip-suggestions | Generation  | Chunks → multi-segment composites             |
| 10 | stream-chapters            | Generation  | Chunks → chapters + update youtube-metadata   |
| 11 | stream-summary             | Generation  | Chunks → summary + update youtube-metadata    |
| 12 | stream-title               | Generation  | Chunks → full title + update youtube-metadata |
| 13 | youtube-publish            | Publication | youtube-metadata → YouTube API                |
| 14 | clip-production            | Production  | clip_suggestions.json → ffmpeg clip files     |
| 15 | composite-clip-production  | Production  | composite_clip_suggestions.json → composites  |

### 1. Load State

1. Load `<stream_dir>/meta/pipeline/video-state.json` if it exists; otherwise initialize a new state object with all stages set to
   `pending` per `video_state.output.template.jsonc`.

### 2. Construct Paths

Build these paths from `stream_dir` and `stream_key`, then pass the relevant subset to each stage:

| Path                                     | Value                                                               |
|------------------------------------------|---------------------------------------------------------------------|
| `source_stream_file`                     | `<stream_dir>/meta/pipeline/source_stream.json`                     |
| `youtube_metadata_file`                  | `<stream_dir>/meta/pipeline/youtube-metadata.json`                  |
| `vod_output_file`                        | `<stream_dir>/<stream_key>_vod.mp4`                                 |
| `transcript_output_file`                 | `<stream_dir>/<stream_key>_transcript.json`                         |
| `fillers_output_file`                    | `<stream_dir>/<stream_key>_fillers.json`                            |
| `stream_videos_root`                     | three parents above `<stream_dir>` (top-level `vault/stream-videos/`) |
| `timeline_output_file`                   | `<stream_videos_root>/fillers-timeline.html`                        |
| `chunks_output_dir`                      | `<stream_dir>/meta/outputs/chunks`                                  |
| `brain_extract_output_file`              | `<stream_dir>/meta/outputs/brain-extract/brain_extract.json`        |
| `vod_cut_output_file`                    | `<stream_dir>/meta/outputs/vod_cut_recommendations.json`            |
| `stream_improvements_output_file`        | `<stream_dir>/meta/outputs/stream_improvement_recommendations.json` |
| `clip_suggestions_output_file`           | `<stream_dir>/meta/outputs/clip_suggestions.json`                   |
| `composite_clip_suggestions_output_file` | `<stream_dir>/meta/outputs/composite_clip_suggestions.json`         |
| `stream_chapters_output_file`            | `<stream_dir>/meta/outputs/stream-chapters/stream_chapters.json`    |
| `stream_summary_output_file`             | `<stream_dir>/meta/outputs/stream_summary.json`                     |
| `stream_title_output_file`               | `<stream_dir>/meta/outputs/stream_title.json`                       |
| `youtube_publish_output_file`            | `<stream_dir>/meta/outputs/youtube_publish.json`                    |
| `clips_output_dir`                       | `<stream_dir>/meta/outputs/clips`                                   |
| `clip_production_manifest_file`          | `<stream_dir>/meta/outputs/clip_production_manifest.json`            |
| `composite_clips_output_dir`             | `<stream_dir>/meta/outputs/composite-clips`                          |
| `composite_clip_production_manifest_file`| `<stream_dir>/meta/outputs/composite_clip_production_manifest.json`  |

### 3. YouTube Sync

1. Run stage `01-youtube-sync` — always executes to refresh `youtube-metadata.json`.
2. Record status and result in video state.
3. Write `video-state.json` to disk.

### 4. Blocking Stages

1. Run `02-download`. Pass `force` if set. Record outcome in video state. Write `video-state.json` to disk. On error → stop all remaining stages.
2. Run `03-transcribe`. Pass `force` if set. Record outcome in video state. Write `video-state.json` to disk. On error → stop all remaining stages.
3. Run `04-chunk-transcript`. Pass `force` if set. Record outcome in video state. Write `video-state.json` to disk. On error → stop all remaining stages.
4. Accumulate values returned by each stage:

| After stage      | Accumulated values                                                                                                                 |
|------------------|------------------------------------------------------------------------------------------------------------------------------------|
| download         | `video_file` (absolute path to VOD written)                                                                                        |
| transcribe       | `transcript_file` (absolute path to transcript), `fillers_file` (per-stream fillers JSON), `timeline_file` (aggregate timeline HTML) |
| chunk-transcript | `chunks_dir` (absolute path to chunks directory), `transcript_duration_sec`                                                        |

### 5. Generation Stages

Run stages 05–12 in order. Pass `force` to each stage if set. Each stage's failure is recorded but does not stop subsequent stages.

1. Run `05-brain-extract`. Record outcome in video state. Write `video-state.json` to disk.
2. Run `06-vod-cut-recommendations`. Record outcome in video state. Write `video-state.json` to disk.
3. Run `07-stream-improvements`. Record outcome in video state. Write `video-state.json` to disk.
4. Run `08-clip-suggestions`. Record outcome in video state. Write `video-state.json` to disk.
5. Run `09-composite-clip-suggestions`. Record outcome in video state. Write `video-state.json` to disk.
6. Run `10-stream-chapters`. Record outcome in video state. Write `video-state.json` to disk.
7. Run `11-stream-summary`. Record outcome in video state. Write `video-state.json` to disk.
8. Run `12-stream-title`. Record outcome in video state. Write `video-state.json` to disk.

### 6. YouTube Publish

**When:** Stages 10 (stream-chapters), 11 (stream-summary), and 12 (stream-title) all completed successfully.

1. Run `13-youtube-publish` — pushes `youtube-metadata.json` to YouTube API.
2. Record outcome in video state. Write `video-state.json` to disk.

**Otherwise:**

1. Record youtube-publish as skipped. Write `video-state.json` to disk.

### 7. Clip Production Stages

1. **When** stage 08 (clip-suggestions) succeeded: Run `14-clip-production`. Pass `force` if set. Record outcome in video state. Write `video-state.json` to disk. **Otherwise:** Record clip-production as skipped. Write `video-state.json` to disk.
2. **When** stage 09 (composite-clip-suggestions) succeeded: Run `15-composite-clip-production`. Pass `force` if set. Record outcome in video state. Write `video-state.json` to disk. **Otherwise:** Record composite-clip-production as skipped. Write `video-state.json` to disk.

### 8. Finalize State

1. Write the final `video-state.json` to `<stream_dir>/meta/pipeline/video-state.json` conforming to `video_state.output.template.jsonc`.
2. Build and return the result JSON.

### 9. Verify

- [ ] `video-state.json` exists and contains entries for all stages
- [ ] Every stage has a status of `success`, `error`, or `skipped` — none left `pending`
- [ ] Result JSON includes correct `stages_succeeded`, `stages_failed`, and `stages_skipped` arrays
- [ ] No unresolved errors in state for stages marked `success`

If any check fails: do not return success.
