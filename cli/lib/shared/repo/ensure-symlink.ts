import { lstatSync, mkdirSync, readlinkSync, rmSync, symlinkSync } from "node:fs";
import { dirname } from "node:path";
import type { Stats } from "node:fs";

export type EnsureSymlinkResult = "ok" | "created" | "replaced";

// Make `linkPath` a symlink pointing at `target` (a path relative to the link's
// parent directory). Replaces a wrong symlink or a stale regular file. Refuses
// to replace a directory — callers own any content migration before converting
// a directory into a link.
export function ensureSymlink(linkPath: string, target: string): EnsureSymlinkResult {
  let existing: Stats | null = null;
  try {
    existing = lstatSync(linkPath);
  } catch {
    existing = null;
  }

  if (existing?.isSymbolicLink()) {
    if (readlinkSync(linkPath) === target) {
      return "ok";
    }
    rmSync(linkPath);
    symlinkSync(target, linkPath);
    return "replaced";
  }

  if (existing?.isDirectory()) {
    throw new Error(`ensureSymlink: refusing to replace directory with symlink: ${linkPath}`);
  }

  if (existing) {
    rmSync(linkPath);
    symlinkSync(target, linkPath);
    return "replaced";
  }

  mkdirSync(dirname(linkPath), { recursive: true });
  symlinkSync(target, linkPath);
  return "created";
}
