import { workspace } from "vscode";
import * as cp from "child_process";

export const getWsPath = () => workspace?.workspaceFolders?.[0].uri.path;

export const execCmd = (cmd: string) =>
  new Promise<string>((res, rej) => {
    cp.exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
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
