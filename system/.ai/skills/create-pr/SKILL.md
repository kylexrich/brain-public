---
name: create-pr
description: "Create a draft GitHub pull request or reuse an existing pull request from a target branch after committing its clearly scoped changes when needed and rebasing it onto the target remote's current staging branch, while preserving the user's active directory and checkout. Use only when the user explicitly asks to create, open, or draft a PR; when publish-pr invokes it as the prerequisite for a missing PR; or when an active skill, document, or instruction clearly requires draft PR creation. Never use this skill as the top-level workflow when the user says post a PR, publish a PR, or ready a PR. Those phrases require publish-pr, even when no PR exists yet. This skill never marks a PR ready or announces it. Do not use for drafting PR copy only, reviewing an existing PR, or without a concrete delivery reason."
---

# Create PR

**Mission:** Ensure the intended GitHub pull request exists, creating it as a draft when needed, without absorbing unrelated work or changing the user's active checkout.

## Rules

1. **Require a creation-only trigger.** Use this as the top-level workflow only for an explicit `create`, `open`, or `draft` request. Treat `post a PR`, `publish a PR`, and `ready a PR` as `$publish-pr` requests. If publication needs a missing PR created first, run this skill only as its prerequisite and return control to `$publish-pr`; never stop after creating the draft.
2. **Preserve the user's active context.** If the target changes are in another worktree or repository, never change the user's current working directory, branch, or checkout. Resolve the target path and run every command with that explicit working directory or `git -C <target>`. If the target is ambiguous, stop and ask.
3. **Commit the defined PR scope when needed.** A PR represents committed changes. If the intended PR changes are uncommitted, invoke the applicable commit workflow for exactly those changes; the active PR request or workflow requirement supplies the contextual authorization for that prerequisite commit. Never absorb unrelated work. Stop and ask only when the intended commit scope is ambiguous or no safe commit workflow is available.
4. **Respect repository policy.** Follow the applicable repository instructions, PR template, branch conventions, and required checks.
5. **Rebase onto current remote staging.** Immediately before PR creation, fetch the target remote's `staging` branch and rebase the target branch onto that freshly fetched ref. Never rely on a stale local `staging` branch. If the remote has no `staging` branch or the rebase conflicts, stop and report the blocker; abort a conflicted rebase before returning.
6. **Push safely.** The active create-PR request or workflow requirement authorizes the push required for that PR unless repository policy requires separate approval. Use a normal push for a new or unchanged remote branch. If the required rebase rewrote an already-published branch, use `--force-with-lease`, never `--force`, and only for the intended branch.
7. **Creation stops at draft only for creation requests.** Always create a new PR as a draft. Never mark a PR ready, demote an existing ready PR, or announce it. Ready-for-review publication and announcement belong to `$publish-pr`. When `$publish-pr` invoked this skill, return the draft PR to it so the overall post/publish request continues to ready-for-review state and announcement.
8. **Keep the body brief.** Prefer a useful short description over a comprehensive implementation narrative.

## Workflow

### 1. Resolve the target without changing active context

Identify the repository or worktree containing the changes from the user's request and task context.

- If it is not the user's active working directory, leave the active directory and checkout untouched. Use an explicit tool working directory or `git -C <target>` for all operations.
- Confirm the target branch, remote, intended base branch, status, commits, and full committed diff.
- If the target is on a detached HEAD, create a task-specific branch using the repository's branch convention before committing or creating the PR.
- Use the user's named base when provided; otherwise use the repository's remote default branch.
- Stop if the target branch is the base/default branch, has no commits to propose, or the head/base repositories cannot be resolved safely.
- When intended PR changes are uncommitted, invoke the applicable commit workflow with the exact in-scope paths. Leave unrelated changes untouched and outside the PR.
- Check for an existing PR from the same head branch. If one exists, return it instead of creating a duplicate. Never change its draft/ready state; `$publish-pr` owns readiness.

### 2. Check readiness

- Run or confirm any pre-PR checks required by the repository when they are not already current.
- Do not absorb unrelated changes or perform new implementation as part of this skill. If a required check fails, report it and stop unless the active request or workflow permits opening a draft despite the failure.

### 3. Rebase onto current remote staging

- Fetch the target remote's `staging` branch immediately before rebasing.
- Record the pre-rebase commit so the original state is identifiable if troubleshooting is needed.
- Rebase the target branch onto the freshly fetched remote-tracking `staging` ref.
- If conflicts occur, abort the rebase and report the conflicting files. Do not resolve conflicts by guessing.
- Reinspect the committed diff after the rebase to confirm the PR still contains only the intended changes.

