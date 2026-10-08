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
exports.GlassEstimateDto = exports.GlassGapDto = exports.GlassPaneDto = void 0;
var class_transformer_1 = require("class-transformer");
var class_validator_1 = require("class-validator");
var GlassPaneDto = function () {
    var _a;
    var _thicknessMm_decorators;
    var _thicknessMm_initializers = [];
    var _thicknessMm_extraInitializers = [];
    var _frontEmissivity_decorators;
    var _frontEmissivity_initializers = [];
    var _frontEmissivity_extraInitializers = [];
    var _backEmissivity_decorators;
    var _backEmissivity_initializers = [];
    var _backEmissivity_extraInitializers = [];
    return _a = /** @class */ (function () {
            function GlassPaneDto() {
                this.thicknessMm = __runInitializers(this, _thicknessMm_initializers, void 0);
                this.frontEmissivity = (__runInitializers(this, _thicknessMm_extraInitializers), __runInitializers(this, _frontEmissivity_initializers, void 0));
                this.backEmissivity = (__runInitializers(this, _frontEmissivity_extraInitializers), __runInitializers(this, _backEmissivity_initializers, void 0));
                __runInitializers(this, _backEmissivity_extraInitializers);
            }
            return GlassPaneDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _thicknessMm_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(2), (0, class_validator_1.Max)(25)];
            _frontEmissivity_decorators = [(0, class_validator_1.ValidateIf)(function (o) { return o.frontEmissivity !== undefined; }), (0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0.01), (0, class_validator_1.Max)(0.84)];
            _backEmissivity_decorators = [(0, class_validator_1.ValidateIf)(function (o) { return o.backEmissivity !== undefined; }), (0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0.01), (0, class_validator_1.Max)(0.84)];
            __esDecorate(null, null, _thicknessMm_decorators, { kind: "field", name: "thicknessMm", static: false, private: false, access: { has: function (obj) { return "thicknessMm" in obj; }, get: function (obj) { return obj.thicknessMm; }, set: function (obj, value) { obj.thicknessMm = value; } }, metadata: _metadata }, _thicknessMm_initializers, _thicknessMm_extraInitializers);
            __esDecorate(null, null, _frontEmissivity_decorators, { kind: "field", name: "frontEmissivity", static: false, private: false, access: { has: function (obj) { return "frontEmissivity" in obj; }, get: function (obj) { return obj.frontEmissivity; }, set: function (obj, value) { obj.frontEmissivity = value; } }, metadata: _metadata }, _frontEmissivity_initializers, _frontEmissivity_extraInitializers);
            __esDecorate(null, null, _backEmissivity_decorators, { kind: "field", name: "backEmissivity", static: false, private: false, access: { has: function (obj) { return "backEmissivity" in obj; }, get: function (obj) { return obj.backEmissivity; }, set: function (obj, value) { obj.backEmissivity = value; } }, metadata: _metadata }, _backEmissivity_initializers, _backEmissivity_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.GlassPaneDto = GlassPaneDto;
var GlassGapDto = function () {
    var _a;
    var _type_decorators;
    var _type_initializers = [];
    var _type_extraInitializers = [];
    var _thicknessMm_decorators;
    var _thicknessMm_initializers = [];
    var _thicknessMm_extraInitializers = [];
    var _gas_decorators;
    var _gas_initializers = [];
    var _gas_extraInitializers = [];
    var _vacuumPressurePa_decorators;
    var _vacuumPressurePa_initializers = [];
    var _vacuumPressurePa_extraInitializers = [];
    var _pillarDiameterMm_decorators;
    var _pillarDiameterMm_initializers = [];
    var _pillarDiameterMm_extraInitializers = [];
    var _pillarPitchMm_decorators;
    var _pillarPitchMm_initializers = [];
    var _pillarPitchMm_extraInitializers = [];
    return _a = /** @class */ (function () {
            function GlassGapDto() {
                this.type = __runInitializers(this, _type_initializers, void 0);
                this.thicknessMm = (__runInitializers(this, _type_extraInitializers), __runInitializers(this, _thicknessMm_initializers, void 0));
                this.gas = (__runInitializers(this, _thicknessMm_extraInitializers), __runInitializers(this, _gas_initializers, void 0));
                this.vacuumPressurePa = (__runInitializers(this, _gas_extraInitializers), __runInitializers(this, _vacuumPressurePa_initializers, void 0));
                this.pillarDiameterMm = (__runInitializers(this, _vacuumPressurePa_extraInitializers), __runInitializers(this, _pillarDiameterMm_initializers, void 0));
                this.pillarPitchMm = (__runInitializers(this, _pillarDiameterMm_extraInitializers), __runInitializers(this, _pillarPitchMm_initializers, void 0));
                __runInitializers(this, _pillarPitchMm_extraInitializers);
            }
            return GlassGapDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _type_decorators = [(0, class_validator_1.IsIn)(['hollow', 'vacuum'])];
            _thicknessMm_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0.1), (0, class_validator_1.Max)(30)];
            _gas_decorators = [(0, class_validator_1.ValidateIf)(function (o) { return o.type === 'hollow'; }), (0, class_validator_1.IsIn)(['air', 'argon'])];
            _vacuumPressurePa_decorators = [(0, class_validator_1.ValidateIf)(function (o) { return o.type === 'vacuum'; }), (0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0.001), (0, class_validator_1.Max)(100)];
            _pillarDiameterMm_decorators = [(0, class_validator_1.ValidateIf)(function (o) { return o.type === 'vacuum'; }), (0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0.1), (0, class_validator_1.Max)(1)];
            _pillarPitchMm_decorators = [(0, class_validator_1.ValidateIf)(function (o) { return o.type === 'vacuum'; }), (0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(10), (0, class_validator_1.Max)(50)];
            __esDecorate(null, null, _type_decorators, { kind: "field", name: "type", static: false, private: false, access: { has: function (obj) { return "type" in obj; }, get: function (obj) { return obj.type; }, set: function (obj, value) { obj.type = value; } }, metadata: _metadata }, _type_initializers, _type_extraInitializers);
            __esDecorate(null, null, _thicknessMm_decorators, { kind: "field", name: "thicknessMm", static: false, private: false, access: { has: function (obj) { return "thicknessMm" in obj; }, get: function (obj) { return obj.thicknessMm; }, set: function (obj, value) { obj.thicknessMm = value; } }, metadata: _metadata }, _thicknessMm_initializers, _thicknessMm_extraInitializers);
            __esDecorate(null, null, _gas_decorators, { kind: "field", name: "gas", static: false, private: false, access: { has: function (obj) { return "gas" in obj; }, get: function (obj) { return obj.gas; }, set: function (obj, value) { obj.gas = value; } }, metadata: _metadata }, _gas_initializers, _gas_extraInitializers);
            __esDecorate(null, null, _vacuumPressurePa_decorators, { kind: "field", name: "vacuumPressurePa", static: false, private: false, access: { has: function (obj) { return "vacuumPressurePa" in obj; }, get: function (obj) { return obj.vacuumPressurePa; }, set: function (obj, value) { obj.vacuumPressurePa = value; } }, metadata: _metadata }, _vacuumPressurePa_initializers, _vacuumPressurePa_extraInitializers);
            __esDecorate(null, null, _pillarDiameterMm_decorators, { kind: "field", name: "pillarDiameterMm", static: false, private: false, access: { has: function (obj) { return "pillarDiameterMm" in obj; }, get: function (obj) { return obj.pillarDiameterMm; }, set: function (obj, value) { obj.pillarDiameterMm = value; } }, metadata: _metadata }, _pillarDiameterMm_initializers, _pillarDiameterMm_extraInitializers);
            __esDecorate(null, null, _pillarPitchMm_decorators, { kind: "field", name: "pillarPitchMm", static: false, private: false, access: { has: function (obj) { return "pillarPitchMm" in obj; }, get: function (obj) { return obj.pillarPitchMm; }, set: function (obj, value) { obj.pillarPitchMm = value; } }, metadata: _metadata }, _pillarPitchMm_initializers, _pillarPitchMm_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.GlassGapDto = GlassGapDto;
var layered = function (o) { return o.panes !== undefined || o.gaps !== undefined; };
var legacy = function (o) { return !layered(o); };
var GlassEstimateDto = function () {
    var _a;
    var _panes_decorators;
    var _panes_initializers = [];
    var _panes_extraInitializers = [];
    var _gaps_decorators;
    var _gaps_initializers = [];
    var _gaps_extraInitializers = [];
    var _type_decorators;
    var _type_initializers = [];
    var _type_extraInitializers = [];
    var _outerMm_decorators;
    var _outerMm_initializers = [];
    var _outerMm_extraInitializers = [];
    var _innerMm_decorators;
    var _innerMm_initializers = [];
    var _innerMm_extraInitializers = [];
    var _gapMm_decorators;
    var _gapMm_initializers = [];
    var _gapMm_extraInitializers = [];
    var _gas_decorators;
    var _gas_initializers = [];
    var _gas_extraInitializers = [];
    var _coating_decorators;
    var _coating_initializers = [];
    var _coating_extraInitializers = [];
    var _emissivity_decorators;
    var _emissivity_initializers = [];
    var _emissivity_extraInitializers = [];
    var _vacuumPressurePa_decorators;
    var _vacuumPressurePa_initializers = [];
    var _vacuumPressurePa_extraInitializers = [];
    var _pillarDiameterMm_decorators;
    var _pillarDiameterMm_initializers = [];
    var _pillarDiameterMm_extraInitializers = [];
    var _pillarPitchMm_decorators;
    var _pillarPitchMm_initializers = [];
    var _pillarPitchMm_extraInitializers = [];
    var _outsideH_decorators;
    var _outsideH_initializers = [];
    var _outsideH_extraInitializers = [];
    var _insideH_decorators;
    var _insideH_initializers = [];
    var _insideH_extraInitializers = [];
    return _a = /** @class */ (function () {
            function GlassEstimateDto() {
                this.panes = __runInitializers(this, _panes_initializers, void 0);
                this.gaps = (__runInitializers(this, _panes_extraInitializers), __runInitializers(this, _gaps_initializers, void 0));
                // Keep the two-pane payload accepted by released mini-program versions.
                this.type = (__runInitializers(this, _gaps_extraInitializers), __runInitializers(this, _type_initializers, void 0));
                this.outerMm = (__runInitializers(this, _type_extraInitializers), __runInitializers(this, _outerMm_initializers, void 0));
                this.innerMm = (__runInitializers(this, _outerMm_extraInitializers), __runInitializers(this, _innerMm_initializers, void 0));
                this.gapMm = (__runInitializers(this, _innerMm_extraInitializers), __runInitializers(this, _gapMm_initializers, void 0));
                this.gas = (__runInitializers(this, _gapMm_extraInitializers), __runInitializers(this, _gas_initializers, void 0));
                this.coating = (__runInitializers(this, _gas_extraInitializers), __runInitializers(this, _coating_initializers, void 0));
                this.emissivity = (__runInitializers(this, _coating_extraInitializers), __runInitializers(this, _emissivity_initializers, void 0));
                this.vacuumPressurePa = (__runInitializers(this, _emissivity_extraInitializers), __runInitializers(this, _vacuumPressurePa_initializers, void 0));
                this.pillarDiameterMm = (__runInitializers(this, _vacuumPressurePa_extraInitializers), __runInitializers(this, _pillarDiameterMm_initializers, void 0));
                this.pillarPitchMm = (__runInitializers(this, _pillarDiameterMm_extraInitializers), __runInitializers(this, _pillarPitchMm_initializers, void 0));
                this.outsideH = (__runInitializers(this, _pillarPitchMm_extraInitializers), __runInitializers(this, _outsideH_initializers, void 0));
                this.insideH = (__runInitializers(this, _outsideH_extraInitializers), __runInitializers(this, _insideH_initializers, void 0));
                __runInitializers(this, _insideH_extraInitializers);
            }
            return GlassEstimateDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _panes_decorators = [(0, class_validator_1.ValidateIf)(layered), (0, class_validator_1.IsArray)(), (0, class_validator_1.ArrayMinSize)(2), (0, class_validator_1.ArrayMaxSize)(20), (0, class_validator_1.ValidateNested)({ each: true }), (0, class_transformer_1.Type)(function () { return GlassPaneDto; })];
            _gaps_decorators = [(0, class_validator_1.ValidateIf)(layered), (0, class_validator_1.IsArray)(), (0, class_validator_1.ArrayMinSize)(1), (0, class_validator_1.ArrayMaxSize)(19), (0, class_validator_1.ValidateNested)({ each: true }), (0, class_transformer_1.Type)(function () { return GlassGapDto; })];
            _type_decorators = [(0, class_validator_1.ValidateIf)(legacy), (0, class_validator_1.IsIn)(['hollow', 'vacuum'])];
            _outerMm_decorators = [(0, class_validator_1.ValidateIf)(legacy), (0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(2), (0, class_validator_1.Max)(25)];
            _innerMm_decorators = [(0, class_validator_1.ValidateIf)(legacy), (0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(2), (0, class_validator_1.Max)(25)];
            _gapMm_decorators = [(0, class_validator_1.ValidateIf)(legacy), (0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0.1), (0, class_validator_1.Max)(30)];
            _gas_decorators = [(0, class_validator_1.ValidateIf)(function (o) { return legacy(o) && o.type === 'hollow'; }), (0, class_validator_1.IsIn)(['air', 'argon'])];
            _coating_decorators = [(0, class_validator_1.ValidateIf)(legacy), (0, class_validator_1.IsIn)(['none', 'surface2', 'surface3'])];
            _emissivity_decorators = [(0, class_validator_1.ValidateIf)(function (o) { return legacy(o) && o.coating !== 'none'; }), (0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0.01), (0, class_validator_1.Max)(0.84)];
            _vacuumPressurePa_decorators = [(0, class_validator_1.ValidateIf)(function (o) { return legacy(o) && o.type === 'vacuum'; }), (0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0.001), (0, class_validator_1.Max)(100)];
            _pillarDiameterMm_decorators = [(0, class_validator_1.ValidateIf)(function (o) { return legacy(o) && o.type === 'vacuum'; }), (0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0.1), (0, class_validator_1.Max)(1)];
            _pillarPitchMm_decorators = [(0, class_validator_1.ValidateIf)(function (o) { return legacy(o) && o.type === 'vacuum'; }), (0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(10), (0, class_validator_1.Max)(50)];
            _outsideH_decorators = [(0, class_validator_1.ValidateIf)(function (o) { return o.outsideH !== undefined; }), (0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(5), (0, class_validator_1.Max)(50)];
            _insideH_decorators = [(0, class_validator_1.ValidateIf)(function (o) { return o.insideH !== undefined; }), (0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(2), (0, class_validator_1.Max)(20)];
            __esDecorate(null, null, _panes_decorators, { kind: "field", name: "panes", static: false, private: false, access: { has: function (obj) { return "panes" in obj; }, get: function (obj) { return obj.panes; }, set: function (obj, value) { obj.panes = value; } }, metadata: _metadata }, _panes_initializers, _panes_extraInitializers);
            __esDecorate(null, null, _gaps_decorators, { kind: "field", name: "gaps", static: false, private: false, access: { has: function (obj) { return "gaps" in obj; }, get: function (obj) { return obj.gaps; }, set: function (obj, value) { obj.gaps = value; } }, metadata: _metadata }, _gaps_initializers, _gaps_extraInitializers);
            __esDecorate(null, null, _type_decorators, { kind: "field", name: "type", static: false, private: false, access: { has: function (obj) { return "type" in obj; }, get: function (obj) { return obj.type; }, set: function (obj, value) { obj.type = value; } }, metadata: _metadata }, _type_initializers, _type_extraInitializers);
            __esDecorate(null, null, _outerMm_decorators, { kind: "field", name: "outerMm", static: false, private: false, access: { has: function (obj) { return "outerMm" in obj; }, get: function (obj) { return obj.outerMm; }, set: function (obj, value) { obj.outerMm = value; } }, metadata: _metadata }, _outerMm_initializers, _outerMm_extraInitializers);
            __esDecorate(null, null, _innerMm_decorators, { kind: "field", name: "innerMm", static: false, private: false, access: { has: function (obj) { return "innerMm" in obj; }, get: function (obj) { return obj.innerMm; }, set: function (obj, value) { obj.innerMm = value; } }, metadata: _metadata }, _innerMm_initializers, _innerMm_extraInitializers);
            __esDecorate(null, null, _gapMm_decorators, { kind: "field", name: "gapMm", static: false, private: false, access: { has: function (obj) { return "gapMm" in obj; }, get: function (obj) { return obj.gapMm; }, set: function (obj, value) { obj.gapMm = value; } }, metadata: _metadata }, _gapMm_initializers, _gapMm_extraInitializers);
            __esDecorate(null, null, _gas_decorators, { kind: "field", name: "gas", static: false, private: false, access: { has: function (obj) { return "gas" in obj; }, get: function (obj) { return obj.gas; }, set: function (obj, value) { obj.gas = value; } }, metadata: _metadata }, _gas_initializers, _gas_extraInitializers);
            __esDecorate(null, null, _coating_decorators, { kind: "field", name: "coating", static: false, private: false, access: { has: function (obj) { return "coating" in obj; }, get: function (obj) { return obj.coating; }, set: function (obj, value) { obj.coating = value; } }, metadata: _metadata }, _coating_initializers, _coating_extraInitializers);
            __esDecorate(null, null, _emissivity_decorators, { kind: "field", name: "emissivity", static: false, private: false, access: { has: function (obj) { return "emissivity" in obj; }, get: function (obj) { return obj.emissivity; }, set: function (obj, value) { obj.emissivity = value; } }, metadata: _metadata }, _emissivity_initializers, _emissivity_extraInitializers);
            __esDecorate(null, null, _vacuumPressurePa_decorators, { kind: "field", name: "vacuumPressurePa", static: false, private: false, access: { has: function (obj) { return "vacuumPressurePa" in obj; }, get: function (obj) { return obj.vacuumPressurePa; }, set: function (obj, value) { obj.vacuumPressurePa = value; } }, metadata: _metadata }, _vacuumPressurePa_initializers, _vacuumPressurePa_extraInitializers);
            __esDecorate(null, null, _pillarDiameterMm_decorators, { kind: "field", name: "pillarDiameterMm", static: false, private: false, access: { has: function (obj) { return "pillarDiameterMm" in obj; }, get: function (obj) { return obj.pillarDiameterMm; }, set: function (obj, value) { obj.pillarDiameterMm = value; } }, metadata: _metadata }, _pillarDiameterMm_initializers, _pillarDiameterMm_extraInitializers);
            __esDecorate(null, null, _pillarPitchMm_decorators, { kind: "field", name: "pillarPitchMm", static: false, private: false, access: { has: function (obj) { return "pillarPitchMm" in obj; }, get: function (obj) { return obj.pillarPitchMm; }, set: function (obj, value) { obj.pillarPitchMm = value; } }, metadata: _metadata }, _pillarPitchMm_initializers, _pillarPitchMm_extraInitializers);
            __esDecorate(null, null, _outsideH_decorators, { kind: "field", name: "outsideH", static: false, private: false, access: { has: function (obj) { return "outsideH" in obj; }, get: function (obj) { return obj.outsideH; }, set: function (obj, value) { obj.outsideH = value; } }, metadata: _metadata }, _outsideH_initializers, _outsideH_extraInitializers);
            __esDecorate(null, null, _insideH_decorators, { kind: "field", name: "insideH", static: false, private: false, access: { has: function (obj) { return "insideH" in obj; }, get: function (obj) { return obj.insideH; }, set: function (obj, value) { obj.insideH = value; } }, metadata: _metadata }, _insideH_initializers, _insideH_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.GlassEstimateDto = GlassEstimateDto;
