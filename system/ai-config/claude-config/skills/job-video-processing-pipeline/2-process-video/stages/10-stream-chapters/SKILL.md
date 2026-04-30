---
name: 10-stream-chapters
description: "Identify chapter boundaries across a stream transcript by spawning chunk workers, merging boundary candidates, and writing stream_chapters.json plus updating the chapters section of youtube-metadata.json. Not for manual chapter editing or standalone timestamp work."
---

# Stage 10 — Stream Chapters

**Mission:** Identifies chapter boundaries across the stream transcript by spawning workers to extract raw candidates, merging
and deduplicating those candidates, and producing a final `stream_chapters.json` artifact alongside an updated chapters section in
`youtube-metadata.json`.

---

## Interface

### Inputs

```yaml
chunks_dir:
  type: string
  required: true
  description: Absolute path to the chunks directory.
  constraints: Must exist and contain chunk files.

transcript_duration_sec:
  type: integer
  required: true
  description: Total stream duration in seconds.
  constraints: Must be > 0.

output_file:
  type: string
  required: true
  description: Absolute path for stream_chapters.json.

youtube_metadata_file:
  type: string
  required: true
  description: Absolute path to youtube-metadata.json.
  constraints: Must exist.

force:
  type: boolean
  required: false
  default: false
  description: Always regenerate even if output exists.
  constraints: Skips if output_file exists and vod_duration_sec matches transcript_duration_sec; regenerates on duration mismatch regardless of force.
```

### Outputs

```yaml
stream_chapters:
  op: create
  path: "{output_file}"
  count: 1
  description: Canonical chapters artifact.
  template: stream_chapters.output.template.jsonc

chunk_candidates:
  op: create
  path: "{output_file}/../candidates/{chunk_name}_candidates.json"
  count: N
  description: Raw boundary candidates per chunk worker.
  template: chunk_candidates.template.jsonc

youtube_metadata:
  op: edit
  path: "{youtube_metadata_file}"
  count: 1
  description: Chapters section of description field updated.
  template: system/ai-config/claude-config/skills/job-video-processing-pipeline/2-process-video/shared/youtube-description-template.md
```

### Response Format

```jsonc
// Return payload (not written to disk)
{
  "status": "success | skipped | error",
  "chapter_count": 12,
  "reason": "<skip reason (e.g. stream_under_5_minutes) or error description — only present when status is not success>"
}
```

---

## Execution

### 1. Check cache

**When:** `force` is `false`, `output_file` exists, and `vod_duration_sec` in the existing file matches `transcript_duration_sec`

1. Read `chapter_count` from the existing `output_file`.
2. Return `{ "status": "skipped", "chapter_count": <existing count> }`.

**Otherwise:** Continue to the next step.

### 2. Check minimum duration

**When:** `transcript_duration_sec` < 300 (stream is under 5 minutes — see `chapter-rules.md`)

1. Return `{ "status": "skipped", "chapter_count": 0, "reason": "stream_under_5_minutes" }`.

**Otherwise:** Continue to the next step.

### 3. Chunk workers

Spawn chunk workers per
`system/ai-config/claude-config/skills/job-video-processing-pipeline/2-process-video/shared/patterns/chunk-worker.md`.
Lifecycle: `system/ai-config/claude-config/skills/job-video-processing-pipeline/2-process-video/shared/patterns/agent-lifecycle.md`.

Each worker reads its assigned chunk, identifies chapter boundaries following all rules in `chapter-rules.md`, and writes
`candidates/<chunk_name>_chapters.json` alongside `output_file`, conforming to `chunk_candidates.template.jsonc`.

**Expect:** One `<chunk_name>_chapters.json` file per chunk in `candidates/`.

### 4. Combination worker

Spawn a combination worker per
`system/ai-config/claude-config/skills/job-video-processing-pipeline/2-process-video/shared/patterns/combination-worker.md`.

The worker:

1. Reads all `*_chapters.json` files from `candidates/`.
2. Merges and deduplicates boundary candidates following the merge rules in `chapter-rules.md`.
3. Writes the finalized chapters to `output_file` (`stream_chapters.json`) conforming to `stream_chapters.output.template.jsonc`.
4. Updates the chapters section of `youtube_metadata_file` (`youtube-metadata.json`)
   per `system/ai-config/claude-config/skills/job-video-processing-pipeline/2-process-video/shared/youtube-description-template.md`.

### 6. Verify

- [ ] `stream_chapters.json` exists at `output_file` and is non-empty
- [ ] First chapter has `time_seconds: 0` and a content-grounded title (not a generic placeholder)
- [ ] `vod_duration_sec` in `stream_chapters.json` matches `transcript_duration_sec` input
- [ ] `youtube-metadata.json` description contains updated chapter timestamps
- [ ] Result `status` is `"success"` or `"skipped"` with `chapter_count` set and no unresolved errors
