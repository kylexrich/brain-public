---
name: frontend-review
description: "FRONTEND/CLIENT ONLY. Review and refactor /client code against client/AGENTS.md. Only use when user explicitly mentions 'frontend' or 'client'. For backend use backend-review; for full-stack use e2e-review."
allowed-tools: Bash, Read, Glob, Grep, Edit, Write
---

# Frontend Review Skill

> **SCOPE: FRONTEND / CLIENT ONLY**
>
> This skill applies **exclusively** to the `client/` directory and frontend code.
>
> **Direct activation requires user to mention:**
> - "frontend", "front-end", "front end"
> - "client", "client code", "client-side"
> - Specific frontend areas (e.g., "dashboard component", "React", "Next.js", "Tailwind")
>
> **Do NOT directly activate for:**
> - General "review" requests without frontend/client qualifier
> - Backend/API reviews → use `backend-review`
> - Full-stack/end-to-end reviews → use `e2e-review`
>
> **Delegation from other skills is allowed.** Other skills (e.g., `e2e-review`) may reference or delegate to this skill as part of their workflow. When delegated to, this skill executes normally.

Review and refactor frontend code to fully align with `client/AGENTS.md`.

## Trigger Phrases

**Direct user triggers (must include "frontend" or "client" qualifier):**

- "frontend review" or `$frontend-review` (`/frontend-review`)
- "review the client code"
- "frontend review [area]" (e.g., "frontend review dashboard", "frontend review auth flow")

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
| Nothing about scope, or "full", "entire", "all"       | Full Client       |

**2. Focus — What to look for:**

| User mentions...                                      | Focus             |
|-------------------------------------------------------|-------------------|
| Specific area, flow, feature, or component            | Specific Focus    |
| Nothing specific, or "everything", "general"          | General Review    |

This creates four effective modes:

| Mode | Scope | Focus | Example Request                               |
|------|-------|-------|-----------------------------------------------|
| **A** | Uncommitted | General | "review my frontend changes"                  |
| **B** | Uncommitted | Specific | "review uncommitted changes to the dashboard" |
| **C** | Full Client | General | "frontend review"                             |
| **D** | Full Client | Specific | "review the frontend auth flow"               |

Reference: `{.ai,.claude,.codex}/skills/frontend-review/SCOPE-RULES.md` for detailed mode definitions.

---

### Phase 2: Read Canonical Rules

**Required reading before any review:**

```
client/AGENTS.md
```

This is the **single source of truth** for frontend rules. Every rule type (`[STRICT]` and `[GUIDELINE]`) applies. The focus area (if specified) determines **emphasis**, not exclusion of other rules.

---

### Phase 3: Gather Context

**For Uncommitted scope:**

```bash
git status
git diff --staged
git diff
```

**For Full Client scope:**

```bash
# Overview of structure
find client/app -type f -name "*.tsx" | head -50
find client/components -type f -name "*.tsx" | head -30
find client/lib -type f -name "*.ts" | head -30
```

**For Specific focus:**

Identify the relevant directories, files, and flows based on user's mentioned area:
- Feature name → `client/app/<feature>/`
- Component name → Search for it
- Flow name → Trace the flow through components, hooks, API calls

---

### Phase 4: Systematic Review

**General focus** — Review all dimensions:
1. Architecture (feature-first, component boundaries, file structure)
2. State Management (TanStack Query vs Zustand vs local)
3. Patterns (Next.js 16 App Router, SC vs CC)
4. Styling (Tailwind tokens, design system, CVA variants)
5. Motion (Framer Motion variants, AnimatePresence, no transition conflicts)
6. Code Quality (dead code, duplication, naming, comments)
7. Data Flow (API helpers, errors, mutations, hydration, logging)
8. Performance (memoization, selectors, images, code splitting)
9. TypeScript (strict, no `as any`, lint errors)
10. Dependencies (Radix primitives, `emly-common` types, avoid low-ROI deps)

**Specific focus** — Prioritize the user's area but don't ignore violations elsewhere in touched code:
- If reviewing "auth flow" → Deep dive auth, but still fix obvious violations in related code
- If reviewing "dashboard" → Focus on dashboard components, but apply all `client/AGENTS.md` rules

---

### Phase 5: Apply Scope Rules

**Critical:** Scope controls what **justifies** changes, not which files within `client/` you can edit.

You can edit **any file in `client/`**. The question is: what drives/justifies those edits?

> **BOUNDARY:** This skill only touches `client/`. Do not modify `app/`, `cdk/`, `common/`, or other directories.

Reference: `{.ai,.claude,.codex}/skills/frontend-review/SCOPE-RULES.md` for detailed justification rules per mode.

---

### Phase 6: Identify and Explain Issues

Before implementing any fixes:

1. **Identify all issues** — Violations, inconsistencies, and improvement opportunities
2. **Explain each issue** — What rule it violates, why it matters, what the fix looks like
3. **Prioritize by severity** — `[STRICT]` and structural/large violations first, then `[GUIDELINE]` and small/localized deviations

Present findings to get alignment before making changes.

---

### Phase 7: Implement Fixes

After identifying issues, refactor and improve the code to fully align with `client/AGENTS.md`:

1. **Respect focus** — If specific area requested, prioritize it
2. **Make changes deliberately** — One concern at a time, verify each fix
3. **Avoid over-engineering** — Don't over-complicate things

Do not introduce tests or new tooling.

**Critical:** This skill should not radically change the UI. See `{.ai,.claude,.codex}/skills/frontend-review/UI-CONTRACT.md` for what's allowed.

---

### Phase 9: Verify Compliance

After changes, follow the `$ci` (`/ci`) skill.

Re-read `client/AGENTS.md` and verify all touched code now complies.

---

## Important Rules

1. **Identify both dimensions** — Scope (uncommitted vs full) AND focus (general vs specific)
2. **Always read `client/AGENTS.md` first** — Canonical source of truth
3. **Preserve the UI surface** — See `{.ai,.claude,.codex}/skills/frontend-review/UI-CONTRACT.md`
4. **Scope justifies, not restricts** — You can edit any `client/` file; scope determines what justifies those edits
5. **Specific focus ≠ tunnel vision** — Fix violations in related/surrounding code, not just the focus folder
6. **Follow the `$ci` (`/ci`) skill after changes**

---

## Output

When complete, summarize:
- Review configuration (scope + focus)
- Areas reviewed
- Key violations found and fixed
- Any concerns or recommendations for future work
