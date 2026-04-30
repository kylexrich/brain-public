import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { formatJson } from "../shared/util/json.js";

export const DEFAULT_BASE_URL = "https://amp-api.music.apple.com";
export const DEFAULT_TOKEN_FILE = join(homedir(), "Library/Application Support/sonoscli/applemusic_token.json");
export const DEFAULT_TIMEOUT_MS = 20_000;
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_LIMIT = 25;
export const DEFAULT_MAX_PAGES = 10;

export class AppleMusicError extends Error {}
export class AppleMusicAuthError extends AppleMusicError {}

export interface AppleMusicTokenPayload {
  source: string;
  token: {
    developerToken: string;
    musicUserToken: string;
    storefrontId: string;
    createdAt: string | null;
    expiresAt: string | null;
  };
}

export interface AppleMusicListOptions {
  limit: number;
  offset?: number;
  all: boolean;
  maxPages: number;
  contains?: string;
  format: "plain" | "json" | "tsv";
  raw?: boolean;
}

interface AppleMusicCollectionResult {
  data: Array<Record<string, any>>;
  next?: string;
  pagesFetched: number;
  rawPages: Array<Record<string, any>>;
}

function parseIso(value?: string | null): Date | null {
  if (!value) {
    return null;
  }
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

export function loadTokenPayload(tokenFilePath: string = DEFAULT_TOKEN_FILE): AppleMusicTokenPayload {
  const developerToken = process.env.APPLE_MUSIC_DEVELOPER_TOKEN;
  const musicUserToken = process.env.APPLE_MUSIC_USER_TOKEN;
  const storefrontId = process.env.APPLE_MUSIC_STOREFRONT;

  if (developerToken && musicUserToken) {
    return {
      source: "env",
      token: {
        developerToken,
        musicUserToken,
        storefrontId: storefrontId || "us",
        createdAt: null,
        expiresAt: null
      }
    };
  }

  if (!existsSync(tokenFilePath)) {
    throw new AppleMusicAuthError(
      `Token file not found: ${tokenFilePath}. Run \`sonos-pr3 auth applemusic login\` first.`
    );
  }

  let payload: Record<string, any>;
  try {
    payload = JSON.parse(readFileSync(tokenFilePath, "utf8")) as Record<string, any>;
  } catch (error) {
    throw new AppleMusicAuthError(`Failed to parse token file: ${tokenFilePath}: ${error}`);
  }

  const tokenObject = typeof payload.token === "object" && payload.token !== null ? payload.token : payload;
  const missingFields = ["developerToken", "musicUserToken"].filter((key) => !tokenObject[key]);
  if (missingFields.length > 0) {
    throw new AppleMusicAuthError(`Token file is missing required fields: ${missingFields.join(", ")}`);
  }

  return {
    source: tokenFilePath,
    token: {
      developerToken: String(tokenObject.developerToken),
      musicUserToken: String(tokenObject.musicUserToken),
      storefrontId: String(tokenObject.storefrontId || "us"),
      createdAt: tokenObject.createdAt ? String(tokenObject.createdAt) : null,
      expiresAt: tokenObject.expiresAt ? String(tokenObject.expiresAt) : null
    }
  };
}

export class AppleMusicClient {
  private developerToken: string;
  private musicUserToken: string;
  public baseUrl: string;
  private timeoutMs: number;
  private maxRetries: number;

  public constructor(options: {
    developerToken: string;
    musicUserToken: string;
    baseUrl?: string;
    timeoutMs?: number;
    maxRetries?: number;
  }) {
    this.developerToken = options.developerToken;
    this.musicUserToken = options.musicUserToken;
    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = Math.max(0, options.maxRetries ?? DEFAULT_MAX_RETRIES);
  }

  private buildHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${this.developerToken}`,
      "Music-User-Token": this.musicUserToken,
      Origin: "https://music.apple.com",
      Referer: "https://music.apple.com/",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "application/json"
    };
  }

  private buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
    const url = new URL(path.startsWith("http://") || path.startsWith("https://") ? path : `${this.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private async parseResponse(response: Response, url: string): Promise<Record<string, any>> {
    const body = await response.text();
    if (response.status === 401 || response.status === 403) {
      throw new AppleMusicAuthError("Apple Music auth failed (401/403). Re-run `sonos-pr3 auth applemusic login`.");
    }
    if (!response.ok) {
      throw new AppleMusicError(`Apple Music API error ${response.status} for ${url}: ${body.slice(0, 300)}`);
    }
    if (!body) {
      return {};
    }
    return JSON.parse(body) as Record<string, any>;
  }

  private getRetryDelayMs(retryAfterHeader: string | null, attempt: number): number {
    if (retryAfterHeader) {
      const retrySeconds = Number(retryAfterHeader);
      if (!Number.isNaN(retrySeconds)) {
        return Math.max(200, retrySeconds * 1000);
      }
    }
    return Math.min(8_000, 1_000 * 2 ** attempt);
  }

  public async requestJson(path: string, params?: Record<string, string | number | undefined>): Promise<Record<string, any>> {
    const url = this.buildUrl(path, params);
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        const response = await fetch(url, {
          headers: this.buildHeaders(),
          signal: AbortSignal.timeout(this.timeoutMs)
        });

        if (response.status === 429 && attempt < this.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, this.getRetryDelayMs(response.headers.get("Retry-After"), attempt)));
          continue;
        }

        return await this.parseResponse(response, url);
      } catch (error) {
        lastError = error;
        if (attempt < this.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, Math.min(8_000, 500 * 2 ** attempt)));
          continue;
        }
      }
    }

    throw new AppleMusicError(`Request failed for ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
  }

  public async fetchCollection(
    path: string,
    options: {
      params?: Record<string, string | number | undefined>;
      limit?: number;
      offset?: number;
      fetchAll?: boolean;
      maxPages?: number;
    } = {}
  ): Promise<AppleMusicCollectionResult> {
    const params: Record<string, string | number | undefined> = { ...(options.params ?? {}) };
    if (options.limit !== undefined) {
      params.limit = options.limit;
    }
    if (options.offset !== undefined) {
      params.offset = options.offset;
    }

    const rawPages: Array<Record<string, any>> = [];
    const mergedData: Array<Record<string, any>> = [];
    let nextPath: string | undefined;

    const firstPage = await this.requestJson(path, params);
    rawPages.push(firstPage);
    mergedData.push(...((firstPage.data as Array<Record<string, any>> | undefined) ?? []));
    nextPath = typeof firstPage.next === "string" ? firstPage.next : undefined;

    while (options.fetchAll && nextPath && rawPages.length < (options.maxPages ?? DEFAULT_MAX_PAGES)) {
      const nextPage = await this.requestJson(nextPath);
      rawPages.push(nextPage);
      mergedData.push(...((nextPage.data as Array<Record<string, any>> | undefined) ?? []));
      nextPath = typeof nextPage.next === "string" ? nextPage.next : undefined;
    }

    return {
      data: mergedData,
      next: rawPages.at(-1)?.next as string | undefined,
      pagesFetched: rawPages.length,
      rawPages
    };
  }
}

function bestFromDict(dictionary: Record<string, any>): unknown {
  const preferredKeys = ["stringForDisplay", "standard", "short", "name", "title"];
  for (const key of preferredKeys) {
    if (key in dictionary) {
      const value = dictionary[key];
      if (typeof value === "string" && value.trim().length === 0) {
        continue;
      }
      if (value !== null && value !== undefined && value !== "") {
        return value;
      }
    }
  }

  if (Object.keys(dictionary).every((key) => preferredKeys.includes(key))) {
    return "";
  }

  return dictionary;
}

export function toText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.map((entry) => toText(entry)).filter((entry) => entry.length > 0).join(", ");
  }
  if (typeof value === "object") {
    const bestValue = bestFromDict(value as Record<string, any>);
    return bestValue === value ? JSON.stringify(value) : toText(bestValue);
  }
  return String(value);
}

function descriptionText(attributes: Record<string, any>): string {
  return toText(attributes.description);
}

export function normalizeItem(item: Record<string, any>): Record<string, any> {
  const attributes = (item.attributes as Record<string, any> | undefined) ?? {};
  const playParams = (attributes.playParams as Record<string, any> | undefined) ?? {};

  return {
    id: item.id,
    type: item.type,
    name: toText(attributes.name ?? attributes.title ?? attributes.albumName),
    artist: toText(attributes.artistName ?? attributes.curatorName),
    album: toText(attributes.albumName),
    description: descriptionText(attributes),
    url: toText(attributes.url ?? item.href),
    dateAdded: toText(attributes.dateAdded),
    lastModifiedDate: toText(attributes.lastModifiedDate),
    releaseDate: toText(attributes.releaseDate),
    durationMs: attributes.durationInMillis,
    trackNumber: attributes.trackNumber,
    genreNames: attributes.genreNames,
    playlistType: toText(attributes.playlistType),
    playParams: {
      id: toText(playParams.id),
      kind: toText(playParams.kind),
      isLibrary: playParams.isLibrary,
      catalogId: toText(playParams.catalogId)
    }
  };
}

export function itemMatches(item: Record<string, any>, contains?: string): boolean {
  if (!contains) {
    return true;
  }
  const needle = contains.trim().toLowerCase();
  const haystack = [
    toText(item.name),
    toText(item.artist),
    toText(item.album),
    toText(item.description),
    toText(item.id),
    toText(item.type)
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

function printPlain(payload: Record<string, any>): void {
  const items = Array.isArray(payload.items) ? payload.items : [];
  process.stdout.write(`endpoint: ${payload.endpoint}\n`);
  process.stdout.write(
    `count: ${payload.count}  pagesFetched: ${payload.pagesFetched}  next: ${toText(payload.next) || "-"}\n`
  );
  if (items.length === 0) {
    process.stdout.write("(no results)\n");
    return;
  }

  items.forEach((item, index) => {
    const name = item.name || "<no-title>";
    const artist = item.artist || "";
    const album = item.album || "";
    const type = item.type || "";
    let line = `${String(index + 1).padStart(3, " ")}. ${name}`;
    if (artist) {
      line += ` — ${artist}`;
    }
    if (album) {
      line += ` (${album})`;
    }
    if (type) {
      line += ` [${type}]`;
    }
    process.stdout.write(`${line}\n`);
  });
}

function printTsv(payload: Record<string, any>): void {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const columns = ["id", "type", "name", "artist", "album", "dateAdded", "releaseDate", "url"];
  process.stdout.write(`${columns.join("\t")}\n`);
  for (const item of items) {
    process.stdout.write(`${columns.map((column) => toText(item[column])).join("\t")}\n`);
  }
}

export function emitPayload(payload: Record<string, any>, format: "plain" | "json" | "tsv"): void {
  if (format === "json") {
    process.stdout.write(formatJson(payload));
    return;
  }
  if (format === "tsv") {
    printTsv(payload);
    return;
  }
  printPlain(payload);
}

async function runCollectionCommand(
  client: AppleMusicClient,
  endpoint: string,
  listOptions: AppleMusicListOptions,
  params?: Record<string, string | number | undefined>
): Promise<void> {
  const collection = await client.fetchCollection(endpoint, {
    params,
    limit: listOptions.limit,
    offset: listOptions.offset,
    fetchAll: listOptions.all,
    maxPages: listOptions.maxPages
  });

  let items = collection.data.map((item) => normalizeItem(item));
  items = items.filter((item) => itemMatches(item, listOptions.contains));

  const payload: Record<string, any> = {
    endpoint,
    count: items.length,
    pagesFetched: collection.pagesFetched,
    next: collection.next,
    items
  };

  if (listOptions.raw && listOptions.format === "json") {
    payload.rawPages = collection.rawPages;
  }

  emitPayload(payload, listOptions.format);
}

async function runStatusCommand(client: AppleMusicClient, tokenPayload: AppleMusicTokenPayload, format: "plain" | "json", skipPing: boolean): Promise<void> {
  const token = tokenPayload.token;
  const expiresAt = parseIso(token.expiresAt);
  const daysRemaining = expiresAt ? Number(((expiresAt.getTime() - Date.now()) / 86_400_000).toFixed(2)) : null;

  let apiReachable: boolean | null = null;
  let storefrontId = token.storefrontId;
  if (!skipPing) {
    try {
      const storefrontPayload = await client.requestJson("/v1/me/storefront");
      apiReachable = true;
      const firstRow = Array.isArray(storefrontPayload.data) ? storefrontPayload.data[0] : undefined;
      if (firstRow?.id) {
        storefrontId = String(firstRow.id);
      }
    } catch {
      apiReachable = false;
    }
  }

  const payload = {
    source: tokenPayload.source,
    authenticated: true,
    createdAt: token.createdAt,
    expiresAt: token.expiresAt,
    daysRemaining,
    storefrontId,
    apiReachable,
    baseUrl: client.baseUrl
  };

  if (format === "json") {
    process.stdout.write(formatJson(payload));
    return;
  }

  process.stdout.write("authenticated: yes\n");
  process.stdout.write(`source: ${payload.source}\n`);
  process.stdout.write(`storefront: ${payload.storefrontId}\n`);
  process.stdout.write(`createdAt: ${toText(payload.createdAt) || "-"}\n`);
  process.stdout.write(`expiresAt: ${toText(payload.expiresAt) || "-"}\n`);
  process.stdout.write(`daysRemaining: ${toText(payload.daysRemaining) || "-"}\n`);
  process.stdout.write(`apiReachable: ${toText(payload.apiReachable) || "unknown"}\n`);
}

async function runDashboardCommand(
  client: AppleMusicClient,
  options: { limit: number; trackTypes: string; contains?: string; format: "plain" | "json" | "tsv" }
): Promise<void> {
  const sections: Record<string, { endpoint: string; params?: Record<string, string> }> = {
    playlists: { endpoint: "/v1/me/library/playlists" },
    recentTracks: { endpoint: "/v1/me/recent/played/tracks", params: { types: options.trackTypes } },
    heavyRotation: { endpoint: "/v1/me/history/heavy-rotation" },
    recentlyAdded: { endpoint: "/v1/me/library/recently-added" }
  };

  const output: Record<string, any> = {
    baseUrl: client.baseUrl,
    limitPerSection: options.limit,
    sections: {}
  };

  for (const [sectionKey, sectionSpec] of Object.entries(sections)) {
    const collection = await client.fetchCollection(sectionSpec.endpoint, {
      params: sectionSpec.params,
      limit: options.limit,
      fetchAll: false
    });
    let items = collection.data.map((item) => normalizeItem(item));
    if (options.contains) {
      items = items.filter((item) => itemMatches(item, options.contains));
    }
    output.sections[sectionKey] = {
      endpoint: sectionSpec.endpoint,
      count: items.length,
      next: collection.next,
      items
    };
  }

  if (options.format === "json") {
    process.stdout.write(formatJson(output));
    return;
  }

  for (const [sectionKey, sectionValue] of Object.entries(output.sections as Record<string, any>)) {
    process.stdout.write(`\n== ${sectionKey} ==\n`);
    emitPayload(
      {
        endpoint: sectionValue.endpoint,
        count: sectionValue.count,
        pagesFetched: 1,
        next: sectionValue.next,
        items: sectionValue.items
      },
      options.format
    );
  }
}

function parseQueryPairs(pairs: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of pairs) {
    if (!pair.includes("=")) {
      throw new AppleMusicError(`Invalid --query value (expected key=value): ${pair}`);
    }
    const [key, value] = pair.split("=", 2);
    result[key.trim()] = value.trim();
  }
  return result;
}

interface CliOptionSpec {
  default?: boolean | string | string[];
  multiple?: boolean;
  type: "boolean" | "string";
}

type CliOptions = Record<string, boolean | string | string[]>;

interface CliParseResult {
  options: CliOptions;
  positionals: string[];
}

const GLOBAL_OPTION_SPECS: Record<string, CliOptionSpec> = {
  "base-url": { type: "string", default: DEFAULT_BASE_URL },
  help: { type: "boolean", default: false },
  "max-retries": { type: "string", default: String(DEFAULT_MAX_RETRIES) },
  "token-file": { type: "string", default: DEFAULT_TOKEN_FILE },
  timeout: { type: "string", default: String(DEFAULT_TIMEOUT_MS / 1000) },
};

const LIST_OPTION_SPECS: Record<string, CliOptionSpec> = {
  all: { type: "boolean", default: false },
  contains: { type: "string" },
  format: { type: "string", default: "plain" },
  help: { type: "boolean", default: false },
  limit: { type: "string", default: String(DEFAULT_LIMIT) },
  "max-pages": { type: "string", default: String(DEFAULT_MAX_PAGES) },
  offset: { type: "string" },
  raw: { type: "boolean", default: false },
};

function applyCliDefaults(specs: Record<string, CliOptionSpec>, options: CliOptions): CliOptions {
  const withDefaults: CliOptions = { ...options };
  for (const [name, spec] of Object.entries(specs)) {
    if (name in withDefaults || spec.default === undefined) {
      continue;
    }
    if (Array.isArray(spec.default)) {
      withDefaults[name] = [...spec.default];
    } else {
      withDefaults[name] = spec.default;
    }
  }
  return withDefaults;
}

function parseOptionToken(token: string): { name: string; value?: string } {
  const trimmedToken = token.replace(/^--/, "");
  const equalsIndex = trimmedToken.indexOf("=");
  if (equalsIndex === -1) {
    return { name: trimmedToken };
  }
  return {
    name: trimmedToken.slice(0, equalsIndex),
    value: trimmedToken.slice(equalsIndex + 1),
  };
}

function parseCliArgs(args: string[], specs: Record<string, CliOptionSpec>): CliParseResult {
  const options: CliOptions = {};
  const positionals: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--") {
      positionals.push(...args.slice(index + 1));
      break;
    }

    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }

    const { name, value } = parseOptionToken(token);
    const spec = specs[name];
    if (!spec) {
      throw new AppleMusicError(`Unknown option: --${name}`);
    }

    if (spec.type === "boolean") {
      options[name] = value === undefined ? true : value !== "false";
      continue;
    }

    const resolvedValue = value ?? args[index + 1];
    if (resolvedValue === undefined || resolvedValue.startsWith("--")) {
      throw new AppleMusicError(`Missing value for --${name}`);
    }
    if (value === undefined) {
      index += 1;
    }

    if (spec.multiple) {
      const existing = options[name];
      const values = Array.isArray(existing) ? existing : [];
      values.push(resolvedValue);
      options[name] = values;
    } else {
      options[name] = resolvedValue;
    }
  }

  return {
    options: applyCliDefaults(specs, options),
    positionals,
  };
}

function splitGlobalArgs(argv: string[]): { commandArgv: string[]; commandName?: string; globalArgv: string[] } {
  const globalArgv: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      return {
        commandArgv: argv.slice(index + 1),
        commandName: token,
        globalArgv,
      };
    }

    const { name, value } = parseOptionToken(token);
    const spec = GLOBAL_OPTION_SPECS[name];
    if (!spec) {
      throw new AppleMusicError(`Unknown global option before subcommand: --${name}`);
    }

    globalArgv.push(token);
    if (spec.type === "string" && value === undefined) {
      const nextToken = argv[index + 1];
      if (nextToken === undefined) {
        throw new AppleMusicError(`Missing value for --${name}`);
      }
      globalArgv.push(nextToken);
      index += 1;
    }
  }

  return {
    commandArgv: [],
    globalArgv,
  };
}

function optionBoolean(options: CliOptions, name: string): boolean {
  return Boolean(options[name]);
}

function optionList(options: CliOptions, name: string): string[] {
  const value = options[name];
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }
  if (typeof value === "string") {
    return [value];
  }
  return [];
}

function optionString(options: CliOptions, name: string, fallback = ""): string {
  const value = options[name];
  return typeof value === "string" ? value : fallback;
}

function printHelp(): void {
  process.stdout.write(
    [
      "Apple Music personal-data CLI (uses sonos-pr3 token store).",
      "",
      "Usage:",
      "  brain music applemusic [global options] <command> [command options]",
      "",
      "Global options:",
      "  --token-file <path>    Path to token JSON",
      "  --base-url <url>       Apple Music base URL",
      "  --timeout <seconds>    Request timeout in seconds",
      "  --max-retries <count>  Max retry attempts",
      "",
      "Commands:",
      "  status",
      "  playlists",
      "  playlist-tracks <playlistId>",
      "  recent-played",
      "  recent-tracks",
      "  heavy-rotation",
      "  recently-added",
      "  library-songs",
      "  library-albums",
      "  library-artists",
      "  recommendations",
      "  dashboard",
      "  request <path>",
      "",
    ].join("\n"),
  );
}

function listOptionsFrom(options: CliOptions): AppleMusicListOptions {
  return {
    limit: Number(optionString(options, "limit", String(DEFAULT_LIMIT))),
    offset: optionString(options, "offset") ? Number(optionString(options, "offset")) : undefined,
    all: optionBoolean(options, "all"),
    maxPages: Number(optionString(options, "max-pages", String(DEFAULT_MAX_PAGES))),
    contains: optionString(options, "contains") || undefined,
    format: (optionString(options, "format", "plain") as "plain" | "json" | "tsv"),
    raw: optionBoolean(options, "raw"),
  };
}

function createClient(globalOptions: CliOptions): { client: AppleMusicClient; tokenPayload: AppleMusicTokenPayload } {
  const tokenPayload = loadTokenPayload(optionString(globalOptions, "token-file", DEFAULT_TOKEN_FILE));
  const token = tokenPayload.token;
  return {
    client: new AppleMusicClient({
      developerToken: token.developerToken,
      musicUserToken: token.musicUserToken,
      baseUrl: optionString(globalOptions, "base-url", DEFAULT_BASE_URL),
      timeoutMs: Math.round(Number(optionString(globalOptions, "timeout", String(DEFAULT_TIMEOUT_MS / 1000))) * 1000),
      maxRetries: Number(optionString(globalOptions, "max-retries", String(DEFAULT_MAX_RETRIES))),
    }),
    tokenPayload,
  };
}

export async function runAppleMusicCli(argv: string[]): Promise<number> {
  try {
    const { commandArgv, commandName, globalArgv } = splitGlobalArgs(argv);
    const { options: globalOptions } = parseCliArgs(globalArgv, GLOBAL_OPTION_SPECS);

    if (!commandName || optionBoolean(globalOptions, "help")) {
      printHelp();
      return 0;
    }

    if (commandName === "dashboard") {
      const dashboardSpecs: Record<string, CliOptionSpec> = {
        contains: { type: "string" },
        format: { type: "string", default: "plain" },
        help: { type: "boolean", default: false },
        limit: { type: "string", default: "10" },
        "track-types": { type: "string", default: "songs" },
      };
      const { options, positionals } = parseCliArgs(commandArgv, dashboardSpecs);
      if (positionals.length > 0) {
        throw new AppleMusicError("dashboard does not accept positional arguments");
      }
      if (optionBoolean(options, "help")) {
        printHelp();
        return 0;
      }
      const { client } = createClient(globalOptions);
      await runDashboardCommand(client, {
        limit: Number(optionString(options, "limit", "10")),
        trackTypes: optionString(options, "track-types", "songs"),
        contains: optionString(options, "contains") || undefined,
        format: optionString(options, "format", "plain") as "plain" | "json" | "tsv",
      });
      return 0;
    }

    if (commandName === "request") {
      const requestSpecs: Record<string, CliOptionSpec> = {
        ...LIST_OPTION_SPECS,
        format: { type: "string", default: "json" },
        query: { type: "string", multiple: true, default: [] },
      };
      const { options, positionals } = parseCliArgs(commandArgv, requestSpecs);
      if (optionBoolean(options, "help")) {
        printHelp();
        return 0;
      }
      const path = positionals[0];
      if (!path) {
        throw new AppleMusicError("request requires a <path> argument");
      }
      if (positionals.length > 1) {
        throw new AppleMusicError("request accepts only one <path> argument");
      }
      const { client } = createClient(globalOptions);
      const queryOptions = parseQueryPairs(optionList(options, "query"));
      if (optionString(options, "limit")) {
        queryOptions.limit = optionString(options, "limit");
      }
      if (optionString(options, "offset")) {
        queryOptions.offset = optionString(options, "offset");
      }
      await runCollectionCommand(client, path, listOptionsFrom(options), queryOptions);
      return 0;
    }

    if (commandName === "status") {
      const statusSpecs: Record<string, CliOptionSpec> = {
        format: { type: "string", default: "plain" },
        help: { type: "boolean", default: false },
        "skip-ping": { type: "boolean", default: false },
      };
      const { options, positionals } = parseCliArgs(commandArgv, statusSpecs);
      if (positionals.length > 0) {
        throw new AppleMusicError("status does not accept positional arguments");
      }
      if (optionBoolean(options, "help")) {
        printHelp();
        return 0;
      }
      const { client, tokenPayload } = createClient(globalOptions);
      await runStatusCommand(
        client,
        tokenPayload,
        optionString(options, "format", "plain") as "plain" | "json",
        optionBoolean(options, "skip-ping"),
      );
      return 0;
    }

    if (commandName === "playlist-tracks") {
      const { options, positionals } = parseCliArgs(commandArgv, LIST_OPTION_SPECS);
      if (optionBoolean(options, "help")) {
        printHelp();
        return 0;
      }
      const playlistId = positionals[0];
      if (!playlistId) {
        throw new AppleMusicError("playlist-tracks requires a <playlistId> argument");
      }
      if (positionals.length > 1) {
        throw new AppleMusicError("playlist-tracks accepts only one <playlistId> argument");
      }
      const { client } = createClient(globalOptions);
      await runCollectionCommand(client, `/v1/me/library/playlists/${playlistId}/tracks`, listOptionsFrom(options));
      return 0;
    }

    const listCommandMap: Record<string, { endpoint: string; params?: (options: CliOptions) => Record<string, string | number | undefined> }> = {
      "heavy-rotation": { endpoint: "/v1/me/history/heavy-rotation" },
      "library-albums": { endpoint: "/v1/me/library/albums" },
      "library-artists": { endpoint: "/v1/me/library/artists" },
      "library-songs": { endpoint: "/v1/me/library/songs" },
      playlists: { endpoint: "/v1/me/library/playlists" },
      recommendations: { endpoint: "/v1/me/recommendations" },
      "recent-played": { endpoint: "/v1/me/recent/played" },
      "recent-tracks": {
        endpoint: "/v1/me/recent/played/tracks",
        params: (options) => ({ types: optionString(options, "types", "songs") }),
      },
      "recently-added": { endpoint: "/v1/me/library/recently-added" },
    };

    const listCommand = listCommandMap[commandName];
    if (!listCommand) {
      throw new AppleMusicError(`Unknown subcommand: ${commandName}`);
    }

    const commandSpecs: Record<string, CliOptionSpec> = {
      ...LIST_OPTION_SPECS,
      ...(commandName === "recent-tracks" ? { types: { type: "string", default: "songs" } } : {}),
    };
    const { options, positionals } = parseCliArgs(commandArgv, commandSpecs);
    if (positionals.length > 0) {
      throw new AppleMusicError(`${commandName} does not accept positional arguments`);
    }
    if (optionBoolean(options, "help")) {
      printHelp();
      return 0;
    }
    const { client } = createClient(globalOptions);
    await runCollectionCommand(client, listCommand.endpoint, listOptionsFrom(options), listCommand.params?.(options));
    return 0;
  } catch (error) {
    if (error instanceof AppleMusicAuthError) {
      process.stderr.write(`Error: ${error.message}\n`);
      return 2;
    }
    if (error instanceof AppleMusicError) {
      process.stderr.write(`Error: ${error.message}\n`);
      return 1;
    }
    throw error;
  }
}
