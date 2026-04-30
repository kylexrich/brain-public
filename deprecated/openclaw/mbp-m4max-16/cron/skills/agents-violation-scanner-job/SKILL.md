---
name: agents-violation-scanner-job
description: "Nightly scan of brain repo for AGENTS.md violations. Runs a safe repo-cleanliness + `brain repo sync-ai` preflight, then spawns one sub-agent per non-overlapping AGENTS scope (leaf scopes plus residual parent scopes). Leaves changes unstaged. Primarily used by the `agents-violation-scanner` cron job — rarely invoked manually."
---

# AGENTS Violation Scanner

Nightly automated scan of the brain repo for AGENTS.md rule violations. Spawn one sub-agent per governed AGENTS scope so leaf scopes are covered directly and parent-governed residual areas are not missed.

## Delegation model (CRITICAL — cron isolation)

This skill runs inside an isolated cron session. In isolated sessions, `sessions_yield` ends the agent turn permanently — sub-agent results are never collected and the scan silently fails.

**The cron job agent must NOT execute the scan directly.** Instead:

1. The cron agent spawns a single sub-agent via `sessions_spawn` with `mode: "run"` to be the real orchestrator.
2. That sub-agent reads this skill and executes the full scan (preflight, discovery, worker spawns, aggregation).
3. Inside that sub-agent session, `sessions_yield` and `sessions_spawn` work normally.
4. The cron agent's only job is to spawn that one sub-agent, then report "Scanner orchestrator spawned."

The sub-agent spawn should use:
- `task`: "Execute the agents-violation-scanner-job skill exactly. You are the real orchestrator — run preflight, discover scopes, spawn workers, yield to collect results, aggregate. Nothing else."
- `model`: "sonnet"
- `thinking`: "high"
- `mode`: "run"
- Do NOT set `runTimeoutSeconds`.

## Safe preflight

Before scanning, verify the repo is safe to touch without staging or committing unrelated work.

Run this preflight from repo root (`.` when `cwd` is the brain repo):

1. Check that the working tree is already clean using machine-readable checks:
   - `git -C . diff --quiet --ignore-submodules --`
   - `git -C . diff --cached --quiet --ignore-submodules --`
   - `git -C . status --porcelain`
   - If any diff check fails or `status --porcelain` is non-empty, stop and report that the repo is dirty. Do not scan on top of existing changes.
2. Run the repo-local sync step:
   - `brain repo sync-ai`
3. Re-check cleanliness:
   - `git -C . diff --quiet --ignore-submodules --`
   - `git -C . diff --cached --quiet --ignore-submodules --`
   - `git -C . status --porcelain`
   - If any diff check fails or `status --porcelain` is non-empty after `brain repo sync-ai`, stop and report the generated drift instead of continuing.

Do **not** run the `brain-sync` skill here. This job must never stage or commit unrelated repo changes.

## Step 1 — Discover AGENTS scope units

A **scope unit** is the set of files governed by one `AGENTS.md` after subtracting any deeper descendant `AGENTS.md` subtrees.

Discovery rules:

```bash
find . -name "AGENTS.md" \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/dist/*" \
  | sort
```

Then build scope units like this:

1. Start from every discovered `AGENTS.md`, except anything under `deprecated/openclaw/`.
2. For each file, compute the directory it governs.
3. Subtract every descendant directory that has its own `AGENTS.md`.
4. Keep all leaf scopes as-is.
5. Also keep any **residual parent scope** whose governed area still contains files or folders after descendant subtrees are removed.

**Scope exclusion:** Skip anything under `deprecated/openclaw/`. Those AGENTS files are OpenClaw workspace/runtime guidance, and the repo tooling that manages AGENTS headers already ignores `deprecated/openclaw/`.

Current expected scope-unit shape (may evolve with the repo):
- root residual scope from `AGENTS.md` for repo-root files plus root-governed areas such as `system/`, excluding descendant `cli/`, `vault/`, and all `deprecated/openclaw/` paths
- `cli/AGENTS.md`
- `vault/AGENTS.md` residual scope for parent-governed vault areas without deeper local AGENTS files (currently includes paths like `vault/docs/` and `vault/stream-videos/`)
- each vault leaf scope (`vault/beliefs/`, `vault/concepts/`, etc.)

