---
name: review-pr-comments
description: "Deeply triage and resolve every unresolved bot-authored review comment on a GitHub pull request or its full dependent PR stack: investigate each concern with repository context and subagents, implement robust fixes for material valid issues on the owning branches, resolve invalid or low-value threads with evidence, rebase and update the entire stack, and wait for checks to pass without waiting for another review cycle. Use when the user asks to review, address, fix, dismiss, or resolve automated PR feedback from bots such as Bugbot or CodeRabbit, especially across stacked PRs. Do not use for human-only feedback, read-only review, merging, or publishing PRs."
---

# Review PR Comments

Run one complete bot-feedback pass: snapshot, investigate, fix or dismiss, restack, update, wait for CI, resolve, and stop.

## Guardrails

- Work only on the target PR or its dependent stack and bot-authored feedback. Never resolve or reply to human threads.
- Treat invocation as authorization to make scoped fixes, commit and push the existing PR branches, and reply to and resolve the snapshotted bot threads. It does not authorize merging, creating or closing PRs, changing bases, changing draft/ready state, or posting announcements.
- Before mutation, verify the exact repository, checkout, GitHub identity, Git author, branch ownership, and every applicable `AGENTS.md`. Preserve unrelated work.
- Run exactly one review snapshot. Never invoke this skill recursively or restart it because a bot posts new feedback.

## Workflow

### 1. Freeze the scope

1. Resolve the target PR. Determine whether it is standalone or belongs to a dependent stack; for a stack, use `$gh-stack` and GitHub branch/base relationships to enumerate every open PR from bottom to top.
2. Record each PR's number, head/base branch, head SHA, URL, and draft state.
3. Snapshot every unresolved bot-authored review thread across every PR. Also read bot review bodies and top-level comments so non-inline action items and summary duplicates are understood. Record thread/comment IDs, author, path and line, body, state, and the snapshot cutoff.
4. Stop before mutation if the PR or stack membership is ambiguous. If the snapshot contains no bot feedback requiring a disposition, report that plainly and make no changes.

### 2. Investigate every item with a swarm

1. Spawn one read-only analyst per independent thread or tightly coupled cluster. Use additional independent analysts for security, data integrity, migrations, concurrency, rollout, mixed-version, or rollback concerns.
2. Give each analyst the raw comment, exact PR diff, relevant surrounding code, and applicable `AGENTS.md`; do not give it a preferred verdict. Require it to trace why the bot raised the point, try to disprove it against real callers and contracts, name a reachable failure mode and impact, identify the owning stack branch, and propose the smallest complete fix and validation.
3. Reconcile the results against the code. Classify every snapshotted item as:
   - **Fix:** a material, reachable correctness, security, data, contract, reliability, or maintainability concern.
   - **Resolve without code:** incorrect, already handled, duplicate, outdated, cosmetic, speculative, or too low-value to justify delaying the PR.
4. Keep an evidence-backed disposition ledger. Never implement a bot suggestion merely because it sounds plausible.

### 3. Implement on the correct branches

1. Keep one coordinator in control of the shared checkout and Git history. Let implementation subagents edit only isolated worktrees or clearly disjoint scopes, then integrate their patches deliberately.
2. Work bottom to top. Put each fix on the earliest branch whose responsibility owns the affected code or contract, even when the comment appeared higher in the stack. Follow the applicable repository patterns and validation policy; fix root causes without adjacent cleanup.
3. Validate each changed layer and the combined top-of-stack result. Commit only the comment-driven changes to their owning branches.
4. Fetch the current remote base, rebase the entire stack bottom to top, and rebase every descendant after a lower-layer change. Preserve stack order, PR boundaries, and unrelated commits. Update rewritten remote branches only with lease protection.

### 4. Update, wait, and resolve

1. Push every updated branch and verify each PR still has the recorded base and draft/ready state.
2. Wait for checks on every new PR head to reach a terminal passing state. Investigate and fix failures caused by this work, then update and wait again. If a required check cannot pass for an unrelated or external reason, report the blocker instead of claiming completion.
3. After all checks pass, close every snapshotted resolvable bot thread:
   - For a fix, reply with the concrete change and owning commit, then resolve.
   - For no-code dispositions, reply with the concise evidence-based reason, then resolve.
4. Re-query the snapshotted thread IDs and verify they are resolved. GitHub top-level reviews or comments may not support thread resolution; report their disposition explicitly rather than pretending they were resolved or posting redundant summary replies.

## Completion

Return a concise per-PR summary of each bot item and disposition, fix commits and branches, validation and check status, thread-resolution status, and any blocker. Confirm that draft/ready state was preserved.

Stop after the snapshotted comments are handled and the updated heads pass checks. Do not wait for bots to review again; later feedback requires a new invocation.
