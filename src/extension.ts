// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";

const DEFAULT_EXCLUSIONS = [
  "*.json",
  "*.min.*",
  "*.css",
  "*.scss",
  "*.md",
  "*.yml",
];

const CMD = (folder: string, exclusions: string[]) =>
  `/opt/homebrew/bin/ctags --recurse --output-format=json --extras=f --fields=+n ${exclusions
    .map((e) => `--exclude='${e}'`)
    .join(" ")} ${folder}/`;

type CTagJson = {
  _type: "tag";
  name: string;
  path: string;
  pattern: string;
  line: number;
  kind:
    | "alias"
    | "constant"
    | "function"
    | "interface"
    | "method"
    | "namespace"
    | "property"
    | "file";
  scope: string | null;
  scopeKind: "function" | "interface" | "namespace" | null;
};

const ICON_MAPPING: Record<CTagJson["kind"], string> = {
  function: "symbol-package",
  constant: "symbol-constant",
  method: "symbol-package",
  alias: "symbol-constant",
  interface: "symbol-interface",
  namespace: "symbol-namespace",
  property: "symbol-property",
  file: "symbol-file",
};

interface CTagLine extends vscode.QuickPickItem {
  line: number;
  path: string;
}

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "symbol-seeker" is now active! In: ' +
      vscode.workspace?.workspaceFolders?.[0].uri.path
  );

  const helloWorldCmd = vscode.commands.registerCommand(
    "symbol-seeker.helloWorld",
    async () => {
      const wsPath = vscode.workspace?.workspaceFolders?.[0].uri.path;
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
            .filter((line) => !line.startsWith("#"))
        );
      }

      const cmd = CMD(wsPath, exclusions);
      console.log("Running '" + cmd + "'");
      // 10MB Buffer
      cp.exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
        console.log("stdout: " + stdout);
        console.log("stderr: " + stderr);
        const ctags: CTagJson[] = JSON.parse(
          `[${stdout.trim().split("\n").join(",")}]`
        );

        const quickPick = vscode.window.createQuickPick<CTagLine>();
        const cTagNames = ctags.map(({ name }) => name.toLocaleLowerCase());

        quickPick.items = ctags.map((ctag) => {
          const isDuplicate = cTagNames.includes(ctag.name.toLocaleLowerCase());
          return {
            label: `$(${ICON_MAPPING[ctag.kind] ?? ""}) ${ctag.name} ${
              isDuplicate ? `(${path.extname(ctag.path)})` : ""
            }`,
            description:
              ctag.path.replace(wsPath, "") +
              (isDuplicate ? `:${ctag.line}` : ""),
            line: ctag.line,
            path: ctag.path,
          };
        });

        quickPick.title = "Search for a Symbol or File";

        // quickPick.onDidChangeValue(() => {
        //   // INJECT user values into proposed values
        //   if (!choices.includes(quickPick.value)) {
        //     quickPick.items = [quickPick.value, ...choices].map((label) => ({
        //       label,
        //     }));
        //   }
        // });

        quickPick.onDidAccept(async () => {
          const { description, line, path } = quickPick.activeItems[0];
          const uri = vscode.Uri.file(path);
          await vscode.window.showTextDocument(uri, {});
          if (!vscode.window.activeTextEditor) return;

          const position = new vscode.Position(line - 1, 0);
          var range = new vscode.Range(position, position);
          console.log("Revealing Line " + line);
          vscode.window.activeTextEditor.revealRange(
            range,
            vscode.TextEditorRevealType.InCenter
          );

          vscode.window.activeTextEditor!.selections = [
            new vscode.Selection(position, position),
          ];

          quickPick.hide();
        });
        quickPick.show();
      });
    }
  );

  context.subscriptions.push(helloWorldCmd);
}

// this method is called when your extension is deactivated
export function deactivate() {}
