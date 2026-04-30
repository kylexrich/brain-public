---
name: commit
description: Create git commits with validation. Runs CI checks, generates descriptive commit messages, and optionally integrates with Linear for issue tracking.
allowed-tools: Bash, Read, Glob, Grep, mcp__linear__*
---

# Git Commit Skill

Create validated git commits with clear, descriptive messages. Optionally integrates with Linear for issue tracking.

## Trigger Phrases

Activate when the user says:
- "commit" or `$commit` (`/commit`)
- "create a commit"
- "commit my changes"
- "commit with linear" (enables Linear integration)

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
EOF
```

**Do NOT push to remote.**

---

## Linear Integration

When the user mentions "linear" (e.g., "commit with linear", "linear commit"). Still follow Steps 1-4 as normal above. But then also:

### Step 1: Find or Create Linear Issue

Use the Linear MCP server to search for a relevant issue:

```
mcp__linear__list_issues(query: "<search based on commit content>", assignee: "me")
```

**If no matching issue exists**, create one:

```
mcp__linear__create_issue(
  title: "<descriptive title>",
  description: "<plain english description with bullet points>",
  team: "EMLYAI",
  assignee: "me",
  labels: ["Dev"]
)
```

The issue description should be:
- Written in plain English
- Include bullet points for key items
- Describe the work being done
- Reference relevant context

### Step 2: Ensure Issue Configuration

Verify/update the issue:

1. **Assigned to user:**
   ```
   mcp__linear__update_issue(id: "<issue_id>", assignee: "me")
   ```

2. **In current cycle:**
   ```
   mcp__linear__list_cycles(teamId: "<team_id>", type: "current")
   mcp__linear__update_issue(id: "<issue_id>", cycle: "<current_cycle_id>")
   ```

3. **Has "Dev" label:**
   ```
   mcp__linear__update_issue(id: "<issue_id>", labels: ["Dev"])
   ```

### Step 3: Commit with Issue Link

Include the Linear issue URL in the commit body:

```
<type>: <short description>

- <primary change 1>
- <primary change 2>

Linear: <issue_url>
```

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
