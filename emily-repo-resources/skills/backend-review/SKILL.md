---
name: backend-review
description: "BACKEND/API ONLY. Review and refactor /app code against app/AGENTS.md. Only use when user explicitly mentions 'backend' or 'api' or 'server'. For frontend use frontend-review; for full-stack use e2e-review."
allowed-tools: Bash, Read, Glob, Grep, Edit, Write
---

# Backend Review Skill

> **SCOPE: BACKEND / API ONLY**
>
> This skill applies **exclusively** to the `app/` directory and backend code.
>
> **Direct activation requires user to mention:**
> - "backend", "back-end", "back end"
> - "api", "server", "server code", "server-side"
> - Specific backend areas (e.g., "user service", "Express", "Prisma", "repository")
>
> **Do NOT directly activate for:**
> - General "review" requests without backend/api qualifier
> - Frontend/client reviews → use `frontend-review`
> - Full-stack/end-to-end reviews → use `e2e-review`
>
> **Delegation from other skills is allowed.** Other skills (e.g., `e2e-review`) may reference or delegate to this skill as part of their workflow. When delegated to, this skill executes normally.

Review and refactor backend code to fully align with `app/AGENTS.md`.

## Trigger Phrases

**Direct user triggers (must include "backend" or "api" qualifier):**

- "backend review" or `$backend-review` (`/backend-review`)
- "review the backend"
- "review the api code"
- "review my backend changes"
- "check the server"
- "backend review [area]" (e.g., "backend review user service", "backend review auth flow")

**NOT direct triggers (but may be delegated from other skills):**

- "review" (too general → may come via `e2e-review`)
- "review my changes" (ambiguous → may come via `e2e-review`)
- "review the code" (ambiguous → may come via `e2e-review`)

---

## Workflow

### Phase 1: Determine Review Configuration

Two dimensions to identify:

**1. Scope — What drives the review:**

| User mentions...                                      | Scope             |
|-------------------------------------------------------|-------------------|
| "uncommitted", "staged", "unstaged", "my changes"     | Uncommitted Only  |
| Nothing about scope, or "full", "entire", "all"       | Full App          |

**2. Focus — What to look for:**

| User mentions...                                      | Focus             |
|-------------------------------------------------------|-------------------|
| Specific area, flow, feature, or service              | Specific Focus    |
| Nothing specific, or "everything", "general"          | General Review    |

This creates four effective modes:

| Mode | Scope | Focus | Example Request                               |
|------|-------|-------|-----------------------------------------------|
| **A** | Uncommitted | General | "review my backend changes"                  |
| **B** | Uncommitted | Specific | "review uncommitted changes to the user service" |
| **C** | Full App | General | "backend review"                             |
| **D** | Full App | Specific | "review the backend auth flow"               |

Reference: `{.ai,.claude,.codex}/skills/backend-review/SCOPE-RULES.md` for detailed mode definitions.

---

### Phase 2: Read Canonical Rules

**Required reading before any review:**

```
app/AGENTS.md
```

This is the **single source of truth** for backend rules. Every rule type (`[STRICT]` and `[GUIDELINE]`) applies. The focus area (if specified) determines **emphasis**, not exclusion of other rules.

---

### Phase 3: Gather Context

**For Uncommitted scope:**

```bash
git status
git diff --staged
git diff
```

**For Full App scope:**

```bash
# Overview of structure
find app/src/api -type f -name "*.ts" | head -50
find app/src/repositories -type f -name "*.ts" | head -30
find app/src/services -type f -name "*.ts" | head -30
```

**For Specific focus:**

Identify the relevant directories, files, and flows based on user's mentioned area:
- Feature name → `app/src/api/<feature>/`
- Service name → Search for it
- Flow name → Trace the flow through router, controller, service, repository

---

### Phase 4: Systematic Review

