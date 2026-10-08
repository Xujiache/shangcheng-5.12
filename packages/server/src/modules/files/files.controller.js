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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilesController = void 0;
var common_1 = require("@nestjs/common");
var platform_express_1 = require("@nestjs/platform-express");
var swagger_1 = require("@nestjs/swagger");
var throttler_1 = require("@nestjs/throttler");
var biz_exception_1 = require("../../common/exceptions/biz.exception");
/**
 * 业务类型白名单 —— 所有"上传"接口对应的 bizType 必须在这里登记。
 *
 * 为什么严格白名单：
 *   - bizType 决定对象存储 key 的一级目录（如 `avatar/2026/05/xxx.png`），
 *     如果允许任意字符串，攻击者可以传 `../../etc/passwd` 之类绕过 prefix 隔离
 *   - bizType 还决定后台审计 / 配额统计的归类，未知类别会污染指标
 *
 * 新增业务时在此 set 里追加即可：
 *   - product   商品图 / 详情图
 *   - avatar    用户 / 商家头像
 *   - idcard    实名认证证件照
 *   - apk       Android 安装包（实际通过 uploadApk 通道走，此处兜底）
 *   - chat      在线客服图文消息附件
 *   - misc      其他临时素材
 *   - ledger-ad 门窗利账广告位图片（admin-pc 后台「广告管理」直传）
 */
var BIZ_TYPE_WHITELIST = new Set([
    'product',
    'avatar',
    'idcard',
    'apk',
    'chat',
    'misc',
    'ledger-ad',
    'feedback',
]);
function normalizeBizType(input) {
    var v = (input || 'misc').toLowerCase().trim();
    if (!BIZ_TYPE_WHITELIST.has(v)) {
        throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, "\u4E0D\u652F\u6301\u7684\u4E1A\u52A1\u7C7B\u578B\uFF1A".concat(input));
    }
    return v;
}
var FilesController = function () {
    var _classDecorators = [(0, swagger_1.ApiTags)('文件'), (0, common_1.Controller)('files')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _upload_decorators;
    var _batchUpload_decorators;
    var _remove_decorators;
    var FilesController = _classThis = /** @class */ (function () {
        function FilesController_1(filesService) {
            this.filesService = (__runInitializers(this, _instanceExtraInitializers), filesService);
        }
        /**
         * 普通上传 —— 单文件
         *
         * 安全规则（防越权写）：
         *   - 客户端**不允许**指定 ownerId；ownerId 一律强制 = 当前登录用户 sub
         *   - 历史调用方仍可能传 ownerId 字段（如旧 admin-pc 代码）→ 在此忽略并 log warn
         *   - 管理员代上传需走专门接口（不在本次范围）
         */
        FilesController_1.prototype.upload = function (file, bizType, user) {
            if (!(user === null || user === void 0 ? void 0 : user.sub)) {
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.UNAUTHORIZED, '请先登录后再上传');
            }
            return this.filesService.upload(file, normalizeBizType(bizType), user.sub);
        };
        FilesController_1.prototype.batchUpload = function (files, bizType, user) {
            if (!(user === null || user === void 0 ? void 0 : user.sub)) {
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.UNAUTHORIZED, '请先登录后再上传');
            }
            return this.filesService.batchUpload(files, normalizeBizType(bizType), user.sub);
        };
        FilesController_1.prototype.remove = function (key, user) {
            return this.filesService.remove(key, user ? { userId: user.sub, role: user.role } : null);
        };
        return FilesController_1;
    }());
    __setFunctionName(_classThis, "FilesController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _upload_decorators = [(0, common_1.Post)('upload'), (0, swagger_1.ApiConsumes)('multipart/form-data'), (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60000 } }), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file'))];
        _batchUpload_decorators = [(0, common_1.Post)('batch-upload'), (0, swagger_1.ApiConsumes)('multipart/form-data'), (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60000 } }), (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 20))];
        _remove_decorators = [(0, common_1.Delete)(':key')];
        __esDecorate(_classThis, null, _upload_decorators, { kind: "method", name: "upload", static: false, private: false, access: { has: function (obj) { return "upload" in obj; }, get: function (obj) { return obj.upload; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _batchUpload_decorators, { kind: "method", name: "batchUpload", static: false, private: false, access: { has: function (obj) { return "batchUpload" in obj; }, get: function (obj) { return obj.batchUpload; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _remove_decorators, { kind: "method", name: "remove", static: false, private: false, access: { has: function (obj) { return "remove" in obj; }, get: function (obj) { return obj.remove; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        FilesController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return FilesController = _classThis;
}();
exports.FilesController = FilesController;
