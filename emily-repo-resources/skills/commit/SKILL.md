---
name: commit
description: Create git commits with validation. Runs CI checks, generates descriptive commit messages, and proactively discovers related Linear issues to link and update.
allowed-tools: Bash, Read, Glob, Grep, mcp__linear__*
---

# Git Commit Skill

Create validated git commits with clear, descriptive messages. Proactively searches Linear for related issues and asks to link them in the commit description.

## Trigger Phrases

Activate when the user says:
- "commit" or `$commit` (`/commit`)
- "create a commit"
- "commit my changes"

## Workflow

### Step 1: Validate Changes

Follow the `$ci` (`/ci`) skill.

**If CI fails:**
1. Stage all current changes (so fixes remain unstaged):
   ```bash
   git add .
   ```
2. Attempt to resolve any issues per the `$ci` (`/ci`) skill.
3. After fixing, the fixes will be in unstaged changes
4. Follow the `$ci` (`/ci`) skill again to verify fixes work
5. If resolved, ask the user to review the unstaged changes (the fixes) before proceeding
6. Only after user approval, stage the fixes and continue to commit

### Step 2: Analyze Changes

Gather context about what's being committed:

```bash
git status
git diff --staged
git diff
git log --oneline -5
```

Identify:
- **Primary themes** - What areas of code changed (API, client, infra, etc.)?
- **Key changes** - What are the most significant modifications?
- **Type of change** - Feature, fix, refactor, chore, docs?

### Step 3: Stage All Changes

**Always stage ALL changes. No exceptions. No asking.**

```bash
git add .
```

Never selectively stage. Never ask which files to include. Commit everything.

### Step 4: Generate Commit Message

Create **one commit** with:

* **Title:** Imperative mood, concise, and scannable (aim ~50–72 chars; not strictly enforced)
* **Type prefix:** Use `feat|fix|refactor|perf|chore|docs|test|build|ci|revert`
* **Scope (optional):** Add `(scope)` when it materially improves clarity (e.g., `api`, `ui`, `db`, `infra`, `auth`)
* **Body:** 2–8 bullets capturing the **main themes**; include **why/impact** when it’s not obvious
* **Mixed commits:** If changes are truly “grab bag,” prefer `chore:` (or pick the dominant type and cover the rest in bullets)

Format:

```text
<type>(<scope optional>): <short description>

- <primary change 1>
- <primary change 2>
- <impact/why (optional but recommended when unclear)>
- <risk/migration/follow-up (only if needed)>
```

Examples:

```text
feat(api): Add webhook retry logic

- Add retry queue with configurable attempts
- Implement exponential backoff with jitter
- Reduce transient failure drops under 5xx responses
```

```text
chore: Cleanup tooling + CI alignment

- Remove deprecated tool schema fields
- Normalize tool snapshot serialization
- Update CI script ordering to match repo standards
```


### Step 4.5: Linear Issue Discovery (when Linear MCP is available)

**Always run this step if the Linear MCP server is available.** Do not skip it or require the user to ask.

Search Linear for existing issues that may relate to what's being committed:

```
mcp__linear__list_issues(query: "<key themes from commit>", assignee: "me")
```

Run 1–2 targeted searches based on the primary themes identified in Step 2. Look for issues that are **not already in a completed/cancelled state** — only surface active or backlog issues.

**For each potentially matching issue**, determine a proposed status based on what the commit actually does:
- **"In Progress"** — the commit is partial work toward the issue (addresses part of it, sets up scaffolding, etc.)
- **"Done"** — the commit fully resolves or completes the issue

**Confidence threshold:** Only surface issues you are reasonably confident (>60%) are related. Don't include long-shot matches.

**If no relevant issues are found**, skip the rest of this step and proceed to Step 5 as normal.

**If relevant issues are found**, present them to the user in a single message like this:

> I found Linear issues that seem related to this commit. Do you want me to link them in the commit description and update their status?
>
> - **[EMLY-123] Fix webhook retry logic** → mark as **Done** *(commit fully resolves this)*
> - **[EMLY-456] Improve error handling in API** → mark as **In Progress** *(partial work)*
>
> Yes / No

Wait for the user's response before proceeding.

- **If the user says no** — proceed to Step 5 with the original commit message, no Linear changes.
- **If the user says yes** — include all confirmed issues in the commit body as `Linear: <url>` lines (one per issue), then after the commit is created, update each issue's status to the proposed state using `mcp__linear__save_issue`.

### Step 5: Create Commit

Use a single message payload. **Do not** pass each bullet as a separate `-m` flag—Git treats each `-m` as a new paragraph and inserts blank lines between bullets.

Preferred:

```bash
cat <<'EOF' | git commit -F -
<type>(<scope optional>): <short description>

- <primary change 1>
- <primary change 2>
- <impact/why (optional but recommended when unclear)>
- <risk/migration/follow-up (only if needed)>

Linear: <issue_url_1>
Linear: <issue_url_2>
EOF
```

Omit the `Linear:` lines if no issues were linked in Step 4.5.

**Do NOT push to remote.**

---

## Important Rules

1. **Commit ALL changes** - Always `git add .` and commit everything. Never ask which files to include. Never selectively stage.
2. **Testing** - Follow the `$ci` (`/ci`) skill
3. **Never push to remote** - Only create local commits
4. **Keep titles concise** - 50 characters or less
5. **Use imperative mood** - "Add feature" not "Added feature"
6. **Group related changes** - Bullet points should represent themes, not individual files
7. **No co-author lines** - Never include "Co-Authored-By" or similar attribution in commit messages
8. **No blank lines between bullets** - Use a single message payload (not multiple `-m` flags)
