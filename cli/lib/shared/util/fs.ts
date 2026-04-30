import { readdirSync, statSync, type Stats } from "node:fs";
import { join } from "node:path";

export function safeExists(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

export function listMatchingFiles(
  directoryPath: string,
  predicate: (fileName: string, filePath: string, stats: Stats) => boolean
): string[] {
  try {
    return readdirSync(directoryPath)
      .map((fileName) => ({ fileName, filePath: join(directoryPath, fileName) }))
      .filter(({ fileName, filePath }) => {
        try {
          const stats = statSync(filePath);
          return stats.isFile() && predicate(fileName, filePath, stats);
        } catch {
          return false;
        }
      })
      .map(({ filePath }) => filePath)
      .sort();
  } catch {
    return [];
  }
}

export function findSingleMatchingFile(
  directoryPath: string,
  predicate: (fileName: string, filePath: string, stats: Stats) => boolean,
  label: string
): string {
  const matches = listMatchingFiles(directoryPath, predicate);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one ${label} in ${directoryPath}, found ${matches.length}`);
  }
  return matches[0];
}
