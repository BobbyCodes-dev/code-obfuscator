"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.obfuscate = obfuscate;
const javascript_js_1 = require("./javascript.js");
function obfuscate(source, lang, options) {
    switch (lang) {
        case "javascript":
        case "typescript":
            return (0, javascript_js_1.obfuscateJavaScript)(source, options);
        case "python":
            throw new Error("Python obfuscation is not implemented yet.");
        case "rust":
            throw new Error("Rust obfuscation is not implemented yet.");
        case "c":
        case "cpp":
            throw new Error("C/C++ obfuscation is not implemented yet.");
        case "csharp":
            throw new Error("C# obfuscation is not implemented yet.");
        default:
            throw new Error(`Unsupported language: ${lang}`);
    }
}
