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
exports.RefundOrderDto = void 0;
var class_validator_1 = require("class-validator");
/**
 * POST /u/orders/:id/refund
 * service refundOrder(userId, id, dto) 读取：
 *   - dto.reason       必填（trim 后为空即抛 INVALID_PARAMS）
 *   - dto.amount       可选 number（缺省取订单实付金额）
 *   - dto.orderItemId  可选（指定退某一行）
 *   - dto.description  可选（slice(0,500) 落库）
 *   - dto.evidence     可选 string[]（过滤后取前 9 条）
 *   - dto.type         可选 'refund_only' | 'refund_with_return'（其它值兜底为 refund_with_return）
 */
var RefundOrderDto = function () {
    var _a;
    var _reason_decorators;
    var _reason_initializers = [];
    var _reason_extraInitializers = [];
    var _amount_decorators;
    var _amount_initializers = [];
    var _amount_extraInitializers = [];
    var _orderItemId_decorators;
    var _orderItemId_initializers = [];
    var _orderItemId_extraInitializers = [];
    var _description_decorators;
    var _description_initializers = [];
    var _description_extraInitializers = [];
    var _evidence_decorators;
    var _evidence_initializers = [];
    var _evidence_extraInitializers = [];
    var _type_decorators;
    var _type_initializers = [];
    var _type_extraInitializers = [];
    return _a = /** @class */ (function () {
            function RefundOrderDto() {
                this.reason = __runInitializers(this, _reason_initializers, void 0);
                this.amount = (__runInitializers(this, _reason_extraInitializers), __runInitializers(this, _amount_initializers, void 0));
                this.orderItemId = (__runInitializers(this, _amount_extraInitializers), __runInitializers(this, _orderItemId_initializers, void 0));
                this.description = (__runInitializers(this, _orderItemId_extraInitializers), __runInitializers(this, _description_initializers, void 0));
                this.evidence = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _evidence_initializers, void 0));
                this.type = (__runInitializers(this, _evidence_extraInitializers), __runInitializers(this, _type_initializers, void 0));
                __runInitializers(this, _type_extraInitializers);
            }
            return RefundOrderDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _reason_decorators = [(0, class_validator_1.IsString)()];
            _amount_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)()];
            _orderItemId_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _description_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _evidence_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsArray)(), (0, class_validator_1.IsString)({ each: true })];
            _type_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsIn)(['refund_only', 'refund_with_return'])];
            __esDecorate(null, null, _reason_decorators, { kind: "field", name: "reason", static: false, private: false, access: { has: function (obj) { return "reason" in obj; }, get: function (obj) { return obj.reason; }, set: function (obj, value) { obj.reason = value; } }, metadata: _metadata }, _reason_initializers, _reason_extraInitializers);
            __esDecorate(null, null, _amount_decorators, { kind: "field", name: "amount", static: false, private: false, access: { has: function (obj) { return "amount" in obj; }, get: function (obj) { return obj.amount; }, set: function (obj, value) { obj.amount = value; } }, metadata: _metadata }, _amount_initializers, _amount_extraInitializers);
            __esDecorate(null, null, _orderItemId_decorators, { kind: "field", name: "orderItemId", static: false, private: false, access: { has: function (obj) { return "orderItemId" in obj; }, get: function (obj) { return obj.orderItemId; }, set: function (obj, value) { obj.orderItemId = value; } }, metadata: _metadata }, _orderItemId_initializers, _orderItemId_extraInitializers);
            __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: function (obj) { return "description" in obj; }, get: function (obj) { return obj.description; }, set: function (obj, value) { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
            __esDecorate(null, null, _evidence_decorators, { kind: "field", name: "evidence", static: false, private: false, access: { has: function (obj) { return "evidence" in obj; }, get: function (obj) { return obj.evidence; }, set: function (obj, value) { obj.evidence = value; } }, metadata: _metadata }, _evidence_initializers, _evidence_extraInitializers);
            __esDecorate(null, null, _type_decorators, { kind: "field", name: "type", static: false, private: false, access: { has: function (obj) { return "type" in obj; }, get: function (obj) { return obj.type; }, set: function (obj, value) { obj.type = value; } }, metadata: _metadata }, _type_initializers, _type_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.RefundOrderDto = RefundOrderDto;
