"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDependency = ensureDependency;
const node_child_process_1 = require("node:child_process");
const node_readline_1 = require("node:readline");
const envPath_js_1 = require("./envPath.js");
const isWin = process.platform === "win32";
const DEPENDENCIES = {
    python: {
        name: "PyArmor (Python obfuscator)",
        checkCmd: "pyarmor",
        checkArgs: ["--version"],
        installPrompt: "pip install pyarmor",
        installCmd: isWin ? "pip install pyarmor" : "pip3 install pyarmor",
    },
    rust: {
        name: "Rust (rustc)",
        checkCmd: "rustc",
        checkArgs: ["--version"],
        installPrompt: isWin ? "winget install Rustlang.Rustup" : "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh",
        installCmd: isWin ? "winget install Rustlang.Rustup -e --accept-source-agreements --accept-package-agreements" : "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y",
        installCmdChoco: "choco install rust -y",
    },
    c: {
        name: "GCC (C compiler)",
        checkCmd: "gcc",
        checkArgs: ["--version"],
        installPrompt: isWin ? "winget install MSYS2.MSYS2" : "sudo apt-get install build-essential",
        installCmd: isWin ? "winget install MSYS2.MSYS2 -e --accept-source-agreements --accept-package-agreements" : "sudo apt-get install -y build-essential",
        installCmdChoco: "choco install mingw -y",
    },
    cpp: {
        name: "G++ (C++ compiler)",
        checkCmd: "g++",
        checkArgs: ["--version"],
        installPrompt: isWin ? "winget install MSYS2.MSYS2" : "sudo apt-get install build-essential",
        installCmd: isWin ? "winget install MSYS2.MSYS2 -e --accept-source-agreements --accept-package-agreements" : "sudo apt-get install -y build-essential",
        installCmdChoco: "choco install mingw -y",
    },
    csharp: {
        name: "dotnet (C# / .NET SDK)",
        checkCmd: "dotnet",
        checkArgs: ["--version"],
        installPrompt: isWin ? "winget install Microsoft.DotNet.SDK.8" : "See https://dotnet.microsoft.com/download",
        installCmd: isWin ? "winget install Microsoft.DotNet.SDK.8 -e --accept-source-agreements --accept-package-agreements" : "echo 'Please install .NET SDK from https://dotnet.microsoft.com/download'",
        installCmdChoco: "choco install dotnet-sdk -y",
    },
};
/** On Windows, C/C++ check must use PATH that includes MSYS2 so gcc/g++ are found. */
function getCheckEnv(lang) {
    if (isWin && (lang === "c" || lang === "cpp"))
        return (0, envPath_js_1.getWinEnv)();
    return undefined;
}
function commandExists(cmd, args, env) {
    const r = (0, node_child_process_1.spawnSync)(cmd, args, {
        encoding: "utf-8",
        stdio: "pipe",
        windowsHide: true,
        env: env ?? process.env,
    });
    return r.status === 0;
}
function wingetExists() {
    return commandExists("winget", ["--version"]);
}
function chocoExists() {
    return commandExists("choco", ["--version"]);
}
/**
 * Ensure winget or Chocolatey is available on Windows. If neither exists, try to bootstrap winget.
 */
function ensureWindowsPackageManager() {
    if (wingetExists() || chocoExists())
        return;
    console.error("No package manager (winget or Chocolatey) found. Attempting to enable winget...");
    const bootstrap = (0, node_child_process_1.spawnSync)("powershell", [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        "Install-PackageProvider -Name NuGet -Force -Scope CurrentUser | Out-Null; Install-Module -Name Microsoft.WinGet.Client -Force -Scope CurrentUser -Repository PSGallery; Repair-WinGetPackageManager -AllUsers",
    ], { stdio: "inherit", encoding: "utf-8", windowsHide: false });
    if (bootstrap.status === 0 && wingetExists())
        return;
    // Fallback: open install page and throw
    try {
        (0, node_child_process_1.spawnSync)("start", ["https://aka.ms/winget-install"], { shell: true, stdio: "pipe", windowsHide: true });
    }
    catch { }
    throw new Error("winget and Chocolatey not found. Install winget from the opened page (https://aka.ms/winget-install), or install Chocolatey from https://chocolatey.org, then restart the terminal and try again.");
}
const PYARMOR_PIP_COMMANDS = isWin
    ? ["python -m pip install pyarmor", "py -m pip install pyarmor", "pip install pyarmor"]
    : ["python3 -m pip install pyarmor", "python -m pip install pyarmor", "pip3 install pyarmor", "pip install pyarmor"];
