import { getExtensionPath } from "../ExtensionPath";

export const generateCTagsCmd = (
  folderOrFile: string,
  exclusions: string[]
) => {
  //TODO dynamically add all '.ctags' files

  const baseCmd = `/usr/bin/env ctags --recurse --options=${getExtensionPath()}/ctags-optlibs/dart.ctags --output-format=json --extras=f --fields=+n`;

  return `${baseCmd} ${exclusions
    .map((e) => `--exclude='${e}'`)
    .join(" ")} ${folderOrFile}/`;
};
