"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversionController = void 0;
var common_1 = require("@nestjs/common");
var platform_express_1 = require("@nestjs/platform-express");
var swagger_1 = require("@nestjs/swagger");
var throttler_1 = require("@nestjs/throttler");
var public_decorator_1 = require("../../common/decorators/public.decorator");
var skip_response_decorator_1 = require("../../common/decorators/skip-response.decorator");
var ledger_jwt_guard_1 = require("../ledger/guards/ledger-jwt.guard");
var conversion_operations_1 = require("./conversion.operations");
var conversion_upload_storage_1 = require("./conversion.upload-storage");
var ConversionController = function () {
    var _classDecorators = [(0, swagger_1.ApiTags)('门窗利账-格式转换'), (0, public_decorator_1.Public)(), (0, common_1.UseGuards)(ledger_jwt_guard_1.LedgerJwtGuard), (0, common_1.Controller)('l/conversions')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _capabilities_decorators;
    var _startUpload_decorators;
    var _uploadStatus_decorators;
    var _putChunk_decorators;
    var _completeUpload_decorators;
    var _createJob_decorators;
    var _listJobs_decorators;
    var _getJob_decorators;
    var _cancelJob_decorators;
    var _retryJob_decorators;
    var _deleteJob_decorators;
    var _download_decorators;
    var ConversionController = _classThis = /** @class */ (function () {
        function ConversionController_1(service) {
            this.service = (__runInitializers(this, _instanceExtraInitializers), service);
        }
        ConversionController_1.prototype.capabilities = function () {
            return this.service.capabilities();
        };
        ConversionController_1.prototype.startUpload = function (user, body) {
            return this.service.startUpload(user.id, body === null || body === void 0 ? void 0 : body.fileName, body === null || body === void 0 ? void 0 : body.sizeBytes);
        };
        ConversionController_1.prototype.uploadStatus = function (user, id) {
            return this.service.uploadStatus(user.id, id);
        };
        ConversionController_1.prototype.putChunk = function (user, id, index, file) {
            return this.service.putChunk(user.id, id, index, file);
        };
        ConversionController_1.prototype.completeUpload = function (user, id) {
            return this.service.completeUpload(user.id, id);
        };
        ConversionController_1.prototype.createJob = function (user, body) {
            return this.service.createJob(user.id, body);
        };
        ConversionController_1.prototype.listJobs = function (user, skip) {
            return this.service.listJobs(user.id, skip);
        };
        ConversionController_1.prototype.getJob = function (user, id) {
            return this.service.getJob(user.id, id);
        };
        ConversionController_1.prototype.cancelJob = function (user, id) {
            return this.service.cancelJob(user.id, id);
        };
        ConversionController_1.prototype.retryJob = function (user, id) {
            return this.service.retryJob(user.id, id);
        };
        ConversionController_1.prototype.deleteJob = function (user, id) {
            return this.service.deleteJob(user.id, id);
        };
        ConversionController_1.prototype.download = function (user, id, assetId, range, response) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, asset, stream, statusCode, contentLength, contentRange, fallback;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.service.asset(user.id, id, assetId, range)];
                        case 1:
                            _a = _b.sent(), asset = _a.asset, stream = _a.stream, statusCode = _a.statusCode, contentLength = _a.contentLength, contentRange = _a.contentRange;
                            fallback = asset.fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
                            response.status(statusCode);
                            response.setHeader('Content-Type', asset.mimeType);
                            response.setHeader('Content-Length', String(contentLength));
                            response.setHeader('Accept-Ranges', 'bytes');
                            response.setHeader('Cache-Control', 'private, no-store');
                            if (contentRange)
                                response.setHeader('Content-Range', contentRange);
                            response.setHeader('Content-Disposition', "attachment; filename=\"".concat(fallback, "\"; filename*=UTF-8''").concat(encodeURIComponent(asset.fileName)));
                            response.setHeader('X-Content-Type-Options', 'nosniff');
                            stream.on('error', function () {
                                if (!response.headersSent)
                                    response.status(500).end();
                                else
                                    response.destroy();
                            });
                            stream.pipe(response);
                            return [2 /*return*/];
                    }
                });
            });
        };
        return ConversionController_1;
    }());
    __setFunctionName(_classThis, "ConversionController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _capabilities_decorators = [(0, common_1.Get)('capabilities')];
        _startUpload_decorators = [(0, common_1.Post)('uploads')];
        _uploadStatus_decorators = [(0, common_1.Get)('uploads/:id')];
        _putChunk_decorators = [(0, common_1.Post)('uploads/:id/chunks'), (0, swagger_1.ApiConsumes)('multipart/form-data'), (0, throttler_1.Throttle)({ default: { limit: 180, ttl: 60000 } }), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
                storage: conversion_upload_storage_1.conversionUploadStorage,
                limits: { fileSize: conversion_operations_1.CONVERSION_CHUNK_BYTES },
            }))];
        _completeUpload_decorators = [(0, common_1.Post)('uploads/:id/complete')];
        _createJob_decorators = [(0, common_1.Post)('jobs')];
        _listJobs_decorators = [(0, common_1.Get)('jobs')];
        _getJob_decorators = [(0, common_1.Get)('jobs/:id')];
        _cancelJob_decorators = [(0, common_1.Post)('jobs/:id/cancel')];
        _retryJob_decorators = [(0, common_1.Post)('jobs/:id/retry')];
        _deleteJob_decorators = [(0, common_1.Delete)('jobs/:id')];
        _download_decorators = [(0, common_1.Get)('jobs/:id/assets/:assetId'), (0, skip_response_decorator_1.SkipResponseWrap)()];
        __esDecorate(_classThis, null, _capabilities_decorators, { kind: "method", name: "capabilities", static: false, private: false, access: { has: function (obj) { return "capabilities" in obj; }, get: function (obj) { return obj.capabilities; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _startUpload_decorators, { kind: "method", name: "startUpload", static: false, private: false, access: { has: function (obj) { return "startUpload" in obj; }, get: function (obj) { return obj.startUpload; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _uploadStatus_decorators, { kind: "method", name: "uploadStatus", static: false, private: false, access: { has: function (obj) { return "uploadStatus" in obj; }, get: function (obj) { return obj.uploadStatus; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _putChunk_decorators, { kind: "method", name: "putChunk", static: false, private: false, access: { has: function (obj) { return "putChunk" in obj; }, get: function (obj) { return obj.putChunk; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _completeUpload_decorators, { kind: "method", name: "completeUpload", static: false, private: false, access: { has: function (obj) { return "completeUpload" in obj; }, get: function (obj) { return obj.completeUpload; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createJob_decorators, { kind: "method", name: "createJob", static: false, private: false, access: { has: function (obj) { return "createJob" in obj; }, get: function (obj) { return obj.createJob; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listJobs_decorators, { kind: "method", name: "listJobs", static: false, private: false, access: { has: function (obj) { return "listJobs" in obj; }, get: function (obj) { return obj.listJobs; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getJob_decorators, { kind: "method", name: "getJob", static: false, private: false, access: { has: function (obj) { return "getJob" in obj; }, get: function (obj) { return obj.getJob; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _cancelJob_decorators, { kind: "method", name: "cancelJob", static: false, private: false, access: { has: function (obj) { return "cancelJob" in obj; }, get: function (obj) { return obj.cancelJob; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _retryJob_decorators, { kind: "method", name: "retryJob", static: false, private: false, access: { has: function (obj) { return "retryJob" in obj; }, get: function (obj) { return obj.retryJob; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteJob_decorators, { kind: "method", name: "deleteJob", static: false, private: false, access: { has: function (obj) { return "deleteJob" in obj; }, get: function (obj) { return obj.deleteJob; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _download_decorators, { kind: "method", name: "download", static: false, private: false, access: { has: function (obj) { return "download" in obj; }, get: function (obj) { return obj.download; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ConversionController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ConversionController = _classThis;
}();
exports.ConversionController = ConversionController;
