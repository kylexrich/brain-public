# Scope Rules

Defines what **drives** your changes based on review configuration.

**Critical distinction:** Scope does NOT limit which files within `app/` you can edit. You can edit any file in `app/`. Scope determines what **justifies** those edits.

> **REMINDER:** This skill is for `app/` only. Do not touch `client/`, `cdk/`, `common/`, or other directories.

---

## Two Dimensions

### 1. Scope — What drives the review

| User Request Contains...                              | Scope             |
|-------------------------------------------------------|-------------------|
| "uncommitted", "staged", "unstaged"                   | Uncommitted Only  |
| "my changes", "current changes"                       | Uncommitted Only  |
| Nothing about scope                                   | Full App          |
| "full", "entire", "all", "everything"                 | Full App          |

### 2. Focus — What area to emphasize

| User Request Contains...                              | Focus             |
|-------------------------------------------------------|-------------------|
| Specific feature, flow, area, or service              | Specific Focus    |
| Nothing specific                                      | General Review    |
| "everything", "general", "all rules"                  | General Review    |

---

## Four Modes

**What you cannot do GLOBAL:**
- Touch files outside `app/`
- Violate the API contract (see `{.ai,.claude,.codex}/skills/backend-review/API-CONTRACT.md`)

### Mode A: Uncommitted + General

**Example requests:**
- "review my backend changes"
- "check my uncommitted api code"
- "backend review uncommitted"

**What drives the review:**
- All uncommitted changes (staged + unstaged) in `app/`

**What you can change:**
- **Any file in `app/`** as needed to:
  - Make uncommitted changes consistent with `app/AGENTS.md`
  - Fix breakages the uncommitted changes introduce
  - Refactor surrounding `app/` code to integrate uncommitted changes cleanly
  - Support or clean up the uncommitted changes

**What you cannot do:**
- Make changes that aren't attributable to the uncommitted changes
- "Opportunistic" fixes unrelated to the change footprint
- See **What you cannot do GLOBAL:**

---

### Mode B: Uncommitted + Specific Focus

**Example requests:**
- "review my uncommitted changes to the user service"
- "check my staged changes to auth"
- "review my changes in the billing flow"

**What drives the review:**
- Uncommitted changes in `app/`
- Emphasis on the specified area/flow/feature

**What you can change:**
- **Any file in `app/`** as needed (same as Mode A)
  - Make uncommitted changes consistent with `app/AGENTS.md`
  - Prioritize fixes related to the specified focus area
  - Still fix violations in other uncommitted changes, but focus area first

**What you cannot do:**
- Same as Mode A — changes must be driven by uncommitted code
- The focus area sets priority, doesn't expand what justifies changes
- See **What you cannot do GLOBAL:**

---

### Mode C: Full App + General

**Example requests:**
- "backend review"
- `$backend-review` (`/backend-review`)
- "review the entire api"
- "check the backend for improvements"

**What drives the review:**
- Entire `app/` directory
- All `app/AGENTS.md` rules and focus areas

**What you can change:**
- **Any file in `app/`** as needed to:
  - Fix `app/AGENTS.md` violations anywhere in `app/`
  - Refactor related `app/` code to support fixes

**What you cannot do:**
- See **What you cannot do GLOBAL:**

---

### Mode D: Full App + Specific Focus

**Example requests:**
- "review the backend auth flow"
- "check the user service"
- "review the billing feature"
- "look at the repository patterns in app"

**What drives the review:**
- The specified area/flow/feature within `app/`
- Related `app/` code that the focus area depends on or integrates with

**What you can change:**
- **Any file in `app/`** as needed to:
  - Comprehensively fix the focus area to adhere to `app/AGENTS.md`
  - Fix related/surrounding `app/` code that the focus area touches
  - Light touch on obvious violations encountered elsewhere in `app/`

**What you cannot do:**
- Deep refactoring of unrelated areas (note for future review instead)
- See **What you cannot do GLOBAL:**


---

## The Core Principle

**You can edit any file in `app/`. The question is: what justifies the edit?**

| Mode | What Justifies Edits |
|------|---------------------|
| **A** Uncommitted + General | Must relate to uncommitted `app/` changes |
| **B** Uncommitted + Specific | Must relate to uncommitted `app/` changes (focus area prioritized) |
| **C** Full + General | Any `app/AGENTS.md` violation in `app/` |
| **D** Full + Specific | Focus area and its related/surrounding `app/` code |

---
