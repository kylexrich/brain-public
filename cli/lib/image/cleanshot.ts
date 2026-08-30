import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, extname, join } from "node:path";
import { isRecord } from "../shared/util/json.js";

const API_ROOT = "https://api.cleanshot.cloud";
const CACHE_DATABASE_PATH = join(homedir(), "Library/Caches/pl.maketheweb.cleanshotx/Cache.db");
const CACHE_QUERY = `
  SELECT hex(blob.request_object)
  FROM cfurl_cache_response AS response
  JOIN cfurl_cache_blob_data AS blob USING (entry_ID)
  WHERE response.request_key LIKE 'https://api.cleanshot.cloud/%'
  ORDER BY response.entry_ID DESC
  LIMIT 50;
`;
const BEARER_PATTERN = /Bearer\s+([A-Za-z0-9._~=-]+)/;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const STORAGE_HOST_PATTERN = /^[a-z0-9][a-z0-9.-]*\.s3(?:[.-][a-z0-9-]+)*\.amazonaws\.com$/;
const RAW_MEDIA_HOST = "media.cleanshot.cloud";
const API_TIMEOUT_MS = 20_000;
const STORAGE_TIMEOUT_MS = 120_000;
const RAW_URL_WAIT_MS = 30_000;
const RAW_URL_POLL_INTERVAL_MS = 500;
const CHILD_PROCESS_TIMEOUT_MS = 5_000;
const CHILD_PROCESS_MAX_BUFFER_BYTES = 16 * 1024 * 1024;

interface CleanShotSession {
  bearerToken: string;
  userAgent: string;
}

interface UploadCreation {
  mediaId: number;
  uploadUrl: string;
  uploadParameters: Record<string, string>;
  shareUrl: string;
  expiresAt: string | null;
}

export interface CleanShotUploadOptions {
  imagePath: string;
  expiryDays: number | null;
  password: string | null;
  tags: string[];
  isRetina: boolean;
  shouldResolveRawUrl: boolean;
}

export interface CleanShotUploadResult {
  shareUrl: string;
  rawUrl: string | null;
  expiresAt: string | null;
}


function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`CleanShot returned an invalid ${label}`);
  }
  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`CleanShot returned an invalid ${label}`);
  }
  return value;
}

function requireInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value)) {
    throw new Error(`CleanShot returned an invalid ${label}`);
  }
  return value as number;
}

function requireOptionalString(value: unknown, label: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return requireString(value, label);
}

function parseHttpsUrl(value: unknown, label: string): string {
  const urlString = requireString(value, label);
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error(`CleanShot returned an invalid ${label}`);
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error(`CleanShot returned an invalid ${label}`);
  }
  return url.toString();
}

function parseRawMediaUrl(value: unknown): string {
  const rawUrl = parseHttpsUrl(value, "raw media URL");
  const parsedUrl = new URL(rawUrl);
  if (
    parsedUrl.hostname !== RAW_MEDIA_HOST ||
    !parsedUrl.pathname.startsWith("/media/") ||
    extname(parsedUrl.pathname).toLowerCase() !== ".png" ||
    !parsedUrl.searchParams.has("Expires") ||
    !parsedUrl.searchParams.has("Signature") ||
    !parsedUrl.searchParams.has("Key-Pair-Id")
  ) {
    throw new Error("CleanShot returned an invalid raw media URL");
  }
  return rawUrl;
}

function collectLeafStrings(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectLeafStrings(item));
  }
  if (isRecord(value)) {
    return Object.values(value).flatMap((item) => collectLeafStrings(item));
  }
  return [];
}

function parseCachedRequest(requestBytes: Buffer): unknown | null {
  const result = spawnSync("/usr/bin/plutil", ["-convert", "json", "-o", "-", "--", "-"], {
    encoding: "utf8",
    input: requestBytes,
    maxBuffer: CHILD_PROCESS_MAX_BUFFER_BYTES,
    timeout: CHILD_PROCESS_TIMEOUT_MS,
  });
  if (result.error || result.status !== 0 || !result.stdout) {
    return null;
  }
  try {
    return JSON.parse(result.stdout) as unknown;
  } catch {
    return null;
  }
}

