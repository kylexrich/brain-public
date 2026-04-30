# Dual-LLM Selection

Two team workers with different models process the same full input independently. The stage's orchestration logic selects or combines the stronger result.

## Parameters

| Worker        | Model               |
|---------------|---------------------|
| Team Worker A | `claude-sonnet-4-6` |
| Team Worker B | `claude-opus-4-6`   |

Both workers use thinking: `high`.

## Input

| Field        | Description                                          |
|--------------|------------------------------------------------------|
| `chunks_dir` | Absolute path to chunks directory (read chronologically) |

Stages may pass additional fields beyond this base schema.

## Output

Each worker produces its own result independently. Schema and selection logic are stage-specific.
