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

# `app/src/__tests__/` Guidance & Rules (DO NOT EDIT. EDIT `app/src/__tests__/.ai/guidance/` ONLY)

The rules below are the binding rules for this directory and every subdirectory beneath it. All agents operating within this scope must follow them, subject to the instruction precedence defined at the top of this `AGENTS.md` (most specific file wins on conflict).

## App Test Layout Rules

### Mirrored Source Tree

* Every app test file must live under `app/src/__tests__/`.
* The path under `app/src/__tests__/` must mirror the tested source file's path under `app/src/`.
  * Example: `app/src/api/users/UserService.ts` is tested by `app/src/__tests__/api/users/UserService.test.ts`.
  * Example: `app/src/shared/retell/outbound-test-call-dynamic-variables.ts` is tested by `app/src/__tests__/shared/retell/outbound-test-call-dynamic-variables.test.ts`.
* Test file basenames must match the tested source file basename exactly, with `.test.ts` appended.
* Do not create aggregate or rollup test files that cover unrelated source files. If a legacy test covers multiple primary source files, split it so each test file maps to one mirrored source file.

### Helper Location

* Reusable app test helpers are allowed only in folders named `test-helpers`.
* Allowed helper locations are `app/src/__tests__/test-helpers/` and mirrored subfolder helpers such as `app/src/__tests__/api/automations/test-helpers/`.
* Helper files must not contain test cases or assertions that should run as tests.

### No Other App Test Locations

* Do not add `*.test.*` or `*.spec.*` files anywhere else under `app/src/`.
* Run `npm run test --prefix app` after adding, moving, or modifying app tests.
