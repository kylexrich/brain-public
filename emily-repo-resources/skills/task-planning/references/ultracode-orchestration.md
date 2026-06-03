# Ultracode Orchestration

**Scope — read this first.** This document and every `[Ultracode]` overlay that points to it apply **only when Claude Code is running in ultracode mode**. Ultracode is a Claude-Code-only session mode; it does not exist in Codex or Gemini. If you are Codex, Gemini, or Claude Code with ultracode **off**, ignore every `[Ultracode]` overlay in this skill suite and follow the conservative instructions written inline — those remain authoritative. Ultracode never changes *what* a skill must produce or verify; it raises only *how many* agents do the work and *how hard* findings are verified.

Referenced by the `[Ultracode]` overlays in the `$task-planning` (`/task-planning`), `$validate-task` (`/validate-task`), `$worktree-task` (`/worktree-task`), and `$inplace-task` (`/inplace-task`) skills.

## Why the overlays exist

The conservative defaults in these skills predate the `Workflow` tool: research runs as one sequential reading pass, validation fan-out defaults to `2` sub-agents, and the checklist is walked top-to-bottom by a single agent. Under ultracode the intent is the opposite — exhaustive coverage, token cost is not a constraint, swarm everything that could go wrong, and verify adversarially. The overlays raise orchestration **magnitude and mechanism** only. The checklists, templates, gates, dependency declarations, and commit rules in the underlying skills stay the single source of truth for the substance.

## Mechanism: author a Workflow, don't hand-roll Task calls

Use the `Workflow` tool (deterministic JS that spawns subagents) instead of one-off `Task` dispatch:

- `parallel(thunks)` — fan out N agents concurrently; barrier (awaits all).
- `pipeline(items, ...stages)` — per-item multi-stage with no barrier between stages.
- `agent(prompt, { schema })` — one subagent; a JSON schema forces a validated structured return.

Concurrency runs up to the cap (~`min(16, cores-2)` concurrent agents); there is no token-budget concern under ultracode.

## Fleet sizing (precedence order)

1. An explicit user-supplied agent count always wins.
2. Otherwise size the fleet to the work: at minimum one agent per independent scope or checklist lens, scaled up toward the concurrency cap.
3. The conservative inline default (e.g. `2`) applies only when ultracode is off.

## Verification patterns

- **Adversarial verify.** For each load-bearing claim ("this plan achieves the objective", "this provider field/casing exists", "this step is done correctly"), spawn N skeptics each tasked to *refute* it; treat the claim as refuted on a majority. Default skeptics to refuted-when-uncertain.
- **Perspective-diverse verify.** Give each verifier a distinct lens (codebase accuracy, completeness/logic, external/contract, risk/edge-case, security) rather than N identical readers.
- **Completeness critic.** A final agent asks "what scope, file, claim, or edge case did the swarm miss?" Its findings seed the next round.
- **Loop-until-dry.** For open-ended discovery, keep spawning finders until K consecutive rounds surface nothing new — simple fixed counts miss the tail.

## Safety boundary — do NOT cross under ultracode

- Ultracode raises fan-out for **read-mostly, idempotent** work only: research, validation, discovery, doc-alignment. It does **not** authorize parallelizing file-mutating execution steps. Independent (`Prereqs: None`) steps may touch shared files the planner did not flag; running them concurrently would clobber each other into a single phase commit. Keep `$phase-loop` (`/phase-loop`) and `$step-loop` (`/step-loop`) step execution **sequential**. If execution parallelism is ever introduced, it must be gated on a validator-certified file-disjointness check, defaulting to sequential when in doubt.
- All conservative correctness gates remain blocking and unchanged: the provider-contract gate, the rollout-doc gate, `$doc-alignment` (`/doc-alignment`), the one-commit-per-phase boundary, "the AI prepares the commit chain but never deploys", and "never push".
