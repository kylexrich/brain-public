> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `system/.ai/skills/AGENTS.md` _(this file)_ > `AGENTS.md` _(root)_

---

# `system/.ai/skills/` — Skill Source of Truth

This directory is the single source of truth for Marvin's skills. It is mirrored
into the per-tool folders by `$sync-skills` (`brain repo sync-skills`):

- `system/.dot-claude/skills/` — Claude Code mirror (symlinked to `~/.claude/skills`)
- `system/.dot-codex/skills/` — Codex mirror (symlinked to `~/.codex/skills`)

The sync runs as part of `npm run build` (via `script:sync:all`).

## [STRICT] Edit here, never the mirrors

* Author and edit every skill in `system/.ai/skills/<name>/`. The mirror copies
  carry an auto-generated `README.md` marker and are overwritten on the next
  sync — edits made directly in a mirror are silently lost.
* After changing a skill, run `brain repo sync-skills` (or any build) to refresh
  the mirrors before relying on them.

## [STRICT] Stateless source — runtime state lives in the mirror

* The source must stay stateless. A skill's live runtime state (e.g.
  `music/state/`, `proactive-reach-out/state/`) lives only in the generated
  mirror, where it is written through the symlink, and is preserved across syncs.
* Keep only templates/examples in the source (e.g.
  `proactive-reach-out/state.example.json`). `system/.ai/skills/*/state/` is
  gitignored to enforce this.

## [STRICT] Mirror preservation contract

The sync wipes and regenerates each mirrored skill, with two exceptions it must
never touch:

* `system/.dot-codex/skills/.system/` — Codex's bundled system skills (and the
  `.codex-system-skills.marker`). Never deleted or overwritten.
* Any `state/` subdir inside a skill — runtime-owned, never deleted or written.

## Skill authoring

* Each skill is a kebab-case directory containing a `SKILL.md` plus any
  supporting files. Follow `SKILL.template.md` at the repo root.
* These skills are public-export-safe by construction: keep environment-specific
  and sensitive values in config (`system/zshrc/.env`) and reference them by name
  rather than hardcoding. See the repo-root `AGENTS.md` for the full rule.
