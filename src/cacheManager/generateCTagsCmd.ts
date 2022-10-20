import { getExtensionPath } from "../ExtensionPath";
import { tagIsPrivateConstant } from "../helpers";
import { getSymbolExclusions } from "../settings";
import { CTagJson } from "../types";
import * as cp from "child_process";

export const generateCTagsCmd = (
  folderOrFile: string,
  exclusions: string[]
) => {
  //TODO dynamically add all '.cTags' files
  const baseCmd = `/usr/bin/env cTags --recurse --options=${getExtensionPath()}/cTags-optlibs/dart.cTags --output-format=json --extras=f --fields=+n`;

  return `${baseCmd} ${exclusions
    .map((e) => `--exclude='${e}'`)
    .join(" ")} ${folderOrFile}`;
};

/**
 * Generates a CTag Cmd and executes it.
 *
 * It also applies the exclusions for files, symbols & private constants.
 * @param paths
 * @param exclusions
 * @returns
 */
export const runCTagsCmd = async (paths: string[], exclusions: string[]) => {
  const cTagsUnfiltered: CTagJson[] = [];
  for (const path of paths) {
    const cmd = generateCTagsCmd(path, exclusions);

    console.time(`[${path}] Executed cTags cmd in`);
    const result = await execShellCmd(cmd);
    console.timeEnd(`[${path}] Executed cTags cmd in`);

    cTagsUnfiltered.push(
      ...JSON.parse(`[${result.trim().split("\n").join(",")}]`)
    );
  }
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
};

/**
 * Executes a generic shell command and returns the output
 * @param cmd
 * @returns
 */
export const execShellCmd = (cmd: string) =>
  new Promise<string>((res, rej) => {
    // 512MB Buffer
    cp.exec(cmd, { maxBuffer: 1024 * 1024 * 512 }, (err, stdout, stderr) => {
      if (err) return rej(err);
      if (stderr) console.warn("Stderr: " + stderr);
      res(stdout);
    });
  });
