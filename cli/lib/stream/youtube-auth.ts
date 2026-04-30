import {ALL_SCOPES, DEFAULT_CLIENT_SECRET, DEFAULT_TOKEN_PATH, runLocalServerAuthFlow} from "./youtube-client.js";

export {ALL_SCOPES, DEFAULT_CLIENT_SECRET, DEFAULT_TOKEN_PATH} from "./youtube-client.js";

export async function runYoutubeAuthFlow(options: {
  clientSecretPath?: string;
  tokenPath?: string;
  scopes?: string[];
  noBrowser?: boolean;
} = {}): Promise<Record<string, any>> {
  return runLocalServerAuthFlow({
    clientSecretPath: options.clientSecretPath ?? DEFAULT_CLIENT_SECRET,
    tokenPath: options.tokenPath ?? DEFAULT_TOKEN_PATH,
    scopes: options.scopes ?? ALL_SCOPES,
    noBrowser: options.noBrowser ?? false,
  });
}
