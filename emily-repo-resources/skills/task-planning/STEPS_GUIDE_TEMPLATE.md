# steps-guide.md

```md
# [Title] - Steps Guide

**Context doc (source of truth):**
- `.ai/tasks/YYYY-MM-DD/<slug>/<slug>-context.md`

**Steps docs (max 5 steps per doc):**
- `.ai/tasks/YYYY-MM-DD/<slug>/<slug>-steps-1-5.md`
- `.ai/tasks/YYYY-MM-DD/<slug>/<slug>-steps-6-10.md`

**Coordination rule:** Each step is completed by one agent using the `$step-execution` (`/step-execution`) skill.
Do not start a step until all the **Prereqs:** for that step are completed.

> **NOTE:** Another AI agent may be completing an independent step in the same git worktree or branch at the same time. This is expected.
> Ignore unrelated changes from other agents. If their changes affect your work (e.g., new conflicts, shifted patterns, or shared code), adapt as needed to integrate cleanly or fix issues as they arise.

**Dependency rules:**
- Steps with dependencies must explicitly list them in **Prereqs** and appear after their prerequisites in the index.
- Steps with no dependencies use **Prereqs: None**—this is expected and valid. Place them wherever makes logical sense.
- Independent steps (Prereqs: None) can run in parallel if multiple agents are available.

---

## Step index

| Step | Name | Status | Owner | Doc |
| --- | --- | --- | --- | --- |
| 1 | [Name] | Incomplete | [Name or ai handle] | `.ai/tasks/YYYY-MM-DD/<slug>/<slug>-steps-1-4.md` |
| N | Final validation & cleanup (required, always last) | Incomplete | [Name or ai handle] | `.ai/tasks/YYYY-MM-DD/<slug>/<slug>-steps-13-16.md` |

---

## Steps doc ranges

- Max 5 steps per steps doc.
- Steps are numbered sequentially across docs.
- The final step is always validation and must live in the last steps doc.

```
