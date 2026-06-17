---
title: "Voice-Agent Compiler Rules"
description: "voice-agent compiler domain divergence, dynamic variable, prompt, tool, and flow diagram rules."
order: 1
---

## Read The Design Before Implementing

* Before completing implementation work, read and understand the design and intent described in `app/src/api/voice-agents/compiler/docs/README.md`.

## Domain Divergence: Duplicate, Don't Discriminate

When a module compiler's emitted `ModuleContribution` differs between inbound and outbound - different prompt copy, different node structure, different edge-hook contributions, different post-call analysis fields, different port bindings, etc. - duplicate the compiler file into the appropriate domain folder. Do not introduce runtime discriminators (for example `if (context.domain === 'inbound') { ... }`) inside a shared compiler.

* A compiler whose `ModuleContribution` is identical across both pipelines lives in `app/src/api/voice-agents/compiler/domain/shared/modules/<feature>/`.
* The moment its contribution diverges, the compiler is split into domain-specific files (`app/src/api/voice-agents/compiler/domain/inbound/modules/<feature>/`, `app/src/api/voice-agents/compiler/domain/outbound-campaigns/modules/<feature>/`, or `app/src/api/voice-agents/compiler/domain/outbound-automation-workflows/modules/<feature>/` as appropriate). Each file is a complete compiler for its domain, even when 80%+ of the body is identical.
* Pure node-builder helpers that emit `NodeIR` only (no `ModuleContribution`, no edge-hook contributions, no post-call fields) can remain shared in `app/src/api/voice-agents/compiler/domain/shared/modules/<feature>/shared/` and be imported by both duplicated compilers.
* DI registration in `app/src/DependencyInjector.ts` reflects the split: duplicated compilers move from `SHARED_MODULE_COMPILER_CLASSES` to `INBOUND_ONLY_MODULE_COMPILER_CLASSES` and outbound domain-specific registries.

Rationale: inbound and outbound are fundamentally different business contexts. Duplication makes divergence explicit and reviewable in a file diff. Runtime branching scatters domain logic, makes future changes risky to apply consistently across domains, and silently expands as new differences accumulate. The pattern is already established by `app/src/api/voice-agents/compiler/domain/outbound-campaigns/modules/no-op/`: transfer-call no-ops live as separate files in the outbound folder, not as a flag on the shared transfer-call compiler.

## Dynamic Variable References In Prompts

These rules apply the repo-wide Retell constants rule in `.ai/guidance/repository-rules.md#strict-retell-constants`.

* Always use the exported `*VarRef` constants from `emly-common` (for example `callerFirstNameVarRef`, `referenceNameVarRef`) whenever referencing a dynamic variable in any prompt text, edge conditions, or instructions. Do not construct placeholders inline.
* Always use the exported `RETELL_DYNAMIC_VARIABLE` constants from `emly-common` whenever referencing dynamic variables or indexing into an object in all locations except prompt text, edge conditions, or instructions.

## Flow Diagrams

Flow diagrams are required in the current compiler layout for:

* base skeleton folders:
  * `app/src/api/voice-agents/compiler/domain/inbound/base/`
  * `app/src/api/voice-agents/compiler/domain/outbound-campaigns/base/`
  * `app/src/api/voice-agents/compiler/domain/outbound-automation-workflows/base/` (when present)
* module folders under:
  * `app/src/api/voice-agents/compiler/domain/inbound/modules/`
  * `app/src/api/voice-agents/compiler/domain/outbound-campaigns/modules/`
  * `app/src/api/voice-agents/compiler/domain/outbound-automation-workflows/modules/` (when present)
  * `app/src/api/voice-agents/compiler/domain/shared/modules/`

### Diagram Structure

Each flow diagram must:

1. Be pure mermaid: the file contains only a fenced mermaid code block (no prose, no markdown headers outside the block).
2. Use `flowchart TD`: top-down orientation for consistent reading direction.
3. Group nodes into semantic subgraphs with descriptive labels:
  - `entry[...]`: always first. Use `Entry Trigger` for runtime/global triggers or `Compilation Entry` for metadata/no-op flows.
  - Feature-specific phases (for example `slot_selection["Slot Selection"]`, `caller_info["Caller Info Collection"]`).
  - `terminal["Terminal States"]`: contains terminal outcomes when present.
4. Apply correct node shapes based on node type:
  - Global trigger: `GLOBAL["Global Node Condition:<br/>Description"]`
  - Branch nodes: `{{"node_name<br/>(branch)"}}`
  - Conversation nodes: `[["node_name<br/>(conversation)"]]`
  - Extract variable nodes: `[/"node_name<br/>(extract variables)"/]`
  - Function nodes (wait/no-wait): `[/"node_name<br/>(function - wait)"/]` or `[/"node_name<br/>(function - no wait)"/]`
  - Terminal conversation: `(("node_name<br/>(conversation)"))`
  - Terminal transfer: `(("node_name<br/>(transfer)"))`
  - Metadata/no-op marker: `node_name["node_name<br/>(metadata only)"]`
  - Back-edge references: `REF_NAME>"↑ target_node"]` (use for cyclic edges to avoid mermaid rendering issues)
5. Format node labels consistently:
  - Node name on first line (matching the actual node ID in compiled output).
  - Node type in parentheses on second line using `<br/>` separator.
6. Format edge labels consistently:
  - Prefer `|"edge_name:<br/>Description"|` format.
  - Edge name first (matches the condition name in the compiler when applicable).
  - Description explains when this transition occurs.
  - Simple deterministic passthrough edges (for example `continue`) may use a short label.
7. Use mermaid comments (`%% comment text`) to explain non-obvious edge groupings or flow sections.

### Keeping Diagrams Current

* When modifying a module compiler or the base skeleton (adding/removing nodes, changing edges, renaming conditions), update the corresponding flow diagram(s) in the same change.
* When creating a new module or base flow, create a flow diagram before or alongside the implementation - the diagram documents the intended conversation flow.
* When a module switches between graph-contributing and no-op behavior, update its diagram to reflect that change in the same commit.
