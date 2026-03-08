"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openFileDialog = openFileDialog;
const node_child_process_1 = require("node:child_process");
const node_os_1 = require("node:os");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const detect_js_1 = require("./detect.js");
const SUPPORTED_EXTENSIONS = (0, detect_js_1.getSupportedExtensions)();
const FILTER_EXTENSIONS_LINUX = SUPPORTED_EXTENSIONS.map((e) => `*${e}`).join(" ");
/**
 * Open the system file picker with multi-select. Resolves with selected file path(s), or null if cancelled.
 * Supports Windows (PowerShell + .NET), macOS (osascript), Linux (zenity or kdialog).
 */
function openFileDialog() {
    const platform = process.platform;
    if (platform === "win32")
        return openFileDialogWin32();
    if (platform === "darwin")
        return openFileDialogDarwin();
    return openFileDialogLinux();
}
function parsePaths(stdout) {
    if (!stdout || !stdout.trim())
        return [];
    return stdout
        .trim()
        .split(/\r?\n/)
        .map((p) => p.trim())
        .filter(Boolean);
}
function openFileDialogWin32() {
    const filterPart = SUPPORTED_EXTENSIONS.map((e) => `*${e}`).join(";");
    const filter = `Supported files (${filterPart})|${filterPart}|All files (*.*)|*.*`;
    const script = `
Add-Type -AssemblyName System.Windows.Forms
$d = New-Object System.Windows.Forms.OpenFileDialog
$d.Filter = "${filter.replace(/"/g, '`"')}"
$d.Title = "Select file(s) to secure"
$d.Multiselect = $true
if ($d.ShowDialog() -eq 'OK') { $d.FileNames | ForEach-Object { Write-Output $_ } }
`.trim();
    const tmpPath = (0, node_path_1.join)((0, node_os_1.tmpdir)(), `obfuscator-picker-${Date.now()}.ps1`);
    (0, node_fs_1.writeFileSync)(tmpPath, script, "utf-8");
    return new Promise((resolve) => {
        (0, node_child_process_1.execFile)("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", tmpPath], { windowsHide: true }, (err, stdout) => {
            try {
                if ((0, node_fs_1.existsSync)(tmpPath))
                    (0, node_fs_1.unlinkSync)(tmpPath);
            }
            catch { }
            if (err) {
                resolve(null);
                return;
            }
            const paths = parsePaths(stdout);
            resolve(paths.length > 0 ? paths : null);
        });
    });
}
function openFileDialogDarwin() {
    const script = 'choose file with prompt "Select file(s) to secure" with multiple selections allowed';
    return new Promise((resolve) => {
        (0, node_child_process_1.execFile)("osascript", ["-e", script], (err, stdout) => {
            if (err) {
                resolve(null);
                return;
            }
            const paths = parsePaths(stdout);
            resolve(paths.length > 0 ? paths : null);
        });
    });
}
function openFileDialogLinux() {
    const run = (cmd, args) => new Promise((resolve) => {
        (0, node_child_process_1.execFile)(cmd, args, (err, stdout) => {
            if (err) {
                resolve(null);
                return;
            }
            const paths = parsePaths(stdout);
            resolve(paths.length > 0 ? paths : null);
        });
    });
    return run("zenity", [
        "--file-selection",
        "--title=Select file(s) to secure",
        "--multiple",
        "--separator=\n",
        `--file-filter=Supported | ${FILTER_EXTENSIONS_LINUX}`,
        "--file-filter=All files | *",
    ]).then((paths) => (paths !== null ? paths : run("kdialog", ["--getopenfilename", ".", `Supported (${FILTER_EXTENSIONS_LINUX})`, "--multiple", "--separate-output"])));
}
