import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { safeExists } from "../shared/util/fs.js";
import { formatJson, readJsonFile } from "../shared/util/json.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PIPELINE_TIME_ZONE = "America/Los_Angeles";
// ---------------------------------------------------------------------------
// Base directory helpers — split pipeline state from stage outputs
// ---------------------------------------------------------------------------

function metaPipelineDir(streamDir: string): string {
  return join(streamDir, "meta", "pipeline");
}

function metaOutputsDir(streamDir: string): string {
  return join(streamDir, "meta", "outputs");
}

/**
 * The 15 V2 pipeline stages in execution order.
 */
export const V2_PIPELINE_STAGES = [
  "youtube_sync",
  "download",
  "transcribe",
  "chunk_transcript",
  "brain_extract",
  "vod_cut_recommendations",
  "stream_improvements",
  "clip_suggestions",
  "composite_clip_suggestions",
  "stream_chapters",
  "stream_summary",
  "stream_title",
  "youtube_publish",
  "clip_production",
  "composite_clip_production",
] as const;

export type V2PipelineStage = (typeof V2_PIPELINE_STAGES)[number];

// ---------------------------------------------------------------------------
// Stage state
// ---------------------------------------------------------------------------

export type StageStatus = "pending" | "success" | "error" | "skipped";

export interface StageState {
  status: StageStatus;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
  result: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Video-level state (video-state.json)
// ---------------------------------------------------------------------------

export interface VideoState {
  generated_at: string;
  stream_date: string;
  stream_key: string;
  youtube_video_id: string;
  stages: Record<V2PipelineStage, StageState>;
}

// ---------------------------------------------------------------------------
// Pipeline-level state (pipeline-state.json)
// ---------------------------------------------------------------------------

export interface PipelineVideoEntry {
  stream_dir: string;
  youtube_video_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
  stage_summary: {
    succeeded: string[];
    failed: string[];
    skipped: string[];
  };
}

export interface PipelineDiscovery {
  status: "success" | "error" | "no_work" | "pending";
  completed_at: string | null;
  work_queue_size: number;
  error: string | null;
}

export interface PipelineSummary {
  total_videos: number;
  completed: number;
  failed: number;
}

export interface PipelineState {
  generated_at: string;
  run_date: string;
  started_at: string;
  completed_at: string | null;
  status: "discovering" | "processing" | "completed" | "failed";
  discovery: PipelineDiscovery;
  videos: Record<string, PipelineVideoEntry>;
  summary: PipelineSummary;
}

// ---------------------------------------------------------------------------
// Timezone formatting
// ---------------------------------------------------------------------------

type PacificDateParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
  offset: string;
};

const PACIFIC_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: PIPELINE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const PACIFIC_OFFSET_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: PIPELINE_TIME_ZONE,
  timeZoneName: "longOffset",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function buildFormatterPartMap(formatter: Intl.DateTimeFormat, date: Date): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") {
      parts[part.type] = part.value;
    }
  }
  return parts;
}

function normalizeGmtOffset(offset: string): string {
  if (offset === "GMT") {
    return "+00:00";
  }

  const match = offset.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) {
    throw new Error(`Unsupported timezone offset format: ${offset}`);
  }

  const [, sign, hours, minutes = "00"] = match;
  return `${sign}${hours.padStart(2, "0")}:${minutes}`;
}

function coerceDate(value: Date | string | number): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${String(value)}`);
  }
  return date;
}

function pacificDateParts(value: Date | string | number): PacificDateParts {
  const date = coerceDate(value);
  const dateParts = buildFormatterPartMap(PACIFIC_DATE_TIME_FORMATTER, date);
  const offsetParts = buildFormatterPartMap(PACIFIC_OFFSET_FORMATTER, date);
  const offset = normalizeGmtOffset(offsetParts.timeZoneName ?? "GMT-08:00");

  return {
    year: dateParts.year,
    month: dateParts.month,
    day: dateParts.day,
    hour: dateParts.hour,
    minute: dateParts.minute,
    second: dateParts.second,
    offset,
  };
}

export function formatIsoPacific(value: Date | string | number = new Date()): string {
  const parts = pacificDateParts(value);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${parts.offset}`;
}

