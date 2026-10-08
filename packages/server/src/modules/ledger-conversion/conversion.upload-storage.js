"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversionUploadStorage = void 0;
var node_crypto_1 = require("node:crypto");
var node_fs_1 = require("node:fs");
var promises_1 = require("node:fs/promises");
var node_os_1 = require("node:os");
var node_path_1 = require("node:path");
var node_stream_1 = require("node:stream");
var prefix = 'ledger-conversion-chunk-';
exports.conversionUploadStorage = {
    _handleFile: function (_request, file, callback) {
        var path = (0, node_path_1.join)((0, node_os_1.tmpdir)(), "".concat(prefix).concat((0, node_crypto_1.randomUUID)()));
        var output = (0, node_fs_1.createWriteStream)(path, { flags: 'wx', mode: 384 });
        file.path = path;
        (0, node_stream_1.pipeline)(file.stream, output, function (error) {
            if (error) {
                (0, promises_1.rm)(path, { force: true }).finally(function () { return callback(error); });
                return;
            }
            callback(null, { path: path, size: output.bytesWritten });
        });
    },
    _removeFile: function (_request, file, callback) {
        var path = file.path;
        if (!path || !path.startsWith((0, node_path_1.join)((0, node_os_1.tmpdir)(), prefix))) {
            callback(new Error('无效的上传临时文件路径'));
            return;
        }
        (0, promises_1.rm)(path, { force: true }).then(function () { return callback(null); }, callback);
    },
};
