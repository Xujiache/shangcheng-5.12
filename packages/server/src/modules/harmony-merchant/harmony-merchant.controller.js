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
exports.HuaweiIapNotificationController = exports.HarmonyMerchantController = void 0;
var common_1 = require("@nestjs/common");
var swagger_1 = require("@nestjs/swagger");
var public_decorator_1 = require("../../common/decorators/public.decorator");
var roles_decorator_1 = require("../../common/decorators/roles.decorator");
var skip_response_decorator_1 = require("../../common/decorators/skip-response.decorator");
var roles_guard_1 = require("../../common/guards/roles.guard");
var HarmonyMerchantController = function () {
    var _classDecorators = [(0, swagger_1.ApiTags)('鸿蒙商家端'), (0, common_1.UseGuards)(roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)('merchant', 'factory', 'store', 'super-admin'), (0, common_1.Controller)('m')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _registerPush_decorators;
    var _unregisterPush_decorators;
    var _pushPreferences_decorators;
    var _updatePushPreferences_decorators;
    var _prepareIap_decorators;
    var _verifyIap_decorators;
    var _restoreIap_decorators;
    var HarmonyMerchantController = _classThis = /** @class */ (function () {
        function HarmonyMerchantController_1(merchant, push, iap) {
            this.merchant = (__runInitializers(this, _instanceExtraInitializers), merchant);
            this.push = push;
            this.iap = iap;
        }
        HarmonyMerchantController_1.prototype.registerPush = function (user, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var merchantId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.merchant.ensureMerchantId(user)];
                        case 1:
                            merchantId = _a.sent();
                            return [2 /*return*/, this.push.register(user.sub, merchantId, dto)];
                    }
                });
            });
        };
        HarmonyMerchantController_1.prototype.unregisterPush = function (user, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var merchantId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.merchant.ensureMerchantId(user)];
                        case 1:
                            merchantId = _a.sent();
                            return [2 /*return*/, this.push.unregister(user.sub, merchantId, dto)];
                    }
                });
            });
        };
        HarmonyMerchantController_1.prototype.pushPreferences = function (user) {
            return __awaiter(this, void 0, void 0, function () {
                var merchantId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.merchant.ensureMerchantId(user)];
                        case 1:
                            merchantId = _a.sent();
                            return [2 /*return*/, this.push.getPreferences(merchantId)];
                    }
                });
            });
        };
        HarmonyMerchantController_1.prototype.updatePushPreferences = function (user, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var merchantId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.merchant.ensureMerchantId(user)];
                        case 1:
                            merchantId = _a.sent();
                            return [2 /*return*/, this.push.setPreferences(merchantId, dto)];
                    }
                });
            });
        };
        HarmonyMerchantController_1.prototype.prepareIap = function (user, planId) {
            return __awaiter(this, void 0, void 0, function () {
                var merchantId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.merchant.ensureMerchantId(user)];
                        case 1:
                            merchantId = _a.sent();
                            return [2 /*return*/, this.iap.prepare(merchantId, user.sub, planId)];
                    }
                });
            });
        };
        HarmonyMerchantController_1.prototype.verifyIap = function (user, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var merchantId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.merchant.ensureMerchantId(user)];
                        case 1:
                            merchantId = _a.sent();
                            return [2 /*return*/, this.iap.verify(merchantId, user.sub, String(dto.orderNo || ''), String(dto.purchaseData || ''))];
                    }
                });
            });
        };
        HarmonyMerchantController_1.prototype.restoreIap = function (user, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var merchantId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.merchant.ensureMerchantId(user)];
                        case 1:
                            merchantId = _a.sent();
                            return [2 /*return*/, this.iap.restore(merchantId, user.sub, String(dto.productType || ''), String(dto.purchaseData || ''))];
                    }
                });
            });
        };
        return HarmonyMerchantController_1;
    }());
    __setFunctionName(_classThis, "HarmonyMerchantController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _registerPush_decorators = [(0, common_1.Put)('push/devices/current')];
        _unregisterPush_decorators = [(0, common_1.Delete)('push/devices/current')];
        _pushPreferences_decorators = [(0, common_1.Get)('push/preferences')];
        _updatePushPreferences_decorators = [(0, common_1.Put)('push/preferences')];
        _prepareIap_decorators = [(0, common_1.Post)('membership/iap/prepare')];
        _verifyIap_decorators = [(0, common_1.Post)('membership/iap/verify')];
        _restoreIap_decorators = [(0, common_1.Post)('membership/iap/restore')];
        __esDecorate(_classThis, null, _registerPush_decorators, { kind: "method", name: "registerPush", static: false, private: false, access: { has: function (obj) { return "registerPush" in obj; }, get: function (obj) { return obj.registerPush; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _unregisterPush_decorators, { kind: "method", name: "unregisterPush", static: false, private: false, access: { has: function (obj) { return "unregisterPush" in obj; }, get: function (obj) { return obj.unregisterPush; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _pushPreferences_decorators, { kind: "method", name: "pushPreferences", static: false, private: false, access: { has: function (obj) { return "pushPreferences" in obj; }, get: function (obj) { return obj.pushPreferences; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updatePushPreferences_decorators, { kind: "method", name: "updatePushPreferences", static: false, private: false, access: { has: function (obj) { return "updatePushPreferences" in obj; }, get: function (obj) { return obj.updatePushPreferences; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _prepareIap_decorators, { kind: "method", name: "prepareIap", static: false, private: false, access: { has: function (obj) { return "prepareIap" in obj; }, get: function (obj) { return obj.prepareIap; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _verifyIap_decorators, { kind: "method", name: "verifyIap", static: false, private: false, access: { has: function (obj) { return "verifyIap" in obj; }, get: function (obj) { return obj.verifyIap; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _restoreIap_decorators, { kind: "method", name: "restoreIap", static: false, private: false, access: { has: function (obj) { return "restoreIap" in obj; }, get: function (obj) { return obj.restoreIap; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        HarmonyMerchantController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return HarmonyMerchantController = _classThis;
}();
exports.HarmonyMerchantController = HarmonyMerchantController;
var HuaweiIapNotificationController = function () {
    var _classDecorators = [(0, swagger_1.ApiTags)('华为 IAP 回调'), (0, public_decorator_1.Public)(), (0, skip_response_decorator_1.SkipResponseWrap)(), (0, common_1.Controller)('payments/huawei-iap')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _notify_decorators;
    var HuaweiIapNotificationController = _classThis = /** @class */ (function () {
        function HuaweiIapNotificationController_1(iap) {
            this.iap = (__runInitializers(this, _instanceExtraInitializers), iap);
        }
        HuaweiIapNotificationController_1.prototype.notify = function (body) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.iap.handleNotification(body)];
                });
            });
        };
        return HuaweiIapNotificationController_1;
    }());
    __setFunctionName(_classThis, "HuaweiIapNotificationController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _notify_decorators = [(0, common_1.Post)('notify')];
        __esDecorate(_classThis, null, _notify_decorators, { kind: "method", name: "notify", static: false, private: false, access: { has: function (obj) { return "notify" in obj; }, get: function (obj) { return obj.notify; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        HuaweiIapNotificationController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return HuaweiIapNotificationController = _classThis;
}();
exports.HuaweiIapNotificationController = HuaweiIapNotificationController;
