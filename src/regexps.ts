/**
 * Match the "."-Operator for extension search
 */
export const extensionRegex = /\.[a-zA-Z.]{1,10}/;
/**
 * Match the "/"-Operator for path search
 */
export const pathRegex = /\/([\w/.]+)/;

/**
 * Match the "/"-Operator for fileName search
 */
export const fileNameRegex = /\$([\w.]+)/;
