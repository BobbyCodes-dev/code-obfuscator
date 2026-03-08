import type { SupportedLang } from "./detect.js";
/**
 * Run the appropriate external command to secure (obfuscate/compile) file(s).
 * Writes the result to outputPath. For Rust/C/C++, inputPathOrPaths can be multiple source files.
 */
export declare function runSecureCommand(inputPathOrPaths: string | string[], outputPath: string, lang: SupportedLang): void;
