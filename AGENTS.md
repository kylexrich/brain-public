> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> This is the repo root `AGENTS.md`. All other `AGENTS.md` files inherit from this one. Most specific wins on conflict.
>
> **Chain:** `AGENTS.md` _(root — this file)_

---

# `/` Brain — Kyle's Second Brain

The repo root for Kyle's second brain. Contains the knowledge vault, a TypeScript CLI, deprecated OpenClaw runtime archive, and system configuration.

## Rule Types

* **[STRICT]** – non‑negotiable; violations must be fixed.
* **[GUIDELINE]** – default best practice or general instructions; only deviate with clear, documented reasons.
* If neither tag is present, treat the section or content as a **[GUIDELINE]**.

## Directory Structure

```
cli/               — Brain CLI (oclif TypeScript CLI — see cli/AGENTS.md)
deprecated/        — Deprecated runtime archives
  openclaw/        — Legacy OpenClaw runtime archive (not actively used)
docs/              — Historical task plans and migration docs
system/            — System configuration (AI config, shell, symlinks, scripts)
  .ai/AGENTS.md    — Global instructions source (mirrored to both tool configs)
  .ai/skills/      — Skill source of truth (see system/.ai/skills/AGENTS.md)
  .dot-claude/CLAUDE.md  — generated global instructions (do not edit; from .ai/AGENTS.md)
  .dot-claude/skills/    — generated Claude mirror (do not edit; from .ai/skills)
  .dot-codex/AGENTS.md   — generated global instructions (do not edit; from .ai/AGENTS.md)
  .dot-codex/skills/     — generated Codex mirror (do not edit; .system/ preserved)
vault/             — Knowledge graph content (see vault/AGENTS.md)
```

Skills are authored once in `system/.ai/skills/` and mirrored into both per-tool
folders by `$sync-skills` (`brain repo sync-skills`). The global instructions in
`system/.ai/AGENTS.md` are likewise mirrored into `system/.dot-claude/CLAUDE.md`
and `system/.dot-codex/AGENTS.md` by `$sync-instructions`
(`brain repo sync-instructions`). Both run on every build.

## Operating Mode

* **[GUIDELINE]** Quality > speed. Favor correctness, clarity, and maintainability.

## Technical / Automation Scope Note

The next sections apply to technical/code/automation surfaces such as `cli/`, `system/`, repo tooling, AGENTS files, skills, SOPs, and technical docs. They do **not** override `vault/AGENTS.md` for normal knowledge-content authoring.

## [STRICT] Making Common Changes (Technical / Automation Surfaces)

When changing code, scripts, AGENTS files, skills, config, or technical docs:
* First understand the current behavior, rules, and source-of-truth files.
* Research existing patterns, helpers, and neighboring implementations before introducing new structure.
* If the work is large, risky, or likely to span multiple sessions, create task docs under `.ai/tasks` before implementing.
* Implement focused changes that fit existing conventions.
* Verify the result with the relevant validation or review path before claiming completion.

## [STRICT] No Agent-Created Tests Unless Explicitly Requested

When changing code, scripts, config, or technical docs:
* Do not add, scaffold, generate, or modify automated tests unless the user explicitly asks for tests in the current task.
* Do not add or enable test runners, test scripts, test dependencies, test fixtures, snapshots, or `tests/` directories as part of normal implementation work.
* Do not apply test-first/TDD workflows by default in this repo. Use non-test validation such as type-checking, linting, builds, static inspection, or the smallest safe manual command that exercises the changed path.
* Existing tests may only be run when the user asks for test execution or when the current task is explicitly about maintaining an existing test suite.

## [STRICT] Public Mirror Documentation and Export Hygiene

When changing public-facing repo structure, reusable tools, skills, agents, setup docs, or public export behavior:
* Update `README.md` in the same change when the public-facing layout, capabilities, setup flow, or generated public resources change.
* Review `.public-export.json` in the same change to include newly useful non-sensitive resources and to exclude, sanitize, or verify sensitive resources.
* If a useful resource should not be public, document the reason in the export config through an exclusion, sanitizer, verifier, or nearby source comment instead of leaving the omission implicit.
* After changing export behavior or allowlists, run `brain repo export-public` and inspect `brain-public/` for expected additions, removals, and redactions before committing.

