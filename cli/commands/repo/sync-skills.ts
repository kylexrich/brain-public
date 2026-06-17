import { Command } from "@oclif/core";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { REPO_ROOT } from "../../lib/shared/repo/agents-header.js";

const SKILLS_SOURCE = join(REPO_ROOT, "system/.ai/skills");

interface SkillMirror {
  relativeDest: string;
  preservedTopLevel: Set<string>;
}

// Source of truth is system/.ai/skills. Each tool gets a generated mirror.
// Codex keeps its `.system/` system skills (and marker) untouched.
const SKILL_MIRRORS: SkillMirror[] = [
  { relativeDest: "system/.dot-claude/skills", preservedTopLevel: new Set() },
  { relativeDest: "system/.dot-codex/skills", preservedTopLevel: new Set([".system"]) },
];

// A skill's `state/` subdir is owned by runtime (e.g. music history, the
// proactive-reach-out gate timer) and is written through the symlink. The sync
// never deletes or overwrites it, so live state survives every regeneration.
const PRESERVED_SKILL_SUBDIR = "state";

const IGNORED_NAMES = new Set([".DS_Store"]);

function generatedReadme(skillName: string): string {
  return [
    "<!-- AUTO-GENERATED — DO NOT EDIT -->",
    "",
    `Generated from \`system/.ai/skills/${skillName}/\` by \`brain repo sync-skills\`.`,
    "Edit the source there and re-run the sync; edits here are overwritten on the next build.",
    "",
  ].join("\n");
}

function listSkillNames(sourceDir: string): string[] {
  return readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !IGNORED_NAMES.has(entry.name))
    .map((entry) => entry.name)
    .sort();
}

// Remove stale top-level entries: anything that is neither a current source
// skill nor an explicitly preserved entry (codex `.system/`). Returns removed names.
function pruneMirrorTopLevel(destDir: string, sourceSkills: Set<string>, preservedTopLevel: Set<string>): string[] {
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
    return [];
  }

  const removed: string[] = [];
  for (const entry of readdirSync(destDir, { withFileTypes: true })) {
    if (preservedTopLevel.has(entry.name)) {
      continue;
    }
    if (IGNORED_NAMES.has(entry.name)) {
      rmSync(join(destDir, entry.name), { force: true, recursive: true });
      continue;
    }
    if (!sourceSkills.has(entry.name)) {
      rmSync(join(destDir, entry.name), { force: true, recursive: true });
      removed.push(entry.name);
    }
  }
  return removed;
}

// Clear a destination skill dir of stale content while preserving its runtime
// `state/` subdir, then copy fresh content from source and drop the marker.
function regenerateSkill(skillName: string, sourceSkillDir: string, destSkillDir: string): void {
  if (existsSync(destSkillDir)) {
    for (const entry of readdirSync(destSkillDir, { withFileTypes: true })) {
      if (entry.name === PRESERVED_SKILL_SUBDIR) {
        continue;
      }
      rmSync(join(destSkillDir, entry.name), { force: true, recursive: true });
    }
  } else {
    mkdirSync(destSkillDir, { recursive: true });
  }

  cpSync(sourceSkillDir, destSkillDir, {
    recursive: true,
    filter: (src) => {
      const segments = relative(sourceSkillDir, src).split(sep);
      if (segments.some((segment) => IGNORED_NAMES.has(segment))) {
        return false;
      }
      // Never let a stray source-side state/ overwrite the preserved mirror state/.
      return segments[0] !== PRESERVED_SKILL_SUBDIR;
    },
  });

  writeFileSync(join(destSkillDir, "README.md"), generatedReadme(skillName));
}

export function main(): number {
  if (!existsSync(SKILLS_SOURCE)) {
    process.stderr.write(`sync-skills: source not found: ${relative(REPO_ROOT, SKILLS_SOURCE)}\n`);
    return 1;
  }

  const skillNames = listSkillNames(SKILLS_SOURCE);
  const sourceSkills = new Set(skillNames);

  process.stdout.write(`sync-skills: ${skillNames.length} skill(s) from ${relative(REPO_ROOT, SKILLS_SOURCE)}\n`);

  for (const mirror of SKILL_MIRRORS) {
    const destDir = join(REPO_ROOT, mirror.relativeDest);
    const removed = pruneMirrorTopLevel(destDir, sourceSkills, mirror.preservedTopLevel);

    for (const skillName of skillNames) {
      regenerateSkill(skillName, join(SKILLS_SOURCE, skillName), join(destDir, skillName));
    }

    const preserved = [...mirror.preservedTopLevel];
    const preservedNote = preserved.length > 0 ? `, preserved ${preserved.join(", ")}` : "";
    const removedNote = removed.length > 0 ? `, removed ${removed.length} stale (${removed.join(", ")})` : "";
    process.stdout.write(`  → ${mirror.relativeDest}: ${skillNames.length} skill(s)${removedNote}${preservedNote}\n`);
  }

  process.stdout.write("sync-skills: done ✓\n");
  return 0;
}

export default class RepoSyncSkills extends Command {
  static description = "Mirror system/.ai/skills into the .dot-claude and .dot-codex skill folders";

  async run(): Promise<void> {
    const exitCode = main();
    if (exitCode !== 0) {
      this.exit(exitCode);
    }
  }
}