### 4. Push the branch

- Push normally and set upstream tracking when needed.
- When the required rebase rewrote an existing remote branch, update only that branch with `--force-with-lease`.
- Never push unrelated refs or tags.

### 5. Collect relevant Linear links

- Prefer to include concrete Linear issue URLs already found in the user request, task context, branch or commit metadata, or related artifacts.
- Do not invent links or perform a broad issue search merely to fill the PR description. If no clear Linear link is available, omit it.

### 6. Write the title and description

Use the same title format as commits:

```text
<type>(<scope>): <imperative, observable outcome>
```

Use one primary type from `feat`, `fix`, `perf`, `docs`, `test`, `refactor`, `chore`, `build`, or `ci`; scope is optional. Use `perf` when the primary outcome is faster or more efficient behavior without changing the intended result.

Write the title as the observable result of merging the PR, not merely an implementation activity:

- Start with an imperative verb and name the specific behavior, capability, structural result, or operational effect delivered.
- Name the affected surface or actor when the scope does not make it obvious.
- Match the description to the primary type: a `feat` names the capability added or enabled and where; a `fix` names the failure prevented or correct behavior preserved; a `perf` title names the work removed or path made faster; other types name their concrete structural or operational result.
- Make the title stand alone in history and review lists; when read after “This change will,” it must state the full delivered result without help from the body.
- Prefer concrete results such as `add <capability> to <surface>`, `prevent <failure>`, `preserve <behavior>`, `remove <obsolete behavior>`, or `skip <work> on <path>`. Reject vague uses of `select`, `support`, `handle`, `update`, `restore`, `streamline`, `improve`, or `harden` that do not name the delivered behavior.
- Keep it concise, but prioritize clarity over an arbitrary character limit. Omit a trailing period and put issue or PR identifiers in metadata or the body instead of the title.
- Follow a stricter repository-required format when one exists.

For a single-commit PR, normally use the commit title unchanged. For a multi-commit PR, write a new title in the same format that represents the full PR diff rather than reusing one commit title that covers only part of it.

For a normal PR, target 100 words or fewer for authored body prose, excluding required checklists or template text. Read `system/.ai/skills/create-pr/references/pr-description-patterns.md`, then choose the smallest combination of sections that makes the full diff clear to a reviewer.

- Make the body answer, at a high level: **Why does this PR exist, and what does it do?**
- Treat the reference patterns as adaptable examples and their sections as composable building blocks, not mandatory templates.
- Mix and match headings from any pattern when that produces the clearest explanation, such as combining a problem statement with behavior-after bullets and a concise changes list.
- Keep only sections that contribute distinct information; general conciseness rules still apply.
- Explain the PR at a high level. Use concise change bullets when they make the implementation scope easier to scan.
- Include **Customer Changes** for meaningful customer-visible behavior or impact.
- Include **Benefits** only when there is a concrete, non-obvious benefit worth calling out. Never manufacture a benefit to satisfy the template.
- Prefer to include Linear links that were already found and clearly relate to the PR.
- Omit **Customer Changes**, **Benefits**, and the Linear line when they are not relevant.
- Do not repeat the title, list every file or commit, narrate implementation steps, add filler, or include speculative benefits.
- Add other sections only when repository policy requires them or the PR would be materially misleading without them.

For an explicit promotion-to-production PR:

- Use a simple one-line title and a simple one-line description.
- Do not add section headings or expand it into a release narrative.
- Include a directly relevant Linear link only if it fits naturally without making the description harder to scan.

### 7. Create or reuse and verify the PR

- Prefer the available authenticated GitHub integration; use `gh` when the integration cannot represent the repository, fork, head, base, or draft state correctly.
- When using `gh`, pass the body through a temporary file so Markdown newlines render correctly.
- Create a missing PR as a draft with the resolved head/base, then fetch it once to verify the title, body, branches, and draft status.
- If a PR already exists, return it without changing its draft/ready state. When this skill was invoked by `$publish-pr`, return the canonical PR identity so publication can continue.

## Response

Return the PR URL, title, head and base branches, draft/ready status, checks run, and any uncommitted files left outside the PR. If `$publish-pr` invoked this skill, hand back the canonical PR identity and stop; that skill owns readiness and announcement.
