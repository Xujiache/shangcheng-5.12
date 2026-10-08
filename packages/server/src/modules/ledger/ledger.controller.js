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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerController = void 0;
var common_1 = require("@nestjs/common");
var platform_express_1 = require("@nestjs/platform-express");
var swagger_1 = require("@nestjs/swagger");
var throttler_1 = require("@nestjs/throttler");
var public_decorator_1 = require("../../common/decorators/public.decorator");
var biz_exception_1 = require("../../common/exceptions/biz.exception");
var ledger_jwt_guard_1 = require("./guards/ledger-jwt.guard");
/**
 * 门窗利账 App · 账户与会员（/api/v1/l/*，仅需登录，不需会员有效）。
 * me / membership / profile 在闸门期也要可用（否则会员页拿不到状态）。
 */
var LedgerController = function () {
    var _classDecorators = [(0, swagger_1.ApiTags)('门窗利账-账户'), (0, public_decorator_1.Public)(), (0, common_1.UseGuards)(ledger_jwt_guard_1.LedgerJwtGuard), (0, common_1.Controller)('l')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _me_decorators;
    var _uploadAvatar_decorators;
    var _membership_decorators;
    var _updateProfile_decorators;
    var _notifications_decorators;
    var _unreadCount_decorators;
    var _readAll_decorators;
    var _readOne_decorators;
    var _getSettings_decorators;
    var _updateSettings_decorators;
    var _uploadFeedbackMedia_decorators;
    var _feedback_decorators;
    var _ads_decorators;
    var _cutAccess_decorators;
    var _invite_decorators;
    var _changelogs_decorators;
    var _changelog_decorators;
    var _exportData_decorators;
    var _importData_decorators;
    var LedgerController = _classThis = /** @class */ (function () {
        function LedgerController_1(svc, files, extra, pay, xpay) {
            this.svc = (__runInitializers(this, _instanceExtraInitializers), svc);
            this.files = files;
            this.extra = extra;
            this.pay = pay;
            this.xpay = xpay;
        }
        LedgerController_1.prototype.me = function (user) {
            return user;
        };
        /** 头像图片：服务端统一旋转、裁剪、检测、存储并更新资料。 */
        LedgerController_1.prototype.uploadAvatar = function (user, file, nickname) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (!file)
                        throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请选择图片');
                    return [2 /*return*/, this.svc.updateProfileWithAvatar(user.id, file, nickname)];
                });
            });
        };
        LedgerController_1.prototype.membership = function (user) {
            return __awaiter(this, void 0, void 0, function () {
                var m;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.membership(user.id, user.membership)
                            // virtualPayEnabled=true 时小程序走「虚拟支付」内购（合规）；否则回退「留言找管理员」。
                            // payEnabled（普通微信支付）保留给非小程序端，小程序内购不再用它（虚拟商品合规要求）。
                        ];
                        case 1:
                            m = _a.sent();
                            // virtualPayEnabled=true 时小程序走「虚拟支付」内购（合规）；否则回退「留言找管理员」。
                            // payEnabled（普通微信支付）保留给非小程序端，小程序内购不再用它（虚拟商品合规要求）。
                            return [2 /*return*/, __assign(__assign({}, m), { payEnabled: this.pay.payEnabled(), virtualPayEnabled: this.xpay.xpayEnabled() })];
                    }
                });
            });
        };
        LedgerController_1.prototype.updateProfile = function (user, dto) {
            return this.svc.updateProfile(user.id, dto);
        };
        // ── 消息中心 ──
        LedgerController_1.prototype.notifications = function (u) {
            return this.svc.listNotifications(u.id);
        };
        LedgerController_1.prototype.unreadCount = function (u) {
            return this.svc.unreadCount(u.id);
        };
        LedgerController_1.prototype.readAll = function (u) {
            return this.svc.markAllNotificationsRead(u.id);
        };
        LedgerController_1.prototype.readOne = function (u, id) {
            return this.svc.markNotificationRead(u.id, id);
        };
        // ── 偏好设置 ──
        LedgerController_1.prototype.getSettings = function (u) {
            return this.svc.getSettings(u.id);
        };
        LedgerController_1.prototype.updateSettings = function (u, dto) {
            return this.svc.updateSettings(u.id, dto);
        };
        // ── 意见反馈 ──
        /** 反馈附图：灰度开关开启后写独立私有桶，旧客户端仍能使用返回的短时 URL。 */
        LedgerController_1.prototype.uploadFeedbackMedia = function (user, file) {
            return __awaiter(this, void 0, void 0, function () {
                var url;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!file)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请选择图片');
                            if (process.env.LEDGER_PRIVATE_FEEDBACK === '1')
                                return [2 /*return*/, this.files.uploadPrivateFeedback(file, user.id)];
                            return [4 /*yield*/, this.files.upload(file, 'feedback', user.id, 'ledger')];
                        case 1:
                            url = (_a.sent()).url;
                            return [2 /*return*/, { url: url }];
                    }
                });
            });
        };
        LedgerController_1.prototype.feedback = function (u, dto) {
            return this.svc.createFeedback(u.id, dto);
        };
        // ── 首页广告（#2）：取启用中的轮播 ──
        LedgerController_1.prototype.ads = function () {
            return this.svc.listAds();
        };
        // ── 优化下料闸门（#9）：试用 / 会员校验 ──
        LedgerController_1.prototype.cutAccess = function (u) {
            return this.svc.cutAccess(u.id, u.membership);
        };
        // ── 邀请（#10）：邀请码 + 已邀人数 + 奖励天数 ──
        LedgerController_1.prototype.invite = function (u) {
            return this.svc.getInvite(u.id);
        };
        // ── 更新日志（按版本定向：客户端拉自己版本那条做首开弹窗）──
        LedgerController_1.prototype.changelogs = function () {
            return this.extra.changelogList();
        };
        LedgerController_1.prototype.changelog = function (version) {
            return this.extra.changelogByVersion(version);
        };
        // ── 数据导出 / 导入（加密数据包）──
        LedgerController_1.prototype.exportData = function (u, dto) {
            return this.extra.exportData(u.id, dto.allowShare === true);
        };
        LedgerController_1.prototype.importData = function (u, dto) {
            return this.extra.importData(u.id, dto.pkg);
        };
        return LedgerController_1;
    }());
    __setFunctionName(_classThis, "LedgerController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _me_decorators = [(0, common_1.Get)('me')];
        _uploadAvatar_decorators = [(0, common_1.Post)('profile/avatar'), (0, swagger_1.ApiConsumes)('multipart/form-data'), (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60000 } }), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 10 * 1024 * 1024 } }))];
        _membership_decorators = [(0, common_1.Get)('membership')];
        _updateProfile_decorators = [(0, common_1.Patch)('profile')];
        _notifications_decorators = [(0, common_1.Get)('notifications')];
        _unreadCount_decorators = [(0, common_1.Get)('notifications/unread-count')];
        _readAll_decorators = [(0, common_1.Post)('notifications/read-all')];
        _readOne_decorators = [(0, common_1.Post)('notifications/:id/read')];
        _getSettings_decorators = [(0, common_1.Get)('settings')];
        _updateSettings_decorators = [(0, common_1.Put)('settings')];
        _uploadFeedbackMedia_decorators = [(0, common_1.Post)('feedback-media'), (0, swagger_1.ApiConsumes)('multipart/form-data'), (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60000 } }), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 10 * 1024 * 1024 } }))];
        _feedback_decorators = [(0, common_1.Post)('feedback')];
        _ads_decorators = [(0, common_1.Get)('ads')];
        _cutAccess_decorators = [(0, common_1.Get)('cut/access')];
        _invite_decorators = [(0, common_1.Get)('invite')];
        _changelogs_decorators = [(0, common_1.Get)('changelogs')];
        _changelog_decorators = [(0, common_1.Get)('changelog')];
        _exportData_decorators = [(0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }), (0, common_1.Post)('data/export')];
        _importData_decorators = [(0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }), (0, common_1.Post)('data/import')];
        __esDecorate(_classThis, null, _me_decorators, { kind: "method", name: "me", static: false, private: false, access: { has: function (obj) { return "me" in obj; }, get: function (obj) { return obj.me; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _uploadAvatar_decorators, { kind: "method", name: "uploadAvatar", static: false, private: false, access: { has: function (obj) { return "uploadAvatar" in obj; }, get: function (obj) { return obj.uploadAvatar; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _membership_decorators, { kind: "method", name: "membership", static: false, private: false, access: { has: function (obj) { return "membership" in obj; }, get: function (obj) { return obj.membership; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateProfile_decorators, { kind: "method", name: "updateProfile", static: false, private: false, access: { has: function (obj) { return "updateProfile" in obj; }, get: function (obj) { return obj.updateProfile; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _notifications_decorators, { kind: "method", name: "notifications", static: false, private: false, access: { has: function (obj) { return "notifications" in obj; }, get: function (obj) { return obj.notifications; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _unreadCount_decorators, { kind: "method", name: "unreadCount", static: false, private: false, access: { has: function (obj) { return "unreadCount" in obj; }, get: function (obj) { return obj.unreadCount; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _readAll_decorators, { kind: "method", name: "readAll", static: false, private: false, access: { has: function (obj) { return "readAll" in obj; }, get: function (obj) { return obj.readAll; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _readOne_decorators, { kind: "method", name: "readOne", static: false, private: false, access: { has: function (obj) { return "readOne" in obj; }, get: function (obj) { return obj.readOne; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getSettings_decorators, { kind: "method", name: "getSettings", static: false, private: false, access: { has: function (obj) { return "getSettings" in obj; }, get: function (obj) { return obj.getSettings; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateSettings_decorators, { kind: "method", name: "updateSettings", static: false, private: false, access: { has: function (obj) { return "updateSettings" in obj; }, get: function (obj) { return obj.updateSettings; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _uploadFeedbackMedia_decorators, { kind: "method", name: "uploadFeedbackMedia", static: false, private: false, access: { has: function (obj) { return "uploadFeedbackMedia" in obj; }, get: function (obj) { return obj.uploadFeedbackMedia; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _feedback_decorators, { kind: "method", name: "feedback", static: false, private: false, access: { has: function (obj) { return "feedback" in obj; }, get: function (obj) { return obj.feedback; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _ads_decorators, { kind: "method", name: "ads", static: false, private: false, access: { has: function (obj) { return "ads" in obj; }, get: function (obj) { return obj.ads; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _cutAccess_decorators, { kind: "method", name: "cutAccess", static: false, private: false, access: { has: function (obj) { return "cutAccess" in obj; }, get: function (obj) { return obj.cutAccess; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _invite_decorators, { kind: "method", name: "invite", static: false, private: false, access: { has: function (obj) { return "invite" in obj; }, get: function (obj) { return obj.invite; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _changelogs_decorators, { kind: "method", name: "changelogs", static: false, private: false, access: { has: function (obj) { return "changelogs" in obj; }, get: function (obj) { return obj.changelogs; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _changelog_decorators, { kind: "method", name: "changelog", static: false, private: false, access: { has: function (obj) { return "changelog" in obj; }, get: function (obj) { return obj.changelog; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _exportData_decorators, { kind: "method", name: "exportData", static: false, private: false, access: { has: function (obj) { return "exportData" in obj; }, get: function (obj) { return obj.exportData; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _importData_decorators, { kind: "method", name: "importData", static: false, private: false, access: { has: function (obj) { return "importData" in obj; }, get: function (obj) { return obj.importData; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LedgerController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LedgerController = _classThis;
}();
exports.LedgerController = LedgerController;
