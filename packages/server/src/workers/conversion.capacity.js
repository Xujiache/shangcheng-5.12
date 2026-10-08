"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.freeWorkerMemoryBytes = freeWorkerMemoryBytes;
var node_os_1 = require("node:os");
function freeWorkerMemoryBytes(host, platform, readAvailable) {
    if (host === void 0) { host = (0, node_os_1.freemem)(); }
    if (platform === void 0) { platform = process.platform; }
    if (readAvailable === void 0) { readAvailable = process.availableMemory; }
    if (platform !== 'linux' || typeof readAvailable !== 'function')
        return host;
    try {
        var limited = readAvailable();
        return Number.isFinite(limited) && limited >= 0 ? Math.min(host, limited) : host;
    }
    catch (_a) {
        return host;
    }
}
