---
name: open-conductor-workspace
description: "Opens the current local Conductor workspace root as a PyCharm project. Use when Kyle asks to open, launch, or view the active Conductor workspace in PyCharm. Do not use for non-Conductor directories, cloud workspaces, or requests to open only `.context`."
---

# Open Conductor Workspace

**Mission:** Open the active local Conductor workspace root in PyCharm and report the exact path opened.

## Preconditions

Stop and explain the unmet condition unless all of the following are true:

- The user explicitly asked to open the current Conductor workspace in PyCharm.
- `CONDUCTOR_IS_LOCAL` equals `1`.
- `CONDUCTOR_WORKSPACE_PATH` is an absolute path to an existing directory.
- The `pycharm` launcher is available on `PATH`.

Do not fall back to the current directory or `CONDUCTOR_ROOT_PATH`; either could open the wrong checkout.

## Execution

Run:

```zsh
workspace_path="${CONDUCTOR_WORKSPACE_PATH:-}"

if [[ "${CONDUCTOR_IS_LOCAL:-0}" != "1" ]]; then
  print -u2 "This skill requires a local Conductor workspace."
  exit 1
fi

if [[ "$workspace_path" != /* || ! -d "$workspace_path" ]]; then
  print -u2 "CONDUCTOR_WORKSPACE_PATH is not an existing absolute directory."
  exit 1
fi

if ! command -v pycharm >/dev/null 2>&1; then
  print -u2 "The pycharm launcher is not available on PATH."
  exit 1
fi

pycharm "$workspace_path"
```

Report the absolute workspace path that was opened. Do not open only its `.context` directory.
