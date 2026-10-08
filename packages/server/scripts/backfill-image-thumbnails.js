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
var client_1 = require("@prisma/client");
var minio_1 = require("minio");
var image_thumbnail_util_1 = require("../src/modules/files/image-thumbnail.util");
var prisma = new client_1.PrismaClient();
var endpoint = (process.env.S3_ENDPOINT || 'http://localhost:9000').replace(/^https?:\/\//, '');
var useSSL = (process.env.S3_ENDPOINT || '').startsWith('https');
var _a = endpoint.split(':'), host = _a[0], port = _a[1];
var client = new minio_1.Client({
    endPoint: host,
    port: port ? Number(port) : useSSL ? 443 : 80,
    useSSL: useSSL,
    accessKey: process.env.S3_ACCESS_KEY || '',
    secretKey: process.env.S3_SECRET_KEY || '',
});
var bucket = process.env.S3_BUCKET || 'jiujiu-mall';
function streamBuffer(key) {
    return __awaiter(this, void 0, void 0, function () {
        var stream, chunks, _a, stream_1, stream_1_1, chunk, e_1_1;
        var _b, e_1, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, client.getObject(bucket, key)];
                case 1:
                    stream = _e.sent();
                    chunks = [];
                    _e.label = 2;
                case 2:
                    _e.trys.push([2, 7, 8, 13]);
                    _a = true, stream_1 = __asyncValues(stream);
                    _e.label = 3;
                case 3: return [4 /*yield*/, stream_1.next()];
                case 4:
                    if (!(stream_1_1 = _e.sent(), _b = stream_1_1.done, !_b)) return [3 /*break*/, 6];
                    _d = stream_1_1.value;
                    _a = false;
                    chunk = _d;
                    chunks.push(Buffer.from(chunk));
                    _e.label = 5;
                case 5:
                    _a = true;
                    return [3 /*break*/, 3];
                case 6: return [3 /*break*/, 13];
                case 7:
                    e_1_1 = _e.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 13];
                case 8:
                    _e.trys.push([8, , 11, 12]);
                    if (!(!_a && !_b && (_c = stream_1.return))) return [3 /*break*/, 10];
                    return [4 /*yield*/, _c.call(stream_1)];
                case 9:
                    _e.sent();
                    _e.label = 10;
                case 10: return [3 /*break*/, 12];
                case 11:
                    if (e_1) throw e_1.error;
                    return [7 /*endfinally*/];
                case 12: return [7 /*endfinally*/];
                case 13: return [2 /*return*/, Buffer.concat(chunks)];
            }
        });
    });
}
function processFile(file) {
    return __awaiter(this, void 0, void 0, function () {
        var thumbnailKey, exists, thumbnail, _a, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    thumbnailKey = (0, image_thumbnail_util_1.thumbnailKeyForObjectKey)(file.key);
                    if (!thumbnailKey)
                        return [2 /*return*/, 'skipped'];
                    return [4 /*yield*/, client
                            .statObject(bucket, thumbnailKey)
                            .then(function () { return true; })
                            .catch(function () { return false; })];
                case 1:
                    exists = _b.sent();
                    if (exists)
                        return [2 /*return*/, 'skipped'];
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 6, , 7]);
                    _a = image_thumbnail_util_1.createSquareThumbnail;
                    return [4 /*yield*/, streamBuffer(file.key)];
                case 3: return [4 /*yield*/, _a.apply(void 0, [_b.sent()])];
                case 4:
                    thumbnail = _b.sent();
                    return [4 /*yield*/, client.putObject(bucket, thumbnailKey, thumbnail, thumbnail.length, {
                            'Content-Type': 'image/webp',
                            'Cache-Control': image_thumbnail_util_1.IMMUTABLE_CACHE_CONTROL,
                        })];
                case 5:
                    _b.sent();
                    return [2 /*return*/, 'created'];
                case 6:
                    error_1 = _b.sent();
                    console.error("[thumbnail] failed ".concat(file.key, ":"), error_1);
                    return [2 /*return*/, 'failed'];
                case 7: return [2 /*return*/];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var files, counts, index, results, _i, results_1, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (process.env.NODE_ENV === 'production' && !process.argv.includes('--confirm-production')) {
                        throw new Error('生产环境回填必须显式传入 --confirm-production');
                    }
                    return [4 /*yield*/, prisma.uploadedFile.findMany({
                            where: { mimeType: { startsWith: 'image/' }, NOT: { key: { startsWith: 'thumb/' } } },
                            select: { key: true },
                            orderBy: { createdAt: 'asc' },
                        })];
                case 1:
                    files = _a.sent();
                    counts = { created: 0, skipped: 0, failed: 0 };
                    index = 0;
                    _a.label = 2;
                case 2:
                    if (!(index < files.length)) return [3 /*break*/, 5];
                    return [4 /*yield*/, Promise.all(files.slice(index, index + 3).map(processFile))];
                case 3:
                    results = _a.sent();
                    for (_i = 0, results_1 = results; _i < results_1.length; _i++) {
                        result = results_1[_i];
                        counts[result] += 1;
                    }
                    _a.label = 4;
                case 4:
                    index += 3;
                    return [3 /*break*/, 2];
                case 5:
                    console.log(JSON.stringify(__assign({ total: files.length }, counts)));
                    return [2 /*return*/];
            }
        });
    });
}
main().finally(function () { return prisma.$disconnect(); });
