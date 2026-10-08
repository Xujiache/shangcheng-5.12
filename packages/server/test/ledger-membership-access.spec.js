"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var globals_1 = require("@jest/globals");
// ledger.constants 间接依赖 nanoid；测试只验证会员门禁，不需要真实邀请码熵源。
globals_1.jest.mock('nanoid', function () { return ({
    customAlphabet: function () { return function () { return 'AAAAAAAA'; }; },
}); });
var ledger_service_1 = require("../src/modules/ledger/ledger.service");
var biz_exception_1 = require("../src/common/exceptions/biz.exception");
var ledger_membership_guard_1 = require("../src/modules/ledger/guards/ledger-membership.guard");
var userWith = function (membership) { return ({
    id: 'wechat-user-1',
    membership: membership,
}); };
(0, globals_1.describe)('LedgerService.cutAccess 会员闸门', function () {
    (0, globals_1.it)('未开通会员的微信账号不会获得优化下料权限', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = {
                        ledgerUser: {
                            findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, userWith(null)];
                            }); }); }),
                        },
                    };
                    service = new ledger_service_1.LedgerService(prisma);
                    return [4 /*yield*/, (0, globals_1.expect)(service.cutAccess('wechat-user-1')).resolves.toMatchObject({
                            allowed: false,
                            mode: 'locked',
                            reason: '优化下料为会员功能，开通会员后即可使用',
                            membership: { active: false, never: true },
                        })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('有效会员仅按该微信账号所属会员档案放行', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = {
                        ledgerUser: {
                            findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    return [2 /*return*/, userWith({
                                            expiresAt: new Date(Date.now() + 86400000),
                                            lastPlanKey: 'month',
                                            perpetual: false,
                                            trialClaimedAt: null,
                                        })];
                                });
                            }); }),
                        },
                    };
                    service = new ledger_service_1.LedgerService(prisma);
                    return [4 /*yield*/, (0, globals_1.expect)(service.cutAccess('wechat-user-1')).resolves.toMatchObject({
                            allowed: true,
                            mode: 'member',
                            membership: { active: true, lastPlanKey: 'month' },
                        })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
function guardContext(method, originalUrl, membership) {
    return {
        switchToHttp: function () { return ({
            getRequest: function () { return ({ method: method, originalUrl: originalUrl, ledgerUser: { membership: membership } }); },
        }); },
    };
}
(0, globals_1.describe)('LedgerMembershipGuard 到期会员只读访问', function () {
    var guard = new ledger_membership_guard_1.LedgerMembershipGuard();
    var expiredMembership = { active: false, expired: true };
    globals_1.it.each(['/api/v1/l/orders', '/api/v1/l/orders/order-1?source=history'])('%s 的 GET 请求可读取历史订单', function (url) {
        (0, globals_1.expect)(guard.canActivate(guardContext('GET', url, expiredMembership))).toBe(true);
    });
    globals_1.it.each([
        '/api/v1/l/stats/overview?period=month',
        '/api/v1/l/stats/monthly?year=2026',
        '/api/v1/l/stats/series?granularity=month',
    ])('%s 的 GET 请求可查看历史经营统计', function (url) {
        (0, globals_1.expect)(guard.canActivate(guardContext('GET', url, expiredMembership))).toBe(true);
    });
    globals_1.it.each([
        ['POST', '/api/v1/l/orders'],
        ['PATCH', '/api/v1/l/orders/order-1'],
        ['DELETE', '/api/v1/l/orders/order-1'],
        ['POST', '/api/v1/l/stats/monthly'],
        ['GET', '/api/v1/l/customers'],
        ['GET', '/api/v1/l/work-logs?month=2026-06'],
        ['POST', '/api/v1/l/work-logs'],
    ])('%s %s 仍受会员闸门保护', function (method, url) {
        (0, globals_1.expect)(function () { return guard.canActivate(guardContext(method, url, expiredMembership)); }).toThrow(biz_exception_1.BizException);
        try {
            guard.canActivate(guardContext(method, url, expiredMembership));
        }
        catch (error) {
            (0, globals_1.expect)(error.getResponse()).toMatchObject({ code: biz_exception_1.BizCode.MEMBER_EXPIRED });
        }
    });
});
