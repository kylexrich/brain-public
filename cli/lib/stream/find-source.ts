import {
  formatPacificDate,
  formatPacificStreamKey,
} from "./pipeline-utils.js";
import {
  extractYoutubeVideoId,
  listCompletedYoutubeLivestreams,
  lookupCompletedYoutubeLivestreamByVideoId,
  type YoutubeCompletedLivestream,
} from "./youtube-client.js";

export const MAX_STREAM_HINT_DELTA_MS = 2 * 3_600_000;

export interface SourceStreamMatch {
  found: true;
  video_id: string;
  title: string;
  url: string;
  actual_start_time: string;
  actual_end_time: string | null;
  duration_iso: string | null;
  vod_duration_sec: number | null;
  stream_date: string;
  stream_key: string;
  matched_by: string;
  matched_from?: number;
  match_delta_sec?: number | null;
}

export interface MissingSourceStreamMatch {
  found: false;
  matched_by: string;
  reason?: string;
  stream_date?: string;
  stream_key?: string;
  video_id?: string;
  url?: string;
}

export type SourceLookupResult = SourceStreamMatch | MissingSourceStreamMatch;

function stemMatchesPattern(value: string): boolean {
  return /^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/.test(value);
}

export function parseObsStemTime(obsStem: string): Date | null {
  const match = obsStem.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, year, month, day, hours, minutes, seconds] = match;
  return new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}`);
}

function localTimeOfDayMs(date: Date): number {
  return date.getHours() * 3_600_000 + date.getMinutes() * 60_000 + date.getSeconds() * 1_000;
}

export function streamHintDeltaMs(left: string, right: string): number | null {
  const leftTime = parseObsStemTime(left);
  const rightTime = parseObsStemTime(right);
  if (!leftTime || !rightTime) {
    return null;
  }

  return Math.abs(localTimeOfDayMs(leftTime) - localTimeOfDayMs(rightTime));
}

export function deriveStreamIdentity(actualStartTime: string): { stream_date: string; stream_key: string } {
  return {
    stream_date: formatPacificDate(actualStartTime),
    stream_key: formatPacificStreamKey(actualStartTime),
  };
}

function compareSourceMatches(left: SourceStreamMatch, right: SourceStreamMatch): number {
  return left.actual_start_time.localeCompare(right.actual_start_time);
}

function buildSourceStreamMatch(
  record: YoutubeCompletedLivestream,
  matchedBy: string,
  fields: { matched_from?: number; match_delta_ms?: number | null } = {},
): SourceStreamMatch | null {
  if (!record.actualStartTime) {
    return null;
  }

  const identity = deriveStreamIdentity(record.actualStartTime);
  return {
    found: true,
    video_id: record.videoId,
    title: record.title,
    url: record.url,
    actual_start_time: record.actualStartTime,
    actual_end_time: record.actualEndTime,
    duration_iso: record.durationIso,
    vod_duration_sec: record.vodDurationSec,
    stream_date: identity.stream_date,
    stream_key: identity.stream_key,
    matched_by: matchedBy,
    matched_from: fields.matched_from,
    match_delta_sec:
      fields.match_delta_ms === null || fields.match_delta_ms === undefined
        ? null
        : Number((fields.match_delta_ms / 1000).toFixed(3)),
  };
}

function buildMissingSourceResult(
  matchedBy: string,
  fields: { reason?: string; stream_date?: string; stream_key?: string; video_id?: string; url?: string } = {},
): MissingSourceStreamMatch {
  return {
    found: false,
    matched_by: matchedBy,
    reason: fields.reason,
    stream_date: fields.stream_date,
    stream_key: fields.stream_key,
    video_id: fields.video_id,
    url: fields.url,
  };
}

function compareStreamHints(match: SourceStreamMatch, streamHint: string): number | null {
  return streamHintDeltaMs(match.stream_key, streamHint);
}

export function pickBestMatch(matches: SourceStreamMatch[], streamHint?: string): SourceStreamMatch | null {
  if (matches.length === 0) {
    return null;
  }

  const sortedMatches = [...matches].sort(compareSourceMatches);
  if (!streamHint || !stemMatchesPattern(streamHint)) {
    return sortedMatches[0];
  }

  let bestMatch: SourceStreamMatch | null = null;
  let bestDeltaMs = Number.POSITIVE_INFINITY;

  for (const match of sortedMatches) {
    const deltaMs = compareStreamHints(match, streamHint);
    if (deltaMs === null) {
      continue;
    }

    if (deltaMs < bestDeltaMs) {
      bestDeltaMs = deltaMs;
      bestMatch = match;
    }
  }

  if (!bestMatch || bestDeltaMs > MAX_STREAM_HINT_DELTA_MS) {
    return null;
  }

  return {
    ...bestMatch,
    match_delta_sec: Number((bestDeltaMs / 1000).toFixed(3)),
  };
}

export async function listCompletedSourceStreams(options: {
  tokenPath: string;
  streamDate?: string;
}): Promise<SourceStreamMatch[]> {
  const matches = (await listCompletedYoutubeLivestreams(options.tokenPath))
    .map((record) => buildSourceStreamMatch(record, "completed_broadcast_scan"))
    .filter((record): record is SourceStreamMatch => record !== null)
    .sort(compareSourceMatches);

  if (!options.streamDate) {
    return matches;
  }

  return matches.filter((record) => record.stream_date === options.streamDate);
}

export async function findAllBroadcastsForDate(dateString: string, tokenPath: string): Promise<SourceStreamMatch[]> {
  return listCompletedSourceStreams({ tokenPath, streamDate: dateString });
}

export async function lookupSourceStreamByVideoId(videoId: string, tokenPath: string): Promise<SourceLookupResult> {
  const normalizedVideoId = extractYoutubeVideoId(videoId);
  if (!normalizedVideoId) {
    return buildMissingSourceResult("video_id", {
      reason: "invalid_video_id",
      video_id: videoId,
    });
  }

  const record = await lookupCompletedYoutubeLivestreamByVideoId(normalizedVideoId, tokenPath);
  if (!record) {
    return buildMissingSourceResult("video_id", {
      reason: "video_not_found",
      video_id: normalizedVideoId,
      url: `https://youtube.com/watch?v=${normalizedVideoId}`,
    });
  }

  const match = buildSourceStreamMatch(record, "video_id");
  return match ?? buildMissingSourceResult("video_id", {
    reason: "missing_actual_start_time",
    video_id: normalizedVideoId,
    url: record.url,
  });
}

