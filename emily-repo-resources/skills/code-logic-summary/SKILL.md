---
name: code-logic-summary
description: Use when a user asks for a codebase walkthrough, technical English explanation, or "how does X work" answer where accuracy must be grounded in code. Not for refactors, reviews, or exhaustive audit reports; use review skills for those.
---

# Code Logic Summary

## Overview

Provide a concise, evidence-backed explanation of how the requested behavior works. The final answer must read like a plain-English technical explanation that could be read out loud, not like a code audit report.

## Workflow (evidence-first)

1. **Clarify scope before digging.** Ask for missing inputs: feature name, entry point, request/response shape, runtime (API, job, CLI, UI), and expected behavior. If scope is huge, propose a smaller slice first.
2. **Map entry points.** Identify the first code that receives the request (routes, handlers, UI actions, workers, schedulers, CLI, or tests). Keep this as working notes unless the user asks for file-level detail.
3. **Trace the primary flow end-to-end.** Follow the happy path from entry to outcome. Track data transformations, validations, persistence, external calls, and response shaping.
4. **Trace alternate and error paths.** Capture conditional branches, feature flags, config gates, retries, and error handling that materially change behavior.
5. **Build internal evidence.** For every claim, know the file path and symbol (function/class/method) that proves it, but do not dump an evidence map in the final answer unless the user explicitly asks.
6. **Report with strict grounding.** Summarize only what was verified in code. If something cannot be proven, say so briefly in prose.

## Grounding Rules (non-negotiable)

- **No inference beyond code.** Do not guess intent or behavior that is not explicitly implemented.
- **Every statement must be traceable.** If a statement cannot be tied to a file+symbol, it does not belong in the summary. The traceability can remain internal.
- **Investigate all relevant code paths.** Use search to find all handlers, callers, and config gates tied to the request; do not stop at the first match.
- **Call out uncertainty.** If a runtime dependency or environment variable changes behavior and you cannot verify its value, list it as unknown.

## Guardrails

- If the user requests a review/refactor or correctness audit, use the $backend-review (`/backend-review`), $frontend-review (`/frontend-review`), or $e2e-review (`/e2e-review`) skill instead.
- If the user requests a multi-step implementation plan, use the $task-planning (`/task-planning`) skill first.

## Output Style

Default to a direct plain-English explanation, not a rigid report. Write in short paragraphs, with numbered steps only when the user asks for a sequence or the flow would otherwise be hard to follow.

The final answer should:

- Explain the behavior in technical but conversational prose.
- Be readable aloud without sounding like a checklist.
- Prefer concepts and flow over file inventories.
- Include file references only when they materially clarify the explanation, and keep them to the minimum needed.
- Avoid sections named "Evidence Map", "External Interactions", "Key Data & State", or "Unknowns / Follow-ups" unless the user explicitly asks for that report format.
- Avoid long bullet lists of files, symbols, handlers, or branches.

Good answer shape:

```
At a high level, X works by...

The important thing is...

When Y happens, the code...

The main edge case is...
```

## Quality Checklist

- Relevant entry points investigated
- Primary flow traced end-to-end
- Material branches captured
- Internal evidence exists for every claim
- Final answer is plain-English, concise, and not a file inventory
