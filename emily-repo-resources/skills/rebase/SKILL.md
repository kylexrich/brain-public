---
name: rebase
description: Rebase current branch onto a target commit SHA, resolving conflicts with context-aware judgment.
allowed-tools: Bash, Read, Glob, Grep, Edit, AskUserQuestion
---

# Rebase Skill

Rebase the current local branch onto a target commit SHA, resolving conflicts by first understanding the *full change arc* (both sides’ goals) and the *set of commits that produced the conflict*, then integrating those objectives into a coherent result.

## Trigger Phrases

* `$rebase <sha>` (`/rebase <sha>`)
* “rebase onto <sha>”

## Input

**Required:** A commit SHA (full or abbreviated). **Branch names are not supported.**

If the user provides a branch name, ask for the commit SHA instead.

## Definitions

* **Target:** `<target-sha>` (the commit you want as the new base)
* **Current:** `HEAD` (the tip of your current branch)
* **Fork point:** `FORK = merge-base(HEAD, <target-sha>)`
* **Our commits (to replay):** `FORK..HEAD`
* **Their commits (new base changes):** `FORK..<target-sha>`

## Workflow

### Phase 0: Preconditions and Safety

1. **Validate target is a commit SHA**

   ```bash
   git rev-parse --verify <target-sha>^{commit}
   ```

2. **Ensure we are on a branch (not detached)**

   ```bash
   git symbolic-ref --short HEAD
   ```

3. **Require a clean working tree**

   ```bash
   git status --porcelain
   ```

   * If dirty: ask the user whether to stash/commit, then proceed once clean.

4. **Capture baseline state (for reporting and recovery)**

   ```bash
   git rev-parse HEAD
   git log --oneline -15
   git status
   ```

5. **Compute fork point and ranges**

   ```bash
   FORK=$(git merge-base HEAD <target-sha>)
   echo "FORK=$FORK"
   git log --oneline "$FORK"..HEAD
   git log --oneline "$FORK"..<target-sha>
   ```

6. **Create a local safety backup branch**

   ```bash
   BRANCH=$(git symbolic-ref --short HEAD)
   TS=$(date +"%Y%m%d-%H%M%S")
   git branch "backup/${BRANCH}-pre-rebase-${TS}" HEAD
   ```

7. **Enable rerere locally (helps with repeated conflict patterns)**

   ```bash
   git config rerere.enabled true
   git config rerere.autoupdate true
   ```

8. **Detect whether our range contains merge commits**

   ```bash
   git rev-list --merges "$FORK"..HEAD --count
   ```

   * If > 0, prefer preserving merges with `--rebase-merges` (safer default).

---

### Phase 1: Gather Context (High-level Understanding Before Rewriting Anything)

Goal: Understand what the overall work is trying to accomplish, and where conflicts are likely.

1. **Read full commit messages for both sides**

   ```bash
   git log --format="%H%n%s%n%B%n---" "$FORK"..HEAD
   git log --format="%H%n%s%n%B%n---" "$FORK"..<target-sha>
   ```

2. **Identify “hotspot” files and overlap (predict conflicts)**

   ```bash
   git diff --name-only "$FORK"..HEAD | sort -u > /tmp/ours_files.txt
   git diff --name-only "$FORK"..<target-sha> | sort -u > /tmp/theirs_files.txt
   comm -12 /tmp/ours_files.txt /tmp/theirs_files.txt | sed 's/^/OVERLAP: /'
   ```

3. **If the overlap includes “source of truth” docs or contracts, read them now**

   * Use repository conventions to locate these quickly (examples): `docs/`, `AGENTS.md`, `README`, API specs, schemas, “task” documents, etc.
   * Prefer reading the document(s) that the commits themselves modify or reference.

---

### Phase 2: Start Rebase

Use an explicit, fork-point-based rebase so it is unambiguous what is being replayed.

* **If no merges in our range:**

  ```bash
  git rebase --onto <target-sha> "$FORK"
  ```

* **If merges exist in our range (safer default):**

  ```bash
  git rebase --rebase-merges --onto <target-sha> "$FORK"
  ```

If it succeeds: proceed to Phase 4.

If it reports conflicts: proceed to Phase 3.

---

### Phase 3: Resolve Conflicts (Context-aware, Commit-aware Integration)

**Principle:** Do not “pick ours/theirs” blindly. For each conflict, first understand:

* what the *current commit being replayed* is trying to do,
* what the *target-side commits touching the same area* are trying to do,
* what *later commits in our series* will expect the code to look like.

Maintain a running “conflict resolution log” (file → decision) to summarize at the end.

#### 3A) Identify conflict set and current replayed commit

1. **List conflicted files**

   ```bash
   git status
   git diff --name-only --diff-filter=U
   ```

