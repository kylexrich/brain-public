import { Command, Flags } from "@oclif/core";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BRAIN_ROOT = process.env.BRAIN_ROOT?.trim() || join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const DEFAULT_OUTPUT_DIR = join(BRAIN_ROOT, ".ai/tmp");

const GEMINI_MODEL = "gemini-3-pro-image-preview";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

/**
 * Validate that a caller-provided image name is safe to drop into the temp
 * directory as a bare filename. The CLI deliberately refuses to auto-slug
 * prompts — the caller (skill, agent, human) is responsible for picking a
 * stable, meaningful name so downstream tools can reference it.
 */
function assertSafeName(name: string): void {
  if (!NAME_PATTERN.test(name) || name.includes("..")) {
    throw new Error(
      `--name must match ${NAME_PATTERN} (letters, digits, dot, dash, underscore; must not start with a separator or contain '..')`,
    );
  }
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: { code: number; message: string };
}

export default class ImageGenerate extends Command {
  static description = "Generate or edit an image using the Gemini API";

  static examples = [
    '<%= config.bin %> <%= command.id %> --name cat-moon --prompt "a cat on the moon"',
    '<%= config.bin %> <%= command.id %> --name kitchen-daytime --prompt "make it daytime" --source ./image.png',
    '<%= config.bin %> <%= command.id %> --name hero --prompt "hero shot" --output ~/Desktop/hero.png',
  ];

  static flags = {
    prompt: Flags.string({
      char: "p",
      description: "Text prompt describing the image to generate or edit instruction",
      required: true,
    }),
    name: Flags.string({
      char: "n",
      description: `Required short, filesystem-safe slug used as the output filename (saved under ${DEFAULT_OUTPUT_DIR}/<name>.png). Ignored when --output is provided.`,
      required: true,
    }),
    source: Flags.file({
      char: "s",
      description: "Source image path for editing (omit to generate from scratch)",
      exists: true,
    }),
    output: Flags.string({
      char: "o",
      description: `Explicit output file path. Overrides --name when set (default location: ${DEFAULT_OUTPUT_DIR}/<name>.png).`,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ImageGenerate);

    let outputPath: string;
    if (flags.output) {
      outputPath = flags.output;
    } else {
      assertSafeName(flags.name);
      outputPath = join(DEFAULT_OUTPUT_DIR, `${flags.name}.png`);
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.error("GEMINI_API_KEY environment variable is not set", { exit: 1 });
    }

    const parts: GeminiPart[] = [];

    if (flags.source) {
      const sourceBytes = readFileSync(flags.source);
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: sourceBytes.toString("base64"),
        },
      });
      parts.push({ text: `Edit this image: ${flags.prompt}` });
    } else {
      parts.push({ text: `Generate an image: ${flags.prompt}` });
    }

    const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
      }),
    });

    const data = (await response.json()) as GeminiResponse;

    if (data.error) {
      this.error(`Gemini API error ${data.error.code}: ${data.error.message}`, { exit: 1 });
    }

    for (const candidate of data.candidates ?? []) {
      for (const part of candidate.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const imgBytes = Buffer.from(part.inlineData.data, "base64");
          mkdirSync(dirname(outputPath), { recursive: true });
          writeFileSync(outputPath, imgBytes);
          process.stdout.write(`${outputPath}\n`);
          return;
        }
      }
    }

    this.error("No image data returned from Gemini API", { exit: 1 });
  }
}
