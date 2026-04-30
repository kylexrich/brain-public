# Chunk Worker

One agent team worker per chunk file, producing an intermediary artifact.

## Parameters

| Parameter | Value               |
|-----------|---------------------|
| Model     | `claude-sonnet-4-6` |
| Thinking  | `high`              |

## Input

| Field             | Description                                                   |
|-------------------|---------------------------------------------------------------|
| `chunk_file`      | Filename (e.g., `chunk_003.txt`)                              |
| `chunk_file_path` | Absolute path to the chunk file                               |
| `candidates_dir`  | Absolute path to the stage's intermediary artifacts directory |

Stages may pass additional fields beyond this base schema.

## Output

Each worker writes a JSON file to `candidates_dir`. At minimum:

| Field        | Description                                   |
|--------------|-----------------------------------------------|
| `chunk_file` | The chunk filename this result corresponds to |

All other fields are stage-specific.
