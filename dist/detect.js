"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORTED_LANGS = void 0;
exports.detectLanguage = detectLanguage;
exports.getSupportedExtensions = getSupportedExtensions;
const node_fs_1 = require("node:fs");
exports.SUPPORTED_LANGS = [
    "javascript",
    "typescript",
    "python",
    "rust",
    "c",
    "csharp",
    "cpp",
];
const EXT_MAP = {
    ".js": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".ts": "typescript",
    ".mts": "typescript",
    ".cts": "typescript",
    ".py": "python",
    ".rs": "rust",
    ".c": "c",
    ".h": "c",
    ".cs": "csharp",
    ".cpp": "cpp",
    ".cxx": "cpp",
    ".cc": "cpp",
    ".hpp": "cpp",
    ".hxx": "cpp",
};
const SHEBANG_MAP = {
    "node": "javascript",
    "python": "python",
    "python3": "python",
    "python2": "python",
};
/**
 * Detect language from file path (extension) and optionally first line (shebang).
 */
function detectLanguage(filePath, readShebang = true) {
    const dotIdx = filePath.lastIndexOf(".");
    if (dotIdx > 0) {
        const ext = filePath.slice(dotIdx).toLowerCase();
        const byExt = EXT_MAP[ext];
        if (byExt)
            return byExt;
    }
    if (!readShebang)
        return null;
    try {
        const content = (0, node_fs_1.readFileSync)(filePath, "utf-8");
        const firstLine = content.split("\n")[0].trim();
        const match = firstLine.match(/^#!\s*(?:\/usr\/bin\/env\s+)?(\w+)/);
        if (match) {
            const interpreter = match[1].toLowerCase();
            return SHEBANG_MAP[interpreter] ?? null;
        }
    }
    catch {
        // ignore read errors
    }
    return null;
}
function getSupportedExtensions() {
    return Object.keys(EXT_MAP);
}
