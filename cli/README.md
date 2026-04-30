### Commands

#### `brain contact`

| Command | Purpose |
| --- | --- |
| `resolve` | Cross-source contact lookup across Google Contacts and macOS Address Book. |

#### `brain image`

| Command | Purpose |
| --- | --- |
| `generate` | Generate a new image from a prompt or edit an existing one (Gemini API). |

#### `brain music`

| Command | Purpose |
| --- | --- |
| `applemusic` | Query Apple Music library data (playlists, library, status). |
| `play-artist` | Queue all albums for an Apple Music artist onto a Sonos group. |
| `play-playlist` | Queue an Apple Music library playlist onto Sonos. |
| `volume-set` | Set exact volume on every speaker in a Sonos group. |

#### `brain repo`

| Command | Purpose |
| --- | --- |
| `agents-header` | Inject AGENTS.md precedence headers across the repo. |
| `export-public` | Build the sanitized `brain-public` mirror from the allowlist in `.public-export.json`. |
| `sync-ai` | Regenerate `CLAUDE.md` stubs from `AGENTS.md` files. |

#### `brain stream` (YouTube VOD pipeline)

| Command | Purpose |
| --- | --- |
| `discover` | Find completed YouTube livestreams for a given date and scaffold a work dir. |
| `download` | Download a VOD locally. |
| `transcribe` | Build a transcript JSON using local whisper.cpp. |
| `chunk-transcript` | Split a transcript into timestamped files for downstream analysis. |
| `youtube-auth` | Run the YouTube OAuth flow and store the token. |
| `youtube-sync` | Pull YouTube metadata for a given video ID. |
| `youtube-publish` | Push local title/description back to YouTube. |

#### `brain stt` / `brain tts`

| Command | Purpose |
| --- | --- |
| `stt transcribe` | On-device transcription via whisper.cpp — no network, no API key. |
| `tts synthesize` | Synthesize MP3 via Microsoft Edge TTS, chunked and stitched with ffmpeg. |

#### `brain token`

| Command | Purpose |
| --- | --- |
| `refresh-attio` | Refresh the Attio OAuth token and sync mcporter configs. |
| `refresh-youtube` | Refresh the YouTube OAuth token near expiry. |