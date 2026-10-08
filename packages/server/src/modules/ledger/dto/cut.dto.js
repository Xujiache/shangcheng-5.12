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
exports.UpdateCutPlanDto = exports.CreateCutPlanDto = exports.CUT_MATERIALS = void 0;
var class_validator_1 = require("class-validator");
/** 优化下料方案的材料类型：型材(1D) / 玻璃 / 板材(2D)。 */
exports.CUT_MATERIALS = ['profile', 'glass', 'board'];
/**
 * 新建下料方案。input/summary 为不定形 JSON（service 再做体积上限保护）。
 * 注意：全局 ValidationPipe whitelist=true 会剥离未加装饰器的字段，故每个字段都需装饰器。
 */
var CreateCutPlanDto = function () {
    var _a;
    var _title_decorators;
    var _title_initializers = [];
    var _title_extraInitializers = [];
    var _material_decorators;
    var _material_initializers = [];
    var _material_extraInitializers = [];
    var _input_decorators;
    var _input_initializers = [];
    var _input_extraInitializers = [];
    var _summary_decorators;
    var _summary_initializers = [];
    var _summary_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateCutPlanDto() {
                this.title = __runInitializers(this, _title_initializers, void 0);
                this.material = (__runInitializers(this, _title_extraInitializers), __runInitializers(this, _material_initializers, void 0));
                /** 完整可重算入参（1D/2D 两种形态），由前端继续编辑时回填 */
                this.input = (__runInitializers(this, _material_extraInitializers), __runInitializers(this, _input_initializers, void 0));
                /** 列表展示快照 {material,count,util,units} */
                this.summary = (__runInitializers(this, _input_extraInitializers), __runInitializers(this, _summary_initializers, void 0));
                __runInitializers(this, _summary_extraInitializers);
            }
            return CreateCutPlanDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _title_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(40)];
            _material_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsIn)(exports.CUT_MATERIALS)];
            _input_decorators = [(0, class_validator_1.IsObject)()];
            _summary_decorators = [(0, class_validator_1.IsObject)()];
            __esDecorate(null, null, _title_decorators, { kind: "field", name: "title", static: false, private: false, access: { has: function (obj) { return "title" in obj; }, get: function (obj) { return obj.title; }, set: function (obj, value) { obj.title = value; } }, metadata: _metadata }, _title_initializers, _title_extraInitializers);
            __esDecorate(null, null, _material_decorators, { kind: "field", name: "material", static: false, private: false, access: { has: function (obj) { return "material" in obj; }, get: function (obj) { return obj.material; }, set: function (obj, value) { obj.material = value; } }, metadata: _metadata }, _material_initializers, _material_extraInitializers);
            __esDecorate(null, null, _input_decorators, { kind: "field", name: "input", static: false, private: false, access: { has: function (obj) { return "input" in obj; }, get: function (obj) { return obj.input; }, set: function (obj, value) { obj.input = value; } }, metadata: _metadata }, _input_initializers, _input_extraInitializers);
            __esDecorate(null, null, _summary_decorators, { kind: "field", name: "summary", static: false, private: false, access: { has: function (obj) { return "summary" in obj; }, get: function (obj) { return obj.summary; }, set: function (obj, value) { obj.summary = value; } }, metadata: _metadata }, _summary_initializers, _summary_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreateCutPlanDto = CreateCutPlanDto;
/** 更新下料方案。全部可选，仅更新传入字段。 */
var UpdateCutPlanDto = function () {
    var _a;
    var _title_decorators;
    var _title_initializers = [];
    var _title_extraInitializers = [];
    var _material_decorators;
    var _material_initializers = [];
    var _material_extraInitializers = [];
    var _input_decorators;
    var _input_initializers = [];
    var _input_extraInitializers = [];
    var _summary_decorators;
    var _summary_initializers = [];
    var _summary_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpdateCutPlanDto() {
                this.title = __runInitializers(this, _title_initializers, void 0);
                this.material = (__runInitializers(this, _title_extraInitializers), __runInitializers(this, _material_initializers, void 0));
                this.input = (__runInitializers(this, _material_extraInitializers), __runInitializers(this, _input_initializers, void 0));
                this.summary = (__runInitializers(this, _input_extraInitializers), __runInitializers(this, _summary_initializers, void 0));
                __runInitializers(this, _summary_extraInitializers);
            }
            return UpdateCutPlanDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _title_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(40)];
            _material_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.IsIn)(exports.CUT_MATERIALS)];
            _input_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsObject)()];
            _summary_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsObject)()];
            __esDecorate(null, null, _title_decorators, { kind: "field", name: "title", static: false, private: false, access: { has: function (obj) { return "title" in obj; }, get: function (obj) { return obj.title; }, set: function (obj, value) { obj.title = value; } }, metadata: _metadata }, _title_initializers, _title_extraInitializers);
            __esDecorate(null, null, _material_decorators, { kind: "field", name: "material", static: false, private: false, access: { has: function (obj) { return "material" in obj; }, get: function (obj) { return obj.material; }, set: function (obj, value) { obj.material = value; } }, metadata: _metadata }, _material_initializers, _material_extraInitializers);
            __esDecorate(null, null, _input_decorators, { kind: "field", name: "input", static: false, private: false, access: { has: function (obj) { return "input" in obj; }, get: function (obj) { return obj.input; }, set: function (obj, value) { obj.input = value; } }, metadata: _metadata }, _input_initializers, _input_extraInitializers);
            __esDecorate(null, null, _summary_decorators, { kind: "field", name: "summary", static: false, private: false, access: { has: function (obj) { return "summary" in obj; }, get: function (obj) { return obj.summary; }, set: function (obj, value) { obj.summary = value; } }, metadata: _metadata }, _summary_initializers, _summary_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UpdateCutPlanDto = UpdateCutPlanDto;
