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
exports.AddressDto = void 0;
var class_validator_1 = require("class-validator");
/**
 * POST /u/addresses (createAddress) 与 PUT /u/addresses/:id (updateAddress)
 * 二者都走 service.sanitizeAddressDto(dto)，该方法按名读取（非 spread）：
 *   - dto.name、dto.phone、dto.region、dto.detail（缺失/空串/手机号格式错 → 服务端抛 INVALID_PARAMS）
 *   - dto.isDefault（Boolean(dto.isDefault) 读取）
 *
 * 必填/格式由服务端 sanitizeAddressDto 用业务友好文案兜底，DTO 仅保留字段 + 类型，
 * 全部 @IsOptional 以免 whitelist 提前 400 抢在服务端校验之前。
 */
var AddressDto = function () {
    var _a;
    var _name_decorators;
    var _name_initializers = [];
    var _name_extraInitializers = [];
    var _phone_decorators;
    var _phone_initializers = [];
    var _phone_extraInitializers = [];
    var _region_decorators;
    var _region_initializers = [];
    var _region_extraInitializers = [];
    var _detail_decorators;
    var _detail_initializers = [];
    var _detail_extraInitializers = [];
    var _isDefault_decorators;
    var _isDefault_initializers = [];
    var _isDefault_extraInitializers = [];
    return _a = /** @class */ (function () {
            function AddressDto() {
                this.name = __runInitializers(this, _name_initializers, void 0);
                this.phone = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _phone_initializers, void 0));
                this.region = (__runInitializers(this, _phone_extraInitializers), __runInitializers(this, _region_initializers, void 0));
                this.detail = (__runInitializers(this, _region_extraInitializers), __runInitializers(this, _detail_initializers, void 0));
                this.isDefault = (__runInitializers(this, _detail_extraInitializers), __runInitializers(this, _isDefault_initializers, void 0));
                __runInitializers(this, _isDefault_extraInitializers);
            }
            return AddressDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _name_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _phone_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _region_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _detail_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _isDefault_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)()];
            __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: function (obj) { return "name" in obj; }, get: function (obj) { return obj.name; }, set: function (obj, value) { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
            __esDecorate(null, null, _phone_decorators, { kind: "field", name: "phone", static: false, private: false, access: { has: function (obj) { return "phone" in obj; }, get: function (obj) { return obj.phone; }, set: function (obj, value) { obj.phone = value; } }, metadata: _metadata }, _phone_initializers, _phone_extraInitializers);
            __esDecorate(null, null, _region_decorators, { kind: "field", name: "region", static: false, private: false, access: { has: function (obj) { return "region" in obj; }, get: function (obj) { return obj.region; }, set: function (obj, value) { obj.region = value; } }, metadata: _metadata }, _region_initializers, _region_extraInitializers);
            __esDecorate(null, null, _detail_decorators, { kind: "field", name: "detail", static: false, private: false, access: { has: function (obj) { return "detail" in obj; }, get: function (obj) { return obj.detail; }, set: function (obj, value) { obj.detail = value; } }, metadata: _metadata }, _detail_initializers, _detail_extraInitializers);
            __esDecorate(null, null, _isDefault_decorators, { kind: "field", name: "isDefault", static: false, private: false, access: { has: function (obj) { return "isDefault" in obj; }, get: function (obj) { return obj.isDefault; }, set: function (obj, value) { obj.isDefault = value; } }, metadata: _metadata }, _isDefault_initializers, _isDefault_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.AddressDto = AddressDto;
