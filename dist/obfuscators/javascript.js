"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.obfuscateJavaScript = obfuscateJavaScript;
const parser = __importStar(require("@babel/parser"));
const traverse_1 = __importDefault(require("@babel/traverse"));
const generator_1 = __importDefault(require("@babel/generator"));
const t = __importStar(require("@babel/types"));
function randomName(prefix = "_0x") {
    const hex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
    return `${prefix}${hex}`;
}
function encodeStringLiteral(value) {
    const encoded = Buffer.from(value, "utf-8").toString("base64");
    return encoded;
}
/**
 * Obfuscate JavaScript/TypeScript source: rename identifiers, encode strings, minify.
 */
function obfuscateJavaScript(source, options) {
    const ast = parser.parse(source, {
        sourceType: "module",
        plugins: ["typescript"],
    });
    const reserved = new Set(["undefined", "null", "true", "false", "this", "arguments", "super", "console", "window", "document", "global", "process", "require", "exports", "module"]);
    const renameMap = new WeakMap();
    function getNameForBinding(identifier) {
        if (reserved.has(identifier.name))
            return identifier.name;
        let name = renameMap.get(identifier);
        if (!name) {
            name = randomName();
            renameMap.set(identifier, name);
        }
        return name;
    }
    // First pass: scope-aware rename of bindings and their references
    if (options.rename) {
        (0, traverse_1.default)(ast, {
            Identifier(path) {
                if (path.node.name.startsWith("_0x"))
                    return;
                if (t.isMemberExpression(path.parent) && path.parent.property === path.node && !path.parent.computed)
                    return;
                if (t.isObjectProperty(path.parent) && path.parent.key === path.node && !path.parent.computed)
                    return;
                const binding = path.scope.getBinding(path.node.name);
                if (binding) {
                    path.node.name = getNameForBinding(binding.identifier);
                }
            },
        });
    }
    // Second pass: encode string literals (only in JS we can use atob)
    if (options.encodeStrings) {
        (0, traverse_1.default)(ast, {
            StringLiteral(path) {
                const value = path.node.value;
                if (value.length === 0)
                    return;
                // Skip if already inside atob(...) to avoid double-encoding
                if (t.isCallExpression(path.parent) && t.isIdentifier(path.parent.callee) && path.parent.callee.name === "atob")
                    return;
                const encoded = encodeStringLiteral(value);
                const call = t.callExpression(t.identifier("atob"), [t.stringLiteral(encoded)]);
                path.replaceWith(call);
            },
        });
    }
    const output = (0, generator_1.default)(ast, { compact: true, comments: false, retainLines: false });
    return output.code;
}
