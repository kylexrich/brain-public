---
title: "Backend Code Quality Principles"
description: "app test placement, boring code, service structure, deduplication, and internal trust versus defensive branching."
order: 2
---

## Global Principles And Safety
* **[STRICT]** App automated tests are allowed only under `app/src/__tests__/`. Tests are not required for every change; when adding, moving, or modifying tests, follow `app/src/__tests__/AGENTS.md`.
* **[STRICT]** Write straightforward, boring code: avoid clever/obscure patterns, over-abstraction, or "magic" constructs when a clear, direct approach is available.
* **[GUIDELINE]** Design for maintainability through simplicity and clarity: modular, consistent with existing patterns. Avoid adding flexibility for hypothetical future requirements - build what's needed now.
* **[GUIDELINE]** Lint warnings are acceptable when they are reasonable; resolve lint errors.
* **[STRICT]** Prefer a Java-style service structure: group related behavior into discrete service classes with explicit responsibilities and cohesive method sets, even when the class is stateless. Favor class-based services over scattered helper functions or micro-utility files. **Stateless does not mean static** - prefer instantiated services with explicit dependency injection when needed, not static utility classes. See `app/.ai/guidance/module-and-feature-layout.md#modules-architecture-and-file-structure`.

## Deduplication And Shared Helpers
* **[STRICT]** Deduplication and reuse rules live in `app/.ai/guidance/reuse-refactoring-and-object-design.md#dry-reuse-dead-code-and-code-generation`.
* **[GUIDELINE]** Shared helper placement and anti-fragmentation rules live in `app/.ai/guidance/module-and-feature-layout.md#modules-architecture-and-file-structure`.

## Internal Trust And Defensive Coding
* **[STRICT]** Do not add defensive null/undefined checks or fallback branches for values that cannot be null/undefined at that point in the code. If upstream logic guarantees a value exists, trust it. If you're tempted to add a defensive check, first verify whether the scenario can actually occur; if it cannot, do not add the check.
  * **Example:** If `getAuthenticatedUser()` only succeeds after auth middleware, do not write `if (!user)` checks in every downstream function.
* **[STRICT]** Before adding null/undefined handling, verify the type is correctly defined. If a value is marked optional but no business scenario allows it to be absent, fix the type to be required and update callers; do not add defensive branches for impossible states.
  * **Example:** If `user.organizationId` is optional but every user must have an organization, change the type to required and fix the data model; do not scatter `if (user.organizationId)` checks.
* **[GUIDELINE]** If an invariant violation would otherwise fail later with a confusing error, prefer a fail-fast invariant assertion over defensive branching. Assertions must not introduce alternate behavior; they must surface a clear, actionable error message.
  * **Example:** `invariant(user.organizationId !== undefined, "Expected organizationId to be set by auth middleware");`
* **[STRICT]** Do not add error handling, fallbacks, or validation for scenarios that cannot occur given current system design. Code should reflect actual invariants, not theoretical edge cases the system prevents.
  * **Example:** If a function is only called after successful validation, do not re-validate the same constraints inside the function.
* **[GUIDELINE]** Validation intensity decreases inward from system boundaries. HTTP/queue handlers: validate all external input. Services: trust that controllers passed valid domain objects. Repositories: trust that services passed valid data. Internal helpers: trust callers entirely. Only add validation at internal layers when the function is reused across different trust boundaries.
  * **Example:** A controller validates `limit` is a positive integer; the service and repository do not re-check this.
