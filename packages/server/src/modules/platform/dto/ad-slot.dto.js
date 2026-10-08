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
exports.UpdateAdSlotDto = exports.CreateAdSlotDto = void 0;
var class_validator_1 = require("class-validator");
/**
 * 广告位 DTO —— 字段白名单
 *
 * 背景：全局 ValidationPipe 配置为 `{ whitelist: true, transform: true }`，
 * 任何「未在 DTO 上声明的字段」都会被静默剥离（forbidNonWhitelisted:false，不报 400）。
 * 因此本 DTO 必须覆盖 service 真正消费的字段集合，否则会被静默剥离成 undefined。
 *
 * 之所以安全：service.createAdSlot()/updateAdSlot() 都先经过 `sanitizeAdSlotDto(dto)`，
 * 该函数只读取固定白名单 AD_SLOT_FIELDS：
 *   code / name / scene / target / position / size / sort
 *   / unitPrice / enabled / status / preview / startAt / endAt
 * service 已做「字段白名单」（出口防御），本 DTO 与之完全镜像（入口防御），
 * 只要 DTO 覆盖 AD_SLOT_FIELDS，pipe 的剥离行为不会改变现有可用 payload 的语义。
 *
 * 校验宽松度：
 *   - 仅 code/name 设为必填（service 缺失时会抛 INVALID_PARAMS）
 *   - 其余字段一律 @IsOptional，避免 400 拒绝当前合法请求
 *   - startAt/endAt 服务端用 `new Date(dto[k])` 解析，允许 ISO 字符串/时间戳，
 *     故只做 @IsOptional 不强约束格式，避免误拒合法时间值
 */
