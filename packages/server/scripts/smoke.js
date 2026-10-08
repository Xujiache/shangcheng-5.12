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
/**
 * Smoke 测试脚本：逐条请求后端关键接口，验证无 404 / 500
 *
 * 用法：
 *   1) 启动依赖：cd deploy && docker compose -f docker-compose.dev.yml up -d
 *   2) prisma migrate + seed：
 *      pnpm --filter @jiujiu/server prisma:migrate
 *      pnpm --filter @jiujiu/server prisma:seed
 *   3) 启动后端：pnpm --filter @jiujiu/server start:dev
 *   4) 跑 smoke：tsx packages/server/scripts/smoke.ts
 */
var promises_1 = require("node:timers/promises");
// 默认 smoke 远程线上后端 https://ewsn.top
// 本地调试时:SMOKE_BASE=http://localhost:3001 pnpm smoke
var BASE = process.env.SMOKE_BASE || 'https://ewsn.top';
// 登录密码：与 seed 一致，必须显式设置（无默认值，且 seed 要求 >= 8 位）。
// 优先 SMOKE_PASSWORD，回退 SEED_DEFAULT_PASSWORD；都缺失则在 main() 中报错退出。
var SMOKE_PASSWORD = process.env.SMOKE_PASSWORD || process.env.SEED_DEFAULT_PASSWORD || '';
var tokens = {};
function http(method, path, body, auth) {
    return __awaiter(this, void 0, void 0, function () {
        var headers, res, text, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    headers = { 'Content-Type': 'application/json' };
                    if (auth && tokens[auth])
                        headers.Authorization = "Bearer ".concat(tokens[auth]);
                    return [4 /*yield*/, fetch("".concat(BASE).concat(path), {
                            method: method,
                            headers: headers,
                            body: body ? JSON.stringify(body) : undefined,
                        })];
                case 1:
                    res = _a.sent();
                    return [4 /*yield*/, res.text()];
                case 2:
                    text = _a.sent();
                    data = null;
                    try {
                        data = JSON.parse(text);
                    }
                    catch (_b) {
                        data = text;
                    }
                    return [2 /*return*/, { status: res.status, data: data }];
            }
        });
    });
}
function login(username, password) {
    return __awaiter(this, void 0, void 0, function () {
        var r;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, http('POST', '/api/v1/auth/admin-login', { username: username, password: password })];
                case 1:
                    r = _e.sent();
                    return [2 /*return*/, ((_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.accessToken) || ((_d = (_c = r.data) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.token)];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, _b, _c, cases, fail, _i, cases_1, c, r, ok, mark;
        var _d, _e, _f, _g, _h, _j;
        return __generator(this, function (_k) {
            switch (_k.label) {
                case 0:
                    console.log("\u25B6  Smoke test against ".concat(BASE, "\n"));
                    if (!SMOKE_PASSWORD) {
                        console.error('✗ 未设置登录密码：请设置 SMOKE_PASSWORD 或 SEED_DEFAULT_PASSWORD 环境变量（与 seed 一致，>= 8 位）后再跑 smoke。');
                        process.exit(2);
                    }
                    // 登录
                    _a = tokens;
                    return [4 /*yield*/, login('merchant@demo', SMOKE_PASSWORD)];
                case 1:
                    // 登录
                    _a.merchant = _k.sent();
                    _b = tokens;
                    return [4 /*yield*/, login('admin@demo', SMOKE_PASSWORD)];
                case 2:
                    _b.admin = _k.sent();
                    _c = tokens;
                    return [4 /*yield*/, login('super@demo', SMOKE_PASSWORD)];
                case 3:
                    _c.super = _k.sent();
                    console.log('  ✓ 3 seed accounts logged in\n');
                    cases = [
                        { name: 'health', method: 'GET', url: '/health' },
                        {
                            name: 'wechat-login',
                            method: 'POST',
                            url: '/api/v1/auth/wechat-login',
                            body: { code: 'smoke' },
                        },
                        {
                            name: 'sms-code',
                            method: 'POST',
                            url: '/api/v1/auth/sms-code',
                            body: { phone: '13800001234' },
                        },
                        {
                            name: 'phone-login',
                            method: 'POST',
                            url: '/api/v1/auth/phone-login',
                            body: { phone: '13800001234', code: '0000' },
                        },
                        // user-mp public
                        { name: 'u/products', method: 'GET', url: '/api/v1/u/products' },
                        { name: 'u/categories', method: 'GET', url: '/api/v1/u/categories' },
                        { name: 'u/banners', method: 'GET', url: '/api/v1/u/banners' },
                        { name: 'u/stores/nearby', method: 'GET', url: '/api/v1/u/stores/nearby' },
                        // merchant 鉴权
                        { name: 'm/dashboard', method: 'GET', url: '/api/v1/m/dashboard', needsAuth: 'merchant' },
                        { name: 'm/stats', method: 'GET', url: '/api/v1/m/stats?period=today', needsAuth: 'merchant' },
                        { name: 'm/products', method: 'GET', url: '/api/v1/m/products', needsAuth: 'merchant' },
                        { name: 'm/orders', method: 'GET', url: '/api/v1/m/orders', needsAuth: 'merchant' },
                        { name: 'm/refunds', method: 'GET', url: '/api/v1/m/refunds', needsAuth: 'merchant' },
                        { name: 'm/customers', method: 'GET', url: '/api/v1/m/customers', needsAuth: 'merchant' },
                        {
                            name: 'm/commission/rules',
                            method: 'GET',
                            url: '/api/v1/m/commission/rules',
                            needsAuth: 'merchant',
                        },
                        { name: 'm/withdraws', method: 'GET', url: '/api/v1/m/withdraws', needsAuth: 'merchant' },
                        { name: 'm/balance', method: 'GET', url: '/api/v1/m/balance', needsAuth: 'merchant' },
                        { name: 'm/stores', method: 'GET', url: '/api/v1/m/stores', needsAuth: 'merchant' },
                        { name: 'm/staffs', method: 'GET', url: '/api/v1/m/staffs', needsAuth: 'merchant' },
                        {
                            name: 'm/shop/decorate',
                            method: 'GET',
                            url: '/api/v1/m/shop/decorate',
                            needsAuth: 'merchant',
                        },
                        {
                            name: 'm/marketing/overview',
                            method: 'GET',
                            url: '/api/v1/m/marketing/overview',
                            needsAuth: 'merchant',
                        },
                        {
                            name: 'm/marketing/coupons',
                            method: 'GET',
                            url: '/api/v1/m/marketing/coupons',
                            needsAuth: 'merchant',
                        },
                        {
                            name: 'm/chat/sessions',
                            method: 'GET',
                            url: '/api/v1/m/chat/sessions',
                            needsAuth: 'merchant',
                        },
                        {
                            name: 'm/chat/quick-replies',
                            method: 'GET',
                            url: '/api/v1/m/chat/quick-replies',
                            needsAuth: 'merchant',
                        },
                        {
                            name: 'm/plaza/products',
                            method: 'GET',
                            url: '/api/v1/m/plaza/products',
                            needsAuth: 'merchant',
                        },
                        {
                            name: 'm/plaza/factories',
                            method: 'GET',
                            url: '/api/v1/m/plaza/factories',
                            needsAuth: 'merchant',
                        },
                        {
                            name: 'm/feature-flags',
                            method: 'GET',
                            url: '/api/v1/m/feature-flags',
                            needsAuth: 'merchant',
                        },
                        {
                            name: 'm/membership/plans',
                            method: 'GET',
                            url: '/api/v1/m/membership/plans',
                            needsAuth: 'merchant',
                        },
                        { name: 'm/membership', method: 'GET', url: '/api/v1/m/membership', needsAuth: 'merchant' },
                        {
                            name: 'm/membership/quota',
                            method: 'GET',
                            url: '/api/v1/m/membership/quota',
                            needsAuth: 'merchant',
                        },
                        {
                            name: 'm/membership/payments',
                            method: 'GET',
                            url: '/api/v1/m/membership/payments',
                            needsAuth: 'merchant',
                        },
                        {
                            name: 'm/membership/notices',
                            method: 'GET',
                            url: '/api/v1/m/membership/notices',
                            needsAuth: 'merchant',
                        },
                        // platform 鉴权
                        { name: 'p/dashboard', method: 'GET', url: '/api/v1/p/dashboard', needsAuth: 'admin' },
                        { name: 'p/merchants', method: 'GET', url: '/api/v1/p/merchants', needsAuth: 'admin' },
                        {
                            name: 'p/audit/merchants',
                            method: 'GET',
                            url: '/api/v1/p/audit/merchants',
                            needsAuth: 'admin',
                        },
                        { name: 'p/orders', method: 'GET', url: '/api/v1/p/orders', needsAuth: 'admin' },
                        {
                            name: 'p/audit/products',
                            method: 'GET',
                            url: '/api/v1/p/audit/products',
                            needsAuth: 'admin',
                        },
                        {
                            name: 'p/audit/products/config',
                            method: 'GET',
                            url: '/api/v1/p/audit/products/config',
                            needsAuth: 'admin',
                        },
                        { name: 'p/ads/slots', method: 'GET', url: '/api/v1/p/ads/slots', needsAuth: 'admin' },
                        { name: 'p/ads/creatives', method: 'GET', url: '/api/v1/p/ads/creatives', needsAuth: 'admin' },
                        { name: 'p/plaza/pushes', method: 'GET', url: '/api/v1/p/plaza/pushes', needsAuth: 'admin' },
                        {
                            name: 'p/plaza/products',
                            method: 'GET',
                            url: '/api/v1/p/plaza/products',
                            needsAuth: 'admin',
                        },
                        {
                            name: 'p/plaza/factories',
                            method: 'GET',
                            url: '/api/v1/p/plaza/factories',
                            needsAuth: 'admin',
                        },
                        { name: 'p/plaza/records', method: 'GET', url: '/api/v1/p/plaza/records', needsAuth: 'admin' },
                        { name: 'p/member-plans', method: 'GET', url: '/api/v1/p/member-plans', needsAuth: 'admin' },
                        {
                            name: 'p/member-pay-orders',
                            method: 'GET',
                            url: '/api/v1/p/member-pay-orders',
                            needsAuth: 'admin',
                        },
                        { name: 'p/feature-flags', method: 'GET', url: '/api/v1/p/feature-flags', needsAuth: 'admin' },
                        {
                            name: 'p/feature-flags/gray',
                            method: 'GET',
                            url: '/api/v1/p/feature-flags/gray',
                            needsAuth: 'admin',
                        },
                        { name: 'p/admins', method: 'GET', url: '/api/v1/p/admins', needsAuth: 'admin' },
                        { name: 'p/roles', method: 'GET', url: '/api/v1/p/roles', needsAuth: 'admin' },
                        {
                            name: 'p/system/settings',
                            method: 'GET',
                            url: '/api/v1/p/system/settings',
                            needsAuth: 'admin',
                        },
                        { name: 'auth/user-info', method: 'GET', url: '/api/v1/auth/user-info', needsAuth: 'merchant' },
                        { name: 'auth/menus', method: 'GET', url: '/api/v1/auth/menus', needsAuth: 'merchant' },
                    ];
                    fail = [];
                    _i = 0, cases_1 = cases;
                    _k.label = 4;
                case 4:
                    if (!(_i < cases_1.length)) return [3 /*break*/, 8];
                    c = cases_1[_i];
                    return [4 /*yield*/, http(c.method, c.url, c.body, c.needsAuth)];
                case 5:
                    r = _k.sent();
                    ok = r.status >= 200 && r.status < 300 && (((_d = r.data) === null || _d === void 0 ? void 0 : _d.code) === 0 || ((_e = r.data) === null || _e === void 0 ? void 0 : _e.code) === 200);
                    mark = ok ? '✓' : '✗';
                    console.log("  ".concat(mark, "  ").concat(c.method.padEnd(5), " ").concat(c.url.padEnd(50), "  HTTP ").concat(r.status, "  code=").concat((_f = r.data) === null || _f === void 0 ? void 0 : _f.code));
                    if (!ok)
                        fail.push("".concat(c.method, " ").concat(c.url, " \u2192 HTTP ").concat(r.status, " code=").concat((_g = r.data) === null || _g === void 0 ? void 0 : _g.code, " msg=").concat(((_h = r.data) === null || _h === void 0 ? void 0 : _h.msg) || ((_j = r.data) === null || _j === void 0 ? void 0 : _j.message)));
                    return [4 /*yield*/, (0, promises_1.setTimeout)(20)];
                case 6:
                    _k.sent();
                    _k.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 4];
                case 8:
                    console.log("\n".concat(fail.length === 0 ? '✅' : '❌', " ").concat(cases.length - fail.length, "/").concat(cases.length, " passed"));
                    if (fail.length) {
                        console.log('\nFailures:');
                        fail.forEach(function (f) { return console.log('  ' + f); });
                        process.exit(1);
                    }
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (e) {
    console.error(e);
    process.exit(1);
});
