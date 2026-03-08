#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const detect_js_1 = require("./detect.js");
const fileDialog_js_1 = require("./fileDialog.js");
const index_js_1 = require("./obfuscators/index.js");
const options_js_1 = require("./options.js");
const ensureDependency_js_1 = require("./ensureDependency.js");
const secureCommand_js_1 = require("./secureCommand.js");
function printUsage() {
    const exts = (0, detect_js_1.getSupportedExtensions)().join(", ");
    console.log(`
Usage: obfuscate [inputFile ...] [options]

  Input file path(s). Language is auto-detected by extension (${exts}) or shebang.
  Multiple files: process each to its own output, or (Rust/C/C++ only) compile together into one binary.

Options:
  -o, --out <path>    Output file. Default: <input>-secured.<ext>
  --lang <lang>       Force language: javascript, typescript, python, rust, c, csharp, cpp (overrides detection)
  --no-rename         Disable variable/function renaming
  --no-encode-strings Disable string encoding
  -h, --help          Show this help
`);
}
function parseArgs(argv) {
    const args = argv.slice(2);
    const inputPaths = [];
    let outPath = null;
    let lang = null;
    const options = { ...options_js_1.DEFAULT_OPTIONS };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === "-h" || arg === "--help") {
            printUsage();
            process.exit(0);
        }
        if (arg === "-o" || arg === "--out") {
            outPath = args[++i] ?? null;
            continue;
        }
        if (arg === "--lang") {
            lang = args[++i] ?? null;
            continue;
        }
        if (arg === "--no-rename") {
            options.rename = false;
            continue;
        }
        if (arg === "--no-encode-strings") {
            options.encodeStrings = false;
            continue;
        }
        if (!arg.startsWith("-")) {
            inputPaths.push(arg);
        }
    }
    return { inputPaths, outPath, lang, options };
}
const COMPILED_LANGS = ["rust", "c", "cpp"];
async function main() {
    let { inputPaths, outPath, lang: langOverride, options } = parseArgs(process.argv);
    if (langOverride !== null && langOverride !== undefined) {
        const normalized = langOverride.toLowerCase();
        if (!detect_js_1.SUPPORTED_LANGS.includes(normalized)) {
            console.error(`Error: invalid --lang "${langOverride}".`);
            console.error(`Valid values: ${detect_js_1.SUPPORTED_LANGS.join(", ")}`);
            process.exit(1);
        }
    }
    if (inputPaths.length === 0) {
        console.error("Opening file selection...");
        const selected = await (0, fileDialog_js_1.openFileDialog)();
        if (!selected || selected.length === 0) {
            console.error("No file selected.");
            process.exit(1);
        }
        inputPaths = selected;
    }
    const resolvedPaths = inputPaths.map((p) => (0, node_path_1.resolve)(p));
    for (const p of resolvedPaths) {
        if (!(0, node_fs_1.existsSync)(p)) {
            console.error(`Error: file not found: ${p}`);
            process.exit(1);
        }
    }
    const langs = resolvedPaths.map((p) => langOverride ? langOverride.toLowerCase() : (0, detect_js_1.detectLanguage)(p));
    for (let i = 0; i < resolvedPaths.length; i++) {
        if (!langs[i]) {
            console.error(`Error: could not detect language for ${resolvedPaths[i]}. Use --lang or use a supported extension.`);
            process.exit(1);
        }
    }
    const binaryExt = process.platform === "win32" ? ".exe" : "";
    // Multiple files, all same compiled lang (rust/c/cpp) → compile together into one binary
    if (resolvedPaths.length > 1 &&
        langs[0] &&
        COMPILED_LANGS.includes(langs[0]) &&
        langs.every((l) => l === langs[0])) {
        const lang = langs[0];
        const firstBase = (0, node_path_1.basename)(resolvedPaths[0], (0, node_path_1.extname)(resolvedPaths[0])) + "-secured";
        const outFileName = firstBase + binaryExt;
        const outResolved = outPath ? (0, node_path_1.resolve)(outPath) : (0, node_path_1.resolve)((0, node_path_1.dirname)(resolvedPaths[0]), outFileName);
        try {
            await (0, ensureDependency_js_1.ensureDependency)(lang);
            (0, secureCommand_js_1.runSecureCommand)(resolvedPaths, outResolved, lang);
            console.error(`Secured output: ${outResolved}`);
        }
        catch (err) {
            console.error("Failed:", err instanceof Error ? err.message : err);
            process.exit(1);
        }
        return;
    }
    // Single file, or multiple files (processed separately; -o only for single file)
    let failed = false;
    for (let i = 0; i < resolvedPaths.length; i++) {
        const resolved = resolvedPaths[i];
        const lang = langs[i];
        const baseSecured = (0, node_path_1.basename)(resolved, (0, node_path_1.extname)(resolved)) + "-secured";
        const outFileName = ["rust", "c", "cpp", "csharp"].includes(lang) ? baseSecured + binaryExt : baseSecured + (0, node_path_1.extname)(resolved);
        const outResolved = resolvedPaths.length === 1 && outPath !== null ? (0, node_path_1.resolve)(outPath) : (0, node_path_1.resolve)((0, node_path_1.dirname)(resolved), outFileName);
        try {
            if (lang === "javascript" || lang === "typescript") {
                const source = (0, node_fs_1.readFileSync)(resolved, "utf-8");
                const result = (0, index_js_1.obfuscate)(source, lang, options);
                (0, node_fs_1.writeFileSync)(outResolved, result, "utf-8");
                console.error(`Wrote ${result.length} chars to ${outResolved}`);
            }
            else {
                await (0, ensureDependency_js_1.ensureDependency)(lang);
                (0, secureCommand_js_1.runSecureCommand)(resolved, outResolved, lang);
                console.error(`Secured output: ${outResolved}`);
            }
        }
        catch (err) {
            console.error(`Failed (${resolved}):`, err instanceof Error ? err.message : err);
            failed = true;
        }
    }
    if (failed)
        process.exit(1);
}
main().catch((e) => {
    console.error("Failed:", e instanceof Error ? e.message : e);
    process.exit(1);
});
