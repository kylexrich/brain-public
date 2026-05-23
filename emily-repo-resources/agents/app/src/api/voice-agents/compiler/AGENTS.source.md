> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `app/src/api/voice-agents/compiler/AGENTS.md` _(this file)_ > `app/AGENTS.md` > `AGENTS.md` _(root)_

---

# `app/src/api/voice-agents/compiler/` EMLY Compiler Guide for AI Contributors

This section captures `app/src/api/voice-agents/compiler/`-specific structure, tooling, and compiler development workflows.

## Repository Overview

- Design intent and architecture are documented in `app/src/api/voice-agents/compiler/docs/README.md`.

### Directory Layout

- `app/src/api/voice-agents/compiler/`: compiler sources and supporting files.
  - `app/src/api/voice-agents/compiler/VoiceAgentCompilerFacade.ts`: entry point that selects inbound/outbound domain pipelines.
  - `app/src/api/voice-agents/compiler/compiler-domain-types.ts`: pipeline-selector enum (`VoiceAgentCompilerDomainType`) and the abstract `CompilerDomainPack` interface every domain pack implements.
  - `app/src/api/voice-agents/compiler/compiler-contracts.ts`: public compile request/artifact shapes (`BaseCompilerCompileRequest`, `CompilerPipelineArtifacts`, etc.) consumed by callers and per-domain pipelines.
  - `app/src/api/voice-agents/compiler/docs/README.md`: architecture and pipeline rationale.
- `app/src/api/voice-agents/compiler/domain/`: voice-agent-specific implementations wired into the engine.
  - `app/src/api/voice-agents/compiler/domain/inbound/`: inbound compile context, domain pack, pipeline, base skeleton, inbound-only modules, and inbound composition rules.
  - `app/src/api/voice-agents/compiler/domain/outbound-campaigns/`: outbound compile context, domain pack, pipeline, base skeleton, outbound-only modules, and outbound composition rules.
  - `app/src/api/voice-agents/compiler/domain/outbound-event-driven-automations/`: outbound event-driven automation compile context, domain pack, pipeline, base skeleton, outbound-only composition rules, and outbound event-driven automation module registries.
  - `app/src/api/voice-agents/compiler/domain/shared/`: shared runtime helpers, prompt utilities, composition helpers, and shared module compilers reused by inbound and outbound pipelines.
- `app/src/api/voice-agents/compiler/engine/`: compiler engine primitives shared across the pipeline (changes rarely; stabilize core behavior here).
  - `app/src/api/voice-agents/compiler/engine/determinism/`: hashing, stable sorting, and scoped IDs.
  - `app/src/api/voice-agents/compiler/engine/types/`: IR types, ids, ports, prompts, edge registrations, and patch types.
  - `app/src/api/voice-agents/compiler/engine/graph/`: graph assembly, edge registration patching, patch application, port binding, and validation.
  - `app/src/api/voice-agents/compiler/engine/modules/`: module compiler interface and registry.
  - `app/src/api/voice-agents/compiler/engine/composition/`: composition engine, rule registry, and proposal modeling.
  - `app/src/api/voice-agents/compiler/engine/prompts/`: prompt weaving utilities.
  - `app/src/api/voice-agents/compiler/engine/output/`: Retell emitter and output JSON types.

## Related References

- Compiler design intent: `app/src/api/voice-agents/compiler/docs/README.md`
- Repo-wide Retell constant source rule: `.ai/guidance/repository-rules.md#strict-retell-constants`

---

## Guidance Map (DO NOT EDIT)

The documents linked below are the binding rules for this directory and every subdirectory beneath it. All agents operating within this scope must follow them, subject to the instruction precedence defined at the top of this `AGENTS.md` (most specific file wins on conflict).

- `app/src/api/voice-agents/compiler/.ai/guidance/compiler-rules.md`: voice-agent compiler domain divergence, dynamic variable, prompt, tool, and flow diagram rules.