**General focus** — Review all dimensions:
1. Architecture & Layout (feature folders `src/api/<feature>`, contracts.ts, router registration, 200-500 lines/file)
2. Separation of Concerns (router → validator → controller → service → repository → assembler)
3. Transport Boundaries (HTTP/auth at edges, DTOs, endpoint shapes, `/me` routes delegate only)
4. Data Access (Prisma in repositories only, transactions in services, bulk fetching, includes)
5. Functions (single responsibility, 0-3 params, guard clauses, 20-50 lines target, 100+ is code smell)
6. State & Side Effects (local/immutable, explicit naming like `persistX`, idempotency)
7. Errors (typed errors, actionable context, translate at boundaries, no catch-and-swallow)
8. Logging (structured with stable keys, ≤140 chars per line, redact secrets/PII)
9. Performance (N+1 queries banned, unbounded loops banned, bounded fan-out, explicit timeouts)
10. Code Quality (DRY, dead code removal, naming, formatting, no 1-3 char identifiers)
11. Types & Contracts (canonical types, no `any`/casts, `enum` for fixed sets, OpenAPI alignment)
12. Dependencies (tsyringe injection, `emly-common` types, check package.json first)

**Specific focus** — Prioritize the user's area but don't ignore violations elsewhere in touched code:
- If reviewing "auth flow" → Deep dive auth, but still fix obvious violations in related code
- If reviewing "user service" → Focus on user components, but apply all `app/AGENTS.md` rules

---

### Phase 5: Apply Scope Rules

**Critical:** Scope controls what **justifies** changes, not which files within `app/` you can edit.

You can edit **any file in `app/`**. The question is: what drives/justifies those edits?

> **BOUNDARY:** This skill only touches `app/`. Do not modify `client/`, `cdk/`, `common/`, or other directories.

> **API CONTRACT:** This skill should not break the API contract. See `{.ai,.claude,.codex}/skills/backend-review/API-CONTRACT.md` for what's allowed.

Reference: `{.ai,.claude,.codex}/skills/backend-review/SCOPE-RULES.md` for detailed justification rules per mode.

- **Uncommitted scope:** Every change must be attributable to the uncommitted `app/` changes (but you can touch any `app/` file needed to make them correct, compliant, or cleanly integrated)
- **Full App scope:** Any `app/AGENTS.md` violation justifies changes (including in related/surrounding `app/` code)
- **Specific focus:** Deep on that area + its related/surrounding `app/` code, light touch elsewhere

---

### Phase 6: Identify and Explain Issues

Before implementing any fixes:

1. **Identify all issues** — Violations, inconsistencies, and improvement opportunities
2. **Explain each issue** — What rule it violates, why it matters, what the fix looks like
3. **Prioritize by severity** — `[STRICT]` and structural/large violations first, then `[GUIDELINE]` and small/localized deviations

Present findings to get alignment before making changes.

---

### Phase 7: Implement Fixes

After identifying issues, refactor and improve the code to fully align with `app/AGENTS.md`:

1. **Respect focus** — If specific area requested, prioritize it
2. **Make changes deliberately** — One concern at a time, verify each fix
3. **Avoid over-engineering** — Don't over-complicate things

Do not introduce tests or new tooling.

---

### Phase 8: Verify Compliance

After changes, follow the `$ci` (`/ci`) skill.

Re-read `app/AGENTS.md` and verify all touched code now complies.

---

## Important Rules

1. **Identify both dimensions** — Scope (uncommitted vs full) AND focus (general vs specific)
2. **Always read `app/AGENTS.md` first** — Canonical source of truth
3. **Scope justifies, not restricts** — You can edit any `app/` file; scope determines what justifies those edits
4. **Specific focus ≠ tunnel vision** — Fix violations in related/surrounding code, not just the focus folder
5. **Respect the API contract** — Don't break what the frontend depends on (see `{.ai,.claude,.codex}/skills/backend-review/API-CONTRACT.md`)
6. **Follow the `$ci` (`/ci`) skill after changes**

---

## Output

When complete, summarize:
- Review configuration (scope + focus)
- Areas reviewed
- Key violations found and fixed
- Any concerns or recommendations for future work