export function nowIsoPacific(): string {
  return formatIsoPacific(new Date());
}

export function formatPacificDate(value: Date | string | number): string {
  const parts = pacificDateParts(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatPacificStreamKey(value: Date | string | number): string {
  const parts = pacificDateParts(value);
  return `${parts.year}-${parts.month}-${parts.day}_${parts.hour}-${parts.minute}-${parts.second}`;
}

// ---------------------------------------------------------------------------
// JSON / file helpers
// ---------------------------------------------------------------------------

export function jsonDumps(payload: unknown): string {
  return formatJson(payload);
}

export function loadJson<T>(filePath: string, fallback?: T): T {
  try {
    return readJsonFile<T>(filePath);
  } catch (error) {
    if (fallback !== undefined) {
      return structuredClone(fallback);
    }
    throw error;
  }
}

export function atomicWriteText(filePath: string, content: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const temporaryDirectory = mkdtempSync(join(tmpdir(), `.${basename(filePath)}.`));
  const temporaryPath = join(temporaryDirectory, `${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`);
  writeFileSync(temporaryPath, content, "utf8");
  renameSync(temporaryPath, filePath);
  rmSync(temporaryDirectory, { recursive: true, force: true });
}

export function writeJson(filePath: string, payload: unknown): void {
  atomicWriteText(filePath, jsonDumps(payload));
}

export function appendUnique<T>(values: T[], item: T): void {
  if (!values.includes(item)) {
    values.push(item);
  }
}

export function removePath(path: string): void {
  rmSync(path, { recursive: true, force: true });
}

/**
 * Format seconds into a human-readable video timestamp (H:MM:SS).
 * Fractional seconds are truncated.
 */
export function formatTimestamp(totalSeconds: number): string {
  const absSeconds = Math.abs(totalSeconds);
  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const seconds = Math.floor(absSeconds % 60);
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function buildResult(status: string, fields: Record<string, unknown> = {}): Record<string, unknown> {
  return { status, ...fields };
}

// ---------------------------------------------------------------------------
// Path helpers — pipeline-level
// ---------------------------------------------------------------------------

/**
 * Pipeline-state.json lives at the date level, not inside a stream dir.
 * `dateDir` is e.g. `vault/stream-videos/YYYY-MM/YYYY-MM-DD/`.
 */
export function pipelineStatePath(dateDir: string): string {
  return join(dateDir, "pipeline-state.json");
}

// ---------------------------------------------------------------------------
// Path helpers — pipeline state files (meta/pipeline/)
// ---------------------------------------------------------------------------

export function sourceStreamPath(streamDir: string): string {
  return join(metaPipelineDir(streamDir), "source_stream.json");
}

export function youtubeMetadataPath(streamDir: string): string {
  return join(metaPipelineDir(streamDir), "youtube-metadata.json");
}

export function videoStatePath(streamDir: string): string {
  return join(metaPipelineDir(streamDir), "video-state.json");
}

// ---------------------------------------------------------------------------
// Path helpers — raw media (stream root)
// ---------------------------------------------------------------------------

export function vodPath(streamDir: string, streamKey: string): string {
  return join(streamDir, `${streamKey}_vod.mp4`);
}

export function transcriptPath(streamDir: string, streamKey: string): string {
  return join(streamDir, `${streamKey}_transcript.json`);
}

// ---------------------------------------------------------------------------
// Path helpers — stage outputs (meta/outputs/)
// ---------------------------------------------------------------------------

export function chunksDir(streamDir: string): string {
  return join(metaOutputsDir(streamDir), "chunks");
}

export function brainExtractPath(streamDir: string): string {
  return join(metaOutputsDir(streamDir), "brain-extract", "brain_extract.json");
}

export function brainExtractCandidatesDir(streamDir: string): string {
  return join(metaOutputsDir(streamDir), "brain-extract", "candidates");
}

export function streamChaptersPath(streamDir: string): string {
  return join(metaOutputsDir(streamDir), "stream-chapters", "stream_chapters.json");
}

export function chapterCandidatesDir(streamDir: string): string {
  return join(metaOutputsDir(streamDir), "stream-chapters", "candidates");
}

export function vodCutRecommendationsPath(streamDir: string): string {
  return join(metaOutputsDir(streamDir), "vod_cut_recommendations.json");
}

export function streamImprovementRecommendationsPath(streamDir: string): string {
  return join(metaOutputsDir(streamDir), "stream_improvement_recommendations.json");
}

export function clipSuggestionsPath(streamDir: string): string {
  return join(metaOutputsDir(streamDir), "clip_suggestions.json");
}

export function compositeClipSuggestionsPath(streamDir: string): string {
  return join(metaOutputsDir(streamDir), "composite_clip_suggestions.json");
}

export function streamSummaryPath(streamDir: string): string {
  return join(metaOutputsDir(streamDir), "stream_summary.json");
}

export function streamTitlePath(streamDir: string): string {
  return join(metaOutputsDir(streamDir), "stream_title.json");
}

export function youtubePublishPath(streamDir: string): string {
  return join(metaOutputsDir(streamDir), "youtube_publish.json");
}

export function clipsDir(streamDir: string): string {
  return join(metaOutputsDir(streamDir), "clips");
}

export function clipProductionManifestPath(streamDir: string): string {
  return join(metaOutputsDir(streamDir), "clip_production_manifest.json");
}

export function compositeClipsDir(streamDir: string): string {
  return join(metaOutputsDir(streamDir), "composite-clips");
}

export function compositeClipProductionManifestPath(streamDir: string): string {
  return join(metaOutputsDir(streamDir), "composite_clip_production_manifest.json");
}

// ---------------------------------------------------------------------------
// Stage state creation
// ---------------------------------------------------------------------------

function createDefaultStageState(): StageState {
  return {
    status: "pending",
    started_at: null,
    completed_at: null,
    error: null,
    result: {},
  };
}

function createDefaultStages(): Record<V2PipelineStage, StageState> {
  const stages = {} as Record<V2PipelineStage, StageState>;
  for (const stage of V2_PIPELINE_STAGES) {
    stages[stage] = createDefaultStageState();
  }
  return stages;
}

// ---------------------------------------------------------------------------
// Video state helpers
// ---------------------------------------------------------------------------

export function createVideoState(options: {
  streamDate: string;
  streamKey: string;
  youtubeVideoId: string;
}): VideoState {
  return {
    generated_at: nowIsoPacific(),
    stream_date: options.streamDate,
    stream_key: options.streamKey,
    youtube_video_id: options.youtubeVideoId,
    stages: createDefaultStages(),
  };
}

export function loadVideoState(streamDir: string): VideoState | null {
  const statePath = videoStatePath(streamDir);
  if (!safeExists(statePath)) {
    return null;
  }
  return loadJson<VideoState>(statePath);
}

export function writeVideoState(streamDir: string, state: VideoState): void {
  state.generated_at = nowIsoPacific();
  writeJson(videoStatePath(streamDir), state);
}

export function markStageStarted(state: VideoState, stage: V2PipelineStage): void {
  state.stages[stage] = {
    status: "pending",
    started_at: nowIsoPacific(),
    completed_at: null,
    error: null,
    result: {},
  };
}

export function markStageSuccess(
  state: VideoState,
  stage: V2PipelineStage,
  result: Record<string, unknown> = {},
): void {
  state.stages[stage] = {
    status: "success",
    started_at: state.stages[stage].started_at,
    completed_at: nowIsoPacific(),
    error: null,
    result,
  };
}

export function markStageError(
  state: VideoState,
  stage: V2PipelineStage,
  error: string,
): void {
  state.stages[stage] = {
    status: "error",
    started_at: state.stages[stage].started_at,
    completed_at: nowIsoPacific(),
    error,
    result: {},
  };
}

export function markStageSkipped(
  state: VideoState,
  stage: V2PipelineStage,
  result: Record<string, unknown> = {},
): void {
  state.stages[stage] = {
    status: "skipped",
    started_at: state.stages[stage].started_at,
    completed_at: nowIsoPacific(),
    error: null,
    result,
  };
}

export function stageStatus(state: VideoState, stage: V2PipelineStage): StageStatus {
  return state.stages[stage].status;
}

export function stageIsComplete(state: VideoState, stage: V2PipelineStage): boolean {
  return state.stages[stage].status === "success";
}

// ---------------------------------------------------------------------------
// Pipeline state helpers
// ---------------------------------------------------------------------------

export function createPipelineState(runDate: string): PipelineState {
  const now = nowIsoPacific();
  return {
    generated_at: now,
    run_date: runDate,
    started_at: now,
    completed_at: null,
    status: "discovering",
    discovery: {
      status: "pending",
      completed_at: null,
      work_queue_size: 0,
      error: null,
    },
    videos: {},
    summary: {
      total_videos: 0,
      completed: 0,
      failed: 0,
    },
  };
}

export function loadPipelineState(dateDir: string): PipelineState | null {
  const statePath = pipelineStatePath(dateDir);
  if (!safeExists(statePath)) {
    return null;
  }
  return loadJson<PipelineState>(statePath);
}

export function writePipelineState(dateDir: string, state: PipelineState): void {
  state.generated_at = nowIsoPacific();
  writeJson(pipelineStatePath(dateDir), state);
}

export function setPipelineDiscoveryResult(
  state: PipelineState,
  discovery: {
    status: "success" | "error" | "no_work";
    workQueueSize: number;
    error?: string;
  },
): void {
  state.discovery = {
    status: discovery.status,
    completed_at: nowIsoPacific(),
    work_queue_size: discovery.workQueueSize,
    error: discovery.error ?? null,
  };

  if (discovery.status === "error" && discovery.workQueueSize === 0) {
    state.status = "failed";
    state.completed_at = nowIsoPacific();
  } else if (discovery.status === "no_work") {
    state.status = "completed";
    state.completed_at = nowIsoPacific();
  } else {
    state.status = "processing";
  }
}

export function addVideoToPipelineState(
  state: PipelineState,
  streamKey: string,
  entry: { streamDir: string; youtubeVideoId: string },
): void {
  state.videos[streamKey] = {
    stream_dir: entry.streamDir,
    youtube_video_id: entry.youtubeVideoId,
    status: "queued",
    started_at: null,
    completed_at: null,
    error: null,
    stage_summary: {
      succeeded: [],
      failed: [],
      skipped: [],
    },
  };
  state.summary.total_videos = Object.keys(state.videos).length;
}

export function markVideoProcessing(state: PipelineState, streamKey: string): void {
  const video = state.videos[streamKey];
  if (!video) {
    return;
  }
  video.status = "processing";
  video.started_at = nowIsoPacific();
}

export function markVideoCompleted(
  state: PipelineState,
  streamKey: string,
  stageSummary: { succeeded: string[]; failed: string[]; skipped: string[] },
): void {
  const video = state.videos[streamKey];
  if (!video) {
    return;
  }
  const hasFailed = stageSummary.failed.length > 0;
  video.status = hasFailed ? "failed" : "completed";
  video.completed_at = nowIsoPacific();
  video.stage_summary = stageSummary;
  if (hasFailed) {
    state.summary.failed += 1;
  } else {
    state.summary.completed += 1;
  }
}

export function markVideoFailed(
  state: PipelineState,
  streamKey: string,
  error: string,
): void {
  const video = state.videos[streamKey];
  if (!video) {
    return;
  }
  video.status = "failed";
  video.completed_at = nowIsoPacific();
  video.error = error;
  state.summary.failed += 1;
}

export function finalizePipelineState(state: PipelineState): void {
  const allDone = Object.values(state.videos).every(
    (v) => v.status === "completed" || v.status === "failed",
  );
  if (allDone) {
    state.status = state.summary.failed > 0 && state.summary.completed === 0 ? "failed" : "completed";
    state.completed_at = nowIsoPacific();
  }
}
