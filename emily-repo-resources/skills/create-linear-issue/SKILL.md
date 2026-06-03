---
name: create-linear-issue
description: Create well-structured Linear issues with correct project, labels, and priority. Use when a user asks to add, track, or log work in Linear, or when translating a request/link into a new Linear issue.
---

# Create Linear Issue

## Overview

Create Linear issues that are easy to triage by selecting the most appropriate project and labels, setting a priority based on best judgment, keeping the title simple, and writing a short Definition of Done with optional Context.

## Mandatory at creation (no exceptions)

Every issue MUST be created with all three of the following baked into the FIRST `save_issue` call. Never create an issue missing any of these, and never patch them in afterward:

- **Project** — exactly one
- **Labels** — 1–3 specific labels
- **Priority** — Urgent / High / Medium / Low (never "No priority")

If the user does not specify one of these, infer the best choice yourself — do not leave it blank. If you genuinely cannot infer (no project fits, no label fits), stop and ask before creating.

## Workflow

1. Clarify intent
   - Identify what needs to be added or changed and why.
   - If a link is provided, review it to classify the work correctly.

2. Search for existing issues before creating (always — never ship a duplicate)
   - **Before any `save_issue` create call**, run `list_issues` with a `query` derived from the user's request. Try a couple of short variations (different keywords, the person's name, the system/area) to maximize recall. Also widen by `state` if needed (don't only look at backlog — an active or recently-completed issue may still be the right home).
   - If a **strong match** exists (same intent, same scope, not yet completed or canceled in a way that makes reopening wrong):
      - **Default to updating that existing issue** via `save_issue` with its `id` — add the new context to the description, refine the title, adjust priority/labels/cycle/deadline as needed. Do **not** create a parallel duplicate.
      - If the user clearly wants a brand-new tracking unit even though one already exists (for example: a recurring per-day task where each day is its own deliverable), ask first ("EML-XXX looks like the same thing — update that or create a separate issue?") rather than guessing.
   - If the match is ambiguous, surface the candidate(s) to the user with their IDs and titles and let them decide between update vs new.
   - Only proceed to create a brand-new issue when no strong match exists.
   - Cache the search results in-session — for batches (e.g., creating several related issues), one search round is enough; don't re-query per issue if the user explicitly said "create these N as separate tasks".

3. Choose project (always — never ship project-less)
   - **Mandatory.** Every issue MUST land in exactly one project. Never leave the project unset.
   - List available projects (and descriptions) and pick the best fit. Reuse the list across the session.
   - Infer from the user's intent if they didn't name a project — do not default to no project.
   - If no project clearly fits, stop and ask rather than creating project-less.
   - Pass `project` in the FIRST `save_issue` call.

4. Choose labels (always — never ship label-less)
   - **Mandatory.** Every issue MUST be created with 1–3 labels. Empty labels are never acceptable.
   - On the first issue creation in a session, call `list_issue_labels` to load the workspace's available labels into context. Reuse that list for subsequent issues in the same session.
   - Pick the most specific 1–3 labels that capture the primary nature of the work. Prefer the smallest set.
   - **Bake labels into the FIRST `save_issue` call** (pass `labels: [...]` at creation). Do not create then patch labels in a follow-up update.
   - If no available label feels right, that is a signal the project or scope is mis-classified — stop and ask the user before creating, rather than shipping label-less.

5. Set priority (always)
   - Use best judgment even if the user does not specify urgency or priority.
   - Factor in the current cycle, future cycles, and backlog issues without a cycle. Understand other related issues priorities.
   - Use the user’s intent and language to calibrate urgency.
   - Assign the chosen priority in the original issue creation (do not leave it unset).
   - In your response to the user, tell the user which priority you chose and why (1 sentence). If they disagree, then adjust it for them.

6. Cycle, owner, deadline
   - **Deadline:** default to **no deadline** unless the user specifies one.
   - **Relative-date anchor:** before resolving words like "today", "tomorrow", "tomorrow morning", or "this Friday", establish the user's local date. If Kyle states the current date in the conversation, his stated date is authoritative. Otherwise use the local environment date in Kyle's timezone, America/Vancouver. If tool/system metadata conflicts with Kyle's stated date, stop and clarify before creating or updating the issue.
   - When a relative deadline is used, compute the exact ISO date and mention it in the response. Do not silently choose a date from stale or conflicting metadata.
   - **If a deadline IS set** (whether the user gave a date or asked you to set one), apply both of these automatically — do NOT leave them blank:
      - **Cycle:** look up the team's cycles and assign the issue to whichever cycle's `[startsAt, endsAt]` window contains the deadline. If the deadline falls outside every known cycle, leave the cycle blank and call this out in your response.
      - **Assignee:** default to the user (`me`). The act of giving something a deadline implies he's taking ownership unless he names someone else.
   - **If NO deadline is set:** default to no cycle and no assignee unless the user explicitly says otherwise (e.g., "this cycle", "assign to Josh").
   - Explicit user overrides always win — if the user names a different assignee or cycle, use that.

7. Draft title (simple and direct)
   - Use a short verb + object format (e.g., “Add SECURITY_TXT to env templates”).
   - Avoid extra qualifiers, parentheses, or long phrases.

8. Write description
   - Include a required **Definition of Done** section with 1–3 sentences. Less is more. Straightforward, easy to understand, concise are top priorities.
   - If including **Context**, use 1–3 sentences. Straightforward, easy to understand, concise are top priorities. If no context is needed, omit the section entirely.
   - **Exception:** If the user provides robust details that cannot fit in 1–3 sentences (for either section), preserve all relevant details—refine for clarity and structure, but do not artificially slim down.
   - Keep sections straightforward and implementation-agnostic.

## Description Template

**Definition of Done:**
[1–3 sentences describing the outcome and success criteria.]

**Context:**
[1–3 sentences providing brief background or constraints. Omit this section and title entirely if not used.]
