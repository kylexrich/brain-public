> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `docs/rollout/AGENTS.md` _(this file)_ > `docs/AGENTS.md` > `AGENTS.md` _(root)_

---

# Rollout Docs

## Related References

- Rollout document structure: `docs/rollout/TEMPLATE.md`
- Task planning rollout gate: `{.ai,.claude,.codex}/skills/task-planning/SKILL.md`
- Worktree and phase execution: `{.ai,.claude,.codex}/skills/worktree-task/SKILL.md` and
  `{.ai,.claude,.codex}/skills/phase-loop/SKILL.md`
- AI deployment restriction: `.ai/guidance/repository-rules.md#strict-no-deployments-ai-only`

---

## Guidance Map (DO NOT EDIT)

The documents linked below are the binding rules for this directory and every subdirectory beneath it. All agents operating within this scope must follow them, subject to the instruction precedence defined at the top of this `AGENTS.md` (most specific file wins on conflict).

- `docs/rollout/.ai/guidance/rollout-docs.md`: rollout authority, default no-rollout rule, gate criteria, roles, required content, lifecycle, and anti-patterns.
