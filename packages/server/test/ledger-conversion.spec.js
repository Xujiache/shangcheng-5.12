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
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
Object.defineProperty(exports, "__esModule", { value: true });
var node_crypto_1 = require("node:crypto");
var promises_1 = require("node:fs/promises");
var node_os_1 = require("node:os");
var node_path_1 = require("node:path");
var minio_1 = require("minio");
var conversion_service_1 = require("../src/modules/ledger-conversion/conversion.service");
var conversion_operations_1 = require("../src/modules/ledger-conversion/conversion.operations");
var conversion_storage_1 = require("../src/modules/ledger-conversion/conversion.storage");
var conversion_catalog_json_1 = require("../src/modules/ledger-conversion/conversion.catalog.json");
var conversion_secrets_1 = require("../src/modules/ledger-conversion/conversion.secrets");
describe('ledger conversion gate', function () {
    test('PDF password is authenticated encryption at rest', function () {
        var original = process.env.CONVERSION_PASSWORD_KEY;
        process.env.CONVERSION_PASSWORD_KEY = 'a'.repeat(64);
        try {
            var stored = (0, conversion_secrets_1.encryptConversionPassword)('correct horse battery staple');
            expect(stored).not.toContain('correct horse battery staple');
            expect((0, conversion_secrets_1.decryptConversionPassword)(stored)).toBe('correct horse battery staple');
            var tampered_1 = stored.split(':');
            tampered_1[2] = Buffer.alloc(16).toString('base64url');
            expect(function () { return (0, conversion_secrets_1.decryptConversionPassword)(tampered_1.join(':')); }).toThrow();
        }
        finally {
            if (original === undefined)
                delete process.env.CONVERSION_PASSWORD_KEY;
            else
                process.env.CONVERSION_PASSWORD_KEY = original;
        }
    });
    test('catalogue follows every pair in pinned original source', function () {
        var _a, _b, _c, _d, _e, _f;
        var pairs = conversion_operations_1.ORIGINAL_CONVERSION_OPERATIONS
            .filter(function (operation) { return operation.kind === 'convert'; })
            .flatMap(function (operation) { return operation.inputExtensions.map(function (source) { return "".concat(source, ":").concat(operation.targetExtension); }); });
        expect(pairs).toHaveLength(1174);
        expect(new Set(pairs).size).toBe(1174);
        expect((0, conversion_operations_1.findConversionOperation)('convert:pdf', ['ofd'])).toBeTruthy();
        expect((0, conversion_operations_1.findConversionOperation)('convert:png', ['x3f'])).toBeTruthy();
        expect((_a = (0, conversion_operations_1.findConversionOperation)('convert:pdf', ['pdf'])) === null || _a === void 0 ? void 0 : _a.options).toEqual(expect.arrayContaining(['pdfAction', 'password', 'splitMode', 'groupSize']));
        var video = (0, conversion_operations_1.findConversionOperation)('convert:mp4', ['png']);
        expect((_b = video === null || video === void 0 ? void 0 : video.optionInputExtensions) === null || _b === void 0 ? void 0 : _b.videoCodec).not.toContain('png');
        expect((_c = video === null || video === void 0 ? void 0 : video.optionInputExtensions) === null || _c === void 0 ? void 0 : _c.videoCodec).toContain('mov');
        expect((_d = video === null || video === void 0 ? void 0 : video.optionInputExtensions) === null || _d === void 0 ? void 0 : _d.alphaBackground).not.toContain('mp3');
        expect((_e = video === null || video === void 0 ? void 0 : video.optionInputExtensions) === null || _e === void 0 ? void 0 : _e.alphaBackground).toContain('mov');
        expect((_f = (0, conversion_operations_1.findConversionOperation)('images-to-pdf', ['png', 'jpeg'])) === null || _f === void 0 ? void 0 : _f.options).toContain('blanks');
        expect((0, conversion_operations_1.findConversionOperation)('merge-pdfs', ['pdf', 'pdf'])).toBeTruthy();
        expect((0, conversion_operations_1.findConversionOperation)('convert:png', ['exe'])).toBeNull();
    });
    test('dedicated conversion bucket rejects anonymous read policy', function () { return __awaiter(void 0, void 0, void 0, function () {
        var storage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    storage = {
                        getBucketPolicy: jest.fn().mockResolvedValue(JSON.stringify({
                            Statement: [{ Effect: 'Allow', Principal: '*', Action: 's3:GetObject' }],
                        })),
                    };
                    return [4 /*yield*/, expect((0, conversion_storage_1.assertPrivateConversionBucket)(storage, 'private')).rejects.toThrow('匿名访问')];
                case 1:
                    _a.sent();
                    storage.getBucketPolicy.mockRejectedValue({ code: 'NoSuchBucketPolicy' });
                    return [4 /*yield*/, expect((0, conversion_storage_1.assertPrivateConversionBucket)(storage, 'private')).resolves.toBeUndefined()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    function service(prisma) {
        var instance = new conversion_service_1.ConversionService(prisma);
        instance.ready = true;
        instance.accepting = true;
        instance.storage = {
            putObject: jest.fn(), getObject: jest.fn(), bucketExists: jest.fn().mockResolvedValue(true),
        };
        jest.spyOn(instance, 'workerCapacity').mockResolvedValue({
            maxFileBytes: 16 * Math.pow(1024, 3),
            maxBatchBytes: 32 * Math.pow(1024, 3),
            maxFiles: 1000,
        });
        return instance;
    }
    test('worker capacity is tied to the pinned engine revision', function () { return __awaiter(void 0, void 0, void 0, function () {
        var instance, heartbeat;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    instance = service({});
                    instance.workerCapacity.mockRestore();
                    heartbeat = jest.spyOn(instance.redis, 'get');
                    heartbeat.mockResolvedValueOnce(JSON.stringify({
                        sourceRevision: 'wrong', maxFileBytes: 10, maxBatchBytes: 10, maxFiles: 1,
                    })).mockResolvedValueOnce(JSON.stringify({
                        sourceRevision: conversion_catalog_json_1.default.sourceRevision, maxFileBytes: 10, maxBatchBytes: 20, maxFiles: 1,
                    }));
                    return [4 /*yield*/, expect(instance.workerCapacity()).resolves.toBeNull()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, expect(instance.workerCapacity()).resolves.toEqual({
                            maxFileBytes: 10, maxBatchBytes: 20, maxFiles: 1,
                        })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, instance.onModuleDestroy()];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test('recovers storage initialization after a dependency starts late', function () { return __awaiter(void 0, void 0, void 0, function () {
        var keys, previous, bucket, policy, instance, ping;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    keys = ['CONVERSION_FEATURE_ENABLED', 'CONVERSION_BUCKET', 'S3_BUCKET'];
                    previous = keys.map(function (key) { return process.env[key]; });
                    process.env.CONVERSION_FEATURE_ENABLED = 'true';
                    process.env.CONVERSION_BUCKET = 'private';
                    process.env.S3_BUCKET = 'public';
                    bucket = jest
                        .spyOn(minio_1.Client.prototype, 'bucketExists')
                        .mockRejectedValueOnce(new Error('storage offline'))
                        .mockResolvedValue(true);
                    policy = jest
                        .spyOn(minio_1.Client.prototype, 'getBucketPolicy')
                        .mockRejectedValue({ code: 'NoSuchBucketPolicy' });
                    instance = new conversion_service_1.ConversionService({});
                    ping = jest.spyOn(instance.redis, 'ping').mockResolvedValue('PONG');
                    jest.spyOn(instance.logger, 'error').mockImplementation(function () { return undefined; });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 4, 6]);
                    return [4 /*yield*/, instance.onModuleInit()];
                case 2:
                    _a.sent();
                    expect(instance.ready).toBe(false);
                    return [4 /*yield*/, Promise.all([instance.retryInitialization(), instance.retryInitialization()])];
                case 3:
                    _a.sent();
                    expect(instance.ready).toBe(true);
                    expect(bucket).toHaveBeenCalledTimes(2);
                    expect(ping).toHaveBeenCalledTimes(1);
                    return [3 /*break*/, 6];
                case 4: return [4 /*yield*/, instance.onModuleDestroy()];
                case 5:
                    _a.sent();
                    bucket.mockRestore();
                    policy.mockRestore();
                    keys.forEach(function (key, index) {
                        if (previous[index] === undefined)
                            delete process.env[key];
                        else
                            process.env[key] = previous[index];
                    });
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); });
    test('capabilities fail closed without a live worker heartbeat', function () { return __awaiter(void 0, void 0, void 0, function () {
        var instance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    instance = service({});
                    jest.spyOn(instance, 'workerCapacity').mockResolvedValue(null);
                    return [4 /*yield*/, expect(instance.capabilities()).resolves.toMatchObject({
                            available: false,
                            operations: [],
                        })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, instance.onModuleDestroy()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test('capabilities hide operations during a storage outage and recover afterward', function () { return __awaiter(void 0, void 0, void 0, function () {
        var instance, bucket, restored;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    instance = service({});
                    bucket = jest
                        .fn()
                        .mockRejectedValueOnce(new Error('storage offline'))
                        .mockResolvedValue(true);
                    instance.storage.bucketExists = bucket;
                    return [4 /*yield*/, expect(instance.capabilities()).resolves.toMatchObject({
                            available: false,
                            operations: [],
                        })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, instance.capabilities()];
                case 2:
                    restored = _a.sent();
                    expect(restored.available).toBe(true);
                    expect(restored.operations.find(function (operation) { return operation.id === 'convert:csv'; })).toMatchObject({
                        inputExtensions: expect.arrayContaining(['tsv']),
                    });
                    expect(bucket).toHaveBeenCalledTimes(2);
                    return [4 /*yield*/, instance.onModuleDestroy()];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test('rejects unsupported extension before creating upload', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, instance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = { ledgerConversionUpload: { create: jest.fn() } };
                    instance = service(prisma);
                    return [4 /*yield*/, expect(instance.startUpload('u1', 'secret.exe', 10)).rejects.toThrow('尚未开放')];
                case 1:
                    _a.sent();
                    expect(prisma.ledgerConversionUpload.create).not.toHaveBeenCalled();
                    return [4 /*yield*/, instance.onModuleDestroy()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test('uses original per-file and batch limits without a text-only cap', function () { return __awaiter(void 0, void 0, void 0, function () {
        var previous, prisma, instance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    previous = process.env.CONVERSION_MAX_FILE_BYTES;
                    delete process.env.CONVERSION_MAX_FILE_BYTES;
                    prisma = {
                        ledgerConversionUpload: {
                            create: jest.fn().mockImplementation(function (_a) {
                                var data = _a.data;
                                return Promise.resolve({
                                    id: 'upload', chunkSize: data.chunkSize, chunkCount: data.chunkCount,
                                });
                            }),
                        },
                    };
                    instance = service(prisma);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 6, 8]);
                    return [4 /*yield*/, expect(instance.capabilities()).resolves.toMatchObject({
                            limits: {
                                maxFileBytes: 16 * Math.pow(1024, 3),
                                maxBatchBytes: 32 * Math.pow(1024, 3),
                                maxFiles: 1000,
                            },
                        })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, expect(instance.startUpload('u1', 'large.mp4', 96000000)).resolves.toMatchObject({ chunkCount: 12 })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, expect(instance.startUpload('u1', 'large.txt', 96000000)).resolves.toMatchObject({ chunkCount: 12 })];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, expect(instance.startUpload('u1', 'too-large.mp4', 16 * Math.pow(1024, 3) + 1))
                            .rejects.toThrow('文件大小超过当前上限')];
                case 5:
                    _a.sent();
                    expect(prisma.ledgerConversionUpload.create).toHaveBeenCalledTimes(2);
                    return [3 /*break*/, 8];
                case 6: return [4 /*yield*/, instance.onModuleDestroy()];
                case 7:
                    _a.sent();
                    if (previous === undefined)
                        delete process.env.CONVERSION_MAX_FILE_BYTES;
                    else
                        process.env.CONVERSION_MAX_FILE_BYTES = previous;
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    }); });
    test('rejects another user upload when creating job', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, instance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = { ledgerConversionUpload: { findMany: jest.fn().mockResolvedValue([]) } };
                    instance = service(prisma);
                    return [4 /*yield*/, expect(instance.createJob('u1', { operationId: 'convert:md', uploadIds: ['foreign'], options: {} })).rejects.toThrow('文件不可用')];
                case 1:
                    _a.sent();
                    expect(prisma.ledgerConversionUpload.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: 'u1' }) }));
                    return [4 /*yield*/, instance.onModuleDestroy()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test('rejects malformed upload IDs before Prisma', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, instance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = { ledgerConversionUpload: { findMany: jest.fn() } };
                    instance = service(prisma);
                    return [4 /*yield*/, expect(instance.createJob('u1', { operationId: 'convert:md', uploadIds: [42] })).rejects.toThrow('文件数超限')];
                case 1:
                    _a.sent();
                    expect(prisma.ledgerConversionUpload.findMany).not.toHaveBeenCalled();
                    return [4 /*yield*/, instance.onModuleDestroy()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test('requires two PDFs for merge and validates PDF split options', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, instance, _i, _a, options, _b, _c, options;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    prisma = {
                        ledgerConversionUpload: {
                            findMany: jest.fn().mockResolvedValue([
                                { id: 'a', extension: 'pdf', totalBytes: 12n },
                            ]),
                        },
                        $transaction: jest.fn(),
                    };
                    instance = service(prisma);
                    return [4 /*yield*/, expect(instance.createJob('u1', {
                            operationId: 'merge-pdfs', uploadIds: ['a'],
                        })).rejects.toThrow('至少需要两个文件')];
                case 1:
                    _d.sent();
                    _i = 0, _a = [
                        { splitMode: 'bogus' },
                        { splitMode: 'group' },
                        { splitMode: 'group', groupSize: '0' },
                        { splitMode: 'group', groupSize: '1000' },
                        { splitMode: 'page', groupSize: '2' },
                    ];
                    _d.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 5];
                    options = _a[_i];
                    return [4 /*yield*/, expect(instance.createJob('u1', {
                            operationId: 'convert:pdf', uploadIds: ['a'],
                            options: options,
                        })).rejects.toThrow('PDF 拆分选项不正确')];
                case 3:
                    _d.sent();
                    _d.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    _b = 0, _c = [
                        { pdfAction: 'encrypt' },
                        { pdfAction: 'invalid', password: 'secret' },
                        { password: 'secret' },
                        { pdfAction: 'decrypt', password: 'secret', splitMode: 'page' },
                    ];
                    _d.label = 6;
                case 6:
                    if (!(_b < _c.length)) return [3 /*break*/, 9];
                    options = _c[_b];
                    return [4 /*yield*/, expect(instance.createJob('u1', {
                            operationId: 'convert:pdf', uploadIds: ['a'],
                            options: options,
                        })).rejects.toThrow('PDF 加解密选项不正确')];
                case 7:
                    _d.sent();
                    _d.label = 8;
                case 8:
                    _b++;
                    return [3 /*break*/, 6];
                case 9:
                    prisma.ledgerConversionUpload.findMany.mockResolvedValueOnce([
                        { id: 'a', extension: 'png', totalBytes: 12n },
                    ]);
                    return [4 /*yield*/, expect(instance.createJob('u1', {
                            operationId: 'convert:pdf', uploadIds: ['a'], options: { splitMode: 'page' },
                        })).rejects.toThrow('PDF 拆分选项不正确')];
                case 10:
                    _d.sent();
                    expect(prisma.$transaction).not.toHaveBeenCalled();
                    return [4 /*yield*/, instance.onModuleDestroy()];
                case 11:
                    _d.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test('validates repeated blank page positions against image order', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, instance, _i, _a, blanks;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma = {
                        ledgerConversionUpload: { findMany: jest.fn().mockResolvedValue([
                                { id: 'a', extension: 'png', totalBytes: 12n },
                                { id: 'b', extension: 'jpeg', totalBytes: 12n },
                            ]) },
                        $transaction: jest.fn().mockRejectedValue(new Error('validation passed')),
                    };
                    instance = service(prisma);
                    _i = 0, _a = ['3', '-1', '1.5', '1,,2', 'abc', '1,'];
                    _b.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 4];
                    blanks = _a[_i];
                    return [4 /*yield*/, expect(instance.createJob('u1', {
                            operationId: 'images-to-pdf', uploadIds: ['a', 'b'], options: { blanks: blanks },
                        })).rejects.toThrow('空白页位置不正确')];
                case 2:
                    _b.sent();
                    _b.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    expect(prisma.$transaction).not.toHaveBeenCalled();
                    return [4 /*yield*/, expect(instance.createJob('u1', {
                            operationId: 'images-to-pdf', uploadIds: ['a', 'b'], options: { blanks: '0,1,1,2' },
                        })).rejects.toThrow('validation passed')];
                case 5:
                    _b.sent();
                    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
                    return [4 /*yield*/, instance.onModuleDestroy()];
                case 6:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test('rejects options the original ignores for this input', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, instance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = {
                        ledgerConversionUpload: { findMany: jest.fn().mockResolvedValue([
                                { id: 'a', extension: 'png', totalBytes: 12n },
                            ]) },
                        $transaction: jest.fn(),
                    };
                    instance = service(prisma);
                    return [4 /*yield*/, expect(instance.createJob('u1', {
                            operationId: 'convert:mp4', uploadIds: ['a'], options: { videoCodec: 'h265' },
                        })).rejects.toThrow('该输入格式不支持所选选项')];
                case 1:
                    _a.sent();
                    expect(prisma.$transaction).not.toHaveBeenCalled();
                    return [4 /*yield*/, instance.onModuleDestroy()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test('rejects AV1 in MOV before enqueueing a job', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, instance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = {
                        ledgerConversionUpload: { findMany: jest.fn().mockResolvedValue([
                                { id: 'a', extension: 'webm', totalBytes: 12n },
                            ]) },
                        $transaction: jest.fn(),
                    };
                    instance = service(prisma);
                    return [4 /*yield*/, expect(instance.createJob('u1', {
                            operationId: 'convert:mov', uploadIds: ['a'], options: { videoCodec: 'av1' },
                        })).rejects.toThrow('AV1 无法写入 MOV 容器')];
                case 1:
                    _a.sent();
                    expect(prisma.$transaction).not.toHaveBeenCalled();
                    return [4 /*yield*/, instance.onModuleDestroy()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test('does not overwrite a previously uploaded chunk with different bytes', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, instance, directory, path;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = {
                        ledgerConversionUpload: {
                            findFirst: jest.fn().mockResolvedValue({
                                id: 'a',
                                userId: 'u1',
                                status: 'uploading',
                                jobId: null,
                                expiresAt: new Date(Date.now() + 60000),
                                chunkCount: 1,
                                chunkSize: 8,
                                totalBytes: 4n,
                                chunks: [{ sha256: 'different' }],
                            }),
                        },
                    };
                    instance = service(prisma);
                    return [4 /*yield*/, (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), 'ledger-chunk-test-'))];
                case 1:
                    directory = _a.sent();
                    path = (0, node_path_1.join)(directory, 'chunk');
                    return [4 /*yield*/, (0, promises_1.writeFile)(path, 'test')];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, expect(instance.putChunk('u1', 'a', '0', { path: path, size: 4 })).rejects.toThrow('内容不同')];
                case 3:
                    _a.sent();
                    expect(instance.storage.putObject).not.toHaveBeenCalled();
                    return [4 /*yield*/, instance.onModuleDestroy()];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, (0, promises_1.rm)(directory, { recursive: true, force: true })];
                case 5:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test('accepts replay of an identical chunk without storing twice', function () { return __awaiter(void 0, void 0, void 0, function () {
        var sha256, prisma, instance, directory, path;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sha256 = (0, node_crypto_1.createHash)('sha256').update('test').digest('hex');
                    prisma = {
                        ledgerConversionUpload: {
                            findFirst: jest.fn().mockResolvedValue({
                                id: 'a',
                                userId: 'u1',
                                status: 'uploading',
                                jobId: null,
                                expiresAt: new Date(Date.now() + 60000),
                                chunkCount: 1,
                                chunkSize: 8,
                                totalBytes: 4n,
                                chunks: [{ sha256: sha256 }],
                            }),
                        },
                    };
                    instance = service(prisma);
                    return [4 /*yield*/, (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), 'ledger-chunk-test-'))];
                case 1:
                    directory = _a.sent();
                    path = (0, node_path_1.join)(directory, 'chunk');
                    return [4 /*yield*/, (0, promises_1.writeFile)(path, 'test')];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, expect(instance.putChunk('u1', 'a', '0', { path: path, size: 4 }))
                            .resolves.toEqual({ index: 0, sha256: sha256, uploaded: true })];
                case 3:
                    _a.sent();
                    expect(instance.storage.putObject).not.toHaveBeenCalled();
                    return [4 /*yield*/, instance.onModuleDestroy()];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, (0, promises_1.rm)(directory, { recursive: true, force: true })];
                case 5:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test('will not mark an incomplete upload ready', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, instance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = {
                        ledgerConversionUpload: {
                            findFirst: jest.fn().mockResolvedValue({
                                id: 'a',
                                userId: 'u1',
                                status: 'uploading',
                                jobId: null,
                                expiresAt: new Date(Date.now() + 60000),
                                chunkCount: 2,
                                totalBytes: 4n,
                                chunks: [{ index: 0, sizeBytes: 2 }],
                            }),
                        },
                    };
                    instance = service(prisma);
                    return [4 /*yield*/, expect(instance.completeUpload('u1', 'a')).rejects.toThrow('分片未全部上传')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, instance.onModuleDestroy()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test('finishes complete chunks and records retention after cancellation', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, instance, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = {
                        ledgerConversionUpload: {
                            findFirst: jest.fn().mockResolvedValue({
                                id: 'a',
                                userId: 'u1',
                                status: 'uploading',
                                jobId: null,
                                expiresAt: new Date(Date.now() + 60000),
                                chunkCount: 2,
                                totalBytes: 4n,
                                chunks: [
                                    { index: 0, sizeBytes: 2 },
                                    { index: 1, sizeBytes: 2 },
                                ],
                            }),
                            update: jest.fn().mockResolvedValue({}),
                            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
                        },
                        ledgerConversionJob: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
                    };
                    instance = service(prisma);
                    return [4 /*yield*/, expect(instance.completeUpload('u1', 'a')).resolves.toEqual({ id: 'a', status: 'ready' })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, expect(instance.cancelJob('u1', 'j1')).resolves.toEqual({ id: 'j1', status: 'cancelled' })];
                case 2:
                    _a.sent();
                    data = prisma.ledgerConversionJob.updateMany.mock.calls[0][0].data;
                    expect(data.expiresAt.getTime() - data.finishedAt.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
                    return [4 /*yield*/, instance.onModuleDestroy()];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test('asset read is scoped to the owning ledger user', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, instance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = { ledgerConversionAsset: { findFirst: jest.fn().mockResolvedValue(null) } };
                    instance = service(prisma);
                    return [4 /*yield*/, expect(instance.asset('u1', 'j1', 'a1')).rejects.toThrow('结果不存在')];
                case 1:
                    _a.sent();
                    expect(prisma.ledgerConversionAsset.findFirst).toHaveBeenCalledWith({
                        where: {
                            id: 'a1',
                            jobId: 'j1',
                            job: { userId: 'u1', status: 'succeeded', expiresAt: { gt: expect.any(Date) } },
                        },
                        select: { id: true, objectKey: true, fileName: true, mimeType: true, sizeBytes: true },
                    });
                    return [4 /*yield*/, instance.onModuleDestroy()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test('asset ranges retain owner checks and return exact byte lengths', function () { return __awaiter(void 0, void 0, void 0, function () {
        var asset, prisma, instance, storage, _i, _a, range;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    asset = { id: 'a1', objectKey: 'private/result', sizeBytes: 10n };
                    prisma = { ledgerConversionAsset: { findFirst: jest.fn().mockResolvedValue(asset) } };
                    instance = service(prisma);
                    storage = {
                        getObject: jest.fn().mockResolvedValue('whole'),
                        getPartialObject: jest.fn().mockResolvedValue('part'),
                    };
                    instance.storage = storage;
                    return [4 /*yield*/, expect(instance.asset('u1', 'j1', 'a1')).resolves.toMatchObject({
                            stream: 'whole', statusCode: 200, contentLength: 10,
                        })];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, expect(instance.asset('u1', 'j1', 'a1', 'bytes=3-6')).resolves.toMatchObject({
                            stream: 'part', statusCode: 206, contentLength: 4, contentRange: 'bytes 3-6/10',
                        })];
                case 2:
                    _b.sent();
                    expect(storage.getPartialObject).toHaveBeenCalledWith('jiujiu-conversions', 'private/result', 3, 4);
                    return [4 /*yield*/, expect(instance.asset('u1', 'j1', 'a1', 'bytes=8-20')).resolves.toMatchObject({
                            contentLength: 2, contentRange: 'bytes 8-9/10',
                        })];
                case 3:
                    _b.sent();
                    return [4 /*yield*/, expect(instance.asset('u1', 'j1', 'a1', 'bytes=-4')).resolves.toMatchObject({
                            contentLength: 4, contentRange: 'bytes 6-9/10',
                        })];
                case 4:
                    _b.sent();
                    _i = 0, _a = ['bytes=10-', 'bytes=6-3', 'bytes=0-1,4-5', 'bytes=-0', 'bytes=-'];
                    _b.label = 5;
                case 5:
                    if (!(_i < _a.length)) return [3 /*break*/, 8];
                    range = _a[_i];
                    return [4 /*yield*/, expect(instance.asset('u1', 'j1', 'a1', range)).rejects.toMatchObject({ status: 416 })];
                case 6:
                    _b.sent();
                    _b.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 5];
                case 8:
                    expect(storage.getPartialObject).toHaveBeenCalledTimes(3);
                    expect(prisma.ledgerConversionAsset.findFirst).toHaveBeenCalledWith({
                        where: {
                            id: 'a1', jobId: 'j1',
                            job: { userId: 'u1', status: 'succeeded', expiresAt: { gt: expect.any(Date) } },
                        },
                        select: { id: true, objectKey: true, fileName: true, mimeType: true, sizeBytes: true },
                    });
                    return [4 /*yield*/, instance.onModuleDestroy()];
                case 9:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test('upload resume checks the ledger owner and expiry', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, instance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = {
                        ledgerConversionUpload: { findFirst: jest.fn().mockResolvedValue(null) },
                    };
                    instance = service(prisma);
                    return [4 /*yield*/, expect(instance.uploadStatus('u1', 'foreign')).rejects.toThrow('不存在或已过期')];
                case 1:
                    _a.sent();
                    expect(prisma.ledgerConversionUpload.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'foreign', userId: 'u1' } }));
                    return [4 /*yield*/, instance.onModuleDestroy()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test('failed job retry is owner-scoped and requeues only an unexpired job', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, instance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = {
                        ledgerConversionJob: {
                            findFirst: jest.fn().mockResolvedValue({
                                options: { password: 'secret', textEncoding: 'utf-8', __conversionWarnings: ['old warning'] },
                            }),
                            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
                        },
                        ledgerConversionUpload: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
                    };
                    instance = service(prisma);
                    jest.spyOn(instance, 'enqueue').mockResolvedValue(undefined);
                    return [4 /*yield*/, expect(instance.retryJob('u1', 'j1')).resolves.toEqual({ id: 'j1', status: 'queued' })];
                case 1:
                    _a.sent();
                    expect(prisma.ledgerConversionJob.updateMany).toHaveBeenCalledWith(expect.objectContaining({
                        where: { id: 'j1', userId: 'u1', status: 'failed', expiresAt: { gt: expect.any(Date) } },
                        data: expect.objectContaining({
                            status: 'queued', leaseId: null, expiresAt: null,
                            options: { password: 'secret', textEncoding: 'utf-8' },
                        }),
                    }));
                    return [4 /*yield*/, instance.onModuleDestroy()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test('expired job cleanup deletes private result and input objects', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, instance, storage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = {
                        ledgerConversionJob: {
                            findMany: jest.fn().mockResolvedValue([{ id: 'j1' }]),
                            findUniqueOrThrow: jest.fn().mockResolvedValue({ userId: 'u1' }),
                            delete: jest.fn().mockResolvedValue({}),
                        },
                        ledgerConversionUpload: {
                            findMany: jest
                                .fn()
                                .mockResolvedValueOnce([{ id: 'up1' }])
                                .mockResolvedValueOnce([]),
                            deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
                        },
                    };
                    instance = service(prisma);
                    storage = {
                        listObjectsV2: jest.fn().mockImplementation(function (_bucket, prefix) {
                            return (function () {
                                return __asyncGenerator(this, arguments, function () {
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, __await({ name: prefix + 'file' })];
                                            case 1: return [4 /*yield*/, _a.sent()];
                                            case 2:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                });
                            })();
                        }),
                        removeObjects: jest.fn().mockResolvedValue(undefined),
                    };
                    instance.storage = storage;
                    return [4 /*yield*/, instance.cleanupExpired()];
                case 1:
                    _a.sent();
                    expect(storage.removeObjects).toHaveBeenCalledWith('jiujiu-conversions', [
                        'ledger-conversions/u1/jobs/j1/file',
                    ]);
                    expect(storage.removeObjects).toHaveBeenCalledWith('jiujiu-conversions', [
                        'ledger-conversions/u1/uploads/up1/file',
                    ]);
                    expect(prisma.ledgerConversionJob.delete).toHaveBeenCalledWith({ where: { id: 'j1' } });
                    return [4 /*yield*/, instance.onModuleDestroy()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test('expired orphan cleanup keeps the upload owner in the object prefix', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, instance, storage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = {
                        ledgerConversionJob: { findMany: jest.fn().mockResolvedValue([]) },
                        ledgerConversionUpload: {
                            findMany: jest.fn().mockResolvedValue([{ id: 'up1', userId: 'u1' }]),
                            delete: jest.fn().mockResolvedValue({}),
                        },
                    };
                    instance = service(prisma);
                    storage = {
                        listObjectsV2: jest.fn().mockImplementation(function (_bucket, prefix) {
                            return (function () {
                                return __asyncGenerator(this, arguments, function () {
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, __await({ name: prefix + 'file' })];
                                            case 1: return [4 /*yield*/, _a.sent()];
                                            case 2:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                });
                            })();
                        }),
                        removeObjects: jest.fn().mockResolvedValue(undefined),
                    };
                    instance.storage = storage;
                    return [4 /*yield*/, instance.cleanupExpired()];
                case 1:
                    _a.sent();
                    expect(storage.listObjectsV2).toHaveBeenCalledWith('jiujiu-conversions', 'ledger-conversions/u1/uploads/up1/', true);
                    expect(prisma.ledgerConversionUpload.delete).toHaveBeenCalledWith({ where: { id: 'up1' } });
                    return [4 /*yield*/, instance.onModuleDestroy()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test('manual deletion failure still schedules queued job cleanup', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, instance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = {
                        ledgerConversionJob: {
                            findFirst: jest.fn().mockResolvedValue({ id: 'j1', status: 'queued', expiresAt: null }),
                            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
                        },
                    };
                    instance = service(prisma);
                    jest.spyOn(instance, 'removeJobObjects').mockRejectedValue(new Error('storage offline'));
                    return [4 /*yield*/, expect(instance.deleteJob('u1', 'j1')).rejects.toThrow('storage offline')];
                case 1:
                    _a.sent();
                    expect(prisma.ledgerConversionJob.updateMany.mock.calls[0][0].data.expiresAt).toBeInstanceOf(Date);
                    return [4 /*yield*/, instance.onModuleDestroy()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test('job history converts BigInt and omits internal lease identifiers', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, instance, jobs;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = {
                        ledgerConversionJob: {
                            findMany: jest.fn().mockResolvedValue([
                                {
                                    id: 'j1',
                                    operationId: 'convert:md',
                                    status: 'succeeded',
                                    progress: 100,
                                    options: { password: 'secret', __conversionWarnings: ['请核对 secret'] },
                                    uploadOrder: ['u2', 'u1'],
                                    leaseId: 'internal-secret',
                                    uploads: [
                                        { id: 'u1', fileName: 'a.txt', totalBytes: 1n },
                                        { id: 'u2', fileName: 'b.txt', totalBytes: 2n },
                                    ],
                                    assets: [{ id: 'a1', fileName: 'a.md', sizeBytes: 3n }],
                                },
                            ]),
                        },
                    };
                    instance = service(prisma);
                    return [4 /*yield*/, instance.listJobs('u1')];
                case 1:
                    jobs = _a.sent();
                    expect(jobs[0].uploads.map(function (item) { return item.id; })).toEqual(['u2', 'u1']);
                    expect(JSON.stringify(jobs)).not.toContain('internal-secret');
                    expect(jobs[0].assets[0].sizeBytes).toBe(3);
                    expect(jobs[0].warnings).toEqual(['请核对 ***']);
                    expect(jobs[0].options).toEqual({});
                    expect(JSON.stringify(jobs)).not.toContain('secret');
                    return [4 /*yield*/, instance.onModuleDestroy()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
