import { workspace } from "vscode";
import * as cp from "child_process";
import { CTagJson, CTagQuickPickItem } from "./types";
import { getScoreModifiers } from "./settings";
import type F from "fuse.js";
import { ICON_MAPPING } from "./icons";
import * as path from "path";

/**
 * Gets all folder paths in the Workspace,
 * reverse sorted, so longer path come first
 */
export const getWsPaths = () =>
  workspace?.workspaceFolders
    ?.map((folder) => folder.uri.path)
    .sort()
    .reverse();

export const groupBy = <T, K extends keyof any>(arr: T[], key: (i: T) => K) =>
  arr.reduce((groups, item) => {
    (groups[key(item)] ||= []).push(item);
    return groups;
  }, {} as Record<K, T[]>);

export const debounce = <F extends (...args: any[]) => any, R>(
  func: F,
  waitFor: number
) => {
  let timeout: NodeJS.Timeout;

  const debounced = (...args: Parameters<F>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced;
};

/**
 * Is this a constant in a method body ?
 */
export const tagIsPrivateConstant = ({ kind, scopeKind }: CTagJson) =>
  kind === "constant" && scopeKind === "method";

/**
 * Removes all the workspace paths from a given absolute path, to make it "relative"
 * @param path
 */
export const removeWsPathsFromPath = (path: string) => {
  var newPath = path;
  const wsPaths = getWsPaths();
  for (const wsPath in wsPaths) newPath = newPath.replace(wsPath, "");

  return newPath;
};

/**
 * Modifies the Score of a Fuse-Search item, by applying the score modifiers
 *
 * @param item
 * @param editorFile
 * @returns
 */
export const applyModifier = (
  item: F.FuseSortFunctionArg,
  editorFile: string
) => {
  const scoreModifiers = getScoreModifiers();

  const modifiedScore =
    (item.score ?? 0) *
    (editorFile === (item.item[2] as any).v
      ? scoreModifiers["currentFile"]
      : scoreModifiers[(item.item[4] as any).v as keyof typeof scoreModifiers]);

  //@ts-ignore
  item.modifiedScore = modifiedScore;
  return modifiedScore;
};

/**
 * Converts a CTag to a VSCode QuickPick Item
 * @param cTag
 * @param cTagNames All other quick pick names (for duplication search)
 * @param editorFile The current editor file to provide more relevant results
 * @returns
 */
export const cTagToQuickPickItem = (
  { name, path: cTagPath, line, kind }: CTagJson,
  cTagNames: string[] = [],
  editorFile: string
): CTagQuickPickItem => {
  // Does a symbol with the same name exists ?
  // -> Add additional context for the user
  const isDuplicate = cTagNames.includes(name.toLocaleLowerCase());

  return {
    label: `${
      editorFile === path.basename(cTagPath) ? "$(chevron-right)" : ""
    } $(${ICON_MAPPING[kind] ?? ""}) ${name} ${
      isDuplicate ? `(${path.extname(cTagPath)})` : ""
    }`.trim(),
    description:
      removeWsPathsFromPath(cTagPath) + (isDuplicate ? `:${line}` : ""),
    line,
    path: cTagPath,
    tagKind: kind,
    alwaysShow: true,
  };
};
