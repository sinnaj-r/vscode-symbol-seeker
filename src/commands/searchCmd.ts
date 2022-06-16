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

// TODO: Apply modifiers based on kind & if it's in the current file
const applyModifier = (item: F.FuseSortFunctionArg) => (item.score ?? 0) * 1; //SCORE_MODIFIERS[(item.item as unknown as CTagJson).kind];

const cTagToItem = (
  { name, path: ctagPath, line, kind }: CTagJson,
  cTagNames: string[] = []
): CTagLine => {
  // Does a symbol with the same name exists ?
  // -> Add additional context for the user
  const isDuplicate = cTagNames.includes(name.toLocaleLowerCase());

  return {
    label: `$(${ICON_MAPPING[kind] ?? ""}) ${name} ${
      isDuplicate ? `(${path.extname(ctagPath)})` : ""
    }`,
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

  //TODO: Persist instance over multiple searches (in Cache Manager)
  const fuse = new Fuse(cTags, {
    keys: [
      {
        name: "name",
        getFn: (item) => item.name,
      },
      // Improve searches by extension
      {
        name: "extension",
        getFn: (item) => path.extname(item.path),
        weight: 1.2,
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
        weight: 0.3,
      },
      // Just added for sorting
      { name: "kind", weight: 0.01 },
    ],
    sortFn: (a, b) => applyModifier(a) - applyModifier(b),
  });

  quickPick.items = fuse.search("").map((i) => cTagToItem(i.item));

  quickPick.onDidChangeValue(
    debounce((term: string) => {
      const items = fuse.search(term);

      quickPick.items = items.map((item) => cTagToItem(item.item, cTagNames));
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
