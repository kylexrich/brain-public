import { mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { Command, Flags } from "@oclif/core";
import { safeExists } from "../../lib/shared/util/fs.js";
import {
  deriveStreamIdentity,
  listCompletedSourceStreams,
  type SourceStreamMatch,
} from "../../lib/stream/find-source.js";
import {
  buildResult,
  formatPacificDate,
  jsonDumps,
  nowIsoPacific,
  sourceStreamPath,
  writeJson,
} from "../../lib/stream/pipeline-utils.js";
import { DEFAULT_TOKEN_PATH } from "../../lib/stream/youtube-client.js";
import { BRAIN_ROOT } from "../../lib/shared/config.js";

const DEFAULT_VAULT_ROOT = join(BRAIN_ROOT, "vault/stream-videos");
const STREAM_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_FOLDER_PATTERN = /^\d{4}-\d{2}-\d{2}_day-(\d+)$/;

type DiscoverWorkItem = {
  stream_date: string;
  stream_key: string;
  stream_dir: string;
  youtube_video_id: string;
};

type SourceStreamSnapshot = {
  generated_at: string;
  found: true;
  video_id: string;
  title: string;
  url: string;
  stream_date: string;
  stream_key: string;
  vod_duration_sec: number | null;
  actual_start_time: string;
  actual_end_time: string | null;
};

function resolveRequestedStreamDate(streamDateFlag?: string): string {
  if (!streamDateFlag) {
    return formatPacificDate(new Date());
  }

  const streamDate = streamDateFlag.trim();
  if (!STREAM_DATE_PATTERN.test(streamDate)) {
    throw new Error("Invalid --stream-date. Expected YYYY-MM-DD.");
  }

  return streamDate;
}

/**
 * Scan all month folders in the vault to find the highest existing day number
 * and any existing day folder for the given date.
 */
function resolveDayFolder(vaultRoot: string, streamDate: string): string {
  let maxDayNumber = 0;
  let existingDayFolder: string | null = null;

  for (const monthEntry of safeReaddir(vaultRoot)) {
    const monthDir = resolve(vaultRoot, monthEntry);
    for (const dayEntry of safeReaddir(monthDir)) {
      const match = DAY_FOLDER_PATTERN.exec(dayEntry);
      if (!match) continue;
      const dayNum = Number.parseInt(match[1], 10);
      if (dayNum > maxDayNumber) maxDayNumber = dayNum;
      if (dayEntry.startsWith(streamDate + "_day-")) {
        existingDayFolder = dayEntry;
      }
    }
  }

  return existingDayFolder ?? `${streamDate}_day-${maxDayNumber + 1}`;
}

function safeReaddir(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

function buildStreamDir(vaultRoot: string, streamDate: string, streamKey: string): string {
  const monthDir = streamDate.slice(0, 7);
  const dayFolder = resolveDayFolder(vaultRoot, streamDate);
  return resolve(vaultRoot, monthDir, dayFolder, streamKey);
}

function buildSourceStreamSnapshot(match: SourceStreamMatch, generatedAt: string): SourceStreamSnapshot {
  const identity = deriveStreamIdentity(match.actual_start_time);
  return {
    generated_at: generatedAt,
    found: true,
    video_id: match.video_id,
    title: match.title,
    url: match.url,
    stream_date: identity.stream_date,
    stream_key: identity.stream_key,
    vod_duration_sec: match.vod_duration_sec,
    actual_start_time: match.actual_start_time,
    actual_end_time: match.actual_end_time,
  };
}

function writeResult(status: "success" | "error" | "no_work", workQueue: DiscoverWorkItem[]): void {
  process.stdout.write(jsonDumps(buildResult(status, { work_queue: workQueue })));
}

export default class StreamDiscover extends Command {
  static description = "Discover completed YouTube livestreams for a stream date";

  static flags = {
    "stream-date": Flags.string({
      description: "Date to discover streams for (Pacific, YYYY-MM-DD)",
    }),
    "vault-root": Flags.string({
      default: DEFAULT_VAULT_ROOT,
      description: "Root stream vault directory",
    }),
    "token-path": Flags.string({
      default: DEFAULT_TOKEN_PATH,
      description: "Path to YouTube token JSON",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(StreamDiscover);
    const vaultRoot = resolve(flags["vault-root"]);
    const tokenPath = resolve(flags["token-path"]);

    try {
      if (!safeExists(tokenPath)) {
        throw new Error(`Token path not found: ${tokenPath}`);
      }

      const streamDate = resolveRequestedStreamDate(flags["stream-date"] ?? undefined);
      const matches = await listCompletedSourceStreams({ tokenPath, streamDate });

      if (matches.length === 0) {
        writeResult("no_work", []);
        return;
      }

      const generatedAt = nowIsoPacific();
      const workQueue: DiscoverWorkItem[] = [];
      const queuedDirs = new Set<string>();

      for (const match of matches) {
        const snapshot = buildSourceStreamSnapshot(match, generatedAt);
        const streamDir = buildStreamDir(vaultRoot, snapshot.stream_date, snapshot.stream_key);

        mkdirSync(streamDir, { recursive: true });
        writeJson(sourceStreamPath(streamDir), snapshot);

        if (queuedDirs.has(streamDir)) {
          continue;
        }

        queuedDirs.add(streamDir);
        workQueue.push({
          stream_date: snapshot.stream_date,
          stream_key: snapshot.stream_key,
          stream_dir: streamDir,
          youtube_video_id: snapshot.video_id,
        });
      }

      writeResult(workQueue.length > 0 ? "success" : "no_work", workQueue);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${reason}\n`);
      process.stdout.write(
        jsonDumps(
          buildResult("error", {
            work_queue: [],
            reason,
          }),
        ),
      );
      this.exit(1);
    }
  }
}
