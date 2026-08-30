import { Args, Command, Flags } from "@oclif/core";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { createInterface } from "node:readline";

import { uploadPngToCleanShot } from "../../lib/image/cleanshot.js";

const EXPIRY_DAYS = {
  never: null,
  "1d": 1,
  "3d": 3,
  "7d": 7,
  "30d": 30,
} as const;
const EXPIRY_OPTIONS = Object.keys(EXPIRY_DAYS) as Array<keyof typeof EXPIRY_DAYS>;
const PASSWORD_PROMPT_TIMEOUT_MS = 5 * 60 * 1000;
const PASSWORD_PROMPT_SCRIPT = `
if [[ ! -t 0 || ! -t 2 ]]; then
  exit 2
fi
IFS= read -r -s "cleanshot_password?CleanShot share password: " || exit 3
printf '\n' >&2
printf '%s' "$cleanshot_password"
`;

function requirePassword(password: string): string {
  if (password.length === 0) {
    throw new Error("CleanShot password must not be empty");
  }
  return password;
}

function promptForPassword(): string {
  const result = spawnSync("/bin/zsh", ["-f", "-c", PASSWORD_PROMPT_SCRIPT], {
    encoding: "utf8",
    maxBuffer: 64 * 1024,
    stdio: ["inherit", "pipe", "inherit"],
    timeout: PASSWORD_PROMPT_TIMEOUT_MS,
  });
  if (result.status === 2) {
    throw new Error("A secure password prompt is unavailable; use --password-stdin");
  }
  if (result.error || result.status !== 0 || result.stdout === null) {
    throw new Error("CleanShot password input was cancelled");
  }
  return requirePassword(result.stdout);
}

async function readPasswordFromStdin(): Promise<string> {
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity, terminal: false });
  try {
    for await (const line of lines) {
      return requirePassword(line);
    }
  } finally {
    lines.close();
  }
  throw new Error("No CleanShot password was provided on stdin");
}

export default class ImageUpload extends Command {
  static description = "Upload a PNG to CleanShot Cloud and print its share URL";

  static examples = [
    "<%= config.bin %> <%= command.id %> ./screenshot.png",
    "<%= config.bin %> <%= command.id %> ./screenshot.png --raw",
    "<%= config.bin %> <%= command.id %> ./screenshot.png --password",
  ];

  static args = {
    file: Args.file({
      description: "Path to a PNG file",
      exists: true,
      required: true,
    }),
  };

  static flags = {
    expires: Flags.string({
      default: "never",
      description: "Self-destruct period",
      options: EXPIRY_OPTIONS,
    }),
    tag: Flags.string({
      description: "CleanShot tag; repeat to add multiple tags",
      multiple: true,
    }),
    retina: Flags.boolean({
      default: false,
      description: "Mark the PNG as a 2x Retina capture",
    }),
    password: Flags.boolean({
      default: false,
      description: "Password-protect the share page and prompt without echoing",
      exclusive: ["password-stdin"],
    }),
    "password-stdin": Flags.boolean({
      default: false,
      description: "Read the share-page password from the first line of stdin",
      exclusive: ["password"],
    }),
    raw: Flags.boolean({
      default: false,
      description: "Print a short-lived signed PNG URL that bypasses the share page",
    }),
    json: Flags.boolean({
      default: false,
      description: "Print the share URL, optional raw URL, and expiration as JSON",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ImageUpload);

    try {
      const password = flags.password
        ? promptForPassword()
        : flags["password-stdin"]
          ? await readPasswordFromStdin()
          : null;
      const result = await uploadPngToCleanShot({
        imagePath: resolve(args.file),
        expiryDays: EXPIRY_DAYS[flags.expires as keyof typeof EXPIRY_DAYS],
        password,
        tags: flags.tag ?? [],
        isRetina: flags.retina,
        shouldResolveRawUrl: flags.raw,
      });

      if (flags.json) {
        const output: Record<string, unknown> = {
          url: result.shareUrl,
          expires_at: result.expiresAt,
        };
        if (result.rawUrl !== null) {
          output.raw_url = result.rawUrl;
        }
        process.stdout.write(`${JSON.stringify(output)}\n`);
        return;
      }

      if (flags.raw) {
        if (result.rawUrl === null) {
          throw new Error("CleanShot returned no raw media URL");
        }
        process.stdout.write(`${result.rawUrl}\n`);
        return;
      }
      process.stdout.write(`${result.shareUrl}\n`);
    } catch (error) {
      this.error(error instanceof Error ? error.message : String(error), { exit: 1 });
    }
  }
}