## Step 2 — Build AGENTS chains per scope unit

For each scope unit, resolve the full inheritance chain from repo root down to the governing `AGENTS.md`.

Examples:

- Root residual scope:
  1. `AGENTS.md`
- `cli/` scope:
  1. `AGENTS.md`
  2. `cli/AGENTS.md`
- `vault/beliefs/` scope:
  1. `AGENTS.md`
  2. `vault/AGENTS.md`
  3. `vault/beliefs/AGENTS.md`

Each worker must read and apply the entire chain before scanning files.

## Step 3 — Spawn one sub-agent per scope unit

For each scope unit, spawn a sub-agent using `sessions_spawn`:
- `runtime: "subagent"`
- `mode: "run"`
- `cwd: "<repo-root>"`
- `label: "agents-scan-<scope-slug>"`

### Worker model selection

Tune the worker to the scope type:
- Use `model: "codex"`, `thinking: "xhigh"` for code/config/tooling-heavy scopes such as the root residual scope, `system/`, and `cli/`.
- Use `model: "opus"`, `thinking: "high"` for markdown-heavy vault scopes.
- If a future scope is mixed, prefer the model that matches the dominant file type and rule style in that scope.

### Sub-agent task prompt

Each sub-agent receives a task like:

```
You are scanning for AGENTS.md violations in the brain repo.

Your assigned governing AGENTS file: <path>
Your assigned scope unit: <human-readable scope label>
Your AGENTS chain (read ALL of these before scanning):
1. ...
2. ...
3. ...

Your in-scope area:
- Include: <root directory or explicit residual paths>
- Exclude descendant AGENTS subtrees: <paths, if any>

Instructions:
1. Read every file in your AGENTS chain, top to bottom.
2. Build the exact in-scope file list by walking only your assigned scope unit.
3. Skip: AGENTS.md, CLAUDE.md, TEMPLATE.md, binary files, hidden files/dirs, node_modules/, dist/, vendor/.
4. For each in-scope file, check compliance with the rules in your AGENTS chain.
5. Fix clear, deterministic, low-risk violations directly (naming, formatting, frontmatter, missing links, stale references, comment violations, etc.).
6. Do NOT make speculative content changes, rewrite meaning, or perform broad stylistic rewrites.
7. Leave all changes UNSTAGED. Do not git add, commit, or push.
8. Report a summary:
   - Scope unit scanned
   - Files scanned
   - Violations found (with file path and rule violated)
   - Violations fixed
   - Violations left unfixed (with reason — e.g., ambiguous, risky, needs human judgment)
```

### Parallelism

All scope-unit workers may run in parallel only when their effective scopes are non-overlapping. Residual parent scopes must explicitly exclude descendant AGENTS subtrees so they do not collide with leaf workers.

Spawn all scope-unit sub-agents, then wait for completions via push-based events.

## Step 4 — Aggregate results

After all sub-agents complete:

1. Collect all child summaries.
2. Produce a final aggregate report:
   - Total scope units scanned
   - Total files scanned across all scope units
   - Total violations found / fixed / left unfixed
   - Per-scope summary (one line each)
   - Any child failures or timeouts
3. If any sub-agent failed, note it but do not treat it as a fatal error for the overall job.

## Output

Your response should be the aggregate summary report. This is a cron job with `delivery.mode: "none"`, so the output is normally logged rather than sent on successful runs.

## Constraints

- **[STRICT]** Do not stage, commit, or push any changes. All fixes remain unstaged.
- **[STRICT]** Do not run `brain-sync`.
- **[STRICT]** Do not modify files outside the assigned scope unit per sub-agent.
- **[STRICT]** Residual parent scopes must exclude descendant AGENTS subtrees.
- **[STRICT]** Only fix clear violations. When in doubt, leave the file alone and report the issue.
- **[STRICT]** Skip `deprecated/openclaw/**/AGENTS.md` and all `deprecated/openclaw/` content.
