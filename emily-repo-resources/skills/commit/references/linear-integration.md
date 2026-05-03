# Linear Integration — Discover, Confirm, Back-link

Used by Step 4 of the `$commit` (`/commit`) skill when the Linear MCP is connected. Returns a confirmed list of related Linear issues (each with a proposed status) for inclusion in the commit body, or an empty list when nothing matches or the user declines.

The post-commit write phase (status update + auto-assign + comment) lives in Step 6 of the parent skill — not here.

## 1. Search

Run **one broad search per distinct theme** across non-completed issues. Use the themes identified in Step 2 of the parent skill as the queries. No assignee filter — match anything potentially relevant.

```
mcp__linear__list_issues(query: "<theme>", includeArchived: false)
```

Collapse near-duplicate themes into a single query before searching — don't run two searches that would return the same set.

Drop any result already in a Completed or Cancelled state.

## 2. Confidence filter

Only surface issues you are reasonably confident (>60%) are related to the commit. Concrete signals:

- Title or description references the same component, file, feature, or bug touched by the commit.
- The commit explicitly addresses behavior described in the issue.
- Themes overlap meaningfully — not just a shared keyword.

Long-shot keyword matches do **not** qualify. When in doubt, leave it out.

## 3. Classify each surviving candidate

For every issue that clears the confidence filter, decide its proposed status:

- **`In Progress`** — the commit is partial work toward the issue (scaffolding, one of several sub-tasks, related but incomplete).
- **`Done`** — the commit fully resolves the issue.

## 4. Confirm with the user

If nothing survives, return an empty list and skip the rest. Otherwise, present all candidates in a **single message**:

> I found Linear issues that seem related to this commit. Link them and update status?
>
> - **[EMLY-123] Fix webhook retry logic** → mark as **Done** *(commit fully resolves this)*
> - **[EMLY-456] Improve error handling in API** → mark as **In Progress** *(partial work)*
>
> Yes / No

Wait for the response.

- **No** → return an empty list.
- **Yes** → return the confirmed list (issue ID, title, proposed status, URL) to the parent skill for inclusion in the commit body.

No Linear writes happen here — they all run after the commit lands, in Step 6 of the parent skill.
