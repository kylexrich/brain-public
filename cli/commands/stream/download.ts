import { mkdtempSync, mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, extname, isAbsolute, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { Command, Flags } from "@oclif/core";
import { buildResult, jsonDumps, loadJson } from "../../lib/stream/pipeline-utils.js";
import { DEFAULT_FFMPEG, DEFAULT_FFPROBE, ensureBinary } from "../../lib/stream/transcribe.js";
import { safeExists } from "../../lib/shared/util/fs.js";

export const DEFAULT_YT_DLP = "yt-dlp";

function probeDurationSec(ffprobe: string, mediaPath: string): number {
  const result = spawnSync(
    ffprobe,
    ["-v", "error", "-print_format", "json", "-show_entries", "format=duration", mediaPath],
    { encoding: "utf8" }
  );

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `Could not probe duration for ${mediaPath}`);
  }

  const payload = JSON.parse(result.stdout) as { format?: { duration?: string } };
  const duration = Number(payload.format?.duration ?? "0");
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Could not determine positive duration for ${mediaPath}`);
  }

  return Math.round(duration);
}

function listVideoCandidates(directoryPath: string): string[] {
  return readdirSync(directoryPath)
    .map((fileName) => join(directoryPath, fileName))
    .filter((filePath) => {
      const extension = extname(filePath).toLowerCase();
      return extension === ".mp4" || extension === ".mkv" || extension === ".mov" || extension === ".webm";
    })
    .sort();
}

function parseDownloadedPath(stdout: string): string | null {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const candidate = lines[index];
    if (safeExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

function runYtDlpDownload(options: {
  ytDlp: string;
  url: string;
  tempDir: string;
}): string {
  const outputTemplate = join(options.tempDir, "downloaded.%(ext)s");
  const result = spawnSync(
    options.ytDlp,
    [
      "--no-progress",
      "--no-warnings",
      "--no-part",
      "--format",
      "bv*+ba/b",
      "--output",
      outputTemplate,
      "--print",
      "after_move:filepath",
      options.url,
    ],
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
  );

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || `yt-dlp failed for ${options.url}`);
  }

  const parsedPath = parseDownloadedPath(result.stdout);
  if (parsedPath) {
    return parsedPath;
  }

  const candidates = listVideoCandidates(options.tempDir);
  if (candidates.length !== 1) {
    throw new Error(
      candidates.length === 0
        ? `yt-dlp did not produce a downloadable video for ${options.url}`
        : `yt-dlp produced multiple candidate videos for ${options.url}`
    );
  }

  return candidates[0];
}

function remuxToMp4(ffmpeg: string, sourcePath: string, tempDir: string): string {
  const remuxedPath = join(tempDir, "downloaded.mp4");
  const result = spawnSync(
    ffmpeg,
    ["-v", "error", "-y", "-i", sourcePath, "-map", "0", "-c", "copy", "-movflags", "+faststart", remuxedPath],
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
  );

  if (result.status !== 0 || !safeExists(remuxedPath)) {
    throw new Error(result.stderr.trim() || `ffmpeg remux failed for ${sourcePath}`);
  }

  return remuxedPath;
}

export function downloadStream(options: {
  url: string;
  output: string;
  ytDlp: string;
  ffmpeg: string;
  ffprobe: string;
}): Record<string, unknown> {
  const tempDir = mkdtempSync(join(tmpdir(), "brain-stream-download-"));

  try {
    const downloadedPath = runYtDlpDownload({
      ytDlp: options.ytDlp,
      url: options.url,
      tempDir,
    });

    const finalDownloadPath =
      extname(downloadedPath).toLowerCase() === ".mp4"
        ? downloadedPath
        : remuxToMp4(options.ffmpeg, downloadedPath, tempDir);

    mkdirSync(dirname(options.output), { recursive: true });
    if (safeExists(options.output)) {
      rmSync(options.output, { force: true });
    }
    renameSync(finalDownloadPath, options.output);

    const durationSec = probeDurationSec(options.ffprobe, options.output);
    return buildResult("success", {
      video_file: options.output,
      vod_duration_sec: durationSec,
    });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

export default class StreamDownload extends Command {
  static description = "Download a YouTube VOD to an output file (download-only; no transcription)";

  static flags = {
    "youtube-metadata-file": Flags.string({
      required: true,
      description: "Path to youtube-metadata.json; provides youtube_url and vod_duration_sec for download and duration-based skip",
    }),
    output: Flags.string({
      required: true,
      description: "Absolute path for the output VOD file",
    }),
    force: Flags.boolean({
      default: false,
      description: "Re-download even if VOD duration matches youtube-metadata.json",
    }),
    "yt-dlp": Flags.string({
      default: DEFAULT_YT_DLP,
      description: "yt-dlp binary path or name",
    }),
    ffmpeg: Flags.string({
      default: DEFAULT_FFMPEG,
      description: "ffmpeg binary path or name",
    }),
    ffprobe: Flags.string({
      default: DEFAULT_FFPROBE,
      description: "ffprobe binary path or name",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(StreamDownload);

    if (!isAbsolute(flags.output)) {
      process.stdout.write(
        jsonDumps(
          buildResult("error", {
            reason: "output_must_be_absolute",
            details: `--output must be an absolute path: ${flags.output}`,
          })
        )
      );
      this.exit(1);
      return;
    }

    const outputPath = resolve(flags.output);
    const youtubeMetadataFile = resolve(flags["youtube-metadata-file"]);

    let youtubeUrl: string;
    let expectedDuration: number | null = null;
    try {
      const metadata = loadJson<{ youtube_url?: unknown; vod_duration_sec?: unknown }>(youtubeMetadataFile);
      if (typeof metadata.youtube_url !== "string" || metadata.youtube_url.trim().length === 0) {
        throw new Error("youtube-metadata.json is missing a non-empty youtube_url");
      }
      youtubeUrl = metadata.youtube_url.trim();
      expectedDuration = typeof metadata.vod_duration_sec === "number" ? metadata.vod_duration_sec : null;
    } catch (error) {
      process.stdout.write(
        jsonDumps(
          buildResult("error", {
            reason: "metadata_load_failed",
            details: error instanceof Error ? error.message : String(error),
          })
        )
      );
      this.exit(1);
      return;
    }

    if (!flags.force && safeExists(outputPath) && expectedDuration !== null && expectedDuration > 0) {
      try {
        const actualDuration = probeDurationSec(ensureBinary(flags.ffprobe), outputPath);
        if (Math.abs(actualDuration - expectedDuration) <= 1) {
          process.stdout.write(
            jsonDumps(
              buildResult("skipped", {
                video_file: outputPath,
                vod_duration_sec: actualDuration,
              })
            )
          );
          return;
        }
      } catch {
        // ffprobe failed — fall through to re-download
      }
    }

    try {
      const result = downloadStream({
        url: youtubeUrl,
        output: outputPath,
        ytDlp: ensureBinary(flags["yt-dlp"]),
        ffmpeg: ensureBinary(flags.ffmpeg),
        ffprobe: ensureBinary(flags.ffprobe),
      });
      process.stdout.write(jsonDumps(result));
    } catch (error) {
      process.stdout.write(
        jsonDumps(
          buildResult("error", {
            reason: "download_failed",
            details: error instanceof Error ? error.message : String(error),
            video_file: outputPath,
          })
        )
      );
      this.exit(1);
    }
  }
}
