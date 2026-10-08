"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markdownSidecars = markdownSidecars;
exports.zipOutputs = zipOutputs;
var node_module_1 = require("node:module");
var node_fs_1 = require("node:fs");
var promises_1 = require("node:fs/promises");
var node_path_1 = require("node:path");
var promises_2 = require("node:stream/promises");
function markdownSidecars(outputDir) {
    return __awaiter(this, void 0, void 0, function () {
        var root, files, _i, _a, directory, directoryPath, _b, entries, _c, entries_1, entry, filePath, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0: return [4 /*yield*/, (0, promises_1.realpath)(outputDir)];
                case 1:
                    root = _f.sent();
                    files = [];
                    _i = 0;
                    return [4 /*yield*/, (0, promises_1.readdir)(root, { withFileTypes: true })];
                case 2:
                    _a = _f.sent();
                    _f.label = 3;
                case 3:
                    if (!(_i < _a.length)) return [3 /*break*/, 14];
                    directory = _a[_i];
                    if (!directory.name.startsWith('fm-assets-'))
                        return [3 /*break*/, 13];
                    directoryPath = (0, node_path_1.join)(root, directory.name);
                    _b = !directory.isDirectory();
                    if (_b) return [3 /*break*/, 5];
                    return [4 /*yield*/, (0, promises_1.realpath)(directoryPath)];
                case 4:
                    _b = (_f.sent()) !== directoryPath;
                    _f.label = 5;
                case 5:
                    if (_b)
                        throw new Error('Markdown 附件目录无效');
                    return [4 /*yield*/, (0, promises_1.readdir)(directoryPath, { withFileTypes: true })];
                case 6:
                    entries = _f.sent();
                    if (!entries.length)
                        throw new Error('Markdown 附件目录为空');
                    _c = 0, entries_1 = entries;
                    _f.label = 7;
                case 7:
                    if (!(_c < entries_1.length)) return [3 /*break*/, 13];
                    entry = entries_1[_c];
                    filePath = (0, node_path_1.join)(directoryPath, entry.name);
                    _e = !entry.isFile();
                    if (_e) return [3 /*break*/, 9];
                    return [4 /*yield*/, (0, promises_1.lstat)(filePath)];
                case 8:
                    _e = !(_f.sent()).isFile();
                    _f.label = 9;
                case 9:
                    _d = _e;
                    if (_d) return [3 /*break*/, 11];
                    return [4 /*yield*/, (0, promises_1.realpath)(filePath)];
                case 10:
                    _d = (_f.sent()) !== filePath;
                    _f.label = 11;
                case 11:
                    if (_d)
                        throw new Error('Markdown 附件不是普通文件');
                    files.push({ path: filePath, zipName: "".concat(directory.name, "/").concat(entry.name) });
                    _f.label = 12;
                case 12:
                    _c++;
                    return [3 /*break*/, 7];
                case 13:
                    _i++;
                    return [3 /*break*/, 3];
                case 14: return [2 /*return*/, files];
            }
        });
    });
}
function zipOutputs(outputs, sidecars, destination, sourceDir) {
    return __awaiter(this, void 0, void 0, function () {
        var vendorRequire, yazl, zip, used, _i, outputs_1, output, original, name_1, suffix, _a, sidecars_1, file;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    vendorRequire = (0, node_module_1.createRequire)((0, node_path_1.join)(sourceDir, 'package.json'));
                    yazl = vendorRequire('yazl');
                    zip = new yazl.ZipFile();
                    zip.on('error', function (error) { return zip.outputStream.destroy(error); });
                    used = new Set();
                    for (_i = 0, outputs_1 = outputs; _i < outputs_1.length; _i++) {
                        output = outputs_1[_i];
                        original = (0, node_path_1.basename)(output.fileName.replaceAll('\\', '/'))
                            .replace(/[\x00-\x1f\x7f]/g, '')
                            .slice(0, 180);
                        if (!original)
                            throw new Error('转换引擎结果文件名无效');
                        name_1 = original;
                        suffix = 2;
                        while (used.has(name_1))
                            name_1 = "".concat(suffix++, "-").concat(original);
                        used.add(name_1);
                        zip.addFile(output.path, name_1);
                    }
                    for (_a = 0, sidecars_1 = sidecars; _a < sidecars_1.length; _a++) {
                        file = sidecars_1[_a];
                        zip.addFile(file.path, file.zipName);
                    }
                    zip.end();
                    return [4 /*yield*/, (0, promises_2.pipeline)(zip.outputStream, (0, node_fs_1.createWriteStream)(destination))];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
