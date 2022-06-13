import { existsSync, readFileSync } from "fs";
import { Memento, workspace } from "vscode";
import { execCmd, getWsPath, groupBy, tagIsPrivateConstant } from "../helpers";
import { DEFAULT_EXCLUSIONS, EXCLUDE_SYMBOLS } from "../settings";
import * as cp from "child_process";
import { CTagJson } from "../types";
import { generateCTagsCmd } from "./generateCTagsCmd";

export type FileTagsRecord = Record<string, CTagJson[]>;

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

  async set(key: string, value: CTagJson[]) {
    await this.workspaceState.update(key, value);
  }

  async clear(key: string) {
    await this.workspaceState.update(key, undefined);
  }

  get(key: string): CTagJson[] {
    return this.workspaceState.get<CTagJson[]>(key) ?? [];
  }
  getAllPaths() {
    return this.workspaceState.keys();
  }

  getAllTags(): CTagJson[] {
    const paths = this.getAllPaths();
    return paths.flatMap((path) => this.get(path));
  }

  tryInitializeCache() {
    if (this.status == Status.Initializing) return;
    this.status = Status.Initializing;

    this.initializeCache(true);
  }

  async initializeCache(ignoreStatus = false) {
    if (!ignoreStatus && this.status == Status.Initializing) return;

    if (!ignoreStatus) this.status = Status.Initializing;

    console.time("initializeCache");

    console.time("getAllPaths");
    const paths = this.getAllPaths();
    console.timeEnd("getAllPaths");
    console.time("clear paths");
    for (const path of paths) await this.clear(path);
    console.timeEnd("clear paths");

    console.time("loadTagsForAllFiles");
    const ctags = await this.loadTagsForAllFiles();
    for (const [path, tags] of Object.entries(ctags))
      await this.set(path, tags);
    console.timeEnd("loadTagsForAllFiles");

    console.timeEnd("initializeCache");
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
    const exclusions = [...DEFAULT_EXCLUSIONS];
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

    console.time("Execute ctags cmd");
    const result = await execCmd(cmd);
    console.timeEnd("Execute ctags cmd");

    const cTagsUnfiltered: CTagJson[] = JSON.parse(
      `[${result.trim().split("\n").join(",")}]`
    );

    const cTags = cTagsUnfiltered.filter(
      (tag) =>
        !EXCLUDE_SYMBOLS.includes(tag.name.toLocaleLowerCase()) &&
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

    const cTags = await this.runCTagsCmd(wsPath);

    return groupBy(cTags, ({ path }) => path);
  }

  private async loadTagsForFile(path: string) {
    const wsPath = getWsPath();
    if (!wsPath) return [];

    const cTags = await this.runCTagsCmd(wsPath);
    return cTags;
  }
}

export let cacheManagerInstance: CacheManager | undefined;
export const createCacheManager = (workspaceState: Memento) => {
  cacheManagerInstance = new CacheManager(workspaceState);
};
