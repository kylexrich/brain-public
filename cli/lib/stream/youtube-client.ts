import { chmodSync, createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { google, type youtube_v3 } from "googleapis";
import { OAuth2Client, type Credentials } from "google-auth-library";
import { readJsonFile, writeJsonFile } from "../shared/util/json.js";
import { loadJson } from "./pipeline-utils.js";
import { BRAIN_ROOT } from "../shared/config.js";

const DEFAULT_CREDENTIALS_DIR = join(BRAIN_ROOT, "system/credentials/youtube");

export const DEFAULT_CLIENT_SECRET = join(DEFAULT_CREDENTIALS_DIR, "youtube-client-secret.json");
export const DEFAULT_TOKEN_PATH = join(DEFAULT_CREDENTIALS_DIR, "youtube-token.json");
export const ALL_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.force-ssl"
];

interface OAuthClientInfo {
  clientId: string;
  clientSecret: string;
  tokenUri: string;
  redirectUris: string[];
}

interface NormalizedYoutubeToken {
  credentials: Credentials;
  scopes: string[];
}

interface PersistedYoutubeToken {
  access_token: string;
  refresh_token: string;
  scope: string;
  expiry_date?: number;
  client_id: string;
  client_secret: string;
  token_type: string;
  token_uri: string;
  token: string;
  expiry?: string;
  scopes: string[];
}

interface YoutubeOAuthBundle {
  auth: OAuth2Client;
  refreshed: boolean;
  scopes: string[];
  clientInfo: OAuthClientInfo;
}

function readClientInfo(clientSecretPath: string): OAuthClientInfo {
  const payload = readJsonFile<Record<string, any>>(clientSecretPath);
  const client = payload.installed ?? payload.web ?? {};
  if (!client.client_id || !client.client_secret) {
    throw new Error(`Client secret JSON is missing client_id/client_secret: ${clientSecretPath}`);
  }
  return {
    clientId: String(client.client_id),
    clientSecret: String(client.client_secret),
    tokenUri: String(client.token_uri ?? "https://oauth2.googleapis.com/token"),
    redirectUris: Array.isArray(client.redirect_uris) ? client.redirect_uris.map((uri: unknown) => String(uri)) : []
  };
}

function normalizeTokenPayload(
  rawPayload: Record<string, any>,
  clientInfo: OAuthClientInfo,
  scopes: string[]
): NormalizedYoutubeToken {
  const normalizedScopes = Array.isArray(rawPayload.scopes)
    ? rawPayload.scopes.map((scope: unknown) => String(scope))
    : typeof rawPayload.scope === "string"
      ? rawPayload.scope.split(/\s+/).filter(Boolean)
      : scopes;

  const expiryDate =
    typeof rawPayload.expiry_date === "number"
      ? rawPayload.expiry_date
      : typeof rawPayload.expiry === "string" && rawPayload.expiry
        ? new Date(rawPayload.expiry).getTime()
        : undefined;

  return {
    credentials: {
      access_token: rawPayload.access_token ?? rawPayload.token,
      refresh_token: rawPayload.refresh_token,
      scope: typeof rawPayload.scope === "string" ? rawPayload.scope : normalizedScopes.join(" "),
      expiry_date: expiryDate,
      token_type: rawPayload.token_type ?? "Bearer"
    },
    scopes: normalizedScopes
  };
}

function serializeTokenPayload(credentials: Credentials, scopes: string[], clientInfo: OAuthClientInfo): PersistedYoutubeToken {
  const expiryTimestamp = typeof credentials.expiry_date === "number" ? credentials.expiry_date : undefined;
  const expiryDate = expiryTimestamp ? new Date(expiryTimestamp).toISOString().replace(/\.\d{3}Z$/, "Z") : undefined;
  return {
    access_token: credentials.access_token ?? "",
    refresh_token: credentials.refresh_token ?? "",
    scope: credentials.scope ?? scopes.join(" "),
    expiry_date: expiryTimestamp,
    client_id: clientInfo.clientId,
    client_secret: clientInfo.clientSecret,
    token_type: credentials.token_type ?? "Bearer",
    token_uri: clientInfo.tokenUri,
    token: credentials.access_token ?? "",
    expiry: expiryDate,
    scopes
  };
}

