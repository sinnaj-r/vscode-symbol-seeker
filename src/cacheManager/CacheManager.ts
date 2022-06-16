import { existsSync, readFileSync } from "fs";
import { Memento, workspace } from "vscode";
import { execCmd, getWsPath, groupBy, tagIsPrivateConstant } from "../helpers";
import { getFileExclusions, getSymbolExclusions } from "../settings";
import * as cp from "child_process";
import { CTagJson } from "../types";
import { generateCTagsCmd } from "./generateCTagsCmd";

export type FileTagsRecord = Record<string, CTagJson[]>;
export type CacheType = Record<string, CTagJson[] | undefined>;

export enum Status {
  NotInitialized,
  Initializing,
  Initialized,
}

export class CacheManager {
  workspaceState: Memento;
  exclusions: string[];
  status: Status;

  constructor(workspaceState: Memento) {
    this.workspaceState = workspaceState;
    this.exclusions = this.getExclusions();
    this.status = Status.NotInitialized;
  }

  private async update(key: string, value: CTagJson[] | undefined) {
    const original = this.workspaceState.get<CacheType>("cache") ?? {};
    original[key] = value;
    await this.workspaceState.update("cache", original);
    //await this.workspaceState.update(key, value);
  }

  async set(key: string, value: CTagJson[]) {
    await this.update(key, value);
  }

  async updateCache(cache: CacheType) {
    await this.workspaceState.update("cache", cache);
  }

  async clear(key: string) {
    await this.update(key, undefined);
  }

  async clearCache() {
    await this.workspaceState.update("cache", undefined);
  }

  // unused, remove ?
  get(key: string): CTagJson[] {
    return this.getCache()[key] ?? [];
  }

  getCache() {
    return this.workspaceState.get<CacheType>("cache") ?? {};
  }
  getAllPaths() {
    return Object.keys(this.getCache());
  }

  getAllTags(): CTagJson[] {
    return Object.values(this.getCache())
      .filter<CTagJson[]>((i): i is CTagJson[] => !!i)
      .flat();
  }

  tryInitializeCache() {
    if (this.status == Status.Initializing) return;
    this.status = Status.Initializing;

    this.initializeCache(true);
  }

  async initializeCache(ignoreStatus = false) {
    if (!ignoreStatus && this.status == Status.Initializing) return;

    if (!ignoreStatus) this.status = Status.Initializing;

    console.time("Initialized Symbol Cache in");

    await this.clearCache();

    const ctags = await this.loadTagsForAllFiles();
    this.updateCache(ctags);

    console.timeEnd("Initialized Symbol Cache in");
    console.log(
      `Initialized Cache for ${Object.keys(ctags).length} paths with ${
        Object.values(ctags).flat().length
      } tags`
    );
    this.status = Status.Initialized;
  }

  updateExclusions() {
    this.exclusions = this.getExclusions();
  }

  async updateCacheForFile(path: string) {
    if (this.status == Status.Initializing) return;
    console.log("Updating Cache for " + path);
    const cTags = await this.loadTagsForFile(path);
    await this.set(path, cTags);
  }

  private getExclusions(): string[] {
    const wsPath = getWsPath();
    if (!wsPath) return [];
    const exclusions = [...getFileExclusions()];
    if (existsSync(`${wsPath}/.gitignore`)) {
      const data = readFileSync(`${wsPath}/.gitignore`, "utf8");
      exclusions.push(
        ...data
          .trim()
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => !!line)
          // Exclude Comments and Globs
          .filter(
            (line) =>
              !line.startsWith("#") &&
              !line.includes("**") &&
              !line.includes("~") &&
              !line.includes("?")
          )
          .filter((line) => !line.startsWith("#"))
      );
    }
    return exclusions;
  }

  private async runCTagsCmd(path: string) {
    const cmd = generateCTagsCmd(path, this.exclusions);

    console.time("Executed ctags cmd in");
    const result = await execCmd(cmd);
    console.timeEnd("Executed ctags cmd in");

    const cTagsUnfiltered: CTagJson[] = JSON.parse(
      `[${result.trim().split("\n").join(",")}]`
    );
    const symbolExclusions = getSymbolExclusions();

    const cTags = cTagsUnfiltered.filter(
      (tag) =>
        !symbolExclusions.includes(tag.name.toLocaleLowerCase()) &&
        // We want to ignore constants in method bodies,
        // as they are most likely just a "temporary" variable
        // e.g. in TypeScript this is very usual
        !tagIsPrivateConstant(tag)
    );

    return cTags;
  }

  private async loadTagsForAllFiles(): Promise<FileTagsRecord> {
    const wsPath = getWsPath();
    if (!wsPath) return {};

    // ws-path is folder without '/'
    const cTags = await this.runCTagsCmd(wsPath + "/");

    return groupBy(cTags, ({ path }) => path);
  }

  private async loadTagsForFile(path: string) {
    const wsPath = getWsPath();
    if (!wsPath) return [];

    const cTags = await this.runCTagsCmd(path);
    return cTags;
  }
}

export let cacheManagerInstance: CacheManager | undefined;
export const createCacheManager = (workspaceState: Memento) => {
  cacheManagerInstance = new CacheManager(workspaceState);
};
