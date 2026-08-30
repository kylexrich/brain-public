import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { Command, Flags } from "@oclif/core";
import { safeExists } from "../../lib/shared/util/fs.js";
import { buildResult, formatTimestamp, jsonDumps, loadJson, removePath } from "../../lib/stream/pipeline-utils.js";
import { isRecord } from "../../lib/shared/util/json.js";

interface NormalizedSegment {
  chunkIndex: number;
  startSec: number;
  text: string;
}

interface ValidatedTranscript {
  chunkIndexes: number[];
  segments: NormalizedSegment[];
  durationSec: number;
}

class ChunkTranscriptError extends Error {
  constructor(
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "ChunkTranscriptError";
  }
}


function parseNonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function parseNonNegativeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function chunkFileName(index: number): string {
  return `chunk_${String(index + 1).padStart(3, "0")}.txt`;
}

function formatTimestampHhMmSs(seconds: number): string {
  const [hours = "0", minutes = "00", secondsPart = "00"] = formatTimestamp(seconds).split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:${secondsPart.padStart(2, "0")}`;
}

function writeChunkDirectoryAtomic(outputDir: string, chunks: string[]): void {
  mkdirSync(dirname(outputDir), { recursive: true });
  const tempDir = mkdtempSync(join(dirname(outputDir), `.${basename(outputDir)}.`));
  let promoted = false;

  try {
    for (const [index, chunkText] of chunks.entries()) {
      writeFileSync(join(tempDir, chunkFileName(index)), chunkText, "utf8");
    }

    removePath(outputDir);
    renameSync(tempDir, outputDir);
    promoted = true;
  } finally {
    if (!promoted) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

function validateTranscript(payload: unknown): ValidatedTranscript {
  if (!isRecord(payload)) {
    throw new ChunkTranscriptError("invalid_transcript", "Transcript payload must be a JSON object.");
  }

  const chunks = payload.chunks;
  const segments = payload.segments;
  const durationSec = parseNonNegativeNumber(payload.duration_sec);

  if (!Array.isArray(chunks)) {
    throw new ChunkTranscriptError("invalid_transcript", "Transcript is missing chunks array.");
  }

  if (!Array.isArray(segments)) {
    throw new ChunkTranscriptError("invalid_transcript", "Transcript is missing segments array.");
  }

  if (durationSec === null) {
    throw new ChunkTranscriptError("invalid_transcript", "Transcript is missing numeric duration_sec.");
  }

  const chunkIndexes: number[] = [];
  const seenChunkIndexes = new Set<number>();
  for (const [index, chunk] of chunks.entries()) {
    const chunkIndex = isRecord(chunk) ? parseNonNegativeInteger(chunk.chunk_index) ?? index : index;
    if (seenChunkIndexes.has(chunkIndex)) {
      throw new ChunkTranscriptError("invalid_transcript", `Duplicate chunk index in chunks array: ${chunkIndex}`);
    }

    seenChunkIndexes.add(chunkIndex);
    chunkIndexes.push(chunkIndex);
  }

  const normalizedSegments: NormalizedSegment[] = [];
  const validChunkIndexes = new Set(chunkIndexes);

  for (const [segmentIndex, segment] of segments.entries()) {
    if (!isRecord(segment)) {
      throw new ChunkTranscriptError("invalid_transcript", `segments[${segmentIndex}] must be an object.`);
    }

    const chunkIndex = parseNonNegativeInteger(segment.chunk_index);
    const startSec = parseNonNegativeNumber(segment.start);
    const text = normalizeNonEmptyString(segment.text);

    if (chunkIndex === null) {
      throw new ChunkTranscriptError("invalid_transcript", `segments[${segmentIndex}] is missing numeric chunk_index.`);
    }

    if (!validChunkIndexes.has(chunkIndex)) {
      throw new ChunkTranscriptError(
        "invalid_transcript",
        `segments[${segmentIndex}] references chunk_index ${chunkIndex}, but that chunk is not in chunks array.`,
      );
    }

    if (startSec === null) {
      throw new ChunkTranscriptError("invalid_transcript", `segments[${segmentIndex}] is missing numeric start.`);
    }

    if (!text) {
      continue;
    }

    normalizedSegments.push({
      chunkIndex,
      startSec,
      text,
    });
  }

  return {
    chunkIndexes,
    segments: normalizedSegments,
    durationSec,
  };
}

function groupSegmentsByChunkIndex(segments: NormalizedSegment[]): Map<number, NormalizedSegment[]> {
  const grouped = new Map<number, NormalizedSegment[]>();

  for (const segment of segments) {
    const bucket = grouped.get(segment.chunkIndex) ?? [];
    bucket.push(segment);
    grouped.set(segment.chunkIndex, bucket);
  }

  for (const bucket of grouped.values()) {
    bucket.sort((left, right) => left.startSec - right.startSec);
  }

  return grouped;
}

function buildChunkText(segments: NormalizedSegment[]): string {
  return segments.map((segment) => `[${formatTimestampHhMmSs(segment.startSec)}] ${segment.text}`).join("\n");
}

function chunkTranscript(options: {
  transcriptFile: string;
  outputDir: string;
}): {
  chunksDir: string;
  chunkCount: number;
  transcriptDurationSec: number;
} {
  if (!safeExists(options.transcriptFile)) {
    throw new ChunkTranscriptError("transcript_not_found", `Transcript file not found: ${options.transcriptFile}`);
  }

  const transcriptPayload = loadJson<unknown>(options.transcriptFile);
  const transcript = validateTranscript(transcriptPayload);
  const groupedSegments = groupSegmentsByChunkIndex(transcript.segments);

  const chunkTexts = transcript.chunkIndexes.map((chunkIndex) => buildChunkText(groupedSegments.get(chunkIndex) ?? []));
  writeChunkDirectoryAtomic(options.outputDir, chunkTexts);

  return {
    chunksDir: options.outputDir,
    chunkCount: chunkTexts.length,
    transcriptDurationSec: transcript.durationSec,
  };
}

export default class StreamChunkTranscript extends Command {
  static description = "Write timestamped transcript chunks from a transcript JSON file";

  static flags = {
    "transcript-file": Flags.string({
      required: true,
      description: "Absolute path to transcript JSON",
    }),
    "output-dir": Flags.string({
      required: true,
      description: "Absolute path to output chunk directory",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(StreamChunkTranscript);
    const transcriptFile = resolve(flags["transcript-file"]);
    const outputDir = resolve(flags["output-dir"]);

    try {
      const result = chunkTranscript({ transcriptFile, outputDir });
      process.stdout.write(
        jsonDumps(
          buildResult("success", {
            chunks_dir: result.chunksDir,
            chunk_count: result.chunkCount,
            transcript_duration_sec: result.transcriptDurationSec,
          }),
        ),
      );
    } catch (error) {
      process.stdout.write(
        jsonDumps(
          buildResult("error", {
            reason: error instanceof ChunkTranscriptError ? error.reason : "chunk_transcript_failed",
            details: error instanceof Error ? error.message : String(error),
            chunks_dir: outputDir,
          }),
        ),
      );
      this.exit(1);
    }
  }
}