export function writeTokenFile(tokenPath: string, credentials: Credentials, scopes: string[], clientInfo: OAuthClientInfo): void {
  writeJsonFile(tokenPath, serializeTokenPayload(credentials, scopes, clientInfo));
  chmodSync(tokenPath, 0o600);
}

async function refreshIfNeeded(
  oauthClient: OAuth2Client,
  tokenPath: string,
  scopes: string[],
  clientInfo: OAuthClientInfo
): Promise<boolean> {
  const expiryDate = oauthClient.credentials.expiry_date;
  const needsRefresh =
    !oauthClient.credentials.access_token ||
    (typeof expiryDate === "number" && expiryDate <= Date.now() + 15 * 60 * 1000);

  if (!needsRefresh) {
    return false;
  }
  if (!oauthClient.credentials.refresh_token) {
    throw new Error("Token JSON does not contain a refresh_token. Re-run youtube_auth.");
  }

  await oauthClient.refreshAccessToken();
  writeTokenFile(tokenPath, oauthClient.credentials, scopes, clientInfo);
  return true;
}

export async function loadYoutubeOAuth(options: {
  tokenPath?: string;
  clientSecretPath?: string;
  scopes?: string[];
} = {}): Promise<YoutubeOAuthBundle> {
  const tokenPath = resolve(options.tokenPath ?? DEFAULT_TOKEN_PATH);
  const clientSecretPath = resolve(options.clientSecretPath ?? DEFAULT_CLIENT_SECRET);
  const scopes = options.scopes ?? ALL_SCOPES;
  const clientInfo = readClientInfo(clientSecretPath);
  const rawPayload = readJsonFile<Record<string, any>>(tokenPath);
  const normalizedToken = normalizeTokenPayload(rawPayload, clientInfo, scopes);

  const auth = new OAuth2Client(clientInfo.clientId, clientInfo.clientSecret);
  auth.setCredentials(normalizedToken.credentials);
  const refreshed = await refreshIfNeeded(auth, tokenPath, normalizedToken.scopes, clientInfo);
  return { auth, refreshed, scopes: normalizedToken.scopes, clientInfo };
}

export async function getAccessToken(
  auth: OAuth2Client,
  tokenPath: string,
  scopes: string[],
  clientInfo: OAuthClientInfo
): Promise<string> {
  const refreshed = await refreshIfNeeded(auth, tokenPath, scopes, clientInfo);
  if (refreshed) {
    return String(auth.credentials.access_token ?? "");
  }
  const token = await auth.getAccessToken();
  if (!token.token) {
    throw new Error("Could not obtain a YouTube OAuth access token.");
  }
  return token.token;
}

export function buildYoutubeService(auth: OAuth2Client) {
  return google.youtube({ version: "v3", auth });
}

export interface YoutubeCompletedLivestream {
  videoId: string;
  title: string;
  url: string;
  actualStartTime: string | null;
  actualEndTime: string | null;
  durationIso: string | null;
  vodDurationSec: number | null;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function chunkValues<T>(values: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }
  return chunks;
}

export function parseYoutubeDurationToSeconds(durationIso: string | null | undefined): number | null {
  if (!durationIso) {
    return null;
  }

  const match = durationIso.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
  if (!match) {
    return null;
  }

  const [, days = "0", hours = "0", minutes = "0", seconds = "0"] = match;
  const totalSeconds =
    Number(days) * 86_400 +
    Number(hours) * 3_600 +
    Number(minutes) * 60 +
    Number(seconds);

  return Number.isFinite(totalSeconds) ? Number(totalSeconds.toFixed(3)) : null;
}

export function extractYoutubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (hostname === "youtu.be") {
      const candidate = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
      return /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
    }

    if (!hostname.endsWith("youtube.com")) {
      return null;
    }

    const watchId = parsed.searchParams.get("v") ?? "";
    if (/^[A-Za-z0-9_-]{11}$/.test(watchId)) {
      return watchId;
    }

    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    const candidate = pathSegments[pathSegments.length - 1] ?? "";
    return /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function normalizeLivestreamRecord(fields: {
  videoId: string;
  title?: string | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  durationIso?: string | null;
}): YoutubeCompletedLivestream {
  return {
    videoId: fields.videoId,
    title: normalizeOptionalString(fields.title) ?? "",
    url: `https://youtube.com/watch?v=${fields.videoId}`,
    actualStartTime: normalizeOptionalString(fields.actualStartTime),
    actualEndTime: normalizeOptionalString(fields.actualEndTime),
    durationIso: normalizeOptionalString(fields.durationIso),
    vodDurationSec: parseYoutubeDurationToSeconds(normalizeOptionalString(fields.durationIso))
  };
}

