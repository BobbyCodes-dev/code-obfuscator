/**
 * Open the system file picker with multi-select. Resolves with selected file path(s), or null if cancelled.
 * Supports Windows (PowerShell + .NET), macOS (osascript), Linux (zenity or kdialog).
 */
export declare function openFileDialog(): Promise<string[] | null>;
