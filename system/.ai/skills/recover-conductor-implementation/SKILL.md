---
name: recover-conductor-implementation
description: "Returns the authoritative current implementation to its proper native local Conductor worktree when expected files, diffs, or commits are missing from Conductor or work continued in another or temporary worktree. Use only for this location-recovery scenario. Preserve Git state exactly: committed work remains the same commits, staged work remains staged, unstaged work remains unstaged, and untracked work remains untracked. Do not use for rollbacks, historical restoration, ordinary Git operations, or new implementation work."
---

# Recover Conductor Implementation

Get the current work back into its proper native Conductor location without changing the work or how Git represents it.

## Required outcome

Use the conversation and live repository state to identify the correct Conductor workspace and the authoritative current implementation. Put that complete state in the correct workspace. A stale destination branch or HEAD is not the state to preserve merely because it is already there.

Preserve fidelity exactly:

- Existing commits remain the same commits with the same SHAs, parents, order, and boundaries. Never flatten committed work into an unstaged diff or recreate it as different commits.
- The intended branch or ref and HEAD belong in the Conductor workspace. Treat temporary branches and worktrees as possible sources, not automatically as the final location.
- Staged changes remain staged, unstaged changes remain unstaged, and untracked files remain untracked.
- File contents, deletions, renames, modes, and symlinks remain unchanged.
- Unrelated work remains intact. Never substitute older code, discard current work, or rewrite history.

Choose the safest appropriate Git and worktree operations from the actual state; this skill defines the result, not a command recipe. Use all available context before asking the user. If multiple materially different states remain equally plausible, stop before mutation and ask one narrow question.

Verify the destination against the authoritative source across branch/ref identity, HEAD and commit topology, index, working tree, and untracked files. Do not remove the last recoverable copy until that equivalence is proven. If the exact state is already present, leave it untouched and report that the remaining issue is only the Conductor view.

Report the source, destination, resulting branch and HEAD, preserved commit range, preserved staged/unstaged/untracked state, and the equivalence checks performed.
