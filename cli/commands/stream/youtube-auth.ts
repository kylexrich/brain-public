import {Command, Flags} from "@oclif/core";
import {formatJson} from "../../lib/shared/util/json.js";

import {
  ALL_SCOPES,
  DEFAULT_CLIENT_SECRET,
  DEFAULT_TOKEN_PATH,
  runYoutubeAuthFlow,
} from "../../lib/stream/youtube-auth.js";

export default class StreamYoutubeAuth extends Command {
  static description = "Authorize YouTube OAuth and write the local token file";

  static flags = {
    "client-secret": Flags.string({
      default: DEFAULT_CLIENT_SECRET,
      description: "Path to the YouTube client secret JSON",
    }),
    "token-path": Flags.string({
      default: DEFAULT_TOKEN_PATH,
      description: "Path to the YouTube token JSON",
    }),
    scope: Flags.string({
      multiple: true,
      description: "OAuth scope to request; repeat to override the default scope set",
    }),
    "no-browser": Flags.boolean({
      default: false,
      description: "Print the auth URL without trying to open a browser",
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(StreamYoutubeAuth);

    try {
      const result = await runYoutubeAuthFlow({
        clientSecretPath: flags["client-secret"],
        tokenPath: flags["token-path"],
        scopes: flags.scope && flags.scope.length > 0 ? flags.scope : ALL_SCOPES,
        noBrowser: flags["no-browser"],
      });

      process.stdout.write(formatJson(result));
    } catch (error) {
      this.error(error instanceof Error ? error.message : String(error), {exit: 1});
    }
  }
}