async function fetchVideoDetailsById(
  youtube: youtube_v3.Youtube,
  videoIds: string[]
): Promise<Map<string, YoutubeCompletedLivestream>> {
  const normalizedIds = [...new Set(videoIds.map((value) => value.trim()).filter(Boolean))];
  const details = new Map<string, YoutubeCompletedLivestream>();
  if (normalizedIds.length === 0) {
    return details;
  }

  for (const idChunk of chunkValues(normalizedIds, 50)) {
    const response = await youtube.videos.list({
      part: ["snippet", "contentDetails", "liveStreamingDetails"],
      id: idChunk
    });

    for (const item of response.data.items ?? []) {
      const videoId = normalizeOptionalString(item.id);
      if (!videoId) {
        continue;
      }

      details.set(
        videoId,
        normalizeLivestreamRecord({
          videoId,
          title: item.snippet?.title,
          actualStartTime: item.liveStreamingDetails?.actualStartTime,
          actualEndTime: item.liveStreamingDetails?.actualEndTime,
          durationIso: item.contentDetails?.duration
        })
      );
    }
  }

  return details;
}

export async function buildAuthorizedYoutubeService(options: {
  tokenPath?: string;
  scopes?: string[];
} = {}): Promise<youtube_v3.Youtube> {
  const { auth } = await loadYoutubeOAuth({
    tokenPath: options.tokenPath,
    scopes: options.scopes ?? ALL_SCOPES
  });
  return buildYoutubeService(auth);
}

export async function listCompletedYoutubeLivestreams(tokenPath: string): Promise<YoutubeCompletedLivestream[]> {
  const youtube = await buildAuthorizedYoutubeService({ tokenPath, scopes: ALL_SCOPES });

  const broadcasts: YoutubeCompletedLivestream[] = [];
  let pageToken: string | undefined;

  while (true) {
    const response = await youtube.liveBroadcasts.list({
      part: ["snippet"],
      broadcastStatus: "completed",
      maxResults: 50,
      pageToken
    });

    const pageBroadcasts: YoutubeCompletedLivestream[] = [];
    const videoIds: string[] = [];
    for (const item of response.data.items ?? []) {
      const videoId = normalizeOptionalString(item.id);
      if (!videoId) {
        continue;
      }

      videoIds.push(videoId);
      pageBroadcasts.push(
        normalizeLivestreamRecord({
          videoId,
          title: item.snippet?.title,
          actualStartTime: item.snippet?.actualStartTime,
          actualEndTime: item.snippet?.actualEndTime
        })
      );
    }

    const videoDetails = await fetchVideoDetailsById(youtube, videoIds);
    for (const broadcast of pageBroadcasts) {
      const details = videoDetails.get(broadcast.videoId);
      if (!details) {
        continue;
      }

      broadcast.title = details.title || broadcast.title;
      broadcast.actualStartTime = details.actualStartTime ?? broadcast.actualStartTime;
      broadcast.actualEndTime = details.actualEndTime ?? broadcast.actualEndTime;
      broadcast.durationIso = details.durationIso;
      broadcast.vodDurationSec = details.vodDurationSec;
    }

    broadcasts.push(...pageBroadcasts);

    pageToken = normalizeOptionalString(response.data.nextPageToken) ?? undefined;
    if (!pageToken) {
      break;
    }
  }

  return broadcasts;
}

export async function lookupCompletedYoutubeLivestreamByVideoId(
  videoId: string,
  tokenPath: string
): Promise<YoutubeCompletedLivestream | null> {
  const normalizedVideoId = extractYoutubeVideoId(videoId);
  if (!normalizedVideoId) {
    return null;
  }

  const youtube = await buildAuthorizedYoutubeService({ tokenPath, scopes: ALL_SCOPES });
  const details = await fetchVideoDetailsById(youtube, [normalizedVideoId]);
  return details.get(normalizedVideoId) ?? null;
}

