# Managed in $BRAIN_ROOT/system/zshrc/custom.zsh
# Sourced from ~/.zshrc

# Source all script modules
export BRAIN_ROOT="${BRAIN_ROOT:-$HOME/Developer/brain}"
for _script in "$BRAIN_ROOT/system/zshrc/scripts/"*.zsh; do
  [[ -f "$_script" ]] && source "$_script"
done
unset _script
