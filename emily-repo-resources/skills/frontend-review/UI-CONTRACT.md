# UI/UX Stability Contract

This contract constrains **what the skill does** when making fixes—not what it flags in user's uncommitted changes. If the user changed the UI, that was intentional.

**Core principle:** When this skill makes changes, improve UX according to `client/AGENTS.md`, but don't radically redesign the UI. Users should be delighted with a refined experience, not notice significant foundational changes.

---

## Explicitly Allowed (AGENTS.md-Driven Improvements)

Any changes are **encouraged** when they align with `client/AGENTS.md` such as (but not limited to) things like:
- Color & Styling Standardization
- Motion & Animation
- Data Flow & Loading States
- Layout Polish
- State & Performance
- etc.

## Not Allowed (Radical Changes)

These changes go beyond improvement into redesign territory:

### Content & Copy

- Changing labels, headings, button text (except fixing clear typos)
- Rewriting help text or descriptions
- Renaming features or concepts in the UI
- Changing any page text

**⚠️ CRITICAL: File Reorganization**
- When deleting, moving, or reorganizing files, **all existing text content must be preserved exactly**. 
- Reorganization is about code structure, not content editing.
- If you're moving a component, the strings it renders must remain identical. 
- If you're consolidating files, copy text verbatim. 
- Never use reorganization as an opportunity to "clean up" or "improve" copy.

**Exception:** Improving error messages or empty states when clearly broken/unhelpful.

### Feature Set

- Adding new features, screens, or capabilities
- Removing existing features or controls
- Adding new flows or multi-step processes

### Structural Redesign

- Reorganizing the information architecture
- Moving major UI elements to different locations
- Changing the navigation model
- Restructuring forms or wizards
- Changing how users accomplish core tasks

---

## The Core Test

> Would a user say "this looks completely different" or "where did everything go"?

**If yes → Too radical, don't do it.**

> Would a user say "this feels more polished" or "the loading is smoother" or not notice at all?

**If yes → Good improvement, allowed.**

---

## When In Doubt

Ask: **"Is this improving existing UX according to AGENTS.md, or am I redesigning the product?"**

- Improving → Allowed
- Redesigning → Not allowed

The goal is a **more polished, consistent, performant version of the same product**—not a different product.
