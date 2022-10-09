import { workspace } from "vscode";
import * as cp from "child_process";
import { CTagJson } from "./types";

export const getWsPath = () => workspace?.workspaceFolders?.[0].uri.path;

export const execCmd = (cmd: string) =>
  new Promise<string>((res, rej) => {
    // 512MB Buffer
    cp.exec(cmd, { maxBuffer: 1024 * 1024 * 512 }, (err, stdout, stderr) => {
      if (err) return rej(err);
      if (stderr) console.warn("Stderr: " + stderr);
      res(stdout);
    });
  });

export const groupBy = <T, K extends keyof any>(arr: T[], key: (i: T) => K) =>
  arr.reduce((groups, item) => {
    (groups[key(item)] ||= []).push(item);
    return groups;
  }, {} as Record<K, T[]>);

export const debounce = <F extends (...args: any[]) => any, R>(
  func: F,
  waitFor: number
) => {
  let timeout: NodeJS.Timeout;

  const debounced = (...args: Parameters<F>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced;
};

/**
 * Is this a constant in a method body ?
 *
 */
export const tagIsPrivateConstant = ({ kind, scopeKind }: CTagJson) =>
  kind == "constant" && scopeKind == "method";
