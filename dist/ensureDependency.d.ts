import type { SupportedLang } from "./detect.js";
export interface DependencyInfo {
    name: string;
    checkCmd: string;
    checkArgs: string[];
    installPrompt: string;
    installCmd: string;
    /** Windows: Chocolatey command when winget is not available */
    installCmdChoco?: string;
}
/**
 * Ensure the tool required for the given language is available.
 * If missing, prompt the user and optionally run the install command.
 */
export declare function ensureDependency(lang: SupportedLang): Promise<void>;
