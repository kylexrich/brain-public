import { Command } from "@oclif/core";
import { dirname, join, relative } from "node:path";
import { collectAgentsFiles, runAgentsMdHeader } from "../../lib/shared/repo/agents-header.js";
import { REPO_ROOT } from "../../lib/shared/config.js";
import { ensureSymlink } from "../../lib/shared/repo/ensure-symlink.js";

const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  ".next",
  "out",
  "coverage",
  "build",
  "system",
  ".claude"
]);

function linkAgentsToClaudeMd(agentsFiles: string[]): number {
  let linkedCount = 0;

  for (const agentsPath of agentsFiles) {
    ensureSymlink(join(dirname(agentsPath), "CLAUDE.md"), "AGENTS.md");
    linkedCount += 1;
  }

  return linkedCount;
}

export function main(_argv: string[] = []): number {
  void _argv;

  process.stdout.write("sync-ai: AGENTS.md precedence headers\n");
  runAgentsMdHeader();
  process.stdout.write("\n");

  process.stdout.write("sync-ai: AGENTS.md → CLAUDE.md symlinks\n");
  const agentsFiles = collectAgentsFiles(REPO_ROOT).filter((agentsPath) => {
    const relativePath = relative(REPO_ROOT, agentsPath);
    return !relativePath.split("/").some((segment) => IGNORED_DIRECTORIES.has(segment));
  });
  const linkedCount = linkAgentsToClaudeMd(agentsFiles);
  process.stdout.write(`  → ${linkedCount} CLAUDE.md symlink(s) ensured beside AGENTS.md\n\n`);
  process.stdout.write("sync-ai: done ✓\n");
  return 0;
}

export default class RepoSyncAi extends Command {
  static description = "Sync AGENTS.md precedence headers and ensure CLAUDE.md → AGENTS.md symlinks";

  async run(): Promise<void> {
    const exitCode = main();
    if (exitCode !== 0) {
      this.exit(exitCode);
    }
  }
}
