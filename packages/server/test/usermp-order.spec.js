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
var globals_1 = require("@jest/globals");
// nanoid@5 是纯 ESM，ts-jest(CJS) 不转换 node_modules；id.util(orderNo) 通过它生成单号。
// 用等价随机生成器替换，避免 "Cannot use import statement outside a module"。
globals_1.jest.mock('nanoid', function () { return ({
    customAlphabet: function (alphabet, size) { return function () {
        var s = '';
        for (var i = 0; i < size; i++) {
            s += alphabet[Math.floor(Math.random() * alphabet.length)];
        }
        return s;
    }; },
}); });
var user_mp_service_1 = require("../src/modules/user-mp/user-mp.service");
// ----------------------------------------------------------------------------
// UserMpService — 购物车越权 + createOrder 计价链（资金安全核心）
//
// 实现位置：packages/server/src/modules/user-mp/user-mp.service.ts
//
// 重点契约：
//   - 购物车：updateCart / removeCart 必须按 (id, userId) 双条件越权防护
//   - createOrder 计价链（绝不信前端金额）：
//       黑名单 → tier 身份 → 店铺价格规则 → 隐藏价拒绝 → 跨商户拒绝 →
//       分级取价(retail/wholesale/member) → 库存校验 → by-size 面积重算 →
//       优惠券服务端重算(门槛/有效期/商户/每人限用/适用范围/折扣clamp) →
//       payAmount = total + 运费 - 券，事务内扣库存 + 扣券 + 推送
//   - payOrder：状态校验 / 支付通道就绪 / openid 校验
// ----------------------------------------------------------------------------
/** 断言抛出的 BizException 业务码 */
function expectBizCode(fn, code) {
    return __awaiter(this, void 0, void 0, function () {
        var e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fn()];
                case 1:
                    _a.sent();
                    throw new Error('should have thrown');
                case 2:
                    e_1 = _a.sent();
                    (0, globals_1.expect)(e_1.getResponse().code).toBe(code);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/** 捕获抛出异常的 message */
function catchMessage(fn) {
    return __awaiter(this, void 0, void 0, function () {
        var e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fn()];
                case 1:
                    _a.sent();
                    throw new Error('should have thrown');
                case 2:
                    e_2 = _a.sent();
                    return [2 /*return*/, e_2.getResponse().message];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// ---- chat / wxpay mock 工厂 ----
function makeChat() {
    return {
        broadcastUserUpdate: globals_1.jest.fn(),
        emitOrderNew: globals_1.jest.fn(),
        emitOrderUpdate: globals_1.jest.fn(),
        emitRefundNew: globals_1.jest.fn(),
        emitChatMessage: globals_1.jest.fn(),
    };
}
function makeWxpay() {
    var _this = this;
    return {
        isReady: globals_1.jest.fn(function () { return true; }),
        createMiniPay: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, ({ appId: 'a' })];
        }); }); }),
    };
}
// ---- fixtures ----
var ADDRESS = { id: 'a1', userId: 'u1' };
/**
 * SKU 工厂。product.pricingMode 默认 'standard'；by-size 用例覆写。
 * by-size 尺寸范围字段挂在 product 上（min/maxLength、min/maxWidth、pricePerSqm、baseFee、sizeUnit）。
 */
function makeSku(id, productId, stock, priceRetail, priceWholesale, priceMember, specsLabel, product) {
    return {
        id: id,
        productId: productId,
        stock: stock,
        priceRetail: priceRetail,
        priceWholesale: priceWholesale,
        priceMember: priceMember,
        specsLabel: specsLabel,
        product: __assign({ id: productId, name: 'P', merchantId: 'm1', images: [], pricingMode: 'standard' }, product),
    };
}
/**
 * 构造 prisma mock。
 * - systemConfig.findUnique 按 key 派发（map 可逐用例覆写）
 * - $transaction 回调形态：tx.order.create 回显 totalAmount/payAmount
 */
