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
exports.SubmitBookingDto = void 0;
var class_validator_1 = require("class-validator");
/**
 * POST /u/booking
 * service submitBooking(userId, dto) 读取（含别名，每个变体都必须保留）：
 *   - dto.name      || dto.contactName  → contactName
 *   - dto.phone     || dto.contactPhone → contactPhone
 *   - dto.address
 *   - dto.appointAt || dto.scheduledAt  → new Date(...)
 *   - dto.space     (单个) / dto.spaceTypes (数组)
 *   - dto.remark
 *
 * 服务端不抛缺失校验（除 Prisma 非空约束外），故全部 @IsOptional，仅做类型约束。
 */
var SubmitBookingDto = function () {
    var _a;
    var _name_decorators;
    var _name_initializers = [];
    var _name_extraInitializers = [];
    var _contactName_decorators;
    var _contactName_initializers = [];
    var _contactName_extraInitializers = [];
    var _phone_decorators;
    var _phone_initializers = [];
    var _phone_extraInitializers = [];
    var _contactPhone_decorators;
    var _contactPhone_initializers = [];
    var _contactPhone_extraInitializers = [];
    var _address_decorators;
    var _address_initializers = [];
    var _address_extraInitializers = [];
    var _appointAt_decorators;
    var _appointAt_initializers = [];
    var _appointAt_extraInitializers = [];
    var _scheduledAt_decorators;
    var _scheduledAt_initializers = [];
    var _scheduledAt_extraInitializers = [];
    var _space_decorators;
    var _space_initializers = [];
    var _space_extraInitializers = [];
    var _spaceTypes_decorators;
    var _spaceTypes_initializers = [];
    var _spaceTypes_extraInitializers = [];
    var _remark_decorators;
    var _remark_initializers = [];
    var _remark_extraInitializers = [];
    return _a = /** @class */ (function () {
            function SubmitBookingDto() {
                this.name = __runInitializers(this, _name_initializers, void 0);
                this.contactName = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _contactName_initializers, void 0));
                this.phone = (__runInitializers(this, _contactName_extraInitializers), __runInitializers(this, _phone_initializers, void 0));
                this.contactPhone = (__runInitializers(this, _phone_extraInitializers), __runInitializers(this, _contactPhone_initializers, void 0));
                this.address = (__runInitializers(this, _contactPhone_extraInitializers), __runInitializers(this, _address_initializers, void 0));
                this.appointAt = (__runInitializers(this, _address_extraInitializers), __runInitializers(this, _appointAt_initializers, void 0));
                this.scheduledAt = (__runInitializers(this, _appointAt_extraInitializers), __runInitializers(this, _scheduledAt_initializers, void 0));
                this.space = (__runInitializers(this, _scheduledAt_extraInitializers), __runInitializers(this, _space_initializers, void 0));
                this.spaceTypes = (__runInitializers(this, _space_extraInitializers), __runInitializers(this, _spaceTypes_initializers, void 0));
                this.remark = (__runInitializers(this, _spaceTypes_extraInitializers), __runInitializers(this, _remark_initializers, void 0));
                __runInitializers(this, _remark_extraInitializers);
            }
            return SubmitBookingDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _name_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _contactName_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _phone_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _contactPhone_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _address_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _appointAt_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _scheduledAt_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _space_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _spaceTypes_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsArray)()];
            _remark_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: function (obj) { return "name" in obj; }, get: function (obj) { return obj.name; }, set: function (obj, value) { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
            __esDecorate(null, null, _contactName_decorators, { kind: "field", name: "contactName", static: false, private: false, access: { has: function (obj) { return "contactName" in obj; }, get: function (obj) { return obj.contactName; }, set: function (obj, value) { obj.contactName = value; } }, metadata: _metadata }, _contactName_initializers, _contactName_extraInitializers);
            __esDecorate(null, null, _phone_decorators, { kind: "field", name: "phone", static: false, private: false, access: { has: function (obj) { return "phone" in obj; }, get: function (obj) { return obj.phone; }, set: function (obj, value) { obj.phone = value; } }, metadata: _metadata }, _phone_initializers, _phone_extraInitializers);
            __esDecorate(null, null, _contactPhone_decorators, { kind: "field", name: "contactPhone", static: false, private: false, access: { has: function (obj) { return "contactPhone" in obj; }, get: function (obj) { return obj.contactPhone; }, set: function (obj, value) { obj.contactPhone = value; } }, metadata: _metadata }, _contactPhone_initializers, _contactPhone_extraInitializers);
            __esDecorate(null, null, _address_decorators, { kind: "field", name: "address", static: false, private: false, access: { has: function (obj) { return "address" in obj; }, get: function (obj) { return obj.address; }, set: function (obj, value) { obj.address = value; } }, metadata: _metadata }, _address_initializers, _address_extraInitializers);
            __esDecorate(null, null, _appointAt_decorators, { kind: "field", name: "appointAt", static: false, private: false, access: { has: function (obj) { return "appointAt" in obj; }, get: function (obj) { return obj.appointAt; }, set: function (obj, value) { obj.appointAt = value; } }, metadata: _metadata }, _appointAt_initializers, _appointAt_extraInitializers);
            __esDecorate(null, null, _scheduledAt_decorators, { kind: "field", name: "scheduledAt", static: false, private: false, access: { has: function (obj) { return "scheduledAt" in obj; }, get: function (obj) { return obj.scheduledAt; }, set: function (obj, value) { obj.scheduledAt = value; } }, metadata: _metadata }, _scheduledAt_initializers, _scheduledAt_extraInitializers);
            __esDecorate(null, null, _space_decorators, { kind: "field", name: "space", static: false, private: false, access: { has: function (obj) { return "space" in obj; }, get: function (obj) { return obj.space; }, set: function (obj, value) { obj.space = value; } }, metadata: _metadata }, _space_initializers, _space_extraInitializers);
            __esDecorate(null, null, _spaceTypes_decorators, { kind: "field", name: "spaceTypes", static: false, private: false, access: { has: function (obj) { return "spaceTypes" in obj; }, get: function (obj) { return obj.spaceTypes; }, set: function (obj, value) { obj.spaceTypes = value; } }, metadata: _metadata }, _spaceTypes_initializers, _spaceTypes_extraInitializers);
            __esDecorate(null, null, _remark_decorators, { kind: "field", name: "remark", static: false, private: false, access: { has: function (obj) { return "remark" in obj; }, get: function (obj) { return obj.remark; }, set: function (obj, value) { obj.remark = value; } }, metadata: _metadata }, _remark_initializers, _remark_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.SubmitBookingDto = SubmitBookingDto;
