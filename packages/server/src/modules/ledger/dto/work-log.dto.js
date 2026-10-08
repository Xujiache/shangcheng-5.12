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
exports.WorkLogQueryDto = exports.UpdateLedgerWorkLogDto = exports.CreateLedgerWorkLogDto = void 0;
var class_validator_1 = require("class-validator");
var MONEY_MAX = 1000000000000;
var MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
/** 独立日工明细；金额由服务端用 quantity × unitPrice 计算。 */
var CreateLedgerWorkLogDto = function () {
    var _a;
    var _workDate_decorators;
    var _workDate_initializers = [];
    var _workDate_extraInitializers = [];
    var _workerName_decorators;
    var _workerName_initializers = [];
    var _workerName_extraInitializers = [];
    var _jobType_decorators;
    var _jobType_initializers = [];
    var _jobType_extraInitializers = [];
    var _unit_decorators;
    var _unit_initializers = [];
    var _unit_extraInitializers = [];
    var _quantity_decorators;
    var _quantity_initializers = [];
    var _quantity_extraInitializers = [];
    var _unitPrice_decorators;
    var _unitPrice_initializers = [];
    var _unitPrice_extraInitializers = [];
    var _note_decorators;
    var _note_initializers = [];
    var _note_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateLedgerWorkLogDto() {
                this.workDate = __runInitializers(this, _workDate_initializers, void 0);
                this.workerName = (__runInitializers(this, _workDate_extraInitializers), __runInitializers(this, _workerName_initializers, void 0));
                this.jobType = (__runInitializers(this, _workerName_extraInitializers), __runInitializers(this, _jobType_initializers, void 0));
                this.unit = (__runInitializers(this, _jobType_extraInitializers), __runInitializers(this, _unit_initializers, void 0));
                this.quantity = (__runInitializers(this, _unit_extraInitializers), __runInitializers(this, _quantity_initializers, void 0));
                this.unitPrice = (__runInitializers(this, _quantity_extraInitializers), __runInitializers(this, _unitPrice_initializers, void 0));
                this.note = (__runInitializers(this, _unitPrice_extraInitializers), __runInitializers(this, _note_initializers, void 0));
                __runInitializers(this, _note_extraInitializers);
            }
            return CreateLedgerWorkLogDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _workDate_decorators = [(0, class_validator_1.IsDateString)()];
            _workerName_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(30)];
            _jobType_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(30)];
            _unit_decorators = [(0, class_validator_1.IsIn)(['day', 'hour'])];
            _quantity_decorators = [(0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }), (0, class_validator_1.Min)(0.01), (0, class_validator_1.Max)(100000)];
            _unitPrice_decorators = [(0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(MONEY_MAX)];
            _note_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(200)];
            __esDecorate(null, null, _workDate_decorators, { kind: "field", name: "workDate", static: false, private: false, access: { has: function (obj) { return "workDate" in obj; }, get: function (obj) { return obj.workDate; }, set: function (obj, value) { obj.workDate = value; } }, metadata: _metadata }, _workDate_initializers, _workDate_extraInitializers);
            __esDecorate(null, null, _workerName_decorators, { kind: "field", name: "workerName", static: false, private: false, access: { has: function (obj) { return "workerName" in obj; }, get: function (obj) { return obj.workerName; }, set: function (obj, value) { obj.workerName = value; } }, metadata: _metadata }, _workerName_initializers, _workerName_extraInitializers);
            __esDecorate(null, null, _jobType_decorators, { kind: "field", name: "jobType", static: false, private: false, access: { has: function (obj) { return "jobType" in obj; }, get: function (obj) { return obj.jobType; }, set: function (obj, value) { obj.jobType = value; } }, metadata: _metadata }, _jobType_initializers, _jobType_extraInitializers);
            __esDecorate(null, null, _unit_decorators, { kind: "field", name: "unit", static: false, private: false, access: { has: function (obj) { return "unit" in obj; }, get: function (obj) { return obj.unit; }, set: function (obj, value) { obj.unit = value; } }, metadata: _metadata }, _unit_initializers, _unit_extraInitializers);
            __esDecorate(null, null, _quantity_decorators, { kind: "field", name: "quantity", static: false, private: false, access: { has: function (obj) { return "quantity" in obj; }, get: function (obj) { return obj.quantity; }, set: function (obj, value) { obj.quantity = value; } }, metadata: _metadata }, _quantity_initializers, _quantity_extraInitializers);
            __esDecorate(null, null, _unitPrice_decorators, { kind: "field", name: "unitPrice", static: false, private: false, access: { has: function (obj) { return "unitPrice" in obj; }, get: function (obj) { return obj.unitPrice; }, set: function (obj, value) { obj.unitPrice = value; } }, metadata: _metadata }, _unitPrice_initializers, _unitPrice_extraInitializers);
            __esDecorate(null, null, _note_decorators, { kind: "field", name: "note", static: false, private: false, access: { has: function (obj) { return "note" in obj; }, get: function (obj) { return obj.note; }, set: function (obj, value) { obj.note = value; } }, metadata: _metadata }, _note_initializers, _note_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreateLedgerWorkLogDto = CreateLedgerWorkLogDto;
var UpdateLedgerWorkLogDto = function () {
    var _a;
    var _workDate_decorators;
    var _workDate_initializers = [];
    var _workDate_extraInitializers = [];
    var _workerName_decorators;
    var _workerName_initializers = [];
    var _workerName_extraInitializers = [];
    var _jobType_decorators;
    var _jobType_initializers = [];
    var _jobType_extraInitializers = [];
    var _unit_decorators;
    var _unit_initializers = [];
    var _unit_extraInitializers = [];
    var _quantity_decorators;
    var _quantity_initializers = [];
    var _quantity_extraInitializers = [];
    var _unitPrice_decorators;
    var _unitPrice_initializers = [];
    var _unitPrice_extraInitializers = [];
    var _note_decorators;
    var _note_initializers = [];
    var _note_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpdateLedgerWorkLogDto() {
                this.workDate = __runInitializers(this, _workDate_initializers, void 0);
                this.workerName = (__runInitializers(this, _workDate_extraInitializers), __runInitializers(this, _workerName_initializers, void 0));
                this.jobType = (__runInitializers(this, _workerName_extraInitializers), __runInitializers(this, _jobType_initializers, void 0));
                this.unit = (__runInitializers(this, _jobType_extraInitializers), __runInitializers(this, _unit_initializers, void 0));
                this.quantity = (__runInitializers(this, _unit_extraInitializers), __runInitializers(this, _quantity_initializers, void 0));
                this.unitPrice = (__runInitializers(this, _quantity_extraInitializers), __runInitializers(this, _unitPrice_initializers, void 0));
                this.note = (__runInitializers(this, _unitPrice_extraInitializers), __runInitializers(this, _note_initializers, void 0));
                __runInitializers(this, _note_extraInitializers);
            }
            return UpdateLedgerWorkLogDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _workDate_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsDateString)()];
            _workerName_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(30)];
            _jobType_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(30)];
            _unit_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsIn)(['day', 'hour'])];
            _quantity_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }), (0, class_validator_1.Min)(0.01), (0, class_validator_1.Max)(100000)];
            _unitPrice_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(MONEY_MAX)];
            _note_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(200)];
            __esDecorate(null, null, _workDate_decorators, { kind: "field", name: "workDate", static: false, private: false, access: { has: function (obj) { return "workDate" in obj; }, get: function (obj) { return obj.workDate; }, set: function (obj, value) { obj.workDate = value; } }, metadata: _metadata }, _workDate_initializers, _workDate_extraInitializers);
            __esDecorate(null, null, _workerName_decorators, { kind: "field", name: "workerName", static: false, private: false, access: { has: function (obj) { return "workerName" in obj; }, get: function (obj) { return obj.workerName; }, set: function (obj, value) { obj.workerName = value; } }, metadata: _metadata }, _workerName_initializers, _workerName_extraInitializers);
            __esDecorate(null, null, _jobType_decorators, { kind: "field", name: "jobType", static: false, private: false, access: { has: function (obj) { return "jobType" in obj; }, get: function (obj) { return obj.jobType; }, set: function (obj, value) { obj.jobType = value; } }, metadata: _metadata }, _jobType_initializers, _jobType_extraInitializers);
            __esDecorate(null, null, _unit_decorators, { kind: "field", name: "unit", static: false, private: false, access: { has: function (obj) { return "unit" in obj; }, get: function (obj) { return obj.unit; }, set: function (obj, value) { obj.unit = value; } }, metadata: _metadata }, _unit_initializers, _unit_extraInitializers);
            __esDecorate(null, null, _quantity_decorators, { kind: "field", name: "quantity", static: false, private: false, access: { has: function (obj) { return "quantity" in obj; }, get: function (obj) { return obj.quantity; }, set: function (obj, value) { obj.quantity = value; } }, metadata: _metadata }, _quantity_initializers, _quantity_extraInitializers);
            __esDecorate(null, null, _unitPrice_decorators, { kind: "field", name: "unitPrice", static: false, private: false, access: { has: function (obj) { return "unitPrice" in obj; }, get: function (obj) { return obj.unitPrice; }, set: function (obj, value) { obj.unitPrice = value; } }, metadata: _metadata }, _unitPrice_initializers, _unitPrice_extraInitializers);
            __esDecorate(null, null, _note_decorators, { kind: "field", name: "note", static: false, private: false, access: { has: function (obj) { return "note" in obj; }, get: function (obj) { return obj.note; }, set: function (obj, value) { obj.note = value; } }, metadata: _metadata }, _note_initializers, _note_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UpdateLedgerWorkLogDto = UpdateLedgerWorkLogDto;
var WorkLogQueryDto = function () {
    var _a;
    var _month_decorators;
    var _month_initializers = [];
    var _month_extraInitializers = [];
    return _a = /** @class */ (function () {
            function WorkLogQueryDto() {
                this.month = __runInitializers(this, _month_initializers, void 0);
                __runInitializers(this, _month_extraInitializers);
            }
            return WorkLogQueryDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _month_decorators = [(0, class_validator_1.Matches)(MONTH, { message: 'month 需为 YYYY-MM' })];
            __esDecorate(null, null, _month_decorators, { kind: "field", name: "month", static: false, private: false, access: { has: function (obj) { return "month" in obj; }, get: function (obj) { return obj.month; }, set: function (obj, value) { obj.month = value; } }, metadata: _metadata }, _month_initializers, _month_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.WorkLogQueryDto = WorkLogQueryDto;
