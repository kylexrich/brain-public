---
title: "Backend Reuse, Refactoring, And Object Design"
description: "single sources of truth, dead code, code generation, refactoring discipline, cohesive classes, interfaces, and encapsulated state."
order: 10
---

## DRY, Reuse, Dead Code, And Code Generation
* **[STRICT]** Must keep rules/algorithms/constants in a single authoritative place; must reuse existing helpers/types before adding new ones; must not duplicate knowledge that must stay consistent across the system.
  * **Example:** If both API and DB need the same enum, define it once or generate one from the other.
* **[STRICT]** Must aggressively remove unused code/branches; if removal breaks something, must fix the usage or delete the dependent path too. Must not keep dead paths "just in case."
* **[STRICT]** Must not use copy-paste as a long-term solution for shared business rules or invariants; if duplication is temporarily required, it must be explicitly annotated with the single source of truth and a consolidation plan.
  * **Example:** `// Duplicates rule in UserPolicy.validateEmail(); consolidate after migration.`
* **[STRICT]** Must not create "shared" abstractions that couple independent capabilities without a stable, shared owner and versioning strategy; sharing must not force synchronized deployments unless explicitly intended.
  * **Example:** Do not move unrelated DTOs into a shared library consumed by multiple services without governance/versioning.
* **[GUIDELINE]** Prefer readable duplication over premature abstraction when the abstraction would be speculative, hide important differences, or couple unrelated modules; remove duplication once the commonality stabilizes.
* **[GUIDELINE]** Prefer generating repetitive boilerplate (clients, DTOs, serializers) from schemas over hand-maintaining parallel representations when schemas are the stable source of truth.

## Refactoring Discipline
* **[STRICT]** Must keep refactors behavior-preserving unless explicitly performing a behavior change; behavior changes must be separately justified and covered by tests. Must not mix large refactors with feature work without incremental checkpoints.
  * **Example:** First extract a repository and ensure checks pass; then add the new query feature separately.
* **[STRICT]** Must perform refactoring in small, reversible steps with frequent test runs and version control checkpoints; if tests are missing, must add characterization tests before changing behavior.
  * **Example:** Add golden-master checks for legacy output before restructuring a parser.
* **[GUIDELINE]** Prefer addressing obvious "broken windows" (misleading names, dead code, stale comments) when touching code, as long as the change is safe and test-backed; avoid cosmetic churn that destabilizes history or increases merge conflicts.
* **[GUIDELINE]** Prefer refactoring toward clearer boundaries and simpler dependencies rather than micro-optimizing style; prefer established refactoring patterns (extract function, introduce parameter object, replace conditional with polymorphism) over bespoke transformations.

## Object Design, Interfaces, And Encapsulation
* **[STRICT]** Classes and modules must be cohesive with a single primary reason to change; must never create god objects that coordinate unrelated concerns; must split by responsibility and compose explicitly when a unit grows beyond a clear responsibility.
  * **Example:** Split `UserService` into focused services and keep a thin orchestrator only if needed.
* **[STRICT]** Must encapsulate mutable state and collections; must never expose internal mutable arrays/maps/fields for external mutation; must provide intent-revealing methods that preserve invariants.
  * **Example:** Provide `cart.addItem(item)` and do not expose `cart.items` as a mutable array.
* **[STRICT]** Constructors/factories must establish a valid invariant-complete instance; must never publish partially initialized objects. If initialization can fail, use a factory returning a typed error/result or throwing a domain-specific exception.
  * **Example:** `Order.create(dto)` validates totals and line items before producing an `Order`.
* **[STRICT]** Implementations must adhere to substitutability for interfaces/base types: must not strengthen preconditions or weaken postconditions relative to the contract; if substitutability is unclear, split the interface.
  * **Example:** If one payment implementation cannot support refunds, it must not implement `RefundablePayment`.
* **[GUIDELINE]** Prefer cohesive interfaces that represent a single capability. Avoid god interfaces that mix unrelated concerns, but do not split interfaces that naturally belong together just because some consumers use a subset; fragmented interfaces harm discoverability.
  * **Example:** Keep `UserRepository` as one interface with read/write methods; split only if read-only access is a genuinely separate capability, such as a reporting module that must not write.
* **[GUIDELINE]** Prefer readonly/immutable fields for state that should not change after construction; expose necessary mutation only through narrow methods with clear preconditions/postconditions.
  * **Example:** `transitionTo(status)` enforces allowed status transitions.
