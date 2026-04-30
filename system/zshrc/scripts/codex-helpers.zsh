# --- Shared note blocks for Codex prompts (always used) ---
preamble_normal=$'You are operating in a write-enabled sandbox.\n\
After planning, you MUST execute your plan end-to-end immediately without a followup prompt.\n\
Do NOT wait for approval.\n'

preamble_force=$'OVERRIDE: APPLY CHANGES NOW.\n\
Do not stop after planning. Begin execution immediately.\n\
If a step seems risky, split it into safe sub-steps rather than pausing.\n'

codex60() {
  echo "codex --config 'model_auto_compact_token_limit=154800' $@"
  codex --config 'model_auto_compact_token_limit=154800' "$@"
}

codex70() {
  echo "codex --config 'model_auto_compact_token_limit=180600' $@"
  codex --config 'model_auto_compact_token_limit=180600' "$@"
}


delCodex() {
  # Ensure we're in a git repo
  if ! git rev-parse --git-dir &>/dev/null; then
    echo "❌ Not a git repository."
    return 1
  fi

  # ——— Local branches containing 'codex' ———
  local local_branches
  local_branches=$(git branch --list '*codex*' | sed 's/^[* ]*//')
  if [[ -z $local_branches ]]; then
    echo "ℹ️  No local branches containing 'codex'."
  else
    echo "🗑️  Deleting local branches containing 'codex':"
    echo "$local_branches"
    while IFS= read -r branch; do
      git branch -D "$branch"
    done <<<"$local_branches"
  fi

  # ——— Remote branches (origin) containing 'codex' ———
  local remote_branches
  remote_branches=$(git branch -r | grep -E 'origin/.*codex.*' | sed 's#^[[:space:]]*origin/##')
  if [[ -z $remote_branches ]]; then
    echo "ℹ️  No remote branches on 'origin' containing 'codex'."
  else
    echo "🗑️  Deleting remote branches on origin containing 'codex':"
    echo "$remote_branches"
    while IFS= read -r branch; do
      git push origin --delete "$branch"
    done <<<"$remote_branches"
  fi

  echo "✅ Done deleting all branches containing 'codex'."
}


function rbCodex() {

  # ---------- 1. Preconditions ------------------------------------------------
  if ! git rev-parse --git-dir &>/dev/null; then
    echo "❌  Not inside a git repository."
    return 1
  fi

  git fetch --all --prune --quiet   # make sure remotes are up‑to‑date

  local orig_branch
  orig_branch="$(git symbolic-ref --quiet --short HEAD)" || {
    echo "❌  Detached HEAD – please checkout a branch first."
    return 1
  }

  if [[ $orig_branch != *codex* ]]; then
    echo "❌  Current branch «$orig_branch» does NOT contain the string 'codex'."
    echo "    rebaseCodex expects you to start on one of the codex branches."
    return 1
  fi

  # ---------- 2. Gather candidate branches -----------------------------------
  #   * Local branches whose name matches *codex*
  #   * Remote branches origin/*codex* that do *not* already exist locally
  #
  local -a branches   # array
  # Local matches
  while IFS= read -r b; do branches+=("$b"); done \
        < <(git for-each-ref --format='%(refname:short)' refs/heads |
             grep -F 'codex' | grep -vFx "$orig_branch")

  # Remote matches (only origin/* to keep things sane)
  while IFS= read -r r; do
        local short="${r#origin/}"
        # Skip if corresponding local branch already exists
        if ! git show-ref --verify --quiet "refs/heads/$short"; then
          branches+=("$r")
        fi
      done \
        < <(git for-each-ref --format='%(refname:short)' refs/remotes/origin |
             grep -F 'codex' | grep -vFx "origin/$orig_branch")

  # Deduplicate & sort for deterministic order (any order was acceptable)
  branches=($(printf '%s\n' "${branches[@]}" | sort -u))

  if (( ${#branches[@]} == 0 )); then
    echo "ℹ️  No additional branches containing 'codex' were found."
    return 0
  fi

  echo "🔎  Will rebase the following branches onto each other:"
  for b in "${branches[@]}"; do echo "     • $b"; done
  echo "-----------------------------------------------------------------"

  # ---------- 3. Rebase loop ---------------------------------------------------
  local previous="$orig_branch"
  for ref in "${branches[@]}"; do
    local local_branch

    # --- 3a. Check out the branch (create local tracking branch if needed)
    if [[ $ref == origin/* ]]; then
      local_branch="${ref#origin/}"
      echo "▶️  Creating local branch '$local_branch' tracking '$ref'..."
      git checkout -B "$local_branch" "$ref" || {
        echo "❌  Failed to check out $ref"; return 1; }
    else
      local_branch="$ref"
      echo "▶️  Checking out local branch '$local_branch'..."
      git checkout "$local_branch" || { echo "❌  Checkout failed"; return 1; }
    fi

    # --- 3b. Rebase
    echo "🔄  Rebasing '$local_branch' onto '$previous'..."
    if ! git rebase "$previous"; then
      echo "⚠️  Rebase stopped due to conflicts on '$local_branch'."
      echo "    Resolve them, run 'git rebase --continue' (or --abort),"
      echo "    then rerun rebaseCodex to finish."
      return 1
    fi

    # --- 3c. Push (if the branch has a remote) -------------------------------
    if git config --get "branch.$local_branch.remote" &>/dev/null; then
      echo "⬆️  Pushing '$local_branch' (force‑with‑lease)..."
      git push --force-with-lease
    fi

    previous="$local_branch"   # next branch will sit on top of this one
    echo "✅  '$local_branch' successfully rebased."
    echo "-----------------------------------------------------------------"
  done

  # ---------- 4. Return to original branch ------------------------------------
  git checkout "$orig_branch" --quiet
  echo "🎉  All done!  Every codex branch now forms a single linear chain."
}
