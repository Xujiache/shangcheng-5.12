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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkbookController = void 0;
var common_1 = require("@nestjs/common");
var platform_express_1 = require("@nestjs/platform-express");
var class_validator_1 = require("class-validator");
var public_decorator_1 = require("../../../common/decorators/public.decorator");
var skip_response_decorator_1 = require("../../../common/decorators/skip-response.decorator");
var ledger_jwt_guard_1 = require("../guards/ledger-jwt.guard");
var ledger_membership_guard_1 = require("../guards/ledger-membership.guard");
var SyncDto = function () {
    var _a;
    var _operation_decorators;
    var _operation_initializers = [];
    var _operation_extraInitializers = [];
    return _a = /** @class */ (function () {
            function SyncDto() {
                this.operation = __runInitializers(this, _operation_initializers, void 0);
                __runInitializers(this, _operation_extraInitializers);
            }
            return SyncDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _operation_decorators = [(0, class_validator_1.IsObject)()];
            __esDecorate(null, null, _operation_decorators, { kind: "field", name: "operation", static: false, private: false, access: { has: function (obj) { return "operation" in obj; }, get: function (obj) { return obj.operation; }, set: function (obj, value) { obj.operation = value; } }, metadata: _metadata }, _operation_initializers, _operation_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
var WorkbookController = function () {
    var _classDecorators = [(0, public_decorator_1.Public)(), (0, common_1.UseGuards)(ledger_jwt_guard_1.LedgerJwtGuard), (0, common_1.Controller)('l/workbook')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _access_decorators;
    var _snapshot_decorators;
    var _changes_decorators;
    var _sync_decorators;
    var _upload_decorators;
    var _download_decorators;
    var WorkbookController = _classThis = /** @class */ (function () {
        function WorkbookController_1(svc) {
            this.svc = (__runInitializers(this, _instanceExtraInitializers), svc);
        }
        WorkbookController_1.prototype.access = function (u) {
            var _a;
            return { canRead: true, canWrite: !!((_a = u.membership) === null || _a === void 0 ? void 0 : _a.active) };
        };
        WorkbookController_1.prototype.snapshot = function (u) {
            return this.svc.snapshot(u.id);
        };
        WorkbookController_1.prototype.changes = function (u, cursor) {
            return this.svc.changes(u.id, Math.max(0, Math.min(2147483647, Number(cursor) || 0)));
        };
        WorkbookController_1.prototype.sync = function (u, dto) {
            return this.svc.sync(u.id, dto.operation);
        };
        WorkbookController_1.prototype.upload = function (u, id, file) {
            return this.svc.upload(u.id, id, file);
        };
        WorkbookController_1.prototype.download = function (u, id, res) {
            return __awaiter(this, void 0, void 0, function () {
                var a;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.attachment(u.id, id)];
                        case 1:
                            a = _a.sent();
                            res.setHeader('Content-Type', a.mime);
                            res.setHeader('Cache-Control', 'private, no-store');
                            res.setHeader('X-Content-Type-Options', 'nosniff');
                            res.setHeader('Content-Disposition', 'attachment; filename="proof"');
                            res.status(200).send(Buffer.from(a.content));
                            return [2 /*return*/];
                    }
                });
            });
        };
        return WorkbookController_1;
    }());
    __setFunctionName(_classThis, "WorkbookController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _access_decorators = [(0, common_1.Get)('access')];
        _snapshot_decorators = [(0, common_1.Get)('snapshot')];
        _changes_decorators = [(0, common_1.Get)('changes')];
        _sync_decorators = [(0, common_1.Post)('sync'), (0, common_1.HttpCode)(200), (0, common_1.UseGuards)(ledger_membership_guard_1.LedgerMembershipGuard)];
        _upload_decorators = [(0, common_1.Post)('attachments/:id'), (0, common_1.HttpCode)(200), (0, common_1.UseGuards)(ledger_membership_guard_1.LedgerMembershipGuard), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))];
        _download_decorators = [(0, common_1.Get)('attachments/:id'), (0, skip_response_decorator_1.SkipResponseWrap)()];
        __esDecorate(_classThis, null, _access_decorators, { kind: "method", name: "access", static: false, private: false, access: { has: function (obj) { return "access" in obj; }, get: function (obj) { return obj.access; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _snapshot_decorators, { kind: "method", name: "snapshot", static: false, private: false, access: { has: function (obj) { return "snapshot" in obj; }, get: function (obj) { return obj.snapshot; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _changes_decorators, { kind: "method", name: "changes", static: false, private: false, access: { has: function (obj) { return "changes" in obj; }, get: function (obj) { return obj.changes; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _sync_decorators, { kind: "method", name: "sync", static: false, private: false, access: { has: function (obj) { return "sync" in obj; }, get: function (obj) { return obj.sync; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _upload_decorators, { kind: "method", name: "upload", static: false, private: false, access: { has: function (obj) { return "upload" in obj; }, get: function (obj) { return obj.upload; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _download_decorators, { kind: "method", name: "download", static: false, private: false, access: { has: function (obj) { return "download" in obj; }, get: function (obj) { return obj.download; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WorkbookController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WorkbookController = _classThis;
}();
exports.WorkbookController = WorkbookController;
