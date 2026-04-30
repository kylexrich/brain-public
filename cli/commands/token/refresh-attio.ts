import { Command } from "@oclif/core";
import { readFileSync } from "node:fs";
import { readJsonFile, writeJsonFile } from "../../lib/shared/util/json.js";

const TOKEN_ENDPOINT = "https://app.attio.com/oidc/token";
const MAIN_CONFIG = "/Users/kylerich/Developer/brain/openclaw/mbp-m4max-16/main/config/mcporter.json";
const TEAM_CONFIG = "/Users/kylerich/Developer/brain/openclaw/mbp-m4max-16/team/config/mcporter.json";
const BUFFER_MS = 1_800_000;

interface AttioOAuthPayload {
  refreshToken?: string;
  clientId?: string;
  accessToken?: string;
  expiresAt?: number;
}

function findCredentialsFile(): string | null {
  const candidates = [
    "/Users/kylerich/.claude/.credentials.json",
    "/Users/kylerich/.config/claude/.credentials.json",
    "/Users/kylerich/.config/claude-code/.credentials.json"
  ];

  for (const candidate of candidates) {
    try {
      readFileSync(candidate, "utf8");
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
}

function findAttioEntry(credentialsPayload: Record<string, any>): { key: string; payload: AttioOAuthPayload } | null {
  const entries = credentialsPayload.mcpOAuth;
  if (!entries || typeof entries !== "object") {
    return null;
  }

  for (const [key, value] of Object.entries(entries as Record<string, unknown>)) {
    if (key.toLowerCase().includes("attio") && value && typeof value === "object") {
      return { key, payload: value as AttioOAuthPayload };
    }
  }

  return null;
}

async function refreshToken(refreshToken: string, clientId: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: number }> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId
    })
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(responseText || `HTTP ${response.status}`);
  }

  const payload = JSON.parse(responseText) as Record<string, any>;
  const accessToken = String(payload.access_token ?? "");
  const nextRefreshToken = String(payload.refresh_token ?? refreshToken);
  const expiresIn = Number(payload.expires_in ?? 0);
  if (!accessToken || !expiresIn) {
    throw new Error(responseText);
  }

  return {
    accessToken,
    refreshToken: nextRefreshToken,
    expiresAt: Date.now() + expiresIn * 1000
  };
}

function updateMcporterConfig(configPath: string, accessToken: string): void {
  let config: Record<string, any> = {};
  try {
    config = readJsonFile<Record<string, any>>(configPath);
  } catch {
    config = {};
  }

  config.mcpServers ??= {};
  config.mcpServers.attio = {
    baseUrl: "https://mcp.attio.com/mcp",
    transport: "http",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  };
  writeJsonFile(configPath, config);
  process.stdout.write(`[refresh-attio] Updated ${configPath}\n`);
}

export async function main(_argv: string[] = []): Promise<number> {
  void _argv;

  const credentialsFile = findCredentialsFile();
  if (!credentialsFile) {
    process.stderr.write("[refresh-attio] Could not find Claude credentials file in known locations.\n");
    return 1;
  }

  let credentialsPayload: Record<string, any>;
  try {
    credentialsPayload = readJsonFile<Record<string, any>>(credentialsFile);
  } catch (error) {
    process.stderr.write(`[refresh-attio] Could not parse credentials file: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }

  const entry = findAttioEntry(credentialsPayload);
  if (!entry) {
    process.stderr.write(`[refresh-attio] No Attio OAuth entry found in ${credentialsFile}.\n`);
    return 1;
  }

  const refreshTokenValue = String(entry.payload.refreshToken ?? "");
  const clientId = String(entry.payload.clientId ?? "");
  const currentToken = String(entry.payload.accessToken ?? "");
  const expiresAt = Number(entry.payload.expiresAt ?? 0);
  if (!refreshTokenValue || !clientId) {
    process.stderr.write("[refresh-attio] Missing refreshToken or clientId in Attio OAuth payload.\n");
    return 1;
  }

  let nextToken = currentToken;
  let nextRefreshToken = refreshTokenValue;
  let nextExpiresAt = expiresAt;

  if (expiresAt - Date.now() <= BUFFER_MS) {
    process.stdout.write("[refresh-attio] Token expired or expiring soon. Refreshing...\n");
    try {
      const refreshed = await refreshToken(refreshTokenValue, clientId);
      nextToken = refreshed.accessToken;
      nextRefreshToken = refreshed.refreshToken;
      nextExpiresAt = refreshed.expiresAt;
    } catch (error) {
      process.stderr.write(`[refresh-attio] Refresh failed: ${error instanceof Error ? error.message : String(error)}\n`);
      return 1;
    }

    (credentialsPayload.mcpOAuth as Record<string, AttioOAuthPayload>)[entry.key] = {
      ...(credentialsPayload.mcpOAuth as Record<string, AttioOAuthPayload>)[entry.key],
      accessToken: nextToken,
      refreshToken: nextRefreshToken,
      expiresAt: nextExpiresAt
    };
    writeJsonFile(credentialsFile, credentialsPayload);
    process.stdout.write("[refresh-attio] Refreshed Attio token successfully.\n");
  } else {
    process.stdout.write(
      `[refresh-attio] Token still valid for ${Math.floor((expiresAt - Date.now()) / 60000)} more minutes. Syncing configs only.\n`
    );
  }

  updateMcporterConfig(MAIN_CONFIG, nextToken);
  updateMcporterConfig(TEAM_CONFIG, nextToken);
  process.stdout.write("[refresh-attio] Done.\n");
  return 0;
}

export default class TokenRefreshAttio extends Command {
  static description = "Refresh the Attio OAuth token and sync mcporter configs";

  async run(): Promise<void> {
    const exitCode = await main();
    if (exitCode !== 0) {
      this.exit(exitCode);
    }
  }
}
