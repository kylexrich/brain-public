import { Command } from "@oclif/core";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../../lib/shared/config.js";
import { ensureSymlink } from "../../lib/shared/repo/ensure-symlink.js";

const SOURCE = join(REPO_ROOT, "system/.ai/AGENTS.md");

const LINK_TARGET = "../.ai/AGENTS.md";
const TARGETS = ["system/.dot-claude/CLAUDE.md", "system/.dot-codex/AGENTS.md"];

export function main(): number {
  if (!existsSync(SOURCE)) {
    process.stderr.write("sync-instructions: source not found: system/.ai/AGENTS.md\n");
    return 1;
  }

  process.stdout.write("sync-instructions: ensuring tool configs link to system/.ai/AGENTS.md\n");

  for (const target of TARGETS) {
    const result = ensureSymlink(join(REPO_ROOT, target), LINK_TARGET);
    process.stdout.write(`  ${result}: ${target} → ${LINK_TARGET}\n`);
  }

  process.stdout.write("sync-instructions: done ✓\n");
  return 0;
}

export default class RepoSyncInstructions extends Command {
  static description = "Ensure the Claude and Codex global-instruction files are symlinks to system/.ai/AGENTS.md";

  async run(): Promise<void> {
    const exitCode = main();
    if (exitCode !== 0) {
      this.exit(exitCode);
    }
  }
}
