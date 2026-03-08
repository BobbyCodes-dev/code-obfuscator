"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSecureCommand = runSecureCommand;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const envPath_js_1 = require("./envPath.js");
const isWin = process.platform === "win32";
/**
 * Run the appropriate external command to secure (obfuscate/compile) file(s).
 * Writes the result to outputPath. For Rust/C/C++, inputPathOrPaths can be multiple source files.
 */
function runSecureCommand(inputPathOrPaths, outputPath, lang) {
    const paths = Array.isArray(inputPathOrPaths) ? inputPathOrPaths : [inputPathOrPaths];
    const single = paths[0];
    switch (lang) {
        case "python":
            runPythonSecure(single, outputPath);
            break;
        case "rust":
            runRustSecure(paths, outputPath);
            break;
        case "c":
            runCSecure(paths, outputPath);
            break;
        case "cpp":
            runCppSecure(paths, outputPath);
            break;
        case "csharp":
            runCSharpSecure(single, outputPath);
            break;
        default:
            throw new Error(`No secure command for language: ${lang}`);
    }
}
function runPythonSecure(inputPath, outputPath) {
    const outDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "obfuscator-py-"));
    try {
        const r = (0, node_child_process_1.spawnSync)("pyarmor", ["gen", "-O", outDir, inputPath], {
            stdio: "pipe",
            encoding: "utf-8",
        });
        if (r.status !== 0) {
            throw new Error(r.stderr?.trim() || r.error?.message || "pyarmor failed");
        }
        let outFile = (0, node_path_1.join)(outDir, (0, node_path_1.basename)(inputPath));
        if (!(0, node_fs_1.existsSync)(outFile)) {
            const inDist = (0, node_path_1.join)(outDir, "dist", (0, node_path_1.basename)(inputPath));
            if ((0, node_fs_1.existsSync)(inDist))
                outFile = inDist;
        }
        if ((0, node_fs_1.existsSync)(outFile)) {
            const content = (0, node_fs_1.readFileSync)(outFile, "utf-8");
            (0, node_fs_1.writeFileSync)(outputPath, content, "utf-8");
        }
        else {
            throw new Error("PyArmor did not produce output file");
        }
    }
    catch (e) {
        throw new Error("Python: Install PyArmor and run from project dir: pip install pyarmor. " +
            (e instanceof Error ? e.message : String(e)));
    }
    finally {
        try {
            (0, node_fs_1.rmSync)(outDir, { recursive: true });
        }
        catch { }
    }
}
function runRustSecure(inputPaths, outputPath) {
    const env = isWin ? (0, envPath_js_1.getWinEnv)() : process.env;
    const run = () => (0, node_child_process_1.spawnSync)("rustc", [...inputPaths, "-o", outputPath], {
        stdio: "pipe",
        encoding: "utf-8",
        env,
    });
    let r = run();
    if (r.status !== 0 && isWin && (r.stderr?.includes("link.exe") ?? r.error?.message?.includes("link.exe"))) {
        (0, node_child_process_1.spawnSync)("rustup", ["default", "stable-x86_64-pc-windows-gnu"], { stdio: "inherit", encoding: "utf-8", env });
        r = run();
    }
    if (r.status !== 0) {
        const stderr = (typeof r.stderr === "string" ? r.stderr : r.stderr ? String(r.stderr) : "").trim();
        if (stderr)
            console.error(stderr);
        const msg = stderr || (r.error?.message ?? "Rust compile failed.");
        throw new Error(msg.includes("link.exe") ? "Rust needs a linker. Install MSYS2 (for gcc) and run: rustup default stable-x86_64-pc-windows-gnu" : msg);
    }
}
function runCSecure(inputPaths, outputPath) {
    const result = (0, node_child_process_1.spawnSync)("gcc", [...inputPaths, "-o", outputPath, "-O2"], {
        stdio: "inherit",
        encoding: "utf-8",
        env: isWin ? (0, envPath_js_1.getWinEnv)() : process.env,
    });
    if (result.status !== 0) {
        throw new Error("C compile failed. Is gcc installed? (On Windows, install MSYS2 and add its bin to PATH, e.g. C:\\msys64\\ucrt64\\bin)");
    }
}
function runCppSecure(inputPaths, outputPath) {
    const result = (0, node_child_process_1.spawnSync)("g++", [...inputPaths, "-o", outputPath, "-O2"], {
        stdio: "inherit",
        encoding: "utf-8",
        env: isWin ? (0, envPath_js_1.getWinEnv)() : process.env,
    });
    if (result.status !== 0) {
        throw new Error("C++ compile failed. Is g++ installed? (On Windows, install MSYS2 and add its bin to PATH, e.g. C:\\msys64\\ucrt64\\bin)");
    }
}
function runCSharpSecure(inputPath, outputPath) {
    // Try csc (Framework) first, then dotnet
    const cscResult = (0, node_child_process_1.spawnSync)("csc", ["/out:" + outputPath, inputPath], {
        stdio: "inherit",
        encoding: "utf-8",
    });
    if (cscResult.status === 0)
        return;
    // dotnet: create temp project and build single file
    const tmpDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "obfuscator-cs-"));
    const outDir = (0, node_path_1.join)(tmpDir, "out");
    try {
        (0, node_child_process_1.execSync)("dotnet new console -o . -n App --force", { cwd: tmpDir, stdio: "pipe", encoding: "utf-8" });
        (0, node_fs_1.cpSync)(inputPath, (0, node_path_1.join)(tmpDir, "Program.cs"), { force: true });
        try {
            (0, node_child_process_1.execSync)("dotnet publish -c Release -o out", { cwd: tmpDir, stdio: "inherit", encoding: "utf-8" });
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            throw new Error(msg + " Ensure your .cs file has a static void Main entry point.");
        }
        const exeName = "App" + (isWin ? ".exe" : "");
        const exe = (0, node_path_1.join)(outDir, exeName);
        const dll = (0, node_path_1.join)(outDir, "App.dll");
        const unixExe = (0, node_path_1.join)(outDir, "App");
        if ((0, node_fs_1.existsSync)(exe)) {
            (0, node_fs_1.cpSync)(exe, outputPath);
        }
        else if (!isWin && (0, node_fs_1.existsSync)(unixExe)) {
            (0, node_fs_1.cpSync)(unixExe, outputPath);
        }
        else if ((0, node_fs_1.existsSync)(dll)) {
            (0, node_fs_1.cpSync)(dll, outputPath.replace(/\.exe$/i, ".dll"));
        }
        else {
            throw new Error("dotnet publish did not produce output");
        }
    }
    finally {
        try {
            (0, node_fs_1.rmSync)(tmpDir, { recursive: true });
        }
        catch { }
    }
}