function makePrisma(opts) {
    var _this = this;
    if (opts === void 0) { opts = {}; }
    var configMap = opts.configMap || {};
    var order = {
        id: 'o1',
        no: 'O1',
        status: 'pending_payment',
        totalAmount: 0,
        payAmount: 0,
    };
    var tx = {
        order: {
            create: globals_1.jest.fn(function (arg) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, ({
                            id: 'o1',
                            no: arg.data.no,
                            status: 'pending_payment',
                            totalAmount: arg.data.totalAmount,
                            payAmount: arg.data.payAmount,
                            createdAt: new Date(),
                        })];
                });
            }); }),
        },
        // 库存改为原子条件扣减 updateMany（WHERE stock>=N），count===0 即并发失败方
        sku: { updateMany: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { var _a; return __generator(this, function (_b) {
                return [2 /*return*/, ({ count: (_a = opts.stockUpdateCount) !== null && _a !== void 0 ? _a : 1 })];
            }); }); }) },
        coupon: { update: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, ({})];
            }); }); }) },
    };
    var prisma = {
        address: {
            findFirst: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, (opts.address === undefined ? ADDRESS : opts.address)];
            }); }); }),
        },
        sku: {
            findMany: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { var _a; return __generator(this, function (_b) {
                return [2 /*return*/, (_a = opts.skus) !== null && _a !== void 0 ? _a : []];
            }); }); }),
        },
        user: {
            findUnique: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, opts.user === undefined ? { id: 'u1', role: 'customer', openid: 'ox' } : opts.user];
            }); }); }),
        },
        coupon: {
            findUnique: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { var _a; return __generator(this, function (_b) {
                return [2 /*return*/, (_a = opts.coupon) !== null && _a !== void 0 ? _a : null];
            }); }); }),
            update: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, ({})];
            }); }); }),
        },
        product: {
            findMany: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { var _a; return __generator(this, function (_b) {
                return [2 /*return*/, (_a = opts.categoryProducts) !== null && _a !== void 0 ? _a : []];
            }); }); }),
        },
        order: {
            count: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { var _a; return __generator(this, function (_b) {
                return [2 /*return*/, (_a = opts.orderCount) !== null && _a !== void 0 ? _a : 0];
            }); }); }),
        },
        systemConfig: {
            // service 读取 cfg?.value，所以 mock 必须把配置值包在 { value } 里
            findUnique: globals_1.jest.fn(function (arg) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, arg.where.key in configMap ? { key: arg.where.key, value: configMap[arg.where.key] } : null];
            }); }); }),
        },
        // createOrder 下单后 best-effort 核销：findFirst 取最早一条未使用持券行 → update 标记已用
        userCoupon: {
            findFirst: globals_1.jest.fn(function (_arg) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, null];
            }); }); }),
            update: globals_1.jest.fn(function (_arg) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, ({})];
            }); }); }),
        },
        $transaction: globals_1.jest.fn(function (cb) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, cb(tx)];
        }); }); }),
        __tx: tx,
        __order: order,
    };
    return prisma;
}
function makeService(prisma) {
    var chat = makeChat();
    var wxpay = makeWxpay();
    var svc = new user_mp_service_1.UserMpService(prisma, wxpay, chat);
    return { svc: svc, chat: chat, wxpay: wxpay, prisma: prisma };
}
// 标准下单 dto（单 SKU、standard 定价）
function orderDto(extra) {
    if (extra === void 0) { extra = {}; }
    return __assign({ addressId: 'a1', items: [{ skuId: 's1', quantity: 2 }] }, extra);
}
(0, globals_1.describe)('UserMpService 购物车越权防护', function () {
    (0, globals_1.it)('updateCart：改别人条目（findFirst 返回 null）→ NOT_FOUND(1002)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = makePrisma();
                    prisma.cartItem = { findFirst: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, null];
                        }); }); }), update: globals_1.jest.fn() };
                    svc = makeService(prisma).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.updateCart('u1', 'cartOfOther', { quantity: 3 }); }, 1002)
                        // 既然条目不属于本人，绝不能落到 update
                    ];
                case 1:
                    _a.sent();
                    // 既然条目不属于本人，绝不能落到 update
                    (0, globals_1.expect)(prisma.cartItem.update).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('removeCart：deleteMany count=0（无匹配）→ NOT_FOUND(1002)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = makePrisma();
                    prisma.cartItem = { deleteMany: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ({ count: 0 })];
                        }); }); }) };
                    svc = makeService(prisma).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.removeCart('u1', 'cartOfOther'); }, 1002)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('UserMpService addCart', function () {
    (0, globals_1.it)('商品下架（status=offline）→ PRODUCT_OFFLINE(3001)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = makePrisma();
                    prisma.product = {
                        findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ({ id: 'p1', status: 'offline' })];
                        }); }); }),
                    };
                    svc = makeService(prisma).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.addCart('u1', { productId: 'p1', skuId: 's1', quantity: 1 }); }, 3001)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('已有条目累加后超库存 → STOCK_INSUFFICIENT(3002)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = makePrisma();
                    prisma.product = { findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ({ id: 'p1', status: 'active' })];
                        }); }); }) };
                    prisma.sku = {
                        findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ({ id: 's1', productId: 'p1', stock: 5, active: true })];
                        }); }); }),
                    };
                    prisma.cartItem = {
                        findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ({ id: 'c1', quantity: 4 })];
                        }); }); }),
                        update: globals_1.jest.fn(),
                        create: globals_1.jest.fn(),
                    };
                    svc = makeService(prisma).svc;
                    // 已有 4 + 新增 3 = 7 > 库存 5
                    return [4 /*yield*/, expectBizCode(function () { return svc.addCart('u1', { productId: 'p1', skuId: 's1', quantity: 3 }); }, 3002)];
                case 1:
                    // 已有 4 + 新增 3 = 7 > 库存 5
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('正常累加 → update 的 quantity = 旧 + 新', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, svc, arg;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = makePrisma();
                    prisma.product = { findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ({ id: 'p1', status: 'active' })];
                        }); }); }) };
                    prisma.sku = {
                        findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ({ id: 's1', productId: 'p1', stock: 50, active: true })];
                        }); }); }),
                    };
                    prisma.cartItem = {
                        findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ({ id: 'c1', quantity: 4 })];
                        }); }); }),
                        update: globals_1.jest.fn(function (arg) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, arg];
                        }); }); }),
                        create: globals_1.jest.fn(),
                    };
                    svc = makeService(prisma).svc;
                    return [4 /*yield*/, svc.addCart('u1', { productId: 'p1', skuId: 's1', quantity: 3 })];
                case 1:
                    _a.sent();
                    (0, globals_1.expect)(prisma.cartItem.update).toHaveBeenCalledTimes(1);
                    arg = prisma.cartItem.update.mock.calls[0][0];
                    (0, globals_1.expect)(arg.where.id).toBe('c1');
                    (0, globals_1.expect)(arg.data.quantity).toBe(7);
                    (0, globals_1.expect)(prisma.cartItem.create).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('UserMpService createOrder 准入校验', function () {
    (0, globals_1.it)('跨商户两个 SKU → BUSINESS_ERROR(1000) 且文案提示跨商户', function () { return __awaiter(void 0, void 0, void 0, function () {
        var skus, prisma, svc, dto, msg;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    skus = [
                        makeSku('s1', 'p1', 10, 100, 80, 60, '规格A', { merchantId: 'm1' }),
                        makeSku('s2', 'p2', 10, 100, 80, 60, '规格B', { merchantId: 'm2' }),
                    ];
                    prisma = makePrisma({ skus: skus });
                    svc = makeService(prisma).svc;
                    dto = {
                        addressId: 'a1',
                        items: [
                            { skuId: 's1', quantity: 1 },
                            { skuId: 's2', quantity: 1 },
                        ],
                    };
                    return [4 /*yield*/, expectBizCode(function () { return svc.createOrder('u1', dto); }, 1000)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, catchMessage(function () { return svc.createOrder('u1', dto); })];
                case 2:
                    msg = _a.sent();
                    (0, globals_1.expect)(msg).toContain('跨商户');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('买家被店铺拉黑（blocked=true）→ FORBIDDEN(2003)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var skus, prisma, svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    skus = [makeSku('s1', 'p1', 10, 100, 80, 60, '规格A', {})];
                    prisma = makePrisma({
                        skus: skus,
                        configMap: { 'merchant:m1:blacklist:u1': { blocked: true } },
                    });
                    svc = makeService(prisma).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.createOrder('u1', orderDto()); }, 2003)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('店铺规则 customerPrice=hidden，普通客户 → FORBIDDEN(2003)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var skus, prisma, svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    skus = [makeSku('s1', 'p1', 10, 100, 80, 60, '规格A', {})];
                    prisma = makePrisma({
                        skus: skus,
                        configMap: { 'shop:m1:priceRule': { guestAllow: true, customerPrice: 'hidden' } },
                    });
                    svc = makeService(prisma).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.createOrder('u1', orderDto()); }, 2003)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('库存不足 → STOCK_INSUFFICIENT(3002)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var skus, prisma, svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    skus = [makeSku('s1', 'p1', 1, 100, 80, 60, '规格A', {})];
                    prisma = makePrisma({ skus: skus });
                    svc = makeService(prisma).svc;
                    // 下单 2 件 > 库存 1
                    return [4 /*yield*/, expectBizCode(function () { return svc.createOrder('u1', orderDto()); }, 3002)];
                case 1:
                    // 下单 2 件 > 库存 1
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('并发超卖防护：事务外预检通过但原子扣减命中 0 行 → STOCK_INSUFFICIENT(3002)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var skus, prisma, svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    skus = [makeSku('s1', 'p1', 5, 100, 80, 60, '规格A', {})];
                    prisma = makePrisma({ skus: skus, stockUpdateCount: 0 });
                    svc = makeService(prisma).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.createOrder('u1', orderDto()); }, 3002)
                        // 原子条件扣减确实被调用（守门发生在这条写而非事务外预检）
                    ];
                case 1:
                    _a.sent();
                    // 原子条件扣减确实被调用（守门发生在这条写而非事务外预检）
                    (0, globals_1.expect)(prisma.__tx.sku.updateMany).toHaveBeenCalledTimes(1);
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('UserMpService createOrder 分级取价', function () {
    (0, globals_1.it)('cust_tier=member + memberPrice=member → 入账按会员价(priceMember*qty)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var skus, prisma, svc, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    skus = [makeSku('s1', 'p1', 10, 100, 80, 60, '规格A', {})];
                    prisma = makePrisma({
                        skus: skus,
                        configMap: {
                            cust_tier_m1_u1: { priceTier: 'member' },
                            'shop:m1:priceRule': { guestAllow: true, memberPrice: 'member' },
                        },
                    });
                    svc = makeService(prisma).svc;
                    return [4 /*yield*/, svc.createOrder('u1', orderDto())];
                case 1:
                    _a.sent();
                    data = prisma.__tx.order.create.mock.calls[0][0].data;
                    // priceMember 60 * 2 = 120，绝不能是零售价 100*2=200
                    (0, globals_1.expect)(data.totalAmount).toBe(120);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('cust_tier=agency 默认 agencyPrice=wholesale → 入账按批发价', function () { return __awaiter(void 0, void 0, void 0, function () {
        var skus, prisma, svc, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    skus = [makeSku('s1', 'p1', 10, 100, 80, 60, '规格A', {})];
                    prisma = makePrisma({
                        skus: skus,
                        configMap: {
                            cust_tier_m1_u1: { priceTier: 'agency' },
                            // 不显式给 shop priceRule → 走 DEFAULT.agencyPrice='wholesale'
                        },
                    });
                    svc = makeService(prisma).svc;
                    return [4 /*yield*/, svc.createOrder('u1', orderDto())];
                case 1:
                    _a.sent();
                    data = prisma.__tx.order.create.mock.calls[0][0].data;
                    // priceWholesale 80 * 2 = 160
                    (0, globals_1.expect)(data.totalAmount).toBe(160);
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('UserMpService createOrder by-size 面积重算', function () {
    function bySizeProduct(over) {
        if (over === void 0) { over = {}; }
        return __assign({ pricingMode: 'by-size', pricePerSqm: 100, baseFee: 50, sizeUnit: 'cm', minLength: 50, maxLength: 600, minWidth: 50, maxWidth: 400 }, over);
    }
    (0, globals_1.it)('缺 bySize → INVALID_PARAMS(1001)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var skus, prisma, svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    skus = [makeSku('s1', 'p1', 10, 100, 80, 60, '规格A', bySizeProduct())];
                    prisma = makePrisma({ skus: skus });
                    svc = makeService(prisma).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.createOrder('u1', orderDto()); }, 1001)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('length 700 超出范围(max 600) → INVALID_PARAMS(1001)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var skus, prisma, svc, dto;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    skus = [makeSku('s1', 'p1', 10, 100, 80, 60, '规格A', bySizeProduct())];
                    prisma = makePrisma({ skus: skus });
                    svc = makeService(prisma).svc;
                    dto = {
                        addressId: 'a1',
                        items: [{ skuId: 's1', quantity: 1, bySize: { length: 700, width: 100 } }],
                    };
                    return [4 /*yield*/, expectBizCode(function () { return svc.createOrder('u1', dto); }, 1001)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('200x100cm → unitPrice = round((2*1)*100+50)=250 入账 totalAmount', function () { return __awaiter(void 0, void 0, void 0, function () {
        var skus, prisma, svc, dto, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    skus = [makeSku('s1', 'p1', 10, 100, 80, 60, '规格A', bySizeProduct())];
                    prisma = makePrisma({ skus: skus });
                    svc = makeService(prisma).svc;
                    dto = {
                        addressId: 'a1',
                        items: [{ skuId: 's1', quantity: 1, bySize: { length: 200, width: 100 } }],
                    };
                    return [4 /*yield*/, svc.createOrder('u1', dto)];
                case 1:
                    _a.sent();
                    data = prisma.__tx.order.create.mock.calls[0][0].data;
                    (0, globals_1.expect)(data.totalAmount).toBe(250);
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('UserMpService createOrder 优惠券服务端重算', function () {
    // 公共：单 SKU、零售价 100、下单 2 件 → totalAmount = 200
    function baseSkus() {
        return [makeSku('s1', 'p1', 10, 100, 80, 60, '规格A', {})];
    }
    var now = Date.now();
    function validCoupon(over) {
        if (over === void 0) { over = {}; }
        return __assign({ id: 'c1', status: 'active', validFrom: new Date(now - 86400000), validTo: new Date(now + 86400000), merchantId: 'm1', threshold: null, perUserLimit: null, scope: 'all', scopeIds: [], type: 'fullReduce', amount: 50, discountPercent: null }, over);
    }
    (0, globals_1.it)('couponId 指向不存在的券 → NOT_FOUND(1002)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = makePrisma({ skus: baseSkus(), coupon: null });
                    svc = makeService(prisma).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.createOrder('u1', orderDto({ couponId: 'cX' })); }, 1002)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('券 status=pending（未启用）→ BUSINESS_ERROR(1000)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = makePrisma({ skus: baseSkus(), coupon: validCoupon({ status: 'pending' }) });
                    svc = makeService(prisma).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.createOrder('u1', orderDto({ couponId: 'c1' })); }, 1000)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('券不在有效期内（已过期）→ BUSINESS_ERROR(1000)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = makePrisma({
                        skus: baseSkus(),
                        coupon: validCoupon({
                            validFrom: new Date(now - 10 * 86400000),
                            validTo: new Date(now - 86400000),
                        }),
                    });
                    svc = makeService(prisma).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.createOrder('u1', orderDto({ couponId: 'c1' })); }, 1000)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('券 merchantId 不同 → BUSINESS_ERROR(1000)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = makePrisma({ skus: baseSkus(), coupon: validCoupon({ merchantId: 'mOther' }) });
                    svc = makeService(prisma).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.createOrder('u1', orderDto({ couponId: 'c1' })); }, 1000)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('门槛未满（threshold 500 > total 200）→ BUSINESS_ERROR(1000)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = makePrisma({ skus: baseSkus(), coupon: validCoupon({ threshold: 500 }) });
                    svc = makeService(prisma).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.createOrder('u1', orderDto({ couponId: 'c1' })); }, 1000)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('perUserLimit=1 且已用 1 单 → BUSINESS_ERROR(1000) 每人限用', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = makePrisma({
                        skus: baseSkus(),
                        coupon: validCoupon({ perUserLimit: 1 }),
                        orderCount: 1,
                    });
                    svc = makeService(prisma).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.createOrder('u1', orderDto({ couponId: 'c1' })); }, 1000)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('scope=product 不含订单商品 → BUSINESS_ERROR(1000)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = makePrisma({
                        skus: baseSkus(),
                        coupon: validCoupon({ scope: 'product', scopeIds: ['pOther'] }),
                    });
                    svc = makeService(prisma).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.createOrder('u1', orderDto({ couponId: 'c1' })); }, 1000)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('type=discount discountPercent=0.85 → couponDiscount = round(total*0.15*100)/100', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, svc, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = makePrisma({
                        skus: baseSkus(),
                        coupon: validCoupon({ type: 'discount', amount: null, discountPercent: 0.85 }),
                    });
                    svc = makeService(prisma).svc;
                    return [4 /*yield*/, svc.createOrder('u1', orderDto({ couponId: 'c1' }))];
                case 1:
                    _a.sent();
                    data = prisma.__tx.order.create.mock.calls[0][0].data;
                    // total=200，付 85% 抵 15% → 200*0.15 = 30
                    (0, globals_1.expect)(data.couponDiscount).toBe(30);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('type=fullReduce amount=50 → couponDiscount=50', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, svc, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = makePrisma({
                        skus: baseSkus(),
                        coupon: validCoupon({ type: 'fullReduce', amount: 50 }),
                    });
                    svc = makeService(prisma).svc;
                    return [4 /*yield*/, svc.createOrder('u1', orderDto({ couponId: 'c1' }))];
                case 1:
                    _a.sent();
                    data = prisma.__tx.order.create.mock.calls[0][0].data;
                    (0, globals_1.expect)(data.couponDiscount).toBe(50);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('券面额超过订单金额 → couponDiscount 被钳到 total，payAmount=0', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, svc, res, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = makePrisma({
                        skus: baseSkus(),
                        coupon: validCoupon({ type: 'fullReduce', amount: 9999 }),
                    });
                    svc = makeService(prisma).svc;
                    return [4 /*yield*/, svc.createOrder('u1', orderDto({ couponId: 'c1' }))];
                case 1:
                    res = _a.sent();
                    data = prisma.__tx.order.create.mock.calls[0][0].data;
                    (0, globals_1.expect)(data.couponDiscount).toBe(200); // 钳到 total
                    (0, globals_1.expect)(data.payAmount).toBe(0);
                    (0, globals_1.expect)(res.payAmount).toBe(0);
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('UserMpService createOrder happy path', function () {
    (0, globals_1.it)('成功下单：每个 item 扣库存 + 用券则递增 used + 推送 emitOrderNew + 返回三元组', function () { return __awaiter(void 0, void 0, void 0, function () {
        var skus, now, coupon, prisma, _a, svc, chat, res, skuArg, couponArg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    skus = [makeSku('s1', 'p1', 10, 100, 80, 60, '规格A', {})];
                    now = Date.now();
                    coupon = {
                        id: 'c1',
                        status: 'active',
                        validFrom: new Date(now - 86400000),
                        validTo: new Date(now + 86400000),
                        merchantId: 'm1',
                        threshold: null,
                        perUserLimit: null,
                        scope: 'all',
                        scopeIds: [],
                        type: 'fullReduce',
                        amount: 50,
                        discountPercent: null,
                    };
                    prisma = makePrisma({ skus: skus, coupon: coupon });
                    _a = makeService(prisma), svc = _a.svc, chat = _a.chat;
                    return [4 /*yield*/, svc.createOrder('u1', orderDto({ couponId: 'c1' }))
                        // 每个订单项原子条件扣一次库存（updateMany + WHERE stock>=N）
                    ];
                case 1:
                    res = _b.sent();
                    // 每个订单项原子条件扣一次库存（updateMany + WHERE stock>=N）
                    (0, globals_1.expect)(prisma.__tx.sku.updateMany).toHaveBeenCalledTimes(1);
                    skuArg = prisma.__tx.sku.updateMany.mock.calls[0][0];
                    (0, globals_1.expect)(skuArg.where.id).toBe('s1');
                    (0, globals_1.expect)(skuArg.where.stock.gte).toBe(2); // 条件扣减守门：库存须 ≥ 下单量
                    (0, globals_1.expect)(skuArg.data.stock.decrement).toBe(2);
                    // 用券 → 事务内递增 used
                    (0, globals_1.expect)(prisma.__tx.coupon.update).toHaveBeenCalledTimes(1);
                    couponArg = prisma.__tx.coupon.update.mock.calls[0][0];
                    (0, globals_1.expect)(couponArg.data.used.increment).toBe(1);
                    // 事务外 best-effort 核销：取最早一条未使用 UserCoupon（本例 mock 无持券行 → 不 update）
                    (0, globals_1.expect)(prisma.userCoupon.findFirst).toHaveBeenCalledWith({
                        where: { userId: 'u1', couponId: 'c1', status: 'unused' },
                        orderBy: { claimedAt: 'asc' },
                    });
                    (0, globals_1.expect)(prisma.userCoupon.update).not.toHaveBeenCalled();
                    // 商家端推送
                    (0, globals_1.expect)(chat.emitOrderNew).toHaveBeenCalledTimes(1);
                    // 返回结构
                    (0, globals_1.expect)(res.orderId).toBe('o1');
                    (0, globals_1.expect)(res.orderNo).toBeTruthy();
                    // total 200 - 券 50 = 150
                    (0, globals_1.expect)(res.payAmount).toBe(150);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('无券下单：不调用 tx.coupon.update，也不触发 UserCoupon 核销', function () { return __awaiter(void 0, void 0, void 0, function () {
        var skus, prisma, svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    skus = [makeSku('s1', 'p1', 10, 100, 80, 60, '规格A', {})];
                    prisma = makePrisma({ skus: skus });
                    svc = makeService(prisma).svc;
                    return [4 /*yield*/, svc.createOrder('u1', orderDto())];
                case 1:
                    _a.sent();
                    (0, globals_1.expect)(prisma.__tx.coupon.update).not.toHaveBeenCalled();
                    (0, globals_1.expect)(prisma.userCoupon.findFirst).not.toHaveBeenCalled();
                    (0, globals_1.expect)(prisma.userCoupon.update).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用券下单且有未使用持券行：按主键 no 核销（status=used + usedAt/orderId/orderNo）', function () { return __awaiter(void 0, void 0, void 0, function () {
        var skus, now, coupon, prisma, svc, arg;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    skus = [makeSku('s1', 'p1', 10, 100, 80, 60, '规格A', {})];
                    now = Date.now();
                    coupon = {
                        id: 'c1',
                        status: 'active',
                        validFrom: new Date(now - 86400000),
                        validTo: new Date(now + 86400000),
                        merchantId: 'm1',
                        threshold: null,
                        perUserLimit: null,
                        scope: 'all',
                        scopeIds: [],
                        type: 'fullReduce',
                        amount: 50,
                        discountPercent: null,
                    };
                    prisma = makePrisma({ skus: skus, coupon: coupon });
                    prisma.userCoupon.findFirst = globals_1.jest.fn(function (_arg) { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, ({
                                    no: 'UC1',
                                    userId: 'u1',
                                    couponId: 'c1',
                                    status: 'unused',
                                })];
                        });
                    }); });
                    svc = makeService(prisma).svc;
                    return [4 /*yield*/, svc.createOrder('u1', orderDto({ couponId: 'c1' }))];
                case 1:
                    _a.sent();
                    (0, globals_1.expect)(prisma.userCoupon.update).toHaveBeenCalledTimes(1);
                    arg = prisma.userCoupon.update.mock.calls[0][0];
                    (0, globals_1.expect)(arg.where).toEqual({ no: 'UC1' });
                    (0, globals_1.expect)(arg.data.status).toBe('used');
                    (0, globals_1.expect)(arg.data.usedAt).toBeInstanceOf(Date);
                    (0, globals_1.expect)(arg.data.orderId).toBe('o1');
                    (0, globals_1.expect)(arg.data.orderNo).toBeTruthy();
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('UserMpService payOrder', function () {
    function makeOrder(status) {
        return { id: 'o1', no: 'O1', userId: 'u1', status: status, payAmount: 150 };
    }
    (0, globals_1.it)('订单状态非 pending_payment → ORDER_STATUS_INVALID(4001)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = makePrisma();
                    prisma.order = { findFirst: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, makeOrder('completed')];
                        }); }); }) };
                    svc = makeService(prisma).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.payOrder('u1', 'o1', 'wechat'); }, 4001)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('支付通道未就绪（isReady=false）→ BUSINESS_ERROR(1000)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, _a, svc, wxpay;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma = makePrisma();
                    prisma.order = { findFirst: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, makeOrder('pending_payment')];
                        }); }); }) };
                    _a = makeService(prisma), svc = _a.svc, wxpay = _a.wxpay;
                    wxpay.isReady.mockReturnValue(false);
                    return [4 /*yield*/, expectBizCode(function () { return svc.payOrder('u1', 'o1', 'wechat'); }, 1000)];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用户无 openid → INVALID_PARAMS(1001)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = makePrisma({ user: { id: 'u1', role: 'customer', openid: '' } });
                    prisma.order = { findFirst: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, makeOrder('pending_payment')];
                        }); }); }) };
                    svc = makeService(prisma).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.payOrder('u1', 'o1', 'wechat'); }, 1001)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('就绪 → 返回 { ok:true, miniPay }', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, svc, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = makePrisma();
                    prisma.order = { findFirst: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, makeOrder('pending_payment')];
                        }); }); }) };
                    svc = makeService(prisma).svc;
                    return [4 /*yield*/, svc.payOrder('u1', 'o1', 'wechat')];
                case 1:
                    res = _a.sent();
                    (0, globals_1.expect)(res.ok).toBe(true);
                    (0, globals_1.expect)(res.miniPay).toEqual({ appId: 'a' });
                    return [2 /*return*/];
            }
        });
    }); });
});