function readCleanShotSession(): CleanShotSession {
  if (!existsSync(CACHE_DATABASE_PATH)) {
    throw new Error("CleanShot's local URL cache was not found");
  }

  const result = spawnSync("/usr/bin/sqlite3", ["-readonly", CACHE_DATABASE_PATH, CACHE_QUERY], {
    encoding: "utf8",
    maxBuffer: CHILD_PROCESS_MAX_BUFFER_BYTES,
    timeout: CHILD_PROCESS_TIMEOUT_MS,
  });
  if (result.error || result.status !== 0) {
    throw new Error("CleanShot's local URL cache could not be read");
  }

  for (const serializedRequest of result.stdout.split("\n")) {
    if (!/^(?:[0-9A-F]{2})+$/.test(serializedRequest)) {
      continue;
    }
    const request = parseCachedRequest(Buffer.from(serializedRequest, "hex"));
    const leaves = collectLeafStrings(request);
    for (const leaf of leaves) {
      const bearerMatch = BEARER_PATTERN.exec(leaf);
      if (!bearerMatch) {
        continue;
      }
      return {
        bearerToken: bearerMatch[1],
        userAgent: leaves.find((candidate) => candidate.startsWith("CleanShot X/")) ?? "CleanShot X",
      };
    }
  }

  throw new Error("No signed-in CleanShot session was found; open CleanShot Cloud and try again");
}

async function requestJson(
  session: CleanShotSession,
  path: string,
  options: { method: "GET" | "POST"; body?: Record<string, unknown> },
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${API_ROOT}${path}`, {
      method: options.method,
      headers: {
        Authorization: `Bearer ${session.bearerToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": session.userAgent,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch (error) {
    const reason = error instanceof Error && error.name === "TimeoutError" ? "timed out" : "failed";
    throw new Error(`CleanShot API request ${reason}`);
  }

  if (!response.ok) {
    throw new Error(`CleanShot API returned HTTP ${response.status}`);
  }
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new Error("CleanShot API returned invalid JSON");
  }
}

function parsePngDimensions(imageBytes: Buffer): { widthPixels: number; heightPixels: number } {
  if (
    imageBytes.length < 24 ||
    !imageBytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE) ||
    imageBytes.subarray(12, 16).toString("ascii") !== "IHDR"
  ) {
    throw new Error("Input must be a valid PNG file");
  }
  const widthPixels = imageBytes.readUInt32BE(16);
  const heightPixels = imageBytes.readUInt32BE(20);
  if (widthPixels === 0 || heightPixels === 0) {
    throw new Error("PNG dimensions must be greater than zero");
  }
  return { widthPixels, heightPixels };
}

function readPngFile(imagePath: string): Buffer {
  let imageStats;
  try {
    imageStats = statSync(imagePath);
  } catch {
    throw new Error(`Image file not found: ${imagePath}`);
  }
  if (!imageStats.isFile()) {
    throw new Error(`Image path is not a file: ${imagePath}`);
  }

  let imageBytes: Buffer;
  try {
    imageBytes = readFileSync(imagePath);
  } catch {
    throw new Error(`Image file could not be read: ${imagePath}`);
  }
  if (imageBytes.length === 0) {
    throw new Error(`Image file is empty: ${imagePath}`);
  }
  parsePngDimensions(imageBytes);
  return imageBytes;
}

function parseUploadCreation(response: unknown): UploadCreation {
  const responseData = requireRecord(requireRecord(response, "create response").data, "create response data");
  const media = requireRecord(responseData.media, "media record");
  const rawUploadParameters = requireRecord(responseData.upload_paramteres, "upload parameters");
  const uploadParameters: Record<string, string> = {};
  for (const [fieldName, fieldValue] of Object.entries(rawUploadParameters)) {
    if (!/^[A-Za-z0-9-]+$/.test(fieldName)) {
      throw new Error("CleanShot returned an invalid upload field name");
    }
    uploadParameters[fieldName] = requireString(fieldValue, `upload parameter ${fieldName}`);
  }

  const uploadUrl = parseHttpsUrl(responseData.upload_url, "upload URL");
  if (!STORAGE_HOST_PATTERN.test(new URL(uploadUrl).hostname)) {
    throw new Error("CleanShot returned an unexpected storage upload host");
  }

  return {
    mediaId: requireInteger(media.id, "media ID"),
    uploadUrl,
    uploadParameters,
    shareUrl: parseHttpsUrl(media.full_url, "share URL"),
    expiresAt: requireOptionalString(media.expires_at, "expiration time"),
  };
}

