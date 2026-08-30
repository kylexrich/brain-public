import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  writeFileSync,
  symlinkSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { Command, Flags } from "@oclif/core";
import { REPO_ROOT } from "../../lib/shared/config.js";
import { isRecord } from "../../lib/shared/util/json.js";

const DEFAULT_CONFIG_PATH = join(REPO_ROOT, ".public-export.json");

type StringSanitizeRule = {
  paths?: string[];
  match: string;
  replace: string;
  type?: "string";
};

type RegexSanitizeRule = {
  paths?: string[];
  pattern: string;
  flags?: string;
  replace: string;
  type: "regex";
};

type SanitizeRule = StringSanitizeRule | RegexSanitizeRule;

type StringVerifyRule = {
  paths?: string[];
  match: string;
  message: string;
  type?: "string";
};

type RegexVerifyRule = {
  paths?: string[];
  pattern: string;
  flags?: string;
  message: string;
  type: "regex";
};

type VerifyRule = StringVerifyRule | RegexVerifyRule;

type ExternalResourceSetConfig = {
  name: string;
  sourceRoot: string;
  targetDir: string;
  include: string[];
  exclude?: string[];
};

type PublicExportConfig = {
  target: string;
  include: string[];
  exclude?: string[];
  externalResourceSets?: ExternalResourceSetConfig[];
  sanitize?: SanitizeRule[];
  verify?: VerifyRule[];
};

type ParsedExternalResourceSetConfig = {
  name: string;
  sourceRoot: string;
  targetDir: string;
  include: string[];
  exclude: string[];
};

type ParsedPublicExportConfig = {
  target: string;
  include: string[];
  exclude: string[];
  externalResourceSets: ParsedExternalResourceSetConfig[];
  sanitize: SanitizeRule[];
  verify: VerifyRule[];
};

type CompiledStringSanitizeRule = {
  pathMatchers?: RegExp[];
  match: string;
  replace: string;
  type: "string";
};

type CompiledRegexSanitizeRule = {
  pathMatchers?: RegExp[];
  matcher: RegExp;
  replace: string;
  type: "regex";
};

type CompiledSanitizeRule = CompiledStringSanitizeRule | CompiledRegexSanitizeRule;

type CompiledStringVerifyRule = {
  pathMatchers?: RegExp[];
  match: string;
  message: string;
  type: "string";
};

type CompiledRegexVerifyRule = {
  pathMatchers?: RegExp[];
  matcher: RegExp;
  message: string;
  type: "regex";
};

type CompiledVerifyRule = CompiledStringVerifyRule | CompiledRegexVerifyRule;

type ExportPlan = {
  configPath: string;
  excludePatterns: string[];
  externalResourceSets: ParsedExternalResourceSetConfig[];
  targetRoot: string;
  selectedPaths: string[];
  trackedFiles: string[];
  sanitizeRules: CompiledSanitizeRule[];
  verifyRules: CompiledVerifyRule[];
};

function resolveFromRepoRoot(pathValue: string): string {
  return resolve(REPO_ROOT, pathValue);
}

function normalizeRelativePath(pathValue: string): string {
  return pathValue.replaceAll("\\", "/").replace(/^\.\//, "");
}

function escapeRegex(text: string): string {
  return text.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function compileGlob(pattern: string): RegExp {
  const normalizedPattern = normalizeRelativePath(pattern);
  let regex = "^";

  for (let index = 0; index < normalizedPattern.length; index += 1) {
    const char = normalizedPattern[index];

    if (char === "*") {
      const nextChar = normalizedPattern[index + 1];
      const prevChar = index === 0 ? "" : normalizedPattern[index - 1];
      const afterDoubleStar = normalizedPattern[index + 2];
      const isDoubleStar = nextChar === "*";
      const isGlobstarDirectory = isDoubleStar && (index === 0 || prevChar === "/") && afterDoubleStar === "/";

      if (isGlobstarDirectory) {
        regex += "(?:[^/]+/)*";
        index += 2;
        continue;
      }

      if (isDoubleStar) {
        regex += ".*";
        index += 1;
        continue;
      }

      regex += "[^/]*";
      continue;
    }

    if (char === "?") {
      regex += "[^/]";
      continue;
    }

    regex += escapeRegex(char);
  }

  regex += "$";
  return new RegExp(regex);
}


function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Expected ${label} to be a non-empty string`);
  }

  return value;
}

function parseNonEmptyStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Expected ${label} to be a non-empty array`);
  }

  return value.map((entry, index) => requireNonEmptyString(entry, `${label}[${index}]`));
}

