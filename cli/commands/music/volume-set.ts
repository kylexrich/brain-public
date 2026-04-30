import { Args, Command, Flags } from "@oclif/core";
import { getGroupMembers, setVolumeAbsolute } from "../../lib/music/sonos-upnp.js";

export default class MusicVolumeSet extends Command {
  static description =
    "Set volume to an exact absolute level on every speaker in a Sonos group. " +
    "Unlike 'sonos-pr3 group volume set', this sets each member to the same fixed value " +
    "rather than scaling proportionally.";

  static args = {
    level: Args.integer({
      description: "Volume level (0–100)",
      required: true,
    }),
  };

  static flags = {
    name: Flags.string({
      default: "Sonos",
      description: "Name of any speaker in the target group",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(MusicVolumeSet);
    const { level } = args;

    if (level < 0 || level > 100) {
      this.error("Volume level must be between 0 and 100", { exit: 1 });
    }

    const members = getGroupMembers(flags.name);
    const results: string[] = [];

    for (const member of members) {
      try {
        setVolumeAbsolute(member.ip, level);
        results.push(`${member.name}: ${level}`);
      } catch (err) {
        results.push(`${member.name}: failed (${err instanceof Error ? err.message : String(err)})`);
      }
    }

    process.stdout.write(results.join("\n") + "\n");
  }
}
