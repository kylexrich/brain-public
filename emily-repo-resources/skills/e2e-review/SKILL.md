---
name: e2e-review
description: "End-to-end correctness review. Validates that core logic is fundamentally correct across CDK, app, common/OpenAPI, and client. Use for general end to end 'review' requests, cross-cutting reviews, or when verifying full-stack flows."
allowed-tools: Bash, Read, Glob, Grep, Edit, Write
---

# End-to-End Review Skill

Validate that core logic is fundamentally correct across the entire stack.

## When to Use

This skill activates for:

- "review end to end" (general, no qualifier)
- "review my changes flow"
- "e2e review" or "end-to-end review"
- "full-stack review"
- Cross-cutting review concerns spanning multiple packages

For single-package reviews:
- Backend only → use `backend-review`
- Frontend only → use `frontend-review`

---

## Scope Determination

**Two scope modes:**

| User mentions...                                  | Scope                |
|---------------------------------------------------|----------------------|
| "uncommitted", "staged", "unstaged", "my changes" | Uncommitted Changes  |
| Specific area, feature, or flow                   | Specific Focus Area  |

If neither is mentioned, default to **Uncommitted Changes**.

---

## Core Objective

**Validate that the logic is fundamentally correct end-to-end.**

This means verifying that:

1. **Data flows correctly** from client → backend → client
2. **Contracts align** at every boundary (OpenAPI ↔ backend ↔ frontend)
3. **CDK infrastructure** matches what the application expects
4. **State transitions** make sense and are observable
5. **Errors propagate** in a controlled, predictable way
6. **The full sequence works** when traced end-to-end

Think like a senior engineer asking: "Does this actually work? Do the pieces fit together? Is it simple and easy to understand?"

---

## Packages in Scope

| Package    | What to Check                                              |
|------------|------------------------------------------------------------|
| `cdk/`     | Infrastructure matches app requirements (env vars, permissions, resources) |
| `app/`     | Backend logic, API endpoints, services, data access        |
| `common/`  | OpenAPI spec accuracy, type generation, contract alignment |
| `client/`  | Frontend logic, API consumption, state management          |

---

## Workflow

### Phase 1: Gather Scope

**For Uncommitted Changes:**

```bash
git status
git diff --staged
git diff
```

Identify which packages have changes and focus there.

**For Specific Focus Area:**

Identify the relevant files/flows based on what the user asked about.

---

### Phase 2: End-to-End Correctness Check

For each flow or feature in scope:

1. **Trace the data path** — Follow data from user action through client, API, backend logic, data layer, and back
2. **Verify contract alignment** — Check that OpenAPI spec, backend handlers, and client consumers agree on shapes
3. **Check CDK alignment** — Ensure infrastructure (env vars, IAM, resources) supports what the app needs
4. **Identify logic gaps** — Look for missing error handling, incorrect assumptions, broken flows

**Key questions:**

- Does the client call the right endpoint with the right shape?
- Does the backend validate, process, and respond correctly?
- Does the OpenAPI spec match the actual implementation?
- Does CDK provision what the app needs?
- Do error cases propagate correctly?

---

### Phase 3: Fix Critical Issues

If you find logic that is **fundamentally incorrect** or violates the root `AGENTS.md`:

Fix it to make the flow correct and abide by the top level `AGENTS.md`.

The goal is "does it work? is it simple?"

---

### Phase 4: Delegate Detailed Reviews !IMPORTANT - THIS IS PART OF YOUR JOB!

After validating end-to-end and root `AGENTS.md` correctness, delegate detailed compliance reviews:

**For backend code related to scope:**
> "Now run the `$backend-review` (`/backend-review`) skill on the `app/` code related to scope to ensure full `app/AGENTS.md` compliance."

**For frontend code related to scope:**
> "Now run the `$frontend-review` (`/frontend-review`) skill on the `client/` code related to scope to ensure full `client/AGENTS.md` compliance."

These skills handle the detailed rule-by-rule review against their respective `AGENTS.md` files.

Use the same scope as this review (uncommitted changes or specific focus area).

---

### Phase 5: Documentation Alignment — MANDATORY

Run the `$doc-alignment` (`/doc-alignment`) skill (or see `{.ai,.claude,.codex}/skills/doc-alignment/SKILL.md`) on the reviewed flows/features.

Use the same scope as this review (uncommitted changes or specific focus area).

---

### Phase 6: Verify

After all changes, follow the `$ci` (`/ci`) skill.

---

## Output

When complete, summarize:

1. End-to-end flows validated
2. Critical issues found and fixed (Phase 2/3/4)
3. Documentation alignment results (Phase 5)