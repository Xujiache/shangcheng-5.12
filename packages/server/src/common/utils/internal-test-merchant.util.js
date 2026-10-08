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
exports.INTERNAL_TEST_MERCHANTS_KEY = void 0;
exports.parseInternalTestMerchantIds = parseInternalTestMerchantIds;
exports.getInternalTestMerchantIds = getInternalTestMerchantIds;
exports.isInternalTestMerchant = isInternalTestMerchant;
/**
 * 生产内部测试商户隔离名单。
 *
 * 名单存放在 SystemConfig.internal_test_merchants，既接受字符串数组，也兼容
 * `{ merchantIds: string[] }`。这里故意不做进程内缓存：配置命令写入后，所有
 * API 请求应立即使用最新名单，避免测试数据短暂进入顾客端或选品广场。
 */
exports.INTERNAL_TEST_MERCHANTS_KEY = 'internal_test_merchants';
function parseInternalTestMerchantIds(value) {
    var raw = Array.isArray(value)
        ? value
        : value && typeof value === 'object' && Array.isArray(value.merchantIds)
            ? value.merchantIds
            : [];
    return Array.from(new Set(raw
        .filter(function (id) { return typeof id === 'string'; })
        .map(function (id) { return id.trim(); })
        .filter(Boolean)));
}
function getInternalTestMerchantIds(prisma) {
    return __awaiter(this, void 0, void 0, function () {
        var config;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    // 仅用于兼容服务单元测试里的最小 Prisma stub；真实 PrismaService 始终有该 delegate。
                    if (!((_a = prisma.systemConfig) === null || _a === void 0 ? void 0 : _a.findUnique))
                        return [2 /*return*/, []];
                    return [4 /*yield*/, prisma.systemConfig.findUnique({
                            where: { key: exports.INTERNAL_TEST_MERCHANTS_KEY },
                        })];
                case 1:
                    config = _b.sent();
                    return [2 /*return*/, parseInternalTestMerchantIds(config === null || config === void 0 ? void 0 : config.value)];
            }
        });
    });
}
function isInternalTestMerchant(prisma, merchantId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!merchantId)
                        return [2 /*return*/, false];
                    return [4 /*yield*/, getInternalTestMerchantIds(prisma)];
                case 1: return [2 /*return*/, (_a.sent()).includes(merchantId)];
            }
        });
    });
}
