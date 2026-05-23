import { resolve } from "node:path";
import { Command, Flags } from "@oclif/core";
import { safeExists } from "../../lib/shared/util/fs.js";
import { buildResult, jsonDumps, nowIsoPacific, writeJson } from "../../lib/stream/pipeline-utils.js";
import {
  DEFAULT_TOKEN_PATH,
  uploadYoutubeVideo,
  type YoutubePrivacyStatus,
} from "../../lib/stream/youtube-client.js";

const PRIVACY_VALUES = ["private", "unlisted", "public"] as const;

function parsePrivacy(value: string): YoutubePrivacyStatus {
  const lowered = value.toLowerCase();
  if ((PRIVACY_VALUES as readonly string[]).includes(lowered)) {
    return lowered as YoutubePrivacyStatus;
  }
  throw new Error(`Invalid --privacy value: ${value} (must be private | unlisted | public)`);
}

function parseTags(value: string | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : undefined;
}

export default class StreamYoutubeUploadClip extends Command {
  static description = "Upload a produced clip or composite MP4 to YouTube as a new video";

  static flags = {
    file: Flags.string({
      required: true,
      description: "Absolute path to the MP4 file to upload",
    }),
    title: Flags.string({
      required: true,
      description: "YouTube video title (<= 100 chars)",
    }),
    description: Flags.string({
      required: true,
      description: "YouTube video description (<= 5000 chars)",
    }),
    privacy: Flags.string({
      default: "unlisted",
      description: "Privacy status: private | unlisted | public",
    }),
    tags: Flags.string({
      description: "Comma-separated tag list",
    }),
    "category-id": Flags.string({
      default: "28",
      description: "YouTube category ID — default 28 (Science & Technology). Channel rule: never use 22 (People & Blogs).",
    }),
    "publish-at": Flags.string({
      description: "RFC3339 ISO timestamp for scheduled publish (forces privacy=private until publish time)",
    }),
    output: Flags.string({
      required: true,
      description: "Absolute path where the per-upload result JSON should be written",
    }),
    "token-path": Flags.string({
      default: DEFAULT_TOKEN_PATH,
      description: "Path to the YouTube token JSON",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(StreamYoutubeUploadClip);
    const filePath = resolve(flags.file);
    const outputFile = resolve(flags.output);
    const tokenPath = resolve(flags["token-path"]);

    const emitErrorAndExit = (reason: string): never => {
      const payload = buildResult("error", {
        file: filePath,
        reason,
      });
      process.stdout.write(jsonDumps(payload));
      writeJson(outputFile, {
        generated_at: nowIsoPacific(),
        file: filePath,
        status: "error",
        error: reason,
      });
      this.exit(1);
      return undefined as never;
    };

    if (!safeExists(filePath)) {
      return emitErrorAndExit(`Upload source MP4 not found: ${filePath}`);
    }

    let privacyStatus: YoutubePrivacyStatus;
    try {
      privacyStatus = parsePrivacy(flags.privacy);
    } catch (cause) {
      return emitErrorAndExit(cause instanceof Error ? cause.message : String(cause));
    }

    if (flags["publish-at"] && privacyStatus !== "private") {
      return emitErrorAndExit("--publish-at requires --privacy=private (YouTube schedules from private only)");
    }

    try {
      const uploadResult = await uploadYoutubeVideo({
        filePath,
        title: flags.title,
        description: flags.description,
        privacyStatus,
        tags: parseTags(flags.tags),
        categoryId: flags["category-id"],
        publishAt: flags["publish-at"],
        tokenPath,
      });

      const outputPayload = {
        generated_at: nowIsoPacific(),
        file: filePath,
        title: flags.title,
        status: "success" as const,
        ...uploadResult,
      };

      writeJson(outputFile, outputPayload);
      process.stdout.write(jsonDumps(buildResult("success", outputPayload)));
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : String(cause);
      return emitErrorAndExit(reason);
    }
  }
}
