import { existsSync, readFileSync } from "fs";
import { Memento, workspace } from "vscode";
import { getWsPaths, groupBy, tagIsPrivateConstant } from "../helpers";
import { getFileExclusions, getSymbolExclusions } from "../settings";
import * as cp from "child_process";
import { CTagJson } from "../types";
import { generateCTagsCmd, runCTagsCmd } from "./generateCTagsCmd";
import { generateExclusions } from "./generateExclusions";

export type FileTagsRecord = Record<string, CTagJson[]>;
export type CacheType = Record<string, CTagJson[] | undefined>;

export enum Status {
  notInitialized,
  initializing,
  initialized,
}
/**
 * This class manges the cache for the found CTags.
 */
export class CacheManager {
  workspaceState: Memento;
  exclusions: string[];
  status: Status;

  constructor(workspaceState: Memento) {
    this.workspaceState = workspaceState;
    this.exclusions = generateExclusions();
    this.status = Status.notInitialized;
  }

  /**
   * Updates a specific key in the cache
   * @param key
   * @param value
   */
  private async update(key: string, value: CTagJson[] | undefined) {
    const original = this.workspaceState.get<CacheType>("cache") ?? {};
    original[key] = value;
    await this.updateCache(original);
    //await this.workspaceState.update(key, value);
  }

  /**
   * Sets a specific CTag Array in the cache
   * @param key
   * @param value
   */
  async set(key: string, value: CTagJson[]) {
    await this.update(key, value);
  }

  /**
   * Updates the whole cache object
   * @param cache
   */
  private async updateCache(cache: CacheType) {
    await this.workspaceState.update("cache", cache);
  }

  /**
   * Clears the value for a specific key
   * @param key
   */
  async clear(key: string) {
    await this.update(key, undefined);
  }

  /**
   * Clears the whole Cache
   */
  async clearCache() {
    await this.workspaceState.update("cache", undefined);
  }

  /**
   * Gets the cache value for a specific key
   *
   * @unused
   * @param key
   * @returns
   */
  get(key: string): CTagJson[] {
    return this.getCache()[key] ?? [];
  }

  /**
   * Returns the whole Cache Object
   * @returns
   */
  getCache() {
    return this.workspaceState.get<CacheType>("cache") ?? {};
  }

  /**
   * Returns all Paths in the Cache
   * @returns
   */
  getAllPaths() {
    return Object.keys(this.getCache());
  }

  /**
   * Returns a List of all CTags in the Cache
   * @returns
   */
  getAllTags(): CTagJson[] {
    return Object.values(this.getCache())
      .filter<CTagJson[]>((i): i is CTagJson[] => !!i)
      .flat();
  }

  /**
   * Updates the exclusions for this cache instance
   */
  updateExclusions() {
    this.exclusions = generateExclusions();
  }

  /**
   * Initializes the cache (async) if it's not already initializing
   * @returns
   */
  tryInitializeCache() {
    if (this.status === Status.initializing) return;

    this.status = Status.initializing;

    this.initializeCache(true);
  }

  /**
   * Initializes the cache for all files in the current ws
   * @param ignoreStatus
   * @returns
   */
  async initializeCache(ignoreStatus = false) {
    if (!ignoreStatus && this.status === Status.initializing) return;

    if (!ignoreStatus) this.status = Status.initializing;

    console.time("Initialized Symbol Cache in");

    await this.clearCache();

    const cTags = await this.execCTagsForAllFiles();
    this.updateCache(cTags);

    console.timeEnd("Initialized Symbol Cache in");
    console.log(
      `Initialized Cache for ${Object.keys(cTags).length} paths with ${
        Object.values(cTags).flat().length
      } tags`
    );
    this.status = Status.initialized;
  }

  /**
   * Re-Init the cache for a specific file
   * @param path
   * @returns
   */
  async initializeCacheForFile(path: string) {
    if (this.status === Status.initializing) return;

    console.log("Updating Cache for " + path);
    const cTags = await this.execCTagsForFile(path);
    await this.set(path, cTags);
  }

  /**
   * Runs a CTag Cmd for all files in the workspace
   * @returns
   */
  private async execCTagsForAllFiles(): Promise<FileTagsRecord> {
    const wsPath = getWsPaths();
    if (!wsPath) return {};

    // ws-path is folder without '/'
    const cTags = await runCTagsCmd(
      wsPath.map((path) => path + "/"),
      this.exclusions
    );

    return groupBy(cTags, ({ path }) => path);
  }

  /**
   * Runs a CTag Cmd for a specific file
   * @param path
   * @returns
   */
  private async execCTagsForFile(path: string) {
    const wsPath = getWsPaths();
    if (!wsPath?.length ?? 0 < 1) return [];

    const cTags = await runCTagsCmd([path], this.exclusions);
    return cTags;
  }
}

/**
 * This is the main CacheManager used in the extension
 */
export let cacheManagerInstance: CacheManager | undefined;
export const createCacheManager = (workspaceState: Memento) => {
  cacheManagerInstance = new CacheManager(workspaceState);
};
