import { Command } from "@oclif/core";
import { resolve } from "node:path";
import { safeExists } from "../../lib/shared/util/fs.js";
import { readJsonFile } from "../../lib/shared/util/json.js";
import { ALL_SCOPES, DEFAULT_CLIENT_SECRET, DEFAULT_TOKEN_PATH, loadYoutubeOAuth } from "../../lib/stream/youtube-client.js";

function resolveScopes(tokenPayload: Record<string, any>): string[] {
  if (Array.isArray(tokenPayload.scopes) && tokenPayload.scopes.length > 0) {
    return tokenPayload.scopes.map((scope: unknown) => String(scope));
  }
  if (typeof tokenPayload.scope === "string" && tokenPayload.scope.trim()) {
    return tokenPayload.scope.split(/\s+/).filter(Boolean);
  }
  return ALL_SCOPES;
}

function isFreshEnough(tokenPayload: Record<string, any>, bufferSeconds: number): boolean {
  const expiryValue = tokenPayload.expiry;
  if (typeof expiryValue !== "string" || !expiryValue.trim()) {
    return false;
  }

  const normalizedExpiry = expiryValue.endsWith("Z") ? expiryValue.replace("Z", "+00:00") : expiryValue;
  const expiryTime = new Date(normalizedExpiry);
  if (Number.isNaN(expiryTime.getTime())) {
    return false;
  }

  return expiryTime.getTime() > Date.now() + bufferSeconds * 1000;
}

export async function main(_argv: string[] = []): Promise<number> {
  void _argv;

  const tokenPath = resolve(DEFAULT_TOKEN_PATH);
  const clientSecretPath = resolve(DEFAULT_CLIENT_SECRET);
  const bufferSeconds = 900;

  if (!safeExists(tokenPath)) {
    process.stderr.write(`[refresh-youtube] Token file not found: ${tokenPath}\n`);
    return 1;
  }

  let tokenPayload: Record<string, any>;
  try {
    tokenPayload = readJsonFile<Record<string, any>>(tokenPath);
  } catch (error) {
    process.stderr.write(`[refresh-youtube] Could not parse token JSON: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }

  if (isFreshEnough(tokenPayload, bufferSeconds)) {
    process.stdout.write("[refresh-youtube] Access token still fresh enough. No refresh needed.\n");
    return 0;
  }

  if (!safeExists(clientSecretPath) && (!tokenPayload.client_id || !tokenPayload.client_secret)) {
    process.stderr.write(
      `[refresh-youtube] Token JSON is missing client_id/client_secret and client secret file was not found: ${clientSecretPath}\n`
    );
    return 1;
  }

  try {
    const scopes = resolveScopes(tokenPayload);
    const { refreshed } = await loadYoutubeOAuth({
      tokenPath,
      clientSecretPath,
      scopes
    });

    if (refreshed) {
      process.stdout.write("[refresh-youtube] Refreshed YouTube access token successfully.\n");
    } else {
      process.stdout.write("[refresh-youtube] Access token still fresh enough. No refresh needed.\n");
    }
    return 0;
  } catch (error) {
    process.stderr.write(`[refresh-youtube] Refresh failed: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

export default class TokenRefreshYoutube extends Command {
  static description = "Refresh the YouTube OAuth token if it is close to expiry";

  async run(): Promise<void> {
    const exitCode = await main();
    if (exitCode !== 0) {
      this.exit(exitCode);
    }
  }
}
