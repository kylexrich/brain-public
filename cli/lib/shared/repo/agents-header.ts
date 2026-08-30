import { Command } from "@oclif/core";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { REPO_ROOT } from "../config.js";

const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  ".next",
  "out",
  "coverage",
  "build",
  "deprecated",
  // Source-of-truth staging area, not repo-tree guidance. Its AGENTS.md (the
  // global instructions source) and skills AGENTS.md are owned elsewhere; the
  // precedence-header injector must not manage them.
  ".ai",
  // `.dot-codex/AGENTS.md` is a symlink to `system/.ai/AGENTS.md`, whose
  // header is authored in the source. Keep this injector out.
  ".dot-codex",
  // Harness-owned dir; `.claude/worktrees/` holds other sessions' checkouts —
  // walking into them rewrites files in someone else's workspace.
  ".claude"
]);

const HEADER_START = "> **`AGENTS.md` Instruction Precedence (DO NOT EDIT)**";
const SEPARATOR = "\n\n---\n\n";

function isReadableFile(path: string): boolean {
  try {
    readFileSync(path, "utf8");
    return true;
  } catch {
    return false;
  }
}

function buildChain(agentsPath: string): string[] {
  const chain: string[] = [];
  let currentDirectory = dirname(agentsPath);

  while (true) {
    const candidatePath = join(currentDirectory, "AGENTS.md");
    if (isReadableFile(candidatePath)) {
      chain.push(relative(REPO_ROOT, candidatePath) || "AGENTS.md");
    }

    if (currentDirectory === REPO_ROOT) {
      return chain.map((entry) => (entry === "" ? "AGENTS.md" : entry));
    }
    const parentDirectory = dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      return chain;
    }
    currentDirectory = parentDirectory;
  }
}

function formatChainEntry(relativePath: string, isThisFile: boolean): string {
  if (relativePath === "AGENTS.md") {
    return "`AGENTS.md` _(root)_";
  }
  if (isThisFile) {
    return `\`${relativePath}\` _(this file)_`;
  }
  return `\`${relativePath}\``;
}

function generateHeader(agentsPath: string): string {
  const chain = buildChain(agentsPath);
  const thisRelativePath = relative(REPO_ROOT, agentsPath) || "AGENTS.md";
  const isRoot = thisRelativePath === "AGENTS.md";

  const chainString = isRoot
    ? "`AGENTS.md` _(root — this file)_"
    : chain.map((entry, index) => formatChainEntry(entry, index === 0)).join(" > ");

  const description = isRoot
    ? "This is the repo root `AGENTS.md`. All other `AGENTS.md` files inherit from this one. Most specific wins on conflict."
    : "Hierarchical and additive — apply this file plus all parent `AGENTS.md` files up to repo root. Most specific wins on conflict.";

  return [
    HEADER_START,
    ">",
    `> ${description}`,
    ">",
    `> **Chain:** ${chainString}`
  ].join("\n");
}

export function stripHeader(content: string): string {
  if (!content.startsWith(HEADER_START)) {
    return content;
  }

  const separatorIndex = content.indexOf("\n---\n");
  if (separatorIndex === -1) {
    return content;
  }

  let contentStart = separatorIndex + "\n---\n".length;
  while (contentStart < content.length && content[contentStart] === "\n") {
    contentStart += 1;
  }
  return content.slice(contentStart);
}

export function processFile(agentsPath: string): boolean {
  const existingContent = readFileSync(agentsPath, "utf8");
  const strippedContent = stripHeader(existingContent);
  const newContent = `${generateHeader(agentsPath)}${SEPARATOR}${strippedContent}`;

  if (newContent === existingContent) {
    return false;
  }

  writeFileSync(agentsPath, newContent, "utf8");
  return true;
}

export function collectAgentsFiles(startDirectory: string): string[] {
  const results: string[] = [];
  const stack = [startDirectory];

  while (stack.length > 0) {
    const currentDirectory = stack.pop()!;
    let entries;
    try {
      entries = readdirSync(currentDirectory, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) {
          continue;
        }
        stack.push(join(currentDirectory, entry.name));
        continue;
      }

      if (entry.isFile() && entry.name === "AGENTS.md") {
        results.push(join(currentDirectory, entry.name));
      }
    }
  }

  return results;
}

export function runAgentsMdHeader(): number {
  const files = collectAgentsFiles(REPO_ROOT);
  let updatedCount = 0;

  for (const file of files) {
    const wasUpdated = processFile(file);
    const relativePath = relative(REPO_ROOT, file) || "AGENTS.md";
    process.stdout.write(`  ${wasUpdated ? "updated" : "ok"}: ${relativePath}\n`);
    if (wasUpdated) {
      updatedCount += 1;
    }
  }

  process.stdout.write(`\n  → ${updatedCount}/${files.length} AGENTS.md file(s) updated\n`);
  return updatedCount;
}

export function main(_argv: string[] = []): number {
  void _argv;
  process.stdout.write("agents-md-header: injecting precedence headers\n");
  return runAgentsMdHeader();
}

export default class RepoAgentsHeader extends Command {
  static description = "Inject AGENTS.md precedence headers across the repo";

  async run(): Promise<void> {
    const exitCode = main();
    if (exitCode !== 0) {
      this.exit(exitCode);
    }
  }
}
