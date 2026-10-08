"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORIGINAL_CONVERSION_OPERATIONS = exports.CONVERSION_UPLOAD_TTL_MS = exports.CONVERSION_RETENTION_MS = exports.CONVERSION_COUNT_LIMIT = exports.CONVERSION_BATCH_LIMIT = exports.CONVERSION_FILE_LIMIT = exports.CONVERSION_CHUNK_BYTES = void 0;
exports.findConversionOperation = findConversionOperation;
var conversion_catalog_json_1 = require("./conversion.catalog.json");
exports.CONVERSION_CHUNK_BYTES = 8 * 1024 * 1024;
exports.CONVERSION_FILE_LIMIT = 16 * Math.pow(1024, 3);
exports.CONVERSION_BATCH_LIMIT = 32 * Math.pow(1024, 3);
exports.CONVERSION_COUNT_LIMIT = 1000;
exports.CONVERSION_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
exports.CONVERSION_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;
/** Original source a7b9b15; regenerate with scripts/generate-flyingmouse-operations.cjs. */
exports.ORIGINAL_CONVERSION_OPERATIONS = conversion_catalog_json_1.default.operations;
function findConversionOperation(id, extensions) {
    var operation = exports.ORIGINAL_CONVERSION_OPERATIONS.find(function (item) { return item.id === id; });
    if (!operation || !extensions.length || !extensions.every(function (ext) { return operation.inputExtensions.includes(ext); }))
        return null;
    return operation;
}
