export type SupportedLang = "javascript" | "typescript" | "python" | "rust" | "c" | "csharp" | "cpp";
export declare const SUPPORTED_LANGS: readonly SupportedLang[];
/**
 * Detect language from file path (extension) and optionally first line (shebang).
 */
export declare function detectLanguage(filePath: string, readShebang?: boolean): SupportedLang | null;
export declare function getSupportedExtensions(): string[];
