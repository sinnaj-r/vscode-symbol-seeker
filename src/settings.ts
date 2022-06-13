import { CTagJson } from "./types";

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
  "*.test.ts",
  "*_test.dart",
];

export const EXCLUDE_SYMBOLS = ["main"];

export const SCORE_MODIFIERS: Record<CTagJson["kind"], number> = {
  function: 1,
  constant: 1,
  variable: 1,
  method: 1,
  alias: 1,
  interface: 1,
  namespace: 1,
  property: 1,
  file: 1,
  class: 1,
  enum: 1,
  enumerator: 1,
  id: 1,
};
