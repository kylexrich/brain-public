---
name: commit
description: Create git commits with validation. Runs CI checks, generates descriptive commit messages, and proactively discovers related Linear issues to link and update.
allowed-tools: Bash, Read, Glob, Grep, mcp__linear__*
---

# Git Commit Skill

Validate, compose, and create one well-structured local commit. If the Linear MCP is available, discover related issues and back-link them to the commit.

## Triggers

`commit` · `create a commit` · `commit my changes` · `$commit` · `/commit`

## Rules

1. **Stage everything.** Always `git add .`. Never selectively stage. Never ask which files to include.
2. **Local only.** Never push to a remote. Never include `Co-Authored-By` or any attribution line.
3. **Validate first.** No commit without a clean CI pass.
4. **Single commit.** Group all changes into one commit, not many.
5. **Themes, not files.** Body bullets describe areas of impact, not enumerated paths.

## Workflow

### Step 1 — Validate

Follow the `$ci` (`/ci`) skill.

**If CI passes:** continue to Step 2.

**If CI fails**, isolate the fix so the user can review only what changed:

1. `git add .` — stage existing changes so the upcoming fix lands as an unstaged delta.
2. Resolve issues per the `$ci` (`/ci`) skill. The fix appears as the new unstaged diff.
3. Re-run `$ci` until clean.
4. Show the user the unstaged diff (`git diff`) and request approval of the fix.
5. On approval, `git add .` again and continue.

### Step 2 — Analyze

Inspect what's about to ship:

```bash
git status
git diff --staged
git diff
git log --oneline -5
```

Identify:

- **Type** — `feat | fix | refactor | perf | chore | docs | test | build | ci | revert`
- **Scope (optional)** — `api`, `ui`, `db`, `infra`, `auth`, etc. Add when it materially improves clarity.
- **Themes** — the 2–8 main areas of impact, not files.

For mixed grab-bag changes, default to `chore:` (or pick the dominant type and cover the rest in bullets).

### Step 3 — Stage

```bash
git add .
```

### Step 4 — Discover Linear issues (if Linear MCP is available)

**Always run this when the Linear MCP is connected.** Skip entirely if it isn't.

See `{.ai,.claude,.codex}/skills/commit/references/linear-integration.md` for the full discover → confirm flow. It returns either an empty list or a confirmed set of issues, each tagged with a proposed status (`In Progress` or `Done`).

### Step 5 — Compose & commit

Message shape (placeholders in `<...>`):

```text
<type>(<scope>): <imperative title, ~50–72 chars>

- <theme 1>
- <theme 2>
- <theme 3>
- <why/impact when not obvious>
- <risk/migration/follow-up if any>

Linear Issues:
- [<KEY-N>] <issue title> → <Done | In Progress> | <issue url>
```

Constraints:

- `(<scope>)` is optional — include only when it materially improves clarity.
- The entire `Linear Issues:` block is omitted when Step 4 returned nothing.
- Title is imperative mood, roughly 50–72 chars (not strictly enforced).
- Body is 2–8 themed bullets, not file enumeration.

Concrete example with all optional parts present:

```text
feat(api): Add webhook retry logic

- Add retry queue with configurable attempts
- Implement exponential backoff with jitter
- Reduce transient drops under 5xx responses

Linear Issues:
- [EMLY-123] Fix webhook retry logic → Done | https://linear.app/issue/EMLY-123
- [EMLY-456] Improve error handling → In Progress | https://linear.app/issue/EMLY-456
```

Same commit if Step 4 returned no Linear matches:

```text
feat(api): Add webhook retry logic

- Add retry queue with configurable attempts
- Implement exponential backoff with jitter
- Reduce transient drops under 5xx responses
```

Commit using a heredoc — **never** stack multiple `-m` flags. Git treats each `-m` as a new paragraph and inserts blank lines between every bullet, breaking the list.

```bash
cat <<'EOF' | git commit -F -
<full message>
EOF
```

### Step 6 — Back-link Linear (only if Step 4 returned issues)

After the commit lands, capture the short SHA:

```bash
git rev-parse --short HEAD
```

Then for each confirmed issue, in one batch:

1. Update its status to the proposed state via `mcp__linear__save_issue`.
2. If unassigned, set `assignee: "me"` on the same call.
3. Post a back-reference comment via `mcp__linear__save_comment` with body:
   ```
   <short-sha> — <commit title>

   <commit body bullets>
   ```

This phase is silent. Only surface failures.