var CreateAdSlotDto = function () {
    var _a;
    var _code_decorators;
    var _code_initializers = [];
    var _code_extraInitializers = [];
    var _name_decorators;
    var _name_initializers = [];
    var _name_extraInitializers = [];
    var _scene_decorators;
    var _scene_initializers = [];
    var _scene_extraInitializers = [];
    var _target_decorators;
    var _target_initializers = [];
    var _target_extraInitializers = [];
    var _position_decorators;
    var _position_initializers = [];
    var _position_extraInitializers = [];
    var _size_decorators;
    var _size_initializers = [];
    var _size_extraInitializers = [];
    var _sort_decorators;
    var _sort_initializers = [];
    var _sort_extraInitializers = [];
    var _unitPrice_decorators;
    var _unitPrice_initializers = [];
    var _unitPrice_extraInitializers = [];
    var _enabled_decorators;
    var _enabled_initializers = [];
    var _enabled_extraInitializers = [];
    var _status_decorators;
    var _status_initializers = [];
    var _status_extraInitializers = [];
    var _preview_decorators;
    var _preview_initializers = [];
    var _preview_extraInitializers = [];
    var _startAt_decorators;
    var _startAt_initializers = [];
    var _startAt_extraInitializers = [];
    var _endAt_decorators;
    var _endAt_initializers = [];
    var _endAt_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateAdSlotDto() {
                // service.createAdSlot() 要求 code 必填（sanitize 后 !data.code 抛错）
                this.code = __runInitializers(this, _code_initializers, void 0);
                // service.createAdSlot() 要求 name 必填
                this.name = (__runInitializers(this, _code_extraInitializers), __runInitializers(this, _name_initializers, void 0));
                this.scene = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _scene_initializers, void 0));
                // customer / factory / store / all（默认 all），保持宽松不强枚举
                this.target = (__runInitializers(this, _scene_extraInitializers), __runInitializers(this, _target_initializers, void 0));
                this.position = (__runInitializers(this, _target_extraInitializers), __runInitializers(this, _position_initializers, void 0));
                this.size = (__runInitializers(this, _position_extraInitializers), __runInitializers(this, _size_initializers, void 0));
                this.sort = (__runInitializers(this, _size_extraInitializers), __runInitializers(this, _sort_initializers, void 0));
                this.unitPrice = (__runInitializers(this, _sort_extraInitializers), __runInitializers(this, _unitPrice_initializers, void 0));
                this.enabled = (__runInitializers(this, _unitPrice_extraInitializers), __runInitializers(this, _enabled_initializers, void 0));
                this.status = (__runInitializers(this, _enabled_extraInitializers), __runInitializers(this, _status_initializers, void 0));
                this.preview = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _preview_initializers, void 0));
                // service 用 new Date(dto.startAt) 解析，允许任意可解析的时间值
                this.startAt = (__runInitializers(this, _preview_extraInitializers), __runInitializers(this, _startAt_initializers, void 0));
                // service 用 new Date(dto.endAt) 解析，允许任意可解析的时间值
                this.endAt = (__runInitializers(this, _startAt_extraInitializers), __runInitializers(this, _endAt_initializers, void 0));
                __runInitializers(this, _endAt_extraInitializers);
            }
            return CreateAdSlotDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _code_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(64)];
            _name_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(128)];
            _scene_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(64)];
            _target_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.IsIn)(['customer', 'factory', 'store', 'all'])];
            _position_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(64)];
            _size_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(64)];
            _sort_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)()];
            _unitPrice_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)()];
            _enabled_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)()];
            _status_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(32)];
            _preview_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _startAt_decorators = [(0, class_validator_1.IsOptional)()];
            _endAt_decorators = [(0, class_validator_1.IsOptional)()];
            __esDecorate(null, null, _code_decorators, { kind: "field", name: "code", static: false, private: false, access: { has: function (obj) { return "code" in obj; }, get: function (obj) { return obj.code; }, set: function (obj, value) { obj.code = value; } }, metadata: _metadata }, _code_initializers, _code_extraInitializers);
            __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: function (obj) { return "name" in obj; }, get: function (obj) { return obj.name; }, set: function (obj, value) { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
            __esDecorate(null, null, _scene_decorators, { kind: "field", name: "scene", static: false, private: false, access: { has: function (obj) { return "scene" in obj; }, get: function (obj) { return obj.scene; }, set: function (obj, value) { obj.scene = value; } }, metadata: _metadata }, _scene_initializers, _scene_extraInitializers);
            __esDecorate(null, null, _target_decorators, { kind: "field", name: "target", static: false, private: false, access: { has: function (obj) { return "target" in obj; }, get: function (obj) { return obj.target; }, set: function (obj, value) { obj.target = value; } }, metadata: _metadata }, _target_initializers, _target_extraInitializers);
            __esDecorate(null, null, _position_decorators, { kind: "field", name: "position", static: false, private: false, access: { has: function (obj) { return "position" in obj; }, get: function (obj) { return obj.position; }, set: function (obj, value) { obj.position = value; } }, metadata: _metadata }, _position_initializers, _position_extraInitializers);
            __esDecorate(null, null, _size_decorators, { kind: "field", name: "size", static: false, private: false, access: { has: function (obj) { return "size" in obj; }, get: function (obj) { return obj.size; }, set: function (obj, value) { obj.size = value; } }, metadata: _metadata }, _size_initializers, _size_extraInitializers);
            __esDecorate(null, null, _sort_decorators, { kind: "field", name: "sort", static: false, private: false, access: { has: function (obj) { return "sort" in obj; }, get: function (obj) { return obj.sort; }, set: function (obj, value) { obj.sort = value; } }, metadata: _metadata }, _sort_initializers, _sort_extraInitializers);
            __esDecorate(null, null, _unitPrice_decorators, { kind: "field", name: "unitPrice", static: false, private: false, access: { has: function (obj) { return "unitPrice" in obj; }, get: function (obj) { return obj.unitPrice; }, set: function (obj, value) { obj.unitPrice = value; } }, metadata: _metadata }, _unitPrice_initializers, _unitPrice_extraInitializers);
            __esDecorate(null, null, _enabled_decorators, { kind: "field", name: "enabled", static: false, private: false, access: { has: function (obj) { return "enabled" in obj; }, get: function (obj) { return obj.enabled; }, set: function (obj, value) { obj.enabled = value; } }, metadata: _metadata }, _enabled_initializers, _enabled_extraInitializers);
            __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: function (obj) { return "status" in obj; }, get: function (obj) { return obj.status; }, set: function (obj, value) { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
            __esDecorate(null, null, _preview_decorators, { kind: "field", name: "preview", static: false, private: false, access: { has: function (obj) { return "preview" in obj; }, get: function (obj) { return obj.preview; }, set: function (obj, value) { obj.preview = value; } }, metadata: _metadata }, _preview_initializers, _preview_extraInitializers);
            __esDecorate(null, null, _startAt_decorators, { kind: "field", name: "startAt", static: false, private: false, access: { has: function (obj) { return "startAt" in obj; }, get: function (obj) { return obj.startAt; }, set: function (obj, value) { obj.startAt = value; } }, metadata: _metadata }, _startAt_initializers, _startAt_extraInitializers);
            __esDecorate(null, null, _endAt_decorators, { kind: "field", name: "endAt", static: false, private: false, access: { has: function (obj) { return "endAt" in obj; }, get: function (obj) { return obj.endAt; }, set: function (obj, value) { obj.endAt = value; } }, metadata: _metadata }, _endAt_initializers, _endAt_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreateAdSlotDto = CreateAdSlotDto;
/**
 * 广告位更新 DTO —— 全部字段可选
 *
 * service.updateAdSlot() 同样经过 sanitizeAdSlotDto；更新时无必填字段，
 * 但要求 sanitize 后至少有一个可更新字段（否则抛「没有可更新的字段」）。
 * 字段集合与 CreateAdSlotDto 完全一致，仅 code/name 改为可选。
 */
var UpdateAdSlotDto = function () {
    var _a;
    var _code_decorators;
    var _code_initializers = [];
    var _code_extraInitializers = [];
    var _name_decorators;
    var _name_initializers = [];
    var _name_extraInitializers = [];
    var _scene_decorators;
    var _scene_initializers = [];
    var _scene_extraInitializers = [];
    var _target_decorators;
    var _target_initializers = [];
    var _target_extraInitializers = [];
    var _position_decorators;
    var _position_initializers = [];
    var _position_extraInitializers = [];
    var _size_decorators;
    var _size_initializers = [];
    var _size_extraInitializers = [];
    var _sort_decorators;
    var _sort_initializers = [];
    var _sort_extraInitializers = [];
    var _unitPrice_decorators;
    var _unitPrice_initializers = [];
    var _unitPrice_extraInitializers = [];
    var _enabled_decorators;
    var _enabled_initializers = [];
    var _enabled_extraInitializers = [];
    var _status_decorators;
    var _status_initializers = [];
    var _status_extraInitializers = [];
    var _preview_decorators;
    var _preview_initializers = [];
    var _preview_extraInitializers = [];
    var _startAt_decorators;
    var _startAt_initializers = [];
    var _startAt_extraInitializers = [];
    var _endAt_decorators;
    var _endAt_initializers = [];
    var _endAt_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpdateAdSlotDto() {
                this.code = __runInitializers(this, _code_initializers, void 0);
                this.name = (__runInitializers(this, _code_extraInitializers), __runInitializers(this, _name_initializers, void 0));
                this.scene = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _scene_initializers, void 0));
                this.target = (__runInitializers(this, _scene_extraInitializers), __runInitializers(this, _target_initializers, void 0));
                this.position = (__runInitializers(this, _target_extraInitializers), __runInitializers(this, _position_initializers, void 0));
                this.size = (__runInitializers(this, _position_extraInitializers), __runInitializers(this, _size_initializers, void 0));
                this.sort = (__runInitializers(this, _size_extraInitializers), __runInitializers(this, _sort_initializers, void 0));
                this.unitPrice = (__runInitializers(this, _sort_extraInitializers), __runInitializers(this, _unitPrice_initializers, void 0));
                this.enabled = (__runInitializers(this, _unitPrice_extraInitializers), __runInitializers(this, _enabled_initializers, void 0));
                this.status = (__runInitializers(this, _enabled_extraInitializers), __runInitializers(this, _status_initializers, void 0));
                this.preview = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _preview_initializers, void 0));
                this.startAt = (__runInitializers(this, _preview_extraInitializers), __runInitializers(this, _startAt_initializers, void 0));
                this.endAt = (__runInitializers(this, _startAt_extraInitializers), __runInitializers(this, _endAt_initializers, void 0));
                __runInitializers(this, _endAt_extraInitializers);
            }
            return UpdateAdSlotDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _code_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(64)];
            _name_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(128)];
            _scene_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(64)];
            _target_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.IsIn)(['customer', 'factory', 'store', 'all'])];
            _position_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(64)];
            _size_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(64)];
            _sort_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)()];
            _unitPrice_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)()];
            _enabled_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)()];
            _status_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(32)];
            _preview_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _startAt_decorators = [(0, class_validator_1.IsOptional)()];
            _endAt_decorators = [(0, class_validator_1.IsOptional)()];
            __esDecorate(null, null, _code_decorators, { kind: "field", name: "code", static: false, private: false, access: { has: function (obj) { return "code" in obj; }, get: function (obj) { return obj.code; }, set: function (obj, value) { obj.code = value; } }, metadata: _metadata }, _code_initializers, _code_extraInitializers);
            __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: function (obj) { return "name" in obj; }, get: function (obj) { return obj.name; }, set: function (obj, value) { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
            __esDecorate(null, null, _scene_decorators, { kind: "field", name: "scene", static: false, private: false, access: { has: function (obj) { return "scene" in obj; }, get: function (obj) { return obj.scene; }, set: function (obj, value) { obj.scene = value; } }, metadata: _metadata }, _scene_initializers, _scene_extraInitializers);
            __esDecorate(null, null, _target_decorators, { kind: "field", name: "target", static: false, private: false, access: { has: function (obj) { return "target" in obj; }, get: function (obj) { return obj.target; }, set: function (obj, value) { obj.target = value; } }, metadata: _metadata }, _target_initializers, _target_extraInitializers);
            __esDecorate(null, null, _position_decorators, { kind: "field", name: "position", static: false, private: false, access: { has: function (obj) { return "position" in obj; }, get: function (obj) { return obj.position; }, set: function (obj, value) { obj.position = value; } }, metadata: _metadata }, _position_initializers, _position_extraInitializers);
            __esDecorate(null, null, _size_decorators, { kind: "field", name: "size", static: false, private: false, access: { has: function (obj) { return "size" in obj; }, get: function (obj) { return obj.size; }, set: function (obj, value) { obj.size = value; } }, metadata: _metadata }, _size_initializers, _size_extraInitializers);
            __esDecorate(null, null, _sort_decorators, { kind: "field", name: "sort", static: false, private: false, access: { has: function (obj) { return "sort" in obj; }, get: function (obj) { return obj.sort; }, set: function (obj, value) { obj.sort = value; } }, metadata: _metadata }, _sort_initializers, _sort_extraInitializers);
            __esDecorate(null, null, _unitPrice_decorators, { kind: "field", name: "unitPrice", static: false, private: false, access: { has: function (obj) { return "unitPrice" in obj; }, get: function (obj) { return obj.unitPrice; }, set: function (obj, value) { obj.unitPrice = value; } }, metadata: _metadata }, _unitPrice_initializers, _unitPrice_extraInitializers);
            __esDecorate(null, null, _enabled_decorators, { kind: "field", name: "enabled", static: false, private: false, access: { has: function (obj) { return "enabled" in obj; }, get: function (obj) { return obj.enabled; }, set: function (obj, value) { obj.enabled = value; } }, metadata: _metadata }, _enabled_initializers, _enabled_extraInitializers);
            __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: function (obj) { return "status" in obj; }, get: function (obj) { return obj.status; }, set: function (obj, value) { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
            __esDecorate(null, null, _preview_decorators, { kind: "field", name: "preview", static: false, private: false, access: { has: function (obj) { return "preview" in obj; }, get: function (obj) { return obj.preview; }, set: function (obj, value) { obj.preview = value; } }, metadata: _metadata }, _preview_initializers, _preview_extraInitializers);
            __esDecorate(null, null, _startAt_decorators, { kind: "field", name: "startAt", static: false, private: false, access: { has: function (obj) { return "startAt" in obj; }, get: function (obj) { return obj.startAt; }, set: function (obj, value) { obj.startAt = value; } }, metadata: _metadata }, _startAt_initializers, _startAt_extraInitializers);
            __esDecorate(null, null, _endAt_decorators, { kind: "field", name: "endAt", static: false, private: false, access: { has: function (obj) { return "endAt" in obj; }, get: function (obj) { return obj.endAt; }, set: function (obj, value) { obj.endAt = value; } }, metadata: _metadata }, _endAt_initializers, _endAt_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UpdateAdSlotDto = UpdateAdSlotDto;
