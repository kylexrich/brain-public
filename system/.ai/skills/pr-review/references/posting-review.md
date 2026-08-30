# Posting the Review

Runs only after the user explicitly approved the drafts (SKILL.md step 9).
Post all approved comments as **one atomic review** — never one-by-one.

## Why this exact path

- `gh pr review` cannot attach line-anchored comments — it only submits
  whole-PR reviews.
- The standalone comments endpoint (`POST …/pulls/{n}/comments`) intermittently
  fails with opaque 422s (`pull_request_review_thread.base: internal error`)
  on payloads that succeed when nested in a review POST
  ([cli/cli#13358](https://github.com/cli/cli/issues/13358)).
- REST cannot append comments to an existing pending review (422: "a pending
  review already exists"), so the review must be complete in a single POST.

## Procedure

```sh
HEAD_SHA=$(gh pr view {N} -R {OWNER/REPO} --json headRefOid --jq .headRefOid)

cat > "$TMPDIR/review.json" <<EOF
{
  "commit_id": "$HEAD_SHA",
  "body": "<one- or two-sentence review summary, same style rules as comments>",
  "event": "COMMENT",
  "comments": [
    { "path": "src/app.ts", "line": 42, "side": "RIGHT",
      "body": "<approved comment text, verbatim>" },
    { "path": "src/app.ts", "start_line": 10, "start_side": "RIGHT",
      "line": 14, "side": "RIGHT",
      "body": "<multi-line-range comment: start_line..line>" }
  ]
}
EOF

gh api repos/{OWNER}/{REPO}/pulls/{N}/reviews --method POST --input "$TMPDIR/review.json"
```

**Expect:** JSON response with `"state": "COMMENTED"` and an `html_url` —
report that URL to the user.
**On fail:** a 422 usually means a comment anchors to a line not present in
the diff hunks — re-check each `path`/`line` against `gh pr diff` and retry
once; otherwise surface the error verbatim.

## Anchoring semantics

- `line` = the line number in the file blob as rendered in the diff;
  `side: "RIGHT"` = added/unchanged lines (the new file version),
  `"LEFT"` = deleted lines (the old version).
- Multi-line comments: `start_line` + `start_side` mark the first line;
  `line`/`side` mark the **last** line of the range.
- Every anchor must fall inside the diff hunks, and `commit_id` must be the
  current head SHA, or GitHub marks the comment outdated/rejects it.

## Hard rules

- `event` is always `"COMMENT"`. Never `APPROVE` or `REQUEST_CHANGES` — the
  verdict belongs to a human.
- The review `body` is a brief neutral summary. Explanation and Concern notes
  never appear in it.
- Post only each approved **Comment** question, verbatim. Explanation and
  Concern are chat-only context. Edits requested by the user are applied
  before posting, not silently.
