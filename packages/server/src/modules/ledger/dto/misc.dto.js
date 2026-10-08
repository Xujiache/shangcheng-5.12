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
exports.CreateLedgerPayDto = exports.ImportDataDto = exports.ExportDataDto = exports.CreateLedgerFeedbackDto = exports.UpdateLedgerSettingDto = exports.UpdateLedgerProfileDto = exports.UpdateLedgerGoalDto = void 0;
var class_validator_1 = require("class-validator");
var MONEY_MAX = 1000000000000;
var UpdateLedgerGoalDto = function () {
    var _a;
    var _monthly_decorators;
    var _monthly_initializers = [];
    var _monthly_extraInitializers = [];
    var _yearly_decorators;
    var _yearly_initializers = [];
    var _yearly_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpdateLedgerGoalDto() {
                this.monthly = __runInitializers(this, _monthly_initializers, void 0);
                this.yearly = (__runInitializers(this, _monthly_extraInitializers), __runInitializers(this, _yearly_initializers, void 0));
                __runInitializers(this, _yearly_extraInitializers);
            }
            return UpdateLedgerGoalDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _monthly_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(MONEY_MAX)];
            _yearly_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(MONEY_MAX)];
            __esDecorate(null, null, _monthly_decorators, { kind: "field", name: "monthly", static: false, private: false, access: { has: function (obj) { return "monthly" in obj; }, get: function (obj) { return obj.monthly; }, set: function (obj, value) { obj.monthly = value; } }, metadata: _metadata }, _monthly_initializers, _monthly_extraInitializers);
            __esDecorate(null, null, _yearly_decorators, { kind: "field", name: "yearly", static: false, private: false, access: { has: function (obj) { return "yearly" in obj; }, get: function (obj) { return obj.yearly; }, set: function (obj, value) { obj.yearly = value; } }, metadata: _metadata }, _yearly_initializers, _yearly_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UpdateLedgerGoalDto = UpdateLedgerGoalDto;
var UpdateLedgerProfileDto = function () {
    var _a;
    var _nickname_decorators;
    var _nickname_initializers = [];
    var _nickname_extraInitializers = [];
    var _avatarMode_decorators;
    var _avatarMode_initializers = [];
    var _avatarMode_extraInitializers = [];
    var _avatarHue_decorators;
    var _avatarHue_initializers = [];
    var _avatarHue_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpdateLedgerProfileDto() {
                this.nickname = __runInitializers(this, _nickname_initializers, void 0);
                this.avatarMode = (__runInitializers(this, _nickname_extraInitializers), __runInitializers(this, _avatarMode_initializers, void 0));
                this.avatarHue = (__runInitializers(this, _avatarMode_extraInitializers), __runInitializers(this, _avatarHue_initializers, void 0));
                __runInitializers(this, _avatarHue_extraInitializers);
            }
            return UpdateLedgerProfileDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _nickname_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(20)];
            _avatarMode_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsIn)(['keep', 'letter'])];
            _avatarHue_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsIn)(['teal', 'blue', 'gold', 'rust', 'olive', 'violet'])];
            __esDecorate(null, null, _nickname_decorators, { kind: "field", name: "nickname", static: false, private: false, access: { has: function (obj) { return "nickname" in obj; }, get: function (obj) { return obj.nickname; }, set: function (obj, value) { obj.nickname = value; } }, metadata: _metadata }, _nickname_initializers, _nickname_extraInitializers);
            __esDecorate(null, null, _avatarMode_decorators, { kind: "field", name: "avatarMode", static: false, private: false, access: { has: function (obj) { return "avatarMode" in obj; }, get: function (obj) { return obj.avatarMode; }, set: function (obj, value) { obj.avatarMode = value; } }, metadata: _metadata }, _avatarMode_initializers, _avatarMode_extraInitializers);
            __esDecorate(null, null, _avatarHue_decorators, { kind: "field", name: "avatarHue", static: false, private: false, access: { has: function (obj) { return "avatarHue" in obj; }, get: function (obj) { return obj.avatarHue; }, set: function (obj, value) { obj.avatarHue = value; } }, metadata: _metadata }, _avatarHue_initializers, _avatarHue_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UpdateLedgerProfileDto = UpdateLedgerProfileDto;
var HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
/** 偏好设置（通知开关 / 免打扰 / 隐私），全部可选，仅更新传入字段。 */
var UpdateLedgerSettingDto = function () {
    var _a;
    var _notifyOrder_decorators;
    var _notifyOrder_initializers = [];
    var _notifyOrder_extraInitializers = [];
    var _notifyReport_decorators;
    var _notifyReport_initializers = [];
    var _notifyReport_extraInitializers = [];
    var _notifyGoal_decorators;
    var _notifyGoal_initializers = [];
    var _notifyGoal_extraInitializers = [];
    var _notifySystem_decorators;
    var _notifySystem_initializers = [];
    var _notifySystem_extraInitializers = [];
    var _dndEnabled_decorators;
    var _dndEnabled_initializers = [];
    var _dndEnabled_extraInitializers = [];
    var _dndStart_decorators;
    var _dndStart_initializers = [];
    var _dndStart_extraInitializers = [];
    var _dndEnd_decorators;
    var _dndEnd_initializers = [];
    var _dndEnd_extraInitializers = [];
    var _hideAmount_decorators;
    var _hideAmount_initializers = [];
    var _hideAmount_extraInitializers = [];
    var _bioLock_decorators;
    var _bioLock_initializers = [];
    var _bioLock_extraInitializers = [];
    var _encBackup_decorators;
    var _encBackup_initializers = [];
    var _encBackup_extraInitializers = [];
    var _costCategories_decorators;
    var _costCategories_initializers = [];
    var _costCategories_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpdateLedgerSettingDto() {
                this.notifyOrder = __runInitializers(this, _notifyOrder_initializers, void 0);
                this.notifyReport = (__runInitializers(this, _notifyOrder_extraInitializers), __runInitializers(this, _notifyReport_initializers, void 0));
                this.notifyGoal = (__runInitializers(this, _notifyReport_extraInitializers), __runInitializers(this, _notifyGoal_initializers, void 0));
                this.notifySystem = (__runInitializers(this, _notifyGoal_extraInitializers), __runInitializers(this, _notifySystem_initializers, void 0));
                this.dndEnabled = (__runInitializers(this, _notifySystem_extraInitializers), __runInitializers(this, _dndEnabled_initializers, void 0));
                this.dndStart = (__runInitializers(this, _dndEnabled_extraInitializers), __runInitializers(this, _dndStart_initializers, void 0));
                this.dndEnd = (__runInitializers(this, _dndStart_extraInitializers), __runInitializers(this, _dndEnd_initializers, void 0));
                this.hideAmount = (__runInitializers(this, _dndEnd_extraInitializers), __runInitializers(this, _hideAmount_initializers, void 0));
                this.bioLock = (__runInitializers(this, _hideAmount_extraInitializers), __runInitializers(this, _bioLock_initializers, void 0));
                this.encBackup = (__runInitializers(this, _bioLock_extraInitializers), __runInitializers(this, _encBackup_initializers, void 0));
                this.costCategories = (__runInitializers(this, _encBackup_extraInitializers), __runInitializers(this, _costCategories_initializers, void 0));
                __runInitializers(this, _costCategories_extraInitializers);
            }
            return UpdateLedgerSettingDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _notifyOrder_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)()];
            _notifyReport_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)()];
            _notifyGoal_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)()];
            _notifySystem_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)()];
            _dndEnabled_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)()];
            _dndStart_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.Matches)(HHMM, { message: 'dndStart 需为 HH:mm' })];
            _dndEnd_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.Matches)(HHMM, { message: 'dndEnd 需为 HH:mm' })];
            _hideAmount_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)()];
            _bioLock_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)()];
            _encBackup_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)()];
            _costCategories_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsArray)(), (0, class_validator_1.ArrayMaxSize)(20)];
            __esDecorate(null, null, _notifyOrder_decorators, { kind: "field", name: "notifyOrder", static: false, private: false, access: { has: function (obj) { return "notifyOrder" in obj; }, get: function (obj) { return obj.notifyOrder; }, set: function (obj, value) { obj.notifyOrder = value; } }, metadata: _metadata }, _notifyOrder_initializers, _notifyOrder_extraInitializers);
            __esDecorate(null, null, _notifyReport_decorators, { kind: "field", name: "notifyReport", static: false, private: false, access: { has: function (obj) { return "notifyReport" in obj; }, get: function (obj) { return obj.notifyReport; }, set: function (obj, value) { obj.notifyReport = value; } }, metadata: _metadata }, _notifyReport_initializers, _notifyReport_extraInitializers);
            __esDecorate(null, null, _notifyGoal_decorators, { kind: "field", name: "notifyGoal", static: false, private: false, access: { has: function (obj) { return "notifyGoal" in obj; }, get: function (obj) { return obj.notifyGoal; }, set: function (obj, value) { obj.notifyGoal = value; } }, metadata: _metadata }, _notifyGoal_initializers, _notifyGoal_extraInitializers);
            __esDecorate(null, null, _notifySystem_decorators, { kind: "field", name: "notifySystem", static: false, private: false, access: { has: function (obj) { return "notifySystem" in obj; }, get: function (obj) { return obj.notifySystem; }, set: function (obj, value) { obj.notifySystem = value; } }, metadata: _metadata }, _notifySystem_initializers, _notifySystem_extraInitializers);
            __esDecorate(null, null, _dndEnabled_decorators, { kind: "field", name: "dndEnabled", static: false, private: false, access: { has: function (obj) { return "dndEnabled" in obj; }, get: function (obj) { return obj.dndEnabled; }, set: function (obj, value) { obj.dndEnabled = value; } }, metadata: _metadata }, _dndEnabled_initializers, _dndEnabled_extraInitializers);
            __esDecorate(null, null, _dndStart_decorators, { kind: "field", name: "dndStart", static: false, private: false, access: { has: function (obj) { return "dndStart" in obj; }, get: function (obj) { return obj.dndStart; }, set: function (obj, value) { obj.dndStart = value; } }, metadata: _metadata }, _dndStart_initializers, _dndStart_extraInitializers);
            __esDecorate(null, null, _dndEnd_decorators, { kind: "field", name: "dndEnd", static: false, private: false, access: { has: function (obj) { return "dndEnd" in obj; }, get: function (obj) { return obj.dndEnd; }, set: function (obj, value) { obj.dndEnd = value; } }, metadata: _metadata }, _dndEnd_initializers, _dndEnd_extraInitializers);
            __esDecorate(null, null, _hideAmount_decorators, { kind: "field", name: "hideAmount", static: false, private: false, access: { has: function (obj) { return "hideAmount" in obj; }, get: function (obj) { return obj.hideAmount; }, set: function (obj, value) { obj.hideAmount = value; } }, metadata: _metadata }, _hideAmount_initializers, _hideAmount_extraInitializers);
            __esDecorate(null, null, _bioLock_decorators, { kind: "field", name: "bioLock", static: false, private: false, access: { has: function (obj) { return "bioLock" in obj; }, get: function (obj) { return obj.bioLock; }, set: function (obj, value) { obj.bioLock = value; } }, metadata: _metadata }, _bioLock_initializers, _bioLock_extraInitializers);
            __esDecorate(null, null, _encBackup_decorators, { kind: "field", name: "encBackup", static: false, private: false, access: { has: function (obj) { return "encBackup" in obj; }, get: function (obj) { return obj.encBackup; }, set: function (obj, value) { obj.encBackup = value; } }, metadata: _metadata }, _encBackup_initializers, _encBackup_extraInitializers);
            __esDecorate(null, null, _costCategories_decorators, { kind: "field", name: "costCategories", static: false, private: false, access: { has: function (obj) { return "costCategories" in obj; }, get: function (obj) { return obj.costCategories; }, set: function (obj, value) { obj.costCategories = value; } }, metadata: _metadata }, _costCategories_initializers, _costCategories_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UpdateLedgerSettingDto = UpdateLedgerSettingDto;
/** 提交意见反馈（含注销申请）。 */
var CreateLedgerFeedbackDto = function () {
    var _a;
    var _content_decorators;
    var _content_initializers = [];
    var _content_extraInitializers = [];
    var _contact_decorators;
    var _contact_initializers = [];
    var _contact_extraInitializers = [];
    var _type_decorators;
    var _type_initializers = [];
    var _type_extraInitializers = [];
    var _images_decorators;
    var _images_initializers = [];
    var _images_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateLedgerFeedbackDto() {
                this.content = __runInitializers(this, _content_initializers, void 0);
                this.contact = (__runInitializers(this, _content_extraInitializers), __runInitializers(this, _contact_initializers, void 0));
                this.type = (__runInitializers(this, _contact_extraInitializers), __runInitializers(this, _type_initializers, void 0));
                this.images = (__runInitializers(this, _type_extraInitializers), __runInitializers(this, _images_initializers, void 0));
                __runInitializers(this, _images_extraInitializers);
            }
            return CreateLedgerFeedbackDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _content_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsNotEmpty)({ message: '请填写反馈内容' }), (0, class_validator_1.MaxLength)(1000)];
            _contact_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(40)];
            _type_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsIn)(['general', 'delete_account'])];
            _images_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsArray)(), (0, class_validator_1.ArrayMaxSize)(9), (0, class_validator_1.IsString)({ each: true }), (0, class_validator_1.MaxLength)(300, { each: true })];
            __esDecorate(null, null, _content_decorators, { kind: "field", name: "content", static: false, private: false, access: { has: function (obj) { return "content" in obj; }, get: function (obj) { return obj.content; }, set: function (obj, value) { obj.content = value; } }, metadata: _metadata }, _content_initializers, _content_extraInitializers);
            __esDecorate(null, null, _contact_decorators, { kind: "field", name: "contact", static: false, private: false, access: { has: function (obj) { return "contact" in obj; }, get: function (obj) { return obj.contact; }, set: function (obj, value) { obj.contact = value; } }, metadata: _metadata }, _contact_initializers, _contact_extraInitializers);
            __esDecorate(null, null, _type_decorators, { kind: "field", name: "type", static: false, private: false, access: { has: function (obj) { return "type" in obj; }, get: function (obj) { return obj.type; }, set: function (obj, value) { obj.type = value; } }, metadata: _metadata }, _type_initializers, _type_extraInitializers);
            __esDecorate(null, null, _images_decorators, { kind: "field", name: "images", static: false, private: false, access: { has: function (obj) { return "images" in obj; }, get: function (obj) { return obj.images; }, set: function (obj, value) { obj.images = value; } }, metadata: _metadata }, _images_initializers, _images_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreateLedgerFeedbackDto = CreateLedgerFeedbackDto;
/** 数据导出：allowShare 决定他人能否导入。 */
var ExportDataDto = function () {
    var _a;
    var _allowShare_decorators;
    var _allowShare_initializers = [];
    var _allowShare_extraInitializers = [];
    return _a = /** @class */ (function () {
            function ExportDataDto() {
                this.allowShare = __runInitializers(this, _allowShare_initializers, void 0);
                __runInitializers(this, _allowShare_extraInitializers);
            }
            return ExportDataDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _allowShare_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)()];
            __esDecorate(null, null, _allowShare_decorators, { kind: "field", name: "allowShare", static: false, private: false, access: { has: function (obj) { return "allowShare" in obj; }, get: function (obj) { return obj.allowShare; }, set: function (obj, value) { obj.allowShare = value; } }, metadata: _metadata }, _allowShare_initializers, _allowShare_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.ExportDataDto = ExportDataDto;
/** 数据导入：pkg 为加密数据包字符串。 */
var ImportDataDto = function () {
    var _a;
    var _pkg_decorators;
    var _pkg_initializers = [];
    var _pkg_extraInitializers = [];
    return _a = /** @class */ (function () {
            function ImportDataDto() {
                this.pkg = __runInitializers(this, _pkg_initializers, void 0);
                __runInitializers(this, _pkg_extraInitializers);
            }
            return ImportDataDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _pkg_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsNotEmpty)({ message: '请粘贴数据包' }), (0, class_validator_1.MaxLength)(5000000)];
            __esDecorate(null, null, _pkg_decorators, { kind: "field", name: "pkg", static: false, private: false, access: { has: function (obj) { return "pkg" in obj; }, get: function (obj) { return obj.pkg; }, set: function (obj, value) { obj.pkg = value; } }, metadata: _metadata }, _pkg_initializers, _pkg_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.ImportDataDto = ImportDataDto;
/** 会员在线支付下单：planKey 必填；code 为 wx.login 临时码。 */
var CreateLedgerPayDto = function () {
    var _a;
    var _planKey_decorators;
    var _planKey_initializers = [];
    var _planKey_extraInitializers = [];
    var _code_decorators;
    var _code_initializers = [];
    var _code_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateLedgerPayDto() {
                this.planKey = __runInitializers(this, _planKey_initializers, void 0);
                this.code = (__runInitializers(this, _planKey_extraInitializers), __runInitializers(this, _code_initializers, void 0));
                __runInitializers(this, _code_extraInitializers);
            }
            return CreateLedgerPayDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _planKey_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsNotEmpty)({ message: '请选择套餐' }), (0, class_validator_1.MaxLength)(20)];
            _code_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(120)];
            __esDecorate(null, null, _planKey_decorators, { kind: "field", name: "planKey", static: false, private: false, access: { has: function (obj) { return "planKey" in obj; }, get: function (obj) { return obj.planKey; }, set: function (obj, value) { obj.planKey = value; } }, metadata: _metadata }, _planKey_initializers, _planKey_extraInitializers);
            __esDecorate(null, null, _code_decorators, { kind: "field", name: "code", static: false, private: false, access: { has: function (obj) { return "code" in obj; }, get: function (obj) { return obj.code; }, set: function (obj, value) { obj.code = value; } }, metadata: _metadata }, _code_initializers, _code_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreateLedgerPayDto = CreateLedgerPayDto;
