---
name: create-linear-issue
description: Create well-structured Linear issues with correct project, labels, and priority. Use when a user asks to add, track, or log work in Linear, or when translating a request/link into a new Linear issue.
---

# Create Linear Issue

## Overview

Create Linear issues that are easy to triage by selecting the most appropriate project and labels, setting a priority based on best judgment, keeping the title simple, and writing a short Definition of Done with optional Context.

## Workflow

1. Clarify intent
   - Identify what needs to be added or changed and why.
   - If a link is provided, review it to classify the work correctly.

2. Choose project
   - List available projects (and descriptions) and pick the best fit.
   - If no clear match exists, ask which project to use.

3. Choose labels
   - List available labels (and descriptions) if needed and pick the most specific 1–3 labels.
   - Prefer the smallest set that captures the primary nature of the work.

4. Set priority (always)
   - Use best judgment even if the user does not specify urgency or priority.
   - Factor in the current cycle, future cycles, and backlog issues without a cycle. Understand other related issues priorities.
   - Use the user’s intent and language to calibrate urgency.
   - Assign the chosen priority in the original issue creation (do not leave it unset).
   - In your response to the user, tell the user which priority you chose and why (1 sentence). If they disagree, then adjust it for them.

5. Cycle, owner, deadline (only if specified)
   - Default to **no cycle** unless the user explicitly specifies one.
   - Default to **no owner/assignee** unless the user explicitly specifies one.
   - Default to **no deadline** unless the user explicitly specifies one.

6. Draft title (simple and direct)
   - Use a short verb + object format (e.g., “Add SECURITY_TXT to env templates”).
   - Avoid extra qualifiers, parentheses, or long phrases.

7. Write description
   - Include a required **Definition of Done** section with 1–3 sentences. Less is more. Straightforward, easy to understand, concise are top priorities.
   - If including **Context**, use 1–3 sentences. Straightforward, easy to understand, concise are top priorities. If no context is needed, omit the section entirely.
   - **Exception:** If the user provides robust details that cannot fit in 1–3 sentences (for either section), preserve all relevant details—refine for clarity and structure, but do not artificially slim down.
   - Keep sections straightforward and implementation-agnostic.

## Description Template

**Definition of Done:**
[1–3 sentences describing the outcome and success criteria.]

**Context:**
[1–3 sentences providing brief background or constraints. Omit this section and title entirely if not used.]
