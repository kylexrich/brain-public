#!/usr/bin/env bash
set -euo pipefail

# extract-frames.sh <video-file> <output-dir>
# Extracts ~30 frames at adaptive intervals using ffmpeg.
# Frame N corresponds to ~(N × interval) seconds into the video.

VIDEO="${1:-}"
OUTDIR="${2:-}"

if [[ -z "$VIDEO" || -z "$OUTDIR" ]]; then
  echo "Usage: extract-frames.sh <video-file> <output-dir>" >&2
  exit 1
fi

if [[ ! -f "$VIDEO" ]]; then
  echo "File not found: $VIDEO" >&2
  exit 1
fi

mkdir -p "$OUTDIR"

# Get duration in whole seconds
DURATION_RAW=$(ffprobe -v quiet -show_entries format=duration \
  -of default=noprint_wrappers=1:nokey=1 "$VIDEO" 2>/dev/null)
DURATION_INT=$(printf "%.0f" "${DURATION_RAW:-0}")

if [[ "$DURATION_INT" -eq 0 ]]; then
  echo "Could not determine video duration. File may be corrupt or unsupported." >&2
  exit 1
fi

# Target ~30 frames; clamp interval to [2s, 120s]
TARGET=30
INTERVAL=$(( DURATION_INT / TARGET ))
if [[ $INTERVAL -lt 2 ]]; then INTERVAL=2; fi
if [[ $INTERVAL -gt 120 ]]; then INTERVAL=120; fi
APPROX=$(( DURATION_INT / INTERVAL ))

echo "Duration: ${DURATION_INT}s | Interval: ${INTERVAL}s | ~${APPROX} frames expected"

ffmpeg -hide_banner -loglevel error \
  -i "$VIDEO" \
  -vf "fps=1/${INTERVAL}" \
  -q:v 3 \
  "$OUTDIR/frame_%04d.jpg" \
  -y

COUNT=$(ls "$OUTDIR"/frame_*.jpg 2>/dev/null | wc -l | tr -d ' ')
echo "Extracted ${COUNT} frames to ${OUTDIR}"
echo "Frame N timestamp ≈ N × ${INTERVAL} seconds"
