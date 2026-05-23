> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `app/src/scripts/AGENTS.md` _(this file)_ > `app/AGENTS.md` > `AGENTS.md` _(root)_

---

# `app/src/scripts/` EMLY Scripts Guide for AI Contributors

## Related References

- Exact package entries: `app/package.json`
- Current operator SOP and deleted-script rationale: `docs/sop/app-operator-scripts.md`
- App test location rules: `app/src/__tests__/AGENTS.md`

---

## Guidance Map (DO NOT EDIT)

The documents linked below are the binding rules for this directory and every subdirectory beneath it. All agents operating within this scope must follow them, subject to the instruction precedence defined at the top of this `AGENTS.md` (most specific file wins on conflict).

- `app/src/scripts/.ai/guidance/script-rules.md`: app script scope, durable script ownership, temporary-script cleanup, dry-run/apply expectations, and Retell SDK runtime behavior.
