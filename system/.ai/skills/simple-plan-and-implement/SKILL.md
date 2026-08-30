---
name: simple-plan-and-implement
description: "Plan and implement a repository change from a general goal or loose context under the full applicable AGENTS.md instruction chain, then validate and review the exact change. Use when the user wants an idea, bug fix, refactor, or feature carried from broad context through implementation in the current checkout. Do not use for planning-only, review-only, or read-only requests."
---

# Simple Plan and Implement

Turn a general goal into a focused implementation, verify it, and leave the exact change in a review-ready state.

## Input

Accept the user's goal plus any supplied context, constraints, artifacts, or acceptance criteria. Treat the latest direct user instructions as authoritative within higher-priority safety constraints.

## Workflow

### 1. Establish the contract

1. Confirm the literal repository, checkout, branch, and requested scope. Do not switch targets or rename branches unless instructed.
2. Record the initial working-tree state and preserve unrelated or pre-existing changes.
3. Read every applicable `AGENTS.md` from the repository root through the nearest file governing each likely changed path. Extract its concrete requirements for architecture, file placement, naming, dependencies, contracts, data integrity, security, observability, failure handling, and validation. Treat them as mandatory planning and implementation constraints, not a review-only checklist. Re-evaluate the chain whenever the set of changed paths grows.
4. Convert the general goal into a concrete outcome and constraints using repository evidence. Ask only when an undiscoverable choice would materially change behavior, risk, or scope; otherwise make and state the smallest reasonable assumption.

### 2. Understand the current behavior

1. Trace the relevant entry points, ownership boundaries, data flow, contracts, side effects, failure behavior, observability, and validation paths.
2. Search for existing concepts, helpers, libraries, and repeated repository patterns before introducing new structure or dependencies. Include architecture and layering, dependency injection, naming and types, boundary validation, logging, metrics, error handling, configuration, persistence, concurrency, and verification.
3. Distinguish intentional conventions from isolated legacy inconsistency using the applicable `AGENTS.md`, current source-of-truth documentation, and repeated current usage.
4. Identify the smallest coherent change that achieves the outcome. Exclude unrelated cleanup and speculative future work.

### 3. Plan

Write a concise, dependency-ordered implementation plan in the conversation or plan tool. Every plan step must satisfy the complete applicable `AGENTS.md` chain, and each instruction that materially shapes the work must be visible in the relevant plan step; do not merely state that the files were read. If a principle below conflicts with that chain, the applicable `AGENTS.md` wins. Do not create a planning document unless the user or an applicable `AGENTS.md` requires one.

Shape the plan with the applicable `AGENTS.md` contract first, then these rules:

- Follow existing approaches and code patterns established in the repository for architecture, file organization, dependencies, validation, logging, metrics, error handling, configuration, persistence, concurrency, and verification. Reuse canonical helpers, libraries, types, error taxonomies, and observability vocabulary.
- For brand-new code or folders, use a cleaner, higher-standard organization when no established pattern exists or nearby code is demonstrably legacy. Still honor the applicable `AGENTS.md` chain and integrate with surrounding contracts; do not copy accidental poor patterns merely for consistency.
- Use boundaries that correspond to concepts a person can readily understand, with clear ownership for each concept.
- Keep related behavior cohesive instead of fragmenting it across arbitrary layers or many tiny files.
- Prefer straightforward, boring control flow, explicit dependency direction, and composition of simple pieces over magic, inheritance-heavy designs, or speculative flexibility.
- Make inputs, outputs, dependencies, contracts, side effects, failure behavior, and validation explicit where they matter. Minimize public surface area and make invalid states difficult to represent or misuse.
- Validate and normalize untrusted data at system boundaries, translate external types and errors there, and let typed internal code rely on established invariants instead of scattering defensive checks.
- Localize side effects and keep core decisions deterministic where practical. Make data mutations atomic where invariants require it, and make asynchronous or repeated processing idempotent where the failure model requires it.
- Plan actionable observability at boundaries and key decisions: use the repository's structured logging, correlation, redaction, metric naming, and bounded-cardinality conventions rather than inventing parallel telemetry.
- Bound retries, pagination, fan-out, resource use, and concurrent work. Make cleanup and terminal failure behavior explicit; never hide fire-and-forget side effects.
- Introduce an abstraction only when a genuine, stable boundary exists.
- Optimize for traceability, maintainability, and safe change, not cleverness, superficial reuse, or minimum line count.

Include implementation and verification steps. Update the plan when repository evidence invalidates an assumption.

### 4. Implement

1. Make the smallest complete change that satisfies the goal and every extracted `AGENTS.md` constraint.
2. In existing areas, follow established ownership, dependency direction, code patterns, and operational conventions. In greenfield areas, apply the stronger organization standard from the plan without breaking surrounding contracts.
3. Keep contracts, side effects, observability, and failure behavior explicit, and avoid unrelated refactors or new abstractions without an evidenced need.
4. Preserve user work and do not perform commits, pushes, destructive actions, or external writes unless explicitly authorized.

### 5. Verify

1. Run the narrowest relevant static checks, builds, or manual validation permitted by the user and applicable `AGENTS.md` files.
2. Exercise meaningful success and failure behavior when feasible and authorized.
3. Inspect the exact diff created for this goal and run a whitespace or diff-integrity check when available.
4. Report checks exactly as run. Never imply that an unrun or blocked check passed.

### 6. Review and correct

1. Invoke `$simple-code-review` against only the exact change made for this goal; do not attribute unrelated pre-existing changes to it.
2. Correct every supported finding that is safely within scope, then repeat the relevant verification and `$simple-code-review`. If correction requires a material product choice, new authority, or expanded scope, leave the code safe, stop, and surface the finding as a blocker.

If the final change is sound, say so plainly.

## Final response

Lead with the outcome, then provide:

- A concise summary of the implemented behavior.
- The validation actually run and its result.
- `Review: no findings.` when the final change is sound, or unresolved findings ordered by severity with `path:line`, failure mode, and smallest correction.
- Any material assumption or blocker the user still needs to know.
