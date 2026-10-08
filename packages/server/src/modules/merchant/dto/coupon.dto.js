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
exports.UpdateCouponDto = exports.CreateCouponDto = void 0;
var class_validator_1 = require("class-validator");
/**
 * 创建优惠券。服务端 createCoupon 显式构建 data 对象（无 dto 展开），
 * 按名读取以下字段，全部在此声明：
 *   name, type, validFrom, validTo, amount, discountPercent, status,
 *   threshold, stock, perUserLimit, scope, scopeIds
 *
 * 校验保持宽松：业务必填/区间校验由 service 自行抛 BizException，
 * 这里仅做类型/枚举级 whitelist，避免误 400 拒绝当前合法载荷。
 */
var CreateCouponDto = function () {
    var _a;
    var _name_decorators;
    var _name_initializers = [];
    var _name_extraInitializers = [];
    var _type_decorators;
    var _type_initializers = [];
    var _type_extraInitializers = [];
    var _validFrom_decorators;
    var _validFrom_initializers = [];
    var _validFrom_extraInitializers = [];
    var _validTo_decorators;
    var _validTo_initializers = [];
    var _validTo_extraInitializers = [];
    var _amount_decorators;
    var _amount_initializers = [];
    var _amount_extraInitializers = [];
    var _discountPercent_decorators;
    var _discountPercent_initializers = [];
    var _discountPercent_extraInitializers = [];
    var _threshold_decorators;
    var _threshold_initializers = [];
    var _threshold_extraInitializers = [];
    var _stock_decorators;
    var _stock_initializers = [];
    var _stock_extraInitializers = [];
    var _perUserLimit_decorators;
    var _perUserLimit_initializers = [];
    var _perUserLimit_extraInitializers = [];
    var _scope_decorators;
    var _scope_initializers = [];
    var _scope_extraInitializers = [];
    var _scopeIds_decorators;
    var _scopeIds_initializers = [];
    var _scopeIds_extraInitializers = [];
    var _status_decorators;
    var _status_initializers = [];
    var _status_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateCouponDto() {
                this.name = __runInitializers(this, _name_initializers, void 0);
                this.type = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _type_initializers, void 0));
                this.validFrom = (__runInitializers(this, _type_extraInitializers), __runInitializers(this, _validFrom_initializers, void 0));
                this.validTo = (__runInitializers(this, _validFrom_extraInitializers), __runInitializers(this, _validTo_initializers, void 0));
                this.amount = (__runInitializers(this, _validTo_extraInitializers), __runInitializers(this, _amount_initializers, void 0));
                this.discountPercent = (__runInitializers(this, _amount_extraInitializers), __runInitializers(this, _discountPercent_initializers, void 0));
                this.threshold = (__runInitializers(this, _discountPercent_extraInitializers), __runInitializers(this, _threshold_initializers, void 0));
                this.stock = (__runInitializers(this, _threshold_extraInitializers), __runInitializers(this, _stock_initializers, void 0));
                this.perUserLimit = (__runInitializers(this, _stock_extraInitializers), __runInitializers(this, _perUserLimit_initializers, void 0));
                this.scope = (__runInitializers(this, _perUserLimit_extraInitializers), __runInitializers(this, _scope_initializers, void 0));
                this.scopeIds = (__runInitializers(this, _scope_extraInitializers), __runInitializers(this, _scopeIds_initializers, void 0));
                this.status = (__runInitializers(this, _scopeIds_extraInitializers), __runInitializers(this, _status_initializers, void 0));
                __runInitializers(this, _status_extraInitializers);
            }
            return CreateCouponDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _name_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(60)];
            _type_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsIn)(['fullReduce', 'discount', 'fixed'])];
            _validFrom_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _validTo_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _amount_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)()];
            _discountPercent_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)()];
            _threshold_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)()];
            _stock_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)()];
            _perUserLimit_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)()];
            _scope_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsIn)(['all', 'category', 'product'])];
            _scopeIds_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsArray)()];
            _status_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsIn)(['pending', 'active', 'paused', 'ended'])];
            __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: function (obj) { return "name" in obj; }, get: function (obj) { return obj.name; }, set: function (obj, value) { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
            __esDecorate(null, null, _type_decorators, { kind: "field", name: "type", static: false, private: false, access: { has: function (obj) { return "type" in obj; }, get: function (obj) { return obj.type; }, set: function (obj, value) { obj.type = value; } }, metadata: _metadata }, _type_initializers, _type_extraInitializers);
            __esDecorate(null, null, _validFrom_decorators, { kind: "field", name: "validFrom", static: false, private: false, access: { has: function (obj) { return "validFrom" in obj; }, get: function (obj) { return obj.validFrom; }, set: function (obj, value) { obj.validFrom = value; } }, metadata: _metadata }, _validFrom_initializers, _validFrom_extraInitializers);
            __esDecorate(null, null, _validTo_decorators, { kind: "field", name: "validTo", static: false, private: false, access: { has: function (obj) { return "validTo" in obj; }, get: function (obj) { return obj.validTo; }, set: function (obj, value) { obj.validTo = value; } }, metadata: _metadata }, _validTo_initializers, _validTo_extraInitializers);
            __esDecorate(null, null, _amount_decorators, { kind: "field", name: "amount", static: false, private: false, access: { has: function (obj) { return "amount" in obj; }, get: function (obj) { return obj.amount; }, set: function (obj, value) { obj.amount = value; } }, metadata: _metadata }, _amount_initializers, _amount_extraInitializers);
            __esDecorate(null, null, _discountPercent_decorators, { kind: "field", name: "discountPercent", static: false, private: false, access: { has: function (obj) { return "discountPercent" in obj; }, get: function (obj) { return obj.discountPercent; }, set: function (obj, value) { obj.discountPercent = value; } }, metadata: _metadata }, _discountPercent_initializers, _discountPercent_extraInitializers);
            __esDecorate(null, null, _threshold_decorators, { kind: "field", name: "threshold", static: false, private: false, access: { has: function (obj) { return "threshold" in obj; }, get: function (obj) { return obj.threshold; }, set: function (obj, value) { obj.threshold = value; } }, metadata: _metadata }, _threshold_initializers, _threshold_extraInitializers);
            __esDecorate(null, null, _stock_decorators, { kind: "field", name: "stock", static: false, private: false, access: { has: function (obj) { return "stock" in obj; }, get: function (obj) { return obj.stock; }, set: function (obj, value) { obj.stock = value; } }, metadata: _metadata }, _stock_initializers, _stock_extraInitializers);
            __esDecorate(null, null, _perUserLimit_decorators, { kind: "field", name: "perUserLimit", static: false, private: false, access: { has: function (obj) { return "perUserLimit" in obj; }, get: function (obj) { return obj.perUserLimit; }, set: function (obj, value) { obj.perUserLimit = value; } }, metadata: _metadata }, _perUserLimit_initializers, _perUserLimit_extraInitializers);
            __esDecorate(null, null, _scope_decorators, { kind: "field", name: "scope", static: false, private: false, access: { has: function (obj) { return "scope" in obj; }, get: function (obj) { return obj.scope; }, set: function (obj, value) { obj.scope = value; } }, metadata: _metadata }, _scope_initializers, _scope_extraInitializers);
            __esDecorate(null, null, _scopeIds_decorators, { kind: "field", name: "scopeIds", static: false, private: false, access: { has: function (obj) { return "scopeIds" in obj; }, get: function (obj) { return obj.scopeIds; }, set: function (obj, value) { obj.scopeIds = value; } }, metadata: _metadata }, _scopeIds_initializers, _scopeIds_extraInitializers);
            __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: function (obj) { return "status" in obj; }, get: function (obj) { return obj.status; }, set: function (obj, value) { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreateCouponDto = CreateCouponDto;
/**
 * 更新优惠券。updateCoupon 同样显式按名读取字段构建 data（无 dto 展开），
 * 全字段可选（仅更新传入项），字段集与创建一致。
 */
var UpdateCouponDto = function () {
    var _a;
    var _name_decorators;
    var _name_initializers = [];
    var _name_extraInitializers = [];
    var _type_decorators;
    var _type_initializers = [];
    var _type_extraInitializers = [];
    var _validFrom_decorators;
    var _validFrom_initializers = [];
    var _validFrom_extraInitializers = [];
    var _validTo_decorators;
    var _validTo_initializers = [];
    var _validTo_extraInitializers = [];
    var _amount_decorators;
    var _amount_initializers = [];
    var _amount_extraInitializers = [];
    var _discountPercent_decorators;
    var _discountPercent_initializers = [];
    var _discountPercent_extraInitializers = [];
    var _threshold_decorators;
    var _threshold_initializers = [];
    var _threshold_extraInitializers = [];
    var _stock_decorators;
    var _stock_initializers = [];
    var _stock_extraInitializers = [];
    var _perUserLimit_decorators;
    var _perUserLimit_initializers = [];
    var _perUserLimit_extraInitializers = [];
    var _scope_decorators;
    var _scope_initializers = [];
    var _scope_extraInitializers = [];
    var _scopeIds_decorators;
    var _scopeIds_initializers = [];
    var _scopeIds_extraInitializers = [];
    var _status_decorators;
    var _status_initializers = [];
    var _status_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpdateCouponDto() {
                this.name = __runInitializers(this, _name_initializers, void 0);
                this.type = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _type_initializers, void 0));
                this.validFrom = (__runInitializers(this, _type_extraInitializers), __runInitializers(this, _validFrom_initializers, void 0));
                this.validTo = (__runInitializers(this, _validFrom_extraInitializers), __runInitializers(this, _validTo_initializers, void 0));
                this.amount = (__runInitializers(this, _validTo_extraInitializers), __runInitializers(this, _amount_initializers, void 0));
                this.discountPercent = (__runInitializers(this, _amount_extraInitializers), __runInitializers(this, _discountPercent_initializers, void 0));
                this.threshold = (__runInitializers(this, _discountPercent_extraInitializers), __runInitializers(this, _threshold_initializers, void 0));
                this.stock = (__runInitializers(this, _threshold_extraInitializers), __runInitializers(this, _stock_initializers, void 0));
                this.perUserLimit = (__runInitializers(this, _stock_extraInitializers), __runInitializers(this, _perUserLimit_initializers, void 0));
                this.scope = (__runInitializers(this, _perUserLimit_extraInitializers), __runInitializers(this, _scope_initializers, void 0));
                this.scopeIds = (__runInitializers(this, _scope_extraInitializers), __runInitializers(this, _scopeIds_initializers, void 0));
                this.status = (__runInitializers(this, _scopeIds_extraInitializers), __runInitializers(this, _status_initializers, void 0));
                __runInitializers(this, _status_extraInitializers);
            }
            return UpdateCouponDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _name_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(60)];
            _type_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsIn)(['fullReduce', 'discount', 'fixed'])];
            _validFrom_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _validTo_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _amount_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)()];
            _discountPercent_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)()];
            _threshold_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)()];
            _stock_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)()];
            _perUserLimit_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)()];
            _scope_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsIn)(['all', 'category', 'product'])];
            _scopeIds_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsArray)()];
            _status_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsIn)(['pending', 'active', 'paused', 'ended'])];
            __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: function (obj) { return "name" in obj; }, get: function (obj) { return obj.name; }, set: function (obj, value) { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
            __esDecorate(null, null, _type_decorators, { kind: "field", name: "type", static: false, private: false, access: { has: function (obj) { return "type" in obj; }, get: function (obj) { return obj.type; }, set: function (obj, value) { obj.type = value; } }, metadata: _metadata }, _type_initializers, _type_extraInitializers);
            __esDecorate(null, null, _validFrom_decorators, { kind: "field", name: "validFrom", static: false, private: false, access: { has: function (obj) { return "validFrom" in obj; }, get: function (obj) { return obj.validFrom; }, set: function (obj, value) { obj.validFrom = value; } }, metadata: _metadata }, _validFrom_initializers, _validFrom_extraInitializers);
            __esDecorate(null, null, _validTo_decorators, { kind: "field", name: "validTo", static: false, private: false, access: { has: function (obj) { return "validTo" in obj; }, get: function (obj) { return obj.validTo; }, set: function (obj, value) { obj.validTo = value; } }, metadata: _metadata }, _validTo_initializers, _validTo_extraInitializers);
            __esDecorate(null, null, _amount_decorators, { kind: "field", name: "amount", static: false, private: false, access: { has: function (obj) { return "amount" in obj; }, get: function (obj) { return obj.amount; }, set: function (obj, value) { obj.amount = value; } }, metadata: _metadata }, _amount_initializers, _amount_extraInitializers);
            __esDecorate(null, null, _discountPercent_decorators, { kind: "field", name: "discountPercent", static: false, private: false, access: { has: function (obj) { return "discountPercent" in obj; }, get: function (obj) { return obj.discountPercent; }, set: function (obj, value) { obj.discountPercent = value; } }, metadata: _metadata }, _discountPercent_initializers, _discountPercent_extraInitializers);
            __esDecorate(null, null, _threshold_decorators, { kind: "field", name: "threshold", static: false, private: false, access: { has: function (obj) { return "threshold" in obj; }, get: function (obj) { return obj.threshold; }, set: function (obj, value) { obj.threshold = value; } }, metadata: _metadata }, _threshold_initializers, _threshold_extraInitializers);
            __esDecorate(null, null, _stock_decorators, { kind: "field", name: "stock", static: false, private: false, access: { has: function (obj) { return "stock" in obj; }, get: function (obj) { return obj.stock; }, set: function (obj, value) { obj.stock = value; } }, metadata: _metadata }, _stock_initializers, _stock_extraInitializers);
            __esDecorate(null, null, _perUserLimit_decorators, { kind: "field", name: "perUserLimit", static: false, private: false, access: { has: function (obj) { return "perUserLimit" in obj; }, get: function (obj) { return obj.perUserLimit; }, set: function (obj, value) { obj.perUserLimit = value; } }, metadata: _metadata }, _perUserLimit_initializers, _perUserLimit_extraInitializers);
            __esDecorate(null, null, _scope_decorators, { kind: "field", name: "scope", static: false, private: false, access: { has: function (obj) { return "scope" in obj; }, get: function (obj) { return obj.scope; }, set: function (obj, value) { obj.scope = value; } }, metadata: _metadata }, _scope_initializers, _scope_extraInitializers);
            __esDecorate(null, null, _scopeIds_decorators, { kind: "field", name: "scopeIds", static: false, private: false, access: { has: function (obj) { return "scopeIds" in obj; }, get: function (obj) { return obj.scopeIds; }, set: function (obj, value) { obj.scopeIds = value; } }, metadata: _metadata }, _scopeIds_initializers, _scopeIds_extraInitializers);
            __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: function (obj) { return "status" in obj; }, get: function (obj) { return obj.status; }, set: function (obj, value) { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UpdateCouponDto = UpdateCouponDto;
