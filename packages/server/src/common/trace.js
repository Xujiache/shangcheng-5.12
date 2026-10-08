"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestTraceId = requestTraceId;
var node_crypto_1 = require("node:crypto");
function requestTraceId(req) {
    if (req.traceId)
        return req.traceId;
    var supplied = req.headers['x-trace-id'];
    req.traceId =
        typeof supplied === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(supplied)
            ? supplied
            : "t-".concat((0, node_crypto_1.randomUUID)());
    return req.traceId;
}
