# Worker Contract

Common pattern for stages that spawn bounded worker batches to analyze transcript chunks.

**Used by:** brain-extract, vod-cut-recommendations, stream-improvements, clip-suggestions, composite-clip-suggestions, stream-chapters.

## Pattern

1. List all chunk files in the target chunk directory (plain or timestamped).
2. Spawn 1 worker per chunk file, max 8 concurrent. Wait for each batch before starting the next.
3. Workers read chunk files directly from disk — never paste chunk content into the orchestrator context.
4. Collect each worker's JSON result.
5. Pass collected results to the stage's merge step.

## Worker Parameters

| Parameter      | Value                         |
|----------------|-------------------------------|
| Model          | `anthropic/claude-sonnet-4-6` |
| Thinking       | `high`                        |
| Mode           | `run`                         |
| Max concurrent | 8                             |

## Worker Input

Every worker receives:

| Field             | Description                      |
|-------------------|----------------------------------|
| `chunk_file`      | Filename (e.g., `chunk_003.txt`) |
| `chunk_file_path` | Absolute path to the chunk file  |

Additional stage-specific inputs (e.g., privacy rules path, transcript duration) are defined in each stage's SKILL.md.

## Worker Output

Every worker returns JSON with at minimum:

| Field        | Description                                   |
|--------------|-----------------------------------------------|
| `chunk_file` | The chunk filename this result corresponds to |

All other fields are stage-specific.
