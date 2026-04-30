# OpenClaw aliases
# oc:  [session] [agent] [tui-args...]
# ocm: [agent] [tui-args...]  (main session only)

function oc() {
  local session="main"
  local agent="main"

  if [[ $# -gt 0 ]]; then
    session="$1"
    shift
  fi

  if [[ $# -gt 0 ]]; then
    if [[ "$1" == "main" || "$1" == "team" ]]; then
      agent="$1"
      shift
    elif [[ "$1" != -* ]]; then
      echo "Usage: oc [session] [main|team] [tui-args...]"
      return 1
    fi
  fi

  openclaw tui --session "agent:${agent}:${session}" "$@"
}

function ocm() {
  local agent="main"

  if [[ $# -gt 0 ]]; then
    if [[ "$1" == "main" || "$1" == "team" ]]; then
      agent="$1"
      shift
    elif [[ "$1" != -* ]]; then
      echo "Usage: ocm [main|team] [tui-args...]"
      return 1
    fi
  fi

  oc main "$agent" "$@"
}

alias ocg="openclaw gateway install" #"openclaw gateway"
alias ocgr="openclaw gateway restart"

ocres() {
  echo "🦞 Stopping gateway..."
  openclaw gateway stop
  echo "🦞 Bootstrapping launchd agent..."
  sudo launchctl bootstrap "gui/$UID" ~/Library/LaunchAgents/ai.openclaw.gateway.plist
  echo "🦞 Done."
}

ochelp() {
  echo "🦞 OpenClaw Shortcuts"
  echo "═══════════════════════════════════════════"
  echo "  oc [session] [agent] [tui-args...]      agent=main|team"
  echo "  ocm [agent] [tui-args...]               main session on main|team"
  echo "  ocg                                     Start gateway"
  echo "  ocgr                                    Restart gateway"
  echo "  ocres                                  Stop + bootstrap launchd agent"
  echo "  ochelp                                 Show this help"
  echo "═══════════════════════════════════════════"
}
