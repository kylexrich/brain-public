import { Args, Command, Flags } from "@oclif/core";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_FFMPEG, ensureBinary } from "../../lib/shared/media/ffmpeg.js";

/** Max chars per Edge TTS synthesis call (service limit is ~4096 bytes). */
const CHUNK_LIMIT = 3500;

function splitAtSentences(text: string): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && (current + " " + sentence).length > CHUNK_LIMIT) {
      chunks.push(current);
      current = sentence;
    } else {
      current = current ? current + " " + sentence : sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export default class TtsSynthesize extends Command {
  static description = "Synthesize text to a single MP3 file via Microsoft Edge TTS";

  static args = {
    text: Args.string({ description: "Text to synthesize", required: true }),
  };

  static flags = {
    out: Flags.string({ description: "Output file path", required: true }),
    voice: Flags.string({
      default: "en-US-MichelleNeural",
      description: "Edge TTS voice name",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(TtsSynthesize);
    const text = args.text.trim();
    if (text.length < 10) {
      this.error("Text too short (minimum 10 characters)", { exit: 1 });
    }

    // Dynamic import — node-edge-tts is CJS
    const { EdgeTTS } = await import("node-edge-tts");

    if (text.length <= CHUNK_LIMIT) {
      await this.synthesizeChunk(EdgeTTS, text, flags.out, flags.voice);
      return;
    }

    // Long text: chunk → synthesize each → concat with ffmpeg
    const chunks = splitAtSentences(text);
    const workDir = mkdtempSync(join(tmpdir(), "brain-tts-"));
    const chunkPaths: string[] = [];
    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunkPath = join(workDir, `chunk-${i}.mp3`);
        await this.synthesizeChunk(EdgeTTS, chunks[i], chunkPath, flags.voice);
        chunkPaths.push(chunkPath);
      }

      // ffmpeg concat demuxer
      const listPath = join(workDir, "concat.txt");
      const listContent = chunkPaths.map((p) => `file '${p}'`).join("\n");
      writeFileSync(listPath, listContent);
      execFileSync(ensureBinary(DEFAULT_FFMPEG), [
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", listPath,
        "-c", "copy",
        flags.out,
      ], { stdio: "pipe" });
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  }

  private async synthesizeChunk(EdgeTTSClass: any, text: string, outPath: string, voice: string): Promise<void> {
    const tts = new EdgeTTSClass({
      voice,
      lang: "en-US",
      outputFormat: "audio-24khz-48kbitrate-mono-mp3",
      timeout: 30_000,
    });
    await tts.ttsPromise(text, outPath);
  }
}
