# Bootstrap Machine

## Quick rebuild order

0. Pre-rebuild exports (on old machine)
1. Initial setup (manual)
2. Terminal + tooling setup (script)
3. Applications download

## 0) Export settings (on current machine)

Export settings to `system/exports/` in this repo so they can be imported on the new machine.

**1. Export Raycast settings** — Raycast → Settings → Advanced → Export
**2. Export iTerm2 settings** — iTerm2 → Settings → General → Preferences → Save to folder

## 1) Initial setup (manual)

These steps require interaction, browser downloads, or a shell restart mid-way. Do them by hand in order.

**1. Download Google Chrome** — https://www.google.com/chrome/
**2. Download Raycast** — https://www.raycast.com/download (import settings from `system/exports/`)
**3. Download iTerm2** — https://iterm2.com/downloads.html (import settings from `system/exports/`)

**4. Install Homebrew** — https://brew.sh/
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**5. Install git and GitHub CLI, then authenticate**
- git — https://git-scm.com/download/mac
- gh — https://github.com/cli/cli/blob/trunk/docs/install_macos.md
```bash
brew install git
brew install gh
gh auth login
```

**6. Clone the brain repo**
```bash
mkdir -p ~/Developer
git clone https://github.com/kylexrich/brain.git ~/Developer/brain
cd ~/Developer/brain
npm install
```
Root `npm install` is the normal entrypoint and installs the CLI dependencies in `cli/` via `postinstall`.

**7. Install Oh My Zsh** — https://ohmyz.sh/#install
```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

**8. Create `.env` and prep shell customizations**
```bash
cp ~/Developer/brain/system/zshrc/.env.example ~/Developer/brain/system/zshrc/.env
```
Edit `~/Developer/brain/system/zshrc/.env` and fill in your actual values, then add this to `~/.zshrc`:
```bash
# Brain-managed shell customizations
if [[ -f "$HOME/Developer/brain/system/zshrc/.env" ]]; then
  source "$HOME/Developer/brain/system/zshrc/.env"
fi

if [[ -f "$HOME/Developer/brain/system/zshrc/custom.zsh" ]]; then
  source "$HOME/Developer/brain/system/zshrc/custom.zsh"
fi
```
Optional: set `PERSONAL_GOOGLE_ACCOUNT_EMAIL_ADDRESS` in `system/zshrc/.env` to force `brain contact resolve` (and skills like `job-daily-brief`) to use your personal Google account with `gog`. If unset, `gog` falls back to its default configured account, which is risky once multiple accounts are added.

**9. Install nvm + Node.js** — https://nodejs.org/en/download
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
\. "$HOME/.nvm/nvm.sh"
nvm install --lts
```

**10. Install Python** - https://www.python.org/downloads/macos/

## 2) Terminal + tooling setup (script)

```bash
#!/usr/bin/env bash
set -euo pipefail

# ── Shell plugins ──────────────────────────────────────────────

# Powerlevel10k — https://github.com/romkatv/powerlevel10k#installation
brew install powerlevel10k
echo 'source $(brew --prefix)/share/powerlevel10k/powerlevel10k.zsh-theme' >>~/.zshrc

# zsh-autosuggestions — https://github.com/zsh-users/zsh-autosuggestions
brew install zsh-autosuggestions

# zsh-syntax-highlighting — https://github.com/zsh-users/zsh-syntax-highlighting#installing
brew install zsh-syntax-highlighting

# autojump — https://github.com/wting/autojump
brew install autojump

# ── npm globals ────────────────────────────────────────────────

# openclaw — https://docs.openclaw.ai/install
npm install -g openclaw

# mcporter — https://github.com/steipete/mcporter
npm install -g mcporter

# @google/gemini-cli — https://github.com/google-gemini/gemini-cli
npm install -g @google/gemini-cli

# aws-cdk — https://docs.aws.amazon.com/cdk/v2/guide/cli.html
npm install -g aws-cdk

# prisma — https://www.prisma.io/docs/orm/tools/prisma-cli
npm install -g prisma

# ts-node — https://typestrong.org/ts-node/docs/installation/
npm install -g ts-node

# typescript — https://www.typescriptlang.org/download/
npm install -g typescript

# ── Standalone CLI installs ────────────────────────────────────

# Claude Code — https://code.claude.com/docs/en/quickstart
curl -fsSL https://claude.ai/install.sh | bash

# Bun — https://bun.sh/
# Required by the BlueBubbles channel runtime under
# system/.dot-claude/channels/bluebubbles/.
curl -fsSL https://bun.sh/install | bash

# AWS CLI — https://docs.aws.amazon.com/cli/latest/userguide/getting-started-quickstart.html
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
rm AWSCLIV2.pkg

# ── Additional CLI / developer tools ──────────────────────────

# libpq (PostgreSQL client libs) — https://www.postgresql.org/docs/current/libpq.html
brew install libpq

# Poppler (PDF tooling) — https://poppler.freedesktop.org/
brew install poppler

# SoX (audio processing CLI) — https://formulae.brew.sh/formula/sox
brew install sox

# ffmpeg / ffprobe (media processing) — https://ffmpeg.org/
# Required by stream download/transcribe and long-form TTS concatenation.
brew install ffmpeg

# yt-dlp (video downloader) — https://github.com/yt-dlp/yt-dlp
# Required by `brain stream download`.
brew install yt-dlp

# whisper-cpp (local speech tooling) — https://github.com/ggml-org/whisper.cpp
brew install whisper-cpp

# gogcli (Google Workspace CLI) — https://gogcli.sh
# Installs the `gog` binary used by contact resolution and Google workflows.
brew install gogcli

# imsg (iMessage / SMS CLI) — https://github.com/steipete/imsg
brew install steipete/tap/imsg

# openhue CLI (Philips Hue tooling) — https://github.com/openhue/homebrew-cli
brew install openhue/cli/openhue-cli

# ImageMagick (optional) — https://imagemagick.org/
# Used by `system/scripts/privacy.sh` when image flattening/resizing is needed.
# brew install imagemagick

# codex — https://github.com/openai/codex
brew install --cask codex

echo "✅ All done. Restart your shell to pick up new PATH entries and plugins."
```

