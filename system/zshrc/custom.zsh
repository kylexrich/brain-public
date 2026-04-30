# Managed in ~/Developer/brain/system/zshrc/custom.zsh
# Sourced from ~/.zshrc

# Source all script modules
for _script in "$HOME/Developer/brain/system/zshrc/scripts/"*.zsh; do
  [[ -f "$_script" ]] && source "$_script"
done
unset _script
