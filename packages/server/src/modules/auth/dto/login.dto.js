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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshDto = exports.AdminLoginDto = exports.MerchantSmsLoginDto = exports.MerchantPasswordLoginDto = exports.SmsCodeDto = exports.PhoneLoginDto = exports.WechatLoginDto = void 0;
var class_validator_1 = require("class-validator");
var MAINLAND_PHONE_PATTERN = /^1[3-9]\d{9}$/;
var WechatLoginDto = function () {
    var _a;
    var _code_decorators;
    var _code_initializers = [];
    var _code_extraInitializers = [];
    var _encryptedData_decorators;
    var _encryptedData_initializers = [];
    var _encryptedData_extraInitializers = [];
    var _iv_decorators;
    var _iv_initializers = [];
    var _iv_extraInitializers = [];
    return _a = /** @class */ (function () {
            function WechatLoginDto() {
                this.code = __runInitializers(this, _code_initializers, void 0);
                this.encryptedData = (__runInitializers(this, _code_extraInitializers), __runInitializers(this, _encryptedData_initializers, void 0));
                this.iv = (__runInitializers(this, _encryptedData_extraInitializers), __runInitializers(this, _iv_initializers, void 0));
                __runInitializers(this, _iv_extraInitializers);
            }
            return WechatLoginDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _code_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _encryptedData_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _iv_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _code_decorators, { kind: "field", name: "code", static: false, private: false, access: { has: function (obj) { return "code" in obj; }, get: function (obj) { return obj.code; }, set: function (obj, value) { obj.code = value; } }, metadata: _metadata }, _code_initializers, _code_extraInitializers);
            __esDecorate(null, null, _encryptedData_decorators, { kind: "field", name: "encryptedData", static: false, private: false, access: { has: function (obj) { return "encryptedData" in obj; }, get: function (obj) { return obj.encryptedData; }, set: function (obj, value) { obj.encryptedData = value; } }, metadata: _metadata }, _encryptedData_initializers, _encryptedData_extraInitializers);
            __esDecorate(null, null, _iv_decorators, { kind: "field", name: "iv", static: false, private: false, access: { has: function (obj) { return "iv" in obj; }, get: function (obj) { return obj.iv; }, set: function (obj, value) { obj.iv = value; } }, metadata: _metadata }, _iv_initializers, _iv_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.WechatLoginDto = WechatLoginDto;
var PhoneLoginDto = function () {
    var _a;
    var _phone_decorators;
    var _phone_initializers = [];
    var _phone_extraInitializers = [];
    var _code_decorators;
    var _code_initializers = [];
    var _code_extraInitializers = [];
    var _smsCode_decorators;
    var _smsCode_initializers = [];
    var _smsCode_extraInitializers = [];
    return _a = /** @class */ (function () {
            function PhoneLoginDto() {
                this.phone = __runInitializers(this, _phone_initializers, void 0);
                // 兼容 code 与 smsCode
                this.code = (__runInitializers(this, _phone_extraInitializers), __runInitializers(this, _code_initializers, void 0));
                this.smsCode = (__runInitializers(this, _code_extraInitializers), __runInitializers(this, _smsCode_initializers, void 0));
                __runInitializers(this, _smsCode_extraInitializers);
            }
            return PhoneLoginDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _phone_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.Matches)(MAINLAND_PHONE_PATTERN, { message: '手机号格式不正确' })];
            _code_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _smsCode_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _phone_decorators, { kind: "field", name: "phone", static: false, private: false, access: { has: function (obj) { return "phone" in obj; }, get: function (obj) { return obj.phone; }, set: function (obj, value) { obj.phone = value; } }, metadata: _metadata }, _phone_initializers, _phone_extraInitializers);
            __esDecorate(null, null, _code_decorators, { kind: "field", name: "code", static: false, private: false, access: { has: function (obj) { return "code" in obj; }, get: function (obj) { return obj.code; }, set: function (obj, value) { obj.code = value; } }, metadata: _metadata }, _code_initializers, _code_extraInitializers);
            __esDecorate(null, null, _smsCode_decorators, { kind: "field", name: "smsCode", static: false, private: false, access: { has: function (obj) { return "smsCode" in obj; }, get: function (obj) { return obj.smsCode; }, set: function (obj, value) { obj.smsCode = value; } }, metadata: _metadata }, _smsCode_initializers, _smsCode_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.PhoneLoginDto = PhoneLoginDto;
var SmsCodeDto = function () {
    var _a;
    var _phone_decorators;
    var _phone_initializers = [];
    var _phone_extraInitializers = [];
    var _scene_decorators;
    var _scene_initializers = [];
    var _scene_extraInitializers = [];
    return _a = /** @class */ (function () {
            function SmsCodeDto() {
                this.phone = __runInitializers(this, _phone_initializers, void 0);
                this.scene = (__runInitializers(this, _phone_extraInitializers), __runInitializers(this, _scene_initializers, void 0));
                __runInitializers(this, _scene_extraInitializers);
            }
            return SmsCodeDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _phone_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.Matches)(MAINLAND_PHONE_PATTERN, { message: '手机号格式不正确' })];
            _scene_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _phone_decorators, { kind: "field", name: "phone", static: false, private: false, access: { has: function (obj) { return "phone" in obj; }, get: function (obj) { return obj.phone; }, set: function (obj, value) { obj.phone = value; } }, metadata: _metadata }, _phone_initializers, _phone_extraInitializers);
            __esDecorate(null, null, _scene_decorators, { kind: "field", name: "scene", static: false, private: false, access: { has: function (obj) { return "scene" in obj; }, get: function (obj) { return obj.scene; }, set: function (obj, value) { obj.scene = value; } }, metadata: _metadata }, _scene_initializers, _scene_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.SmsCodeDto = SmsCodeDto;
var MerchantPasswordLoginDto = function () {
    var _a;
    var _phone_decorators;
    var _phone_initializers = [];
    var _phone_extraInitializers = [];
    var _password_decorators;
    var _password_initializers = [];
    var _password_extraInitializers = [];
    return _a = /** @class */ (function () {
            function MerchantPasswordLoginDto() {
                this.phone = __runInitializers(this, _phone_initializers, void 0);
                this.password = (__runInitializers(this, _phone_extraInitializers), __runInitializers(this, _password_initializers, void 0));
                __runInitializers(this, _password_extraInitializers);
            }
            return MerchantPasswordLoginDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _phone_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.Matches)(MAINLAND_PHONE_PATTERN, { message: '手机号格式不正确' })];
            _password_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MinLength)(6), (0, class_validator_1.MaxLength)(32)];
            __esDecorate(null, null, _phone_decorators, { kind: "field", name: "phone", static: false, private: false, access: { has: function (obj) { return "phone" in obj; }, get: function (obj) { return obj.phone; }, set: function (obj, value) { obj.phone = value; } }, metadata: _metadata }, _phone_initializers, _phone_extraInitializers);
            __esDecorate(null, null, _password_decorators, { kind: "field", name: "password", static: false, private: false, access: { has: function (obj) { return "password" in obj; }, get: function (obj) { return obj.password; }, set: function (obj, value) { obj.password = value; } }, metadata: _metadata }, _password_initializers, _password_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.MerchantPasswordLoginDto = MerchantPasswordLoginDto;
var MerchantSmsLoginDto = function () {
    var _a;
    var _phone_decorators;
    var _phone_initializers = [];
    var _phone_extraInitializers = [];
    var _code_decorators;
    var _code_initializers = [];
    var _code_extraInitializers = [];
    return _a = /** @class */ (function () {
            function MerchantSmsLoginDto() {
                this.phone = __runInitializers(this, _phone_initializers, void 0);
                this.code = (__runInitializers(this, _phone_extraInitializers), __runInitializers(this, _code_initializers, void 0));
                __runInitializers(this, _code_extraInitializers);
            }
            return MerchantSmsLoginDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _phone_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.Matches)(MAINLAND_PHONE_PATTERN, { message: '手机号格式不正确' })];
            _code_decorators = [(0, class_validator_1.IsString)()];
            __esDecorate(null, null, _phone_decorators, { kind: "field", name: "phone", static: false, private: false, access: { has: function (obj) { return "phone" in obj; }, get: function (obj) { return obj.phone; }, set: function (obj, value) { obj.phone = value; } }, metadata: _metadata }, _phone_initializers, _phone_extraInitializers);
            __esDecorate(null, null, _code_decorators, { kind: "field", name: "code", static: false, private: false, access: { has: function (obj) { return "code" in obj; }, get: function (obj) { return obj.code; }, set: function (obj, value) { obj.code = value; } }, metadata: _metadata }, _code_initializers, _code_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.MerchantSmsLoginDto = MerchantSmsLoginDto;
var AdminLoginDto = function () {
    var _a;
    var _username_decorators;
    var _username_initializers = [];
    var _username_extraInitializers = [];
    var _userName_decorators;
    var _userName_initializers = [];
    var _userName_extraInitializers = [];
    var _password_decorators;
    var _password_initializers = [];
    var _password_extraInitializers = [];
    var _captcha_decorators;
    var _captcha_initializers = [];
    var _captcha_extraInitializers = [];
    return _a = /** @class */ (function () {
            function AdminLoginDto() {
                // 兼容 username / userName
                this.username = __runInitializers(this, _username_initializers, void 0);
                this.userName = (__runInitializers(this, _username_extraInitializers), __runInitializers(this, _userName_initializers, void 0));
                this.password = (__runInitializers(this, _userName_extraInitializers), __runInitializers(this, _password_initializers, void 0));
                this.captcha = (__runInitializers(this, _password_extraInitializers), __runInitializers(this, _captcha_initializers, void 0));
                __runInitializers(this, _captcha_extraInitializers);
            }
            return AdminLoginDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _username_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _userName_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _password_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MinLength)(6)];
            _captcha_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _username_decorators, { kind: "field", name: "username", static: false, private: false, access: { has: function (obj) { return "username" in obj; }, get: function (obj) { return obj.username; }, set: function (obj, value) { obj.username = value; } }, metadata: _metadata }, _username_initializers, _username_extraInitializers);
            __esDecorate(null, null, _userName_decorators, { kind: "field", name: "userName", static: false, private: false, access: { has: function (obj) { return "userName" in obj; }, get: function (obj) { return obj.userName; }, set: function (obj, value) { obj.userName = value; } }, metadata: _metadata }, _userName_initializers, _userName_extraInitializers);
            __esDecorate(null, null, _password_decorators, { kind: "field", name: "password", static: false, private: false, access: { has: function (obj) { return "password" in obj; }, get: function (obj) { return obj.password; }, set: function (obj, value) { obj.password = value; } }, metadata: _metadata }, _password_initializers, _password_extraInitializers);
            __esDecorate(null, null, _captcha_decorators, { kind: "field", name: "captcha", static: false, private: false, access: { has: function (obj) { return "captcha" in obj; }, get: function (obj) { return obj.captcha; }, set: function (obj, value) { obj.captcha = value; } }, metadata: _metadata }, _captcha_initializers, _captcha_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.AdminLoginDto = AdminLoginDto;
var RefreshDto = function () {
    var _a;
    var _refreshToken_decorators;
    var _refreshToken_initializers = [];
    var _refreshToken_extraInitializers = [];
    return _a = /** @class */ (function () {
            function RefreshDto() {
                this.refreshToken = __runInitializers(this, _refreshToken_initializers, void 0);
                __runInitializers(this, _refreshToken_extraInitializers);
            }
            return RefreshDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _refreshToken_decorators = [(0, class_validator_1.IsString)()];
            __esDecorate(null, null, _refreshToken_decorators, { kind: "field", name: "refreshToken", static: false, private: false, access: { has: function (obj) { return "refreshToken" in obj; }, get: function (obj) { return obj.refreshToken; }, set: function (obj, value) { obj.refreshToken = value; } }, metadata: _metadata }, _refreshToken_initializers, _refreshToken_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.RefreshDto = RefreshDto;
