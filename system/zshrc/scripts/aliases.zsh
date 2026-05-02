# Terminal art aliases
alias brb='bash "$BRAIN_ROOT/system/scripts/brb.sh"'
alias privacy='bash "$BRAIN_ROOT/system/scripts/privacy.sh"'
alias rbd='npm run ci && npm run dev'
alias dev='npm run dev'
# Claude Code — start with BlueBubbles iMessage channel (kyledvrich@gmail.com via claw user)
function claudebb() {
  command claude --dangerously-skip-permissions \
    --dangerously-load-development-channels server:bluebubbles-personal\
    --agent marv-imsg-personal \
    --resume "bluebubbles-personal"
    "$@"
}

function claudebbmarvsucks() {
  command claude --dangerously-skip-permissions \
    --dangerously-load-development-channels server:bluebubbles-marv-sucks \
    --agent marv-imsg-marv-sucks \
    --resume "bluebubbles-marv-sucks"
    "$@"
}

function claudebbemly() {
  command claude --dangerously-skip-permissions \
    --dangerously-load-development-channels server:bluebubbles-emly \
    --agent marv-imsg-marv-emly \
    --resume "bluebubbles-emly"
    "$@"
}

function claudecron() {
  command claude --dangerously-skip-permissions \
    --dangerously-load-development-channels server:scheduler \
    --resume "scheduler-main" \
    "$@"
}


function claude() {
  command claude --dangerously-skip-permissions "$@"
}
