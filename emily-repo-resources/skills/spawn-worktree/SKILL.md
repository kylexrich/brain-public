---
name: spawn-worktree
description: Use when the user wants the current task done in an isolated git worktree — phrasings like "spawn a worktree", "do this in a worktree", "work in a new worktree", or "isolate this in a worktree". Creates a named git worktree off the current working dir and runs everything there.
---

# Spawn Worktree

## Overview

Create a **named** git worktree off the current working directory, switch into it, and execute the requested task entirely inside it. That is the whole skill — there are no other requirements.

## Workflow

1. Create a **named** git worktree off the current working dir (use whatever native worktree tooling is available; otherwise fall back to `git worktree add <path> -b <branch-name>`). Derive the name from the task if the user did not give one. Switch the session into it.
2. Do the requested task inside that worktree. **Every** change happens in the worktree — never fall back to the base branch.

That's it. No planning docs, no commits, no rebase — unless the task itself asks for them.
