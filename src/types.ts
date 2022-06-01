import { QuickPickItem } from "vscode";

export type CTagJson = {
  _type: "tag";
  name: string;
  path: string;
  pattern: string;
  line: number;
  kind:
    | "alias"
    | "constant"
    | "function"
    | "interface"
    | "method"
    | "namespace"
    | "property"
    | "file";
  scope: string | null;
  scopeKind: "function" | "interface" | "namespace" | null;
};

export interface CTagLine extends QuickPickItem {
  line: number;
  path: string;
}