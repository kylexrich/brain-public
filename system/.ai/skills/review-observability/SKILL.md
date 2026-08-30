---
name: review-observability
description: "Review every user-specified code path or changed file for baseline operational observability and product analytics aligned with the repository's established practices. Use for observability, logging, metrics, tracing, error-reporting, Grafana, or PostHog reviews of a diff, commit, branch, pull request, file, directory, or implementation. This is read-only: do not use it to implement fixes or to demand exhaustive telemetry beyond useful baseline coverage."
---

# Review Observability

Review the full literal code scope and return only evidence-backed observability gaps. Keep the review read-only unless the user separately asks for fixes.

## Review contract

1. Resolve the exact repository, checkout, base, and code scope. Treat every user-named file, directory, diff, commit, branch, pull request, or code excerpt as required scope; do not silently sample it or mix in unrelated work.
2. Read every applicable `AGENTS.md` for the in-scope paths. Search the current repository for its canonical logging, metrics, tracing, error-reporting, and product-analytics helpers, registries, naming conventions, and operator surfaces. Prefer repeated current practice and explicit guidance over isolated legacy examples or generic advice.
3. Trace the meaningful execution paths: entry points, major branches, external calls, durable state changes, asynchronous boundaries, retries, timeouts, cancellation, and terminal outcomes. Review the reasonable instrumentation points on those paths, not every line or function.

## Baseline checks

Evaluate operational observability proportionally to the behavior and risk:

- Use the shared structured logger and established context or correlation mechanism. Check levels, actionable context, redaction, and ownership; avoid raw payloads, secrets, customer content, noisy success logs, and duplicate reporting.
- Use canonical metric, tracing, and centralized error-reporting utilities when the repository has them. Check decision-useful success, failure, latency, state-transition, retry, queue, or resource signals where they materially help operators understand the behavior.
- Emit signals at authoritative boundaries with stable names and bounded-cardinality attributes. Do not put unbounded identifiers or text into metrics, double-count outcomes across layers, or hide terminal failures behind retries or best-effort work.
- Fit new operational signals into the repository's existing Grafana dashboards, alerts, or equivalent operator surface when established practice requires it. Do not demand a new dashboard or alert for every change.

Evaluate product analytics only when the code changes user-facing behavior or a measurable product outcome and the repository has an analytics practice:

- Use the typed event registry and established capture helper, including PostHog where that is the canonical provider. Keep analytics non-blocking so it cannot gate or fail product behavior.
- Capture meaningful intent, confirmed outcome, consumption, or follow-up facts at their authoritative client or server boundary. Prefer enough coverage to measure the relevant user loop over instrumenting every interaction.
- Preserve stable correlation identifiers and bounded semantic properties. Never capture credentials, customer content, raw URLs, payloads, command values, or unbounded collections.
- Keep product analytics distinct from operational telemetry; neither substitutes for the other.

Baseline coverage is sufficient when the existing team could reasonably determine what happened, where and why it failed, how often or how slowly it occurs, and whether the meaningful user outcome happened, without adding telemetry that has no clear debugging or product decision use.

## Findings

Report only gaps or misuse demonstrated by the in-scope code and verified against repository evidence. Do not request maximal instrumentation, speculative events, cosmetic log changes, or broad observability refactors.

For every finding:

- Order it by severity and cite the specific `path:line`.
- Name the uncovered or incorrectly instrumented execution path.
- Explain the concrete debugging, reliability, or product-measurement failure.
- Point to the repository's established helper or pattern and suggest the smallest appropriate correction.

State any scope or evidence limitation explicitly. If the baseline is sound, say `Observability review: no findings.` plainly.
