---
name: simple-code-review
description: "Review a repository change against every applicable AGENTS.md and a high-signal correctness and maintainability bar, returning only concrete line-specific findings. Use for local working-tree, staged, commit, or branch diffs; review-only passes on completed implementations; or whenever the user asks for a simple code review. Prefer $pr-review when a GitHub pull request needs PR-specific context or review comments. Do not use to implement fixes or for generic architecture advice without a concrete change to review."
---

# Simple Code Review

Review the exact change in scope. Keep the review read-only unless the user separately asks for fixes.

## Review contract

1. Resolve the literal repository, checkout, base, and diff under review. Separate the target change from unrelated pre-existing work.
2. For each changed path, read every applicable `AGENTS.md`, from the repository root through the nearest file governing that path. Treat the complete instruction chain as the review contract and report concrete violations, not generic preferences.
3. Read enough surrounding code to verify each candidate finding against actual callers, contracts, invariants, and failure handling. Try to disprove a concern before reporting it.
4. Prioritize correctness, data integrity, security, operational reliability, and meaningful maintainability risks.

Also evaluate whether the change will remain understandable and safe to modify as the system grows:

- Prefer boundaries that correspond to concepts a person can readily understand.
- Give each concept clear ownership.
- Keep related behavior cohesive rather than fragmented across arbitrary layers or many tiny files.
- Make dependencies, contracts, side effects, and failure behavior explicit.
- Compose simple pieces into larger behavior.
- Introduce abstractions only when a genuine, stable boundary exists.
- Optimize for traceability, maintainability, and safe change, not cleverness, superficial reuse, or minimum line count.

Report only findings evidenced by the diff and verified in the surrounding code. Do not report speculative concerns, cosmetic preferences, or broad refactoring ideas.

For every finding:

- Cite the specific file and changed line or lines.
- Explain the concrete failure mode or future change made unsafe.
- Suggest the smallest appropriate correction.

Order findings by severity. If context was unavailable for part of the review, state the limit explicitly. If the change is sound, say `Review: no findings.` plainly.
