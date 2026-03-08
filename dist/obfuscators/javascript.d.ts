import type { ObfuscatorOptions } from "../options.js";
/**
 * Obfuscate JavaScript/TypeScript source: rename identifiers, encode strings, minify.
 */
export declare function obfuscateJavaScript(source: string, options: ObfuscatorOptions): string;
