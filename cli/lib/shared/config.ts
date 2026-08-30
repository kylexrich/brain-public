import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The brain repo this CLI is installed in, derived from this module's location
// (lib/shared/ → cli/ → repo root). Repo-maintenance commands must use this:
// they operate on the checkout they ship with, so an env override pointing at a
// different checkout would make them sync the wrong tree.
export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// Where brain *content* lives (vault, .ai/tmp, credentials). Defaults to
// REPO_ROOT but honours $BRAIN_ROOT so a worktree or sandboxed checkout can read
// and write the canonical brain instead of its own copy.
export const BRAIN_ROOT = process.env.BRAIN_ROOT?.trim() || REPO_ROOT;
