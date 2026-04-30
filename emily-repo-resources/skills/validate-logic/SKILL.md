---
name: validate-logic
description: Deep logic validation and correctness audit for a specific feature or flow. Use when the user asks to validate logic, exhaustively enumerate paths/edge cases, compare behavior to success criteria, verify alignment with system design, or check best practices and external documentation for a focused flow.
---

# Validate Logic

## Overview

Perform an exhaustive, evidence-backed correctness audit of a single logical flow, including edge cases, failure modes, invariants, and external best practices. Deliver a clear verdict on whether the flow behaves as intended, where it diverges, and what must change.

## Guardrails

- Use the $code-logic-summary (`/code-logic-summary`) skill when the user only wants a walkthrough and not a correctness verdict.
- Use the $backend-review (`/backend-review`), $frontend-review (`/frontend-review`), or $e2e-review (`/e2e-review`) skill when the request is a general review rather than a focused flow validation.
- Use the $task-planning (`/task-planning`) skill when the validation scope is too large to complete in one session.
- Do not ask follow-up questions; proceed with best-effort inference and document unknowns.

## Workflow (exhaustive validation)

1. **Infer scope and success criteria.** Do not ask follow-up questions. Derive likely entry points, inputs, outputs, and success/failure expectations from the prompt and codebase context, and proceed with best judgment.
2. **Map entry points and boundaries.** Identify every code path that can start the flow (API routes, UI actions, jobs, webhooks, schedulers) and every external boundary (DB, queues, third-party APIs).
3. **Build a behavior model.** Convert the flow into a decision tree or state machine: list states, transitions, guards, and side effects. Record all assumptions explicitly.
4. **Enumerate every path.** Walk the model path-by-path (happy, alternate, error, retry, timeout, partial success, idempotent replays). Track where each path is implemented in code.
5. **Validate invariants and data integrity.** Check preconditions, postconditions, idempotency, ordering, concurrency, consistency, and rollback behavior.
6. **Cross-check system alignment.** Compare the flow to adjacent modules and existing patterns in the codebase. Flag inconsistencies in naming, data ownership, and responsibility boundaries.
7. **Verify against external docs and best practices.** Use official docs or primary sources for any external system behavior (SDKs, APIs, protocols, standards). Prefer `web.run` for up-to-date sources.
8. **Evaluate correctness.** Judge whether the observed behavior satisfies success criteria, aligns with real-world expectations, and makes sense for the product’s intended use.
9. **Produce actionable findings.** List defects, risks, and missing cases with severity and evidence. Provide fixes or test additions only when grounded in code.

## Evidence Rules (non-negotiable)

- Tie every claim to a concrete file path and symbol name.
- Use repo-root paths in backticks (for example: `app/src/` or `common/openapi.yaml`).
- Mark any unverifiable or configuration-dependent behavior as unknown, but continue the analysis without asking for clarification.

## Edge Case Checklist (use as prompts, not a script)

- **Inputs:** null/empty, unexpected types, boundary values, malformed payloads
- **State:** missing records, stale data, partially written state, concurrent updates
- **Timing:** retries, timeouts, race conditions, ordering guarantees, duplicate events
- **External:** API failures, rate limits, network errors, auth expiration, partial responses
- **Idempotency:** repeated requests, replayed events, de-dupe keys
- **Security:** authorization gaps, data leaks, privilege escalation, trust boundaries
- **Observability:** logs, metrics, traces, alerts for each failure class

## Output Template

Use this structure and keep it crisp.

```
Scope & Success Criteria
- What is being validated and the explicit or inferred criteria used

Behavior Model
- Decision tree or state machine summary (states, transitions, guards)

Path Inventory
1. Happy path: entry → decisions → side effects → output
2. Alternate path: ...
3. Error path: ...

Invariant & Integrity Checks
- Preconditions and postconditions with pass/fail
- Idempotency and concurrency assessment

External Docs & Best Practices
- Source list and what each source confirms or contradicts

Correctness Verdict
- Does the flow meet criteria? (Yes/No/Partial)
- Alignment with codebase and real-world expectations

Findings (ordered by severity)
- Issue: evidence → impact → fix direction

Unknowns / Follow-ups
- Missing info or runtime configuration needed to decide
```

## Quality Checklist

- All entry points discovered
- Every logical branch enumerated
- External behavior verified against primary sources
- Verdict and findings grounded in evidence
- Unknowns explicitly called out
