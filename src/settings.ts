export const DEFAULT_EXCLUSIONS = [
  "*.json",
  "*.min.*",
  "*.css",
  "*.scss",
  "*.md",
  "*.yml",
  ".fvm",
  "Pods",
  ".symlinks",
  "public",
  "coverage",
  "ios",
  "android",
  ".dart_tool",
];

export const EXCLUDE_SYMBOLS = ["main"];

const BASE_CMD =
  "/usr/bin/env ctags --recurse --output-format=json --extras=f --fields=+n";

export const generateCTagsCmd = (folder: string, exclusions: string[]) =>
  `${BASE_CMD} ${exclusions
    .map((e) => `--exclude='${e}'`)
    .join(" ")} ${folder}/`;
