import { readFileSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import { execFile, spawnSync } from "node:child_process";
import { promisify } from "node:util";
import { safeExists } from "../shared/util/fs.js";

const execFileAsync = promisify(execFile);

export const DEFAULT_FFMPEG = "/opt/homebrew/bin/ffmpeg";
export const DEFAULT_FFPROBE = "/opt/homebrew/bin/ffprobe";
export const DEFAULT_WHISPER_CLI = "/opt/homebrew/bin/whisper-cli";
export const DEFAULT_MODEL =
  process.env.BRAIN_WHISPER_MODEL_PATH?.trim() || "/opt/homebrew/share/whisper-cpp/ggml-large-v3-turbo.bin";
export const DEFAULT_CHUNK_SECONDS = 20 * 60;
export const DEFAULT_WORKERS = 2;

export { safeExists } from "../shared/util/fs.js";

function utcNowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function ensureBinary(path: string): string {
  if (safeExists(path)) {
    return path;
  }
  const result = spawnSync("which", [path], { encoding: "utf8" });
  if (result.status === 0 && result.stdout.trim()) {
    return result.stdout.trim();
  }
  throw new Error(`Required binary not found: ${path}`);
}

function probeDuration(ffprobe: string, mediaPath: string): number {
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
  if (duration <= 0) {
    throw new Error(`Could not determine positive duration for ${mediaPath}`);
  }
  return duration;
}

async function extractAudioChunk(
  ffmpeg: string,
  mediaPath: string,
  chunkPath: string,
  startSec: number,
  durationSec: number
): Promise<void> {
  await execFileAsync(ffmpeg, [
    "-v",
    "error",
    "-y",
    "-ss",
    startSec.toFixed(3),
    "-t",
    durationSec.toFixed(3),
    "-i",
    mediaPath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-c:a",
    "pcm_s16le",
    chunkPath
  ]);
}

async function transcribeChunk(options: {
  chunkPath: string;
  outputPrefix: string;
  whisperCli: string;
  model: string;
  language: string;
  threads: number;
}): Promise<Record<string, any>> {
  await execFileAsync(options.whisperCli, [
    "-m",
    options.model,
    "-f",
    options.chunkPath,
    "-l",
    options.language,
    "-t",
    String(options.threads),
    "--no-prints",
    "-oj",
    "-of",
    options.outputPrefix
  ]);

  const jsonPath = `${options.outputPrefix}.json`;
  if (!safeExists(jsonPath)) {
    throw new Error(`whisper-cli did not produce output: ${jsonPath}`);
  }
  return JSON.parse(readFileSync(jsonPath, "utf8")) as Record<string, any>;
}

function convertWhisperCppSegments(payload: Record<string, any>, offsetSec: number, chunkIndex: number): Record<string, any>[] {
  return ((payload.transcription as Array<Record<string, any>> | undefined) ?? []).map((entry, index) => {
    const offsets = (entry.offsets as Record<string, number> | undefined) ?? {};
    const start = Number(((Number(offsets.from ?? 0) / 1000) + offsetSec).toFixed(3));
    const end = Number(((Number(offsets.to ?? 0) / 1000) + offsetSec).toFixed(3));
    return {
      id: index,
      chunk_index: chunkIndex,
      start,
      end,
      text: String(entry.text ?? "").trim()
    };
  });
}

function deduplicateSegments(segments: Record<string, any>[]): { cleanedSegments: Record<string, any>[]; removedCount: number } {
  const counts = new Map<string, number>();
  for (const segment of segments) {
    const key = String(segment.text ?? "").trim().toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const frequentShort = new Set(
    [...counts.entries()]
      .filter(([text, count]) => text.length < 5 && count > 10)
      .map(([text]) => text)
  );

  const recentWindow: string[] = [];
  const hallucinationFlags = segments.map((segment) => {
    const normalized = String(segment.text ?? "").trim().toLowerCase();
    const isHallucination = recentWindow.includes(normalized);
    recentWindow.push(normalized);
    if (recentWindow.length > 3) {
      recentWindow.shift();
    }
    return isHallucination;
  });

  const indexesToRemove = new Set<number>();
  for (let index = 0; index < segments.length; ) {
    if (!hallucinationFlags[index]) {
      index += 1;
      continue;
    }

    const runText = String(segments[index].text ?? "").trim().toLowerCase();
    const runStart = index;
    while (
      index < segments.length &&
      hallucinationFlags[index] &&
      String(segments[index].text ?? "").trim().toLowerCase() === runText
    ) {
      index += 1;
    }
    if (index - runStart >= 3) {
      for (let runIndex = runStart; runIndex < index; runIndex += 1) {
        indexesToRemove.add(runIndex);
      }
    }
  }

  segments.forEach((segment, index) => {
    if (frequentShort.has(String(segment.text ?? "").trim().toLowerCase())) {
      indexesToRemove.add(index);
    }
  });

  return {
    cleanedSegments: segments.filter((_, index) => !indexesToRemove.has(index)),
    removedCount: indexesToRemove.size
  };
}

async function processOneChunk(options: {
  chunkIndex: number;
  mediaPath: string;
  tempDirectory: string;
  startSec: number;
  durationSec: number;
  ffmpeg: string;
  whisperCli: string;
  model: string;
  language: string;
  threads: number;
}): Promise<Record<string, any>> {
  const chunkPath = resolve(options.tempDirectory, `chunk-${String(options.chunkIndex + 1).padStart(3, "0")}.wav`);
  const outputPrefix = resolve(options.tempDirectory, `chunk-${String(options.chunkIndex + 1).padStart(3, "0")}_out`);

  await extractAudioChunk(options.ffmpeg, options.mediaPath, chunkPath, options.startSec, options.durationSec);
  const chunkSizeMb = statSync(chunkPath).size / (1024 * 1024);
  const payload = await transcribeChunk({
    chunkPath,
    outputPrefix,
    whisperCli: options.whisperCli,
    model: options.model,
    language: options.language,
    threads: options.threads
  });
  const segments = convertWhisperCppSegments(payload, options.startSec, options.chunkIndex);
  const chunkText = segments.map((segment) => segment.text).join(" ").trim();

  return {
    chunk_index: options.chunkIndex,
    start: Number(options.startSec.toFixed(3)),
    end: Number((options.startSec + options.durationSec).toFixed(3)),
    duration_sec: Number(options.durationSec.toFixed(3)),
    size_mb: Number(chunkSizeMb.toFixed(3)),
    segments_count: segments.length,
    words_count: chunkText ? chunkText.split(/\s+/).length : 0,
    text: chunkText,
    _segments: segments
  };
}

async function mapWithConcurrency<T, TResult>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<TResult>
): Promise<TResult[]> {
  const results: TResult[] = [];
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

export async function buildTranscript(options: {
  mediaPath: string;
  ffmpeg: string;
  ffprobe: string;
  whisperCli: string;
  model: string;
  chunkSeconds: number;
  language: string;
  threads: number;
  maxWorkers: number;
}): Promise<Record<string, any>> {
  const totalDuration = probeDuration(options.ffprobe, options.mediaPath);
  const chunkSpecs: Array<{ chunkIndex: number; startSec: number; durationSec: number }> = [];
  const chunkCount = Math.max(1, Math.ceil(totalDuration / options.chunkSeconds));

  for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
    const startSec = chunkIndex * options.chunkSeconds;
    const durationSec = Math.min(options.chunkSeconds, Math.max(totalDuration - startSec, 0));
    if (durationSec > 0) {
      chunkSpecs.push({ chunkIndex, startSec, durationSec });
    }
  }

  const tempDirectoryResult = spawnSync("mktemp", ["-d", "-t", "stream_pipeline_transcribe"], { encoding: "utf8" });
  if (tempDirectoryResult.status !== 0 || !tempDirectoryResult.stdout.trim()) {
    throw new Error(tempDirectoryResult.stderr.trim() || "Could not create a temporary transcription directory.");
  }
  const tempDirectory = tempDirectoryResult.stdout.trim();

  try {
    const orderedChunkResults = await mapWithConcurrency(chunkSpecs, options.maxWorkers, async (chunkSpec) =>
      processOneChunk({
        ...chunkSpec,
        mediaPath: options.mediaPath,
        tempDirectory,
        ffmpeg: options.ffmpeg,
        whisperCli: options.whisperCli,
        model: options.model,
        language: options.language,
        threads: options.threads
      })
    );

    const mergedSegments: Record<string, any>[] = [];
    const chunkSummaries: Record<string, any>[] = [];
    for (const chunkResult of orderedChunkResults) {
      mergedSegments.push(...(chunkResult._segments as Record<string, any>[]));
      delete chunkResult._segments;
      chunkSummaries.push(chunkResult);
    }

    const { cleanedSegments, removedCount } = deduplicateSegments(mergedSegments);
    const chunkTexts = new Map<number, string[]>();
    for (const segment of cleanedSegments) {
      const entries = chunkTexts.get(Number(segment.chunk_index)) ?? [];
      if (segment.text) {
        entries.push(String(segment.text));
      }
      chunkTexts.set(Number(segment.chunk_index), entries);
    }

    for (const chunk of chunkSummaries) {
      const text = (chunkTexts.get(Number(chunk.chunk_index)) ?? []).join(" ").trim();
      chunk.text = text;
      chunk.words_count = text ? text.split(/\s+/).length : 0;
    }

    return {
      source_media: options.mediaPath,
      model: `whisper-cpp:${basename(options.model).replace(/\.[^.]+$/, "")}`,
      created_at: utcNowIso(),
      duration_sec: Number(totalDuration.toFixed(3)),
      chunk_seconds: options.chunkSeconds,
      chunk_count: chunkSummaries.length,
      language: options.language,
      hallucinations_removed: removedCount,
      text: chunkSummaries.map((chunk) => String(chunk.text ?? "").trim()).filter(Boolean).join("\n\n").trim(),
      segments: cleanedSegments,
      chunks: chunkSummaries
    };
  } finally {
    spawnSync("rm", ["-rf", tempDirectory]);
  }
}
