export const DEFAULT_EXCLUSIONS = [
  "*.json",
  "*.min.*",
  "*.css",
  "*.scss",
  "*.md",
  "*.yml",
];

const BASE_CMD =
  "/usr/bin/env ctags --recurse --output-format=json --extras=f --fields=+n";

export const generateCTagsCmd = (folder: string, exclusions: string[]) =>
  `${BASE_CMD} ${exclusions
    .map((e) => `--exclude='${e}'`)
    .join(" ")} ${folder}/`;
