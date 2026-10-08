"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
var node_crypto_1 = require("node:crypto");
var node_fs_1 = require("node:fs");
var promises_1 = require("node:fs/promises");
var node_http_1 = require("node:http");
var node_path_1 = require("node:path");
function multipart(url, fields, files, fieldName, progressId) {
    return __awaiter(this, void 0, void 0, function () {
        var boundary, parts, uploads, closing, length;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    boundary = "----ledger-flyingmouse-".concat((0, node_crypto_1.randomUUID)());
                    parts = Object.entries(fields)
                        .filter(function (_a) {
                        var value = _a[1];
                        return value !== '';
                    })
                        .map(function (_a) {
                        var key = _a[0], value = _a[1];
                        return Buffer.from("--".concat(boundary, "\r\nContent-Disposition: form-data; name=\"").concat(key, "\"\r\n\r\n").concat(value, "\r\n"));
                    });
                    return [4 /*yield*/, Promise.all(files.map(function (file) { return __awaiter(_this, void 0, void 0, function () {
                            var name, header;
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        name = (0, node_path_1.basename)(file).replace(/["\r\n]/g, '_');
                                        header = Buffer.from("--".concat(boundary, "\r\nContent-Disposition: form-data; name=\"").concat(fieldName, "\"; filename=\"").concat(name, "\"\r\nContent-Type: application/octet-stream\r\n\r\n"));
                                        _a = { file: file, header: header };
                                        return [4 /*yield*/, (0, promises_1.stat)(file)];
                                    case 1: return [2 /*return*/, (_a.size = (_b.sent()).size, _a)];
                                }
                            });
                        }); }))];
                case 1:
                    uploads = _a.sent();
                    closing = Buffer.from("--".concat(boundary, "--\r\n"));
                    length = parts.reduce(function (sum, part) { return sum + part.length; }, 0) +
                        uploads.reduce(function (sum, item) { return sum + item.header.length + item.size + 2; }, 0) + closing.length;
                    return [2 /*return*/, new Promise(function (done, fail) {
                            var request = node_http_1.default.request(url, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': "multipart/form-data; boundary=".concat(boundary),
                                    'Content-Length': length,
                                    'x-flyingmouse-progress-id': progressId,
                                },
                            }, function (response) { return __awaiter(_this, void 0, void 0, function () {
                                var chunks, chunk, e_1_1, payload, error_1;
                                var _a, response_1, response_1_1;
                                var _b, e_1, _c, _d;
                                var _e;
                                return __generator(this, function (_f) {
                                    switch (_f.label) {
                                        case 0:
                                            _f.trys.push([0, 13, , 14]);
                                            chunks = [];
                                            _f.label = 1;
                                        case 1:
                                            _f.trys.push([1, 6, 7, 12]);
                                            _a = true, response_1 = __asyncValues(response);
                                            _f.label = 2;
                                        case 2: return [4 /*yield*/, response_1.next()];
                                        case 3:
                                            if (!(response_1_1 = _f.sent(), _b = response_1_1.done, !_b)) return [3 /*break*/, 5];
                                            _d = response_1_1.value;
                                            _a = false;
                                            chunk = _d;
                                            chunks.push(Buffer.from(chunk));
                                            _f.label = 4;
                                        case 4:
                                            _a = true;
                                            return [3 /*break*/, 2];
                                        case 5: return [3 /*break*/, 12];
                                        case 6:
                                            e_1_1 = _f.sent();
                                            e_1 = { error: e_1_1 };
                                            return [3 /*break*/, 12];
                                        case 7:
                                            _f.trys.push([7, , 10, 11]);
                                            if (!(!_a && !_b && (_c = response_1.return))) return [3 /*break*/, 9];
                                            return [4 /*yield*/, _c.call(response_1)];
                                        case 8:
                                            _f.sent();
                                            _f.label = 9;
                                        case 9: return [3 /*break*/, 11];
                                        case 10:
                                            if (e_1) throw e_1.error;
                                            return [7 /*endfinally*/];
                                        case 11: return [7 /*endfinally*/];
                                        case 12:
                                            payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                                            if ((response.statusCode || 500) >= 400)
                                                throw new Error(((_e = payload.messages) === null || _e === void 0 ? void 0 : _e.zhCN) || payload.error || "HTTP ".concat(response.statusCode));
                                            done(payload);
                                            return [3 /*break*/, 14];
                                        case 13:
                                            error_1 = _f.sent();
                                            fail(error_1);
                                            return [3 /*break*/, 14];
                                        case 14: return [2 /*return*/];
                                    }
                                });
                            }); });
                            request.once('error', fail);
                            var write = function (chunk) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            if (!!request.write(chunk)) return [3 /*break*/, 2];
                                            return [4 /*yield*/, new Promise(function (drain) {
                                                    request.once('drain', drain);
                                                })];
                                        case 1:
                                            _a.sent();
                                            _a.label = 2;
                                        case 2: return [2 /*return*/];
                                    }
                                });
                            }); };
                            (function () { return __awaiter(_this, void 0, void 0, function () {
                                var _i, parts_1, part, _a, uploads_1, item, _b, _c, _d, chunk, e_2_1;
                                var _e, e_2, _f, _g;
                                return __generator(this, function (_h) {
                                    switch (_h.label) {
                                        case 0:
                                            _i = 0, parts_1 = parts;
                                            _h.label = 1;
                                        case 1:
                                            if (!(_i < parts_1.length)) return [3 /*break*/, 4];
                                            part = parts_1[_i];
                                            return [4 /*yield*/, write(part)];
                                        case 2:
                                            _h.sent();
                                            _h.label = 3;
                                        case 3:
                                            _i++;
                                            return [3 /*break*/, 1];
                                        case 4:
                                            _a = 0, uploads_1 = uploads;
                                            _h.label = 5;
                                        case 5:
                                            if (!(_a < uploads_1.length)) return [3 /*break*/, 22];
                                            item = uploads_1[_a];
                                            return [4 /*yield*/, write(item.header)];
                                        case 6:
                                            _h.sent();
                                            _h.label = 7;
                                        case 7:
                                            _h.trys.push([7, 13, 14, 19]);
                                            _b = true, _c = (e_2 = void 0, __asyncValues((0, node_fs_1.createReadStream)(item.file)));
                                            _h.label = 8;
                                        case 8: return [4 /*yield*/, _c.next()];
                                        case 9:
                                            if (!(_d = _h.sent(), _e = _d.done, !_e)) return [3 /*break*/, 12];
                                            _g = _d.value;
                                            _b = false;
                                            chunk = _g;
                                            return [4 /*yield*/, write(Buffer.from(chunk))];
                                        case 10:
                                            _h.sent();
                                            _h.label = 11;
                                        case 11:
                                            _b = true;
                                            return [3 /*break*/, 8];
                                        case 12: return [3 /*break*/, 19];
                                        case 13:
                                            e_2_1 = _h.sent();
                                            e_2 = { error: e_2_1 };
                                            return [3 /*break*/, 19];
                                        case 14:
                                            _h.trys.push([14, , 17, 18]);
                                            if (!(!_b && !_e && (_f = _c.return))) return [3 /*break*/, 16];
                                            return [4 /*yield*/, _f.call(_c)];
                                        case 15:
                                            _h.sent();
                                            _h.label = 16;
                                        case 16: return [3 /*break*/, 18];
                                        case 17:
                                            if (e_2) throw e_2.error;
                                            return [7 /*endfinally*/];
                                        case 18: return [7 /*endfinally*/];
                                        case 19: return [4 /*yield*/, write(Buffer.from('\r\n'))];
                                        case 20:
                                            _h.sent();
                                            _h.label = 21;
                                        case 21:
                                            _a++;
                                            return [3 /*break*/, 5];
                                        case 22:
                                            request.end(closing);
                                            return [2 /*return*/];
                                    }
                                });
                            }); })().catch(function (error) { return request.destroy(error); });
                        })];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var sourceDir, request, _a, _b, startServer, saveConvertedResult, started, results, route, fields, _c, _d, target, _i, _e, file, _f, _g, outputs, _loop_1, index;
        var _h, _j, _k;
        return __generator(this, function (_l) {
            switch (_l.label) {
                case 0:
                    sourceDir = process.env.FLYINGMOUSE_SOURCE_DIR;
                    if (!sourceDir)
                        throw new Error('FLYINGMOUSE_SOURCE_DIR is required');
                    _b = (_a = JSON).parse;
                    return [4 /*yield*/, (0, promises_1.readFile)(process.argv[2], 'utf8')];
                case 1:
                    request = _b.apply(_a, [_l.sent()]);
                    if (!Array.isArray(request.files) || !request.files.length)
                        throw new Error('No input files');
                    if (request.operationId === 'convert:mov' && ((_h = request.options) === null || _h === void 0 ? void 0 : _h.videoCodec) === 'av1')
                        throw new Error('AV1 无法写入 MOV 容器，请改用 MP4 或 MKV');
                    startServer = require((0, node_path_1.join)(sourceDir, 'server.js')).startServer;
                    saveConvertedResult = require((0, node_path_1.join)(sourceDir, 'save-converted-result.js')).saveConvertedResult;
                    return [4 /*yield*/, startServer(0)];
                case 2:
                    started = _l.sent();
                    _l.label = 3;
                case 3:
                    _l.trys.push([3, , 15, 17]);
                    return [4 /*yield*/, (0, promises_1.mkdir)(request.outputDir, { recursive: true })];
                case 4:
                    _l.sent();
                    results = [];
                    if (!(request.operationId === 'images-to-pdf' || request.operationId === 'merge-pdfs')) return [3 /*break*/, 6];
                    route = request.operationId === 'images-to-pdf' ? 'convert-images-to-pdf' : 'merge-pdfs';
                    fields = request.operationId === 'images-to-pdf' && request.options.blanks
                        ? { blanks: request.options.blanks } : {};
                    _d = (_c = results).push;
                    return [4 /*yield*/, runOne(new URL("/api/".concat(route), started.url), fields, request.files, 'files', started.url)];
                case 5:
                    _d.apply(_c, [_l.sent()]);
                    return [3 /*break*/, 10];
                case 6:
                    target = (_j = /^convert:([a-z0-9]{2,8})$/.exec(request.operationId)) === null || _j === void 0 ? void 0 : _j[1];
                    if (!target)
                        throw new Error('Invalid conversion operation');
                    _i = 0, _e = request.files;
                    _l.label = 7;
                case 7:
                    if (!(_i < _e.length)) return [3 /*break*/, 10];
                    file = _e[_i];
                    _g = (_f = results).push;
                    return [4 /*yield*/, runOne(new URL('/api/convert', started.url), __assign({ targetFormat: target }, request.options), [file], 'file', started.url)];
                case 8:
                    _g.apply(_f, [_l.sent()]);
                    _l.label = 9;
                case 9:
                    _i++;
                    return [3 /*break*/, 7];
                case 10:
                    outputs = [];
                    _loop_1 = function (index) {
                        var result, name_1, destination, base, resolveUrl;
                        return __generator(this, function (_m) {
                            switch (_m.label) {
                                case 0:
                                    result = results[index];
                                    if (request.operationId === 'convert:docx' &&
                                        ((_k = result.warnings) === null || _k === void 0 ? void 0 : _k.some(function (warning) { return warning.code === 'PDF_DOCX_LAYOUT_FALLBACK'; })))
                                        throw new Error('PDF 转 Word 版式处理失败，已阻止降级结果。');
                                    name_1 = (0, node_path_1.basename)(String(result.fileName || '')).replace(/[\x00-\x1f\x7f]/g, '');
                                    if (!name_1 || name_1 === '.' || name_1 === '..')
                                        throw new Error('Invalid engine output name');
                                    destination = (0, node_path_1.resolve)(request.outputDir, "".concat(index, "-").concat(name_1));
                                    base = new URL(started.url);
                                    resolveUrl = function (value) {
                                        var url = new URL(value, base);
                                        if (url.origin !== base.origin || !url.pathname.startsWith('/downloads/'))
                                            throw new Error('Engine output URL escaped loopback server');
                                        return url.href;
                                    };
                                    return [4 /*yield*/, saveConvertedResult(result, destination, { resolveUrl: resolveUrl, overwrite: false, resolveRedirect: resolveUrl })];
                                case 1:
                                    _m.sent();
                                    outputs.push({ path: destination, fileName: name_1, mimeType: result.mimeType, warnings: result.warnings || [] });
                                    return [2 /*return*/];
                            }
                        });
                    };
                    index = 0;
                    _l.label = 11;
                case 11:
                    if (!(index < results.length)) return [3 /*break*/, 14];
                    return [5 /*yield**/, _loop_1(index)];
                case 12:
                    _l.sent();
                    _l.label = 13;
                case 13:
                    index++;
                    return [3 /*break*/, 11];
                case 14:
                    process.stdout.write("@@LEDGER_CONVERSION_RESULT@@".concat(JSON.stringify({ ok: true, outputs: outputs }), "\n"));
                    return [3 /*break*/, 17];
                case 15: return [4 /*yield*/, new Promise(function (done) {
                        started.server.close(function () { return done(); });
                    })];
                case 16:
                    _l.sent();
                    return [7 /*endfinally*/];
                case 17: return [2 /*return*/];
            }
        });
    });
}
function runOne(url, fields, files, fieldName, baseUrl) {
    return __awaiter(this, void 0, void 0, function () {
        var id, busy, timer;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    id = (0, node_crypto_1.randomUUID)();
                    busy = true;
                    timer = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
                        var response, _a, _b, _c, _d, _e, _f;
                        return __generator(this, function (_g) {
                            switch (_g.label) {
                                case 0:
                                    if (!busy)
                                        return [2 /*return*/];
                                    _g.label = 1;
                                case 1:
                                    _g.trys.push([1, 5, , 6]);
                                    return [4 /*yield*/, fetch(new URL("/api/conversion-progress/".concat(id), baseUrl))];
                                case 2:
                                    response = _g.sent();
                                    if (!response.ok) return [3 /*break*/, 4];
                                    _b = (_a = process.stderr).write;
                                    _c = "@@PROGRESS@@".concat;
                                    _e = (_d = JSON).stringify;
                                    return [4 /*yield*/, response.json()];
                                case 3:
                                    _b.apply(_a, [_c.apply("@@PROGRESS@@", [_e.apply(_d, [_g.sent()]), "\n"])]);
                                    _g.label = 4;
                                case 4: return [3 /*break*/, 6];
                                case 5:
                                    _f = _g.sent();
                                    return [3 /*break*/, 6];
                                case 6: return [2 /*return*/];
                            }
                        });
                    }); }, 1000);
                    timer.unref();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 3, 4]);
                    return [4 /*yield*/, multipart(url, fields, files, fieldName, id)];
                case 2: return [2 /*return*/, _a.sent()];
                case 3:
                    busy = false;
                    clearInterval(timer);
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    });
}
main().catch(function (error) {
    process.stderr.write("".concat(String((error === null || error === void 0 ? void 0 : error.message) || error), "\n"));
    process.exitCode = 1;
});
