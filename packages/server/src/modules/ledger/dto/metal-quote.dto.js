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
exports.MetalQuoteQueryDto = exports.CreateMetalQuoteDto = exports.MetalQuoteItemDto = void 0;
var class_transformer_1 = require("class-transformer");
var class_validator_1 = require("class-validator");
var CATEGORIES = ['plate', 'section', 'squareTube', 'flatBar', 'roundTube', 'roundBar'];
var MetalQuoteItemDto = function () {
    var _a;
    var _materialId_decorators;
    var _materialId_initializers = [];
    var _materialId_extraInitializers = [];
    var _category_decorators;
    var _category_initializers = [];
    var _category_extraInitializers = [];
    var _spec_decorators;
    var _spec_initializers = [];
    var _spec_extraInitializers = [];
    var _density_decorators;
    var _density_initializers = [];
    var _density_extraInitializers = [];
    var _quoteFactor_decorators;
    var _quoteFactor_initializers = [];
    var _quoteFactor_extraInitializers = [];
    var _processingFeeFen_decorators;
    var _processingFeeFen_initializers = [];
    var _processingFeeFen_extraInitializers = [];
    var _sectionShape_decorators;
    var _sectionShape_initializers = [];
    var _sectionShape_extraInitializers = [];
    var _estimateSection_decorators;
    var _estimateSection_initializers = [];
    var _estimateSection_extraInitializers = [];
    return _a = /** @class */ (function () {
            function MetalQuoteItemDto() {
                this.materialId = __runInitializers(this, _materialId_initializers, void 0);
                this.category = (__runInitializers(this, _materialId_extraInitializers), __runInitializers(this, _category_initializers, void 0));
                this.spec = (__runInitializers(this, _category_extraInitializers), __runInitializers(this, _spec_initializers, void 0));
                this.density = (__runInitializers(this, _spec_extraInitializers), __runInitializers(this, _density_initializers, void 0));
                this.quoteFactor = (__runInitializers(this, _density_extraInitializers), __runInitializers(this, _quoteFactor_initializers, void 0));
                this.processingFeeFen = (__runInitializers(this, _quoteFactor_extraInitializers), __runInitializers(this, _processingFeeFen_initializers, void 0));
                this.sectionShape = (__runInitializers(this, _processingFeeFen_extraInitializers), __runInitializers(this, _sectionShape_initializers, void 0));
                this.estimateSection = (__runInitializers(this, _sectionShape_extraInitializers), __runInitializers(this, _estimateSection_initializers, void 0));
                __runInitializers(this, _estimateSection_extraInitializers);
            }
            return MetalQuoteItemDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _materialId_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(80)];
            _category_decorators = [(0, class_validator_1.IsIn)(CATEGORIES)];
            _spec_decorators = [(0, class_validator_1.IsObject)()];
            _density_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0.01), (0, class_validator_1.Max)(30)];
            _quoteFactor_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0.01), (0, class_validator_1.Max)(100)];
            _processingFeeFen_decorators = [(0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(999999900)];
            _sectionShape_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.IsIn)(['angle', 'channel', 'ibeam', 'hbeam', 'cpurlin', 'aluminum'])];
            _estimateSection_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)()];
            __esDecorate(null, null, _materialId_decorators, { kind: "field", name: "materialId", static: false, private: false, access: { has: function (obj) { return "materialId" in obj; }, get: function (obj) { return obj.materialId; }, set: function (obj, value) { obj.materialId = value; } }, metadata: _metadata }, _materialId_initializers, _materialId_extraInitializers);
            __esDecorate(null, null, _category_decorators, { kind: "field", name: "category", static: false, private: false, access: { has: function (obj) { return "category" in obj; }, get: function (obj) { return obj.category; }, set: function (obj, value) { obj.category = value; } }, metadata: _metadata }, _category_initializers, _category_extraInitializers);
            __esDecorate(null, null, _spec_decorators, { kind: "field", name: "spec", static: false, private: false, access: { has: function (obj) { return "spec" in obj; }, get: function (obj) { return obj.spec; }, set: function (obj, value) { obj.spec = value; } }, metadata: _metadata }, _spec_initializers, _spec_extraInitializers);
            __esDecorate(null, null, _density_decorators, { kind: "field", name: "density", static: false, private: false, access: { has: function (obj) { return "density" in obj; }, get: function (obj) { return obj.density; }, set: function (obj, value) { obj.density = value; } }, metadata: _metadata }, _density_initializers, _density_extraInitializers);
            __esDecorate(null, null, _quoteFactor_decorators, { kind: "field", name: "quoteFactor", static: false, private: false, access: { has: function (obj) { return "quoteFactor" in obj; }, get: function (obj) { return obj.quoteFactor; }, set: function (obj, value) { obj.quoteFactor = value; } }, metadata: _metadata }, _quoteFactor_initializers, _quoteFactor_extraInitializers);
            __esDecorate(null, null, _processingFeeFen_decorators, { kind: "field", name: "processingFeeFen", static: false, private: false, access: { has: function (obj) { return "processingFeeFen" in obj; }, get: function (obj) { return obj.processingFeeFen; }, set: function (obj, value) { obj.processingFeeFen = value; } }, metadata: _metadata }, _processingFeeFen_initializers, _processingFeeFen_extraInitializers);
            __esDecorate(null, null, _sectionShape_decorators, { kind: "field", name: "sectionShape", static: false, private: false, access: { has: function (obj) { return "sectionShape" in obj; }, get: function (obj) { return obj.sectionShape; }, set: function (obj, value) { obj.sectionShape = value; } }, metadata: _metadata }, _sectionShape_initializers, _sectionShape_extraInitializers);
            __esDecorate(null, null, _estimateSection_decorators, { kind: "field", name: "estimateSection", static: false, private: false, access: { has: function (obj) { return "estimateSection" in obj; }, get: function (obj) { return obj.estimateSection; }, set: function (obj, value) { obj.estimateSection = value; } }, metadata: _metadata }, _estimateSection_initializers, _estimateSection_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.MetalQuoteItemDto = MetalQuoteItemDto;
var CreateMetalQuoteDto = function () {
    var _a;
    var _title_decorators;
    var _title_initializers = [];
    var _title_extraInitializers = [];
    var _customerId_decorators;
    var _customerId_initializers = [];
    var _customerId_extraInitializers = [];
    var _items_decorators;
    var _items_initializers = [];
    var _items_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateMetalQuoteDto() {
                this.title = __runInitializers(this, _title_initializers, void 0);
                this.customerId = (__runInitializers(this, _title_extraInitializers), __runInitializers(this, _customerId_initializers, void 0));
                this.items = (__runInitializers(this, _customerId_extraInitializers), __runInitializers(this, _items_initializers, void 0));
                __runInitializers(this, _items_extraInitializers);
            }
            return CreateMetalQuoteDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _title_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(60)];
            _customerId_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(80)];
            _items_decorators = [(0, class_validator_1.IsArray)(), (0, class_validator_1.ArrayMinSize)(1), (0, class_validator_1.ArrayMaxSize)(200), (0, class_validator_1.ValidateNested)({ each: true }), (0, class_transformer_1.Type)(function () { return MetalQuoteItemDto; })];
            __esDecorate(null, null, _title_decorators, { kind: "field", name: "title", static: false, private: false, access: { has: function (obj) { return "title" in obj; }, get: function (obj) { return obj.title; }, set: function (obj, value) { obj.title = value; } }, metadata: _metadata }, _title_initializers, _title_extraInitializers);
            __esDecorate(null, null, _customerId_decorators, { kind: "field", name: "customerId", static: false, private: false, access: { has: function (obj) { return "customerId" in obj; }, get: function (obj) { return obj.customerId; }, set: function (obj, value) { obj.customerId = value; } }, metadata: _metadata }, _customerId_initializers, _customerId_extraInitializers);
            __esDecorate(null, null, _items_decorators, { kind: "field", name: "items", static: false, private: false, access: { has: function (obj) { return "items" in obj; }, get: function (obj) { return obj.items; }, set: function (obj, value) { obj.items = value; } }, metadata: _metadata }, _items_initializers, _items_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreateMetalQuoteDto = CreateMetalQuoteDto;
var MetalQuoteQueryDto = function () {
    var _a;
    var _skip_decorators;
    var _skip_initializers = [];
    var _skip_extraInitializers = [];
    var _take_decorators;
    var _take_initializers = [];
    var _take_extraInitializers = [];
    return _a = /** @class */ (function () {
            function MetalQuoteQueryDto() {
                this.skip = __runInitializers(this, _skip_initializers, void 0);
                this.take = (__runInitializers(this, _skip_extraInitializers), __runInitializers(this, _take_initializers, void 0));
                __runInitializers(this, _take_extraInitializers);
            }
            return MetalQuoteQueryDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _skip_decorators = [(0, class_transformer_1.Type)(function () { return Number; }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(100000)];
            _take_decorators = [(0, class_transformer_1.Type)(function () { return Number; }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(1), (0, class_validator_1.Max)(50)];
            __esDecorate(null, null, _skip_decorators, { kind: "field", name: "skip", static: false, private: false, access: { has: function (obj) { return "skip" in obj; }, get: function (obj) { return obj.skip; }, set: function (obj, value) { obj.skip = value; } }, metadata: _metadata }, _skip_initializers, _skip_extraInitializers);
            __esDecorate(null, null, _take_decorators, { kind: "field", name: "take", static: false, private: false, access: { has: function (obj) { return "take" in obj; }, get: function (obj) { return obj.take; }, set: function (obj, value) { obj.take = value; } }, metadata: _metadata }, _take_initializers, _take_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.MetalQuoteQueryDto = MetalQuoteQueryDto;
