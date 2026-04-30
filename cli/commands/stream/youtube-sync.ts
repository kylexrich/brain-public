import { resolve } from "node:path";
import { Command, Flags } from "@oclif/core";
import { safeExists } from "../../lib/shared/util/fs.js";
import { buildResult, jsonDumps, loadJson, nowIsoPacific, writeJson } from "../../lib/stream/pipeline-utils.js";
import { DEFAULT_TOKEN_PATH, fetchYoutubeVideoMetadata } from "../../lib/stream/youtube-client.js";

interface SourceStreamPayload {
  video_id?: unknown;
}

interface YoutubeMetadataPayload {
  generated_at: string;
  youtube_url: string;
  title: string;
  description: string;
  vod_duration_sec: number;
}

function readVideoId(sourceFilePath: string): string {
  if (!safeExists(sourceFilePath)) {
    throw new Error(`source_stream.json not found: ${sourceFilePath}`);
  }

  const sourcePayload = loadJson<SourceStreamPayload>(sourceFilePath);
  const rawVideoId = sourcePayload.video_id;
  if (typeof rawVideoId !== "string" || rawVideoId.trim().length === 0) {
    throw new Error("source_stream.json is missing a non-empty video_id");
  }

  return rawVideoId.trim();
}

export default class StreamYoutubeSync extends Command {
  static description = "Fetch YouTube metadata for a source_stream.json video ID";

  static flags = {
    "source-file": Flags.string({
      required: true,
      description: "Absolute path to source_stream.json",
    }),
    output: Flags.string({
      required: true,
      description: "Absolute path for youtube-metadata.json output",
    }),
    "token-path": Flags.string({
      default: DEFAULT_TOKEN_PATH,
      description: "Path to the YouTube OAuth token JSON",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(StreamYoutubeSync);
    const sourceFile = resolve(flags["source-file"]);
    const outputFile = resolve(flags.output);
    const tokenPath = resolve(flags["token-path"]);
    let videoId = "";

    try {
      videoId = readVideoId(sourceFile);
      const metadata = await fetchYoutubeVideoMetadata(videoId, { tokenPath });

      const outputPayload: YoutubeMetadataPayload = {
        generated_at: nowIsoPacific(),
        youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
        title: metadata.title,
        description: metadata.description,
        vod_duration_sec: metadata.vod_duration_sec,
      };

      writeJson(outputFile, outputPayload);

      process.stdout.write(
        jsonDumps(
          buildResult("success", {
            video_id: videoId,
            vod_duration_sec: metadata.vod_duration_sec,
          }),
        ),
      );
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : String(cause);
      process.stdout.write(
        jsonDumps(
          buildResult("error", {
            video_id: videoId,
            reason,
            details: reason,
          }),
        ),
      );

      this.exit(1);
    }
  }
}
