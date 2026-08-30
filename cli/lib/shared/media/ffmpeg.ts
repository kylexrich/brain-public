import { spawnSync } from "node:child_process";
import { safeExists } from "../util/fs.js";

export const DEFAULT_FFMPEG = "/opt/homebrew/bin/ffmpeg";
export const DEFAULT_FFPROBE = "/opt/homebrew/bin/ffprobe";

// Accept either an absolute path or a bare command name, resolving the latter
// through PATH so callers can pass "ffmpeg" without assuming a Homebrew prefix.
export function ensureBinary(path: string): string {
  if (safeExists(path)) {
    return path;
  }
  const result = spawnSync("which", [path], { encoding: "utf8" });
  if (result.status === 0 && result.stdout.trim()) {
    return result.stdout.trim();
  }
  throw new Error(`Required binary not found: ${path}`);
}
