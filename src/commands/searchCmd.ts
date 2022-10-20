// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
  window as vscWindow,
  Uri,
  Position,
  Range,
  TextEditorRevealType,
  Selection,
} from "vscode";
import * as path from "path";

import { CTagQuickPickItem } from "../types";
import { cacheManagerInstance, Status } from "../cacheManager/CacheManager";
import {
  applyModifier,
  cTagToQuickPickItem,
  debounce,
  getWsPaths,
  removeWsPathsFromPath,
} from "../helpers";
import * as FuseImport from "fuse.js";
import type F from "fuse.js";
import { extensionRegex, fileNameRegex, pathRegex } from "../regexps";

const FUSE: typeof FuseImport.default = FuseImport as any;
const wsPaths = getWsPaths();

export const searchCmd = async () => {
  const quickPick = vscWindow.createQuickPick<CTagQuickPickItem>();
  (quickPick as any).sortByLabel = false;

  quickPick.title = "Search for a Symbol or File";

  if (!wsPaths) return;

  if (cacheManagerInstance?.status === Status.notInitialized) {
    quickPick.items = [
      { label: "Please wait", path: "", line: 0, tagKind: "class" },
    ];
    quickPick.show();
    await cacheManagerInstance?.initializeCache();
  } else if (cacheManagerInstance?.status === Status.initializing) {
    quickPick.items = [
      {
        label: "Initializing, please try later",
        path: "",
        line: 0,
        tagKind: "class",
      },
    ];
    quickPick.show();
    return;
  }

  const cTags = cacheManagerInstance?.getAllTags() ?? [];
  const cTagNames = cTags.map(({ name }) => name.toLocaleLowerCase());

  const editorFile = path.basename(
    vscWindow.activeTextEditor?.document.fileName ?? ""
  );

  //TODO: Persist instance over multiple searches (in Cache Manager)
  const fuse = new FUSE(cTags, {
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
      // Add the relative ws path to allow somewhat fuzzy file navigation
      {
        name: "relativePath",
        getFn: (item) => removeWsPathsFromPath(path.dirname(item.path)),
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
    .map((i) => cTagToQuickPickItem(i.item, undefined, editorFile));

  quickPick.onDidChangeValue(
    debounce((term: string) => {
      const additionalOptions: F.Expression = { $and: [] };

      // Search for the "$"-Operator
      const fileNameMatch = fileNameRegex.exec(term);
      if (fileNameMatch) {
        additionalOptions["$and"]?.push({ filename: `^${fileNameMatch[1]}` });
        term = term.replace(fileNameMatch[0], "").trim();
      }

      // Search for the "/"-Operator
      const pathMatch = pathRegex.exec(term);
      if (pathMatch) {
        additionalOptions["$and"]?.push({ relativePath: `${pathMatch[1]}` });
        term = term.replace(pathMatch[0], "").trim();
      }

      // Search for the "."-Operator
      const extensionMatch = extensionRegex.exec(term);
      if (extensionMatch) {
        additionalOptions["$and"]?.push({ extension: `'${extensionMatch[0]}` });
        term = term.replace(extensionMatch[0], "").trim();
      }

      // Only search in name & filename by default
      const items = fuse.search({
        $and: [
          { $or: [{ name: term }, { filename: term }] },
          ...(additionalOptions.$and ?? []),
        ],
      });

      quickPick.items = items.map((item) =>
        cTagToQuickPickItem(item.item, cTagNames, editorFile)
      );
    }, 50)
  );

  quickPick.onDidAccept(async () => {
    const item = quickPick.activeItems[0];
    const { line, path } = item;
    // This is the case for the "please wait" item
    if (!path) return;

    console.log("Selected Item: " + JSON.stringify(item));
    console.log(
      "Other Tags on file: " +
        JSON.stringify(cTags.filter(({ path: p }) => p === path))
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
