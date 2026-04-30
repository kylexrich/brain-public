# Task Planning Checklist

This checklist is the single source of detailed planning requirements.
Use the sibling templates (`CONTEXT_TEMPLATE.md`, `STEPS_GUIDE_TEMPLATE.md`, `STEPS_TEMPLATE.md`) for structure only.

## 0) How to use this checklist and the templates

- The output documents are the contents of the fenced ```md blocks in the templates. Everything outside the fences is instruction.
- Remove placeholder bullets you do not fill in; do not leave empty sections.
- If a section is not relevant, omit it entirely instead of writing "N/A" or "None".
- Do not include conditional labels like "optional" or "if applicable" in finished docs; either include the real content or omit the section/item.
- If a section is omitted, remove any dependent checklist items or references that only make sense when that section exists.
- Do not assume the task is a code change. This skill must also work for docs, operations, configuration, knowledge work, or mixed workflows.
- If a section is irrelevant for the target project, omit it cleanly.

### Context doc construction

- Optional sections:
  - 9) Data model and contracts — omit when no interface/schema/data changes are involved
  - 10) Component-level impact — omit untouched components, or omit the entire section for small/simple tasks
  - 13) Operational readiness
  - 14) Research and references
  - 15) Open questions

### Steps guide construction

- The steps guide is the single coordination document.
- Every step in the plan must appear in the step index, including the final validation step.
- The steps guide must make dependency order and parallel-safe batching obvious.

### Steps doc construction

- Optional sections:
  - References
  - Plan snippets
  - Completion Notes
- Validation/review belongs only in the step checklist. Do not add a standalone validation or review section to step docs.
- Preserve the step-loop post-step handoff note in the checklist so executors return control to the orchestrator, leave changes unstaged, and do not ask for next action.
- Every step must declare its execution root and file/work-area scope.
- Every step must be completable by one agent in one session.

## 1) Intake and scope

- [ ] Capture the objective, success criteria, and why this matters
- [ ] Define scope boundaries and explicit non-goals
- [ ] List constraints (time, policy, tech, compliance, UX, operational)
- [ ] Identify stakeholders or users affected
- [ ] Search for similar or related plans in `shared/docs/tasks/`
- [ ] Define explicit acceptance criteria
- [ ] List intentional out-of-scope edge cases to avoid over-engineering

## 2) Foundational context

- [ ] Identify the target project, workspace, or system
- [ ] Record the execution root where sub-agents should run by default
- [ ] Read project-level documentation (README, AGENTS.md, architecture docs, runbooks, design docs)
- [ ] Read all applicable `AGENTS.md` files for impacted paths
- [ ] Note product, business, or operational rules that must be preserved
- [ ] Identify the tech stack, build system, and validation surface when relevant

## 3) Existing patterns and current state

- [ ] Search for existing patterns, similar work, or adjacent features (`rg`, `grep`, `find`, docs search)
- [ ] Identify the current workflow or system behavior
- [ ] Identify the key files, folders, components, docs, or systems involved
- [ ] Check dependency/config manifests when relevant (`package.json`, `Cargo.toml`, `pyproject.toml`, config schemas, etc.)
- [ ] Note helpers, utilities, abstractions, or existing docs to reuse
- [ ] Note branch/worktree assumptions only if they materially matter

## 4) Interfaces, data, and contracts

- [ ] Identify any API, CLI, config, schema, storage, or document contracts that will change
- [ ] Review relevant schema/type definitions when they exist
- [ ] Identify migration or backward-compatibility concerns
- [ ] Note validation rules, serialization formats, or naming conventions that matter

## 5) Component-specific investigation

Adapt this section to the actual project shape.

- [ ] For each impacted component/module/workstream:
  - [ ] Review its entry points and public interfaces
  - [ ] Review its internal flow / logic / lifecycle
  - [ ] Note any configuration, secrets, permissions, or dependency-injection patterns
  - [ ] Note any validation, review, or test expectations
- [ ] For infrastructure or deployment work:
  - [ ] Identify env vars, secrets, permissions, or runtime wiring changes
  - [ ] Check CI/CD or operational implications
- [ ] For docs / content / knowledge workflows:
  - [ ] Identify canonical sources and update paths
  - [ ] Avoid duplicate documentation; link instead

## 6) External research and best practices

- [ ] Review third-party docs when integrations or external tools are involved
- [ ] Research best practices for the domain (security, UX, reliability, performance, operations)
- [ ] Note any relevant standards, compliance, policy, or audit requirements
- [ ] Summarize findings and design implications
- [ ] Resolve researchable questions before leaving open questions behind

## 7) Requirements and design decisions

- [ ] Define functional requirements
- [ ] Define non-functional requirements
- [ ] Document assumptions and constraints
- [ ] Capture decisions and rationale
- [ ] Identify concurrency / ordering / race-condition risks
- [ ] Identify idempotency requirements when relevant
- [ ] Define retry / backoff strategy for transient failures when retries are part of the design
- [ ] Note rollback or fallback expectations when relevant

## 8) Risk and rollout

- [ ] Identify key risks and mitigations
- [ ] Identify observability, logging, or audit needs when relevant
- [ ] Identify rollout sequencing or migration sequencing if applicable

## 9) Validation

- [ ] Define how correctness will be verified for this specific task
- [ ] Include code validation only when the project actually has tests/lint/typecheck/builds worth running
- [ ] Include docs / manual / operational validation where those are the right checks
- [ ] Identify documentation updates required

## 10) Dependency ordering and step design

**Critical:** The finished plan must be directly executable by `step-loop`.

- [ ] Map dependencies and ordering constraints across components or workstreams
- [ ] Break work into small-to-medium steps
- [ ] Use as many steps and step files as needed; max 5 steps per steps doc
- [ ] Ensure each step has clear "Done When" criteria and enough context to execute independently
- [ ] Ensure each step records:
  - [ ] execution root
  - [ ] file/work-area scope
  - [ ] prereqs
  - [ ] whether it is serial or parallel-ready
- [ ] Add a final validation step and keep it last
- [ ] Keep the step-loop post-step handoff note in the step checklist so executors return to the orchestrator, leave changes unstaged, and do not ask for next action
- [ ] Identify which independent steps can safely run concurrently via sub-agents
- [ ] If scope overlap is ambiguous, design the plan to run serially instead of guessing

## 11) Final review

- [ ] Context doc is specific, non-placeholder, records the correct execution root, and uses the correct approval status
- [ ] Steps guide matches the steps docs exactly
- [ ] Every step has explicit prerequisites and file/work-area scope
- [ ] Parallel-ready steps are truly non-conflicting
- [ ] The final validation step is last
- [ ] The full planning pipeline has completed: parallel create (Codex + Opus) → Codex combine → Opus challenge (read-only) → Codex refine
- [ ] Context status remains `Draft` until the Codex refine pass is complete, then is set to `Approved`
- [ ] Open questions pass the researchable-question filter below

### [STRICT] Open Questions Filter

**Before listing any open question, you MUST attempt to answer it yourself.**

A question is **not** an open question if it can be answered by:
- reading the codebase, docs, or task artifacts
- reading `AGENTS.md`, README, architecture docs, or runbooks
- checking manifests, configs, schemas, or existing patterns
- searching the web or third-party docs
- any other research you can do without human input

Open questions are only for:
- real design decisions requiring human judgment
- business rules not documented anywhere
- conflicting information that cannot be reconciled
- trade-offs where multiple valid approaches exist and preference is unclear
- ambiguous requirements that remain ambiguous after research

If you can answer it by research, it is not an open question. Do the research.