function runPythonInstall() {
    const run = (cmd) => {
        const r = (0, node_child_process_1.spawnSync)(cmd, [], { stdio: "inherit", shell: true, encoding: "utf-8", windowsHide: false });
        return r.status === 0;
    };
    for (const cmd of PYARMOR_PIP_COMMANDS) {
        if (run(cmd))
            return;
    }
    // Python/pip not found on Windows: try installing Python via winget or choco then retry
    if (isWin) {
        if (wingetExists()) {
            console.error("Python/pip not found. Installing Python via winget...");
            const r = (0, node_child_process_1.spawnSync)("winget", ["install", "Python.Python.3.12", "-e", "--accept-source-agreements", "--accept-package-agreements"], { stdio: "inherit", encoding: "utf-8", windowsHide: false });
            if (r.status === 0) {
                for (const cmd of PYARMOR_PIP_COMMANDS) {
                    if (run(cmd))
                        return;
                }
            }
        }
        else if (chocoExists()) {
            console.error("Python/pip not found. Installing Python via Chocolatey...");
            if ((0, node_child_process_1.spawnSync)("choco", ["install", "python", "-y"], { stdio: "inherit", encoding: "utf-8", windowsHide: false }).status === 0) {
                for (const cmd of PYARMOR_PIP_COMMANDS) {
                    if (run(cmd))
                        return;
                }
            }
        }
    }
    throw new Error("Could not install PyArmor. Install Python and run: pip install pyarmor. On Windows you can install Python from https://www.python.org or via winget.");
}
function promptYesNo(question) {
    return new Promise((resolve) => {
        if (!process.stdin.isTTY) {
            resolve(false);
            return;
        }
        const rl = (0, node_readline_1.createInterface)({ input: process.stdin, output: process.stdout });
        rl.question(question, (answer) => {
            rl.close();
            resolve(/^y|yes$/i.test(answer.trim()));
        });
    });
}
/**
 * Ensure the tool required for the given language is available.
 * If missing, prompt the user and optionally run the install command.
 */
async function ensureDependency(lang) {
    if (lang === "javascript" || lang === "typescript")
        return;
    const dep = DEPENDENCIES[lang];
    if (!dep)
        return;
    if (commandExists(dep.checkCmd, dep.checkArgs, getCheckEnv(lang)))
        return;
    console.error(`${dep.name} is required but not found.`);
    if (lang === "python") {
        if (isWin)
            ensureWindowsPackageManager();
        const canPrompt = process.stdin.isTTY;
        if (canPrompt) {
            console.error(`Install with: ${dep.installPrompt}`);
            const install = await promptYesNo("Install it now? (y/n): ");
            if (!install) {
                throw new Error(`${dep.name} is required. Install with: ${dep.installPrompt}`);
            }
        }
        else {
            console.error(`Installing automatically (no TTY for prompt).`);
        }
        runPythonInstall();
        if (!commandExists(dep.checkCmd, dep.checkArgs)) {
            throw new Error(`${dep.name} was installed but is not in PATH. Restart the terminal and try again.`);
        }
        return;
    }
    // Rust, C, C++, C#: ensure Windows package manager then run install
    if (isWin && ["rust", "c", "cpp", "csharp"].includes(lang)) {
        ensureWindowsPackageManager();
    }
    const canPrompt = process.stdin.isTTY;
    if (canPrompt) {
        console.error(`Install with: ${dep.installPrompt}`);
        const install = await promptYesNo("Install it now? (y/n): ");
        if (!install) {
            throw new Error(`${dep.name} is required. Install with: ${dep.installPrompt}`);
        }
    }
    else {
        console.error(`Installing automatically (no TTY for prompt).`);
    }
    const useChoco = isWin && dep.installCmdChoco && chocoExists() && !wingetExists();
    const installCmd = useChoco ? dep.installCmdChoco : dep.installCmd;
    console.error(`Running: ${installCmd}`);
    const r = (0, node_child_process_1.spawnSync)(installCmd, [], {
        stdio: "inherit",
        shell: true,
        windowsHide: false,
    });
    if (r.status !== 0) {
        throw new Error(`Install failed (exit ${r.status}). Try installing manually: ${dep.installPrompt}`);
    }
    if (!commandExists(dep.checkCmd, dep.checkArgs, getCheckEnv(lang))) {
        throw new Error(`${dep.name} was installed but is not in PATH. Restart the terminal and try again.`);
    }
}
