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
  "*.patch",
  "*.xml",

  // Very specific usecase
  "*.js",
];

export const EXTENSION_PATH =
  "/Users/jannis/Dropbox/Programmieren/VSCode/symbol-seeker";
export const EXCLUDE_SYMBOLS = ["main"];

//TODO dynamically add all '.ctags' files
const BASE_CMD = `/usr/bin/env ctags --options=${EXTENSION_PATH}/ctags-optlibs/dart.ctags --recurse --output-format=json --extras=f --fields=+n`;

export const generateCTagsCmd = (folder: string, exclusions: string[]) =>
  `${BASE_CMD} ${exclusions
    .map((e) => `--exclude='${e}'`)
    .join(" ")} ${folder}/`;