export async function lookupSourceStreamByUrl(url: string, tokenPath: string): Promise<SourceLookupResult> {
  const normalizedVideoId = extractYoutubeVideoId(url);
  if (!normalizedVideoId) {
    return buildMissingSourceResult("url", {
      reason: "invalid_youtube_url",
      url,
    });
  }

  const lookup = await lookupSourceStreamByVideoId(normalizedVideoId, tokenPath);
  if (!lookup.found) {
    return {
      ...lookup,
      matched_by: "url",
      url,
    };
  }

  return {
    ...lookup,
    matched_by: "url",
    url,
  };
}

export async function lookupSourceStreamByDate(
  dateString: string,
  tokenPath: string,
  streamHint?: string,
): Promise<SourceLookupResult> {
  const broadcasts = await findAllBroadcastsForDate(dateString, tokenPath);
  const best = pickBestMatch(broadcasts, streamHint);

  if (!best) {
    return buildMissingSourceResult(streamHint ? "date+time_hint" : "date", {
      reason: broadcasts.length === 0 ? "no_completed_broadcasts_for_date" : "no_broadcast_matched_stream_hint",
      stream_date: dateString,
      stream_key: streamHint,
    });
  }

  return {
    ...best,
    matched_by: streamHint ? "date+time_hint" : "date",
    matched_from: broadcasts.length,
  };
}
