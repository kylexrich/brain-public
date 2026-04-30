import { Args, Command, Flags } from "@oclif/core";
import { AppleMusicClient, loadTokenPayload } from "../../lib/music/applemusic-lib.js";
import {
  APPLE_MUSIC_FLAGS,
  APPLE_MUSIC_SID,
  APPLE_MUSIC_SN,
  buildDidlMetadata,
  discoverSpeakerByName,
  queueContainerUri,
  setTransportToQueue
} from "../../lib/music/sonos-upnp.js";

interface ArtistAlbumItem {
  attributes?: {
    name?: string;
    playParams?: {
      id?: string;
    };
  };
}

function shouldIncludeAlbum(albumName: string, includeSingles: boolean): boolean {
  if (includeSingles) {
    return true;
  }
  return !albumName.includes("- Single") && !albumName.includes("- EP") && !albumName.includes("(Remix)");
}

export default class MusicPlayArtist extends Command {
  static description = "Queue all playable albums for an Apple Music artist on Sonos";

  static args = {
    artistId: Args.string({
      description: "Apple Music artist id",
      required: true,
    }),
  };

  static flags = {
    name: Flags.string({
      default: "Sonos",
      description: "Sonos speaker name",
    }),
    title: Flags.string({
      default: "Artist",
      description: "Display title",
    }),
    singles: Flags.boolean({
      default: false,
      description: "Include singles and EPs",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(MusicPlayArtist);
    const speaker = discoverSpeakerByName(flags.name);
    const tokenPayload = loadTokenPayload();
    const client = new AppleMusicClient({
      developerToken: tokenPayload.token.developerToken,
      musicUserToken: tokenPayload.token.musicUserToken,
    });

    const response = await client.requestJson(`/v1/catalog/us/artists/${args.artistId}/albums`, { limit: 25 });
    const albums = Array.isArray(response.data) ? (response.data as ArtistAlbumItem[]) : [];

    let totalTracks = 0;
    let albumCount = 0;
    for (const album of albums) {
      const albumName = String(album.attributes?.name ?? "");
      const albumId = String(album.attributes?.playParams?.id ?? "");
      if (!albumId || !shouldIncludeAlbum(albumName, flags.singles)) {
        continue;
      }

      const itemId = `1004206calbum%3A${albumId}`;
      const uri = `x-rincon-cpcontainer:${itemId}?sid=${APPLE_MUSIC_SID}&flags=${APPLE_MUSIC_FLAGS}&sn=${APPLE_MUSIC_SN}`;
      const metadata = buildDidlMetadata({
        itemId,
        title: albumName,
        upnpClass: "object.container.album.musicAlbum",
      });
      const tracksAdded = queueContainerUri({
        speakerIp: speaker.ip,
        uri,
        metadata,
      });
      if (tracksAdded > 0) {
        totalTracks += tracksAdded;
        albumCount += 1;
      }
    }

    if (totalTracks === 0) {
      this.error(`No tracks could be enqueued for artist ${args.artistId}`, { exit: 1 });
    }

    setTransportToQueue(speaker.ip, speaker.udn);
    process.stdout.write(`Enqueued: ${flags.title} (${albumCount} albums, ${totalTracks} tracks)\n`);
  }
}
