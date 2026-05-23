> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `app/src/__tests__/AGENTS.md` _(this file)_ > `app/AGENTS.md` > `AGENTS.md` _(root)_

---

# `app/src/__tests__/` Test Layout Guide

## Related References

- Package-level app test policy pointer: `app/.ai/guidance/code-quality-principles.md#global-principles-and-safety`

---

## Guidance Map (DO NOT EDIT)

The documents linked below are the binding rules for this directory and every subdirectory beneath it. All agents operating within this scope must follow them, subject to the instruction precedence defined at the top of this `AGENTS.md` (most specific file wins on conflict).

- `app/src/__tests__/.ai/guidance/test-layout.md`: mirrored test tree, test-helper placement, and app test validation rules.
