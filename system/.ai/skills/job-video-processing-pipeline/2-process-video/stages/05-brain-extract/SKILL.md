---
name: 05-brain-extract
description: "Extract vault artifacts (beliefs, experiences, preferences, content ideas, ideas, sources) from transcript chunks using a two-pass worker + review pattern, then write accepted artifacts to the vault with provenance backlinks."
---

# Stage 05 — Brain Extract

**Mission:** Extract knowledge artifacts from all transcript chunks using a bounded worker swarm, then quality-gate and deduplicate the
candidates with a single review worker before committing accepted artifacts to the vault with provenance backlinks.

---

## Interface

### Inputs

```yaml
chunks_dir:
  type: string
  required: true
  description: Absolute path to the chunks directory.
  constraints: Must exist and contain at least one chunk file.

output_file:
  type: string
  required: true
  description: Absolute path for the output brain_extract.json.
  constraints: Parent directory must be writable.

force:
  type: boolean
  required: false
  default: false
  description: Always re-execute even if output already exists.
  constraints: When false, skips if output_file exists. Pass true to force a full re-run.
```

### Outputs

```yaml
worker_candidates:
  op: create
  path: "{output_file}/../candidates/{chunk}_candidates.json"
  count: N
  description: Per-chunk raw candidate list written by each worker.
  template: extraction_candidates.template.jsonc

brain_extract:
  op: create
  path: "{output_file}"
  count: 1
  description: "Audit trail — one entry per reviewed candidate with disposition (created | updated | skipped) and vault path."
  template: brain_extract.output.template.jsonc

vault_artifacts:
  op: "create, edit"
  path: "vault/{type}/{slug}.md"
  count: N
  description: Accepted vault artifacts — Markdown following destination folder AGENTS.md rules with provenance backlink.
  template: —
```

### Response Format

```jsonc
// Return payload (not written to disk)
{
  "status": "success | skipped | error",
  "chunks_analyzed": 6,
  "raw_candidate_count": 42,
  "deduped_candidate_count": 28,
  "artifacts_created": 5,
  "artifacts_updated": 3,
  "artifacts_skipped": 20,
  "reason": "<error description — only present when status is error>"
}
```

---

## Execution

### 1. Check idempotency

**When:** `output_file` already exists and `force` is not `true`

1. Read counts from the existing `output_file`.
2. Return
   `{"status": "skipped", "chunks_analyzed": <value>, "raw_candidate_count": <value>, "deduped_candidate_count": <value>, "artifacts_created": <value>, "artifacts_updated": <value>, "artifacts_skipped": <value>}`
   and stop.

**Otherwise:**

1. Continue to Step 2.

### 2. List chunks

1. List all chunk files in `chunks_dir`.
2. If no chunk files are found, return
   `{"status": "success", "chunks_analyzed": 0, "raw_candidate_count": 0, "deduped_candidate_count": 0, "artifacts_created": 0, "artifacts_updated": 0, "artifacts_skipped": 0}`
   and stop.

### 3. Spawn workers

1. Spawn chunk workers per
   `system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/patterns/chunk-worker.md`.
   Lifecycle: `system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/patterns/agent-lifecycle.md`.
2. Pass each worker: `chunk_file`, `chunk_file_path`, `extraction_types_dir_path`, and `candidates_dir`.
3. Require workers to read chunk files directly from disk and to read all type rules in `extraction-types/` (`beliefs.md`,
   `content-ideas.md`, `experiences.md`, `ideas.md`, `preferences.md`, `sources.md`).
4. Require each worker to write `<candidates_dir>/<chunk_name>_candidates.json` conforming to `extraction_candidates.template.jsonc` and
   return `chunk_file`, `candidate_count`, and `candidates_file`.

**Expect:** One successful worker return per chunk containing `chunk_file`, `candidate_count`, and `candidates_file`.
**On fail:** if a worker errors, surface the error and do not proceed to the review step.

### 4. Wide-view analysis

Spawn a wide-view analyst per
`system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/patterns/wide-view-analyst.md`.
Lifecycle: `system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/patterns/agent-lifecycle.md`.

Pass the analyst:

| Field                       | Value                                                        |
|-----------------------------|--------------------------------------------------------------|
| `chunks_dir`                | Absolute path to the chunks directory                        |
| `candidates_dir`            | Absolute path to `<parent(output_file)>/candidates/`         |
| `output_dir`                | Absolute path to `<parent(output_file)>/wide-view/`          |
| `extraction_types_dir_path` | Absolute path to `stages/05-brain-extract/extraction-types/`  |

The analyst reads all chunks chronologically, spawns range sub-agents, and writes:

- `<output_dir>/wide_view_candidates.json` — new cross-cutting extraction candidates with `cross_chunk_sources`
- `<output_dir>/chunk_NNN_extensions.json` — augmentations to existing chunk candidates

**Graceful degradation:** If the wide-view analyst errors, log the error and proceed to step 5 with chunk worker candidates only.

**Expect:** `wide_view_candidates.json` in `<parent(output_file)>/wide-view/`.

### 5. Review and commit

1. Spawn a combination worker per
   `system/.dot-claude/skills/job-video-processing-pipeline/2-process-video/shared/patterns/combination-worker.md`
   (uses the opus model override for this stage).
2. Read all candidate files from `<parent(output_file)>/candidates/`.
3. If `<parent(output_file)>/wide-view/wide_view_candidates.json` exists, read it and include its candidates in the review pool.
4. If `<parent(output_file)>/wide-view/chunk_*_extensions.json` files exist, apply augmentations to the corresponding chunk candidates:
   override confidence if `elevated_confidence` is non-null, attach `cross_references` and `extended_context` as metadata.
5. Read type rules from `extraction-types/` for each type encountered.
6. Read destination vault folder AGENTS.md rules for each target folder (`vault/beliefs/`, `vault/experiences/`, etc.).
7. Deduplicate candidates across chunks (same concept from different chunks = one candidate).
8. Quality-gate each remaining candidate against the criteria in `extraction-types/<type>.md`.
9. For accepted candidates, write vault artifacts as Markdown to the correct destination folder per type with a provenance backlink to the
   stream.
10. Write `output_file` conforming to `brain_extract.output.template.jsonc`, populating `reviewed_candidates` with one entry per
    reviewed candidate including its disposition (`created | updated | skipped`) and `vault_path`.
11. Return counts: `chunks_analyzed`, `raw_candidate_count`, `deduped_candidate_count`, `artifacts_created`, `artifacts_updated`,
    `artifacts_skipped`.

**Expect:** `output_file` is written, accepted vault artifacts are committed, and aggregate counts are returned.
**On fail:** surface the error; do not return success.

### 6. Verify

- [ ] `output_file` exists and is non-empty
- [ ] `output_file` conforms to `brain_extract.output.template.jsonc` (all required fields present)
- [ ] `artifacts_created + artifacts_updated + artifacts_skipped` equals `deduped_candidate_count`
- [ ] Each candidate with `status: "created"` or `"updated"` has a non-null `vault_path` pointing to an existing file
- [ ] Result JSON has `status` of `success` or `skipped`
- [ ] If `wide-view/` directory exists: `wide_view_candidates.json` is valid JSON with `candidate_count` matching `candidates` array length
- [ ] If wide-view candidates exist: every candidate has a `cross_chunk_sources` array with at least 2 entries

If any check fails: do not return success.
