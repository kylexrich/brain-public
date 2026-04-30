import { Command } from "@oclif/core";
import { runAppleMusicCli } from "../../lib/music/applemusic-lib.js";

export default class MusicApplemusic extends Command {
  static description = "Access Kyle's personal Apple Music library data";
  static examples = [
    "<%= config.bin %> <%= command.id %> status --format json",
    "<%= config.bin %> <%= command.id %> playlists --limit 20 --format json",
  ];
  static strict = false;

  async run(): Promise<void> {
    const exitCode = await runAppleMusicCli(this.argv);
    if (exitCode !== 0) {
      this.exit(exitCode);
    }
  }
}
