import { window } from "vscode";
import { cacheManagerInstance, Status } from "../cacheManager/CacheManager";

export const forceRefreshCmd = async () => {
  await cacheManagerInstance?.initializeCache();
  window.showInformationMessage(`Cache refreshed!`);
};
