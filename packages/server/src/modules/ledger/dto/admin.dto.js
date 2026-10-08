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
exports.ChangelogUpdateDto = exports.ChangelogCreateDto = exports.GenAiImageDto = exports.UpdateLedgerConfigDto = exports.UpdateLedgerAdDto = exports.CreateLedgerAdDto = exports.UpdateLedgerFeedbackDto = exports.PushNotificationDto = exports.GrantMembershipDto = exports.UpdateLedgerUserDto = void 0;
var class_validator_1 = require("class-validator");
var UpdateLedgerUserDto = function () {
    var _a;
    var _nickname_decorators;
    var _nickname_initializers = [];
    var _nickname_extraInitializers = [];
    var _status_decorators;
    var _status_initializers = [];
    var _status_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpdateLedgerUserDto() {
                this.nickname = __runInitializers(this, _nickname_initializers, void 0);
                this.status = (__runInitializers(this, _nickname_extraInitializers), __runInitializers(this, _status_initializers, void 0)); // active / disabled
                __runInitializers(this, _status_extraInitializers);
            }
            return UpdateLedgerUserDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _nickname_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(20)];
            _status_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _nickname_decorators, { kind: "field", name: "nickname", static: false, private: false, access: { has: function (obj) { return "nickname" in obj; }, get: function (obj) { return obj.nickname; }, set: function (obj, value) { obj.nickname = value; } }, metadata: _metadata }, _nickname_initializers, _nickname_extraInitializers);
            __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: function (obj) { return "status" in obj; }, get: function (obj) { return obj.status; }, set: function (obj, value) { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UpdateLedgerUserDto = UpdateLedgerUserDto;
/**
 * 增加会员时长。planKey 与 days 二选一（同传则 days 优先）：
 * - planKey 从后台动态套餐配置中取值（永久套餐按 perpetual 字段判定）
 * - days 自定义天数（可正可负；负数=扣减/纠错）
 */
var GrantMembershipDto = function () {
    var _a;
    var _planKey_decorators;
    var _planKey_initializers = [];
    var _planKey_extraInitializers = [];
    var _days_decorators;
    var _days_initializers = [];
    var _days_extraInitializers = [];
    var _note_decorators;
    var _note_initializers = [];
    var _note_extraInitializers = [];
    return _a = /** @class */ (function () {
            function GrantMembershipDto() {
                this.planKey = __runInitializers(this, _planKey_initializers, void 0);
                this.days = (__runInitializers(this, _planKey_extraInitializers), __runInitializers(this, _days_initializers, void 0));
                this.note = (__runInitializers(this, _days_extraInitializers), __runInitializers(this, _note_initializers, void 0));
                __runInitializers(this, _note_extraInitializers);
            }
            return GrantMembershipDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _planKey_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _days_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(-3650), (0, class_validator_1.Max)(3650)];
            _note_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _planKey_decorators, { kind: "field", name: "planKey", static: false, private: false, access: { has: function (obj) { return "planKey" in obj; }, get: function (obj) { return obj.planKey; }, set: function (obj, value) { obj.planKey = value; } }, metadata: _metadata }, _planKey_initializers, _planKey_extraInitializers);
            __esDecorate(null, null, _days_decorators, { kind: "field", name: "days", static: false, private: false, access: { has: function (obj) { return "days" in obj; }, get: function (obj) { return obj.days; }, set: function (obj, value) { obj.days = value; } }, metadata: _metadata }, _days_initializers, _days_extraInitializers);
            __esDecorate(null, null, _note_decorators, { kind: "field", name: "note", static: false, private: false, access: { has: function (obj) { return "note" in obj; }, get: function (obj) { return obj.note; }, set: function (obj, value) { obj.note = value; } }, metadata: _metadata }, _note_initializers, _note_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.GrantMembershipDto = GrantMembershipDto;
/** 后台向某记账账号推送一条应用内通知。 */
var PushNotificationDto = function () {
    var _a;
    var _title_decorators;
    var _title_initializers = [];
    var _title_extraInitializers = [];
    var _body_decorators;
    var _body_initializers = [];
    var _body_extraInitializers = [];
    var _type_decorators;
    var _type_initializers = [];
    var _type_extraInitializers = [];
    return _a = /** @class */ (function () {
            function PushNotificationDto() {
                this.title = __runInitializers(this, _title_initializers, void 0);
                this.body = (__runInitializers(this, _title_extraInitializers), __runInitializers(this, _body_initializers, void 0));
                this.type = (__runInitializers(this, _body_extraInitializers), __runInitializers(this, _type_initializers, void 0));
                __runInitializers(this, _type_extraInitializers);
            }
            return PushNotificationDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _title_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsNotEmpty)({ message: '请填写标题' }), (0, class_validator_1.MaxLength)(40)];
            _body_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsNotEmpty)({ message: '请填写内容' }), (0, class_validator_1.MaxLength)(500)];
            _type_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(20)];
            __esDecorate(null, null, _title_decorators, { kind: "field", name: "title", static: false, private: false, access: { has: function (obj) { return "title" in obj; }, get: function (obj) { return obj.title; }, set: function (obj, value) { obj.title = value; } }, metadata: _metadata }, _title_initializers, _title_extraInitializers);
            __esDecorate(null, null, _body_decorators, { kind: "field", name: "body", static: false, private: false, access: { has: function (obj) { return "body" in obj; }, get: function (obj) { return obj.body; }, set: function (obj, value) { obj.body = value; } }, metadata: _metadata }, _body_initializers, _body_extraInitializers);
            __esDecorate(null, null, _type_decorators, { kind: "field", name: "type", static: false, private: false, access: { has: function (obj) { return "type" in obj; }, get: function (obj) { return obj.type; }, set: function (obj, value) { obj.type = value; } }, metadata: _metadata }, _type_initializers, _type_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.PushNotificationDto = PushNotificationDto;
/** 后台处理反馈：标记状态 / 填写回复备注。 */
var UpdateLedgerFeedbackDto = function () {
    var _a;
    var _status_decorators;
    var _status_initializers = [];
    var _status_extraInitializers = [];
    var _reply_decorators;
    var _reply_initializers = [];
    var _reply_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpdateLedgerFeedbackDto() {
                this.status = __runInitializers(this, _status_initializers, void 0);
                this.reply = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _reply_initializers, void 0));
                __runInitializers(this, _reply_extraInitializers);
            }
            return UpdateLedgerFeedbackDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _status_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsIn)(['open', 'resolved'])];
            _reply_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(500)];
            __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: function (obj) { return "status" in obj; }, get: function (obj) { return obj.status; }, set: function (obj, value) { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
            __esDecorate(null, null, _reply_decorators, { kind: "field", name: "reply", static: false, private: false, access: { has: function (obj) { return "reply" in obj; }, get: function (obj) { return obj.reply; }, set: function (obj, value) { obj.reply = value; } }, metadata: _metadata }, _reply_initializers, _reply_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UpdateLedgerFeedbackDto = UpdateLedgerFeedbackDto;
/** 首页广告 banner（#2）。image 为公网图片 URL。 */
var CreateLedgerAdDto = function () {
    var _a;
    var _image_decorators;
    var _image_initializers = [];
    var _image_extraInitializers = [];
    var _title_decorators;
    var _title_initializers = [];
    var _title_extraInitializers = [];
    var _link_decorators;
    var _link_initializers = [];
    var _link_extraInitializers = [];
    var _sort_decorators;
    var _sort_initializers = [];
    var _sort_extraInitializers = [];
    var _enabled_decorators;
    var _enabled_initializers = [];
    var _enabled_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateLedgerAdDto() {
                this.image = __runInitializers(this, _image_initializers, void 0);
                this.title = (__runInitializers(this, _image_extraInitializers), __runInitializers(this, _title_initializers, void 0));
                this.link = (__runInitializers(this, _title_extraInitializers), __runInitializers(this, _link_initializers, void 0));
                this.sort = (__runInitializers(this, _link_extraInitializers), __runInitializers(this, _sort_initializers, void 0));
                this.enabled = (__runInitializers(this, _sort_extraInitializers), __runInitializers(this, _enabled_initializers, void 0));
                __runInitializers(this, _enabled_extraInitializers);
            }
            return CreateLedgerAdDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _image_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsNotEmpty)({ message: '请填写图片地址' }), (0, class_validator_1.MaxLength)(500)];
            _title_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(40)];
            _link_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(500)];
            _sort_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(9999)];
            _enabled_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)()];
            __esDecorate(null, null, _image_decorators, { kind: "field", name: "image", static: false, private: false, access: { has: function (obj) { return "image" in obj; }, get: function (obj) { return obj.image; }, set: function (obj, value) { obj.image = value; } }, metadata: _metadata }, _image_initializers, _image_extraInitializers);
            __esDecorate(null, null, _title_decorators, { kind: "field", name: "title", static: false, private: false, access: { has: function (obj) { return "title" in obj; }, get: function (obj) { return obj.title; }, set: function (obj, value) { obj.title = value; } }, metadata: _metadata }, _title_initializers, _title_extraInitializers);
            __esDecorate(null, null, _link_decorators, { kind: "field", name: "link", static: false, private: false, access: { has: function (obj) { return "link" in obj; }, get: function (obj) { return obj.link; }, set: function (obj, value) { obj.link = value; } }, metadata: _metadata }, _link_initializers, _link_extraInitializers);
            __esDecorate(null, null, _sort_decorators, { kind: "field", name: "sort", static: false, private: false, access: { has: function (obj) { return "sort" in obj; }, get: function (obj) { return obj.sort; }, set: function (obj, value) { obj.sort = value; } }, metadata: _metadata }, _sort_initializers, _sort_extraInitializers);
            __esDecorate(null, null, _enabled_decorators, { kind: "field", name: "enabled", static: false, private: false, access: { has: function (obj) { return "enabled" in obj; }, get: function (obj) { return obj.enabled; }, set: function (obj, value) { obj.enabled = value; } }, metadata: _metadata }, _enabled_initializers, _enabled_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreateLedgerAdDto = CreateLedgerAdDto;
var UpdateLedgerAdDto = function () {
    var _a;
    var _image_decorators;
    var _image_initializers = [];
    var _image_extraInitializers = [];
    var _title_decorators;
    var _title_initializers = [];
    var _title_extraInitializers = [];
    var _link_decorators;
    var _link_initializers = [];
    var _link_extraInitializers = [];
    var _sort_decorators;
    var _sort_initializers = [];
    var _sort_extraInitializers = [];
    var _enabled_decorators;
    var _enabled_initializers = [];
    var _enabled_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpdateLedgerAdDto() {
                this.image = __runInitializers(this, _image_initializers, void 0);
                this.title = (__runInitializers(this, _image_extraInitializers), __runInitializers(this, _title_initializers, void 0));
                this.link = (__runInitializers(this, _title_extraInitializers), __runInitializers(this, _link_initializers, void 0));
                this.sort = (__runInitializers(this, _link_extraInitializers), __runInitializers(this, _sort_initializers, void 0));
                this.enabled = (__runInitializers(this, _sort_extraInitializers), __runInitializers(this, _enabled_initializers, void 0));
                __runInitializers(this, _enabled_extraInitializers);
            }
            return UpdateLedgerAdDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _image_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(500)];
            _title_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(40)];
            _link_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(500)];
            _sort_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(9999)];
            _enabled_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)()];
            __esDecorate(null, null, _image_decorators, { kind: "field", name: "image", static: false, private: false, access: { has: function (obj) { return "image" in obj; }, get: function (obj) { return obj.image; }, set: function (obj, value) { obj.image = value; } }, metadata: _metadata }, _image_initializers, _image_extraInitializers);
            __esDecorate(null, null, _title_decorators, { kind: "field", name: "title", static: false, private: false, access: { has: function (obj) { return "title" in obj; }, get: function (obj) { return obj.title; }, set: function (obj, value) { obj.title = value; } }, metadata: _metadata }, _title_initializers, _title_extraInitializers);
            __esDecorate(null, null, _link_decorators, { kind: "field", name: "link", static: false, private: false, access: { has: function (obj) { return "link" in obj; }, get: function (obj) { return obj.link; }, set: function (obj, value) { obj.link = value; } }, metadata: _metadata }, _link_initializers, _link_extraInitializers);
            __esDecorate(null, null, _sort_decorators, { kind: "field", name: "sort", static: false, private: false, access: { has: function (obj) { return "sort" in obj; }, get: function (obj) { return obj.sort; }, set: function (obj, value) { obj.sort = value; } }, metadata: _metadata }, _sort_initializers, _sort_extraInitializers);
            __esDecorate(null, null, _enabled_decorators, { kind: "field", name: "enabled", static: false, private: false, access: { has: function (obj) { return "enabled" in obj; }, get: function (obj) { return obj.enabled; }, set: function (obj, value) { obj.enabled = value; } }, metadata: _metadata }, _enabled_initializers, _enabled_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UpdateLedgerAdDto = UpdateLedgerAdDto;
/** ledger 全局功能配置（微信邀请奖励 / 会员套餐）。 */
var UpdateLedgerConfigDto = function () {
    var _a;
    var _metal_decorators;
    var _metal_initializers = [];
    var _metal_extraInitializers = [];
    var _inviteRewardDays_decorators;
    var _inviteRewardDays_initializers = [];
    var _inviteRewardDays_extraInitializers = [];
    var _inviteMaxRewarded_decorators;
    var _inviteMaxRewarded_initializers = [];
    var _inviteMaxRewarded_extraInitializers = [];
    var _plans_decorators;
    var _plans_initializers = [];
    var _plans_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpdateLedgerConfigDto() {
                this.metal = __runInitializers(this, _metal_initializers, void 0);
                this.inviteRewardDays = (__runInitializers(this, _metal_extraInitializers), __runInitializers(this, _inviteRewardDays_initializers, void 0));
                this.inviteMaxRewarded = (__runInitializers(this, _inviteRewardDays_extraInitializers), __runInitializers(this, _inviteMaxRewarded_initializers, void 0));
                // 会员套餐数组；服务端 normalizeLedgerPlans 逐项收口 + 去重
                this.plans = (__runInitializers(this, _inviteMaxRewarded_extraInitializers), __runInitializers(this, _plans_initializers, void 0));
                __runInitializers(this, _plans_extraInitializers);
            }
            return UpdateLedgerConfigDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _metal_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsObject)()];
            _inviteRewardDays_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(3650)];
            _inviteMaxRewarded_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(100000)];
            _plans_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsArray)()];
            __esDecorate(null, null, _metal_decorators, { kind: "field", name: "metal", static: false, private: false, access: { has: function (obj) { return "metal" in obj; }, get: function (obj) { return obj.metal; }, set: function (obj, value) { obj.metal = value; } }, metadata: _metadata }, _metal_initializers, _metal_extraInitializers);
            __esDecorate(null, null, _inviteRewardDays_decorators, { kind: "field", name: "inviteRewardDays", static: false, private: false, access: { has: function (obj) { return "inviteRewardDays" in obj; }, get: function (obj) { return obj.inviteRewardDays; }, set: function (obj, value) { obj.inviteRewardDays = value; } }, metadata: _metadata }, _inviteRewardDays_initializers, _inviteRewardDays_extraInitializers);
            __esDecorate(null, null, _inviteMaxRewarded_decorators, { kind: "field", name: "inviteMaxRewarded", static: false, private: false, access: { has: function (obj) { return "inviteMaxRewarded" in obj; }, get: function (obj) { return obj.inviteMaxRewarded; }, set: function (obj, value) { obj.inviteMaxRewarded = value; } }, metadata: _metadata }, _inviteMaxRewarded_initializers, _inviteMaxRewarded_extraInitializers);
            __esDecorate(null, null, _plans_decorators, { kind: "field", name: "plans", static: false, private: false, access: { has: function (obj) { return "plans" in obj; }, get: function (obj) { return obj.plans; }, set: function (obj, value) { obj.plans = value; } }, metadata: _metadata }, _plans_initializers, _plans_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UpdateLedgerConfigDto = UpdateLedgerConfigDto;
/** 后台 AI 生图（gpt-image-2）。size/quality 见聚鑫科技文档枚举。 */
var GenAiImageDto = function () {
    var _a;
    var _prompt_decorators;
    var _prompt_initializers = [];
    var _prompt_extraInitializers = [];
    var _size_decorators;
    var _size_initializers = [];
    var _size_extraInitializers = [];
    var _quality_decorators;
    var _quality_initializers = [];
    var _quality_extraInitializers = [];
    return _a = /** @class */ (function () {
            function GenAiImageDto() {
                this.prompt = __runInitializers(this, _prompt_initializers, void 0);
                this.size = (__runInitializers(this, _prompt_extraInitializers), __runInitializers(this, _size_initializers, void 0));
                this.quality = (__runInitializers(this, _size_extraInitializers), __runInitializers(this, _quality_initializers, void 0));
                __runInitializers(this, _quality_extraInitializers);
            }
            return GenAiImageDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _prompt_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsNotEmpty)({ message: '请填写提示词' }), (0, class_validator_1.MaxLength)(2000)];
            _size_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsIn)([
                    'auto',
                    '1024x1024',
                    '1536x1024',
                    '1024x1536',
                    '1920x1088',
                    '1088x1920',
                    '1280x960',
                    '960x1280',
                    '2048x2048',
                ])];
            _quality_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsIn)(['auto', 'high', 'medium', 'low'])];
            __esDecorate(null, null, _prompt_decorators, { kind: "field", name: "prompt", static: false, private: false, access: { has: function (obj) { return "prompt" in obj; }, get: function (obj) { return obj.prompt; }, set: function (obj, value) { obj.prompt = value; } }, metadata: _metadata }, _prompt_initializers, _prompt_extraInitializers);
            __esDecorate(null, null, _size_decorators, { kind: "field", name: "size", static: false, private: false, access: { has: function (obj) { return "size" in obj; }, get: function (obj) { return obj.size; }, set: function (obj, value) { obj.size = value; } }, metadata: _metadata }, _size_initializers, _size_extraInitializers);
            __esDecorate(null, null, _quality_decorators, { kind: "field", name: "quality", static: false, private: false, access: { has: function (obj) { return "quality" in obj; }, get: function (obj) { return obj.quality; }, set: function (obj, value) { obj.quality = value; } }, metadata: _metadata }, _quality_initializers, _quality_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.GenAiImageDto = GenAiImageDto;
/** 后台·更新日志新增 */
var ChangelogCreateDto = function () {
    var _a;
    var _version_decorators;
    var _version_initializers = [];
    var _version_extraInitializers = [];
    var _title_decorators;
    var _title_initializers = [];
    var _title_extraInitializers = [];
    var _content_decorators;
    var _content_initializers = [];
    var _content_extraInitializers = [];
    var _published_decorators;
    var _published_initializers = [];
    var _published_extraInitializers = [];
    return _a = /** @class */ (function () {
            function ChangelogCreateDto() {
                this.version = __runInitializers(this, _version_initializers, void 0);
                this.title = (__runInitializers(this, _version_extraInitializers), __runInitializers(this, _title_initializers, void 0));
                this.content = (__runInitializers(this, _title_extraInitializers), __runInitializers(this, _content_initializers, void 0));
                this.published = (__runInitializers(this, _content_extraInitializers), __runInitializers(this, _published_initializers, void 0));
                __runInitializers(this, _published_extraInitializers);
            }
            return ChangelogCreateDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _version_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsNotEmpty)({ message: '请填写版本号' }), (0, class_validator_1.MaxLength)(20)];
            _title_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsNotEmpty)({ message: '请填写标题' }), (0, class_validator_1.MaxLength)(60)];
            _content_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(4000)];
            _published_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)()];
            __esDecorate(null, null, _version_decorators, { kind: "field", name: "version", static: false, private: false, access: { has: function (obj) { return "version" in obj; }, get: function (obj) { return obj.version; }, set: function (obj, value) { obj.version = value; } }, metadata: _metadata }, _version_initializers, _version_extraInitializers);
            __esDecorate(null, null, _title_decorators, { kind: "field", name: "title", static: false, private: false, access: { has: function (obj) { return "title" in obj; }, get: function (obj) { return obj.title; }, set: function (obj, value) { obj.title = value; } }, metadata: _metadata }, _title_initializers, _title_extraInitializers);
            __esDecorate(null, null, _content_decorators, { kind: "field", name: "content", static: false, private: false, access: { has: function (obj) { return "content" in obj; }, get: function (obj) { return obj.content; }, set: function (obj, value) { obj.content = value; } }, metadata: _metadata }, _content_initializers, _content_extraInitializers);
            __esDecorate(null, null, _published_decorators, { kind: "field", name: "published", static: false, private: false, access: { has: function (obj) { return "published" in obj; }, get: function (obj) { return obj.published; }, set: function (obj, value) { obj.published = value; } }, metadata: _metadata }, _published_initializers, _published_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.ChangelogCreateDto = ChangelogCreateDto;
/** 后台·更新日志编辑 */
var ChangelogUpdateDto = function () {
    var _a;
    var _version_decorators;
    var _version_initializers = [];
    var _version_extraInitializers = [];
    var _title_decorators;
    var _title_initializers = [];
    var _title_extraInitializers = [];
    var _content_decorators;
    var _content_initializers = [];
    var _content_extraInitializers = [];
    var _published_decorators;
    var _published_initializers = [];
    var _published_extraInitializers = [];
    return _a = /** @class */ (function () {
            function ChangelogUpdateDto() {
                this.version = __runInitializers(this, _version_initializers, void 0);
                this.title = (__runInitializers(this, _version_extraInitializers), __runInitializers(this, _title_initializers, void 0));
                this.content = (__runInitializers(this, _title_extraInitializers), __runInitializers(this, _content_initializers, void 0));
                this.published = (__runInitializers(this, _content_extraInitializers), __runInitializers(this, _published_initializers, void 0));
                __runInitializers(this, _published_extraInitializers);
            }
            return ChangelogUpdateDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _version_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(20)];
            _title_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(60)];
            _content_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(4000)];
            _published_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)()];
            __esDecorate(null, null, _version_decorators, { kind: "field", name: "version", static: false, private: false, access: { has: function (obj) { return "version" in obj; }, get: function (obj) { return obj.version; }, set: function (obj, value) { obj.version = value; } }, metadata: _metadata }, _version_initializers, _version_extraInitializers);
            __esDecorate(null, null, _title_decorators, { kind: "field", name: "title", static: false, private: false, access: { has: function (obj) { return "title" in obj; }, get: function (obj) { return obj.title; }, set: function (obj, value) { obj.title = value; } }, metadata: _metadata }, _title_initializers, _title_extraInitializers);
            __esDecorate(null, null, _content_decorators, { kind: "field", name: "content", static: false, private: false, access: { has: function (obj) { return "content" in obj; }, get: function (obj) { return obj.content; }, set: function (obj, value) { obj.content = value; } }, metadata: _metadata }, _content_initializers, _content_extraInitializers);
            __esDecorate(null, null, _published_decorators, { kind: "field", name: "published", static: false, private: false, access: { has: function (obj) { return "published" in obj; }, get: function (obj) { return obj.published; }, set: function (obj, value) { obj.published = value; } }, metadata: _metadata }, _published_initializers, _published_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.ChangelogUpdateDto = ChangelogUpdateDto;
