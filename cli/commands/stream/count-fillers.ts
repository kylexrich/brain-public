import { resolve } from "node:path";

import { Command, Flags } from "@oclif/core";
import { safeExists } from "../../lib/shared/util/fs.js";
import { buildResult, jsonDumps, loadJson, nowIsoPacific, writeJson } from "../../lib/stream/pipeline-utils.js";
import { isRecord } from "../../lib/shared/util/json.js";

interface FillerPattern {
  key: string;
  regex: RegExp;
}

interface CountResult {
  total_words: number;
  duration_sec: number | null;
  pure_fillers: Record<string, number>;
  narration_markers: Record<string, number>;
}

const PURE_FILLER_PATTERNS: FillerPattern[] = [
  { key: "like", regex: /\blike\b/gi },
  { key: "uh", regex: /\b(?:uh|uhh|uhhh)\b/gi },
  { key: "um", regex: /\b(?:um|umm|ummm)\b/gi },
  { key: "kind_of", regex: /\b(?:kind of|kinda)\b/gi },
  { key: "i_mean", regex: /\bi mean\b/gi },
  { key: "i_guess", regex: /\bi guess\b/gi },
  { key: "you_know", regex: /\byou know\b/gi },
  { key: "basically", regex: /\bbasically\b/gi },
  { key: "anyway", regex: /\b(?:anyway|anyways)\b/gi },
  { key: "hmm", regex: /\bhmm+\b/gi },
];

const NARRATION_MARKER_PATTERNS: FillerPattern[] = [
  { key: "so", regex: /\bso\b/gi },
  { key: "just", regex: /\bjust\b/gi },
  { key: "okay", regex: /\bokay\b/gi },
  { key: "yeah", regex: /\byeah\b/gi },
  { key: "actually", regex: /\bactually\b/gi },
  { key: "right", regex: /\bright\b/gi },
  { key: "oh", regex: /\boh\b/gi },
  { key: "i_think", regex: /\bi think\b/gi },
  { key: "all_right", regex: /\b(?:all right|alright)\b/gi },
];

class CountFillersError extends Error {
  constructor(
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "CountFillersError";
  }
}


function countPatterns(text: string, patterns: FillerPattern[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const { key, regex } of patterns) {
    const matches = text.match(regex);
    counts[key] = matches === null ? 0 : matches.length;
  }
  return counts;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

function buildCountResult(transcriptPayload: Record<string, unknown>): CountResult {
  const text = transcriptPayload.text;
  if (typeof text !== "string") {
    throw new CountFillersError("invalid_transcript", "Transcript is missing string text field.");
  }

  const durationSec = typeof transcriptPayload.duration_sec === "number" && Number.isFinite(transcriptPayload.duration_sec)
    ? transcriptPayload.duration_sec
    : null;

  return {
    total_words: countWords(text),
    duration_sec: durationSec,
    pure_fillers: countPatterns(text, PURE_FILLER_PATTERNS),
    narration_markers: countPatterns(text, NARRATION_MARKER_PATTERNS),
  };
}

export default class StreamCountFillers extends Command {
  static description = "Count filler words and narration markers from a transcript JSON file";

  static flags = {
    "transcript-file": Flags.string({
      required: true,
      description: "Absolute path to transcript JSON",
    }),
    output: Flags.string({
      required: true,
      description: "Absolute path to write the fillers JSON",
    }),
    force: Flags.boolean({
      default: false,
      description: "Overwrite an existing fillers file",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(StreamCountFillers);
    const transcriptFile = resolve(flags["transcript-file"]);
    const outputPath = resolve(flags.output);

    try {
      if (!safeExists(transcriptFile)) {
        throw new CountFillersError("transcript_not_found", `Transcript file not found: ${transcriptFile}`);
      }

      if (safeExists(outputPath) && !flags.force) {
        process.stdout.write(
          jsonDumps(
            buildResult("skipped", {
              fillers_file: outputPath,
              reason: "output_exists",
            }),
          ),
        );
        return;
      }

      const transcriptPayload = loadJson<unknown>(transcriptFile);
      if (!isRecord(transcriptPayload)) {
        throw new CountFillersError("invalid_transcript", "Transcript payload must be a JSON object.");
      }

      const counts = buildCountResult(transcriptPayload);

      const fillersPayload = {
        source_transcript: transcriptFile,
        generated_at: nowIsoPacific(),
        duration_sec: counts.duration_sec,
        total_words: counts.total_words,
        pure_fillers: counts.pure_fillers,
        narration_markers: counts.narration_markers,
      };

      writeJson(outputPath, fillersPayload);

      process.stdout.write(
        jsonDumps(
          buildResult("success", {
            fillers_file: outputPath,
            total_words: counts.total_words,
            pure_filler_total: Object.values(counts.pure_fillers).reduce((sum, value) => sum + value, 0),
          }),
        ),
      );
    } catch (error) {
      const reason = error instanceof CountFillersError ? error.reason : "count_fillers_failed";
      const details = error instanceof Error ? error.message : String(error);
      process.stdout.write(
        jsonDumps(
          buildResult("error", {
            reason,
            details,
            transcript_file: transcriptFile,
            fillers_file: outputPath,
          }),
        ),
      );
      this.exit(1);
    }
  }
}