function parseOptionalString(value: unknown, label: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return requireNonEmptyString(value, label);
}

function parsePathGlobs(value: unknown, label: string): string[] {
  return parseNonEmptyStringArray(value, label).map(normalizeRelativePath);
}

function parseOptionalPathGlobs(value: unknown, label: string): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return parsePathGlobs(value, label);
}

function parseRelativeOutputDir(value: unknown, label: string): string {
  const normalizedPath = normalizeRelativePath(requireNonEmptyString(value, label)).replace(/\/+$/, "");

  if (normalizedPath === "" || normalizedPath === ".." || normalizedPath.startsWith("../") || normalizedPath.startsWith("/")) {
    throw new Error(`Expected ${label} to be a relative output directory inside the public export target`);
  }

  return normalizedPath;
}

function parseExternalResourceSet(value: unknown, index: number, configPath: string): ParsedExternalResourceSetConfig {
  if (!isRecord(value)) {
    throw new Error(`Expected externalResourceSets[${index}] to be an object`);
  }

  return {
    name: requireNonEmptyString(value.name, `externalResourceSets[${index}].name`),
    sourceRoot: resolve(dirname(configPath), requireNonEmptyString(value.sourceRoot, `externalResourceSets[${index}].sourceRoot`)),
    targetDir: parseRelativeOutputDir(value.targetDir, `externalResourceSets[${index}].targetDir`),
    include: parsePathGlobs(value.include, `externalResourceSets[${index}].include`),
    exclude: value.exclude ? parsePathGlobs(value.exclude, `externalResourceSets[${index}].exclude`) : [],
  };
}

function parseSanitizeRule(value: unknown, index: number): SanitizeRule {
  if (!isRecord(value)) {
    throw new Error(`Expected sanitize[${index}] to be an object`);
  }

  const type = value.type === "regex" ? "regex" : "string";
  const paths = parseOptionalPathGlobs(value.paths, `sanitize[${index}].paths`);
  const replace = requireNonEmptyString(value.replace, `sanitize[${index}].replace`);

  if (type === "regex") {
    return {
      paths,
      pattern: requireNonEmptyString(value.pattern, `sanitize[${index}].pattern`),
      flags: parseOptionalString(value.flags, `sanitize[${index}].flags`),
      replace,
      type,
    };
  }

  return {
    paths,
    match: requireNonEmptyString(value.match, `sanitize[${index}].match`),
    replace,
    type,
  };
}

function parseVerifyRule(value: unknown, index: number): VerifyRule {
  if (!isRecord(value)) {
    throw new Error(`Expected verify[${index}] to be an object`);
  }

  const type = value.type === "regex" ? "regex" : "string";
  const paths = parseOptionalPathGlobs(value.paths, `verify[${index}].paths`);
  const message = requireNonEmptyString(value.message, `verify[${index}].message`);

  if (type === "regex") {
    return {
      paths,
      pattern: requireNonEmptyString(value.pattern, `verify[${index}].pattern`),
      flags: parseOptionalString(value.flags, `verify[${index}].flags`),
      message,
      type,
    };
  }

  return {
    paths,
    match: requireNonEmptyString(value.match, `verify[${index}].match`),
    message,
    type,
  };
}

