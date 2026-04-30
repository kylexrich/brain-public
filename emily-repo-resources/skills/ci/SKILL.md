---
name: ci
description: Run CI checks before declaring work complete.
allowed-tools: Bash
---

# CI Skill

Run CI checks to validate changes.

## Trigger Phrases

- "run ci" or `$ci` (`/ci`)
- "check ci"
- "validate changes"

## Workflow

### 1. Worktree Environment Sync (If Applicable)

If you're running inside a Git worktree, remember that `.env` files are usually gitignored and **won't be copied** into the worktree by default. Before running CI:
- Ensure required env vars (like `DATABASE_URL` for Prisma) are present.
- Either copy `.env`/`app/.env` from your primary (non-worktree) repo directory, or export the needed variables in your shell.

### 2. Check Dependencies

Run `npm install` at the repo root first if any of the following are true:
- `node_modules/` is missing in the root or key packages (e.g. `app/node_modules/`, `client/node_modules/`).
- `git status` shows changes to any `package.json` or `package-lock.json`.
- `npm ls` reports missing dependencies (non-zero exit).

### 3. Run CI

```bash
npm run ci
```

**If CI fails:** Report the failure and do not claim completion.

**ESLint warnings:** Only fix if directly related to uncommitted changes, or if explicitly instructed.
