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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerMembershipGuard = void 0;
var common_1 = require("@nestjs/common");
var biz_exception_1 = require("../../../common/exceptions/biz.exception");
/**
 * 会员闸门守卫（仅业务接口用，me/membership/profile 不挂）。
 *
 * 依赖 LedgerJwtGuard 已注入 req.ledgerUser；未开通/过期 → 写操作抛 MEMBER_EXPIRED(6001)，
 * HTTP 200（biz.exception 映射），App 据此 code 进入「开通会员」闸门页，而非按 401 跳登录。
 *
 * 到期后的数据为只读：历史订单和经营统计必须仍可查询，否则报表页会把会员到期
 * 误展示为“加载失败”。
 */
var LedgerMembershipGuard = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var LedgerMembershipGuard = _classThis = /** @class */ (function () {
        function LedgerMembershipGuard_1() {
        }
        LedgerMembershipGuard_1.prototype.canActivate = function (context) {
            var _a;
            var req = context.switchToHttp().getRequest();
            var m = (_a = req.ledgerUser) === null || _a === void 0 ? void 0 : _a.membership;
            // 会员到期后保留历史订单、经营统计的只读能力；新增、修改、删除仍继续走会员闸门。
            var path = String(req.originalUrl || '')
                .split('?')[0]
                .replace(/^\/api\/v1/, '');
            var isReadonlyOrder = /^\/l\/orders(?:\/[^/]+)?\/?$/.test(path);
            var isReadonlyStats = /^\/l\/stats\/(?:overview|monthly|series)\/?$/.test(path);
            var isReadonlyMetalQuote = /^\/l\/tools\/metal\/quotes\/?$/.test(path);
            if (req.method === 'GET' && (isReadonlyOrder || isReadonlyStats || isReadonlyMetalQuote)) {
                return true;
            }
            if (!(m === null || m === void 0 ? void 0 : m.active)) {
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.MEMBER_EXPIRED, (m === null || m === void 0 ? void 0 : m.expired) ? '会员已过期，请联系管理员续费' : '尚未开通会员，请联系管理员开通');
            }
            return true;
        };
        return LedgerMembershipGuard_1;
    }());
    __setFunctionName(_classThis, "LedgerMembershipGuard");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LedgerMembershipGuard = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LedgerMembershipGuard = _classThis;
}();
exports.LedgerMembershipGuard = LedgerMembershipGuard;