function compileRegex(pattern: string, flags: string | undefined, label: string): RegExp {
  try {
    return new RegExp(pattern, flags);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid ${label}: ${detail}`);
  }
}

function compileSanitizeRules(rules: SanitizeRule[]): CompiledSanitizeRule[] {
  return rules.map((rule, index) => {
    const pathMatchers = rule.paths?.map(compileGlob);

    if (rule.type === "regex") {
      return {
        pathMatchers,
        matcher: compileRegex(rule.pattern, rule.flags, `sanitize[${index}] regex`),
        replace: rule.replace,
        type: "regex",
      };
    }

    return {
      pathMatchers,
      match: rule.match,
      replace: rule.replace,
      type: "string",
    };
  });
}

function compileVerifyRules(rules: VerifyRule[]): CompiledVerifyRule[] {
  return rules.map((rule, index) => {
    const pathMatchers = rule.paths?.map(compileGlob);

    if (rule.type === "regex") {
      return {
        pathMatchers,
        matcher: compileRegex(rule.pattern, rule.flags, `verify[${index}] regex`),
        message: rule.message,
        type: "regex",
      };
    }

    return {
      pathMatchers,
      match: rule.match,
      message: rule.message,
      type: "string",
    };
  });
}

function parseConfig(configPath: string): ParsedPublicExportConfig {
  const payload = JSON.parse(readFileSync(configPath, "utf8")) as PublicExportConfig;

  if (!payload || typeof payload !== "object") {
    throw new Error(`Invalid public export config: ${configPath}`);
  }

  return {
    target: requireNonEmptyString(payload.target, `${configPath}: target`),
    include: parsePathGlobs(payload.include, `${configPath}: include`),
    exclude: payload.exclude ? parsePathGlobs(payload.exclude, `${configPath}: exclude`) : [],
    externalResourceSets: Array.isArray(payload.externalResourceSets)
      ? payload.externalResourceSets.map((entry, index) => parseExternalResourceSet(entry, index, configPath))
      : [],
    sanitize: Array.isArray(payload.sanitize) ? payload.sanitize.map(parseSanitizeRule) : [],
    verify: Array.isArray(payload.verify) ? payload.verify.map(parseVerifyRule) : [],
  };
}

function listTrackedFiles(root: string = REPO_ROOT): string[] {
  const raw = execFileSync("git", ["-C", root, "ls-files", "-z"], {
    encoding: "utf8",
    // Repo tracks 10k+ files; the default 1MB buffer overflows (ENOBUFS).
    maxBuffer: 1024 * 1024 * 256,
  });

  return raw
    .split("\0")
    .filter((entry) => entry.length > 0)
    .map(normalizeRelativePath)
    .sort();
}

function matchesAny(pathValue: string, matchers: RegExp[]): boolean {
  return matchers.some((matcher) => matcher.test(pathValue));
}

// Mirrors git's has_symlink_leading_path semantics: a tracked path whose
// leading directory is now a symlink no longer exists as that path — lstat
// alone would resolve through the link and report a phantom file, which the
// export would then copy under a path its sanitize rules no longer cover.
function hasSymlinkLeadingPath(root: string, relativePath: string, symlinkDirCache: Map<string, boolean>): boolean {
  const segments = relativePath.split("/");
  let leadingPath = "";

  for (const segment of segments.slice(0, -1)) {
    leadingPath = leadingPath === "" ? segment : `${leadingPath}/${segment}`;
    let isSymlink = symlinkDirCache.get(leadingPath);
    if (isSymlink === undefined) {
      try {
        isSymlink = lstatSync(join(root, leadingPath)).isSymbolicLink();
      } catch {
        isSymlink = false;
      }
      symlinkDirCache.set(leadingPath, isSymlink);
    }
    if (isSymlink) {
      return true;
    }
  }

  return false;
}

function filterToOnDiskPaths(root: string, relativePaths: string[]): string[] {
  const symlinkDirCache = new Map<string, boolean>();

  const isOnDisk = (relativePath: string): boolean => {
    if (hasSymlinkLeadingPath(root, relativePath, symlinkDirCache)) {
      return false;
    }
    try {
      // lstat so broken symlinks still count as present; they are copied as symlinks.
      lstatSync(join(root, relativePath));
      return true;
    } catch {
      return false;
    }
  };

  return relativePaths.filter((relativePath) => {
    if (isOnDisk(relativePath)) {
      return true;
    }
    process.stderr.write(`export-public: skipping tracked file missing from disk: ${relativePath}\n`);
    return false;
  });
}

function resolveTargetRoot(configPath: string, config: PublicExportConfig, targetOverride?: string): string {
  const targetBase = targetOverride ? resolveFromRepoRoot(targetOverride) : resolve(dirname(configPath), config.target);
  const relativeToSource = relative(REPO_ROOT, targetBase);

  if (relativeToSource === "" || (!relativeToSource.startsWith("..") && relativeToSource !== ".")) {
    throw new Error(`Public export target must live outside the source repo: ${targetBase}`);
  }

  return targetBase;
}

function buildExportPlan(configPath: string, targetOverride?: string): ExportPlan {
  const config = parseConfig(configPath);
  const trackedFiles = listTrackedFiles();
  const includeMatchers = config.include.map(compileGlob);
  const excludeMatchers = config.exclude.map(compileGlob);
  const selectedPaths = filterToOnDiskPaths(
    REPO_ROOT,
    trackedFiles.filter((pathValue) => matchesAny(pathValue, includeMatchers) && !matchesAny(pathValue, excludeMatchers)),
  );

  if (selectedPaths.length === 0) {
    throw new Error(`Public export matched zero tracked files using ${configPath}`);
  }

  return {
    configPath,
    excludePatterns: config.exclude,
    externalResourceSets: config.externalResourceSets,
    targetRoot: resolveTargetRoot(configPath, config, targetOverride),
    selectedPaths,
    trackedFiles,
    sanitizeRules: compileSanitizeRules(config.sanitize),
    verifyRules: compileVerifyRules(config.verify),
  };
}

function collectAncestorDirs(paths: string[]): Set<string> {
  const dirs = new Set<string>();
  for (const path of paths) {
    let dir = dirname(path);
    while (dir && dir !== "." && dir !== "/") {
      dirs.add(dir);
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return dirs;
}

function writePreservedStructureMarkers(
  targetRoot: string,
  trackedFiles: string[],
  selectedPaths: string[],
  excludePatterns: string[],
): void {
  const sourceDirs = collectAncestorDirs(trackedFiles);
  const mirroredDirs = collectAncestorDirs(selectedPaths);
  const excludeMatchers = excludePatterns.map(compileGlob);

  for (const relativeDir of sourceDirs) {
    if (mirroredDirs.has(relativeDir)) continue;
    if (matchesAny(`${relativeDir}/.gitkeep`, excludeMatchers) || matchesAny(`${relativeDir}/placeholder`, excludeMatchers)) {
      continue;
    }
    const parent = dirname(relativeDir);
    const parentIsRootOrMirrored = parent === "." || parent === "/" || mirroredDirs.has(parent);
    if (!parentIsRootOrMirrored) continue;

    const mirrorPath = join(targetRoot, relativeDir);
    mkdirSync(mirrorPath, { recursive: true });
    writeFileSync(join(mirrorPath, ".gitkeep"), "");
  }
}

function clearTargetRoot(targetRoot: string): void {
  mkdirSync(targetRoot, { recursive: true });

  for (const entry of readdirSync(targetRoot, { withFileTypes: true })) {
    if (entry.name === ".git") {
      continue;
    }
    rmSync(join(targetRoot, entry.name), { force: true, recursive: true });
  }
}

function readTextBuffer(buffer: Buffer): string | null {
  if (buffer.includes(0)) {
    return null;
  }

  return buffer.toString("utf8");
}

function ruleApplies(relativePath: string, rule: { pathMatchers?: RegExp[] }): boolean {
  return !rule.pathMatchers || rule.pathMatchers.length === 0 || matchesAny(relativePath, rule.pathMatchers);
}

function sanitizeText(relativePath: string, text: string, sanitizeRules: CompiledSanitizeRule[]): string {
  let sanitized = text;

  for (const rule of sanitizeRules) {
    if (!ruleApplies(relativePath, rule)) {
      continue;
    }

    sanitized =
      rule.type === "regex" ? sanitized.replace(rule.matcher, rule.replace) : sanitized.replaceAll(rule.match, rule.replace);
  }

  return sanitized;
}

function copyFileFromRoot(
  sourceRoot: string,
  sourceRelativePath: string,
  targetRoot: string,
  targetRelativePath: string,
  sanitizeRules: CompiledSanitizeRule[],
): void {
  const sourcePath = join(sourceRoot, sourceRelativePath);
  const targetPath = join(targetRoot, targetRelativePath);
  const sourceStats = lstatSync(sourcePath);
  const needsSanitize = sanitizeRules.some((rule) => ruleApplies(targetRelativePath, rule));

  mkdirSync(dirname(targetPath), { recursive: true });

  if (sourceStats.isSymbolicLink()) {
    // A symlink carries no content of its own — its target is sanitized and
    // verified under the target's own exported path (or is not exported at all).
    symlinkSync(readlinkSync(sourcePath), targetPath);
    return;
  }

  if (needsSanitize) {
    const sourceBuffer = readFileSync(sourcePath);
    const sourceText = readTextBuffer(sourceBuffer);
    if (sourceText === null) {
      copyFileSync(sourcePath, targetPath);
      return;
    }

    const sanitizedText = sanitizeText(targetRelativePath, sourceText, sanitizeRules);
    writeFileSync(targetPath, sanitizedText, { mode: sourceStats.mode });
    return;
  }

  copyFileSync(sourcePath, targetPath);
}

function copyPath(relativePath: string, targetRoot: string, sanitizeRules: CompiledSanitizeRule[]): void {
  copyFileFromRoot(REPO_ROOT, relativePath, targetRoot, relativePath, sanitizeRules);
}

function toExternalTargetPath(sourceRelativePath: string): string {
  if (sourceRelativePath === "AGENTS.md") {
    return "agents/root.AGENTS.source.md";
  }

  if (sourceRelativePath.endsWith("/AGENTS.md")) {
    return `agents/${dirname(sourceRelativePath)}/AGENTS.source.md`;
  }

  if (sourceRelativePath.startsWith(".ai/skills/")) {
    return `skills/${sourceRelativePath.slice(".ai/skills/".length)}`;
  }

  const guidanceMarker = ".ai/guidance/";
  const guidanceIndex = sourceRelativePath.indexOf(guidanceMarker);
  if (guidanceIndex !== -1) {
    const packagePrefix = sourceRelativePath.slice(0, guidanceIndex).replace(/\/$/, "");
    const guidanceRelativePath = sourceRelativePath.slice(guidanceIndex + guidanceMarker.length);
    return `guidance/${packagePrefix === "" ? "root" : packagePrefix}/${guidanceRelativePath}`;
  }

  return sourceRelativePath;
}

function buildExternalResourceReadme(resourceSet: ExternalResourceSetConfig): string {
  return `# ${resourceSet.name}

Generated public-safe resources copied from allowlisted files in the private Emily repo.

## Contents

- \`agents/\` contains copied \`AGENTS.md\` guidance renamed to \`AGENTS.source.md\`, so it remains reference material instead of active instruction files.
- \`skills/\` contains copied non-sensitive skills from the Emily repo \`.ai/skills/\` source tree.
- \`guidance/\` contains copied non-sensitive \`.ai/guidance/\` reference docs from the Emily repo, grouped by source package (\`root/\` for repo-root guidance).

## Refresh Rule

Do not edit generated files in this folder directly. Update the source files or the public export allowlist, then run \`brain repo export-public\`.
`;
}

export function copyExternalResourceSet(
  resourceSet: ExternalResourceSetConfig,
  targetRoot: string,
  sanitizeRules: CompiledSanitizeRule[],
): string[] {
  const sourceTrackedFiles = listTrackedFiles(resourceSet.sourceRoot);
  const includeMatchers = resourceSet.include.map(compileGlob);
  const excludeMatchers = (resourceSet.exclude ?? []).map(compileGlob);
  const selectedPaths = filterToOnDiskPaths(
    resourceSet.sourceRoot,
    sourceTrackedFiles.filter((pathValue) => matchesAny(pathValue, includeMatchers) && !matchesAny(pathValue, excludeMatchers)),
  );

  if (selectedPaths.length === 0) {
    throw new Error(`External resource set "${resourceSet.name}" matched zero tracked files`);
  }

  const targetDir = normalizeRelativePath(resourceSet.targetDir);
  const targetDirPath = join(targetRoot, targetDir);
  rmSync(targetDirPath, { force: true, recursive: true });
  mkdirSync(targetDirPath, { recursive: true });

  const readmePath = `${targetDir}/README.md`;
  writeFileSync(join(targetRoot, readmePath), sanitizeText(readmePath, buildExternalResourceReadme(resourceSet), sanitizeRules));

  const copiedPaths = [readmePath];
  for (const sourceRelativePath of selectedPaths) {
    const targetRelativePath = `${targetDir}/${toExternalTargetPath(sourceRelativePath)}`;
    copyFileFromRoot(resourceSet.sourceRoot, sourceRelativePath, targetRoot, targetRelativePath, sanitizeRules);
    copiedPaths.push(targetRelativePath);
  }

  return [readmePath, ...copiedPaths.slice(1).sort((left, right) => left.localeCompare(right))];
}

function runVerifyChecks(targetRoot: string, selectedPaths: string[], verifyRules: CompiledVerifyRule[]): void {
  const failures: string[] = [];

  for (const relativePath of selectedPaths) {
    const matchingRules = verifyRules.filter((rule) => ruleApplies(relativePath, rule));

    if (matchingRules.length === 0) {
      continue;
    }

    const targetPath = join(targetRoot, relativePath);
    // Symlinks (e.g. the skills-dir links) carry no content of their own; their
    // targets are verified under their real source paths.
    if (!lstatSync(targetPath).isFile()) {
      continue;
    }
    const fileText = readTextBuffer(readFileSync(targetPath));
    if (fileText === null) {
      continue;
    }

    for (const rule of matchingRules) {
      const didMatch = rule.type === "regex" ? rule.matcher.test(fileText) : fileText.includes(rule.match);

      if (rule.type === "regex") {
        rule.matcher.lastIndex = 0;
      }

      if (didMatch) {
        failures.push(`${relativePath}: ${rule.message}`);
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(`Public export verification failed:\n- ${failures.join("\n- ")}`);
  }
}

export function main(argv: string[] = []): number {
  const configFlagIndex = argv.findIndex((entry) => entry === "--config");
  const configPath =
    configFlagIndex === -1 || configFlagIndex === argv.length - 1
      ? DEFAULT_CONFIG_PATH
      : resolveFromRepoRoot(argv[configFlagIndex + 1]);

  const targetFlagIndex = argv.findIndex((entry) => entry === "--target");
  const targetOverride =
    targetFlagIndex === -1 || targetFlagIndex === argv.length - 1 ? undefined : argv[targetFlagIndex + 1];

  const plan = buildExportPlan(configPath, targetOverride);
  const targetLabel = relative(REPO_ROOT, plan.targetRoot) || plan.targetRoot;

  process.stdout.write(`export-public: config ${relative(REPO_ROOT, plan.configPath) || plan.configPath}\n`);
  process.stdout.write(`export-public: target ${targetLabel}\n`);
  process.stdout.write(`export-public: selected ${plan.selectedPaths.length}/${plan.trackedFiles.length} tracked file(s)\n`);

  clearTargetRoot(plan.targetRoot);
  for (const relativePath of plan.selectedPaths) {
    copyPath(relativePath, plan.targetRoot, plan.sanitizeRules);
  }

  const externalCopiedPaths = plan.externalResourceSets.flatMap((resourceSet) => {
    const copiedPaths = copyExternalResourceSet(resourceSet, plan.targetRoot, plan.sanitizeRules);
    process.stdout.write(`export-public: external ${resourceSet.name} copied ${copiedPaths.length} file(s)\n`);
    return copiedPaths;
  });

  writePreservedStructureMarkers(plan.targetRoot, plan.trackedFiles, plan.selectedPaths, plan.excludePatterns);
  runVerifyChecks(plan.targetRoot, [...plan.selectedPaths, ...externalCopiedPaths], plan.verifyRules);

  process.stdout.write("export-public: done ✓\n");
  return 0;
}

export default class RepoExportPublic extends Command {
  static description = "Export allowlisted tracked files into the generated brain-public repo";

  static flags = {
    config: Flags.string({
      default: DEFAULT_CONFIG_PATH,
      description: "Path to the public export config JSON file",
    }),
    target: Flags.string({
      description: "Optional override for the export target directory",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(RepoExportPublic);
    const argv: string[] = [];

    if (flags.config) {
      argv.push("--config", flags.config);
    }
    if (flags.target) {
      argv.push("--target", flags.target);
    }

    const exitCode = main(argv);
    if (exitCode !== 0) {
      this.exit(exitCode);
    }
  }
}
