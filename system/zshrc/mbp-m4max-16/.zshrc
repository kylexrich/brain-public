# ~/.zshrc

# --- Prompt bootstrap ---------------------------------------------------------
# Keep this near the top. Anything that may prompt for input should stay above it.
[[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]] && source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"

# --- Shell framework, prompt theme, and navigation ---------------------------
# Oh My Zsh provides git aliases/helpers and completion glue.
# Powerlevel10k is the prompt theme (Homebrew-installed) plus personal config.
# autojump (`j <pattern>`) jumps to frequently-used directories — a navigation aid.
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME=""
plugins=(git)
source "$ZSH/oh-my-zsh.sh"

[[ -r /opt/homebrew/share/powerlevel10k/powerlevel10k.zsh-theme ]] && source /opt/homebrew/share/powerlevel10k/powerlevel10k.zsh-theme
[[ -r "$HOME/.p10k.zsh" ]] && source "$HOME/.p10k.zsh"

[[ -f /opt/homebrew/etc/profile.d/autojump.sh ]] && source /opt/homebrew/etc/profile.d/autojump.sh

# --- Personal Environment Setup (env, scripts, aliases, etc.) --------------------------------------------------------
# Personal config managed via the brain repo. Loads private .env (untracked) and
# the script bundle in $BRAIN_ROOT/system/zshrc/scripts/.
export BRAIN_ROOT="${BRAIN_ROOT:-$HOME/Developer/brain}"
[[ -r "$HOME/.local/bin/env" ]] && source "$HOME/.local/bin/env"
[[ -r "$BRAIN_ROOT/system/zshrc/.env" ]] && source "$BRAIN_ROOT/system/zshrc/.env"
[[ -r "$BRAIN_ROOT/system/zshrc/custom.zsh" ]] && source "$BRAIN_ROOT/system/zshrc/custom.zsh"

# --- PATH additions -----------------------------------------------------------
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
export PATH="$HOME/.antigravity/antigravity/bin:$PATH"
export PATH="$BRAIN_ROOT/cli/bin:$PATH"

# --- Language toolchains ------------------------------------------------------
# Node.js via nvm.
export NVM_DIR="$HOME/.nvm"
[[ -s "$NVM_DIR/nvm.sh" ]] && source "$NVM_DIR/nvm.sh"
[[ -s "$NVM_DIR/bash_completion" ]] && source "$NVM_DIR/bash_completion"

# Bun.
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
[[ -s "$HOME/.bun/_bun" ]] && source "$HOME/.bun/_bun"

# --- Google Cloud SDK --------------------------------------
[[ -f "$HOME/google-cloud-sdk/path.zsh.inc" ]] && source "$HOME/google-cloud-sdk/path.zsh.inc"
[[ -f "$HOME/google-cloud-sdk/completion.zsh.inc" ]] && source "$HOME/google-cloud-sdk/completion.zsh.inc"

# --- OpenClaw --------------------------------------
[[ -r "$HOME/.openclaw/completions/openclaw.zsh" ]] && source "$HOME/.openclaw/completions/openclaw.zsh"

# --- Interactive shell UX (keep last) ----------------------------------------
# Autosuggestions and syntax highlighting hook into ZLE; per upstream guidance
# syntax-highlighting must be sourced last so other plugins don't override its
# widget bindings. Anything that draws on the command line belongs here.
[[ -r /opt/homebrew/share/zsh-autosuggestions/zsh-autosuggestions.zsh ]] && source /opt/homebrew/share/zsh-autosuggestions/zsh-autosuggestions.zsh
[[ -r /opt/homebrew/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh ]] && source /opt/homebrew/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
