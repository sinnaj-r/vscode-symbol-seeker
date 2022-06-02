import { EXTENSION_PATH } from "../settings";

//TODO dynamically add all '.ctags' files
const BASE_CMD = `/usr/bin/env ctags --recurse --options=${EXTENSION_PATH}/ctags-optlibs/dart.ctags --output-format=json --extras=f --fields=+n`;

export const generateCTagsCmd = (folderOrFile: string, exclusions: string[]) =>
  `${BASE_CMD} ${exclusions
    .map((e) => `--exclude='${e}'`)
    .join(" ")} ${folderOrFile}/`;
