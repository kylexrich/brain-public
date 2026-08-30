> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `system/.ai/skills/AGENTS.md` _(this file)_ > `AGENTS.md` _(root)_

---

# `system/.ai/skills/` — Skill Source of Truth

This directory is the single source of truth for Marvin's skills. Every tool
reads it directly through symlinks — there are no generated copies:

- `system/.dot-claude/skills` → `../.ai/skills` (and `~/.claude/skills` symlinks to that)
- `system/.dot-codex/skills` → `../.ai/skills` (and `~/.codex/skills` symlinks to that)

`brain repo sync-skills` (part of every build) only ensures these symlinks
exist and point correctly — an edit here is live everywhere immediately.

Retired skill bundles belong under `system/.ai/archive/skills/`; see
`system/.ai/archive/AGENTS.md`.

## [STRICT] Runtime-owned content stays out of git

Because the tools write through the symlinks, two kinds of runtime-owned
content land inside this directory and must never be committed (both are
gitignored — keep it that way):

* `system/.ai/skills/*/state/` — live skill state (e.g. `music/state/`,
  `proactive-reach-out/state/`). Keep only templates/examples in tracked files
  (e.g. `proactive-reach-out/state.example.json`).
* `system/.ai/skills/.system/` — Codex's bundled system skills and its marker,
  written and updated by Codex itself. Never edit, delete, or track it.

## Skill authoring

* Each skill is a kebab-case directory containing a `SKILL.md` plus any
  supporting files. Follow `SKILL.template.md` at the repo root.
* These skills are public-export-safe by construction: keep environment-specific
  and sensitive values in config (`system/zshrc/.env`) and reference them by name
  rather than hardcoding. See the repo-root `AGENTS.md` for the full rule.
