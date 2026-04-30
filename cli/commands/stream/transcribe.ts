import { resolve } from "node:path";

import { Command, Flags } from "@oclif/core";
import { buildResult, jsonDumps, nowIsoPacific, writeJson } from "../../lib/stream/pipeline-utils.js";
import {
  buildTranscript,
  DEFAULT_CHUNK_SECONDS,
  DEFAULT_FFMPEG,
  DEFAULT_FFPROBE,
  DEFAULT_MODEL,
  DEFAULT_WHISPER_CLI,
  DEFAULT_WORKERS,
  ensureBinary,
  safeExists,
} from "../../lib/stream/transcribe.js";

const DEFAULT_THREADS = 8;

class StreamTranscribeError extends Error {
  constructor(
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "StreamTranscribeError";
  }
}

function requirePositiveInteger(value: number, flagName: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new StreamTranscribeError("invalid_arguments", `${flagName} must be a positive integer.`);
  }
}

function normalizeTranscriptPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const generatedAt =
    typeof payload.created_at === "string" && payload.created_at.trim().length > 0
      ? payload.created_at
      : nowIsoPacific();

  const normalized: Record<string, unknown> = {
    ...payload,
    generated_at: generatedAt,
  };

  delete normalized.created_at;
  return normalized;
}

function readDurationSec(payload: Record<string, unknown>): number {
  const durationSec = payload.duration_sec;
  if (typeof durationSec !== "number" || !Number.isFinite(durationSec)) {
    throw new StreamTranscribeError(
      "invalid_transcript_payload",
      "Transcription output missing numeric duration_sec.",
    );
  }

  return durationSec;
}

export default class StreamTranscribe extends Command {
  static description = "Build a transcript JSON from a local video file";

  static flags = {
    "video-file": Flags.string({
      required: true,
      description: "Absolute path to the source VOD file",
    }),
    output: Flags.string({
      required: true,
      description: "Absolute path to write the transcript JSON",
    }),
    model: Flags.string({
      default: DEFAULT_MODEL,
      description: "Path to the whisper model file",
    }),
    "chunk-seconds": Flags.integer({
      default: DEFAULT_CHUNK_SECONDS,
      description: "Chunk duration in seconds",
    }),
    language: Flags.string({
      default: "en",
      description: "Language hint for whisper-cli",
    }),
    threads: Flags.integer({
      default: DEFAULT_THREADS,
      description: "Threads for whisper-cli",
    }),
    workers: Flags.integer({
      default: DEFAULT_WORKERS,
      description: "Concurrent audio chunk workers",
    }),
    ffmpeg: Flags.string({
      default: DEFAULT_FFMPEG,
      description: "ffmpeg binary path or name",
    }),
    ffprobe: Flags.string({
      default: DEFAULT_FFPROBE,
      description: "ffprobe binary path or name",
    }),
    "whisper-cli": Flags.string({
      default: DEFAULT_WHISPER_CLI,
      description: "whisper-cli binary path or name",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(StreamTranscribe);
    const videoFile = resolve(flags["video-file"]);
    const outputPath = resolve(flags.output);
    const modelPath = resolve(flags.model);

    try {
      if (!safeExists(videoFile)) {
        throw new StreamTranscribeError("video_file_not_found", `Video file not found: ${videoFile}`);
      }

      if (!safeExists(modelPath)) {
        throw new StreamTranscribeError("model_not_found", `Model file not found: ${modelPath}`);
      }

      requirePositiveInteger(flags["chunk-seconds"], "--chunk-seconds");
      requirePositiveInteger(flags.threads, "--threads");
      requirePositiveInteger(flags.workers, "--workers");

      const transcript = await buildTranscript({
        mediaPath: videoFile,
        ffmpeg: ensureBinary(flags.ffmpeg),
        ffprobe: ensureBinary(flags.ffprobe),
        whisperCli: ensureBinary(flags["whisper-cli"]),
        model: modelPath,
        chunkSeconds: flags["chunk-seconds"],
        language: flags.language,
        threads: flags.threads,
        maxWorkers: flags.workers,
      });

      const transcriptPayload = normalizeTranscriptPayload(transcript as Record<string, unknown>);
      writeJson(outputPath, transcriptPayload);

      process.stdout.write(
        jsonDumps(
          buildResult("success", {
            transcript_file: outputPath,
            duration_sec: readDurationSec(transcriptPayload),
          }),
        ),
      );
    } catch (error) {
      const reason = error instanceof StreamTranscribeError ? error.reason : "transcribe_failed";
      const details = error instanceof Error ? error.message : String(error);
      process.stdout.write(
        jsonDumps(
          buildResult("error", {
            reason,
            details,
            video_file: videoFile,
            transcript_file: outputPath,
          }),
        ),
      );
      this.exit(1);
    }
  }
}
