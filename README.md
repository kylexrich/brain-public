# Brain

Kyle's second brain and AI agent hometown.

This is a public mirror of my private working repo. It holds of my core (non-project-specific) AI configuration, shell setup, CLI tooling, (obsidian-like) knowledge-graph, and macOS bootstrap that powers my (most) of my non-development workflows.

Leave a GitHub Issue, or email me at kylexrich@gmail.com if you have any questions.

## Why this exists

I was tired of scattering AI config and scripts across a million places without unified git diff tracking. So I moved everything into one repo and symlinked where necessary. Once the scaffolding was there, it felt natural to build additional project-agnostic components and position this repo for growth over time.

## Repository layout

```
cli/               — Brain CLI (oclif, TypeScript)
deprecated/
  openclaw/        — Legacy OpenClaw runtime archive (not actively used)
system/            — Machine config (AI config, shell, bootstrap, symlinks)
  .ai/             — Source of truth for global instructions and active skills, plus retired AI archives
  .dot-claude/     — Configuration for Claude Code and Claude Desktop (CLAUDE.md and skills are symlinks into .ai/)
  .dot-codex/      — Configuration for OpenAI Codex (AGENTS.md and skills are symlinks into .ai/)
  bootstrap-system.md — macOS setup guide
  credentials/     — Private local OAuth/client credential storage (excluded)
  symlinks/        — Per-machine symlink manifests + apply scripts
  zshrc/           — Shell config sourced by ~/.zshrc
  scripts/         — Small terminal utilities
vault/             — Knowledge graph (only conventions are public; content is private)
```

`AGENTS.md` files throughout are the rules-of-the-road for AI contributors — additive, hierarchical, nearest-wins. `CLAUDE.md` files next to them are symlinks to their sibling `AGENTS.md`.

## The Brain CLI

A TypeScript oclif CLI under `cli/` used exclusively by AI agents. Topics:

- **`contact`** — Cross-source contact lookup (Google Contacts + macOS Address Book).
- **`music`** — Apple Music on Sonos: queue an artist's albums, queue a playlist, set exact group volume.
- **`stream`** — YouTube VOD pipeline: discover livestreams, download, transcribe locally, chunk, sync + publish metadata.
- **`image`** — Gemini image generation/editing plus direct PNG uploads to the signed-in CleanShot Cloud account.
- **`stt` / `tts`** — On-device whisper.cpp transcription and Microsoft Edge text-to-speech.
- **`repo`** — Maintenance: `AGENTS.md` header injection, public-mirror export, AI config sync, skill-folder sync.
- **`token`** — OAuth rotation (YouTube).

External tools needed: `ffmpeg`, `ffprobe`, `whisper-cli` (whisper.cpp, `brew install whisper-cpp`), `yt-dlp`, `gog` (Google Contacts), Sonos discovery (bundled at `cli/bin/`), `curl`.



## AI configuration

`system/.dot-claude/` and `system/.dot-codex/` are the real AI configs symlinked out to `~/.claude`, `~/.codex`, etc.

- **Codex config** (`system/.dot-codex/`) — For OpenAI Codex.
- **Claude config** (`system/.dot-claude/`) — For Claude.
- **Skills** — Apple Notes, Reminders, Hue, Sonos, whisper transcription, image gen, video understanding, lightweight product definition before detailed planning, task planning with dedicated user-behavior and contract review artifacts, task execution, plan validation, symlink management, public-mirror auditing and publication, scheduled-job skills, and more. Skills may be composed by another active skill, document, or instruction when it clearly requires them; this contextual invocation does not authorize unrelated work. Private Brain sync does not publish the public mirror unless that separate operation is explicitly requested. Authored once in `system/.ai/skills/` (the source of truth); each tool's `skills/` folder is a symlink to it, ensured by `brain repo sync-skills` on every build. There are no generated copies.
- **Subagents** (`/agents/`) — CLI-invoked iMessage handlers for a personal 1:1 and a group chat.
- **BlueBubbles MCP server** (`system/custom-mcp/bluebubbles/`) — A self-built HTTP MCP that bridges [BlueBubbles](https://bluebubbles.app/) iMessage into Claude sessions. Webhook-driven; one daemon serves many sessions.
- **Scheduler MCP server** (`system/custom-mcp/scheduler/`) — Runs persistent cron and one-shot jobs. Spawned-run logs are grouped into filesystem-safe job-name subdirectories under the ignored `system/custom-mcp/scheduler/runs/` directory.
- **Scheduled tasks** (`/scheduled-tasks/`) — Morning brief, video-processing pipeline, OAuth refresh, health nags, stream-light control, and a thrice-daily production log-health check that posts a digest to Slack.


## System layer

- `system/bootstrap-system.md` — End-to-end macOS setup (Homebrew, tools, shell, auth flows, symlinks).
- `system/symlinks/` — Per-machine manifest plus apply / teardown / verify script. The repo owns every config file; the manifest routes each one to where its tool expects it.
- `system/zshrc/` — Modular shell config sourced from `~/.zshrc`.
- `system/scripts/` — Small terminal utilities.

## The vault

`vault/` is a lightweight, standalone knowledge graph — Obsidian-adjacent but file-only. One folder per content type (`beliefs/`, `concepts/`, `experiences/`, `ideas/`, `thoughts/`, `sources/`, `quotes/`, `goals/`, `notes/`, and others), with required frontmatter, strict bidirectional linking, and duplicate-prevention rules enforced in `AGENTS.md` at every level.

Only the conventions ship in this mirror; the notes themselves are private.

## About this mirror

Generated by `brain repo export-public` from the allowlist, exclusions, sanitizers, and verifiers in `.public-export.json`. The authoritative public/private policy and complete audit, export, commit, leak-recovery, and push workflow live in `$brain-public-export` at `system/.ai/skills/brain-public-export/SKILL.md`.

Do not edit this generated mirror directly. It intentionally exposes reusable structure and tooling while withholding private source content.

## Borrowing or forking

### Borrowing a skill or the MCP server

Copy the relevant directory or file into your own setup. Many of the skills, agents, mcp servers, configurations, etc. are mostly self-contained by design. 

The BlueBubbles MCP server has its own `package.json` under `system/custom-mcp/bluebubbles/`; `npm install` + wire up the env vars and run it.

### Forking the whole thing

If you want the full setup on your own machine:

1. Fork and rename as you like.
2. Edit everything that is redacted (e.g. `<BLUEBUBBLES_GROUP_CHAT_ID>`), hard-codes personal values like `kylexrich@gmail.com`, `kylerich` or `/Users/kylerich/`, etc.
3. Supply your own credentials in `system/zshrc/.env`.
4. Work through (adapted) `system/bootstrap-system.md`.
5. Apply symlinks with the per-machine script under `system/symlinks/`.
6. Run `npm run build` (or `brain repo sync-ai && brain repo sync-skills && brain repo sync-instructions`) to ensure the CLAUDE.md → AGENTS.md symlinks and the per-tool skills/instructions symlinks.

I don't promise a smooth path. This is personal plumbing, not a distributable framework.
