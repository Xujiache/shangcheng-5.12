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
exports.LegalService = void 0;
/**
 * 法律协议 · 服务
 *
 * 单一真源：SystemConfig（key=legal_agreements）的 value 字段。
 * 后台未配置时返回默认企业级文本。
 * 用户端公开读取，平台端管理员可写。
 */
var common_1 = require("@nestjs/common");
var legal_defaults_1 = require("./legal.defaults");
var legal_defaults_en_1 = require("./legal.defaults.en");
var legal_merchant_harmony_1 = require("./legal.merchant-harmony");
var LegalService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var LegalService = _classThis = /** @class */ (function () {
        function LegalService_1(prisma) {
            this.prisma = prisma;
        }
        LegalService_1.prototype.list = function () {
            return __awaiter(this, arguments, void 0, function (language, platform) {
                var english, key, defaults, row, stored;
                if (language === void 0) { language = 'zh-CN'; }
                if (platform === void 0) { platform = ''; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (platform.trim().toLowerCase() === 'merchant-harmony') {
                                return [2 /*return*/, this.merchantHarmonyList(language)];
                            }
                            english = language.toLowerCase().startsWith('en');
                            key = english ? legal_defaults_en_1.LEGAL_AGREEMENTS_EN_KEY : legal_defaults_1.LEGAL_AGREEMENTS_KEY;
                            defaults = english ? legal_defaults_en_1.DEFAULT_LEGAL_AGREEMENTS_EN : legal_defaults_1.DEFAULT_LEGAL_AGREEMENTS;
                            return [4 /*yield*/, this.prisma.systemConfig.findUnique({
                                    where: { key: key },
                                })];
                        case 1:
                            row = _a.sent();
                            stored = (row === null || row === void 0 ? void 0 : row.value) || {};
                            // 与默认值做 deep merge，避免后台只更了一项时其他两项为空
                            return [2 /*return*/, {
                                    user: __assign(__assign({}, defaults.user), (stored.user || {})),
                                    privacy: __assign(__assign({}, defaults.privacy), (stored.privacy || {})),
                                    collect: __assign(__assign({}, defaults.collect), (stored.collect || {})),
                                }];
                    }
                });
            });
        };
        LegalService_1.prototype.merchantHarmonyList = function () {
            return __awaiter(this, arguments, void 0, function (language) {
                var english, key, _a, row, systemSettings, raw, service, contact, defaults, stored;
                var _b, _c, _d, _e, _f, _g, _h, _j, _k;
                if (language === void 0) { language = 'zh-CN'; }
                return __generator(this, function (_l) {
                    switch (_l.label) {
                        case 0:
                            english = language.toLowerCase().startsWith('en');
                            key = english ? legal_merchant_harmony_1.MERCHANT_HARMONY_LEGAL_EN_KEY : legal_merchant_harmony_1.MERCHANT_HARMONY_LEGAL_KEY;
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.systemConfig.findUnique({ where: { key: key } }),
                                    this.prisma.systemConfig.findUnique({ where: { key: 'system_settings' } }),
                                ])];
                        case 1:
                            _a = _l.sent(), row = _a[0], systemSettings = _a[1];
                            raw = (systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.value) || {};
                            service = raw.service || {};
                            contact = {
                                phone: (_d = (_c = (_b = service.customerServicePhone) !== null && _b !== void 0 ? _b : service.phone) !== null && _c !== void 0 ? _c : raw.customerServicePhone) !== null && _d !== void 0 ? _d : null,
                                email: (_g = (_f = (_e = service.customerServiceEmail) !== null && _e !== void 0 ? _e : service.email) !== null && _f !== void 0 ? _f : raw.customerServiceEmail) !== null && _g !== void 0 ? _g : null,
                                hours: (_k = (_j = (_h = service.customerServiceHours) !== null && _h !== void 0 ? _h : service.workTime) !== null && _j !== void 0 ? _j : raw.customerServiceHours) !== null && _k !== void 0 ? _k : null,
                            };
                            defaults = (0, legal_merchant_harmony_1.merchantHarmonyAgreements)(language, contact);
                            stored = (row === null || row === void 0 ? void 0 : row.value) || {};
                            return [2 /*return*/, {
                                    user: __assign(__assign({}, defaults.user), (stored.user || {})),
                                    privacy: __assign(__assign({}, defaults.privacy), (stored.privacy || {})),
                                    collect: __assign(__assign({}, defaults.collect), (stored.collect || {})),
                                }];
                    }
                });
            });
        };
        LegalService_1.prototype.save = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var current, merged, today, _i, _a, k;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.list()];
                        case 1:
                            current = _b.sent();
                            merged = {
                                user: __assign(__assign({}, current.user), (dto.user || {})),
                                privacy: __assign(__assign({}, current.privacy), (dto.privacy || {})),
                                collect: __assign(__assign({}, current.collect), (dto.collect || {})),
                            };
                            today = new Date().toISOString().slice(0, 10);
                            for (_i = 0, _a = ['user', 'privacy', 'collect']; _i < _a.length; _i++) {
                                k = _a[_i];
                                if (dto[k] && (dto[k].body || dto[k].title))
                                    merged[k].updatedAt = today;
                            }
                            return [4 /*yield*/, this.prisma.systemConfig.upsert({
                                    where: { key: legal_defaults_1.LEGAL_AGREEMENTS_KEY },
                                    update: { value: merged },
                                    create: { key: legal_defaults_1.LEGAL_AGREEMENTS_KEY, value: merged },
                                })];
                        case 2:
                            _b.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        return LegalService_1;
    }());
    __setFunctionName(_classThis, "LegalService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LegalService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LegalService = _classThis;
}();
exports.LegalService = LegalService;
