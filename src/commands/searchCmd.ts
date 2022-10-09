// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
  window as vscWindow,
  workspace,
  Uri,
  Position,
  Range,
  TextEditorRevealType,
  Selection,
} from "vscode";
import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";

import { ICON_MAPPING } from "../icons";
import { CTagJson, CTagLine } from "../types";
import { cacheManagerInstance, Status } from "../cacheManager/CacheManager";
import { debounce, getWsPath } from "../helpers";
import { getScoreModifiers } from "../settings";
import * as FuseImport from "fuse.js";
import type F from "fuse.js";

const Fuse: typeof FuseImport.default = FuseImport as any;

const wsPath = getWsPath();
const scoreModifiers = getScoreModifiers();

// Match the "."-Operator for extension search
const extensionRegex = /\.[a-zA-Z.]{1,10}/;
// Match the "/"-Operator for path search
const pathRegex = /\/([\w/.]+)/;

const applyModifier = (item: F.FuseSortFunctionArg, editorFile: string) => {
  const modifiedScore =
    (item.score ?? 0) *
    (editorFile == (item.item[2] as any).v
      ? scoreModifiers["currentFile"]
      : scoreModifiers[(item.item[4] as any).v as keyof typeof scoreModifiers]);

  //@ts-ignore
  item.modifiedScore = modifiedScore;
  return modifiedScore;
};

const cTagToItem = (
  { name, path: ctagPath, line, kind }: CTagJson,
  cTagNames: string[] = [],
  editorFile: string
): CTagLine => {
  // Does a symbol with the same name exists ?
  // -> Add additional context for the user
  const isDuplicate = cTagNames.includes(name.toLocaleLowerCase());

  return {
    label: `${
      editorFile == path.basename(ctagPath) ? "$(chevron-right)" : ""
    } $(${ICON_MAPPING[kind] ?? ""}) ${name} ${
      isDuplicate ? `(${path.extname(ctagPath)})` : ""
    }`.trim(),
    description:
      ctagPath.replace(wsPath!, "") + (isDuplicate ? `:${line}` : ""),
    line,
    path: ctagPath,
    tagKind: kind,
    alwaysShow: true,
  };
};

export const searchCmd = async () => {
  const quickPick = vscWindow.createQuickPick<CTagLine>();
  (quickPick as any).sortByLabel = false;

  quickPick.title = "Search for a Symbol or File";

  if (!wsPath) return;

  if (cacheManagerInstance?.status == Status.NotInitialized)
    await cacheManagerInstance?.initializeCache();

  const cTags = cacheManagerInstance?.getAllTags() ?? [];
  const cTagNames = cTags.map(({ name }) => name.toLocaleLowerCase());

  const editorFile = path.basename(
    vscWindow.activeTextEditor?.document.fileName ?? ""
  );

  //TODO: Persist instance over multiple searches (in Cache Manager)
  const fuse = new Fuse(cTags, {
    keys: [
      {
        name: "name",
        getFn: (item) => item.name,
        weight: 1.5,
      },
      // Improve searches by extension
      {
        name: "extension",
        getFn: (item) => path.extname(item.path),
      },
      // Add the filename e.g. for function in filename
      {
        name: "filename",
        getFn: (item) => path.basename(item.path),
        weight: 0.9,
      },
      // Add the full path to allow somewhat fuzzy file navigation
      {
        name: "path",
        getFn: (item) => path.dirname(item.path).replace(wsPath, ""),
      },
      // Just added for sorting
      { name: "kind", weight: 0.01 },
    ],
    shouldSort: true,
    sortFn: (a, b) =>
      applyModifier(a, editorFile) - applyModifier(b, editorFile),
    includeScore: true,
  });

  quickPick.items = fuse
    .search("")
    .map((i) => cTagToItem(i.item, undefined, editorFile));

  quickPick.onDidChangeValue(
    debounce((term: string) => {
      const additionalOptions: F.Expression = { $and: [] };

      // Search for the "."-Operator
      const extensionMatch = extensionRegex.exec(term);
      if (extensionMatch) {
        additionalOptions["$and"]?.push({ extension: `'${extensionMatch[0]}` });
        term = term.replace(extensionMatch[0], "").trim();
      }

      // Search for the "/"-Operator
      const pathMatch = pathRegex.exec(term);
      if (pathMatch) {
        additionalOptions["$and"]?.push({ path: `${pathMatch[1]}` });
        term = term.replace(pathMatch[0], "").trim();
      }

      // Only search in name & filename by default
      const items = fuse.search({
        $and: [
          { $or: [{ name: term }, { filename: term }] },
          ...(additionalOptions.$and ?? []),
        ],
      });

      quickPick.items = items.map((item) =>
        cTagToItem(item.item, cTagNames, editorFile)
      );
    }, 50)
  );

  quickPick.onDidAccept(async () => {
    const item = quickPick.activeItems[0];
    const { line, path } = item;
    console.log("Selected Item: " + JSON.stringify(item));
    console.log(
      "Other Tags on file: " +
        JSON.stringify(cTags.filter(({ path: p }) => p == path))
    );

    const uri = Uri.file(path);
    await vscWindow.showTextDocument(uri, {});
    if (!vscWindow.activeTextEditor) return;

    // It seems,that the Position is offset by 1
    const position = new Position(line - 1, 0);
    const range = new Range(position, position);

    vscWindow.activeTextEditor.revealRange(
      range,
      TextEditorRevealType.InCenter
    );

    vscWindow.activeTextEditor!.selections = [
      new Selection(position, position),
    ];

    quickPick.hide();
  });

  quickPick.show();
};
