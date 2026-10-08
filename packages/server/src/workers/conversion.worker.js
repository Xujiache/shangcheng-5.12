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
Object.defineProperty(exports, "__esModule", { value: true });
var node_crypto_1 = require("node:crypto");
var node_child_process_1 = require("node:child_process");
var node_fs_1 = require("node:fs");
var promises_1 = require("node:fs/promises");
var node_os_1 = require("node:os");
var node_path_1 = require("node:path");
var promises_2 = require("node:stream/promises");
var node_stream_1 = require("node:stream");
var client_1 = require("@prisma/client");
var ioredis_1 = require("ioredis");
var minio_1 = require("minio");
var conversion_storage_1 = require("../modules/ledger-conversion/conversion.storage");
var conversion_warnings_1 = require("../modules/ledger-conversion/conversion.warnings");
var conversion_outputs_1 = require("./conversion.outputs");
var conversion_catalog_json_1 = require("../modules/ledger-conversion/conversion.catalog.json");
var conversion_secrets_1 = require("../modules/ledger-conversion/conversion.secrets");
var tool_events_service_1 = require("../modules/ledger/tool-events.service");
var conversion_capacity_1 = require("./conversion.capacity");
var QUEUE = 'ledger:conversions:queue';
var WORKER_HEARTBEAT = 'ledger:conversions:worker:online';
var RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
var sourceDir = process.env.FLYINGMOUSE_SOURCE_DIR || '/app/flyingmouse';
var bucket = process.env.CONVERSION_BUCKET || 'jiujiu-conversions';
var prisma = new client_1.PrismaClient();
var redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    lazyConnect: true,
    maxRetriesPerRequest: null,
});
var running = true;
var activeChild = null;
var safeOutputName = function (name) {
    return (0, node_path_1.basename)(String(name || '').replaceAll('\\', '/'))
        .replace(/[\x00-\x1f\x7f]/g, '')
        .slice(0, 180);
};
function minioClient() {
    var url = new URL(process.env.S3_ENDPOINT || 'http://127.0.0.1:9000');
    var accessKey = process.env.S3_ACCESS_KEY || '';
    var secretKey = process.env.S3_SECRET_KEY || '';
    if (process.env.NODE_ENV === 'production' && (!accessKey || !secretKey))
        throw new Error('S3 credentials missing');
    return new minio_1.Client({
        endPoint: url.hostname,
        port: Number(url.port) || (url.protocol === 'https:' ? 443 : 80),
        useSSL: url.protocol === 'https:',
        accessKey: accessKey || 'minioadmin',
        secretKey: secretKey || 'minioadmin',
    });
}
var storage = minioClient();
function workerCapacity() {
    return __awaiter(this, void 0, void 0, function () {
        var disk, freeDiskBytes, maxInputBytes;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, promises_1.statfs)((0, node_os_1.tmpdir)())];
                case 1:
                    disk = _a.sent();
                    freeDiskBytes = disk.bavail * disk.bsize;
                    maxInputBytes = Math.max(0, Math.floor((freeDiskBytes - Math.pow(1024, 3)) / 3));
                    return [2 /*return*/, {
                            sourceRevision: conversion_catalog_json_1.default.sourceRevision,
                            maxFileBytes: Math.min(16 * Math.pow(1024, 3), maxInputBytes),
                            maxBatchBytes: Math.min(32 * Math.pow(1024, 3), maxInputBytes),
                            maxFiles: 1000,
                            freeDiskBytes: freeDiskBytes,
                            freeMemoryBytes: (0, conversion_capacity_1.freeWorkerMemoryBytes)(),
                        }];
            }
        });
    });
}
function terminate(child) {
    if (!child.pid)
        return;
    try {
        process.kill(-child.pid, 'SIGTERM');
    }
    catch (_a) {
        child.kill('SIGTERM');
    }
    var timer = setTimeout(function () {
        try {
            process.kill(-child.pid, 'SIGKILL');
        }
        catch (_a) {
            child.kill('SIGKILL');
        }
    }, 5000);
    timer.unref();
}
function downloadUpload(upload, directory) {
    return __awaiter(this, void 0, void 0, function () {
        var original, extension, stem, fileName, uploadDir, filePath, _loop_1, _i, _a, part;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    original = (0, node_path_1.basename)(upload.fileName.replaceAll('\\', '/'));
                    extension = (0, node_path_1.extname)(original);
                    stem = original
                        .slice(0, -extension.length || undefined)
                        .replace(/[^\p{L}\p{N}._-]/gu, '_')
                        .slice(0, 100);
                    fileName = "".concat(stem).concat(extension);
                    uploadDir = (0, node_path_1.join)(directory, upload.id);
                    return [4 /*yield*/, (0, promises_1.mkdir)(uploadDir)];
                case 1:
                    _b.sent();
                    filePath = (0, node_path_1.join)(uploadDir, fileName);
                    _loop_1 = function (part) {
                        var hash, verify, _c;
                        return __generator(this, function (_d) {
                            switch (_d.label) {
                                case 0:
                                    hash = (0, node_crypto_1.createHash)('sha256');
                                    verify = new node_stream_1.Transform({
                                        transform: function (chunk, _encoding, callback) {
                                            hash.update(chunk);
                                            callback(null, chunk);
                                        },
                                    });
                                    _c = promises_2.pipeline;
                                    return [4 /*yield*/, storage.getObject(bucket, part.objectKey)];
                                case 1: return [4 /*yield*/, _c.apply(void 0, [_d.sent(), verify,
                                        (0, node_fs_1.createWriteStream)(filePath, { flags: 'a' })])];
                                case 2:
                                    _d.sent();
                                    if (hash.digest('hex') !== part.sha256)
                                        throw new Error("\u8F93\u5165\u5206\u7247\u6821\u9A8C\u5931\u8D25: ".concat(upload.id, "/").concat(part.index));
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, _a = upload.chunks;
                    _b.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 5];
                    part = _a[_i];
                    return [5 /*yield**/, _loop_1(part)];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [4 /*yield*/, (0, promises_1.stat)(filePath)];
                case 6:
                    if ((_b.sent()).size !== Number(upload.totalBytes))
                        throw new Error("\u8F93\u5165\u6587\u4EF6\u957F\u5EA6\u4E0D\u7B26: ".concat(upload.id));
                    return [2 /*return*/, filePath];
            }
        });
    });
}
function runEngine(jobId, leaseId, requestFile, runtimeDir) {
    return __awaiter(this, void 0, void 0, function () {
        var child, stdout, stderr, progressBuffer, latestProgress, persistedProgress, progressWriter, flushProgress, reportProgress, timeout, exitCode, results, parsed;
        var _this = this;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    child = (0, node_child_process_1.spawn)(process.execPath, [(0, node_path_1.join)(__dirname, 'conversion.engine.js'), requestFile], {
                        cwd: sourceDir,
                        env: __assign(__assign({}, process.env), { FLYINGMOUSE_LOG_STDERR: '1', FLYINGMOUSE_RUNTIME_DIR: runtimeDir }),
                        stdio: ['ignore', 'pipe', 'pipe'],
                        detached: true,
                    });
                    activeChild = child;
                    stdout = '';
                    stderr = '';
                    progressBuffer = '';
                    latestProgress = 0;
                    persistedProgress = 0;
                    flushProgress = function () {
                        if (progressWriter)
                            return progressWriter;
                        progressWriter = (function () { return __awaiter(_this, void 0, void 0, function () {
                            var progress;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        if (!(latestProgress > persistedProgress)) return [3 /*break*/, 2];
                                        progress = latestProgress;
                                        return [4 /*yield*/, prisma.ledgerConversionJob.updateMany({
                                                where: { id: jobId, leaseId: leaseId, status: 'running', progress: { lt: progress } },
                                                data: { progress: progress },
                                            })];
                                    case 1:
                                        _a.sent();
                                        persistedProgress = progress;
                                        return [3 /*break*/, 0];
                                    case 2: return [2 /*return*/];
                                }
                            });
                        }); })().finally(function () {
                            progressWriter = undefined;
                        });
                        return progressWriter;
                    };
                    reportProgress = function (progress) {
                        latestProgress = Math.max(latestProgress, progress);
                        void flushProgress().catch(function () { return undefined; });
                    };
                    (_a = child.stdout) === null || _a === void 0 ? void 0 : _a.on('data', function (chunk) {
                        stdout += String(chunk);
                        if (stdout.length > 2000000)
                            terminate(child);
                    });
                    (_b = child.stderr) === null || _b === void 0 ? void 0 : _b.on('data', function (chunk) {
                        stderr = (stderr + String(chunk)).slice(-16000);
                        progressBuffer += String(chunk);
                        var lines = progressBuffer.split('\n');
                        progressBuffer = lines.pop() || '';
                        for (var _i = 0, _a = lines.filter(function (line) { return line.startsWith('@@PROGRESS@@'); }); _i < _a.length; _i++) {
                            var event_1 = _a[_i];
                            try {
                                var state = JSON.parse(event_1.slice('@@PROGRESS@@'.length));
                                var base = {
                                    uploading: 12, preparing: 20, queued: 24, recognizing: 30,
                                    converting: 45, merging: 60, validating: 72,
                                };
                                var fraction = state.total > 0 && state.completed != null
                                    ? Math.min(1, state.completed / state.total) : 0;
                                var progress = Math.min(79, Math.floor((base[state.stage] || 12) + fraction * 12));
                                reportProgress(progress);
                            }
                            catch ( /* Ignore a partial progress line. */_b) { /* Ignore a partial progress line. */ }
                        }
                    });
                    timeout = setTimeout(function () { return terminate(child); }, Number(process.env.CONVERSION_JOB_TIMEOUT_MS || 2 * 60 * 60 * 1000));
                    timeout.unref();
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, , 4, 5]);
                    return [4 /*yield*/, new Promise(function (resolveExit, rejectExit) {
                            child.once('error', rejectExit);
                            child.once('exit', function (code) { return resolveExit(code !== null && code !== void 0 ? code : 1); });
                        })];
                case 2:
                    exitCode = _c.sent();
                    return [4 /*yield*/, (progressWriter === null || progressWriter === void 0 ? void 0 : progressWriter.catch(function () { return undefined; }))];
                case 3:
                    _c.sent();
                    if (exitCode !== 0)
                        throw new Error("\u8F6C\u6362\u5F15\u64CE\u9000\u51FA ".concat(exitCode, ": ").concat(stderr.slice(-1000)));
                    results = stdout.split(/\r?\n/)
                        .filter(function (line) { return line.startsWith('@@LEDGER_CONVERSION_RESULT@@'); });
                    if (results.length !== 1)
                        throw new Error('转换引擎未返回唯一结果清单');
                    parsed = JSON.parse(results[0].slice('@@LEDGER_CONVERSION_RESULT@@'.length));
                    if (!parsed.ok || !Array.isArray(parsed.outputs))
                        throw new Error('转换引擎未返回结果清单');
                    return [2 /*return*/, parsed.outputs];
                case 4:
                    clearTimeout(timeout);
                    activeChild = null;
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function processJob(id) {
    return __awaiter(this, void 0, void 0, function () {
        var leaseId, claimed, work, writtenKeys, leaseLost, passwordForRedaction, heartbeat, assertLease, job_1, totalBytes, disk, freeBytes, order_1, inputDir, outputDir, files, _i, _a, upload, _b, _c, storedOptions_1, options, requestFile, outputs, warnings_1, sidecars, outputRoot, assets_1, _d, outputs_1, output, filePath, canonicalPath, info, fileName, assetId, objectKey, zipPath, assetId, objectKey, _e, _f, _g, finishedAt_1, error_1, finishedAt_2, detail, publicError_1;
        var _h;
        var _this = this;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    leaseId = (0, node_crypto_1.randomUUID)();
                    return [4 /*yield*/, prisma.ledgerConversionJob.updateMany({
                            where: { id: id, status: 'queued' },
                            data: {
                                status: 'running',
                                leaseId: leaseId,
                                startedAt: new Date(),
                                heartbeatAt: new Date(),
                                progress: 1,
                            },
                        })];
                case 1:
                    claimed = _j.sent();
                    if (!claimed.count)
                        return [2 /*return*/];
                    return [4 /*yield*/, (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), 'ledger-conversion-'))];
                case 2:
                    work = _j.sent();
                    writtenKeys = [];
                    leaseLost = false;
                    passwordForRedaction = '';
                    heartbeat = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
                        var current, _a;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, prisma.ledgerConversionJob.updateMany({
                                            where: { id: id, leaseId: leaseId, status: 'running' },
                                            data: { heartbeatAt: new Date() },
                                        })];
                                case 1:
                                    current = _b.sent();
                                    if (!current.count) {
                                        leaseLost = true;
                                        if (activeChild)
                                            terminate(activeChild);
                                    }
                                    return [3 /*break*/, 3];
                                case 2:
                                    _a = _b.sent();
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); }, 10000);
                    assertLease = function () { return __awaiter(_this, void 0, void 0, function () {
                        var current;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    if (leaseLost)
                                        throw new Error('任务已取消或租约已过期');
                                    return [4 /*yield*/, prisma.ledgerConversionJob.findUnique({
                                            where: { id: id },
                                            select: { status: true, leaseId: true },
                                        })];
                                case 1:
                                    current = _a.sent();
                                    if ((current === null || current === void 0 ? void 0 : current.status) !== 'running' || current.leaseId !== leaseId)
                                        throw new Error('任务已取消或租约已过期');
                                    return [2 /*return*/];
                            }
                        });
                    }); };
                    _j.label = 3;
                case 3:
                    _j.trys.push([3, 33, 38, 40]);
                    return [4 /*yield*/, prisma.ledgerConversionJob.findUniqueOrThrow({
                            where: { id: id },
                            select: {
                                id: true,
                                userId: true,
                                operationId: true,
                                uploadOrder: true,
                                options: true,
                                uploads: {
                                    select: {
                                        id: true,
                                        fileName: true,
                                        totalBytes: true,
                                        chunks: {
                                            select: { index: true, objectKey: true, sha256: true },
                                            orderBy: { index: 'asc' },
                                        },
                                    },
                                    orderBy: { createdAt: 'asc' },
                                },
                            },
                        })];
                case 4:
                    job_1 = _j.sent();
                    if (!job_1.uploads.length)
                        throw new Error('任务没有输入文件');
                    totalBytes = job_1.uploads.reduce(function (sum, upload) { return sum + Number(upload.totalBytes); }, 0);
                    return [4 /*yield*/, (0, promises_1.statfs)(work)];
                case 5:
                    disk = _j.sent();
                    freeBytes = disk.bavail * disk.bsize;
                    if (freeBytes < totalBytes * 3 + Math.pow(1024, 3))
                        throw new Error('转换工作盘空间不足');
                    order_1 = Array.isArray(job_1.uploadOrder) ? job_1.uploadOrder.map(String) : [];
                    job_1.uploads.sort(function (a, b) { return order_1.indexOf(a.id) - order_1.indexOf(b.id); });
                    inputDir = (0, node_path_1.join)(work, 'inputs');
                    outputDir = (0, node_path_1.join)(work, 'outputs');
                    return [4 /*yield*/, (0, promises_1.mkdir)(inputDir)];
                case 6:
                    _j.sent();
                    return [4 /*yield*/, (0, promises_1.mkdir)(outputDir)];
                case 7:
                    _j.sent();
                    files = [];
                    _i = 0, _a = job_1.uploads;
                    _j.label = 8;
                case 8:
                    if (!(_i < _a.length)) return [3 /*break*/, 11];
                    upload = _a[_i];
                    _c = (_b = files).push;
                    return [4 /*yield*/, downloadUpload(upload, inputDir)];
                case 9:
                    _c.apply(_b, [_j.sent()]);
                    _j.label = 10;
                case 10:
                    _i++;
                    return [3 /*break*/, 8];
                case 11: return [4 /*yield*/, assertLease()];
                case 12:
                    _j.sent();
                    return [4 /*yield*/, prisma.ledgerConversionJob.updateMany({
                            where: { id: id, leaseId: leaseId, status: 'running' },
                            data: { progress: 10 },
                        })];
                case 13:
                    _j.sent();
                    storedOptions_1 = Object.fromEntries(Object.entries((job_1.options || {}))
                        .filter(function (_a) {
                        var key = _a[0];
                        return key !== conversion_warnings_1.CONVERSION_WARNINGS_OPTION_KEY;
                    }));
                    options = storedOptions_1.password === undefined ? storedOptions_1 : __assign(__assign({}, storedOptions_1), { password: (0, conversion_secrets_1.decryptConversionPassword)(storedOptions_1.password) });
                    passwordForRedaction = options.password || '';
                    requestFile = (0, node_path_1.join)(work, 'request.json');
                    return [4 /*yield*/, (0, promises_1.writeFile)(requestFile, JSON.stringify({
                            operationId: job_1.operationId,
                            files: files,
                            options: options,
                            outputDir: outputDir,
                        }), { mode: 384 })];
                case 14:
                    _j.sent();
                    return [4 /*yield*/, runEngine(id, leaseId, requestFile, (0, node_path_1.join)(work, 'engine-runtime'))];
                case 15:
                    outputs = _j.sent();
                    warnings_1 = (0, conversion_warnings_1.collectConversionWarnings)(outputs, options);
                    if (job_1.uploads.some(function (upload) { return (0, node_path_1.extname)(upload.fileName).toLowerCase() === '.xlsm'; })) {
                        warnings_1.push('XLSM 中的宏和 VBA 代码可能未保留；请在原文件中核对并保留备份。');
                    }
                    return [4 /*yield*/, assertLease()];
                case 16:
                    _j.sent();
                    if (!outputs.length)
                        throw new Error('转换没有产生文件');
                    return [4 /*yield*/, (0, conversion_outputs_1.markdownSidecars)(outputDir)];
                case 17:
                    sidecars = _j.sent();
                    return [4 /*yield*/, prisma.ledgerConversionJob.updateMany({
                            where: { id: id, leaseId: leaseId, status: 'running' },
                            data: { progress: 80 },
                        })];
                case 18:
                    _j.sent();
                    return [4 /*yield*/, (0, promises_1.realpath)(outputDir)];
                case 19:
                    outputRoot = _j.sent();
                    assets_1 = [];
                    _d = 0, outputs_1 = outputs;
                    _j.label = 20;
                case 20:
                    if (!(_d < outputs_1.length)) return [3 /*break*/, 26];
                    output = outputs_1[_d];
                    filePath = (0, node_path_1.resolve)(output.path);
                    return [4 /*yield*/, (0, promises_1.realpath)(filePath)];
                case 21:
                    canonicalPath = _j.sent();
                    if (!canonicalPath.startsWith(outputRoot + node_path_1.sep))
                        throw new Error('转换引擎输出路径越界');
                    return [4 /*yield*/, (0, promises_1.lstat)(filePath)];
                case 22:
                    info = _j.sent();
                    if (!info.isFile())
                        throw new Error('转换引擎输出不是普通文件');
                    fileName = safeOutputName(output.fileName);
                    if (!fileName)
                        throw new Error('转换引擎结果文件名无效');
                    if (sidecars.length)
                        return [3 /*break*/, 25];
                    assetId = (0, node_crypto_1.randomUUID)();
                    objectKey = "ledger-conversions/".concat(job_1.userId, "/jobs/").concat(id, "/assets/").concat(assetId);
                    return [4 /*yield*/, storage.fPutObject(bucket, objectKey, filePath, {
                            'Content-Type': output.mimeType || 'application/octet-stream',
                        })];
                case 23:
                    _j.sent();
                    writtenKeys.push(objectKey);
                    return [4 /*yield*/, assertLease()];
                case 24:
                    _j.sent();
                    assets_1.push({
                        id: assetId,
                        objectKey: objectKey,
                        fileName: fileName,
                        mimeType: output.mimeType || 'application/octet-stream',
                        sizeBytes: BigInt(info.size),
                    });
                    _j.label = 25;
                case 25:
                    _d++;
                    return [3 /*break*/, 20];
                case 26:
                    if (!(outputs.length > 1 || sidecars.length)) return [3 /*break*/, 31];
                    zipPath = (0, node_path_1.join)(work, 'all-results.zip');
                    return [4 /*yield*/, (0, conversion_outputs_1.zipOutputs)(outputs, sidecars, zipPath, sourceDir)];
                case 27:
                    _j.sent();
                    assetId = (0, node_crypto_1.randomUUID)();
                    objectKey = "ledger-conversions/".concat(job_1.userId, "/jobs/").concat(id, "/assets/").concat(assetId);
                    return [4 /*yield*/, storage.fPutObject(bucket, objectKey, zipPath, { 'Content-Type': 'application/zip' })];
                case 28:
                    _j.sent();
                    writtenKeys.push(objectKey);
                    return [4 /*yield*/, assertLease()];
                case 29:
                    _j.sent();
                    _f = (_e = assets_1).push;
                    _h = {
                        id: assetId,
                        objectKey: objectKey,
                        fileName: outputs.length > 1 ? '全部结果.zip' : '转换结果.zip',
                        mimeType: 'application/zip'
                    };
                    _g = BigInt;
                    return [4 /*yield*/, (0, promises_1.stat)(zipPath)];
                case 30:
                    _f.apply(_e, [(_h.sizeBytes = _g.apply(void 0, [(_j.sent()).size]),
                            _h)]);
                    _j.label = 31;
                case 31:
                    finishedAt_1 = new Date();
                    return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                            var done;
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0: return [4 /*yield*/, tx.ledgerConversionJob.updateMany({
                                            where: { id: id, leaseId: leaseId, status: 'running' },
                                            data: {
                                                status: 'succeeded',
                                                leaseId: null,
                                                heartbeatAt: null,
                                                progress: 100,
                                                finishedAt: finishedAt_1,
                                                expiresAt: new Date(finishedAt_1.getTime() + RETENTION_MS),
                                                options: __assign(__assign({}, storedOptions_1), (_a = {}, _a[conversion_warnings_1.CONVERSION_WARNINGS_OPTION_KEY] = warnings_1, _a)),
                                            },
                                        })];
                                    case 1:
                                        done = _b.sent();
                                        if (!done.count)
                                            throw new Error('任务已取消或租约已过期');
                                        return [4 /*yield*/, tx.ledgerConversionAsset.createMany({
                                                data: assets_1.map(function (asset) { return (__assign(__assign({}, asset), { jobId: id })); }),
                                            })];
                                    case 2:
                                        _b.sent();
                                        return [4 /*yield*/, tx.ledgerConversionUpload.updateMany({
                                                where: { jobId: id },
                                                data: { expiresAt: new Date(finishedAt_1.getTime() + RETENTION_MS) },
                                            })];
                                    case 3:
                                        _b.sent();
                                        return [4 /*yield*/, tx.ledgerToolEvent.createMany({
                                                data: [{ id: (0, tool_events_service_1.serverEventId)('format', id, 'success'), userId: job_1.userId,
                                                        tool: 'format', status: 'success', occurredAt: finishedAt_1 }],
                                                skipDuplicates: true,
                                            })];
                                    case 4:
                                        _b.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 32:
                    _j.sent();
                    return [3 /*break*/, 40];
                case 33:
                    error_1 = _j.sent();
                    if (!writtenKeys.length) return [3 /*break*/, 35];
                    return [4 /*yield*/, storage.removeObjects(bucket, writtenKeys).catch(function () { return undefined; })];
                case 34:
                    _j.sent();
                    _j.label = 35;
                case 35:
                    finishedAt_2 = new Date();
                    detail = String((error_1 === null || error_1 === void 0 ? void 0 : error_1.message) || error_1);
                    publicError_1 = '转换失败，请检查文件是否损坏或更换格式后重试';
                    if (detail.startsWith('输入分片校验失败'))
                        publicError_1 = '上传文件校验失败，请重新选择文件';
                    else if (detail.includes('RAW 图片解码失败：无法从该文件提取像素数据。'))
                        publicError_1 = 'RAW 图片解码失败：无法从该文件提取像素数据。';
                    else if (detail.includes('合并图片超过当前内存预算'))
                        publicError_1 = '图片总像素超过当前内存预算，请分批转换或释放内存后重试';
                    return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                            var failed, job;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, tx.ledgerConversionJob.updateMany({
                                            where: { id: id, leaseId: leaseId, status: 'running' },
                                            data: {
                                                status: 'failed',
                                                leaseId: null,
                                                heartbeatAt: null,
                                                error: publicError_1,
                                                finishedAt: finishedAt_2,
                                                expiresAt: new Date(finishedAt_2.getTime() + RETENTION_MS),
                                            },
                                        })];
                                    case 1:
                                        failed = _a.sent();
                                        if (!failed.count) return [3 /*break*/, 4];
                                        return [4 /*yield*/, tx.ledgerConversionJob.findUniqueOrThrow({ where: { id: id }, select: { userId: true } })];
                                    case 2:
                                        job = _a.sent();
                                        return [4 /*yield*/, tx.ledgerToolEvent.createMany({
                                                data: [{ id: (0, tool_events_service_1.serverEventId)('format', id, 'failure'), userId: job.userId,
                                                        tool: 'format', status: 'failure', occurredAt: finishedAt_2 }],
                                                skipDuplicates: true,
                                            })];
                                    case 3:
                                        _a.sent();
                                        _a.label = 4;
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); })];
                case 36:
                    _j.sent();
                    return [4 /*yield*/, prisma.ledgerConversionUpload.updateMany({
                            where: { jobId: id },
                            data: { expiresAt: new Date(finishedAt_2.getTime() + RETENTION_MS) },
                        })];
                case 37:
                    _j.sent();
                    console.error("[conversion-worker] ".concat(id, ": ").concat(passwordForRedaction
                        ? detail.replaceAll(passwordForRedaction, '[redacted]') : detail));
                    return [3 /*break*/, 40];
                case 38:
                    clearInterval(heartbeat);
                    return [4 /*yield*/, (0, promises_1.rm)(work, { recursive: true, force: true })];
                case 39:
                    _j.sent();
                    return [7 /*endfinally*/];
                case 40: return [2 /*return*/];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var timer, heartbeat_1, item, id, error_2;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    (0, conversion_secrets_1.assertConversionPasswordKey)();
                    if (bucket === (process.env.S3_BUCKET || 'jiujiu-mall'))
                        throw new Error('Conversion bucket must be private and separate');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 18, 20]);
                    return [4 /*yield*/, storage.bucketExists(bucket)];
                case 2:
                    if (!!(_a.sent())) return [3 /*break*/, 4];
                    return [4 /*yield*/, storage.makeBucket(bucket)];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4: return [4 /*yield*/, (0, conversion_storage_1.assertPrivateConversionBucket)(storage, bucket)];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, prisma.$connect()];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, redis.connect()];
                case 7:
                    _a.sent();
                    heartbeat_1 = function () { return __awaiter(_this, void 0, void 0, function () { var _a, _b, _c, _d, _e; return __generator(this, function (_f) {
                        switch (_f.label) {
                            case 0:
                                _b = (_a = redis).set;
                                _c = [WORKER_HEARTBEAT];
                                _e = (_d = JSON).stringify;
                                return [4 /*yield*/, workerCapacity()];
                            case 1: return [2 /*return*/, _b.apply(_a, _c.concat([_e.apply(_d, [_f.sent()]), 'EX', 30]))];
                        }
                    }); }); };
                    return [4 /*yield*/, heartbeat_1()];
                case 8:
                    _a.sent();
                    timer = setInterval(function () {
                        heartbeat_1().catch(function (error) { return console.error('[conversion-worker] heartbeat:', error); });
                    }, 10000);
                    _a.label = 9;
                case 9:
                    if (!running) return [3 /*break*/, 17];
                    _a.label = 10;
                case 10:
                    _a.trys.push([10, 14, , 16]);
                    return [4 /*yield*/, redis.brpop(QUEUE, 5)];
                case 11:
                    item = _a.sent();
                    if (!item)
                        return [3 /*break*/, 9];
                    id = item[1];
                    return [4 /*yield*/, redis.del("ledger:conversions:enqueued:".concat(id))];
                case 12:
                    _a.sent();
                    return [4 /*yield*/, processJob(id)];
                case 13:
                    _a.sent();
                    return [3 /*break*/, 16];
                case 14:
                    error_2 = _a.sent();
                    console.error('[conversion-worker] loop:', error_2);
                    return [4 /*yield*/, new Promise(function (resolveSleep) {
                            setTimeout(resolveSleep, 3000);
                        })];
                case 15:
                    _a.sent();
                    return [3 /*break*/, 16];
                case 16: return [3 /*break*/, 9];
                case 17: return [3 /*break*/, 20];
                case 18:
                    if (timer)
                        clearInterval(timer);
                    return [4 /*yield*/, prisma.$disconnect().catch(function () { return undefined; })];
                case 19:
                    _a.sent();
                    redis.disconnect();
                    return [7 /*endfinally*/];
                case 20: return [2 /*return*/];
            }
        });
    });
}
for (var _i = 0, _a = ['SIGTERM', 'SIGINT']; _i < _a.length; _i++) {
    var signal = _a[_i];
    process.on(signal, function () {
        running = false;
        if (activeChild)
            terminate(activeChild);
    });
}
main().catch(function (error) {
    console.error('[conversion-worker] fatal:', error);
    process.exitCode = 1;
});
