import { Args, Command, Flags } from "@oclif/core";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  DEFAULT_FFMPEG,
  DEFAULT_MODEL,
  DEFAULT_WHISPER_CLI,
  ensureBinary,
  safeExists,
} from "../../lib/stream/transcribe.js";

/**
 * Simple one-shot speech-to-text. For long-form chunked stream transcription
 * (with hallucination dedup), use `brain stream transcribe` instead — that
 * path chunks the media, runs workers in parallel, and emits the structured
 * pipeline transcript shape.
 */
export default class SttTranscribe extends Command {
  static description =
    "Transcribe an audio or video file to text using the local whisper.cpp (no API, no network).";

  static examples = [
    "brain stt transcribe /path/to/voice-memo.m4a",
    "brain stt transcribe /path/to/video.mp4 --out transcript.txt",
    "brain stt transcribe /path/to/audio.mp3 --format json",
  ];

  static args = {
    input: Args.string({
      description: "Path to an audio or video file (any ffmpeg-readable format)",
      required: true,
    }),
  };

  static flags = {
    out: Flags.string({
      description: "Write transcript to this file; if omitted, prints to stdout",
    }),
    format: Flags.string({
      default: "txt",
      options: ["txt", "json"],
      description: "Output format. 'txt' is plain text; 'json' is whisper.cpp segments",
    }),
    language: Flags.string({
      default: "auto",
      description: "Language hint (ISO 639-1 code, or 'auto' to let whisper detect)",
    }),
    model: Flags.string({
      default: DEFAULT_MODEL,
      description: "Path to a whisper.cpp ggml model .bin file",
    }),
    "whisper-cli": Flags.string({
      default: DEFAULT_WHISPER_CLI,
      description: "whisper-cli binary path or name",
    }),
    ffmpeg: Flags.string({
      default: DEFAULT_FFMPEG,
      description: "ffmpeg binary path or name",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(SttTranscribe);
    const inputPath = resolve(args.input);
    if (!safeExists(inputPath)) {
      this.error(`Input file not found: ${inputPath}`, { exit: 1 });
    }

    const ffmpeg = ensureBinary(flags.ffmpeg);
    const whisperCli = ensureBinary(flags["whisper-cli"]);
    const modelPath = flags.model;
    if (!safeExists(modelPath)) {
      this.error(
        `Whisper model not found: ${modelPath}\n` +
          "Install via Homebrew: brew install whisper-cpp " +
          "(installs ggml-large-v3-turbo.bin to /opt/homebrew/share/whisper-cpp/)",
        { exit: 1 }
      );
    }

    const workDir = mkdtempSync(join(tmpdir(), "brain-stt-"));
    try {
      // Normalize input to 16kHz mono PCM WAV — whisper.cpp's expected format.
      // ffmpeg accepts essentially any audio/video container here.
      const wavPath = join(workDir, "audio.wav");
      const ffmpegResult = spawnSync(
        ffmpeg,
        [
          "-v",
          "error",
          "-y",
          "-i",
          inputPath,
          "-vn",
          "-ac",
          "1",
          "-ar",
          "16000",
          "-c:a",
          "pcm_s16le",
          wavPath,
        ],
        { encoding: "utf8" }
      );
      if (ffmpegResult.status !== 0) {
        this.error(
          `ffmpeg failed: ${ffmpegResult.stderr?.trim() || ffmpegResult.error?.message || "unknown"}`,
          { exit: 1 }
        );
      }

      // spawnSync captures both stdout and stderr in the returned object so
      // nothing leaks to our parent's terminal — whisper-cli writes
      // informational lines to stderr even with --no-prints.
      const outputPrefix = join(workDir, "out");
      const whisperArgs = [
        "-m",
        modelPath,
        "-f",
        wavPath,
        "-l",
        flags.language,
        "--no-prints",
        "-of",
        outputPrefix,
      ];
      if (flags.format === "json") {
        whisperArgs.push("-oj");
      } else {
        whisperArgs.push("-otxt", "-nt"); // no per-segment timestamps in plain text
      }
      const whisperResult = spawnSync(whisperCli, whisperArgs, { encoding: "utf8" });
      if (whisperResult.status !== 0) {
        this.error(
          `whisper-cli failed: ${whisperResult.stderr?.trim() || whisperResult.error?.message || "unknown"}`,
          { exit: 1 }
        );
      }

      const resultExt = flags.format === "json" ? "json" : "txt";
      const resultPath = `${outputPrefix}.${resultExt}`;
      if (!safeExists(resultPath)) {
        this.error(`whisper-cli produced no output: ${resultPath}`, { exit: 1 });
      }
      const content = readFileSync(resultPath, "utf8");

      if (flags.out) {
        writeFileSync(flags.out, content);
      } else {
        process.stdout.write(content);
        if (!content.endsWith("\n")) process.stdout.write("\n");
      }
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  }
}
