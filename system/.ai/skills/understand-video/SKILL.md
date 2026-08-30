---
name: understand-video
description: Analyze and summarize video content by extracting visual frames and transcribing audio. Use when asked to understand, watch, summarize, describe, or analyze what's in a video file.
user-invocable: true
allowed-tools:
  - Bash
  - Read
---

# Understand Video

Combines adaptive frame extraction (ffmpeg) with audio transcription (via the brain STT CLI, which wraps local whisper.cpp) to analyze any video file.

## Workflow

### Step 1: Extract frames

```bash
chmod +x ~/.claude/skills/understand-video/scripts/extract-frames.sh
~/.claude/skills/understand-video/scripts/extract-frames.sh /path/to/video.mp4 "$BRAIN_ROOT"/.ai/tmp/understand-video/frames/
```

Targets ~30 frames at adaptive intervals (2s–120s depending on length). Output: `frame_0001.jpg`, `frame_0002.jpg`, …

### Step 2: Transcribe audio

Skip if video has no dialogue (silent, music-only, screencasts without voiceover).

```bash
brain stt transcribe /path/to/video.mp4 --out "$BRAIN_ROOT"/.ai/tmp/understand-video/audio.txt
```

`brain stt transcribe` is the centralized STT entry point — it handles ffmpeg audio extraction and runs local whisper.cpp internally, so no separate extract step is needed. See the `speech-to-text` skill for full flag docs (language, format, etc.).

### Step 3: Read and synthesize

1. `ls "$BRAIN_ROOT"/.ai/tmp/understand-video/frames/` — confirm frame count
2. Read each `frame_NNNN.jpg` with the Read tool
3. Read `"$BRAIN_ROOT"/.ai/tmp/understand-video/audio.txt` for the transcript
4. Synthesize using the output template below

For videos >30 min or if context is tight, read every other frame.

## Output Template

```
## Summary
[1-2 paragraphs: what this video is, what it covers, who it's for]

## Key Moments
[Frame N (~Xs) — what's happening]
[Frame N (~Xs) — what's happening]
...

## Topics Covered
- [topic 1]
- [topic 2]

## Visual Notes
[Anything significant seen in frames not captured by audio]
```

## Notes

- Frame N timestamp ≈ `N × interval` seconds (interval printed by the script)
- Clean up after: `rm -rf "$BRAIN_ROOT"/.ai/tmp/understand-video/`
