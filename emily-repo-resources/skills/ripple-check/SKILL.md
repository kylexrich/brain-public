---
name: ripple-check
description: Investigate the entire codebase to ensure changes ripple correctly across all references.
---

# Ripple Check Skill

Ensure requested changes are applied comprehensively across the entire codebase, not just in isolated locations.

## Trigger Phrases

- "ripple check" or `$ripple-check` (`/ripple-check`)
- "check everywhere"
- "find all references"

## Purpose

When making a change (renaming, refactoring, updating a pattern, etc.), take a **wide view** of the codebase to ensure:

1. **All references are found** — not just the obvious ones
2. **The change is applied consistently** — same pattern everywhere
3. **Nothing is missed** — generated files, configs, tests, docs, client, server, etc.

## Workflow

### 1. Understand the Change

Before searching, clearly identify:
- What is being changed (name, pattern, value, behavior)
- The "essence" of the change — what the user actually wants to achieve

### 2. Wide Search

Search broadly across the entire codebase:
- Use `Grep` with the relevant terms (old names, related patterns)
- Check all file types: `.ts`, `.tsx`, `.yaml`, `.json`, `.md`, `.prisma`, etc.
- Include directories that are often overlooked:
  - `common/` (OpenAPI specs, shared types)
  - `client/` (frontend references)
  - `app/` (backend references)
  - `cdk/` (infrastructure)
  - `docs/` (documentation)
  - Generated files that may need regeneration

### 3. Identify All Touchpoints

For each reference found, determine:
- Does this need to change?
- Is it a source file or generated file?
- Are there related references nearby?

### 4. Apply Consistently

Make changes to all identified locations, ensuring:
- Consistent naming/patterns across the codebase
- Generated files are flagged for regeneration (don't hand-edit)
- No orphaned references remain

### 5. Verify Completeness

After making changes, search again to confirm:
- Old references are gone (or intentionally preserved)
- New references are consistent
- No broken imports or type errors introduced
