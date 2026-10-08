"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeClient = makeClient;
exports.resetDb = resetDb;
exports.createUser = createUser;
exports.createMerchant = createMerchant;
exports.createCoupon = createCoupon;
// ----------------------------------------------------------------------------
// 集成测试数据库工具
//
//   - makeClient : 基于 process.env.DATABASE_URL 创建 PrismaClient
//   - resetDb    : 按外键安全顺序 TRUNCATE 集成测试涉及的表（逐表 try/catch，
//                  尚未建出来的表自动跳过，便于与并行开发的新模型解耦）
//   - 夹具构造器 : createUser / createMerchant / createCoupon
// ----------------------------------------------------------------------------
var client_1 = require("@prisma/client");
/** 创建指向当前 DATABASE_URL 的 PrismaClient（宽松类型，便于访问新增模型） */
function makeClient() {
    return new client_1.PrismaClient({
        datasources: { db: { url: process.env.DATABASE_URL } },
    });
}
/**
 * 清空集成测试涉及的表（FK 安全顺序：子表在前，父表在后）。
 * 使用 TRUNCATE ... CASCADE + 逐表 try/catch：
 *   - CASCADE 兜底处理漏列的关联表
 *   - 表不存在（如模型尚未 db push）时静默跳过
 */
function resetDb(prisma) {
    return __awaiter(this, void 0, void 0, function () {
        var tables, _i, tables_1, table, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    tables = [
                        'OrderShare',
                        'UserCoupon',
                        'SystemConfig',
                        'Payment',
                        'Refund',
                        'Commission',
                        'OrderItem',
                        'Order',
                        'CartItem',
                        'Favorite',
                        'Sku',
                        'Product',
                        'Coupon',
                        'ChatMessage',
                        'ChatSession',
                        'Staff',
                        'Store',
                        'MerchantMembership',
                        'PaymentRecord',
                        'UsageQuota',
                        'Merchant',
                        'Address',
                        'SmsCode',
                        'User',
                    ];
                    _i = 0, tables_1 = tables;
                    _b.label = 1;
                case 1:
                    if (!(_i < tables_1.length)) return [3 /*break*/, 6];
                    table = tables_1[_i];
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, prisma.$executeRawUnsafe("TRUNCATE TABLE \"".concat(table, "\" CASCADE"))];
                case 3:
                    _b.sent();
                    return [3 /*break*/, 5];
                case 4:
                    _a = _b.sent();
                    return [3 /*break*/, 5];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/];
            }
        });
    });
}
var seq = 0;
/** 生成进程内唯一后缀，避免 unique 字段（phone/openid 等）冲突 */
function uniqueSuffix() {
    seq += 1;
    return "".concat(Date.now()).concat(seq);
}
/** 创建测试用户（默认 customer 角色，phone 唯一） */
function createUser(prisma_1) {
    return __awaiter(this, arguments, void 0, function (prisma, overrides) {
        var suffix;
        if (overrides === void 0) { overrides = {}; }
        return __generator(this, function (_a) {
            suffix = uniqueSuffix();
            return [2 /*return*/, prisma.user.create({
                    data: __assign({ nickname: "\u6D4B\u8BD5\u7528\u6237".concat(suffix), phone: "139".concat(suffix.slice(-8).padStart(8, '0')), role: 'customer', status: 'active' }, overrides),
                })];
        });
    });
}
/** 创建测试商家（填齐全部必填列，默认 active 工厂商家） */
function createMerchant(prisma_1, userId_1) {
    return __awaiter(this, arguments, void 0, function (prisma, userId, overrides) {
        var suffix;
        if (overrides === void 0) { overrides = {}; }
        return __generator(this, function (_a) {
            suffix = uniqueSuffix();
            return [2 /*return*/, prisma.merchant.create({
                    data: __assign({ userId: userId, type: 'factory', name: "\u6D4B\u8BD5\u5546\u5BB6".concat(suffix), legalName: "\u6D4B\u8BD5\u5546\u5BB6\u6709\u9650\u516C\u53F8".concat(suffix), creditCode: "91110000".concat(suffix.slice(-10).padStart(10, '0')), legalRep: '张三', contact: '李四', contactPhone: "138".concat(suffix.slice(-8).padStart(8, '0')), region: '北京市/北京市/朝阳区', address: '测试路 1 号', status: 'active' }, overrides),
                })];
        });
    });
}
/** 创建测试优惠券（有效期 now-1d ~ now+1d，状态 active） */
function createCoupon(prisma_1, merchantId_1) {
    return __awaiter(this, arguments, void 0, function (prisma, merchantId, overrides) {
        var now, oneDay;
        if (overrides === void 0) { overrides = {}; }
        return __generator(this, function (_a) {
            now = Date.now();
            oneDay = 24 * 60 * 60 * 1000;
            return [2 /*return*/, prisma.coupon.create({
                    data: __assign({ merchantId: merchantId, name: "\u6D4B\u8BD5\u6EE1\u51CF\u5238".concat(uniqueSuffix()), type: 'fullReduce', amount: 10, threshold: 100, stock: 100, perUserLimit: 1, validFrom: new Date(now - oneDay), validTo: new Date(now + oneDay), status: 'active' }, overrides),
                })];
        });
    });
}
