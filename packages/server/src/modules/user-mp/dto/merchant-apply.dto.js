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
exports.MerchantApplyDto = void 0;
var class_validator_1 = require("class-validator");
/**
 * 商家入驻申请。
 *
 * password 保持可选：线上 1.0.0/100 仍会提交不带密码的旧请求；新版仅在当前
 * 手机号账号尚未设置密码时携带它。confirmPassword 永远只在客户端校验。
 */
var MerchantApplyDto = function () {
    var _a;
    var _type_decorators;
    var _type_initializers = [];
    var _type_extraInitializers = [];
    var _name_decorators;
    var _name_initializers = [];
    var _name_extraInitializers = [];
    var _legalName_decorators;
    var _legalName_initializers = [];
    var _legalName_extraInitializers = [];
    var _creditCode_decorators;
    var _creditCode_initializers = [];
    var _creditCode_extraInitializers = [];
    var _legalRep_decorators;
    var _legalRep_initializers = [];
    var _legalRep_extraInitializers = [];
    var _contact_decorators;
    var _contact_initializers = [];
    var _contact_extraInitializers = [];
    var _contactPhone_decorators;
    var _contactPhone_initializers = [];
    var _contactPhone_extraInitializers = [];
    var _phone_decorators;
    var _phone_initializers = [];
    var _phone_extraInitializers = [];
    var _region_decorators;
    var _region_initializers = [];
    var _region_extraInitializers = [];
    var _address_decorators;
    var _address_initializers = [];
    var _address_extraInitializers = [];
    var _businessLicense_decorators;
    var _businessLicense_initializers = [];
    var _businessLicense_extraInitializers = [];
    var _qualifications_decorators;
    var _qualifications_initializers = [];
    var _qualifications_extraInitializers = [];
    var _categories_decorators;
    var _categories_initializers = [];
    var _categories_extraInitializers = [];
    var _password_decorators;
    var _password_initializers = [];
    var _password_extraInitializers = [];
    return _a = /** @class */ (function () {
            function MerchantApplyDto() {
                this.type = __runInitializers(this, _type_initializers, void 0);
                this.name = (__runInitializers(this, _type_extraInitializers), __runInitializers(this, _name_initializers, void 0));
                this.legalName = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _legalName_initializers, void 0));
                this.creditCode = (__runInitializers(this, _legalName_extraInitializers), __runInitializers(this, _creditCode_initializers, void 0));
                this.legalRep = (__runInitializers(this, _creditCode_extraInitializers), __runInitializers(this, _legalRep_initializers, void 0));
                this.contact = (__runInitializers(this, _legalRep_extraInitializers), __runInitializers(this, _contact_initializers, void 0));
                this.contactPhone = (__runInitializers(this, _contact_extraInitializers), __runInitializers(this, _contactPhone_initializers, void 0));
                this.phone = (__runInitializers(this, _contactPhone_extraInitializers), __runInitializers(this, _phone_initializers, void 0));
                this.region = (__runInitializers(this, _phone_extraInitializers), __runInitializers(this, _region_initializers, void 0));
                this.address = (__runInitializers(this, _region_extraInitializers), __runInitializers(this, _address_initializers, void 0));
                this.businessLicense = (__runInitializers(this, _address_extraInitializers), __runInitializers(this, _businessLicense_initializers, void 0));
                this.qualifications = (__runInitializers(this, _businessLicense_extraInitializers), __runInitializers(this, _qualifications_initializers, void 0));
                this.categories = (__runInitializers(this, _qualifications_extraInitializers), __runInitializers(this, _categories_initializers, void 0));
                this.password = (__runInitializers(this, _categories_extraInitializers), __runInitializers(this, _password_initializers, void 0));
                __runInitializers(this, _password_extraInitializers);
            }
            return MerchantApplyDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _type_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.IsIn)(['factory', 'store'])];
            _name_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _legalName_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _creditCode_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _legalRep_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _contact_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _contactPhone_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _phone_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _region_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _address_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _businessLicense_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _qualifications_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsArray)(), (0, class_validator_1.IsString)({ each: true })];
            _categories_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsArray)(), (0, class_validator_1.IsString)({ each: true })];
            _password_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MinLength)(6), (0, class_validator_1.MaxLength)(32)];
            __esDecorate(null, null, _type_decorators, { kind: "field", name: "type", static: false, private: false, access: { has: function (obj) { return "type" in obj; }, get: function (obj) { return obj.type; }, set: function (obj, value) { obj.type = value; } }, metadata: _metadata }, _type_initializers, _type_extraInitializers);
            __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: function (obj) { return "name" in obj; }, get: function (obj) { return obj.name; }, set: function (obj, value) { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
            __esDecorate(null, null, _legalName_decorators, { kind: "field", name: "legalName", static: false, private: false, access: { has: function (obj) { return "legalName" in obj; }, get: function (obj) { return obj.legalName; }, set: function (obj, value) { obj.legalName = value; } }, metadata: _metadata }, _legalName_initializers, _legalName_extraInitializers);
            __esDecorate(null, null, _creditCode_decorators, { kind: "field", name: "creditCode", static: false, private: false, access: { has: function (obj) { return "creditCode" in obj; }, get: function (obj) { return obj.creditCode; }, set: function (obj, value) { obj.creditCode = value; } }, metadata: _metadata }, _creditCode_initializers, _creditCode_extraInitializers);
            __esDecorate(null, null, _legalRep_decorators, { kind: "field", name: "legalRep", static: false, private: false, access: { has: function (obj) { return "legalRep" in obj; }, get: function (obj) { return obj.legalRep; }, set: function (obj, value) { obj.legalRep = value; } }, metadata: _metadata }, _legalRep_initializers, _legalRep_extraInitializers);
            __esDecorate(null, null, _contact_decorators, { kind: "field", name: "contact", static: false, private: false, access: { has: function (obj) { return "contact" in obj; }, get: function (obj) { return obj.contact; }, set: function (obj, value) { obj.contact = value; } }, metadata: _metadata }, _contact_initializers, _contact_extraInitializers);
            __esDecorate(null, null, _contactPhone_decorators, { kind: "field", name: "contactPhone", static: false, private: false, access: { has: function (obj) { return "contactPhone" in obj; }, get: function (obj) { return obj.contactPhone; }, set: function (obj, value) { obj.contactPhone = value; } }, metadata: _metadata }, _contactPhone_initializers, _contactPhone_extraInitializers);
            __esDecorate(null, null, _phone_decorators, { kind: "field", name: "phone", static: false, private: false, access: { has: function (obj) { return "phone" in obj; }, get: function (obj) { return obj.phone; }, set: function (obj, value) { obj.phone = value; } }, metadata: _metadata }, _phone_initializers, _phone_extraInitializers);
            __esDecorate(null, null, _region_decorators, { kind: "field", name: "region", static: false, private: false, access: { has: function (obj) { return "region" in obj; }, get: function (obj) { return obj.region; }, set: function (obj, value) { obj.region = value; } }, metadata: _metadata }, _region_initializers, _region_extraInitializers);
            __esDecorate(null, null, _address_decorators, { kind: "field", name: "address", static: false, private: false, access: { has: function (obj) { return "address" in obj; }, get: function (obj) { return obj.address; }, set: function (obj, value) { obj.address = value; } }, metadata: _metadata }, _address_initializers, _address_extraInitializers);
            __esDecorate(null, null, _businessLicense_decorators, { kind: "field", name: "businessLicense", static: false, private: false, access: { has: function (obj) { return "businessLicense" in obj; }, get: function (obj) { return obj.businessLicense; }, set: function (obj, value) { obj.businessLicense = value; } }, metadata: _metadata }, _businessLicense_initializers, _businessLicense_extraInitializers);
            __esDecorate(null, null, _qualifications_decorators, { kind: "field", name: "qualifications", static: false, private: false, access: { has: function (obj) { return "qualifications" in obj; }, get: function (obj) { return obj.qualifications; }, set: function (obj, value) { obj.qualifications = value; } }, metadata: _metadata }, _qualifications_initializers, _qualifications_extraInitializers);
            __esDecorate(null, null, _categories_decorators, { kind: "field", name: "categories", static: false, private: false, access: { has: function (obj) { return "categories" in obj; }, get: function (obj) { return obj.categories; }, set: function (obj, value) { obj.categories = value; } }, metadata: _metadata }, _categories_initializers, _categories_extraInitializers);
            __esDecorate(null, null, _password_decorators, { kind: "field", name: "password", static: false, private: false, access: { has: function (obj) { return "password" in obj; }, get: function (obj) { return obj.password; }, set: function (obj, value) { obj.password = value; } }, metadata: _metadata }, _password_initializers, _password_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.MerchantApplyDto = MerchantApplyDto;