// ---------------------------------------------------------------------------
// V2 youtube-sync: fetch current video metadata
// ---------------------------------------------------------------------------

export interface YoutubeVideoMetadata {
  title: string;
  description: string;
  vod_duration_sec: number;
}

export async function fetchYoutubeVideoMetadata(
  videoId: string,
  options: { tokenPath?: string } = {},
): Promise<YoutubeVideoMetadata> {
  const youtube = await buildAuthorizedYoutubeService({
    tokenPath: options.tokenPath,
    scopes: ALL_SCOPES,
  });

  const response = await youtube.videos.list({
    part: ["snippet", "contentDetails"],
    id: [videoId],
  });

  const item = response.data.items?.[0];
  if (!item) {
    throw new Error(`YouTube video not found: ${videoId}`);
  }

  return {
    title: item.snippet?.title ?? "",
    description: item.snippet?.description ?? "",
    vod_duration_sec: parseYoutubeDurationToSeconds(item.contentDetails?.duration) ?? 0,
  };
}

// ---------------------------------------------------------------------------
// V2 youtube-publish: push youtube-metadata.json to YouTube
// ---------------------------------------------------------------------------

export interface YoutubePublishResult {
  video_id: string;
  published_title: boolean;
  published_description: boolean;
}

export async function publishYoutubeMetadata(options: {
  youtubeMetadataFile: string;
  videoId: string;
  tokenPath?: string;
}): Promise<YoutubePublishResult> {
  const metadata = loadJson<{ title?: string; description?: string }>(options.youtubeMetadataFile);
  const hasTitle = typeof metadata.title === "string" && metadata.title.length > 0;
  const hasDescription = typeof metadata.description === "string" && metadata.description.length > 0;

  if (!hasTitle && !hasDescription) {
    return {
      video_id: options.videoId,
      published_title: false,
      published_description: false,
    };
  }

  const { auth } = await loadYoutubeOAuth({
    tokenPath: options.tokenPath,
    scopes: ALL_SCOPES,
  });
  const youtube = buildYoutubeService(auth);

  const snippet: youtube_v3.Schema$VideoSnippet = {};

  // The YouTube API requires categoryId when updating snippet
  const currentVideo = await youtube.videos.list({
    part: ["snippet"],
    id: [options.videoId],
  });
  const currentSnippet = currentVideo.data.items?.[0]?.snippet;
  snippet.categoryId = currentSnippet?.categoryId ?? "20";

  if (hasTitle) {
    snippet.title = metadata.title;
  } else {
    snippet.title = currentSnippet?.title ?? "";
  }

  if (hasDescription) {
    snippet.description = metadata.description;
  } else {
    snippet.description = currentSnippet?.description ?? "";
  }

  await youtube.videos.update({
    part: ["snippet"],
    requestBody: {
      id: options.videoId,
      snippet,
    },
  });

  return {
    video_id: options.videoId,
    published_title: hasTitle,
    published_description: hasDescription,
  };
}

// ---------------------------------------------------------------------------
// videos.insert — upload a produced clip/composite MP4 as a new YouTube video
// ---------------------------------------------------------------------------

export type YoutubePrivacyStatus = "private" | "unlisted" | "public";

export interface YoutubeUploadOptions {
  filePath: string;
  title: string;
  description: string;
  privacyStatus: YoutubePrivacyStatus;
  tags?: string[];
  categoryId?: string;
  publishAt?: string;
  tokenPath?: string;
}

export interface YoutubeUploadResult {
  video_id: string;
  url: string;
  privacy_status: YoutubePrivacyStatus;
  category_id: string;
  contains_synthetic_media: false;
  uploaded_at: string;
}

