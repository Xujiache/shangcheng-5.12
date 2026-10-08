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
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversionService = void 0;
var node_crypto_1 = require("node:crypto");
var node_fs_1 = require("node:fs");
var promises_1 = require("node:fs/promises");
var node_path_1 = require("node:path");
var common_1 = require("@nestjs/common");
var schedule_1 = require("@nestjs/schedule");
var ioredis_1 = require("ioredis");
var minio_1 = require("minio");
var biz_exception_1 = require("../../common/exceptions/biz.exception");
var conversion_operations_1 = require("./conversion.operations");
var conversion_storage_1 = require("./conversion.storage");
var conversion_warnings_1 = require("./conversion.warnings");
var conversion_secrets_1 = require("./conversion.secrets");
var conversion_catalog_json_1 = require("./conversion.catalog.json");
var QUEUE = 'ledger:conversions:queue';
var WORKER_HEARTBEAT = 'ledger:conversions:worker:online';
var safeName = function (name) {
    return (0, node_path_1.basename)(name.replaceAll('\\', '/'))
        .replace(/[\x00-\x1f\x7f]/g, '')
        .slice(0, 180);
};
var deadline = function (milliseconds) { return new Date(Date.now() + milliseconds); };
var integer = function (value) { return (Number.isSafeInteger(Number(value)) ? Number(value) : NaN); };
var boundedLimit = function (raw, fallback, ceiling) {
    var value = raw === undefined ? fallback : Number(raw);
    return Number.isSafeInteger(value) && value > 0 ? Math.min(value, ceiling) : fallback;
};
var ConversionService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _retryInitialization_decorators;
    var _cleanupExpired_decorators;
    var _recoverQueue_decorators;
    var ConversionService = _classThis = /** @class */ (function () {
        function ConversionService_1(prisma) {
            this.prisma = (__runInitializers(this, _instanceExtraInitializers), prisma);
            this.logger = new common_1.Logger(ConversionService.name);
            this.bucket = process.env.CONVERSION_BUCKET || 'jiujiu-conversions';
            this.redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
                lazyConnect: true,
                maxRetriesPerRequest: 1,
            });
            this.storage = null;
            this.ready = false;
            this.initializing = null;
            this.accepting = process.env.CONVERSION_FEATURE_ENABLED === 'true';
            this.maxFileBytes = boundedLimit(process.env.CONVERSION_MAX_FILE_BYTES, conversion_operations_1.CONVERSION_FILE_LIMIT, conversion_operations_1.CONVERSION_FILE_LIMIT);
            this.maxBatchBytes = boundedLimit(process.env.CONVERSION_MAX_BATCH_BYTES, conversion_operations_1.CONVERSION_BATCH_LIMIT, conversion_operations_1.CONVERSION_BATCH_LIMIT);
            this.maxFiles = boundedLimit(process.env.CONVERSION_MAX_FILES, conversion_operations_1.CONVERSION_COUNT_LIMIT, conversion_operations_1.CONVERSION_COUNT_LIMIT);
        }
        ConversionService_1.prototype.onModuleInit = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.initialize()];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        ConversionService_1.prototype.retryInitialization = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(this.accepting && !this.ready)) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.initialize()];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2: return [2 /*return*/];
                    }
                });
            });
        };
        ConversionService_1.prototype.initialize = function () {
            var _this = this;
            if (this.initializing)
                return this.initializing;
            this.initializing = this.connectStorage().finally(function () {
                _this.initializing = null;
            });
            return this.initializing;
        };
        ConversionService_1.prototype.connectStorage = function () {
            return __awaiter(this, void 0, void 0, function () {
                var accessKey, secretKey, url, storage, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (this.bucket === (process.env.S3_BUCKET || 'jiujiu-mall')) {
                                this.logger.error('转换存储不得复用公开下载 bucket；转换功能已关闭');
                                return [2 /*return*/];
                            }
                            accessKey = process.env.S3_ACCESS_KEY || '';
                            secretKey = process.env.S3_SECRET_KEY || '';
                            if (process.env.NODE_ENV === 'production' && (!accessKey || !secretKey)) {
                                this.logger.error('私有转换存储凭据缺失；转换功能已关闭');
                                return [2 /*return*/];
                            }
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 7, , 8]);
                            url = new URL(process.env.S3_ENDPOINT || 'http://127.0.0.1:9000');
                            storage = new minio_1.Client({
                                endPoint: url.hostname,
                                port: Number(url.port) || (url.protocol === 'https:' ? 443 : 80),
                                useSSL: url.protocol === 'https:',
                                accessKey: accessKey || 'minioadmin',
                                secretKey: secretKey || 'minioadmin',
                            });
                            return [4 /*yield*/, storage.bucketExists(this.bucket)];
                        case 2:
                            if (!!(_a.sent())) return [3 /*break*/, 4];
                            return [4 /*yield*/, storage.makeBucket(this.bucket)];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4: return [4 /*yield*/, (0, conversion_storage_1.assertPrivateConversionBucket)(storage, this.bucket)];
                        case 5:
                            _a.sent();
                            return [4 /*yield*/, this.redis.ping()];
                        case 6:
                            if ((_a.sent()) !== 'PONG')
                                throw new Error('Redis PING failed');
                            this.storage = storage;
                            this.ready = true;
                            return [3 /*break*/, 8];
                        case 7:
                            error_1 = _a.sent();
                            this.logger.error("\u8F6C\u6362\u670D\u52A1\u521D\u59CB\u5316\u5931\u8D25\uFF1A".concat((error_1 === null || error_1 === void 0 ? void 0 : error_1.message) || error_1));
                            this.ready = false;
                            this.storage = null;
                            return [3 /*break*/, 8];
                        case 8: return [2 /*return*/];
                    }
                });
            });
        };
        ConversionService_1.prototype.onModuleDestroy = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    this.redis.disconnect();
                    return [2 /*return*/];
                });
            });
        };
        ConversionService_1.prototype.requireReady = function () {
            if (!this.ready || !this.storage)
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '格式转换服务暂不可用');
            return this.storage;
        };
        ConversionService_1.prototype.workerCapacity = function () {
            return __awaiter(this, void 0, void 0, function () {
                var raw, value;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.redis.get(WORKER_HEARTBEAT).catch(function () { return null; })];
                        case 1:
                            raw = _a.sent();
                            if (!raw)
                                return [2 /*return*/, null];
                            try {
                                value = JSON.parse(raw);
                                if (value.sourceRevision !== conversion_catalog_json_1.default.sourceRevision ||
                                    !Number.isSafeInteger(value.maxFileBytes) ||
                                    !Number.isSafeInteger(value.maxBatchBytes) ||
                                    !Number.isSafeInteger(value.maxFiles) ||
                                    Number(value.maxFileBytes) <= 0 ||
                                    Number(value.maxBatchBytes) <= 0 ||
                                    Number(value.maxFiles) <= 0)
                                    return [2 /*return*/, null];
                                return [2 /*return*/, {
                                        maxFileBytes: Math.min(this.maxFileBytes, Number(value.maxFileBytes)),
                                        maxBatchBytes: Math.min(this.maxBatchBytes, Number(value.maxBatchBytes)),
                                        maxFiles: Math.min(this.maxFiles, Number(value.maxFiles)),
                                    }];
                            }
                            catch (_b) {
                                return [2 /*return*/, null];
                            }
                            return [2 /*return*/];
                    }
                });
            });
        };
        ConversionService_1.prototype.capabilities = function () {
            return __awaiter(this, void 0, void 0, function () {
                var capacity, _a, storageOnline, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!this.ready) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.workerCapacity()];
                        case 1:
                            _a = _c.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            _a = null;
                            _c.label = 3;
                        case 3:
                            capacity = _a;
                            if (!(capacity && capacity.maxFileBytes > 0 && this.accepting && this.storage)) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.storage.bucketExists(this.bucket).catch(function () { return false; })];
                        case 4:
                            _b = _c.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            _b = false;
                            _c.label = 6;
                        case 6:
                            storageOnline = _b;
                            return [2 /*return*/, {
                                    available: Boolean(storageOnline && conversion_operations_1.ORIGINAL_CONVERSION_OPERATIONS.length > 0),
                                    operations: storageOnline ? conversion_operations_1.ORIGINAL_CONVERSION_OPERATIONS : [],
                                    limits: {
                                        maxFileBytes: (capacity === null || capacity === void 0 ? void 0 : capacity.maxFileBytes) || 0,
                                        maxBatchBytes: (capacity === null || capacity === void 0 ? void 0 : capacity.maxBatchBytes) || 0,
                                        maxFiles: (capacity === null || capacity === void 0 ? void 0 : capacity.maxFiles) || 0,
                                        chunkBytes: conversion_operations_1.CONVERSION_CHUNK_BYTES,
                                        retentionDays: 30,
                                        deviceVerified: false,
                                    },
                                }];
                    }
                });
            });
        };
        ConversionService_1.prototype.startUpload = function (userId, fileNameInput, sizeInput) {
            return __awaiter(this, void 0, void 0, function () {
                var fileName, totalBytes, extension, capacity, upload;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.requireReady();
                            if (!this.accepting)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '格式转换尚未开放');
                            fileName = safeName(String(fileNameInput || ''));
                            totalBytes = integer(sizeInput);
                            extension = (0, node_path_1.extname)(fileName).slice(1).toLowerCase();
                            if (!fileName ||
                                !extension ||
                                !conversion_operations_1.ORIGINAL_CONVERSION_OPERATIONS.some(function (op) { return op.inputExtensions.includes(extension); })) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '尚未开放该文件格式');
                            }
                            return [4 /*yield*/, this.workerCapacity()];
                        case 1:
                            capacity = _a.sent();
                            if (!capacity)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '转换引擎暂不可用');
                            if (!Number.isSafeInteger(totalBytes) || totalBytes <= 0 || totalBytes > capacity.maxFileBytes) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '文件大小超过当前上限');
                            }
                            return [4 /*yield*/, this.prisma.ledgerConversionUpload.create({
                                    data: {
                                        userId: userId,
                                        fileName: fileName,
                                        extension: extension,
                                        totalBytes: BigInt(totalBytes),
                                        chunkSize: conversion_operations_1.CONVERSION_CHUNK_BYTES,
                                        chunkCount: Math.ceil(totalBytes / conversion_operations_1.CONVERSION_CHUNK_BYTES),
                                        expiresAt: deadline(conversion_operations_1.CONVERSION_UPLOAD_TTL_MS),
                                    },
                                })];
                        case 2:
                            upload = _a.sent();
                            return [2 /*return*/, {
                                    id: upload.id,
                                    chunkBytes: upload.chunkSize,
                                    chunkCount: upload.chunkCount,
                                    uploadedParts: [],
                                }];
                    }
                });
            });
        };
        ConversionService_1.prototype.uploadStatus = function (userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var upload;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerConversionUpload.findFirst({
                                where: { id: id, userId: userId },
                                select: {
                                    status: true,
                                    chunkSize: true,
                                    chunkCount: true,
                                    expiresAt: true,
                                    chunks: { select: { index: true }, orderBy: { index: 'asc' } },
                                },
                            })];
                        case 1:
                            upload = _a.sent();
                            if (!upload || upload.expiresAt < new Date())
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '上传会话不存在或已过期');
                            return [2 /*return*/, {
                                    id: id,
                                    status: upload.status,
                                    chunkBytes: upload.chunkSize,
                                    chunkCount: upload.chunkCount,
                                    uploadedParts: upload.chunks.map(function (part) { return part.index; }),
                                }];
                    }
                });
            });
        };
        ConversionService_1.prototype.putChunk = function (userId, id, indexInput, file) {
            return __awaiter(this, void 0, void 0, function () {
                var storage, index_1, upload, expected, hash, _a, _b, _c, chunk, e_1_1, sha256_1, objectKey_1, error_2, prior;
                var _this = this;
                var _d, e_1, _e, _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0:
                            _g.trys.push([0, , 22, 25]);
                            storage = this.requireReady();
                            index_1 = integer(indexInput);
                            if (!Number.isInteger(index_1) || index_1 < 0)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '分片编号不正确');
                            return [4 /*yield*/, this.prisma.ledgerConversionUpload.findFirst({
                                    where: { id: id, userId: userId },
                                    select: {
                                        status: true,
                                        jobId: true,
                                        expiresAt: true,
                                        chunkSize: true,
                                        chunkCount: true,
                                        totalBytes: true,
                                        chunks: { where: { index: index_1 }, select: { sha256: true } },
                                    },
                                })];
                        case 1:
                            upload = _g.sent();
                            if (!upload || upload.status !== 'uploading' || upload.expiresAt < new Date() || upload.jobId) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '上传会话不可写');
                            }
                            expected = Math.min(upload.chunkSize, Number(upload.totalBytes) - index_1 * upload.chunkSize);
                            if (!Number.isInteger(index_1) ||
                                index_1 < 0 ||
                                index_1 >= upload.chunkCount ||
                                !(file === null || file === void 0 ? void 0 : file.path) ||
                                file.size !== expected ||
                                !Number.isSafeInteger(file.size)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '分片编号或长度不正确');
                            }
                            hash = (0, node_crypto_1.createHash)('sha256');
                            _g.label = 2;
                        case 2:
                            _g.trys.push([2, 7, 8, 13]);
                            _a = true, _b = __asyncValues((0, node_fs_1.createReadStream)(file.path));
                            _g.label = 3;
                        case 3: return [4 /*yield*/, _b.next()];
                        case 4:
                            if (!(_c = _g.sent(), _d = _c.done, !_d)) return [3 /*break*/, 6];
                            _f = _c.value;
                            _a = false;
                            chunk = _f;
                            hash.update(chunk);
                            _g.label = 5;
                        case 5:
                            _a = true;
                            return [3 /*break*/, 3];
                        case 6: return [3 /*break*/, 13];
                        case 7:
                            e_1_1 = _g.sent();
                            e_1 = { error: e_1_1 };
                            return [3 /*break*/, 13];
                        case 8:
                            _g.trys.push([8, , 11, 12]);
                            if (!(!_a && !_d && (_e = _b.return))) return [3 /*break*/, 10];
                            return [4 /*yield*/, _e.call(_b)];
                        case 9:
                            _g.sent();
                            _g.label = 10;
                        case 10: return [3 /*break*/, 12];
                        case 11:
                            if (e_1) throw e_1.error;
                            return [7 /*endfinally*/];
                        case 12: return [7 /*endfinally*/];
                        case 13:
                            sha256_1 = hash.digest('hex');
                            if (upload.chunks.length) {
                                if (upload.chunks[0].sha256 !== sha256_1)
                                    throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '该分片已存在且内容不同');
                                return [2 /*return*/, { index: index_1, sha256: sha256_1, uploaded: true }];
                            }
                            objectKey_1 = "ledger-conversions/".concat(userId, "/uploads/").concat(id, "/parts/").concat(index_1, "-").concat(sha256_1);
                            return [4 /*yield*/, storage.putObject(this.bucket, objectKey_1, (0, node_fs_1.createReadStream)(file.path), file.size, {
                                    'Content-Type': 'application/octet-stream',
                                })];
                        case 14:
                            _g.sent();
                            _g.label = 15;
                        case 15:
                            _g.trys.push([15, 17, , 21]);
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, tx.ledgerConversionChunk.create({
                                                    data: { uploadId: id, index: index_1, objectKey: objectKey_1, sizeBytes: file.size, sha256: sha256_1 },
                                                })];
                                            case 1:
                                                _a.sent();
                                                return [4 /*yield*/, tx.ledgerConversionUpload.update({
                                                        where: { id: id },
                                                        data: { receivedBytes: { increment: BigInt(file.size) } },
                                                    })];
                                            case 2:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 16:
                            _g.sent();
                            return [3 /*break*/, 21];
                        case 17:
                            error_2 = _g.sent();
                            return [4 /*yield*/, this.prisma.ledgerConversionChunk.findUnique({
                                    where: { uploadId_index: { uploadId: id, index: index_1 } },
                                })];
                        case 18:
                            prior = _g.sent();
                            if (!((prior === null || prior === void 0 ? void 0 : prior.sha256) !== sha256_1)) return [3 /*break*/, 20];
                            return [4 /*yield*/, storage.removeObject(this.bucket, objectKey_1).catch(function () { return undefined; })];
                        case 19:
                            _g.sent();
                            throw error_2;
                        case 20: return [3 /*break*/, 21];
                        case 21: return [2 /*return*/, { index: index_1, sha256: sha256_1, uploaded: true }];
                        case 22:
                            if (!(file === null || file === void 0 ? void 0 : file.path)) return [3 /*break*/, 24];
                            return [4 /*yield*/, (0, promises_1.rm)(file.path, { force: true })];
                        case 23:
                            _g.sent();
                            _g.label = 24;
                        case 24: return [7 /*endfinally*/];
                        case 25: return [2 /*return*/];
                    }
                });
            });
        };
        ConversionService_1.prototype.completeUpload = function (userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var upload;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.requireReady();
                            return [4 /*yield*/, this.prisma.ledgerConversionUpload.findFirst({
                                    where: { id: id, userId: userId },
                                    select: {
                                        status: true,
                                        jobId: true,
                                        expiresAt: true,
                                        chunkCount: true,
                                        totalBytes: true,
                                        chunks: {
                                            select: { index: true, sizeBytes: true },
                                            orderBy: { index: 'asc' },
                                        },
                                    },
                                })];
                        case 1:
                            upload = _a.sent();
                            if (!upload || upload.expiresAt < new Date() || upload.jobId)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '上传会话不存在或已过期');
                            if (upload.status === 'ready')
                                return [2 /*return*/, { id: id, status: 'ready' }];
                            if (upload.chunks.length !== upload.chunkCount ||
                                upload.chunks.some(function (part, index) { return part.index !== index; }) ||
                                upload.chunks.reduce(function (sum, part) { return sum + part.sizeBytes; }, 0) !== Number(upload.totalBytes)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '分片未全部上传');
                            }
                            return [4 /*yield*/, this.prisma.ledgerConversionUpload.update({
                                    where: { id: id },
                                    data: { status: 'ready', completedAt: new Date() },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { id: id, status: 'ready' }];
                    }
                });
            });
        };
        ConversionService_1.prototype.enqueue = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var key, fresh;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            key = "ledger:conversions:enqueued:".concat(id);
                            return [4 /*yield*/, this.redis.set(key, '1', 'EX', 60, 'NX')];
                        case 1:
                            fresh = _a.sent();
                            if (!fresh) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.redis.lpush(QUEUE, id)];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        ConversionService_1.prototype.createJob = function (userId, body) {
            return __awaiter(this, void 0, void 0, function () {
                var uploadIds, uploads, capacity, operation, options, pdfInput, blanks, storedOptions, job;
                var _this = this;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            this.requireReady();
                            if (!this.accepting)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '格式转换尚未开放');
                            uploadIds = Array.isArray(body === null || body === void 0 ? void 0 : body.uploadIds) ? __spreadArray([], new Set(body.uploadIds), true) : [];
                            if (!uploadIds.length ||
                                uploadIds.length > this.maxFiles ||
                                uploadIds.length !== ((_a = body.uploadIds) === null || _a === void 0 ? void 0 : _a.length) ||
                                uploadIds.some(function (id) { return typeof id !== 'string' || !id || id.length > 64; })) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '文件数超限或包含重复文件');
                            }
                            return [4 /*yield*/, this.prisma.ledgerConversionUpload.findMany({
                                    where: {
                                        id: { in: uploadIds },
                                        userId: userId,
                                        status: 'ready',
                                        jobId: null,
                                        expiresAt: { gt: new Date() },
                                    },
                                    select: { id: true, extension: true, totalBytes: true },
                                })];
                        case 1:
                            uploads = _b.sent();
                            return [4 /*yield*/, this.workerCapacity()];
                        case 2:
                            capacity = _b.sent();
                            if (!capacity)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '转换引擎暂不可用');
                            if (uploads.length !== uploadIds.length ||
                                uploadIds.length > capacity.maxFiles ||
                                uploads.reduce(function (sum, upload) { return sum + Number(upload.totalBytes); }, 0) > capacity.maxBatchBytes) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '文件不可用或批量大小超限');
                            }
                            operation = (0, conversion_operations_1.findConversionOperation)(String(body.operationId || ''), uploads.map(function (upload) { return upload.extension; }));
                            if (!operation)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '原版不支持该转换组合');
                            if (operation.id === 'merge-pdfs' && uploadIds.length < 2)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '合并 PDF 至少需要两个文件');
                            options = body.options || {};
                            if (typeof options !== 'object' ||
                                Array.isArray(options) ||
                                Object.entries(options).some(function (_a) {
                                    var key = _a[0], value = _a[1];
                                    return !operation.options.includes(key) || typeof value !== 'string' ||
                                        value.length > (key === 'blanks' ? 24 * 1024 : 80);
                                })) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '转换选项不正确');
                            }
                            if (operation.id === 'convert:pdf' &&
                                (options.splitMode !== undefined || options.groupSize !== undefined) &&
                                (!uploads.every(function (upload) { return upload.extension === 'pdf'; }) ||
                                    !['page', 'group'].includes(String(options.splitMode)) ||
                                    (options.splitMode === 'group'
                                        ? !/^[1-9]\d{0,2}$/.test(String(options.groupSize))
                                        : options.groupSize !== undefined))) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, 'PDF 拆分选项不正确');
                            }
                            pdfInput = operation.id === 'convert:pdf' &&
                                uploads.every(function (upload) { return upload.extension === 'pdf'; });
                            if ((options.pdfAction !== undefined || options.password !== undefined) &&
                                (!pdfInput || !['encrypt', 'decrypt'].includes(String(options.pdfAction)) ||
                                    !String(options.password || '').trim() || options.splitMode !== undefined ||
                                    options.groupSize !== undefined)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, 'PDF 加解密选项不正确');
                            }
                            if (options.videoCodec !== undefined && !['h264', 'h265', 'av1'].includes(String(options.videoCodec)))
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '视频编码选项不正确');
                            if (operation.id === 'convert:mov' && options.videoCodec === 'av1')
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, 'AV1 无法写入 MOV 容器，请改用 MP4 或 MKV');
                            if (options.textEncoding !== undefined &&
                                !['auto', 'utf-8', 'gb18030', 'utf-16le', 'utf-16be'].includes(String(options.textEncoding)))
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '文本编码选项不正确');
                            if (options.alphaBackground !== undefined &&
                                !/^[A-Za-z]+$|^0x[0-9A-Fa-f]{6,8}$|^#[0-9A-Fa-f]{6,8}$/.test(String(options.alphaBackground)))
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '透明背景色不正确');
                            blanks = options.blanks === undefined ? undefined : String(options.blanks);
                            if (blanks !== undefined &&
                                (operation.id !== 'images-to-pdf' || !blanks.trim() ||
                                    !blanks.split(',').every(function (item) {
                                        var position = Number(item.trim());
                                        return item.trim() !== '' && Number.isInteger(position) &&
                                            position >= 0 && position <= uploads.length;
                                    })))
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '空白页位置不正确');
                            if (Object.keys(options).some(function (key) {
                                return !uploads.every(function (upload) { var _a, _b; return (_b = (_a = operation.optionInputExtensions) === null || _a === void 0 ? void 0 : _a[key]) === null || _b === void 0 ? void 0 : _b.includes(upload.extension); });
                            }))
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '该输入格式不支持所选选项');
                            storedOptions = options.password === undefined ? options : __assign(__assign({}, options), { password: (0, conversion_secrets_1.encryptConversionPassword)(String(options.password)) });
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var created, attached;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, tx.ledgerConversionJob.create({
                                                    data: {
                                                        userId: userId,
                                                        operationId: operation.id,
                                                        uploadOrder: uploadIds,
                                                        options: storedOptions,
                                                    },
                                                })];
                                            case 1:
                                                created = _a.sent();
                                                return [4 /*yield*/, tx.ledgerConversionUpload.updateMany({
                                                        where: { id: { in: uploadIds }, userId: userId, status: 'ready', jobId: null },
                                                        data: {
                                                            jobId: created.id,
                                                            expiresAt: deadline(conversion_operations_1.CONVERSION_RETENTION_MS + conversion_operations_1.CONVERSION_UPLOAD_TTL_MS),
                                                        },
                                                    })];
                                            case 2:
                                                attached = _a.sent();
                                                if (attached.count !== uploadIds.length)
                                                    throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '文件已被其他任务使用');
                                                return [2 /*return*/, created];
                                        }
                                    });
                                }); })];
                        case 3:
                            job = _b.sent();
                            return [4 /*yield*/, this.enqueue(job.id).catch(function (error) {
                                    return _this.logger.error("\u4EFB\u52A1\u5165\u961F\u5931\u8D25\uFF0C\u5B9A\u65F6\u6062\u590D\uFF1A".concat(error));
                                })];
                        case 4:
                            _b.sent();
                            return [2 /*return*/, { id: job.id, status: job.status }];
                    }
                });
            });
        };
        ConversionService_1.prototype.listJobs = function (userId_1) {
            return __awaiter(this, arguments, void 0, function (userId, skipInput) {
                var skip, jobs;
                var _this = this;
                if (skipInput === void 0) { skipInput = 0; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            skip = Math.max(0, Math.min(10000, integer(skipInput) || 0));
                            return [4 /*yield*/, this.prisma.ledgerConversionJob.findMany({
                                    where: { userId: userId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
                                    orderBy: { createdAt: 'desc' },
                                    skip: skip,
                                    take: 30,
                                    select: {
                                        id: true,
                                        operationId: true,
                                        uploadOrder: true,
                                        options: true,
                                        status: true,
                                        progress: true,
                                        error: true,
                                        createdAt: true,
                                        finishedAt: true,
                                        expiresAt: true,
                                        uploads: { select: { id: true, fileName: true, totalBytes: true } },
                                        assets: {
                                            select: { id: true, fileName: true, mimeType: true, sizeBytes: true },
                                            orderBy: { createdAt: 'asc' },
                                        },
                                    },
                                })];
                        case 1:
                            jobs = _a.sent();
                            return [2 /*return*/, jobs.map(function (job) { return _this.serializeJob(job); })];
                    }
                });
            });
        };
        ConversionService_1.prototype.getJob = function (userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var job;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerConversionJob.findFirst({
                                where: { id: id, userId: userId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
                                select: {
                                    id: true,
                                    operationId: true,
                                    uploadOrder: true,
                                    options: true,
                                    status: true,
                                    progress: true,
                                    error: true,
                                    createdAt: true,
                                    finishedAt: true,
                                    expiresAt: true,
                                    uploads: { select: { id: true, fileName: true, totalBytes: true } },
                                    assets: {
                                        select: { id: true, fileName: true, mimeType: true, sizeBytes: true },
                                        orderBy: { createdAt: 'asc' },
                                    },
                                },
                            })];
                        case 1:
                            job = _a.sent();
                            if (!job)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '任务不存在');
                            return [2 /*return*/, this.serializeJob(job)];
                    }
                });
            });
        };
        ConversionService_1.prototype.serializeJob = function (job) {
            var order = Array.isArray(job.uploadOrder) ? job.uploadOrder : [];
            return {
                id: job.id,
                operationId: job.operationId,
                options: Object.fromEntries(Object.entries(job.options || {}).filter(function (_a) {
                    var key = _a[0];
                    return key !== 'password' && key !== conversion_warnings_1.CONVERSION_WARNINGS_OPTION_KEY;
                })),
                warnings: job.status === 'succeeded' ? (0, conversion_warnings_1.publicConversionWarnings)(job.options) : [],
                status: job.status,
                progress: job.progress,
                error: job.error,
                createdAt: job.createdAt,
                finishedAt: job.finishedAt,
                expiresAt: job.expiresAt,
                uploads: job.uploads
                    .map(function (item) { return (__assign(__assign({}, item), { totalBytes: Number(item.totalBytes) })); })
                    .sort(function (a, b) { return order.indexOf(a.id) - order.indexOf(b.id); }),
                assets: job.assets.map(function (item) { return (__assign(__assign({}, item), { sizeBytes: Number(item.sizeBytes) })); }),
            };
        };
        ConversionService_1.prototype.cancelJob = function (userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var finishedAt, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            finishedAt = new Date();
                            return [4 /*yield*/, this.prisma.ledgerConversionJob.updateMany({
                                    where: { id: id, userId: userId, status: { in: ['queued', 'running'] } },
                                    data: {
                                        status: 'cancelled',
                                        leaseId: null,
                                        finishedAt: finishedAt,
                                        expiresAt: new Date(finishedAt.getTime() + conversion_operations_1.CONVERSION_RETENTION_MS),
                                    },
                                })];
                        case 1:
                            result = _a.sent();
                            if (!result.count)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '任务不存在或不可取消');
                            return [4 /*yield*/, this.prisma.ledgerConversionUpload.updateMany({
                                    where: { jobId: id },
                                    data: { expiresAt: deadline(conversion_operations_1.CONVERSION_RETENTION_MS) },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { id: id, status: 'cancelled' }];
                    }
                });
            });
        };
        ConversionService_1.prototype.retryJob = function (userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var previous, options, result;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.requireReady();
                            if (!this.accepting)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '格式转换尚未开放');
                            return [4 /*yield*/, this.prisma.ledgerConversionJob.findFirst({
                                    where: { id: id, userId: userId, status: 'failed', expiresAt: { gt: new Date() } },
                                    select: { options: true },
                                })];
                        case 1:
                            previous = _a.sent();
                            if (!previous)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '任务不存在或不可重试');
                            options = Object.fromEntries(Object.entries(previous.options || {}).filter(function (_a) {
                                var key = _a[0];
                                return key !== conversion_warnings_1.CONVERSION_WARNINGS_OPTION_KEY;
                            }));
                            return [4 /*yield*/, this.prisma.ledgerConversionJob.updateMany({
                                    where: { id: id, userId: userId, status: 'failed', expiresAt: { gt: new Date() } },
                                    data: {
                                        status: 'queued',
                                        progress: 0,
                                        error: null,
                                        startedAt: null,
                                        heartbeatAt: null,
                                        leaseId: null,
                                        finishedAt: null,
                                        expiresAt: null,
                                        options: options,
                                    },
                                })];
                        case 2:
                            result = _a.sent();
                            if (!result.count)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '任务不存在或不可重试');
                            return [4 /*yield*/, this.prisma.ledgerConversionUpload.updateMany({
                                    where: { jobId: id },
                                    data: { expiresAt: deadline(conversion_operations_1.CONVERSION_RETENTION_MS + conversion_operations_1.CONVERSION_UPLOAD_TTL_MS) },
                                })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, this.enqueue(id).catch(function (error) { return _this.logger.error("\u91CD\u8BD5\u5165\u961F\u5931\u8D25\uFF0C\u5B9A\u65F6\u6062\u590D\uFF1A".concat(error)); })];
                        case 4:
                            _a.sent();
                            return [2 /*return*/, { id: id, status: 'queued' }];
                    }
                });
            });
        };
        ConversionService_1.prototype.deleteJob = function (userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var job, locked;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerConversionJob.findFirst({
                                where: { id: id, userId: userId },
                                select: { status: true, finishedAt: true, expiresAt: true },
                            })];
                        case 1:
                            job = _a.sent();
                            if (!job)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '任务不存在');
                            if (job.status === 'running')
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请先取消运行中的任务');
                            return [4 /*yield*/, this.prisma.ledgerConversionJob.updateMany({
                                    where: { id: id, userId: userId, status: { not: 'running' } },
                                    data: {
                                        status: 'cancelled',
                                        finishedAt: job.finishedAt || new Date(),
                                        expiresAt: job.expiresAt || deadline(conversion_operations_1.CONVERSION_RETENTION_MS),
                                    },
                                })];
                        case 2:
                            locked = _a.sent();
                            if (!locked.count)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '任务状态已变化，请重试');
                            return [4 /*yield*/, this.removeJobObjects(id)];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.ledgerConversionJob.delete({ where: { id: id } })];
                        case 4:
                            _a.sent();
                            return [2 /*return*/, { id: id, deleted: true }];
                    }
                });
            });
        };
        ConversionService_1.prototype.purgeUser = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var jobs, _i, jobs_1, job, uploads, _a, uploads_1, upload;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            this.requireReady();
                            return [4 /*yield*/, this.prisma.ledgerConversionJob.updateMany({
                                    where: { userId: userId, status: { in: ['queued', 'running'] } },
                                    data: { status: 'cancelled', leaseId: null, finishedAt: new Date() },
                                })];
                        case 1:
                            _b.sent();
                            return [4 /*yield*/, this.prisma.ledgerConversionJob.findMany({
                                    where: { userId: userId },
                                    select: { id: true },
                                })];
                        case 2:
                            jobs = _b.sent();
                            _i = 0, jobs_1 = jobs;
                            _b.label = 3;
                        case 3:
                            if (!(_i < jobs_1.length)) return [3 /*break*/, 7];
                            job = jobs_1[_i];
                            return [4 /*yield*/, this.removeJobObjects(job.id)];
                        case 4:
                            _b.sent();
                            return [4 /*yield*/, this.prisma.ledgerConversionJob.delete({ where: { id: job.id } })];
                        case 5:
                            _b.sent();
                            _b.label = 6;
                        case 6:
                            _i++;
                            return [3 /*break*/, 3];
                        case 7: return [4 /*yield*/, this.prisma.ledgerConversionUpload.findMany({
                                where: { userId: userId },
                                select: { id: true },
                            })];
                        case 8:
                            uploads = _b.sent();
                            _a = 0, uploads_1 = uploads;
                            _b.label = 9;
                        case 9:
                            if (!(_a < uploads_1.length)) return [3 /*break*/, 13];
                            upload = uploads_1[_a];
                            return [4 /*yield*/, this.removePrefix("ledger-conversions/".concat(userId, "/uploads/").concat(upload.id, "/"))];
                        case 10:
                            _b.sent();
                            return [4 /*yield*/, this.prisma.ledgerConversionUpload.delete({ where: { id: upload.id } })];
                        case 11:
                            _b.sent();
                            _b.label = 12;
                        case 12:
                            _a++;
                            return [3 /*break*/, 9];
                        case 13: return [2 /*return*/, { userId: userId, jobsDeleted: jobs.length, pendingUploadsDeleted: uploads.length }];
                    }
                });
            });
        };
        ConversionService_1.prototype.asset = function (userId, jobId, assetId, range) {
            return __awaiter(this, void 0, void 0, function () {
                var storage, asset, size, match, suffix, start, requestedEnd, end;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            storage = this.requireReady();
                            return [4 /*yield*/, this.prisma.ledgerConversionAsset.findFirst({
                                    where: {
                                        id: assetId,
                                        jobId: jobId,
                                        job: { userId: userId, status: 'succeeded', expiresAt: { gt: new Date() } },
                                    },
                                    select: { id: true, objectKey: true, fileName: true, mimeType: true, sizeBytes: true },
                                })];
                        case 1:
                            asset = _c.sent();
                            if (!asset)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '结果不存在');
                            size = Number(asset.sizeBytes);
                            if (!Number.isSafeInteger(size) || size < 0)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '结果文件大小无效');
                            if (!!range) return [3 /*break*/, 3];
                            _a = {
                                asset: asset
                            };
                            return [4 /*yield*/, storage.getObject(this.bucket, asset.objectKey)];
                        case 2: return [2 /*return*/, (_a.stream = _c.sent(),
                                _a.statusCode = 200,
                                _a.contentLength = size,
                                _a)];
                        case 3:
                            match = /^bytes=(\d*)-(\d*)$/i.exec(range.trim());
                            suffix = match && !match[1] && match[2] ? Number(match[2]) : NaN;
                            start = Number.isSafeInteger(suffix) && suffix > 0
                                ? Math.max(0, size - suffix)
                                : match && match[1] ? Number(match[1]) : NaN;
                            requestedEnd = match && match[1] && match[2] ? Number(match[2]) : size - 1;
                            if (!Number.isSafeInteger(start) ||
                                !Number.isSafeInteger(requestedEnd) ||
                                start >= size ||
                                requestedEnd < start)
                                throw new common_1.HttpException('无效的文件范围', 416);
                            end = Math.min(requestedEnd, size - 1);
                            _b = {
                                asset: asset
                            };
                            return [4 /*yield*/, storage.getPartialObject(this.bucket, asset.objectKey, start, end - start + 1)];
                        case 4: return [2 /*return*/, (_b.stream = _c.sent(),
                                _b.statusCode = 206,
                                _b.contentLength = end - start + 1,
                                _b.contentRange = "bytes ".concat(start, "-").concat(end, "/").concat(size),
                                _b)];
                    }
                });
            });
        };
        ConversionService_1.prototype.removeJobObjects = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var job, uploads, _i, uploads_2, upload;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerConversionJob.findUniqueOrThrow({
                                where: { id: id },
                                select: { userId: true },
                            })];
                        case 1:
                            job = _a.sent();
                            return [4 /*yield*/, this.prisma.ledgerConversionUpload.findMany({
                                    where: { jobId: id },
                                    select: { id: true },
                                })];
                        case 2:
                            uploads = _a.sent();
                            return [4 /*yield*/, this.removePrefix("ledger-conversions/".concat(job.userId, "/jobs/").concat(id, "/"))];
                        case 3:
                            _a.sent();
                            _i = 0, uploads_2 = uploads;
                            _a.label = 4;
                        case 4:
                            if (!(_i < uploads_2.length)) return [3 /*break*/, 7];
                            upload = uploads_2[_i];
                            return [4 /*yield*/, this.removePrefix("ledger-conversions/".concat(job.userId, "/uploads/").concat(upload.id, "/"))];
                        case 5:
                            _a.sent();
                            _a.label = 6;
                        case 6:
                            _i++;
                            return [3 /*break*/, 4];
                        case 7: return [4 /*yield*/, this.prisma.ledgerConversionUpload.deleteMany({ where: { jobId: id } })];
                        case 8:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        ConversionService_1.prototype.removePrefix = function (prefix) {
            return __awaiter(this, void 0, void 0, function () {
                var storage, keys, _a, _b, _c, entry, e_2_1, i;
                var _d, e_2, _e, _f;
                var _g;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0:
                            storage = this.requireReady();
                            keys = [];
                            _h.label = 1;
                        case 1:
                            _h.trys.push([1, 6, 7, 12]);
                            _a = true, _b = __asyncValues(storage.listObjectsV2(this.bucket, prefix, true));
                            _h.label = 2;
                        case 2: return [4 /*yield*/, _b.next()];
                        case 3:
                            if (!(_c = _h.sent(), _d = _c.done, !_d)) return [3 /*break*/, 5];
                            _f = _c.value;
                            _a = false;
                            entry = _f;
                            if ((_g = entry.name) === null || _g === void 0 ? void 0 : _g.startsWith(prefix))
                                keys.push(entry.name);
                            _h.label = 4;
                        case 4:
                            _a = true;
                            return [3 /*break*/, 2];
                        case 5: return [3 /*break*/, 12];
                        case 6:
                            e_2_1 = _h.sent();
                            e_2 = { error: e_2_1 };
                            return [3 /*break*/, 12];
                        case 7:
                            _h.trys.push([7, , 10, 11]);
                            if (!(!_a && !_d && (_e = _b.return))) return [3 /*break*/, 9];
                            return [4 /*yield*/, _e.call(_b)];
                        case 8:
                            _h.sent();
                            _h.label = 9;
                        case 9: return [3 /*break*/, 11];
                        case 10:
                            if (e_2) throw e_2.error;
                            return [7 /*endfinally*/];
                        case 11: return [7 /*endfinally*/];
                        case 12:
                            i = 0;
                            _h.label = 13;
                        case 13:
                            if (!(i < keys.length)) return [3 /*break*/, 16];
                            return [4 /*yield*/, storage.removeObjects(this.bucket, keys.slice(i, i + 1000))];
                        case 14:
                            _h.sent();
                            _h.label = 15;
                        case 15:
                            i += 1000;
                            return [3 /*break*/, 13];
                        case 16: return [2 /*return*/];
                    }
                });
            });
        };
        ConversionService_1.prototype.cleanupExpired = function () {
            return __awaiter(this, void 0, void 0, function () {
                var jobs, _i, jobs_2, job, error_3, orphans, _a, orphans_1, upload, error_4;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!this.ready)
                                return [2 /*return*/];
                            return [4 /*yield*/, this.prisma.ledgerConversionJob.findMany({
                                    where: { expiresAt: { lt: new Date() } },
                                    take: 50,
                                    select: { id: true },
                                })];
                        case 1:
                            jobs = _b.sent();
                            _i = 0, jobs_2 = jobs;
                            _b.label = 2;
                        case 2:
                            if (!(_i < jobs_2.length)) return [3 /*break*/, 8];
                            job = jobs_2[_i];
                            _b.label = 3;
                        case 3:
                            _b.trys.push([3, 6, , 7]);
                            return [4 /*yield*/, this.removeJobObjects(job.id)];
                        case 4:
                            _b.sent();
                            return [4 /*yield*/, this.prisma.ledgerConversionJob.delete({ where: { id: job.id } })];
                        case 5:
                            _b.sent();
                            return [3 /*break*/, 7];
                        case 6:
                            error_3 = _b.sent();
                            this.logger.error("\u6E05\u7406\u4EFB\u52A1 ".concat(job.id, " \u5931\u8D25\uFF1A").concat(error_3));
                            return [3 /*break*/, 7];
                        case 7:
                            _i++;
                            return [3 /*break*/, 2];
                        case 8: return [4 /*yield*/, this.prisma.ledgerConversionUpload.findMany({
                                where: { jobId: null, expiresAt: { lt: new Date() } },
                                take: 100,
                                select: { id: true, userId: true },
                            })];
                        case 9:
                            orphans = _b.sent();
                            _a = 0, orphans_1 = orphans;
                            _b.label = 10;
                        case 10:
                            if (!(_a < orphans_1.length)) return [3 /*break*/, 16];
                            upload = orphans_1[_a];
                            _b.label = 11;
                        case 11:
                            _b.trys.push([11, 14, , 15]);
                            return [4 /*yield*/, this.removePrefix("ledger-conversions/".concat(upload.userId, "/uploads/").concat(upload.id, "/"))];
                        case 12:
                            _b.sent();
                            return [4 /*yield*/, this.prisma.ledgerConversionUpload.delete({ where: { id: upload.id } })];
                        case 13:
                            _b.sent();
                            return [3 /*break*/, 15];
                        case 14:
                            error_4 = _b.sent();
                            this.logger.error("\u6E05\u7406\u4E0A\u4F20 ".concat(upload.id, " \u5931\u8D25\uFF1A").concat(error_4));
                            return [3 /*break*/, 15];
                        case 15:
                            _a++;
                            return [3 /*break*/, 10];
                        case 16: return [2 /*return*/];
                    }
                });
            });
        };
        ConversionService_1.prototype.recoverQueue = function () {
            return __awaiter(this, void 0, void 0, function () {
                var jobs, _i, jobs_3, job;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this.ready)
                                return [2 /*return*/];
                            return [4 /*yield*/, this.prisma.ledgerConversionJob.updateMany({
                                    where: { status: 'running', heartbeatAt: { lt: new Date(Date.now() - 120000) } },
                                    data: { status: 'queued', heartbeatAt: null, leaseId: null, progress: 0 },
                                })];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.ledgerConversionJob.findMany({
                                    where: { status: 'queued' },
                                    select: { id: true },
                                    take: 100,
                                })];
                        case 2:
                            jobs = _a.sent();
                            _i = 0, jobs_3 = jobs;
                            _a.label = 3;
                        case 3:
                            if (!(_i < jobs_3.length)) return [3 /*break*/, 6];
                            job = jobs_3[_i];
                            return [4 /*yield*/, this.enqueue(job.id).catch(function () { return undefined; })];
                        case 4:
                            _a.sent();
                            _a.label = 5;
                        case 5:
                            _i++;
                            return [3 /*break*/, 3];
                        case 6: return [2 /*return*/];
                    }
                });
            });
        };
        return ConversionService_1;
    }());
    __setFunctionName(_classThis, "ConversionService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _retryInitialization_decorators = [(0, schedule_1.Cron)('*/30 * * * * *')];
        _cleanupExpired_decorators = [(0, schedule_1.Cron)('0 * * * *')];
        _recoverQueue_decorators = [(0, schedule_1.Cron)('*/1 * * * *')];
        __esDecorate(_classThis, null, _retryInitialization_decorators, { kind: "method", name: "retryInitialization", static: false, private: false, access: { has: function (obj) { return "retryInitialization" in obj; }, get: function (obj) { return obj.retryInitialization; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _cleanupExpired_decorators, { kind: "method", name: "cleanupExpired", static: false, private: false, access: { has: function (obj) { return "cleanupExpired" in obj; }, get: function (obj) { return obj.cleanupExpired; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _recoverQueue_decorators, { kind: "method", name: "recoverQueue", static: false, private: false, access: { has: function (obj) { return "recoverQueue" in obj; }, get: function (obj) { return obj.recoverQueue; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ConversionService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ConversionService = _classThis;
}();
exports.ConversionService = ConversionService;
