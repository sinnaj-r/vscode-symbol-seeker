// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
  commands,
  workspace,
  ExtensionContext,
  FileSystemWatcher,
} from "vscode";
import {
  CacheManager,
  cacheManagerInstance,
  createCacheManager,
  Status,
} from "./cacheManager/CacheManager";
import { forceRefreshCmd } from "./commands/forceRefreshCmd";
import { searchCmd } from "./commands/searchCmd";
import { setExtensionPath } from "./ExtensionPath";

let watcher: FileSystemWatcher;

export function activate(context: ExtensionContext) {
  console.log(
    'The extension "symbol-seeker" is now active! In Workspace: ' +
      workspace?.workspaceFolders?.[0].uri.path
  );

  setExtensionPath(context.extensionPath);

  createCacheManager(context.workspaceState);

  if (cacheManagerInstance?.status == Status.NotInitialized)
    cacheManagerInstance!.initializeCache();

  const registeredSearchCmd = commands.registerCommand(
    "symbol-seeker.search",
    searchCmd
  );

  const registeredForceRefreshCmd = commands.registerCommand(
    "symbol-seeker.force-refresh",
    forceRefreshCmd
  );

  // TODO: Somehow watch out for the exclusions here to reduce overhead
  watcher = workspace.createFileSystemWatcher("**/*");
  watcher.onDidChange((uri) => {
    if (uri.fsPath.endsWith(".gitignore"))
      cacheManagerInstance?.updateExclusions();
    else cacheManagerInstance?.updateCacheForFile(uri.fsPath);
  });
  watcher.onDidCreate((uri) => {
    if (uri.fsPath.endsWith(".gitignore"))
      cacheManagerInstance?.updateExclusions();
    else cacheManagerInstance?.updateCacheForFile(uri.fsPath);
  });
  watcher.onDidDelete((uri) => {
    if (uri.fsPath.endsWith(".gitignore"))
      cacheManagerInstance?.updateExclusions();
    else cacheManagerInstance?.clear(uri.fsPath);
  });

  context.subscriptions.push(registeredSearchCmd);
  context.subscriptions.push(registeredForceRefreshCmd);
}

// this method is called when your extension is deactivated
export function deactivate() {
  // Disable Watcher
  watcher?.dispose();
}