export async function uploadYoutubeVideo(options: YoutubeUploadOptions): Promise<YoutubeUploadResult> {
  const fileStats = statSync(options.filePath);
  if (!fileStats.isFile()) {
    throw new Error(`Upload source is not a regular file: ${options.filePath}`);
  }

  if (options.title.trim().length === 0) {
    throw new Error("YouTube upload requires a non-empty title");
  }
  if (options.title.length > 100) {
    throw new Error(`YouTube title exceeds 100 characters (${options.title.length}): ${options.title.slice(0, 60)}…`);
  }
  if (options.description.length > 5000) {
    throw new Error(`YouTube description exceeds 5000 characters (${options.description.length})`);
  }

  const { auth } = await loadYoutubeOAuth({
    tokenPath: options.tokenPath,
    scopes: ALL_SCOPES,
  });
  const tokenScopes = (auth.credentials.scope ?? "").split(/\s+/);
  if (!tokenScopes.includes("https://www.googleapis.com/auth/youtube.upload") && !tokenScopes.includes("https://www.googleapis.com/auth/youtube")) {
    throw new Error("YouTube token is missing the youtube.upload scope. Re-run brain stream youtube-auth.");
  }

  const youtube = buildYoutubeService(auth);
  const categoryId = options.categoryId ?? "28"; // Science & Technology — channel default for AI/engineering/chess content. Never fall back to 22 (People & Blogs).

  const response = await youtube.videos.insert(
    {
      part: ["snippet", "status"],
      notifySubscribers: false,
      requestBody: {
        snippet: {
          title: options.title,
          description: options.description,
          tags: options.tags,
          categoryId,
          defaultLanguage: "en",
        },
        status: {
          privacyStatus: options.privacyStatus,
          publishAt: options.publishAt,
          selfDeclaredMadeForKids: false,
          containsSyntheticMedia: false,
          embeddable: true,
          license: "youtube",
          publicStatsViewable: true,
        },
      },
      media: {
        mimeType: "video/mp4",
        body: createReadStream(options.filePath),
      },
    },
  );

  const videoId = response.data.id;
  if (!videoId) {
    throw new Error("YouTube videos.insert returned no video id");
  }

  return {
    video_id: videoId,
    url: `https://youtube.com/watch?v=${videoId}`,
    privacy_status: options.privacyStatus,
    category_id: categoryId,
    contains_synthetic_media: false,
    uploaded_at: new Date().toISOString(),
  };
}

export async function runLocalServerAuthFlow(options: {
  clientSecretPath?: string;
  tokenPath?: string;
  scopes?: string[];
  noBrowser?: boolean;
} = {}): Promise<Record<string, any>> {
  const clientSecretPath = resolve(options.clientSecretPath ?? DEFAULT_CLIENT_SECRET);
  const tokenPath = resolve(options.tokenPath ?? DEFAULT_TOKEN_PATH);
  const scopes = options.scopes ?? ALL_SCOPES;
  const clientInfo = readClientInfo(clientSecretPath);

  const server = createServer();
  await new Promise<void>((resolveServer) => {
    server.listen(0, "127.0.0.1", () => resolveServer());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not allocate a localhost OAuth callback port.");
  }

  const redirectUri = `http://localhost:${address.port}/`;
  const auth = new OAuth2Client(clientInfo.clientId, clientInfo.clientSecret, redirectUri);
  const authUrl = auth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes
  });

  process.stdout.write(`Open this URL in your browser to authorize YouTube uploads:\n${authUrl}\n`);
  if (!options.noBrowser) {
    spawnSync("open", [authUrl], { stdio: "ignore" });
  }

  const code = await new Promise<string>((resolveCode, rejectCode) => {
    server.on("request", async (request, response) => {
      try {
        const requestUrl = new URL(request.url ?? "/", redirectUri);
        const oauthCode = requestUrl.searchParams.get("code");
        if (!oauthCode) {
          response.statusCode = 400;
          response.end("Missing OAuth code.");
          rejectCode(new Error("OAuth callback did not include a code."));
          return;
        }

        response.statusCode = 200;
        response.end("YouTube authorization complete. You can close this tab.");
        resolveCode(oauthCode);
      } catch (error) {
        rejectCode(error);
      } finally {
        server.close();
      }
    });
  });

  const tokenResponse = await auth.getToken(code);
  auth.setCredentials(tokenResponse.tokens);
  writeTokenFile(tokenPath, auth.credentials, scopes, clientInfo);

  return {
    token_path: tokenPath,
    scopes,
    has_refresh_token: Boolean(auth.credentials.refresh_token),
    client_id: clientInfo.clientId
  };
}
