"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWinEnv = getWinEnv;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
/**
 * On Windows, return process.env with MSYS2/MinGW bin dirs prepended to PATH
 * so gcc/g++ and Rust GNU linker are found. Otherwise return process.env.
 */
function getWinEnv() {
    if (process.platform !== "win32")
        return process.env;
    const extra = [];
    const msys64 = "C:\\msys64";
    for (const sub of ["ucrt64", "mingw64", "mingw32"]) {
        const bin = (0, node_path_1.join)(msys64, sub, "bin");
        if ((0, node_fs_1.existsSync)(bin))
            extra.push(bin);
    }
    if (extra.length === 0)
        return process.env;
    const pathKey = Object.keys(process.env).find((k) => k.toLowerCase() === "path") || "Path";
    const pathVal = process.env[pathKey] || "";
    return { ...process.env, [pathKey]: [...extra, pathVal].join(";") };
}
