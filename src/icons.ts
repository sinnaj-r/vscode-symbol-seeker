import { CTagJson } from "./types";

export const ICON_MAPPING: Record<CTagJson["kind"], string> = {
  function: "symbol-package",
  constant: "symbol-constant",
  variable: "symbol-variable",
  method: "symbol-package",
  alias: "symbol-constant",
  interface: "symbol-interface",
  namespace: "symbol-namespace",
  property: "symbol-property",
  file: "symbol-file",
  class: "symbol-class",
  enum: "symbol-enum",
  enumerator: "symbol-enum-member",
  id: "key",
};
