import { Command } from "@oclif/core";
import { existsSync, lstatSync, mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../../lib/shared/config.js";
import { ensureSymlink } from "../../lib/shared/repo/ensure-symlink.js";

const SKILLS_SOURCE = join(REPO_ROOT, "system/.ai/skills");

const LINK_TARGET = "../.ai/skills";
const MIRROR_LINKS = ["system/.dot-claude/skills", "system/.dot-codex/skills"];

const PRESERVED_SKILL_SUBDIR = "state";
const CODEX_SYSTEM_DIR = ".system";

function migrateLegacyMirror(mirrorAbsolutePath: string, mirrorLabel: string): void {
  for (const entry of readdirSync(mirrorAbsolutePath, { withFileTypes: true })) {
    if (entry.name === CODEX_SYSTEM_DIR) {
      const destination = join(SKILLS_SOURCE, CODEX_SYSTEM_DIR);
      if (existsSync(destination)) {
        throw new Error(`sync-skills: ${mirrorLabel}/${CODEX_SYSTEM_DIR} and system/.ai/skills/${CODEX_SYSTEM_DIR} both exist — resolve manually`);
      }
      renameSync(join(mirrorAbsolutePath, entry.name), destination);
      process.stdout.write(`  migrated ${mirrorLabel}/${CODEX_SYSTEM_DIR} → system/.ai/skills/${CODEX_SYSTEM_DIR}\n`);
      continue;
    }

    if (!entry.isDirectory()) {
      continue;
    }

    const mirrorStateDir = join(mirrorAbsolutePath, entry.name, PRESERVED_SKILL_SUBDIR);
    if (!existsSync(mirrorStateDir)) {
      continue;
    }

    const sourceStateDir = join(SKILLS_SOURCE, entry.name, PRESERVED_SKILL_SUBDIR);
    if (existsSync(sourceStateDir)) {
      throw new Error(`sync-skills: state for "${entry.name}" exists in both mirror and source — resolve manually`);
    }
    mkdirSync(join(SKILLS_SOURCE, entry.name), { recursive: true });
    renameSync(mirrorStateDir, sourceStateDir);
    process.stdout.write(`  migrated ${mirrorLabel}/${entry.name}/${PRESERVED_SKILL_SUBDIR} → system/.ai/skills/${entry.name}/${PRESERVED_SKILL_SUBDIR}\n`);
  }

  rmSync(mirrorAbsolutePath, { force: true, recursive: true });
}

export function main(): number {
  if (!existsSync(SKILLS_SOURCE)) {
    process.stderr.write("sync-skills: source not found: system/.ai/skills\n");
    return 1;
  }

  process.stdout.write("sync-skills: ensuring tool skills dirs link to system/.ai/skills\n");

  for (const mirrorLink of MIRROR_LINKS) {
    const linkAbsolutePath = join(REPO_ROOT, mirrorLink);

    let isLegacyDir = false;
    try {
      const stats = lstatSync(linkAbsolutePath);
      isLegacyDir = stats.isDirectory() && !stats.isSymbolicLink();
    } catch {
      isLegacyDir = false;
    }

    if (isLegacyDir) {
      process.stdout.write(`  legacy copy-mirror found at ${mirrorLink} — migrating\n`);
      migrateLegacyMirror(linkAbsolutePath, mirrorLink);
    }

    const result = ensureSymlink(linkAbsolutePath, LINK_TARGET);
    process.stdout.write(`  ${result}: ${mirrorLink} → ${LINK_TARGET}\n`);
  }

  process.stdout.write("sync-skills: done ✓\n");
  return 0;
}

export default class RepoSyncSkills extends Command {
  static description = "Ensure the Claude and Codex skills dirs are symlinks to the system/.ai/skills source (migrating legacy copy-mirrors)";

  async run(): Promise<void> {
    const exitCode = main();
    if (exitCode !== 0) {
      this.exit(exitCode);
    }
  }
}