2. **Identify the commit currently being applied**

   ```bash
   git rev-parse --verify REBASE_HEAD
   git show --stat --oneline REBASE_HEAD
   git show REBASE_HEAD
   ```

#### 3B) For each conflicted file, gather *all relevant commit context before editing*

For each `<file>` in the conflict list:

1. **List our commits that touch the file (entire replay range, ordered)**

   ```bash
   git log --oneline --reverse "$FORK"..HEAD -- <file>
   ```

2. **List their commits that touch the file (base changes we are rebasing onto)**

   ```bash
   git log --oneline --reverse "$FORK"..<target-sha> -- <file>
   ```

3. **Inspect the most relevant patches**

   * Always inspect:

      * the current replay commit: `REBASE_HEAD`
      * the closest (most recent) target-side commit touching the file
      * any later commits in our series that also touch this file (to avoid resolving into a shape our later commits will immediately break)

   Commands:

   ```bash
   git show REBASE_HEAD -- <file>
   # pick key commits from the logs above:
   git show <sha> -- <file>
   ```

4. **Use index stages to view base/ours/theirs if helpful**

   ```bash
   git show :1:<file>  # common ancestor (if present)
   git show :2:<file>  # ours (pre-merge stage)
   git show :3:<file>  # theirs (incoming stage)
   ```

5. **Read the full file in the working tree**

   * Use `Read` to see full context, not just the conflict hunk.

#### 3C) Resolve with best judgment (default path)

**Objective:** Produce code that satisfies **both sides’ intent**, choosing the better design where they differ, while preserving behavior.

Common resolution patterns:

* **Refactor vs feature:** keep the refactor *and* reapply the feature in the refactored structure.
* **Deletion vs modification:** confirm why deletion happened; if deletion was cleanup but behavior is still needed, reintroduce behavior in the new location/pattern.
* **Two implementations of same goal:** choose the clearer/safer design, but ensure all use cases remain covered.
* **API/schema/contract conflicts:** treat the contract as the arbiter; align both sides to the intended contract and update call sites accordingly.

Also prefer **forward-compatible resolution**:

* If your branch has later commits that reshape the file, resolve the conflict in a way that matches that later direction *as long as it still honors the current commit’s intent*. This reduces repeated conflicts and produces a cleaner final state.

#### 3D) Ask the user only when objectives are mutually exclusive (rare)

Ask only if:

* the behaviors cannot logically coexist, or
* the correct behavior is a business/product decision that cannot be inferred.

When asking, be concrete:

* file(s)
* what each side does
* why both cannot be true simultaneously
* the exact decision options

#### 3E) Stage and continue

1. **Edit to resolve**, then:

   ```bash
   git add <file>
   ```

2. **Sanity check for unresolved markers**

   ```bash
   git diff --check
   git grep -n '<<<<<<<\|=======\|>>>>>>>' -- .
   ```

3. **Continue**

   ```bash
   git rebase --continue
   ```

4. **If Git reports an empty commit**

   * If the change is already present due to target-side work or earlier resolutions:

     ```bash
     git rebase --skip
     ```
   * If unsure, inspect what would have changed (`git show REBASE_HEAD`) and only then decide.

Repeat until the rebase completes or is aborted.

---

### Phase 4: Verification (Post-rebase)

1. **Confirm clean status**

   ```bash
   git status
   ```

2. **Verify history looks right**

   ```bash
   git log --oneline -20
   ```

3. **Compare intent of old vs new series (high signal check)**

   * Use the backup branch created earlier:

   ```bash
   OLD="backup/${BRANCH}-pre-rebase-${TS}"
   git range-diff "$FORK"..$OLD <target-sha>..HEAD
   ```

   (If you captured `FORK`/`OLD`/`TS`, use those exact values.)

4. **Run CI**

   * Follow the `$ci` (`/ci`) skill.
   * Rebase is not considered complete until the `$ci` (`/ci`) skill has been run and passes, unless the user explicitly opts out.

5. **Report summary**

   * Target SHA and fork point
   * Count of commits replayed
   * Conflicts encountered (files + brief decisions)
   * Any user decisions requested (and outcome)

---

## Abort Handling

If the rebase cannot be completed safely:

```bash
git rebase --abort
```

Then explain:

* what failed (which commit/file),
* what remains ambiguous,
* and that the backup branch exists to restore the pre-rebase state.

---

## Important Rules

1. **Only accept commit SHAs** — reject branch names.
2. **Never force-push** — this skill only performs a local rebase.
3. **Understand before changing** — for every conflict, examine the *current replay commit*, the *target-side commits touching the file*, and *later commits in our series* before editing.
4. **Support both objectives** — integrate intent unless genuinely impossible.
5. **Ask only when necessary** — only for mutually exclusive business/logic decisions.
6. **Verify after** — range-diff + conflict-marker scan + CI.