async function createUpload(
  session: CleanShotSession,
  imagePath: string,
  imageBytes: Buffer,
  options: CleanShotUploadOptions,
): Promise<UploadCreation> {
  const { widthPixels, heightPixels } = parsePngDimensions(imageBytes);
  const body: Record<string, unknown> = {
    name: basename(imagePath),
    mime: "image/png",
    size: imageBytes.length,
    width: widthPixels,
    height: heightPixels,
    is_2x: options.isRetina,
    tags: options.tags,
    will_send_ocr: false,
  };
  if (options.expiryDays !== null) {
    body.expire_after = options.expiryDays;
  }
  if (options.password !== null) {
    body.password = options.password;
  }

  return parseUploadCreation(await requestJson(session, "/v1/media/image", { method: "POST", body }));
}

function imageBlob(imageBytes: Buffer): Blob {
  const bytes = new ArrayBuffer(imageBytes.byteLength);
  new Uint8Array(bytes).set(imageBytes);
  return new Blob([bytes], { type: "image/png" });
}

async function uploadImageBytes(upload: UploadCreation, imagePath: string, imageBytes: Buffer): Promise<void> {
  const body = new FormData();
  for (const [fieldName, fieldValue] of Object.entries(upload.uploadParameters)) {
    body.append(fieldName, fieldValue);
  }
  body.append("file", imageBlob(imageBytes), basename(imagePath));

  let response: Response;
  try {
    response = await fetch(upload.uploadUrl, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS),
    });
  } catch (error) {
    const reason = error instanceof Error && error.name === "TimeoutError" ? "timed out" : "failed";
    throw new Error(`CleanShot storage upload ${reason}`);
  }
  if (!response.ok) {
    throw new Error(`CleanShot storage returned HTTP ${response.status}`);
  }
}

function parseMediaDetailRawUrl(response: unknown): string | null {
  const responseData = requireRecord(requireRecord(response, "media detail response").data, "media detail response data");
  const media = requireRecord(responseData.media, "media detail record");
  if (media.media_url === null || media.media_url === undefined) {
    return null;
  }
  return parseRawMediaUrl(media.media_url);
}

async function waitForRawMediaUrl(session: CleanShotSession, mediaId: number): Promise<string> {
  const deadlineMs = Date.now() + RAW_URL_WAIT_MS;
  while (Date.now() < deadlineMs) {
    const response = await requestJson(session, `/v1/media/${mediaId}`, { method: "GET" });
    const rawUrl = parseMediaDetailRawUrl(response);
    if (rawUrl !== null) {
      return rawUrl;
    }
    await new Promise((resolve) => setTimeout(resolve, RAW_URL_POLL_INTERVAL_MS));
  }
  throw new Error(`CleanShot raw media URL was not ready after ${RAW_URL_WAIT_MS / 1000} seconds`);
}

export async function uploadPngToCleanShot(options: CleanShotUploadOptions): Promise<CleanShotUploadResult> {
  const imageBytes = readPngFile(options.imagePath);
  const session = readCleanShotSession();
  const upload = await createUpload(session, options.imagePath, imageBytes, options);
  await uploadImageBytes(upload, options.imagePath, imageBytes);
  await requestJson(session, `/v1/media/image/${upload.mediaId}/upload-completed`, { method: "POST", body: {} });

  let rawUrl: string | null = null;
  if (options.shouldResolveRawUrl) {
    try {
      rawUrl = await waitForRawMediaUrl(session, upload.mediaId);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Upload completed at ${upload.shareUrl}, but raw URL lookup failed: ${reason}`);
    }
  }

  return {
    shareUrl: upload.shareUrl,
    rawUrl,
    expiresAt: upload.expiresAt,
  };
}
