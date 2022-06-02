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
import {
  generateCTagsCmd,
  DEFAULT_EXCLUSIONS,
  EXCLUDE_SYMBOLS,
} from "../settings";
import { ICON_MAPPING } from "../icons";
import { CTagJson, CTagLine } from "../types";

export const searchCmd = async () => {
  const wsPath = workspace?.workspaceFolders?.[0].uri.path;
  if (!wsPath) return;

  const exclusions = [...DEFAULT_EXCLUSIONS];
  if (fs.existsSync(`${wsPath}/.gitignore`)) {
    const data = fs.readFileSync(`${wsPath}/.gitignore`, "utf8");
    exclusions.push(
      ...data
        .trim()
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => !!line)
        // Exclude Comments and Globs
        .filter((line) => !line.startsWith("#") && !line.includes("**"))
        .filter((line) => !line.startsWith("#"))
    );
  }

  const cmd = generateCTagsCmd(wsPath, exclusions);
  console.log("Running '" + cmd + "'");
  // 10MB Buffer
  cp.exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
    // TODO: Add Logging
    if (err) return console.error(err);

    const ctagsUnfiltered: CTagJson[] = JSON.parse(
      `[${stdout.trim().split("\n").join(",")}]`
    );

    const ctags = ctagsUnfiltered.filter(
      ({ name }) => !EXCLUDE_SYMBOLS.includes(name.toLocaleLowerCase())
    );
    const cTagNames = ctags.map(({ name }) => name.toLocaleLowerCase());

    const quickPick = vscWindow.createQuickPick<CTagLine>();
    quickPick.title = "Search for a Symbol or File";

    quickPick.items = ctags.map(({ name, line, path: ctagPath, kind }) => {
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
          JSON.stringify(ctags.filter(({ path: p }) => p == path))
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
  });
};
