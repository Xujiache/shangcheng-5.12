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
exports.LegalAdminController = exports.LegalPublicController = void 0;
/**
 * 法律协议 · Controller
 *
 * 公开读取 GET /api/v1/u/agreements（小程序/H5/三端登录页弹窗用）
 * 管理员读写 GET/PUT /api/v1/p/legal/agreements
 *
 * 安全：LegalAdminController 必须强制角色校验，否则任意已登录账号都能
 * 改隐私政策/用户协议正文（直接的合规与品牌风险）。
 */
var common_1 = require("@nestjs/common");
var swagger_1 = require("@nestjs/swagger");
var public_decorator_1 = require("../../common/decorators/public.decorator");
var roles_decorator_1 = require("../../common/decorators/roles.decorator");
var skip_response_decorator_1 = require("../../common/decorators/skip-response.decorator");
var roles_guard_1 = require("../../common/guards/roles.guard");
function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
function legalHtml(title, body, language) {
    var lang = language.toLowerCase().startsWith('en') ? 'en' : 'zh-CN';
    return "<!doctype html>\n<html lang=\"".concat(lang, "\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n  <meta name=\"color-scheme\" content=\"light dark\">\n  <title>").concat(escapeHtml(title), "</title>\n  <style>\n    :root{font-family:-apple-system,BlinkMacSystemFont,\"HarmonyOS Sans SC\",\"Noto Sans SC\",sans-serif;color:#1b1d22;background:#f6f7f9}\n    body{margin:0;padding:max(24px,env(safe-area-inset-top)) max(18px,env(safe-area-inset-right)) max(32px,env(safe-area-inset-bottom)) max(18px,env(safe-area-inset-left))}\n    main{box-sizing:border-box;max-width:860px;margin:0 auto;padding:28px;border:1px solid rgba(90,98,112,.16);border-radius:20px;background:rgba(255,255,255,.92);box-shadow:0 14px 40px rgba(36,44,60,.08)}\n    h1{margin:0 0 20px;font-size:26px;line-height:1.35}pre{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font:15px/1.85 inherit;color:inherit}\n    @media(prefers-color-scheme:dark){:root{color:#f2f3f5;background:#111319}main{background:rgba(30,33,41,.94);border-color:rgba(255,255,255,.12);box-shadow:none}}\n    @media(max-width:600px){body{padding-left:12px;padding-right:12px}main{padding:20px 16px;border-radius:16px}h1{font-size:22px}pre{font-size:14px}}\n  </style>\n</head>\n<body><main><h1>").concat(escapeHtml(title), "</h1><pre>").concat(escapeHtml(body), "</pre></main></body>\n</html>");
}
var LegalPublicController = function () {
    var _classDecorators = [(0, swagger_1.ApiTags)('协议 · 公开'), (0, common_1.Controller)('u')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _list_decorators;
    var _merchantHarmonyDocument_decorators;
    var LegalPublicController = _classThis = /** @class */ (function () {
        function LegalPublicController_1(svc) {
            this.svc = (__runInitializers(this, _instanceExtraInitializers), svc);
        }
        /** 三端登录页 / 设置页弹窗读取 */
        LegalPublicController_1.prototype.list = function (language, platform) {
            return this.svc.list(language, platform);
        };
        /** AppGallery 与浏览器可直接访问的鸿蒙商家端法律文本。 */
        LegalPublicController_1.prototype.merchantHarmonyDocument = function (kind, requestedLanguage, acceptedLanguage, response) {
            return __awaiter(this, void 0, void 0, function () {
                var language, agreements, section;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            language = requestedLanguage || acceptedLanguage || 'zh-CN';
                            return [4 /*yield*/, this.svc.merchantHarmonyList(language)];
                        case 1:
                            agreements = _a.sent();
                            section = kind === 'privacy'
                                ? agreements.privacy
                                : kind === 'collect'
                                    ? agreements.collect
                                    : agreements.user;
                            response
                                .status(200)
                                .set({
                                'Content-Type': 'text/html; charset=utf-8',
                                'Cache-Control': 'public, max-age=300',
                                'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
                                'X-Content-Type-Options': 'nosniff',
                            })
                                .send(legalHtml(section.title, section.body, language));
                            return [2 /*return*/];
                    }
                });
            });
        };
        return LegalPublicController_1;
    }());
    __setFunctionName(_classThis, "LegalPublicController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _list_decorators = [(0, public_decorator_1.Public)(), (0, common_1.Get)('agreements')];
        _merchantHarmonyDocument_decorators = [(0, public_decorator_1.Public)(), (0, skip_response_decorator_1.SkipResponseWrap)(), (0, common_1.Get)('legal/merchant-harmony/:kind')];
        __esDecorate(_classThis, null, _list_decorators, { kind: "method", name: "list", static: false, private: false, access: { has: function (obj) { return "list" in obj; }, get: function (obj) { return obj.list; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _merchantHarmonyDocument_decorators, { kind: "method", name: "merchantHarmonyDocument", static: false, private: false, access: { has: function (obj) { return "merchantHarmonyDocument" in obj; }, get: function (obj) { return obj.merchantHarmonyDocument; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LegalPublicController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LegalPublicController = _classThis;
}();
exports.LegalPublicController = LegalPublicController;
var LegalAdminController = function () {
    var _classDecorators = [(0, swagger_1.ApiTags)('协议 · 平台'), (0, common_1.UseGuards)(roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)('admin', 'platform', 'super-admin'), (0, common_1.Controller)('p/legal')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _read_decorators;
    var _write_decorators;
    var LegalAdminController = _classThis = /** @class */ (function () {
        function LegalAdminController_1(svc) {
            this.svc = (__runInitializers(this, _instanceExtraInitializers), svc);
        }
        LegalAdminController_1.prototype.read = function () {
            return this.svc.list();
        };
        LegalAdminController_1.prototype.write = function (dto) {
            return this.svc.save(dto);
        };
        return LegalAdminController_1;
    }());
    __setFunctionName(_classThis, "LegalAdminController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _read_decorators = [(0, common_1.Get)('agreements')];
        _write_decorators = [(0, common_1.Put)('agreements')];
        __esDecorate(_classThis, null, _read_decorators, { kind: "method", name: "read", static: false, private: false, access: { has: function (obj) { return "read" in obj; }, get: function (obj) { return obj.read; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _write_decorators, { kind: "method", name: "write", static: false, private: false, access: { has: function (obj) { return "write" in obj; }, get: function (obj) { return obj.write; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LegalAdminController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LegalAdminController = _classThis;
}();
exports.LegalAdminController = LegalAdminController;
