---
name: doc-alignment
description: Verify current markdown documentation and AI guidance match implementation. Auto-fix in-scope contradictions, flag out-of-scope ones.
allowed-tools: Bash, Read, Glob, Grep, Edit
---

# Doc Alignment Skill

Ensure current markdown documentation and AI guidance accurately reflect the actual implementation, product behavior, and agent routing model.

Documentation that contradicts reality is worse than no documentation.

## What Current Markdown Is For

Current markdown includes `docs/`, `AGENTS.md`, scoped `.ai/guidance/`, and source skill files in `.ai/skills/` when the task changes agent process or rules. It should describe durable flows, business logic, system interactions, operating procedures, domain context, and agent navigation/rule routing. It is not line-by-line code documentation.

Common markdown areas:

| Area | Purpose |
|------|---------|
| `docs/product/` | Product behavior, user flows, business rules, and domain context |
| `docs/architecture/` | System topology, technical architecture, and implementation-level design references |
| `docs/sop/` | Standard operating procedures and operational playbooks |
| `docs/rollout/` | Rollout plans and operator evidence; historical unless the active rollout artifact is explicitly in scope |
| `docs/tasks/` | Task planning and execution artifacts; historical unless the active task artifact is explicitly in scope |
| `docs/reference/` | Stable reference documents and generated inventories |
| `docs/research/` | Research notes and decision evidence |
| `docs/marketing/` | Marketing and positioning context |
| `AGENTS.md` files | Agent routing maps, package authority pointers, scoped rule entrypoints, and generated guidance-map footers |
| `.ai/guidance/` | Detailed AI guidance referenced by `AGENTS.md` generated footers; files must be flat and include `description` front matter |
| `.ai/skills/` | Source skill instructions; update only when the task changes agent workflows or skill behavior |

Generated outputs include `AGENTS.md` guidance-map footers, `CLAUDE.md`, `GEMINI.md`, `.claude/skills/`, and `.codex/skills/`. Update source guidance files, source `AGENTS.md` body content, or source `.ai/skills/`, then run the relevant sync script instead of editing generated output directly.

## Trigger Phrases

- "doc alignment" or `$doc-alignment` (`/doc-alignment`)
- "check docs"
- "verify documentation"

---

## Scope

Determine scope from context or user input:

| Input | Scope |
|-------|-------|
| "uncommitted", "my changes", or default | Uncommitted changes |
| Specific area, feature, or flow mentioned | Specific focus area |

By default, check all current markdown that can affect product understanding, operations, architecture, or agent behavior. Exclude `docs/tasks/`, `docs/rollout/`, and `.ai/old-agents-references/` from current-product alignment because those are historical execution/operator/reference artifacts unless the user explicitly asks to validate or edit them, or the active task/rollout artifact itself is in scope.

---

## Workflow

### 1. Identify What to Check

**Uncommitted scope:**

```bash
git status
git diff --staged
git diff
```

Determine which features/flows are affected by the changes.

**Specific focus scope:**

Identify the relevant features/flows based on user's request.

### 2. Find Related Markdown

Search current source-of-truth markdown related to the identified features/flows. Include `docs/`, relevant `AGENTS.md` files, scoped `.ai/guidance/`, and source `.ai/skills/` when the task changes agent workflows. Exclude `docs/tasks/`, `docs/rollout/`, and `.ai/old-agents-references/` unless they are explicitly in scope.

```bash
# Example: search current markdown, excluding historical task/rollout artifacts
rg --hidden "feature-name" --glob '*.md' --glob '!docs/tasks/**' --glob '!docs/rollout/**' --glob '!.ai/old-agents-references/**'
```

When adding or moving guidance docs, keep the scoped `.ai/guidance/` directory flat, add or update `description` front matter in each guidance file, run `npm run script:agents:sync`, and verify each new current guidance document appears in the relevant generated `## Guidance Map (DO NOT EDIT)` footer.

### 3. Compare Against Implementation

For each relevant markdown document, verify it accurately describes what the code does and how agents should find the governing rules. Current source-of-truth docs should stay at the durable behavior/operations/design level. Avoid forcing documentation churn for small code changes that do not change user-visible behavior, operational process, architecture, agent routing, or documented domain rules.

### 4. Categorize Contradictions

| Type | Definition |
|------|------------|
| **In-scope** | Directly related to the code being reviewed (you touched this, or it's your focus area) |
| **Out-of-scope** | Unrelated; discovered incidentally |

### 5. Handle Contradictions

**In-scope (auto-resolve):**

Only auto-fix when you have **high confidence** the change is correct.

| Situation | Action |
|-----------|--------|
| Doc is **completely outdated** | Remove inaccurate content |
| Doc describes **future/planned behavior** not yet built | Add marker: `> **Note:** Not yet implemented. Describes planned behavior.` |
| Doc is **partially accurate** with incorrect details | Update to match reality |
| Implementation **changed** from what doc describes | Update doc to reflect current behavior |

**Out-of-scope (flag to user):**

Do **NOT** auto-resolve. Present the contradiction:

```
Documentation contradiction found (outside current scope):

File: docs/path/to/file.md
Issue: [describe the contradiction]

Options:
1. Fix now
2. Defer
3. Investigate further
```

Wait for user guidance.

**When updating docs:**
- Preserve existing detail levels (if a doc already has implementation specifics,
maintain them or update them to be accurate, unless the user asks you to fully adhere to the "What Current Markdown Is For" section)
- Update description front matter in guidance files under `.ai/guidance/` and run `npm run script:agents:sync` whenever new, moved, or split guidance documents need to be discoverable by agents; do not hand-edit generated `## Guidance Map (DO NOT EDIT)` footers
- Keep `.ai/guidance/` docs and source `.ai/skills/` in lockstep with any changed agent workflow or rule behavior
- When adding new content, stay high-level—describe *what* and *why*, and *how* at a high-level logic level, not at code level
- Low-level implementation details go stale quickly and create maintenance burden
- Think: "Would this still be accurate after a refactor that doesn't change behavior?"

---

## Output

Summarize:
- Docs checked
- In-scope contradictions resolved
- Out-of-scope contradictions flagged (if any)