## [STRICT] Config-Driven & Public-Export-Safe by Default

When authoring skills, scripts, agents, scheduled tasks, or technical docs:
* **Never hardcode environment-specific or sensitive values** (account IDs, credentials, channel/chat IDs, hostnames, profile names, resource ARNs, log groups, file paths that vary per machine). Reference them by name from configuration — environment variables (`system/zshrc/.env`, with placeholders in `.env.example`) or an existing config file — so the source artifact stays generic and shareable.
* **Prefer config indirection over export exclusion.** Adding a value to the public-export deny/sanitize list to hide a hardcoded literal is a last resort, not the default. A resource that reads its values from config is public-exportable as-authored and needs no special-casing.
* **Fix misleading or environment-coupled config at the source.** If a name or default does not mean what it says (e.g. a profile/alias pointing at the wrong target), correct the underlying config rather than documenting the discrepancy in a comment — back up first, then realign.
* The goal: every reusable artifact should be config-driven and public-export-safe by construction, so secrets live in one gitignored place and the artifact itself can be shared without redaction.

## [STRICT] Skill Execution Protocol

When a skill is invoked or clearly applies:
* Read that skill's `SKILL.md` before acting.
* Treat the whole skill directory as the contract; read referenced sibling files when the skill tells you to.
* Execute the skill's phases in order; do not improvise around required steps.
* Meet the skill's quality bar, not just the minimum to produce an answer.

## [STRICT] Dependency Reuse (Code / Script Surfaces)

For code, scripts, and repo tooling:
* Reuse existing dependencies, helpers, and platform tools before adding new packages or utilities.
* Check local manifests and the standard library first.
* Do not create parallel helpers when an existing abstraction already covers the job with minor adaptation.

## [STRICT] Skill Reference Standardization (Technical Docs)

When referencing a skill in AGENTS files, SOPs, or technical docs:
* Use the canonical `$skill-name` form first.
* If a file locator helps, append the actual repo-relative or installed path in backticks instead of replacing the canonical skill reference.
* Keep wording reusable; do not paste large skill instructions inline when a skill reference and path are enough.

## [STRICT] Concurrent Agent Work (Technical / Multi-Agent Tasks)

* Assume unrelated changes from other agents may appear in the same worktree.
* Do not stop solely because unrelated files changed; continue unless those changes create a real conflict with your assigned scope.
* If another agent's change affects your task, adapt carefully, narrow scope, or surface the concrete conflict.

## [STRICT] File Path Reference Standards

When referencing any repo file or directory in markdown docs, AGENTS files, or comments:
* Always use **repo-root-relative paths** with forward slashes.
  * Correct: `cli/commands/music/play-artist.ts`
  * Incorrect: `/cli/commands/music/play-artist.ts`, `../../commands/music/play-artist.ts`
* Always wrap paths in **inline code backticks**. Do not use markdown link syntax for repo paths.
  * Correct: `vault/beliefs/AGENTS.md`
  * Incorrect: `[beliefs AGENTS](vault/beliefs/AGENTS.md)`
* Directories must end with a **trailing slash**.
  * Example: `cli/lib/stream/`
* Paths must match **exact casing** and be copy/paste navigable.

## [STRICT] Writing AGENTS.md Rules

When writing or editing any `AGENTS.md` file in this repo:
* **Address root causes, not symptoms.** Rules prevent classes of problems — not specific bugs.
* **Back with best practices.** Validate rules via research when possible.
* **Keep generic.** Rules should apply broadly; examples clarify but don't limit scope.

## [STRICT] No Documentation Duplication (Technical / Agent Docs)

For AGENTS files, skill docs, SOPs, and technical references:
* Never duplicate information across multiple documents. Cross-reference instead.
* Before creating or editing any technical doc, search for overlapping content. If overlap exists, either cross-reference the existing doc or extract shared content and link from both locations.
* Single source of truth for each piece of technical guidance.
* Small atomic documents are often ideal.

**Note:** Vault content has its own linking and deduplication rules in `vault/AGENTS.md`. This rule does not override those.
