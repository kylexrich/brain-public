---
name: publish-pr
description: "Post or publish a GitHub pull request ready for review and announce its canonical title and URL in Slack's pull-requests channel. Create a channel draft when direct posting is connector-blocked. Use whenever the user says post a PR, publish a PR, ready a PR, or post or publish this change as a PR. If no PR exists for the unambiguous target, invoke create-pr to create the draft prerequisite, then continue until the PR is non-draft and announced. Post and publish always mean ready for review and announced, never merely draft. Do not use when the user explicitly asks only to create, open, or draft a PR, or to merge or approve one."
---

# Publish PR

**Mission:** Ensure the intended PR exists, mark it ready for review, and announce it in Slack.

## Rules

1. **Treat post and publish literally.** `Post a PR`, `publish a PR`, `ready a PR`, and `post/publish this change as a PR` all authorize this complete workflow. A missing PR is only a prerequisite problem: invoke `$create-pr`, then continue publication. Never return a draft as the completed result of a post, publish, or ready request.
2. **Resolve or create exactly one PR.** Prefer an existing PR. When none exists and the intended delivery target is unambiguous, invoke `$create-pr` to create the draft prerequisite. Ask rather than guessing when the target or scope is ambiguous.
3. **Compose; do not duplicate.** `$create-pr` owns commit, rebase, push, PR copy, and creation. This skill owns ready-for-review state and announcement. Never reimplement creation steps here.
4. **Publish, never merge.** Mark the PR ready for review. Never merge, approve, change code, or modify an existing PR's title or body as part of publication.
5. **Use canonical PR data.** Fetch the current PR title, URL, repository, number, state, and draft status. Use the fetched title and URL in the announcement rather than potentially stale supplied text.
6. **Announce after verification.** Post to Slack only after verifying that the PR is open and ready for review.
7. **Fall back to a channel draft.** If Slack rejects the direct post because the connector blocks that channel type, create a draft in the resolved channel containing the exact announcement. The publication request authorizes this fallback; do not ask again.
8. **Preserve partial success.** If the announcement or its draft fallback fails after publication, leave the PR published and report the notification failure.

## Terminal Condition

A post, publish, or ready request is complete only when:

- exactly one intended PR exists and is open;
- its draft status is disabled;
- its canonical title and URL were posted to Slack's `pull-requests` channel, or the documented channel-draft fallback was created.

Stopping after `$create-pr` returns a draft is a workflow failure, not partial completion.

## Workflow

### 1. Resolve or create the PR

- Prefer an explicit PR URL or repository-qualified reference.
- Otherwise, resolve the supplied number or title within the repository established by the request or active conversation.
- When no explicit identifier is supplied, use the most recently created or unambiguously referenced PR in the active conversation.
- Query GitHub to confirm whether the target PR already exists.
- If no PR exists and the request identifies one unambiguous branch, worktree, or clearly scoped change, invoke `$create-pr`. The publication request authorizes its required commit, rebase, push, and draft-creation prerequisites for that exact scope. Fetch the resulting canonical PR before continuing.
- If no PR exists and the delivery target is ambiguous, or if multiple PRs remain plausible, ask one concise clarification question and stop.
- If `$create-pr` fails or cannot safely resolve the scope, preserve its partial result and stop without claiming publication.

### 2. Inspect the PR

- Fetch its canonical title, URL, repository, number, state, and draft status.
- If it is closed or merged, stop without posting to Slack.
- If it is open and already ready for review, treat it as published and continue to the announcement.
- If it is an open draft, continue to publication.

### 3. Publish and verify

- Prefer the available authenticated GitHub integration; use `gh` when necessary.
- Mark the draft PR ready for review.
- Fetch it again and require it to be open with draft status disabled before continuing.

### 4. Announce in Slack

- Use the available authenticated Slack integration to resolve the channel named `pull-requests`.
- Post exactly `<canonical PR title> - <canonical PR URL>` as a channel message.
- Add no extra prose or formatting to the channel message.
- Treat the authorized publication workflow as authorization for this paired announcement; do not ask for a second confirmation.
- If the connector rejects the direct post because it blocks that channel type, create a channel draft containing the exact same announcement. Do not use a draft to bypass rate limits or unrelated errors.
- If draft creation reports `draft_already_exists`, do not overwrite it; report that the channel already has an attached draft.
- When the fallback succeeds, retain the returned channel name and `channel_link` for the final response. Do not construct a workspace URL or hardcode a channel ID.

### 5. Report the result

Return the PR title and URL, whether it was created first, newly published, or already ready, and the Slack announcement outcome. When a draft fallback succeeds, include exactly `Draft created in [#<channel name>](<channel_link>) with the PR title and link.` so the user can jump directly to the channel.
