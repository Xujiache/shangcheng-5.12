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
exports.GlassWeightDto = void 0;
var class_validator_1 = require("class-validator");
var GlassWeightDto = function () {
    var _a;
    var _heightMm_decorators;
    var _heightMm_initializers = [];
    var _heightMm_extraInitializers = [];
    var _widthMm_decorators;
    var _widthMm_initializers = [];
    var _widthMm_extraInitializers = [];
    var _thicknessesMm_decorators;
    var _thicknessesMm_initializers = [];
    var _thicknessesMm_extraInitializers = [];
    return _a = /** @class */ (function () {
            function GlassWeightDto() {
                this.heightMm = __runInitializers(this, _heightMm_initializers, void 0);
                this.widthMm = (__runInitializers(this, _heightMm_extraInitializers), __runInitializers(this, _widthMm_initializers, void 0));
                this.thicknessesMm = (__runInitializers(this, _widthMm_extraInitializers), __runInitializers(this, _thicknessesMm_initializers, void 0));
                __runInitializers(this, _thicknessesMm_extraInitializers);
            }
            return GlassWeightDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _heightMm_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0.001), (0, class_validator_1.Max)(100000)];
            _widthMm_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0.001), (0, class_validator_1.Max)(100000)];
            _thicknessesMm_decorators = [(0, class_validator_1.IsArray)(), (0, class_validator_1.ArrayMinSize)(1), (0, class_validator_1.ArrayMaxSize)(20), (0, class_validator_1.IsNumber)({}, { each: true }), (0, class_validator_1.Min)(0.1, { each: true }), (0, class_validator_1.Max)(100, { each: true })];
            __esDecorate(null, null, _heightMm_decorators, { kind: "field", name: "heightMm", static: false, private: false, access: { has: function (obj) { return "heightMm" in obj; }, get: function (obj) { return obj.heightMm; }, set: function (obj, value) { obj.heightMm = value; } }, metadata: _metadata }, _heightMm_initializers, _heightMm_extraInitializers);
            __esDecorate(null, null, _widthMm_decorators, { kind: "field", name: "widthMm", static: false, private: false, access: { has: function (obj) { return "widthMm" in obj; }, get: function (obj) { return obj.widthMm; }, set: function (obj, value) { obj.widthMm = value; } }, metadata: _metadata }, _widthMm_initializers, _widthMm_extraInitializers);
            __esDecorate(null, null, _thicknessesMm_decorators, { kind: "field", name: "thicknessesMm", static: false, private: false, access: { has: function (obj) { return "thicknessesMm" in obj; }, get: function (obj) { return obj.thicknessesMm; }, set: function (obj, value) { obj.thicknessesMm = value; } }, metadata: _metadata }, _thicknessesMm_initializers, _thicknessesMm_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.GlassWeightDto = GlassWeightDto;
