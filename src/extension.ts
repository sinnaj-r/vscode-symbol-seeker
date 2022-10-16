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
import { getWsPaths } from "./helpers";

let watcher: FileSystemWatcher;

export function activate(context: ExtensionContext) {
  console.log(
    'The extension "symbol-seeker" is now active! In Workspace Folders: ' +
      getWsPaths()
  );

  setExtensionPath(context.extensionPath);
  createCacheManager(context.workspaceState);

  console.log("Init run with status " + cacheManagerInstance?.status);

  if (cacheManagerInstance?.status == Status.notInitialized)
    cacheManagerInstance!.tryInitializeCache();

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
    else cacheManagerInstance?.initializeCacheForFile(uri.fsPath);
  });
  watcher.onDidCreate((uri) => {
    if (uri.fsPath.endsWith(".gitignore"))
      cacheManagerInstance?.updateExclusions();
    else cacheManagerInstance?.initializeCacheForFile(uri.fsPath);
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
  console.log(
    'The extension "symbol-seeker" is now INactive! In Workspace Folders: ' +
      getWsPaths()
  );
  // Disable Watcher
  watcher?.dispose();
}
