# ~/.zshrc

# --- Prompt bootstrap ---------------------------------------------------------
# Keep this near the top. Anything that may prompt for input should stay above it.
[[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]] && source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"

# --- Oh My Zsh ---------------------------------------------------------------
# Intentionally kept for git aliases/helpers and completion glue.
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME=""
plugins=(git)
source "$ZSH/oh-my-zsh.sh"

# --- Powerlevel10k prompt ----------------------------------------------------
# Load the theme from Homebrew, then apply personal prompt settings.
[[ -r /opt/homebrew/share/powerlevel10k/powerlevel10k.zsh-theme ]] && source /opt/homebrew/share/powerlevel10k/powerlevel10k.zsh-theme
[[ -r "$HOME/.p10k.zsh" ]] && source "$HOME/.p10k.zsh"

# --- Shell helpers ------------------------------------------------------------
# Local helper scripts and machine-specific environment.
export BRAIN_ROOT="${BRAIN_ROOT:-$HOME/Developer/brain}"
[[ -r "$HOME/.local/bin/env" ]] && source "$HOME/.local/bin/env"
[[ -f /opt/homebrew/etc/profile.d/autojump.sh ]] && source /opt/homebrew/etc/profile.d/autojump.sh
[[ -r "$BRAIN_ROOT/system/zshrc/.env" ]] && source "$BRAIN_ROOT/system/zshrc/.env"
[[ -r "$BRAIN_ROOT/system/zshrc/custom.zsh" ]] && source "$BRAIN_ROOT/system/zshrc/custom.zsh"

# --- PATH additions -----------------------------------------------------------
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
export PATH="$HOME/.antigravity/antigravity/bin:$PATH"
export PATH="$BRAIN_ROOT/cli/bin:$PATH"

# --- Node.js -----------------------------------------------------------------
export NVM_DIR="$HOME/.nvm"
[[ -s "$NVM_DIR/nvm.sh" ]] && source "$NVM_DIR/nvm.sh"
[[ -s "$NVM_DIR/bash_completion" ]] && source "$NVM_DIR/bash_completion"

# --- OpenClaw ----------------------------------------------------------------
[[ -r "$HOME/.openclaw/completions/openclaw.zsh" ]] && source "$HOME/.openclaw/completions/openclaw.zsh"

# --- Google Cloud SDK ---------------------------------------------------------
[[ -f "$HOME/google-cloud-sdk/path.zsh.inc" ]] && source "$HOME/google-cloud-sdk/path.zsh.inc"
[[ -f "$HOME/google-cloud-sdk/completion.zsh.inc" ]] && source "$HOME/google-cloud-sdk/completion.zsh.inc"

# --- Interactive shell UX -----------------------------------------------------
# Syntax highlighting should stay last.
[[ -r /opt/homebrew/share/zsh-autosuggestions/zsh-autosuggestions.zsh ]] && source /opt/homebrew/share/zsh-autosuggestions/zsh-autosuggestions.zsh
[[ -r /opt/homebrew/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh ]] && source /opt/homebrew/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh

# bun completions
[[ -s "$HOME/.bun/_bun" ]] && source "$HOME/.bun/_bun"

# bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
