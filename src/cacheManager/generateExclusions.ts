import { existsSync, readFileSync } from "fs";
import { getWsPaths } from "../helpers";
import { getFileExclusions } from "../settings";

/**
 * Generates a list of all excluded globs.
 * This includes user defined globs and those globs in gitignore files
 *
 * @returns
 */
export const generateExclusions = (): string[] => {
  const wsPaths = getWsPaths();
  if (!wsPaths) return [];
  const exclusions = [...getFileExclusions()];
  for (const wsPath of wsPaths) {
    if (existsSync(`${wsPath}/.gitignore`)) {
      const data = readFileSync(`${wsPath}/.gitignore`, "utf8");
      exclusions.push(
        ...data
          .trim()
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => !!line)
          // Exclude Comments and Globs
          .filter(
            (line) =>
              !line.startsWith("#") &&
              !line.includes("**") &&
              !line.includes("~") &&
              !line.includes("?")
          )
          .filter((line) => !line.startsWith("#"))
      );
    }
  }
  return exclusions;
};