**After the script finishes:**
- `ln -sf ~/Developer/brain/system/zshrc/mbp-m4max-16/.zshrc ~/.zshrc`
- `source ~/.zshrc`
- `~/Developer/brain/system/symlinks/mbp-m4max-16/symlinks.sh setup`
- `~/Developer/brain/system/symlinks/mbp-m4max-16/symlinks.sh verify`
- `~/Developer/brain/cli/bin/brain --help`
- `ochelp`
- `p10k configure`
- `bun --version`
- `ffmpeg -version`
- `yt-dlp --version`
- `claude` (prompts for Anthropic auth on first run)
- `codex` (prompts for OpenAI auth on first run)
- `gemini` (prompts for Google auth on first run)
- `gog auth list` (if empty, add your personal Google account before relying on Google workflows; set `PERSONAL_GOOGLE_ACCOUNT_EMAIL_ADDRESS` in `system/zshrc/.env` so commands and skills always target it explicitly)
- `openhue get room` (first-run auth/setup may be required depending on your Hue environment)

Note: `~/.zshrc` is not currently covered by `system/symlinks/mbp-m4max-16/symlinks.sh`, so the `ln -sf ... ~/.zshrc` step is still manual.

`imsg` also needs macOS permissions before it will work correctly:
- Full Disk Access for your terminal app
- Automation permission for your terminal app to control Messages.app

## 3) Application downloads

### 3.1 Productivity apps

| App                 | Install link                                                            |
|---------------------|-------------------------------------------------------------------------|
| Amphetamine         | https://apps.apple.com/us/search?term=Amphetamine                       |
| Bartender           | https://www.macbartender.com/                                           |
| Bear                | https://bear.app/                                                       |
| BusyCal             | https://www.busymac.com/busycal/                                        |
| CleanShot X         | https://cleanshot.com/                                                  |
| DaisyDisk           | https://daisydiskapp.com/                                               |
| Google Chrome       | https://www.google.com/chrome/                                          |
| Google Drive        | https://www.google.com/drive/download/                                  |
| Keyboard Maestro    | https://www.keyboardmaestro.com/                                        |
| Logi Options+       | https://www.logitech.com/en-us/software/logi-options-plus.html          |
| MacWhisper          | https://www.macwhisper.com/                                             |
| Raycast             | https://www.raycast.com/download                                        |
| Rectangle Pro       | https://rectangleapp.com/pro                                            |

### 3.2 Development apps

| App               | Install link                                            |
|-------------------|---------------------------------------------------------|
| Antigravity       | https://antigravity.google/download                     |
| Claude            | https://claude.ai/download                              |
| Codex             | https://chatgpt.com/codex/get-started                   |
| Docker Desktop    | https://www.docker.com/products/docker-desktop/         |
| Emdash            | https://github.com/generalaction/emdash/releases/latest |
| GitKraken         | https://www.gitkraken.com/download                      |
| IntelliJ IDEA     | https://www.jetbrains.com/idea/download/                |
| JetBrains Toolbox | https://www.jetbrains.com/toolbox-app/                  |
| pgAdmin           | https://www.pgadmin.org/download/pgadmin-4-macos/       |
| Sublime Text      | https://www.sublimetext.com/download                    |
| WebStorm          | https://www.jetbrains.com/webstorm/download/            |

### 3.3 Collaboration apps

| App         | Install link                    |
|-------------|---------------------------------|
| BlueBubbles | https://bluebubbles.app/        |
| Discord     | https://discord.com/download    |
| Fathom      | https://fathom.video/download   |
| Linear      | https://linear.app/download     |
| Slack       | https://slack.com/downloads/mac |
| Todoist     | https://todoist.com/downloads   |
| Zoom        | https://zoom.us/download        |

### 3.4 Media apps

| App                             | Install link                                                          |
|---------------------------------|-----------------------------------------------------------------------|
| DaVinci Resolve                 | https://www.blackmagicdesign.com/products/davinciresolve              |
| Elgato Camera Hub               | https://www.elgato.com/downloads                                      |
| Elgato Control Center           | https://www.elgato.com/downloads                                      |
| Elgato Stream Deck              | https://www.elgato.com/downloads                                      |
| Final Cut Pro Creator Studio    | https://apps.apple.com/us/app/final-cut-pro-create-video/id1631624924 |
| GarageBand                      | https://apps.apple.com/us/search?term=GarageBand                      |
| iMovie                          | https://apps.apple.com/us/search?term=iMovie                          |
| OBS                             | https://obsproject.com/download                                       |
