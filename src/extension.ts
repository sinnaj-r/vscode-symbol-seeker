// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { commands, workspace, ExtensionContext } from "vscode";
import { searchCmd } from "./commands/searchCommand";

export function activate(context: ExtensionContext) {
  console.log(
    'Congratulations, your extension "symbol-seeker" is now active! In Workspace: ' +
      workspace?.workspaceFolders?.[0].uri.path
  );

  const registeredSearchCmd = commands.registerCommand(
    "symbol-seeker.search",
    searchCmd
  );

  context.subscriptions.push(registeredSearchCmd);
}

// this method is called when your extension is deactivated
export function deactivate() {}
