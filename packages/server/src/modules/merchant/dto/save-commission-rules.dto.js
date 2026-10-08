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
exports.SaveCommissionRulesDto = void 0;
var class_validator_1 = require("class-validator");
/**
 * 保存佣金规则。saveCommissionRules 按名读取：
 *   - dto.default.{ level1Percent, level2Percent, visibleToPromoter, allowOffline, enabled }
 *   - dto.productRules[].{ productId, level1Percent, level2Percent,
 *                          visibleToPromoter, allowOffline, enabled }
 *
 * 这两个顶层属性是普通对象/数组（非嵌套 DTO 类），service 内部已对每个
 * 子字段做显式 Number()/!! 清洗并只写真实存在的列，故无需也不应在此做
 * @ValidateNested 深层 whitelist —— 那会反而剥离 service 实际读取的子字段。
 *
 * 仅声明这两个顶层属性即可让 whitelist 放行它们及其内部对象内容。
 */
var SaveCommissionRulesDto = function () {
    var _a;
    var _default_decorators;
    var _default_initializers = [];
    var _default_extraInitializers = [];
    var _productRules_decorators;
    var _productRules_initializers = [];
    var _productRules_extraInitializers = [];
    return _a = /** @class */ (function () {
            function SaveCommissionRulesDto() {
                this.default = __runInitializers(this, _default_initializers, void 0);
                this.productRules = (__runInitializers(this, _default_extraInitializers), __runInitializers(this, _productRules_initializers, void 0));
                __runInitializers(this, _productRules_extraInitializers);
            }
            return SaveCommissionRulesDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _default_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsObject)()];
            _productRules_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsArray)()];
            __esDecorate(null, null, _default_decorators, { kind: "field", name: "default", static: false, private: false, access: { has: function (obj) { return "default" in obj; }, get: function (obj) { return obj.default; }, set: function (obj, value) { obj.default = value; } }, metadata: _metadata }, _default_initializers, _default_extraInitializers);
            __esDecorate(null, null, _productRules_decorators, { kind: "field", name: "productRules", static: false, private: false, access: { has: function (obj) { return "productRules" in obj; }, get: function (obj) { return obj.productRules; }, set: function (obj, value) { obj.productRules = value; } }, metadata: _metadata }, _productRules_initializers, _productRules_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.SaveCommissionRulesDto = SaveCommissionRulesDto;
