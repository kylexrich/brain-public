import { resolve } from "node:path";
import { Command, Flags } from "@oclif/core";
import { safeExists } from "../../lib/shared/util/fs.js";
import { buildResult, jsonDumps, loadJson, nowIsoPacific, writeJson } from "../../lib/stream/pipeline-utils.js";
import { DEFAULT_TOKEN_PATH, publishYoutubeMetadata, type YoutubePublishResult } from "../../lib/stream/youtube-client.js";

interface SourceStreamFile {
  video_id?: unknown;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function deriveStatus(result: YoutubePublishResult): "success" | "partial" | "error" {
  if (result.published_title && result.published_description) {
    return "success";
  }

  if (result.published_title || result.published_description) {
    return "partial";
  }

  return "error";
}

function emitResult(status: "success" | "partial" | "error", result: YoutubePublishResult): void {
  process.stdout.write(
    jsonDumps(
      buildResult(status, {
        video_id: result.video_id,
        published_title: result.published_title,
        published_description: result.published_description,
      }),
    ),
  );
}

export default class StreamYoutubePublish extends Command {
  static description = "Publish youtube-metadata.json title and description to YouTube";

  static flags = {
    "metadata-file": Flags.string({
      required: true,
      description: "Absolute path to youtube-metadata.json",
    }),
    "source-file": Flags.string({
      required: true,
      description: "Absolute path to source_stream.json",
    }),
    output: Flags.string({
      required: true,
      description: "Absolute path where youtube_publish.json should be written",
    }),
    "token-path": Flags.string({
      default: DEFAULT_TOKEN_PATH,
      description: "Path to the YouTube token JSON",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(StreamYoutubePublish);

    const metadataFile = resolve(flags["metadata-file"]);
    const sourceFile = resolve(flags["source-file"]);
    const outputFile = resolve(flags.output);
    const tokenPath = resolve(flags["token-path"]);

    const emitErrorAndExit = (reason: string, videoId = ""): never => {
      process.stdout.write(
        jsonDumps(
          buildResult("error", {
            video_id: videoId,
            published_title: false,
            published_description: false,
            reason,
          }),
        ),
      );
      this.exit(1);
      return undefined as never;
    };

    if (!safeExists(metadataFile)) {
      return emitErrorAndExit(`metadata file not found: ${metadataFile}`);
    }

    if (!safeExists(sourceFile)) {
      return emitErrorAndExit(`source file not found: ${sourceFile}`);
    }

    try {
      const sourceSnapshot = loadJson<SourceStreamFile>(sourceFile);
      const videoId = normalizeOptionalString(sourceSnapshot.video_id);
      if (!videoId) {
        return emitErrorAndExit("source_stream.json is missing a non-empty video_id");
      }

      const publishResult = await publishYoutubeMetadata({
        youtubeMetadataFile: metadataFile,
        videoId,
        tokenPath,
      });

      const outputPayload = {
        generated_at: nowIsoPacific(),
        video_id: publishResult.video_id,
        published_title: publishResult.published_title,
        published_description: publishResult.published_description,
      };

      writeJson(outputFile, outputPayload);

      const status = deriveStatus(publishResult);
      emitResult(status, publishResult);
      if (status === "error") {
        this.exit(1);
      }
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : String(cause);
      return emitErrorAndExit(reason);
    }
  }
}
