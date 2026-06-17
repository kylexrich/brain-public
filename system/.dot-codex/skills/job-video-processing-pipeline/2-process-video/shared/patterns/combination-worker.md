# Combination Worker

A single team agent worker that reads all intermediary artifacts from a candidates directory and produces a final merged output.

## Parameters

| Parameter | Value               | Override                                                    |
|-----------|---------------------|-------------------------------------------------------------|
| Model     | `claude-sonnet-4-6` | brain-extract uses `claude-opus-4-6` (heavier quality-gate) |
| Thinking  | `high`              |                                                             |

## Input

| Field            | Description                                            |
|------------------|--------------------------------------------------------|
| `candidates_dir` | Absolute path to directory of intermediary artifacts   |
| `output_file`    | Absolute path for the final output                     |

Stages define the specific merge logic (dedup strategy, sort order, grouping rules).

## Expanded Input (stages with wide-view analyst)

When a stage uses the wide-view analyst pattern, the combination worker receives an additional field:

| Field            | Description                                                  |
|------------------|--------------------------------------------------------------|
| `wide_view_dir`  | Absolute path to wide-view output directory (may not exist)  |

### Processing wide-view output

1. Read all chunk worker candidates from `candidates_dir` (existing behavior).
2. If `wide_view_dir` exists and contains `wide_view_candidates.json`:
   - Read it and treat its candidates as additional input alongside chunk worker candidates.
3. If `wide_view_dir` contains `chunk_NNN_extensions.json` files:
   - For each extension, locate the target candidate by `chunk_file` + `candidate_index` in the chunk worker candidates.
   - Apply `elevated_confidence` (override the candidate's confidence if non-null).
   - Attach `cross_references` and `extended_context` as metadata on the candidate.
4. Proceed with stage-specific merge/dedup logic on the combined candidate set.

If `wide_view_dir` does not exist or is empty, the combination worker operates on chunk worker candidates only (existing behavior).

## Output

Writes a single JSON file to `output_file`. Schema is stage-specific.
