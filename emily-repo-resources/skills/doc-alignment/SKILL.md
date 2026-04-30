---
name: doc-alignment
description: Verify docs/ matches implementation. Auto-fix in-scope contradictions, flag out-of-scope ones.
allowed-tools: Bash, Read, Glob, Grep, Edit
---

# Doc Alignment Skill

Ensure `docs/` accurately reflects the actual implementation—no contradictions.

Documentation that contradicts reality is worse than no documentation.

## What `docs/` Is For

The `docs/` directory contains **product-level documentation**—high-level flows, business logic, system interactions, and domain context. Not code documentation.

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

### 2. Find Related Docs

Search `docs/` for documentation related to the identified features/flows.

```bash
# Example: search for relevant docs
grep -r "feature-name" docs/
```

### 3. Compare Against Implementation

For each relevant doc, verify it accurately describes what the code does. Note: **ALL** docs are for high-level flows, business logic, and domain context. Not low level code documentation. Especially not listing out incremental code features (e.g. can mention integrations generally, but not each individual one. Same for modules. Etc.). **WE DO NOT WANT TO BE FORCED TO UPDATE THE DOCS FOR EVERY SMALL CODE CHANGE**.

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
maintain them or update them to be accurate, unless the user asks you to fully adhere to the "What `docs/` Is For" section)
- When adding new content, stay high-level—describe *what* and *why*, and *how* at a high level logic level, not a at a code level
- Low-level implementation details go stale quickly and create maintenance burden
- Think: "Would this still be accurate after a refactor that doesn't change behavior?"

---

## Output

Summarize:
- Docs checked
- In-scope contradictions resolved
- Out-of-scope contradictions flagged (if any)
