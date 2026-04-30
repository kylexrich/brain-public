---
name: resolve-contact
description: Resolve a human contact name from iMessage/phone/email identifiers using Kyle's standard workflow. Use when any task needs person-name resolution for reminders, message digests, commitment scans, or contact labeling. Prefer the bundled deterministic resolver script instead of ad-hoc contact-matching logic.
---

# Resolve Contact

Use this skill whenever a workflow needs a reliable person name from a phone number, email, chat identifier, or display name.

## Inputs

- `identifier`: phone/email/chat identifier (required)
- `display_name`: optional candidate name from chat metadata
- `mode`: one of:
  - `report` → unresolved may fall back to raw identifier
  - `reminder_title` → unresolved must NOT use raw number; skip item or ask clarification

## Required workflow

Run the bundled resolver script exactly once per contact:

```bash
brain contact resolve \
  --identifier "<identifier>" \
  --mode "<report|reminder_title>" \
  [--display-name "<display_name>"]
```

The script already enforces the correct resolution order:
1. Google Contacts first (`gog contacts search`)
2. Apple Contacts fallback second, using deterministic AddressBook database matching across all contact sources
3. Mode-specific unresolved handling

## Output contract

The script prints one JSON object:

```json
{
  "resolved": true,
  "name": "Hannah Gerrard",
  "source": "google",
  "label": "Hannah Gerrard"
}
```

Use `label` as the caller-facing value.

- If `mode=report` and unresolved, `label` falls back to the raw identifier.
- If `mode=reminder_title` and unresolved, `label` is `null`; the caller must skip or ask clarification.

## Hard rules

- Never invent names.
- Never skip Google-first ordering.
- Never reimplement contact matching inline if this script is available.
- Never use a raw phone number in reminder titles unless Kyle explicitly asks for it.
- Keep matching deterministic and repeatable.
