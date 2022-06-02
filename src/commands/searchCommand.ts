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
import { getWsPath } from "../helpers";

export const searchCmd = async () => {
  const wsPath = getWsPath();
  if (!wsPath) return;

  if (cacheManagerInstance?.status == Status.NotInitialized)
    await cacheManagerInstance?.initializeCache();

  const cTags = cacheManagerInstance?.getAllTags() ?? [];

  const cTagNames = cTags.map(({ name }) => name.toLocaleLowerCase());

  const quickPick = vscWindow.createQuickPick<CTagLine>();
  quickPick.title = "Search for a Symbol or File";

  quickPick.items = cTags.map(({ name, line, path: ctagPath, kind }) => {
    // Does a symbol with the same name exists ?
    // -> Add additional context for the user
    const isDuplicate = cTagNames.includes(name.toLocaleLowerCase());

    return {
      label: `$(${ICON_MAPPING[kind] ?? ""}) ${name} ${
        isDuplicate ? `(${path.extname(ctagPath)})` : ""
      }`,
      description:
        ctagPath.replace(wsPath, "") + (isDuplicate ? `:${line}` : ""),
      line,
      path: ctagPath,
      tagKind: kind,
    };
  });

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
