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
var node_child_process_1 = require("node:child_process");
var node_fs_1 = require("node:fs");
var promises_1 = require("node:fs/promises");
var node_os_1 = require("node:os");
var node_path_1 = require("node:path");
var conversion_outputs_1 = require("../src/workers/conversion.outputs");
var sourceDir = (0, node_path_1.resolve)(__dirname, '../../../vendor/flyingmouse-format/upstream-a7b9b15');
var archiveTest = (0, node_fs_1.existsSync)((0, node_path_1.join)(sourceDir, 'node_modules/yazl')) ? test : test.skip;
describe('conversion worker Markdown results', function () {
    archiveTest('keeps Markdown references and image files together in the download ZIP', function () { return __awaiter(void 0, void 0, void 0, function () {
        var root, outputDir, assetDir, markdown, sidecars, zipPath, entries, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), 'conversion-output-'))];
                case 1:
                    root = _c.sent();
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, , 9, 11]);
                    outputDir = (0, node_path_1.join)(root, 'outputs');
                    assetDir = (0, node_path_1.join)(outputDir, 'fm-assets-example');
                    return [4 /*yield*/, (0, promises_1.mkdir)(assetDir, { recursive: true })];
                case 3:
                    _c.sent();
                    markdown = '![图](fm-assets-example/image.png)\n';
                    return [4 /*yield*/, (0, promises_1.writeFile)((0, node_path_1.join)(outputDir, 'result.md'), markdown)];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, (0, promises_1.writeFile)((0, node_path_1.join)(assetDir, 'image.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))];
                case 5:
                    _c.sent();
                    return [4 /*yield*/, (0, conversion_outputs_1.markdownSidecars)(outputDir)];
                case 6:
                    sidecars = _c.sent();
                    zipPath = (0, node_path_1.join)(root, 'result.zip');
                    return [4 /*yield*/, (0, conversion_outputs_1.zipOutputs)([{ path: (0, node_path_1.join)(outputDir, 'result.md'), fileName: 'result.md' }], sidecars, zipPath, sourceDir)];
                case 7:
                    _c.sent();
                    entries = (0, node_child_process_1.execFileSync)('unzip', ['-Z', '-1', zipPath], { encoding: 'utf8' })
                        .trim()
                        .split('\n');
                    expect(entries).toEqual(['result.md', 'fm-assets-example/image.png']);
                    expect((0, node_child_process_1.execFileSync)('unzip', ['-p', zipPath, 'result.md'], { encoding: 'utf8' })).toBe(markdown);
                    _b = (_a = expect((0, node_child_process_1.execFileSync)('unzip', ['-p', zipPath, 'fm-assets-example/image.png']))).toEqual;
                    return [4 /*yield*/, (0, promises_1.readFile)((0, node_path_1.join)(assetDir, 'image.png'))];
                case 8:
                    _b.apply(_a, [_c.sent()]);
                    return [3 /*break*/, 11];
                case 9: return [4 /*yield*/, (0, promises_1.rm)(root, { recursive: true, force: true })];
                case 10:
                    _c.sent();
                    return [7 /*endfinally*/];
                case 11: return [2 /*return*/];
            }
        });
    }); });
    archiveTest('rejects when a ZIP source file cannot be read', function () { return __awaiter(void 0, void 0, void 0, function () {
        var root;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), 'conversion-output-'))];
                case 1:
                    root = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 4, 6]);
                    return [4 /*yield*/, expect((0, conversion_outputs_1.zipOutputs)([{ path: (0, node_path_1.join)(root, 'missing.md'), fileName: 'missing.md' }], [], (0, node_path_1.join)(root, 'result.zip'), sourceDir)).rejects.toThrow()];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 4: return [4 /*yield*/, (0, promises_1.rm)(root, { recursive: true, force: true })];
                case 5:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); });
    test('rejects a symlinked attachment', function () { return __awaiter(void 0, void 0, void 0, function () {
        var root, assetDir;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), 'conversion-output-'))];
                case 1:
                    root = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 7, 9]);
                    assetDir = (0, node_path_1.join)(root, 'fm-assets-example');
                    return [4 /*yield*/, (0, promises_1.mkdir)(assetDir)];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, (0, promises_1.writeFile)((0, node_path_1.join)(root, 'outside.png'), 'outside')];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, (0, promises_1.symlink)((0, node_path_1.join)(root, 'outside.png'), (0, node_path_1.join)(assetDir, 'image.png'))];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, expect((0, conversion_outputs_1.markdownSidecars)(root)).rejects.toThrow('不是普通文件')];
                case 6:
                    _a.sent();
                    return [3 /*break*/, 9];
                case 7: return [4 /*yield*/, (0, promises_1.rm)(root, { recursive: true, force: true })];
                case 8:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 9: return [2 /*return*/];
            }
        });
    }); });
});
