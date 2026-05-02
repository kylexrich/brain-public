# Agent Lifecycle Rules

## Scoping

Each agent in the agent team is scoped to a single unit of work:

- **Chunk workers**: one chunk.
- **Combination workers**: one merge pass.
- **Dual-LLM workers**: one full-transcript pass.
- **Wide-view analyst**: one cross-chunk analysis pass. Its range sub-agents are each scoped to one contiguous chunk range.

An agent never works on multiple units.

## Reuse

A chunk-scoped agent becomes an expert in its chunk. When running in the pipeline (multiple stages sequentially), these agents may be reused for subsequent chunk-related stages on the **same chunk**. Never reuse a chunk agent for a different chunk or a different video.

The following agent types are **single-use only** — never reuse across stages:

- **Wide-view analyst** (parent and range sub-agents)
- **Dual-LLM workers**
- **Combination workers**

## Cleanup

- **Standalone stage**: kill all agents after the stage completes.
- **Pipeline (process-video)**: the orchestrator determines when to clean up agents — typically after all chunk-processing stages finish.
- **Wide-view analyst**: kill the parent and all range sub-agents immediately after the wide-view step completes, before the combination worker starts.

## Kill Rule

Every agent is killed once it has no remaining work. Do not leave idle agents.
