---
name: attio
description: Manage EMLY AI Attio CRM via mcporter. Use when asked to create/edit/search/update people, companies, notes, comments, or run CRM reports. Do not use this skill for tasks.
---

# Attio Skill (EMLY)

Use this skill for all Attio CRM operations.

## Read first

- Read `TOOLS.md` for Attio schema, attributes, select options, and statuses.
- Use `mcporter` Attio calls for all operations.

## When to use Attio

- A new lead/customer/contact is mentioned → create/upsert person or company.
- A meeting/call outcome is discussed → add a note on the relevant record.
- Task/follow-up tracking is requested → do **not** use Attio; route to the Linear skill.
- The user asks about customer/subscription/pipeline state → search/list/report records.
- A company/deal stage changes → update record status.

## Mandatory safety policy

- **Always confirm before creating/updating.**
  - Propose exactly what will be created/updated and on which records.
  - Wait for explicit approval.
- **Search before creating.**
  - Prevent duplicates.
- **Hard rule: never use Attio tasks.**
  - Do not create, edit, list, or manage tasks in Attio.
  - Route all task/follow-up requests to the Linear skill.

## Search workflow (first step)

- `attio.search-records` for fuzzy lookup (name, email, domain, phone).
- `attio.list-records` for structured filters.

## Create/update workflow

- Prefer `attio.upsert-record` over `attio.create-record`.
  - Match by unique fields (`email_addresses` for people, `domains` for companies).
- Use `attio.update-record` when `record_id` is known.
- For select/status fields, use option titles (example: `"Active"`, `"Lead"`).
- Format people names as `"Last, First"`.
- For record references (for example person ↔ company), use proper record-reference objects.
- Keep records connected whenever possible.

## Notes, comments, reports

- Notes: `attio.create-note`
  - Use for meeting summaries, call outcomes, decision context.
  - Markdown is supported (headings/lists/bold/italic/links), but avoid code blocks/tables.
- Comments: `attio.create-comment`
  - Use for threaded comments on records/list entries.
- Reports: `attio.run-basic-report`
  - Use for quick count/sum/avg/min/max and grouped views.

## CRM quality bar

- Suggest adding qualified leads/customers when enough identifying info exists and no record is found.
- Keep company pipeline statuses accurate:
  - Not Contacted → Phone Contact Complete → Email Contact Complete → Discovery Call Booked → Closed.
- Ensure notes/comments are attached to the correct records.

## Response requirements

- After changes, summarize exactly what was created/updated and where.
- Keep wording direct and concise.
