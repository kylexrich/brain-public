---
name: speech-to-text
description: Transcribe audio files locally via the brain CLI (runs whisper.cpp on-device, no API key, no network). Use when Kyle asks to transcribe audio or convert speech to text.
user-invocable: true
allowed-tools:
  - Bash
---

# Speech-to-Text

All STT goes through the brain CLI so the binary path, model path, and audio normalization are centralized in one place (`cli/commands/stt/transcribe.ts`). Do not call `whisper`, `whisper-cli`, or any Python whisper package directly — the brain command wraps them with the correct arguments and clean stdout.

## Quick start

Transcript to stdout:

```bash
brain stt transcribe /path/to/audio.m4a
```

Write transcript to a file:

```bash
brain stt transcribe /path/to/audio.mp3 --out transcript.txt
```

Get structured segments with timestamps (JSON):

```bash
brain stt transcribe /path/to/audio.wav --format json
```

## Flags

- `--out <path>` — write transcript here instead of stdout.
- `--format txt|json` — `txt` (default) is plain text, `json` is the full whisper.cpp segment payload with timestamps.
- `--language <code>` — ISO 639-1 hint (`en`, `es`, `fr`, …) or `auto` (default).
- `--model <path>` — override the model (defaults to `ggml-large-v3-turbo.bin`).
- `--whisper-cli <path>` and `--ffmpeg <path>` — override binaries when needed.

## Accepted inputs

Anything ffmpeg can read: `mp3`, `m4a`, `wav`, `aac`, `caf`, `mp4`, `mov`, `webm`, etc. The command extracts a 16 kHz mono PCM WAV internally and cleans it up on exit.

## Notes

- Runs fully offline. Uses Metal GPU acceleration on Apple Silicon via whisper.cpp.
- For chunked long-form stream-video transcription (parallel workers + hallucination dedup), use `brain stream transcribe` instead — it's the specialized pipeline path.
- If the `brain` binary isn't on PATH, it lives at `~/Developer/brain/cli/bin/brain`.
