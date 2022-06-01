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
import { glob } from "glob";

const wsPath = workspace?.workspaceFolders?.[0].uri.path;

const readGitIgnore = (path: string, exclusions: string[]) => {
  const data = fs.readFileSync(path, "utf8");
  let prefixPath = path.replace(wsPath!, "").replace("/.gitignore", "");
  if (prefixPath) prefixPath = prefixPath + "/";
  exclusions.push(
    ...data
      .trim()
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => !!line)
      // Exclude Comments and Globs and exclusions
      .filter(
        (line) =>
          !line.startsWith("#") && !line.includes("**") && !line.startsWith("!")
      )
      // Exclude line if it exists in root
      .filter((line) => !exclusions.includes(line))
      // Use only local path for cmd so it doesn't grow to large
      .map((line) => prefixPath + line)
  );
};

export const searchCmd = async () => {
  if (!wsPath) return;

  const exclusions = [...DEFAULT_EXCLUSIONS];

  const gitignores = glob
    .sync(`${wsPath}/**/.gitignore`)
    .filter((path) => DEFAULT_EXCLUSIONS.every((ex) => !path.includes(ex)));
  for (const gitIgnorePath of gitignores) {
    readGitIgnore(gitIgnorePath, exclusions);
  }

  const cmd = generateCTagsCmd(wsPath, [...new Set(exclusions)]);
  console.log("Running '" + cmd + "'");
  // 10MB Buffer
  cp.exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
    // TODO: Add Logging
    if (err) return;

    const ctagsUnfiltered: CTagJson[] = JSON.parse(
      `[${stdout.trim().split("\n").join(",")}]`
    );

    const ctags = ctagsUnfiltered.filter(
      ({ name }) => !EXCLUDE_SYMBOLS.includes(name.toLocaleLowerCase())
    );
    const cTagNames = ctags.map(({ name }) => name.toLocaleLowerCase());

    const quickPick = vscWindow.createQuickPick<CTagLine>();
    quickPick.title = "Search for a Symbol or File";

    quickPick.items = ctags.map((ctag) => {
      // Does a symbol with the same name exists ?
      // -> Add additional context for the user
      const isDuplicate = cTagNames.includes(ctag.name.toLocaleLowerCase());

      return {
        label: `$(${ICON_MAPPING[ctag.kind] ?? ""}) ${ctag.name} ${
          isDuplicate ? `(${path.extname(ctag.path)})` : ""
        }`,
        description:
          ctag.path.replace(wsPath, "") + (isDuplicate ? `:${ctag.line}` : ""),
        line: ctag.line,
        path: ctag.path,
      };
    });

    quickPick.onDidAccept(async () => {
      const { line, path } = quickPick.activeItems[0];
      const uri = Uri.file(path);
      await vscWindow.showTextDocument(uri, {});
      if (!vscWindow.activeTextEditor) return;

      // It seems,that the Position is offset by 1
      const position = new Position(line - 1, 0);
      var range = new Range(position, position);

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
