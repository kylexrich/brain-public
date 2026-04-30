import { Args, Command, Flags } from "@oclif/core";
import {
  APPLE_MUSIC_FLAGS,
  APPLE_MUSIC_SID,
  APPLE_MUSIC_SN,
  buildDidlMetadata,
  discoverSpeakerByName,
  queueContainerUri,
  setTransportToQueue
} from "../../lib/music/sonos-upnp.js";

export default class MusicPlayPlaylist extends Command {
  static description = "Queue an Apple Music library playlist on Sonos";

  static args = {
    playlistId: Args.string({
      description: "Apple Music library playlist id",
      required: true,
    }),
  };

  static flags = {
    name: Flags.string({
      default: "Sonos",
      description: "Sonos speaker name",
    }),
    title: Flags.string({
      default: "Library Playlist",
      description: "Display title",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(MusicPlayPlaylist);
    const encodedPlaylistId = encodeURIComponent(args.playlistId);
    const itemId = `1006206clibraryplaylist%3A${encodedPlaylistId}`;
    const uri = `x-rincon-cpcontainer:${itemId}?sid=${APPLE_MUSIC_SID}&flags=${APPLE_MUSIC_FLAGS}&sn=${APPLE_MUSIC_SN}`;
    const metadata = buildDidlMetadata({
      itemId,
      title: flags.title,
      upnpClass: "object.container.playlistContainer",
    });

    const speaker = discoverSpeakerByName(flags.name);
    const tracksAdded = queueContainerUri({
      speakerIp: speaker.ip,
      uri,
      metadata,
    });

    if (tracksAdded === 0) {
      this.error(`No tracks were enqueued for playlist ${args.playlistId}`, { exit: 1 });
    }

    setTransportToQueue(speaker.ip, speaker.udn);
    process.stdout.write(`Enqueued: ${flags.title} (${tracksAdded} tracks)\n`);
  }
}
