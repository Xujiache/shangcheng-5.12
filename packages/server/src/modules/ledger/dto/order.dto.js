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
exports.OrderQueryDto = exports.UpdateLedgerOrderDto = exports.CreateLedgerOrderDto = void 0;
var class_validator_1 = require("class-validator");
var MONEY_MAX = 1000000000000; // 1 万亿元上限，避免 JS number 精度溢出
/**
 * 新增订单。成本各项可选（按需开启），缺省 0。
 * extras 为其他开销数组 [{type,amount}]，服务端 sanitizeExtras 清洗后落库。
 */
var CreateLedgerOrderDto = function () {
    var _a;
    var _customerId_decorators;
    var _customerId_initializers = [];
    var _customerId_extraInitializers = [];
    var _customerName_decorators;
    var _customerName_initializers = [];
    var _customerName_extraInitializers = [];
    var _date_decorators;
    var _date_initializers = [];
    var _date_extraInitializers = [];
    var _total_decorators;
    var _total_initializers = [];
    var _total_extraInitializers = [];
    var _received_decorators;
    var _received_initializers = [];
    var _received_extraInitializers = [];
    var _costProfile_decorators;
    var _costProfile_initializers = [];
    var _costProfile_extraInitializers = [];
    var _costGlass_decorators;
    var _costGlass_initializers = [];
    var _costGlass_extraInitializers = [];
    var _costHardware_decorators;
    var _costHardware_initializers = [];
    var _costHardware_extraInitializers = [];
    var _costLabor_decorators;
    var _costLabor_initializers = [];
    var _costLabor_extraInitializers = [];
    var _costScreen_decorators;
    var _costScreen_initializers = [];
    var _costScreen_extraInitializers = [];
    var _extras_decorators;
    var _extras_initializers = [];
    var _extras_extraInitializers = [];
    var _customCosts_decorators;
    var _customCosts_initializers = [];
    var _customCosts_extraInitializers = [];
    var _items_decorators;
    var _items_initializers = [];
    var _items_extraInitializers = [];
    var _discount_decorators;
    var _discount_initializers = [];
    var _discount_extraInitializers = [];
    var _recycle_decorators;
    var _recycle_initializers = [];
    var _recycle_extraInitializers = [];
    var _deposit_decorators;
    var _deposit_initializers = [];
    var _deposit_extraInitializers = [];
    var _note_decorators;
    var _note_initializers = [];
    var _note_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateLedgerOrderDto() {
                this.customerId = __runInitializers(this, _customerId_initializers, void 0);
                this.customerName = (__runInitializers(this, _customerId_extraInitializers), __runInitializers(this, _customerName_initializers, void 0));
                /** ISO 日期字符串（YYYY-MM-DD 或完整 ISO） */
                this.date = (__runInitializers(this, _customerName_extraInitializers), __runInitializers(this, _date_initializers, void 0));
                /** 有明细(items)时由服务端按 金额−优惠 计算；无明细时必填 */
                this.total = (__runInitializers(this, _date_extraInitializers), __runInitializers(this, _total_initializers, void 0));
                /** 收款（元）：定金之外后续已收金额，仅影响未收，不计入利润 */
                this.received = (__runInitializers(this, _total_extraInitializers), __runInitializers(this, _received_initializers, void 0));
                this.costProfile = (__runInitializers(this, _received_extraInitializers), __runInitializers(this, _costProfile_initializers, void 0));
                this.costGlass = (__runInitializers(this, _costProfile_extraInitializers), __runInitializers(this, _costGlass_initializers, void 0));
                this.costHardware = (__runInitializers(this, _costGlass_extraInitializers), __runInitializers(this, _costHardware_initializers, void 0));
                this.costLabor = (__runInitializers(this, _costHardware_extraInitializers), __runInitializers(this, _costLabor_initializers, void 0));
                this.costScreen = (__runInitializers(this, _costLabor_extraInitializers), __runInitializers(this, _costScreen_initializers, void 0));
                // 数组上限与服务端 sanitize* 截断一致（超限直接 400，截断仅作兜底）
                this.extras = (__runInitializers(this, _costScreen_extraInitializers), __runInitializers(this, _extras_initializers, void 0));
                this.customCosts = (__runInitializers(this, _extras_extraInitializers), __runInitializers(this, _customCosts_initializers, void 0));
                this.items = (__runInitializers(this, _customCosts_extraInitializers), __runInitializers(this, _items_initializers, void 0));
                this.discount = (__runInitializers(this, _items_extraInitializers), __runInitializers(this, _discount_initializers, void 0));
                this.recycle = (__runInitializers(this, _discount_extraInitializers), __runInitializers(this, _recycle_initializers, void 0));
                this.deposit = (__runInitializers(this, _recycle_extraInitializers), __runInitializers(this, _deposit_initializers, void 0));
                this.note = (__runInitializers(this, _deposit_extraInitializers), __runInitializers(this, _note_initializers, void 0));
                __runInitializers(this, _note_extraInitializers);
            }
            return CreateLedgerOrderDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _customerId_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _customerName_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(40)];
            _date_decorators = [(0, class_validator_1.IsDateString)()];
            _total_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(MONEY_MAX)];
            _received_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(MONEY_MAX)];
            _costProfile_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(MONEY_MAX)];
            _costGlass_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(MONEY_MAX)];
            _costHardware_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(MONEY_MAX)];
            _costLabor_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(MONEY_MAX)];
            _costScreen_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(MONEY_MAX)];
            _extras_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsArray)(), (0, class_validator_1.ArrayMaxSize)(50)];
            _customCosts_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsArray)(), (0, class_validator_1.ArrayMaxSize)(50)];
            _items_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsArray)(), (0, class_validator_1.ArrayMaxSize)(100)];
            _discount_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(MONEY_MAX)];
            _recycle_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(MONEY_MAX)];
            _deposit_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(MONEY_MAX)];
            _note_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(200)];
            __esDecorate(null, null, _customerId_decorators, { kind: "field", name: "customerId", static: false, private: false, access: { has: function (obj) { return "customerId" in obj; }, get: function (obj) { return obj.customerId; }, set: function (obj, value) { obj.customerId = value; } }, metadata: _metadata }, _customerId_initializers, _customerId_extraInitializers);
            __esDecorate(null, null, _customerName_decorators, { kind: "field", name: "customerName", static: false, private: false, access: { has: function (obj) { return "customerName" in obj; }, get: function (obj) { return obj.customerName; }, set: function (obj, value) { obj.customerName = value; } }, metadata: _metadata }, _customerName_initializers, _customerName_extraInitializers);
            __esDecorate(null, null, _date_decorators, { kind: "field", name: "date", static: false, private: false, access: { has: function (obj) { return "date" in obj; }, get: function (obj) { return obj.date; }, set: function (obj, value) { obj.date = value; } }, metadata: _metadata }, _date_initializers, _date_extraInitializers);
            __esDecorate(null, null, _total_decorators, { kind: "field", name: "total", static: false, private: false, access: { has: function (obj) { return "total" in obj; }, get: function (obj) { return obj.total; }, set: function (obj, value) { obj.total = value; } }, metadata: _metadata }, _total_initializers, _total_extraInitializers);
            __esDecorate(null, null, _received_decorators, { kind: "field", name: "received", static: false, private: false, access: { has: function (obj) { return "received" in obj; }, get: function (obj) { return obj.received; }, set: function (obj, value) { obj.received = value; } }, metadata: _metadata }, _received_initializers, _received_extraInitializers);
            __esDecorate(null, null, _costProfile_decorators, { kind: "field", name: "costProfile", static: false, private: false, access: { has: function (obj) { return "costProfile" in obj; }, get: function (obj) { return obj.costProfile; }, set: function (obj, value) { obj.costProfile = value; } }, metadata: _metadata }, _costProfile_initializers, _costProfile_extraInitializers);
            __esDecorate(null, null, _costGlass_decorators, { kind: "field", name: "costGlass", static: false, private: false, access: { has: function (obj) { return "costGlass" in obj; }, get: function (obj) { return obj.costGlass; }, set: function (obj, value) { obj.costGlass = value; } }, metadata: _metadata }, _costGlass_initializers, _costGlass_extraInitializers);
            __esDecorate(null, null, _costHardware_decorators, { kind: "field", name: "costHardware", static: false, private: false, access: { has: function (obj) { return "costHardware" in obj; }, get: function (obj) { return obj.costHardware; }, set: function (obj, value) { obj.costHardware = value; } }, metadata: _metadata }, _costHardware_initializers, _costHardware_extraInitializers);
            __esDecorate(null, null, _costLabor_decorators, { kind: "field", name: "costLabor", static: false, private: false, access: { has: function (obj) { return "costLabor" in obj; }, get: function (obj) { return obj.costLabor; }, set: function (obj, value) { obj.costLabor = value; } }, metadata: _metadata }, _costLabor_initializers, _costLabor_extraInitializers);
            __esDecorate(null, null, _costScreen_decorators, { kind: "field", name: "costScreen", static: false, private: false, access: { has: function (obj) { return "costScreen" in obj; }, get: function (obj) { return obj.costScreen; }, set: function (obj, value) { obj.costScreen = value; } }, metadata: _metadata }, _costScreen_initializers, _costScreen_extraInitializers);
            __esDecorate(null, null, _extras_decorators, { kind: "field", name: "extras", static: false, private: false, access: { has: function (obj) { return "extras" in obj; }, get: function (obj) { return obj.extras; }, set: function (obj, value) { obj.extras = value; } }, metadata: _metadata }, _extras_initializers, _extras_extraInitializers);
            __esDecorate(null, null, _customCosts_decorators, { kind: "field", name: "customCosts", static: false, private: false, access: { has: function (obj) { return "customCosts" in obj; }, get: function (obj) { return obj.customCosts; }, set: function (obj, value) { obj.customCosts = value; } }, metadata: _metadata }, _customCosts_initializers, _customCosts_extraInitializers);
            __esDecorate(null, null, _items_decorators, { kind: "field", name: "items", static: false, private: false, access: { has: function (obj) { return "items" in obj; }, get: function (obj) { return obj.items; }, set: function (obj, value) { obj.items = value; } }, metadata: _metadata }, _items_initializers, _items_extraInitializers);
            __esDecorate(null, null, _discount_decorators, { kind: "field", name: "discount", static: false, private: false, access: { has: function (obj) { return "discount" in obj; }, get: function (obj) { return obj.discount; }, set: function (obj, value) { obj.discount = value; } }, metadata: _metadata }, _discount_initializers, _discount_extraInitializers);
            __esDecorate(null, null, _recycle_decorators, { kind: "field", name: "recycle", static: false, private: false, access: { has: function (obj) { return "recycle" in obj; }, get: function (obj) { return obj.recycle; }, set: function (obj, value) { obj.recycle = value; } }, metadata: _metadata }, _recycle_initializers, _recycle_extraInitializers);
            __esDecorate(null, null, _deposit_decorators, { kind: "field", name: "deposit", static: false, private: false, access: { has: function (obj) { return "deposit" in obj; }, get: function (obj) { return obj.deposit; }, set: function (obj, value) { obj.deposit = value; } }, metadata: _metadata }, _deposit_initializers, _deposit_extraInitializers);
            __esDecorate(null, null, _note_decorators, { kind: "field", name: "note", static: false, private: false, access: { has: function (obj) { return "note" in obj; }, get: function (obj) { return obj.note; }, set: function (obj, value) { obj.note = value; } }, metadata: _metadata }, _note_initializers, _note_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreateLedgerOrderDto = CreateLedgerOrderDto;
var UpdateLedgerOrderDto = function () {
    var _a;
    var _customerId_decorators;
    var _customerId_initializers = [];
    var _customerId_extraInitializers = [];
    var _customerName_decorators;
    var _customerName_initializers = [];
    var _customerName_extraInitializers = [];
    var _date_decorators;
    var _date_initializers = [];
    var _date_extraInitializers = [];
    var _total_decorators;
    var _total_initializers = [];
    var _total_extraInitializers = [];
    var _received_decorators;
    var _received_initializers = [];
    var _received_extraInitializers = [];
    var _costProfile_decorators;
    var _costProfile_initializers = [];
    var _costProfile_extraInitializers = [];
    var _costGlass_decorators;
    var _costGlass_initializers = [];
    var _costGlass_extraInitializers = [];
    var _costHardware_decorators;
    var _costHardware_initializers = [];
    var _costHardware_extraInitializers = [];
    var _costLabor_decorators;
    var _costLabor_initializers = [];
    var _costLabor_extraInitializers = [];
    var _costScreen_decorators;
    var _costScreen_initializers = [];
    var _costScreen_extraInitializers = [];
    var _extras_decorators;
    var _extras_initializers = [];
    var _extras_extraInitializers = [];
    var _customCosts_decorators;
    var _customCosts_initializers = [];
    var _customCosts_extraInitializers = [];
    var _items_decorators;
    var _items_initializers = [];
    var _items_extraInitializers = [];
    var _discount_decorators;
    var _discount_initializers = [];
    var _discount_extraInitializers = [];
    var _recycle_decorators;
    var _recycle_initializers = [];
    var _recycle_extraInitializers = [];
    var _deposit_decorators;
    var _deposit_initializers = [];
    var _deposit_extraInitializers = [];
    var _note_decorators;
    var _note_initializers = [];
    var _note_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpdateLedgerOrderDto() {
                this.customerId = __runInitializers(this, _customerId_initializers, void 0);
                this.customerName = (__runInitializers(this, _customerId_extraInitializers), __runInitializers(this, _customerName_initializers, void 0));
                this.date = (__runInitializers(this, _customerName_extraInitializers), __runInitializers(this, _date_initializers, void 0));
                this.total = (__runInitializers(this, _date_extraInitializers), __runInitializers(this, _total_initializers, void 0));
                this.received = (__runInitializers(this, _total_extraInitializers), __runInitializers(this, _received_initializers, void 0));
                this.costProfile = (__runInitializers(this, _received_extraInitializers), __runInitializers(this, _costProfile_initializers, void 0));
                this.costGlass = (__runInitializers(this, _costProfile_extraInitializers), __runInitializers(this, _costGlass_initializers, void 0));
                this.costHardware = (__runInitializers(this, _costGlass_extraInitializers), __runInitializers(this, _costHardware_initializers, void 0));
                this.costLabor = (__runInitializers(this, _costHardware_extraInitializers), __runInitializers(this, _costLabor_initializers, void 0));
                this.costScreen = (__runInitializers(this, _costLabor_extraInitializers), __runInitializers(this, _costScreen_initializers, void 0));
                this.extras = (__runInitializers(this, _costScreen_extraInitializers), __runInitializers(this, _extras_initializers, void 0));
                this.customCosts = (__runInitializers(this, _extras_extraInitializers), __runInitializers(this, _customCosts_initializers, void 0));
                this.items = (__runInitializers(this, _customCosts_extraInitializers), __runInitializers(this, _items_initializers, void 0));
                this.discount = (__runInitializers(this, _items_extraInitializers), __runInitializers(this, _discount_initializers, void 0));
                this.recycle = (__runInitializers(this, _discount_extraInitializers), __runInitializers(this, _recycle_initializers, void 0));
                this.deposit = (__runInitializers(this, _recycle_extraInitializers), __runInitializers(this, _deposit_initializers, void 0));
                this.note = (__runInitializers(this, _deposit_extraInitializers), __runInitializers(this, _note_initializers, void 0));
                __runInitializers(this, _note_extraInitializers);
            }
            return UpdateLedgerOrderDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _customerId_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _customerName_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(40)];
            _date_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsDateString)()];
            _total_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(MONEY_MAX)];
            _received_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(MONEY_MAX)];
            _costProfile_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(MONEY_MAX)];
            _costGlass_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(MONEY_MAX)];
            _costHardware_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(MONEY_MAX)];
            _costLabor_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(MONEY_MAX)];
            _costScreen_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(MONEY_MAX)];
            _extras_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsArray)(), (0, class_validator_1.ArrayMaxSize)(50)];
            _customCosts_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsArray)(), (0, class_validator_1.ArrayMaxSize)(50)];
            _items_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsArray)(), (0, class_validator_1.ArrayMaxSize)(100)];
            _discount_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(MONEY_MAX)];
            _recycle_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(MONEY_MAX)];
            _deposit_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(MONEY_MAX)];
            _note_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(200)];
            __esDecorate(null, null, _customerId_decorators, { kind: "field", name: "customerId", static: false, private: false, access: { has: function (obj) { return "customerId" in obj; }, get: function (obj) { return obj.customerId; }, set: function (obj, value) { obj.customerId = value; } }, metadata: _metadata }, _customerId_initializers, _customerId_extraInitializers);
            __esDecorate(null, null, _customerName_decorators, { kind: "field", name: "customerName", static: false, private: false, access: { has: function (obj) { return "customerName" in obj; }, get: function (obj) { return obj.customerName; }, set: function (obj, value) { obj.customerName = value; } }, metadata: _metadata }, _customerName_initializers, _customerName_extraInitializers);
            __esDecorate(null, null, _date_decorators, { kind: "field", name: "date", static: false, private: false, access: { has: function (obj) { return "date" in obj; }, get: function (obj) { return obj.date; }, set: function (obj, value) { obj.date = value; } }, metadata: _metadata }, _date_initializers, _date_extraInitializers);
            __esDecorate(null, null, _total_decorators, { kind: "field", name: "total", static: false, private: false, access: { has: function (obj) { return "total" in obj; }, get: function (obj) { return obj.total; }, set: function (obj, value) { obj.total = value; } }, metadata: _metadata }, _total_initializers, _total_extraInitializers);
            __esDecorate(null, null, _received_decorators, { kind: "field", name: "received", static: false, private: false, access: { has: function (obj) { return "received" in obj; }, get: function (obj) { return obj.received; }, set: function (obj, value) { obj.received = value; } }, metadata: _metadata }, _received_initializers, _received_extraInitializers);
            __esDecorate(null, null, _costProfile_decorators, { kind: "field", name: "costProfile", static: false, private: false, access: { has: function (obj) { return "costProfile" in obj; }, get: function (obj) { return obj.costProfile; }, set: function (obj, value) { obj.costProfile = value; } }, metadata: _metadata }, _costProfile_initializers, _costProfile_extraInitializers);
            __esDecorate(null, null, _costGlass_decorators, { kind: "field", name: "costGlass", static: false, private: false, access: { has: function (obj) { return "costGlass" in obj; }, get: function (obj) { return obj.costGlass; }, set: function (obj, value) { obj.costGlass = value; } }, metadata: _metadata }, _costGlass_initializers, _costGlass_extraInitializers);
            __esDecorate(null, null, _costHardware_decorators, { kind: "field", name: "costHardware", static: false, private: false, access: { has: function (obj) { return "costHardware" in obj; }, get: function (obj) { return obj.costHardware; }, set: function (obj, value) { obj.costHardware = value; } }, metadata: _metadata }, _costHardware_initializers, _costHardware_extraInitializers);
            __esDecorate(null, null, _costLabor_decorators, { kind: "field", name: "costLabor", static: false, private: false, access: { has: function (obj) { return "costLabor" in obj; }, get: function (obj) { return obj.costLabor; }, set: function (obj, value) { obj.costLabor = value; } }, metadata: _metadata }, _costLabor_initializers, _costLabor_extraInitializers);
            __esDecorate(null, null, _costScreen_decorators, { kind: "field", name: "costScreen", static: false, private: false, access: { has: function (obj) { return "costScreen" in obj; }, get: function (obj) { return obj.costScreen; }, set: function (obj, value) { obj.costScreen = value; } }, metadata: _metadata }, _costScreen_initializers, _costScreen_extraInitializers);
            __esDecorate(null, null, _extras_decorators, { kind: "field", name: "extras", static: false, private: false, access: { has: function (obj) { return "extras" in obj; }, get: function (obj) { return obj.extras; }, set: function (obj, value) { obj.extras = value; } }, metadata: _metadata }, _extras_initializers, _extras_extraInitializers);
            __esDecorate(null, null, _customCosts_decorators, { kind: "field", name: "customCosts", static: false, private: false, access: { has: function (obj) { return "customCosts" in obj; }, get: function (obj) { return obj.customCosts; }, set: function (obj, value) { obj.customCosts = value; } }, metadata: _metadata }, _customCosts_initializers, _customCosts_extraInitializers);
            __esDecorate(null, null, _items_decorators, { kind: "field", name: "items", static: false, private: false, access: { has: function (obj) { return "items" in obj; }, get: function (obj) { return obj.items; }, set: function (obj, value) { obj.items = value; } }, metadata: _metadata }, _items_initializers, _items_extraInitializers);
            __esDecorate(null, null, _discount_decorators, { kind: "field", name: "discount", static: false, private: false, access: { has: function (obj) { return "discount" in obj; }, get: function (obj) { return obj.discount; }, set: function (obj, value) { obj.discount = value; } }, metadata: _metadata }, _discount_initializers, _discount_extraInitializers);
            __esDecorate(null, null, _recycle_decorators, { kind: "field", name: "recycle", static: false, private: false, access: { has: function (obj) { return "recycle" in obj; }, get: function (obj) { return obj.recycle; }, set: function (obj, value) { obj.recycle = value; } }, metadata: _metadata }, _recycle_initializers, _recycle_extraInitializers);
            __esDecorate(null, null, _deposit_decorators, { kind: "field", name: "deposit", static: false, private: false, access: { has: function (obj) { return "deposit" in obj; }, get: function (obj) { return obj.deposit; }, set: function (obj, value) { obj.deposit = value; } }, metadata: _metadata }, _deposit_initializers, _deposit_extraInitializers);
            __esDecorate(null, null, _note_decorators, { kind: "field", name: "note", static: false, private: false, access: { has: function (obj) { return "note" in obj; }, get: function (obj) { return obj.note; }, set: function (obj, value) { obj.note = value; } }, metadata: _metadata }, _note_initializers, _note_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UpdateLedgerOrderDto = UpdateLedgerOrderDto;
var OrderQueryDto = function () {
    var _a;
    var _customer_decorators;
    var _customer_initializers = [];
    var _customer_extraInitializers = [];
    var _dateFrom_decorators;
    var _dateFrom_initializers = [];
    var _dateFrom_extraInitializers = [];
    var _dateTo_decorators;
    var _dateTo_initializers = [];
    var _dateTo_extraInitializers = [];
    var _profitMin_decorators;
    var _profitMin_initializers = [];
    var _profitMin_extraInitializers = [];
    var _profitMax_decorators;
    var _profitMax_initializers = [];
    var _profitMax_extraInitializers = [];
    var _sort_decorators;
    var _sort_initializers = [];
    var _sort_extraInitializers = [];
    var _page_decorators;
    var _page_initializers = [];
    var _page_extraInitializers = [];
    var _pageSize_decorators;
    var _pageSize_initializers = [];
    var _pageSize_extraInitializers = [];
    return _a = /** @class */ (function () {
            function OrderQueryDto() {
                this.customer = __runInitializers(this, _customer_initializers, void 0);
                this.dateFrom = (__runInitializers(this, _customer_extraInitializers), __runInitializers(this, _dateFrom_initializers, void 0));
                this.dateTo = (__runInitializers(this, _dateFrom_extraInitializers), __runInitializers(this, _dateTo_initializers, void 0));
                this.profitMin = (__runInitializers(this, _dateTo_extraInitializers), __runInitializers(this, _profitMin_initializers, void 0));
                this.profitMax = (__runInitializers(this, _profitMin_extraInitializers), __runInitializers(this, _profitMax_initializers, void 0));
                this.sort = (__runInitializers(this, _profitMax_extraInitializers), __runInitializers(this, _sort_initializers, void 0)); // 'date' | 'profit'
                this.page = (__runInitializers(this, _sort_extraInitializers), __runInitializers(this, _page_initializers, void 0));
                this.pageSize = (__runInitializers(this, _page_extraInitializers), __runInitializers(this, _pageSize_initializers, void 0));
                __runInitializers(this, _pageSize_extraInitializers);
            }
            return OrderQueryDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _customer_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _dateFrom_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsDateString)()];
            _dateTo_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsDateString)()];
            _profitMin_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _profitMax_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _sort_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _page_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _pageSize_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _customer_decorators, { kind: "field", name: "customer", static: false, private: false, access: { has: function (obj) { return "customer" in obj; }, get: function (obj) { return obj.customer; }, set: function (obj, value) { obj.customer = value; } }, metadata: _metadata }, _customer_initializers, _customer_extraInitializers);
            __esDecorate(null, null, _dateFrom_decorators, { kind: "field", name: "dateFrom", static: false, private: false, access: { has: function (obj) { return "dateFrom" in obj; }, get: function (obj) { return obj.dateFrom; }, set: function (obj, value) { obj.dateFrom = value; } }, metadata: _metadata }, _dateFrom_initializers, _dateFrom_extraInitializers);
            __esDecorate(null, null, _dateTo_decorators, { kind: "field", name: "dateTo", static: false, private: false, access: { has: function (obj) { return "dateTo" in obj; }, get: function (obj) { return obj.dateTo; }, set: function (obj, value) { obj.dateTo = value; } }, metadata: _metadata }, _dateTo_initializers, _dateTo_extraInitializers);
            __esDecorate(null, null, _profitMin_decorators, { kind: "field", name: "profitMin", static: false, private: false, access: { has: function (obj) { return "profitMin" in obj; }, get: function (obj) { return obj.profitMin; }, set: function (obj, value) { obj.profitMin = value; } }, metadata: _metadata }, _profitMin_initializers, _profitMin_extraInitializers);
            __esDecorate(null, null, _profitMax_decorators, { kind: "field", name: "profitMax", static: false, private: false, access: { has: function (obj) { return "profitMax" in obj; }, get: function (obj) { return obj.profitMax; }, set: function (obj, value) { obj.profitMax = value; } }, metadata: _metadata }, _profitMax_initializers, _profitMax_extraInitializers);
            __esDecorate(null, null, _sort_decorators, { kind: "field", name: "sort", static: false, private: false, access: { has: function (obj) { return "sort" in obj; }, get: function (obj) { return obj.sort; }, set: function (obj, value) { obj.sort = value; } }, metadata: _metadata }, _sort_initializers, _sort_extraInitializers);
            __esDecorate(null, null, _page_decorators, { kind: "field", name: "page", static: false, private: false, access: { has: function (obj) { return "page" in obj; }, get: function (obj) { return obj.page; }, set: function (obj, value) { obj.page = value; } }, metadata: _metadata }, _page_initializers, _page_extraInitializers);
            __esDecorate(null, null, _pageSize_decorators, { kind: "field", name: "pageSize", static: false, private: false, access: { has: function (obj) { return "pageSize" in obj; }, get: function (obj) { return obj.pageSize; }, set: function (obj, value) { obj.pageSize = value; } }, metadata: _metadata }, _pageSize_initializers, _pageSize_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.OrderQueryDto = OrderQueryDto;
