"use strict";
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
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
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
exports.FilesService = void 0;
var common_1 = require("@nestjs/common");
var minio_1 = require("minio");
var node_crypto_1 = require("node:crypto");
var nanoid_1 = require("nanoid");
var biz_exception_1 = require("../../common/exceptions/biz.exception");
var image_thumbnail_util_1 = require("./image-thumbnail.util");
var nano = (0, nanoid_1.customAlphabet)('0123456789abcdefghijklmnopqrstuvwxyz', 16);
var IMAGE_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
var VIDEO_MIME = ['video/mp4', 'video/webm'];
var IMAGE_MAX = 10 * 1024 * 1024;
var VIDEO_MAX = 50 * 1024 * 1024;
var FEEDBACK_URL_TTL_SECONDS = 3600;
function ledgerImageMime(buffer) {
    if (buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])))
        return 'image/jpeg';
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')))
        return 'image/png';
    if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6)))
        return 'image/gif';
    if (buffer.length >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP')
        return 'image/webp';
    return null;
}
var FilesService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var FilesService = _classThis = /** @class */ (function () {
        function FilesService_1(prisma, contentSecurity) {
            this.prisma = prisma;
            this.contentSecurity = contentSecurity;
            this.logger = new common_1.Logger(FilesService.name);
            this.client = null;
            this.bucket = process.env.S3_BUCKET || 'jiujiu-mall';
            this.publicUrl = process.env.S3_PUBLIC_URL || 'http://localhost:9000/jiujiu-mall';
            this.privateBucket = process.env.S3_PRIVATE_BUCKET || '';
        }
        FilesService_1.prototype.onModuleInit = function () {
            return __awaiter(this, void 0, void 0, function () {
                var isProd, accessKey, secretKey, endpoint, useSSL, _a, host, port, exists, privateExists, e_1;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            isProd = process.env.NODE_ENV === 'production';
                            accessKey = process.env.S3_ACCESS_KEY || '';
                            secretKey = process.env.S3_SECRET_KEY || '';
                            // 生产环境必须显式配置 S3 凭据，绝不能使用 minioadmin 默认值，
                            // 否则有"管理员密码裸奔"的严重风险。
                            if (isProd && (!accessKey || !secretKey)) {
                                this.logger.error('[files] 生产环境缺少 S3_ACCESS_KEY / S3_SECRET_KEY，上传服务将不可用');
                                this.client = null;
                                return [2 /*return*/];
                            }
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 8, , 9]);
                            endpoint = (process.env.S3_ENDPOINT || 'http://localhost:9000').replace(/^https?:\/\//, '');
                            useSSL = (process.env.S3_ENDPOINT || '').startsWith('https');
                            _a = endpoint.split(':'), host = _a[0], port = _a[1];
                            this.client = new minio_1.Client({
                                endPoint: host,
                                port: port ? Number(port) : useSSL ? 443 : 80,
                                useSSL: useSSL,
                                // 非生产兜底 minioadmin（与 docker-compose 默认一致），生产则使用真实凭据
                                accessKey: accessKey || (isProd ? '' : 'minioadmin'),
                                secretKey: secretKey || (isProd ? '' : 'minioadmin'),
                            });
                            return [4 /*yield*/, this.client.bucketExists(this.bucket).catch(function () { return false; })];
                        case 2:
                            exists = _b.sent();
                            if (!!exists) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.client.makeBucket(this.bucket, process.env.S3_REGION || 'cn-east-1')];
                        case 3:
                            _b.sent();
                            this.logger.log("bucket created: ".concat(this.bucket));
                            _b.label = 4;
                        case 4:
                            if (!this.privateBucket) return [3 /*break*/, 7];
                            if (this.privateBucket === this.bucket)
                                throw new Error('S3_PRIVATE_BUCKET 必须独立于公开桶');
                            return [4 /*yield*/, this.client.bucketExists(this.privateBucket)];
                        case 5:
                            privateExists = _b.sent();
                            if (!!privateExists) return [3 /*break*/, 7];
                            return [4 /*yield*/, this.client.makeBucket(this.privateBucket, process.env.S3_REGION || 'cn-east-1')];
                        case 6:
                            _b.sent();
                            _b.label = 7;
                        case 7: return [3 /*break*/, 9];
                        case 8:
                            e_1 = _b.sent();
                            this.logger.warn("MinIO init failed: ".concat(e_1 === null || e_1 === void 0 ? void 0 : e_1.message, " (uploads will fail until configured)"));
                            this.client = null;
                            return [3 /*break*/, 9];
                        case 9: return [2 /*return*/];
                    }
                });
            });
        };
        FilesService_1.prototype.validateFile = function (file) {
            var isImage = IMAGE_MIME.includes(file.mimetype);
            var isVideo = VIDEO_MIME.includes(file.mimetype);
            if (!isImage && !isVideo) {
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, "\u4E0D\u652F\u6301\u7684\u6587\u4EF6\u7C7B\u578B\uFF1A".concat(file.mimetype));
            }
            if (isImage && file.size > IMAGE_MAX) {
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '图片不能超过 10MB');
            }
            if (isVideo && file.size > VIDEO_MAX) {
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '视频不能超过 50MB');
            }
        };
        FilesService_1.prototype.upload = function (file_1, bizType_1, ownerId_1) {
            return __awaiter(this, arguments, void 0, function (file, bizType, ownerId, contentScope) {
                var actual, claimed, ext, d, key, url, thumbnailKey, thumbnailUrl, thumbnail, error_1, uploaded, error_2;
                var _a;
                if (contentScope === void 0) { contentScope = bizType === 'ledger-ad' ? 'ledger' : 'mall'; }
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!file)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '未上传文件');
                            this.validateFile(file);
                            if (contentScope === 'ledger') {
                                actual = ledgerImageMime(file.buffer);
                                claimed = file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype;
                                if (!actual || actual !== claimed || file.buffer.length !== file.size) {
                                    throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '图片内容与文件类型不匹配');
                                }
                            }
                            if (!IMAGE_MIME.includes(file.mimetype)) return [3 /*break*/, 2];
                            if (!this.contentSecurity && process.env.NODE_ENV === 'production') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '内容安全服务未初始化，暂时无法上传图片');
                            }
                            // 先同步过微信图片安全检测，再写对象存储和数据库，避免不合规头像/UGC 被发布。
                            return [4 /*yield*/, ((_a = this.contentSecurity) === null || _a === void 0 ? void 0 : _a.assertImageSafe(file.buffer, {
                                    scope: contentScope,
                                    scene: bizType === 'avatar' ? 1 : 2,
                                    filename: file.originalname,
                                    mimeType: file.mimetype,
                                }))];
                        case 1:
                            // 先同步过微信图片安全检测，再写对象存储和数据库，避免不合规头像/UGC 被发布。
                            _b.sent();
                            _b.label = 2;
                        case 2:
                            if (!this.client)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '对象存储未配置');
                            ext = contentScope === 'ledger'
                                ? {
                                    'image/jpeg': 'jpg',
                                    'image/png': 'png',
                                    'image/gif': 'gif',
                                    'image/webp': 'webp',
                                }[ledgerImageMime(file.buffer)]
                                : (file.originalname.split('.').pop() || 'bin').toLowerCase();
                            d = new Date();
                            key = "".concat(bizType, "/").concat(d.getFullYear(), "/").concat(String(d.getMonth() + 1).padStart(2, '0'), "/").concat(nano(), ".").concat(ext);
                            return [4 /*yield*/, this.client.putObject(this.bucket, key, file.buffer, file.size, {
                                    'Content-Type': file.mimetype,
                                    'Cache-Control': image_thumbnail_util_1.IMMUTABLE_CACHE_CONTROL,
                                })];
                        case 3:
                            _b.sent();
                            url = "".concat(this.publicUrl, "/").concat(key);
                            thumbnailKey = IMAGE_MIME.includes(file.mimetype) ? (0, image_thumbnail_util_1.thumbnailKeyForObjectKey)(key) : null;
                            if (!thumbnailKey) return [3 /*break*/, 8];
                            _b.label = 4;
                        case 4:
                            _b.trys.push([4, 7, , 8]);
                            return [4 /*yield*/, (0, image_thumbnail_util_1.createSquareThumbnail)(file.buffer)];
                        case 5:
                            thumbnail = _b.sent();
                            return [4 /*yield*/, this.client.putObject(this.bucket, thumbnailKey, thumbnail, thumbnail.length, {
                                    'Content-Type': 'image/webp',
                                    'Cache-Control': image_thumbnail_util_1.IMMUTABLE_CACHE_CONTROL,
                                })];
                        case 6:
                            _b.sent();
                            thumbnailUrl = "".concat(this.publicUrl, "/").concat(thumbnailKey);
                            return [3 /*break*/, 8];
                        case 7:
                            error_1 = _b.sent();
                            this.logger.warn("thumbnail failed for ".concat(key, ": ").concat((error_1 === null || error_1 === void 0 ? void 0 : error_1.message) || 'unknown error'));
                            return [3 /*break*/, 8];
                        case 8:
                            _b.trys.push([8, 10, , 14]);
                            return [4 /*yield*/, this.prisma.uploadedFile.create({
                                    data: {
                                        key: key,
                                        url: url,
                                        size: file.size,
                                        mimeType: file.mimetype,
                                        bizType: bizType,
                                        ownerId: ownerId || null,
                                    },
                                })];
                        case 9:
                            uploaded = _b.sent();
                            return [3 /*break*/, 14];
                        case 10:
                            error_2 = _b.sent();
                            return [4 /*yield*/, this.client.removeObject(this.bucket, key).catch(function () { return null; })];
                        case 11:
                            _b.sent();
                            if (!thumbnailKey) return [3 /*break*/, 13];
                            return [4 /*yield*/, this.client.removeObject(this.bucket, thumbnailKey).catch(function () { return null; })];
                        case 12:
                            _b.sent();
                            _b.label = 13;
                        case 13: throw error_2;
                        case 14: return [2 /*return*/, { id: uploaded.id, url: url, key: key, size: file.size, mimeType: file.mimetype, thumbnailUrl: thumbnailUrl }];
                    }
                });
            });
        };
        FilesService_1.prototype.openLedgerAvatar = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var file, referenced, stream;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!/^[a-zA-Z0-9_-]{8,64}$/.test(id))
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '头像不存在');
                            if (!this.client)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '对象存储未配置');
                            return [4 /*yield*/, this.prisma.uploadedFile.findFirst({
                                    where: { id: id, bizType: 'avatar', key: { startsWith: 'avatar/' } },
                                })];
                        case 1:
                            file = _a.sent();
                            if (!file || !IMAGE_MIME.includes(file.mimeType))
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '头像不存在');
                            return [4 /*yield*/, this.prisma.ledgerUser.findFirst({
                                    where: { avatar: "/api/v1/l/avatar-image/".concat(id) },
                                    select: { id: true },
                                })];
                        case 2:
                            referenced = _a.sent();
                            if (!referenced)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '头像不存在');
                            return [4 /*yield*/, this.client.getObject(this.bucket, file.key)];
                        case 3:
                            stream = _a.sent();
                            return [2 /*return*/, { stream: stream, mimeType: file.mimeType, size: file.size }];
                    }
                });
            });
        };
        /** 只删除当前利账账号自己拥有的头像文件，供资料替换和回退字母头像使用。 */
        FilesService_1.prototype.removeLedgerAvatar = function (id, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var file, error_3, thumbnailKey;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this.client)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '对象存储未配置');
                            if (!/^[a-zA-Z0-9_-]{8,64}$/.test(id))
                                return [2 /*return*/, { ok: true }];
                            return [4 /*yield*/, this.prisma.uploadedFile.findFirst({
                                    where: { id: id, bizType: 'avatar', ownerId: ownerId, key: { startsWith: 'avatar/' } },
                                })];
                        case 1:
                            file = _a.sent();
                            if (!file)
                                return [2 /*return*/, { ok: true }];
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, this.client.removeObject(this.bucket, file.key)];
                        case 3:
                            _a.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            error_3 = _a.sent();
                            // 保留 UploadedFile 记录，让孤立清理任务后续重试；不制造“数据库已删、对象仍泄漏”的假成功。
                            this.logger.warn("ledger avatar object cleanup failed for ".concat(file.key, ": ").concat((error_3 === null || error_3 === void 0 ? void 0 : error_3.message) || error_3));
                            return [2 /*return*/, { ok: false }];
                        case 5:
                            thumbnailKey = (0, image_thumbnail_util_1.thumbnailKeyForObjectKey)(file.key);
                            if (!thumbnailKey) return [3 /*break*/, 7];
                            return [4 /*yield*/, this.client.removeObject(this.bucket, thumbnailKey).catch(function () { return null; })];
                        case 6:
                            _a.sent();
                            _a.label = 7;
                        case 7: return [4 /*yield*/, this.prisma.uploadedFile.delete({ where: { id: file.id } }).catch(function (error) {
                                _this.logger.warn("ledger avatar record cleanup failed for ".concat(file.id, ": ").concat((error === null || error === void 0 ? void 0 : error.message) || error));
                            })];
                        case 8:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        /** 清理已不再被任何账号引用的旧头像，返回处理数量。 */
        FilesService_1.prototype.cleanupOrphanLedgerAvatars = function (referencedIds_1, olderThan_1) {
            return __awaiter(this, arguments, void 0, function (referencedIds, olderThan, limit) {
                var ledgerOwners, files, removed, _i, files_1, file, thumbnailKey;
                if (limit === void 0) { limit = 200; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this.client)
                                return [2 /*return*/, 0];
                            return [4 /*yield*/, this.prisma.ledgerUser.findMany({ select: { id: true } })];
                        case 1:
                            ledgerOwners = _a.sent();
                            if (!ledgerOwners.length)
                                return [2 /*return*/, 0];
                            return [4 /*yield*/, this.prisma.uploadedFile.findMany({
                                    where: {
                                        bizType: 'avatar',
                                        ownerId: { in: ledgerOwners.map(function (owner) { return owner.id; }) },
                                        key: { startsWith: 'avatar/' },
                                        createdAt: { lt: olderThan },
                                    },
                                    orderBy: { createdAt: 'asc' },
                                    take: limit,
                                    select: { id: true, key: true },
                                })];
                        case 2:
                            files = _a.sent();
                            removed = 0;
                            _i = 0, files_1 = files;
                            _a.label = 3;
                        case 3:
                            if (!(_i < files_1.length)) return [3 /*break*/, 9];
                            file = files_1[_i];
                            if (referencedIds.has(file.id))
                                return [3 /*break*/, 8];
                            return [4 /*yield*/, this.client.removeObject(this.bucket, file.key).catch(function () { return null; })];
                        case 4:
                            _a.sent();
                            thumbnailKey = (0, image_thumbnail_util_1.thumbnailKeyForObjectKey)(file.key);
                            if (!thumbnailKey) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.client.removeObject(this.bucket, thumbnailKey).catch(function () { return null; })];
                        case 5:
                            _a.sent();
                            _a.label = 6;
                        case 6: return [4 /*yield*/, this.prisma.uploadedFile.delete({ where: { id: file.id } }).catch(function () { return null; })];
                        case 7:
                            _a.sent();
                            removed++;
                            _a.label = 8;
                        case 8:
                            _i++;
                            return [3 /*break*/, 3];
                        case 9: return [2 /*return*/, removed];
                    }
                });
            });
        };
        FilesService_1.prototype.batchUpload = function (files_2, bizType_1, ownerId_1) {
            return __awaiter(this, arguments, void 0, function (files, bizType, ownerId, contentScope) {
                var out, _i, files_3, f, _a, _b;
                if (contentScope === void 0) { contentScope = bizType === 'ledger-ad' ? 'ledger' : 'mall'; }
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            out = [];
                            _i = 0, files_3 = files;
                            _c.label = 1;
                        case 1:
                            if (!(_i < files_3.length)) return [3 /*break*/, 4];
                            f = files_3[_i];
                            _b = (_a = out).push;
                            return [4 /*yield*/, this.upload(f, bizType, ownerId, contentScope)];
                        case 2:
                            _b.apply(_a, [_c.sent()]);
                            _c.label = 3;
                        case 3:
                            _i++;
                            return [3 /*break*/, 1];
                        case 4: return [2 /*return*/, out];
                    }
                });
            });
        };
        FilesService_1.prototype.mediaSecret = function () {
            var secret = process.env.LEDGER_MEDIA_SIGN_SECRET || '';
            if (secret.length < 32)
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '反馈图片签名密钥未配置');
            return secret;
        };
        FilesService_1.prototype.feedbackViewUrl = function (id) {
            var base = (process.env.LEDGER_MEDIA_BASE_URL || '').replace(/\/$/, '');
            if (!base || (process.env.NODE_ENV === 'production' && !base.startsWith('https://')))
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '反馈图片访问地址未配置');
            var exp = Math.floor(Date.now() / 1000) + FEEDBACK_URL_TTL_SECONDS;
            var sig = (0, node_crypto_1.createHmac)('sha256', this.mediaSecret()).update("".concat(id, ":").concat(exp)).digest('hex');
            return "".concat(base, "/").concat(encodeURIComponent(id), "?exp=").concat(exp, "&sig=").concat(sig);
        };
        FilesService_1.prototype.validFeedbackSignature = function (id, exp, sig, requireFresh) {
            if (requireFresh === void 0) { requireFresh = true; }
            var expires = Number(exp);
            if (!/^\d+$/.test(exp) ||
                (requireFresh && expires < Date.now() / 1000) ||
                expires > Date.now() / 1000 + FEEDBACK_URL_TTL_SECONDS)
                return false;
            if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id) || !/^[a-f0-9]{64}$/.test(sig))
                return false;
            var expected = (0, node_crypto_1.createHmac)('sha256', this.mediaSecret()).update("".concat(id, ":").concat(exp)).digest();
            return (0, node_crypto_1.timingSafeEqual)(Buffer.from(sig, 'hex'), expected);
        };
        FilesService_1.prototype.openPrivateFeedback = function (id, exp, sig) {
            return __awaiter(this, void 0, void 0, function () {
                var file, stream;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this.validFeedbackSignature(id, exp, sig))
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '图片访问链接无效或已过期');
                            if (!this.client || !this.privateBucket)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '私有存储未配置');
                            return [4 /*yield*/, this.prisma.uploadedFile.findFirst({
                                    where: { id: id, bizType: 'ledger-feedback-private' },
                                })];
                        case 1:
                            file = _a.sent();
                            if (!file)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '图片不存在');
                            return [4 /*yield*/, this.client.getObject(this.privateBucket, file.key)];
                        case 2:
                            stream = _a.sent();
                            return [2 /*return*/, { stream: stream, mimeType: file.mimeType, size: file.size }];
                    }
                });
            });
        };
        FilesService_1.prototype.uploadPrivateFeedback = function (file, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var mime, ext, d, key, row;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!file)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '未上传文件');
                            this.feedbackViewUrl('configuration-check');
                            this.validateFile(file);
                            mime = ledgerImageMime(file.buffer);
                            if (!mime ||
                                mime !== (file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype) ||
                                file.size !== file.buffer.length)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '图片内容与文件类型不匹配');
                            if (!this.contentSecurity && process.env.NODE_ENV === 'production')
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '内容安全服务未初始化');
                            return [4 /*yield*/, ((_a = this.contentSecurity) === null || _a === void 0 ? void 0 : _a.assertImageSafe(file.buffer, {
                                    scope: 'ledger',
                                    scene: 2,
                                    filename: file.originalname,
                                    mimeType: mime,
                                }))];
                        case 1:
                            _b.sent();
                            if (!this.client || !this.privateBucket)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '私有存储未配置');
                            ext = {
                                'image/jpeg': 'jpg',
                                'image/png': 'png',
                                'image/gif': 'gif',
                                'image/webp': 'webp',
                            }[mime];
                            d = new Date();
                            key = "feedback/".concat(d.getFullYear(), "/").concat(String(d.getMonth() + 1).padStart(2, '0'), "/").concat(nano(), ".").concat(ext);
                            return [4 /*yield*/, this.client.putObject(this.privateBucket, key, file.buffer, file.size, {
                                    'Content-Type': mime,
                                })];
                        case 2:
                            _b.sent();
                            return [4 /*yield*/, this.prisma.uploadedFile.create({
                                    data: {
                                        key: key,
                                        url: "feedback-private:".concat(key),
                                        size: file.size,
                                        mimeType: mime,
                                        bizType: 'ledger-feedback-private',
                                        ownerId: ownerId,
                                    },
                                })];
                        case 3:
                            row = _b.sent();
                            return [2 /*return*/, { url: this.feedbackViewUrl(row.id), key: "feedback-private:".concat(row.id) }];
                    }
                });
            });
        };
        FilesService_1.prototype.normalizeFeedbackImages = function (ownerId, images) {
            return __awaiter(this, void 0, void 0, function () {
                var base, legacyPrefix, result, _i, _a, image, id, u, key, row_1, row;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            base = (process.env.LEDGER_MEDIA_BASE_URL || '').replace(/\/$/, '');
                            legacyPrefix = this.publicUrl.replace(/\/$/, '') + '/feedback/';
                            result = [];
                            _i = 0, _a = images.slice(0, 9);
                            _b.label = 1;
                        case 1:
                            if (!(_i < _a.length)) return [3 /*break*/, 9];
                            image = _a[_i];
                            id = '';
                            if (!image.startsWith('feedback-private:')) return [3 /*break*/, 2];
                            id = image.slice('feedback-private:'.length);
                            return [3 /*break*/, 6];
                        case 2:
                            if (!(base && image.startsWith(base + '/'))) return [3 /*break*/, 3];
                            u = void 0;
                            try {
                                u = new URL(image);
                                id = decodeURIComponent(u.pathname.slice(new URL(base).pathname.length + 1));
                            }
                            catch (_c) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '反馈图片链接无效');
                            }
                            if (!this.validFeedbackSignature(id, u.searchParams.get('exp') || '', u.searchParams.get('sig') || '', false))
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '反馈图片链接无效');
                            return [3 /*break*/, 6];
                        case 3:
                            if (!image.startsWith(legacyPrefix)) return [3 /*break*/, 5];
                            key = void 0;
                            try {
                                key = decodeURIComponent(image.slice(this.publicUrl.replace(/\/$/, '').length + 1));
                            }
                            catch (_d) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '反馈图片路径无效');
                            }
                            if (!/^feedback\/[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|gif|webp)$/.test(key))
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '反馈图片路径无效');
                            return [4 /*yield*/, this.prisma.uploadedFile.findFirst({
                                    where: { key: key, ownerId: ownerId, bizType: 'feedback' },
                                })];
                        case 4:
                            row_1 = _b.sent();
                            if (!row_1)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '无权使用该反馈图片');
                            result.push(image);
                            return [3 /*break*/, 8];
                        case 5: throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '反馈图片来源无效');
                        case 6: return [4 /*yield*/, this.prisma.uploadedFile.findFirst({
                                where: { id: id, ownerId: ownerId, bizType: 'ledger-feedback-private' },
                            })];
                        case 7:
                            row = _b.sent();
                            if (!row)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '无权使用该反馈图片');
                            result.push("feedback-private:".concat(id));
                            _b.label = 8;
                        case 8:
                            _i++;
                            return [3 /*break*/, 1];
                        case 9: return [2 /*return*/, result];
                    }
                });
            });
        };
        /**
         * 上传 APK（独立通道，绕开常规图片/视频的 mime + size 校验）。
         * 仅给 AppReleaseService 用 —— controller 层不直接暴露。
         *
         * 限制：
         *   - mime 必须是 application/vnd.android.package-archive 或 application/octet-stream
         *   - 后缀必须是 .apk
         *   - 大小 ≤ 300MB
         */
        FilesService_1.prototype.uploadApk = function (file, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var ext, okMime, d, key, url;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!file)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '未上传文件');
                            ext = (file.originalname.split('.').pop() || '').toLowerCase();
                            if (ext !== 'apk') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '仅支持 .apk 文件');
                            }
                            okMime = file.mimetype === 'application/vnd.android.package-archive' ||
                                file.mimetype === 'application/octet-stream';
                            if (!okMime) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, "\u4E0D\u652F\u6301\u7684 APK mime\uFF1A".concat(file.mimetype));
                            }
                            if (file.size > 300 * 1024 * 1024) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, 'APK 不能超过 300MB');
                            }
                            if (!this.client)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '对象存储未配置');
                            d = new Date();
                            key = "apk/".concat(d.getFullYear(), "/").concat(String(d.getMonth() + 1).padStart(2, '0'), "/").concat(nano(), ".apk");
                            return [4 /*yield*/, this.client.putObject(this.bucket, key, file.buffer, file.size, {
                                    'Content-Type': 'application/vnd.android.package-archive',
                                })];
                        case 1:
                            _a.sent();
                            url = "".concat(this.publicUrl, "/").concat(key);
                            return [4 /*yield*/, this.prisma.uploadedFile.create({
                                    data: {
                                        key: key,
                                        url: url,
                                        size: file.size,
                                        mimeType: 'application/vnd.android.package-archive',
                                        bizType: 'apk',
                                        ownerId: ownerId || null,
                                    },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { url: url, key: key, size: file.size }];
                    }
                });
            });
        };
        /**
         * 删除上传文件。
         *
         * 越权防护：
         *   - 普通账号只能删自己上传的文件（按 ownerId 匹配）
         *   - admin / platform / super-admin 可以删任意文件
         * 若文件不存在或当前用户既不是 owner 也不是管理员，抛 FORBIDDEN，绝不静默成功，
         * 否则攻击者可以遍历文件 key 删别人的图片/视频。
         */
        FilesService_1.prototype.remove = function (key, actor) {
            return __awaiter(this, void 0, void 0, function () {
                var file, isAdmin, isOwner, thumbnailKey;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this.client)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '对象存储未配置');
                            return [4 /*yield*/, this.prisma.uploadedFile.findUnique({ where: { key: key } })];
                        case 1:
                            file = _a.sent();
                            if (!file) {
                                // 文件已经不存在：返回成功，前端清理掉本地引用即可（兼容历史用法）
                                return [2 /*return*/, { ok: true }];
                            }
                            // 通用文件端点只管理公开桶；私有反馈图由 ledger 生命周期管理，禁止误删 DB 引用。
                            if (file.bizType === 'ledger-feedback-private') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '私有反馈图片不可通过通用文件接口删除');
                            }
                            isAdmin = !!actor && ['admin', 'platform', 'super-admin'].includes(actor.role);
                            isOwner = !!(actor === null || actor === void 0 ? void 0 : actor.userId) && file.ownerId === actor.userId;
                            if (!isAdmin && !isOwner) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '无权删除该文件');
                            }
                            return [4 /*yield*/, this.client.removeObject(this.bucket, key).catch(function () { return null; })];
                        case 2:
                            _a.sent();
                            thumbnailKey = (0, image_thumbnail_util_1.thumbnailKeyForObjectKey)(key);
                            if (!thumbnailKey) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.client.removeObject(this.bucket, thumbnailKey).catch(function () { return null; })];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4: return [4 /*yield*/, this.prisma.uploadedFile.delete({ where: { key: key } })];
                        case 5:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        return FilesService_1;
    }());
    __setFunctionName(_classThis, "FilesService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        FilesService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return FilesService = _classThis;
}();
exports.FilesService = FilesService;
