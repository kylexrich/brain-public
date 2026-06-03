> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**
>
> Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.
>
> **Chain:** `system/.dot-codex/AGENTS.md` _(this file)_ > `AGENTS.md` _(root)_

---

# AGENTS.md — Global Working Rules (Codex)

## Operating Mode

* **Quality > Speed.**

---

## Date Handling

* For task managers, calendars, reminders, and other user-facing deadlines, resolve relative dates (`today`, `tomorrow`, `tomorrow morning`, weekday names) from Kyle's stated local date when he provides one.
* If Kyle's stated date conflicts with tool/system metadata, treat Kyle's stated date as authoritative or ask before writing anything. Do not silently use a conflicting date anchor.
* When creating or updating dated tasks, confirm the exact ISO date in the response.

---

## Instruction Precedence

* If multiple `AGENTS.md` files apply, follow the most specific scope: **file/dir-level > repo-level > global**.
