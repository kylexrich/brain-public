import Database from "better-sqlite3";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { Command, Flags } from "@oclif/core";

const ADDRESSBOOK_ROOT = join(homedir(), "Library/Application Support/AddressBook");
const PERSONAL_GOOGLE_ACCOUNT_EMAIL_ADDRESS = process.env.PERSONAL_GOOGLE_ACCOUNT_EMAIL_ADDRESS?.trim() || null;

type ContactMode = "report" | "reminder_title";
type MatchType = "phone_exact" | "phone_suffix" | "email_exact" | "name_exact" | "name_partial" | null;

interface ResolverResult {
  resolved: boolean;
  name: string | null;
  source: "google" | "apple" | "fallback" | "unresolved";
  label: string | null;
  matchType: MatchType;
}

interface GoogleContactCandidate {
  name?: string;
  phone?: string;
  email?: string;
}

interface ApplePhoneRow {
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  organization: string | null;
  phone: string | null;
}

interface AppleEmailRow {
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  organization: string | null;
  email: string | null;
}

interface AppleNameRow {
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  organization: string | null;
}

function normalizeDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function normalizeEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeName(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function looksLikeEmail(value: string | null | undefined): boolean {
  return (value ?? "").includes("@");
}

function buildName(...parts: Array<string | null | undefined>): string | null {
  const cleanedParts = parts
    .map((part) => (part ?? "").trim())
    .filter((part) => part.length > 0);
  return cleanedParts.length > 0 ? cleanedParts.join(" ") : null;
}

function parseJsonArray<T>(input: string): T[] {
  if (!input.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(input) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function runGoogleSearch(query: string): GoogleContactCandidate[] {
  const args = ["contacts", "search", query];
  if (PERSONAL_GOOGLE_ACCOUNT_EMAIL_ADDRESS) {
    args.push("--account", PERSONAL_GOOGLE_ACCOUNT_EMAIL_ADDRESS);
  }
  args.push("--json", "--results-only");

  const result = spawnSync(
    "gog",
    args,
    { encoding: "utf8" }
  );

  if (result.status !== 0) {
    return [];
  }

  return parseJsonArray<GoogleContactCandidate>(result.stdout ?? "");
}

function scoreGoogleCandidate(
  candidate: GoogleContactCandidate,
  identifier: string,
  displayName?: string
): { score: number; matchType: MatchType } {
  const identifierDigits = normalizeDigits(identifier);
  const candidatePhoneDigits = normalizeDigits(candidate.phone);
  const identifierEmail = normalizeEmail(identifier);
  const candidateEmail = normalizeEmail(candidate.email);
  const displayNameNormalized = normalizeName(displayName);
  const candidateNameNormalized = normalizeName(candidate.name);

  if (identifierDigits && candidatePhoneDigits) {
    if (candidatePhoneDigits === identifierDigits) {
      return { score: 120, matchType: "phone_exact" };
    }
    if (candidatePhoneDigits.endsWith(identifierDigits) || identifierDigits.endsWith(candidatePhoneDigits)) {
      return { score: 100, matchType: "phone_suffix" };
    }
  }

  if (identifierEmail && candidateEmail && identifierEmail === candidateEmail) {
    return { score: 120, matchType: "email_exact" };
  }

  if (displayNameNormalized && candidateNameNormalized) {
    if (candidateNameNormalized === displayNameNormalized) {
      return { score: 90, matchType: "name_exact" };
    }
    if (
      candidateNameNormalized.includes(displayNameNormalized) ||
      displayNameNormalized.includes(candidateNameNormalized)
    ) {
      return { score: 70, matchType: "name_partial" };
    }
  }

  return { score: 0, matchType: null };
}

function resolveGoogle(identifier: string, displayName?: string): { name: string | null; matchType: MatchType } {
  const queries = [identifier, displayName]
    .map((query) => (query ?? "").trim())
    .filter((query, index, values) => query.length > 0 && values.indexOf(query) === index);

  let bestScore = 0;
  let bestName: string | null = null;
  let bestMatchType: MatchType = null;

  for (const query of queries) {
    for (const candidate of runGoogleSearch(query)) {
      const { score, matchType } = scoreGoogleCandidate(candidate, identifier, displayName);
      if (score > bestScore) {
        bestScore = score;
        bestName = (candidate.name ?? "").trim() || null;
        bestMatchType = matchType;
      }
    }
  }

  if (bestScore >= 90 && bestName) {
    return { name: bestName, matchType: bestMatchType };
  }

  return { name: null, matchType: null };
}

function listAddressbookPaths(): string[] {
  if (!existsSync(ADDRESSBOOK_ROOT)) {
    return [];
  }

  const results: string[] = [];
  const stack = [ADDRESSBOOK_ROOT];

  while (stack.length > 0) {
    const currentPath = stack.pop()!;
    for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
      const entryPath = join(currentPath, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".abcddb")) {
        results.push(entryPath);
      }
    }
  }

  return results.sort();
}

function withDatabase<T>(databasePath: string, callback: (database: Database.Database) => T): T | null {
  try {
    const database = new Database(databasePath, { readonly: true, fileMustExist: true });
    try {
      return callback(database);
    } finally {
      database.close();
    }
  } catch {
    return null;
  }
}

function resolveAppleNameFromRow(row: ApplePhoneRow | AppleEmailRow | AppleNameRow): string | null {
  return (
    (row.name ?? "").trim() ||
    buildName(row.first_name, row.last_name) ||
    (row.organization ?? "").trim() ||
    null
  );
}

function resolveApplePhone(identifier: string): { name: string | null; matchType: MatchType } {
  const targetDigits = normalizeDigits(identifier);
  if (!targetDigits) {
    return { name: null, matchType: null };
  }

  const query = `
    SELECT
      r.ZNAME AS name,
      r.ZFIRSTNAME AS first_name,
      r.ZLASTNAME AS last_name,
      r.ZORGANIZATION AS organization,
      p.ZFULLNUMBER AS phone
    FROM ZABCDPHONENUMBER p
    JOIN ZABCDRECORD r ON r.Z_PK = p.ZOWNER
  `;

  for (const databasePath of listAddressbookPaths()) {
    const rows = withDatabase(databasePath, (database) => database.prepare(query).all() as ApplePhoneRow[]);
    if (!rows) {
      continue;
    }

    for (const row of rows) {
      const candidateDigits = normalizeDigits(row.phone);
      if (
        candidateDigits &&
        (candidateDigits.endsWith(targetDigits) || targetDigits.endsWith(candidateDigits))
      ) {
        const resolvedName = resolveAppleNameFromRow(row);
        if (resolvedName) {
          return { name: resolvedName, matchType: "phone_suffix" };
        }
      }
    }
  }

  return { name: null, matchType: null };
}

function resolveAppleEmail(identifier: string): { name: string | null; matchType: MatchType } {
  const targetEmail = normalizeEmail(identifier);
  if (!targetEmail) {
    return { name: null, matchType: null };
  }

  const query = `
    SELECT
      r.ZNAME AS name,
      r.ZFIRSTNAME AS first_name,
      r.ZLASTNAME AS last_name,
      r.ZORGANIZATION AS organization,
      e.ZADDRESS AS email
    FROM ZABCDEMAILADDRESS e
    JOIN ZABCDRECORD r ON r.Z_PK = e.ZOWNER
  `;

  for (const databasePath of listAddressbookPaths()) {
    const rows = withDatabase(databasePath, (database) => database.prepare(query).all() as AppleEmailRow[]);
    if (!rows) {
      continue;
    }

    for (const row of rows) {
      if (normalizeEmail(row.email) === targetEmail) {
        const resolvedName = resolveAppleNameFromRow(row);
        if (resolvedName) {
          return { name: resolvedName, matchType: "email_exact" };
        }
      }
    }
  }

  return { name: null, matchType: null };
}

function resolveAppleName(displayName?: string): { name: string | null; matchType: MatchType } {
  const targetName = normalizeName(displayName);
  if (!targetName) {
    return { name: null, matchType: null };
  }

  const query = `
    SELECT
      ZNAME AS name,
      ZFIRSTNAME AS first_name,
      ZLASTNAME AS last_name,
      ZORGANIZATION AS organization
    FROM ZABCDRECORD
  `;

  for (const databasePath of listAddressbookPaths()) {
    const rows = withDatabase(databasePath, (database) => database.prepare(query).all() as AppleNameRow[]);
    if (!rows) {
      continue;
    }

    for (const row of rows) {
      const resolvedName = resolveAppleNameFromRow(row);
      if (resolvedName && normalizeName(resolvedName) === targetName) {
        return { name: resolvedName, matchType: "name_exact" };
      }
    }
  }

  return { name: null, matchType: null };
}

function resolveApple(identifier: string, displayName?: string): { name: string | null; matchType: MatchType } {
  if (looksLikeEmail(identifier)) {
    const resolvedEmail = resolveAppleEmail(identifier);
    if (resolvedEmail.name) {
      return resolvedEmail;
    }
  } else {
    const resolvedPhone = resolveApplePhone(identifier);
    if (resolvedPhone.name) {
      return resolvedPhone;
    }
  }

  return resolveAppleName(displayName);
}

export function buildResult(identifier: string, displayName: string | undefined, mode: ContactMode): ResolverResult {
  const googleResult = resolveGoogle(identifier, displayName);
  if (googleResult.name) {
    return {
      resolved: true,
      name: googleResult.name,
      source: "google",
      label: googleResult.name,
      matchType: googleResult.matchType
    };
  }

  const appleResult = resolveApple(identifier, displayName);
  if (appleResult.name) {
    return {
      resolved: true,
      name: appleResult.name,
      source: "apple",
      label: appleResult.name,
      matchType: appleResult.matchType
    };
  }

  if (mode === "report") {
    return {
      resolved: false,
      name: null,
      source: "fallback",
      label: identifier,
      matchType: null
    };
  }

  return {
    resolved: false,
    name: null,
    source: "unresolved",
    label: null,
    matchType: null
  };
}

export default class ContactResolve extends Command {
  static description = "Resolve a contact name from an identifier";

  static flags = {
    identifier: Flags.string({
      required: true,
      description: "Phone number, email, or identifier to resolve",
    }),
    mode: Flags.string({
      required: true,
      options: ["report", "reminder_title"],
      description: "Resolution mode",
    }),
    "display-name": Flags.string({
      description: "Optional display name to improve matching",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ContactResolve);
    const result = buildResult(flags.identifier, flags["display-name"], flags.mode as ContactMode);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  }
}
