// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as cp from "child_process";
import * as fs from "fs";

const DEFAULT_EXCLUSIONS = ["*.json", "*.min.*", "*.css", "*.scss"];

const CMD = (folder: string, exclusions: string[]) =>
  `/opt/homebrew/bin/ctags --recurse --output-format=json --fields=+n ${exclusions
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
    | "property";
  scope: string | null;
  scopeKind: "function" | "interface" | "namespace" | null;
};

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "symbol-seeker" is now active! In: ' +
      vscode.workspace?.workspaceFolders?.[0].uri.path
  );

  const helloWorldCmd = vscode.commands.registerCommand(
    "symbol-seeker.helloWorld",
    async () => {
      const path = vscode.workspace?.workspaceFolders?.[0].uri.path;
      if (!path) {
        return;
      }
      const exclusions = [...DEFAULT_EXCLUSIONS];
      if (fs.existsSync(`${path}/.gitignore`)) {
        const data = fs.readFileSync(`${path}/.gitignore`, "utf8");
        exclusions.push(
          ...data
            .trim()
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => !!line)
            .filter((line) => !line.startsWith("#"))
        );
      }

      const cmd = CMD(path, exclusions);
      console.log("Running '" + cmd + "'");
      // 10MB Buffer
      cp.exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
        console.log("stdout: " + stdout);
        console.log("stderr: " + stderr);
        const ctags: CTagJson[] = JSON.parse(
          `[${stdout.trim().split("\n").join(",")}]`
        );
        const quickPick = vscode.window.createQuickPick();
        quickPick.items = ctags.map((ctag) => ({
          label: ctag.name,
          description: ctag.path.replace(path, ""),
        }));

        quickPick.title = "Choose your favorite value:";

        // quickPick.onDidChangeValue(() => {
        //   // INJECT user values into proposed values
        //   if (!choices.includes(quickPick.value)) {
        //     quickPick.items = [quickPick.value, ...choices].map((label) => ({
        //       label,
        //     }));
        //   }
        // });

        quickPick.onDidAccept(() => {
          const selection = quickPick.activeItems[0];
          vscode.window.showInformationMessage(`Got: ${selection.label}`);

          quickPick.hide();
        });
        quickPick.show();
      });
    }
  );

  const generateTagsCmd = vscode.commands.registerCommand(
    "symbol-seeker.generateTags",
    () => {
      // Todo run ctags
    }
  );

  context.subscriptions.push(helloWorldCmd);
  context.subscriptions.push(generateTagsCmd);
}

// this method is called when your extension is deactivated
export function deactivate() {}
