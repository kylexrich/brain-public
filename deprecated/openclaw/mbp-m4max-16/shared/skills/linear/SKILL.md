---
name: linear
description: Manage EMLY Linear issues via mcporter. Use when a user asks to create/edit a Linear issue or task, log work, triage bugs, or update issue status/assignee/priority/labels/project/cycle.
---

# Linear Skill (EMLY)

All task/work-tracking goes through Linear. Attio is never used for tasks.

## Read first

- `TOOLS.md` for workspace details (team, projects, labels, users, statuses, cycle).

## Creating issues

### Workflow

1. **Clarify intent** — understand what needs tracking and why. If a link is provided, review it.
2. **Choose project** — pick the best-fit project. Ask only if genuinely ambiguous.
3. **Choose labels** — 1–3 labels, prefer the smallest set that captures the work.
4. **Set priority** — always set one, even if the user doesn't specify. Use judgment based on urgency, current cycle context, and related issues. Be ready to explain your choice in one sentence if asked.
5. **Cycle, owner, deadline** — No owner by default. If assigning to a cycle, default status to **Todo**.
   - If a **due date is specified but no cycle**: set the cycle to whichever cycle contains that due date.
   - If a **cycle is specified but no due date**: leave the due date blank.
   - If **both are specified**: set both as given.
   - If **neither is specified**: leave both blank.
6. **Draft title** — short verb + object (e.g., "Fix callback retry logic"). No extra qualifiers or long phrases.
7. **Write description** — required. Use the template below.

### Description template

```
**Definition of Done:**
[1–3 sentences. Clear success criteria. Concise.]

**Context:**
[1–3 sentences. Background/constraints. Omit this section entirely if not needed.]
```

- If the user provides robust details that don't fit 1–3 sentences, preserve all relevant info — refine for clarity but don't artificially trim.
- Keep it implementation-agnostic unless specifics are given.

### Execution

- Use `mcporter call linear.save_issue ...` to create.
- **Description newlines:** The `description` value must contain real newlines, not literal `\n` escape sequences. Use a heredoc, `$'...'` quoting, or `printf` to ensure actual newline characters are passed — never pass `\n` as two characters in the string.
- **Do not ask for confirmation.** Just create it.
- If something is genuinely ambiguous (e.g., could be two different projects), ask. Otherwise, use your judgment and go.

## Editing issues

- Use `mcporter call linear.save_issue id=<issueId> ...`.
- Update whatever fields need changing.
- **Do not ask for confirmation.** Just do it.

## Response format

- **After creating:** reply with the issue link. That's it. If asked, provide details.
- **After editing:** reply "Updated." or at most a 1-line summary of what changed. Nothing more unless asked.
- **Never narrate your reasoning, field choices, or workflow unless the user asks.**
