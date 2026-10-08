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
exports.AppReleaseService = void 0;
/**
 * APP 发布管理 #7 软件自更新
 *
 * - platform-admin: 上传 APK + 创建 / 列出 / 删除发布记录
 * - 公开（端上）: 获取最新版（用于启动时检查更新）
 */
var common_1 = require("@nestjs/common");
var biz_exception_1 = require("../../common/exceptions/biz.exception");
var AppReleaseService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AppReleaseService = _classThis = /** @class */ (function () {
        function AppReleaseService_1(prisma, files) {
            this.prisma = prisma;
            this.files = files;
        }
        AppReleaseService_1.prototype.assertPlatform = function (p) {
            if (p === 'merchant' || p === 'platform' || p === 'merchant-harmony')
                return p;
            throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, 'platform 仅支持 merchant / platform / merchant-harmony');
        };
        /** 创建发布：先上传 APK，再写库 */
        AppReleaseService_1.prototype.create = function (file, dto, createdById) {
            return __awaiter(this, void 0, void 0, function () {
                var platform, versionCode, exists, releaseUrl, releaseSize, storeUrl, uploaded, row;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            platform = this.assertPlatform(dto.platform);
                            if (!dto.version)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请填写 version');
                            versionCode = Number(dto.versionCode);
                            if (!versionCode || !Number.isInteger(versionCode) || versionCode <= 0) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, 'versionCode 必须是正整数');
                            }
                            return [4 /*yield*/, this.prisma.appRelease.findUnique({
                                    where: { platform_versionCode: { platform: platform, versionCode: versionCode } },
                                })];
                        case 1:
                            exists = _a.sent();
                            if (exists) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, "\u8BE5\u5E73\u53F0\u5DF2\u5B58\u5728 versionCode=".concat(versionCode, " \u7684\u53D1\u5E03"));
                            }
                            releaseUrl = '';
                            releaseSize = 0;
                            if (!(platform === 'merchant-harmony')) return [3 /*break*/, 2];
                            storeUrl = String(dto.storeUrl || '').trim();
                            if (!/^https:\/\//i.test(storeUrl)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '鸿蒙版本必须填写 HTTPS AppGallery 地址');
                            }
                            releaseUrl = storeUrl;
                            return [3 /*break*/, 4];
                        case 2:
                            if (!file)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请选择 APK 文件');
                            return [4 /*yield*/, this.files.uploadApk(file, createdById)];
                        case 3:
                            uploaded = _a.sent();
                            releaseUrl = uploaded.url;
                            releaseSize = uploaded.size;
                            _a.label = 4;
                        case 4: return [4 /*yield*/, this.prisma.appRelease.create({
                                data: {
                                    platform: platform,
                                    version: dto.version,
                                    versionCode: versionCode,
                                    url: releaseUrl,
                                    size: releaseSize,
                                    changelog: dto.changelog || '',
                                    force: !!(dto.force === true || String(dto.force) === 'true'),
                                    createdById: createdById || null,
                                },
                            })];
                        case 5:
                            row = _a.sent();
                            return [2 /*return*/, row];
                    }
                });
            });
        };
        AppReleaseService_1.prototype.list = function (platform) {
            return __awaiter(this, void 0, void 0, function () {
                var where;
                return __generator(this, function (_a) {
                    where = platform ? { platform: this.assertPlatform(platform) } : {};
                    return [2 /*return*/, this.prisma.appRelease.findMany({
                            where: where,
                            orderBy: [{ platform: 'asc' }, { versionCode: 'desc' }],
                        })];
                });
            });
        };
        AppReleaseService_1.prototype.remove = function (id, actor) {
            return __awaiter(this, void 0, void 0, function () {
                var row, uploaded, key, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.appRelease.findUnique({ where: { id: id } })];
                        case 1:
                            row = _b.sent();
                            if (!row)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '发布不存在');
                            return [4 /*yield*/, this.prisma.uploadedFile.findFirst({ where: { url: row.url } })];
                        case 2:
                            uploaded = _b.sent();
                            key = uploaded === null || uploaded === void 0 ? void 0 : uploaded.key;
                            if (!key) return [3 /*break*/, 6];
                            _b.label = 3;
                        case 3:
                            _b.trys.push([3, 5, , 6]);
                            // controller 层已经强制 admin/platform/super-admin，调用 files.remove
                            // 需要传 actor 以通过 owner 校验；这里直接透传上层来的 actor，符合最小权限原则
                            return [4 /*yield*/, this.files.remove(key, actor)];
                        case 4:
                            // controller 层已经强制 admin/platform/super-admin，调用 files.remove
                            // 需要传 actor 以通过 owner 校验；这里直接透传上层来的 actor，符合最小权限原则
                            _b.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            _a = _b.sent();
                            return [3 /*break*/, 6];
                        case 6: return [4 /*yield*/, this.prisma.appRelease.delete({ where: { id: id } })];
                        case 7:
                            _b.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        /**
         * 公开：APP 启动时调用，返回该平台最新发布（无发布时返回 null）
         *
         * 零假数据 P0：之前没有记录时返回 `version: '0.0.0'` 占位 JSON，
         * 会让客户端误以为线上有"0.0.0 版本"导致一直触发"有新版本可更新"逻辑。
         *
         * 行为变更（Wave5）：从抛 NOT_FOUND（404 噪音）改为返回 `null`。
         * 原因：商家 APP onLaunch 会调一次本接口做静默更新检查，那时数据库可能根本就没人发布过包 ——
         * 这是"空态"而不是"错误"，404 会污染浏览器控制台并让前端 silent 拦截器也无法完全隐藏。
         * 改为 200 + null：前端拿到 null 走"暂无新版本"分支即可，符合 REST 语义。
         */
        AppReleaseService_1.prototype.latest = function (platform) {
            return __awaiter(this, void 0, void 0, function () {
                var p, row;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            p = this.assertPlatform(platform);
                            return [4 /*yield*/, this.prisma.appRelease.findFirst({
                                    where: { platform: p },
                                    orderBy: { versionCode: 'desc' },
                                })];
                        case 1:
                            row = _a.sent();
                            if (!row)
                                return [2 /*return*/, null];
                            return [2 /*return*/, {
                                    version: row.version,
                                    versionCode: row.versionCode,
                                    url: row.url,
                                    storeUrl: p === 'merchant-harmony' ? row.url : null,
                                    size: row.size,
                                    changelog: row.changelog,
                                    force: row.force,
                                    publishedAt: row.publishedAt.toISOString(),
                                }];
                    }
                });
            });
        };
        return AppReleaseService_1;
    }());
    __setFunctionName(_classThis, "AppReleaseService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AppReleaseService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AppReleaseService = _classThis;
}();
exports.AppReleaseService = AppReleaseService;
