import { workspace } from "vscode";
import { CTagJson } from "./types";

export const getFileExclusions = () =>
  workspace
    .getConfiguration("symbol-seeker")
    .get<string[]>("fileExclusions") ?? [
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
    ".git",
  ];

export const getSymbolExclusions = () =>
  workspace
    .getConfiguration("symbol-seeker")
    .get<string[]>("symbolExclusions") ?? ["main"];

export const getScoreModifiers: () => Record<
  CTagJson["kind"],
  number
> = () => ({
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
  ...(workspace.getConfiguration("symbol-seeker").get("scoreModifiers") ?? {}),
});
