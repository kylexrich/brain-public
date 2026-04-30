# SUB-AGENT-MODEL-STRATEGY.md — Shared Model Strategy for Sub-Agents

> These are recommended defaults for this OpenClaw setup. Adapt only when the runtime truly forces it.

## Core principles

Default role split:
- **Opus high** = orchestrator, challenger, synthesis partner, and alternate perspective
- **Codex xhigh** = final code decision-maker and code implementer

Rules:
- When multi-agent coordination matters, run a mixed-model swarm.
- Use **Codex xhigh** whenever Codex is involved.
- Use Opus to challenge assumptions and synthesize perspectives, not just to act as a passive scheduler.
- Only parallelize independent work.

## 1) Coding

This is the primary/default scenario.

Use this for:
- implementation
- refactors
- debugging
- task execution
- technical design tied to eventual code changes

### Default coding pattern

1. **Opus high** frames the task, chooses the investigation / implementation angles, and orchestrates the work.
2. Spawn in parallel when useful:
   - **Codex xhigh** for code-first technical analysis or implementation-facing investigation
   - **Opus high** for challenge, alternate reasoning, risk review, or synthesis pressure-testing
3. **Codex xhigh** receives the perspectives and makes the final code decision.
4. **Codex xhigh** implements.
5. **Opus high** may review/challenge the result afterward when the change is risky, architectural, or cross-cutting.

### Coding research / design questions

Use this when the coding task is still in the investigation / design phase.

1. **Opus high** defines what needs to be answered.
2. Run parallel passes using:
   - **Codex xhigh** for codebase-first / implementation-first analysis
   - **Opus high** for challenger / alternative-design analysis
3. **Codex xhigh** reconciles the findings and decides the implementation direction.

### Debugging / swarm investigations

1. **Opus high** orchestrates the swarm.
2. Spawn a **mixed-model** set of investigators.
   - Use **Codex xhigh** for code tracing, reproduction, tests, and implementation-relevant investigation.
   - Use **Opus high** for logs, change archaeology, pattern challenge, synthesis pressure-testing, and alternate explanations.
3. **Opus high** challenges the leading root-cause hypothesis before the fix begins.
4. **Codex xhigh** makes the final fix decision.
5. **Codex xhigh** implements the fix unless the task is analysis-only.

### Multi-step execution / plans

**Planning phase** uses a parallel-create → combine → challenge → refine pipeline:

```
Codex xhigh (create) ──┐
                        ├──→ Codex xhigh (combine) ──→ Opus high (challenge) ──→ Codex xhigh (refine)
Opus high (create)   ───┘
```

1. Spawn **Codex xhigh** and **Opus high** in parallel with the same planning prompt. Each independently produces a full draft plan. Neither sees the other's output.
2. **Codex xhigh** receives both drafts and synthesizes one unified plan — strongest elements from each, conflicts resolved.
3. **Opus high** reviews the combined plan (read-only). Produces specific, actionable challenge notes — **no direct edits**.
4. **Codex xhigh** receives the combined plan + Opus challenge notes and makes final edits. This is the only agent that writes the final planning docs.
5. Plan is `Approved` only after the refine pass.

**Execution phase** (step-loop):

6. **Opus high** orchestrates dependency resolution, batching, and conflict checks.
7. **Codex xhigh** executes concrete code-implementation steps.
8. For ambiguous, risky, or architectural steps, add an **Opus high** challenge pass before Codex commits to the implementation approach.
9. Leave changes unstaged unless the user explicitly asks for staging/commit behavior.

### UI / UX work

For actual client-facing UI / UX work, **Opus high owns the implementation first**.

1. **Opus high** defines and implements the UI / UX directly, without Codex steering the design.
2. **Codex xhigh** may run only **after** the Opus implementation exists.
3. The Codex pass is limited to:
   - improving code quality
   - enforcing `AGENTS.md` / project principles
   - tightening maintainability, safety, and correctness
4. The Codex pass must **not** change the approved client-facing UX direction, interaction model, layout intent, or design choices unless the user explicitly asks for that.

## 2) General research questions

Use this section for research-heavy work that is not primarily an implementation task.

Use this for:
- open-ended questions
- topic exploration
- comparative research
- source gathering
- decision memos
- “what do different models think?” style requests

### General research pattern

1. **Opus high** defines the research frame and decides what perspectives are worth comparing.
2. Spawn a **mixed-model** research swarm in parallel:
   - at least one **Codex xhigh** pass
   - at least one **Opus high** pass
3. The prompts may be:
   - identical, to get true model contrast on the same question, or
   - lightly varied, to cover adjacent angles intentionally
4. **Opus high** consolidates the findings into the final research synthesis.
5. The synthesis should explicitly call out:
   - where Codex and Opus agree
   - where they disagree
   - what is strongly evidenced vs speculative
   - what remains unknown

### When research feeds into coding

If a general research task turns into a coding decision:
- let **Opus high** finish the research synthesis first
- then hand the synthesized research to **Codex xhigh** for the final implementation decision

## sessions_spawn field mapping

Always pass `model` and `thinking` as separate fields.

| Shorthand | `model` | `thinking` |
| --- | --- | --- |
| `opus high` | `opus` | `high` |
| `codex xhigh` | `codex` | `xhigh` |


## Parallelism rule

Only parallelize independent work:
- no unmet dependencies
- no overlapping file scope
- no shared mutable state that makes collisions likely
- no operational surface where multiple agents would step on each other

If scope overlap is unclear, run serially.
