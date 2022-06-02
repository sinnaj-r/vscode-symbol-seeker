let extensionPath: string | undefined;

export const setExtensionPath = (path: string) => (extensionPath = path);
export const getExtensionPath = () => extensionPath;
