# Scope Rules

Defines what **drives** your changes based on review configuration.

**Critical distinction:** Scope does NOT limit which files within `client/` you can edit. You can edit any file in `client/`. Scope determines what **justifies** those edits.

> **REMINDER:** This skill is for `client/` only. Do not touch `app/`, `cdk/`, `common/`, or other directories.

---

## Two Dimensions

### 1. Scope — What drives the review

| User Request Contains...                              | Scope             |
|-------------------------------------------------------|-------------------|
| "uncommitted", "staged", "unstaged"                   | Uncommitted Only  |
| "my changes", "current changes"                       | Uncommitted Only  |
| Nothing about scope                                   | Full Client       |
| "full", "entire", "all", "everything"                 | Full Client       |

### 2. Focus — What area to emphasize

| User Request Contains...                              | Focus             |
|-------------------------------------------------------|-------------------|
| Specific feature, flow, area, or component            | Specific Focus    |
| Nothing specific                                      | General Review    |
| "everything", "general", "all rules"                  | General Review    |

---

## Four Modes

**What you cannot do GLOBAL:**
- Touch files outside `client/`
- Violate the UI contract (see `{.ai,.claude,.codex}/skills/frontend-review/UI-CONTRACT.md`)

### Mode A: Uncommitted + General

**Example requests:**
- "review my frontend changes"
- "check my uncommitted client code"
- "frontend review uncommitted"

**What drives the review:**
- All uncommitted changes (staged + unstaged) in `client/`

**What you can change:**
- **Any file in `client/`** as needed to:
  - Make uncommitted changes consistent with `client/AGENTS.md`
  - Fix breakages the uncommitted changes introduce
  - Refactor surrounding `client/` code to integrate uncommitted changes cleanly
  - Support or clean up the uncommitted changes

**What you cannot do:**
- Make changes that aren't attributable to the uncommitted changes
- "Opportunistic" fixes unrelated to the change footprint
- See **What you cannot do GLOBAL:**

---

### Mode B: Uncommitted + Specific Focus

**Example requests:**
- "review my uncommitted changes to the dashboard"
- "check my staged changes to auth"
- "review my changes in the settings flow"

**What drives the review:**
- Uncommitted changes in `client/`
- Emphasis on the specified area/flow/feature

**What you can change:**
- **Any file in `client/`** as needed (same as Mode A)
  - Make uncommitted changes consistent with `client/AGENTS.md`
  - Prioritize fixes related to the specified focus area
  - Still fix violations in other uncommitted changes, but focus area first

**What you cannot do:**
- Same as Mode A — changes must be driven by uncommitted code
- The focus area sets priority, doesn't expand what justifies changes
- See **What you cannot do GLOBAL:**

---

### Mode C: Full Client + General

**Example requests:**
- "frontend review"
- `$frontend-review` (`/frontend-review`)
- "review the entire client"
- "check the frontend for improvements"

**What drives the review:**
- Entire `client/` directory
- All `client/AGENTS.md` rules and focus areas

**What you can change:**
- **Any file in `client/`** as needed to:
  - Fix `client/AGENTS.md` violations anywhere in `client/`
  - Refactor related `client/` code to support fixes

**What you cannot do:**
- See **What you cannot do GLOBAL:**

---

### Mode D: Full Client + Specific Focus

**Example requests:**
- "review the frontend auth flow"
- "check the dashboard components"
- "review the settings feature"
- "look at the API integration patterns in client"

**What drives the review:**
- The specified area/flow/feature within `client/`
- Related `client/` code that the focus area depends on or integrates with

**What you can change:**
- **Any file in `client/`** as needed to:
  - Comprehensively fix the focus area to adhere to `client/AGENTS.md`
  - Fix related/surrounding `client/` code that the focus area touches
  - Light touch on obvious violations encountered elsewhere in `client/`

**What you cannot do:**
- Deep refactoring of unrelated areas (note for future review instead)
- See **What you cannot do GLOBAL:**

---

## The Core Principle

**You can edit any file in `client/`. The question is: what justifies the edit?**

| Mode | What Justifies Edits |
|------|---------------------|
| **A** Uncommitted + General | Must relate to uncommitted `client/` changes |
| **B** Uncommitted + Specific | Must relate to uncommitted `client/` changes (focus area prioritized) |
| **C** Full + General | Any `client/AGENTS.md` violation in `client/` |
| **D** Full + Specific | Focus area and its related/surrounding `client/` code |

---
