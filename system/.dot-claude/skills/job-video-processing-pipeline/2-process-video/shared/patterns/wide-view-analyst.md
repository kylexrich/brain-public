# Wide-View Analyst

A single agent that reads all transcript chunks chronologically, spawns range sub-agents for deeper regional analysis, and produces
cross-cutting candidates that the combination worker merges alongside chunk worker output. Sits between chunk workers and the combination
worker in the stage execution flow.

## Parameters

| Parameter            | Value               |
|----------------------|---------------------|
| Model (parent)       | `claude-opus-4-6`   |
| Model (range agents) | `claude-sonnet-4-6` |
| Thinking             | `high` (both)       |

## Input

| Field            | Description                                                    |
|------------------|----------------------------------------------------------------|
| `chunks_dir`     | Absolute path to chunks directory                              |
| `candidates_dir` | Absolute path to chunk worker candidates (already populated)   |
| `output_dir`     | Absolute path for wide-view output files                       |

Stages pass additional fields (criteria path, rubric path, extraction types, etc.).

## Range Sub-Agent Scaling

| Chunk Count | Range Agents | Chunks Per Agent | Overlap |
|-------------|-------------|------------------|---------|
| 1–3         | 1           | all              | n/a     |
| 4–6         | 2           | 3                | 1 chunk |
| 7–9         | 3           | 3                | 1 chunk |
| 10–12       | 4           | 3                | 1 chunk |
| 13+         | ceil(N/3)   | 3                | 1 chunk |

Each range sub-agent receives:

- Its assigned chunk files (contiguous range of ~3)
- The chunk worker candidate files for those chunks (so it knows what was already found)
- The stage-specific criteria/rubric

Overlap at range boundaries ensures themes that cross a boundary are caught by at least one range agent.

## Execution Flow

1. Read all chunk filenames from `chunks_dir`, sort chronologically.
2. Read all chunk worker candidate files from `candidates_dir`.
3. Compute range assignments per the scaling table above.
4. Spawn range sub-agents in parallel. Each agent:
   - Reads its assigned chunk files from disk
   - Reads the chunk worker candidate files for those chunks
   - Identifies cross-chunk connections, themes, and narrative arcs within its range that no single chunk worker captured
   - Returns its cross-chunk findings
5. Synthesize range sub-agent findings with the parent's own macro-level analysis of the full stream.
6. Write outputs to `output_dir`:
   - `wide_view_candidates.json` — new cross-cutting candidates (see `wide_view_candidates.template.jsonc`)
   - `chunk_NNN_extensions.json` — augmentations to existing chunk candidates (see `chunk_extensions.template.jsonc`)
7. Kill all range sub-agents per `agent-lifecycle.md`.

## Output

### `wide_view_candidates.json`

New candidates discovered through cross-chunk analysis that no individual chunk worker identified. Candidate objects follow the stage's
chunk-worker output schema, with an additional `cross_chunk_sources` field listing the chunks that contributed to the finding (minimum 2).

See `wide_view_candidates.template.jsonc`.

### `chunk_NNN_extensions.json`

One file per chunk that has extensions. Each extension augments an existing chunk worker candidate with:

- `elevated_confidence` — confidence should be raised because corroborating evidence was found in other chunks
- `cross_references` — links to related candidates in other chunks
- `extended_context` — additional context from other chunks that enriches the candidate

See `chunk_extensions.template.jsonc`.

## Graceful Degradation

The wide-view analyst is optional per stage — stages opt in by adding a wide-view step. If the analyst errors, the stage logs the error
and the combination worker proceeds with chunk worker candidates only. A wide-view failure must never block the stage.

## Lifecycle

Per `agent-lifecycle.md`: the parent agent and all range sub-agents are killed after the wide-view step completes. Range sub-agents are
scoped to a single analysis pass and are never reused across stages.
