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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserMpService = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var argon2 = require("argon2");
var biz_exception_1 = require("../../common/exceptions/biz.exception");
var pagination_util_1 = require("../../common/utils/pagination.util");
var decimal_util_1 = require("../../common/utils/decimal.util");
var id_util_1 = require("../../common/utils/id.util");
var internal_test_merchant_util_1 = require("../../common/utils/internal-test-merchant.util");
/** Haversine 公式：两点经纬度直线距离（km，保留两位小数） */
function haversineKm(lat1, lng1, lat2, lng2) {
    var R = 6371;
    var toRad = function (d) { return (d * Math.PI) / 180; };
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a = Math.pow(Math.sin(dLat / 2), 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.pow(Math.sin(dLng / 2), 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
}
var UserMpService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var UserMpService = _classThis = /** @class */ (function () {
        function UserMpService_1(prisma, wxpay, chat, contentSecurity) {
            this.prisma = prisma;
            this.wxpay = wxpay;
            this.chat = chat;
            this.contentSecurity = contentSecurity;
        }
        /** 生产环境不能因依赖装配异常而绕过内容审核。 */
        UserMpService_1.prototype.assertUserTextSafe = function (content, scene) {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!content.trim())
                                return [2 /*return*/];
                            if (!this.contentSecurity && process.env.NODE_ENV === 'production') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '内容安全服务未初始化，暂时无法提交内容');
                            }
                            return [4 /*yield*/, ((_a = this.contentSecurity) === null || _a === void 0 ? void 0 : _a.assertTextSafe(content, { scope: 'mall', scene: scene }))];
                        case 1:
                            _b.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        /** 顾客端对内部测试商户统一表现为“不存在”，不泄露测试环境标记。 */
        UserMpService_1.prototype.assertPublicMerchant = function (merchantId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, internal_test_merchant_util_1.isInternalTestMerchant)(this.prisma, merchantId)];
                        case 1:
                            if (_a.sent()) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '内容不存在');
                            }
                            return [2 /*return*/];
                    }
                });
            });
        };
        // ========== 用户资料（读写 + WS 实时多端同步） ==========
        UserMpService_1.prototype.profile = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var u;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findUnique({ where: { id: userId } })];
                        case 1:
                            u = _a.sent();
                            if (!u)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '用户不存在');
                            return [2 /*return*/, this.serializeUser(u)];
                    }
                });
            });
        };
        UserMpService_1.prototype.updateProfile = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var data, nickname, email, updated, payload;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            data = {};
                            if (!(typeof dto.nickname === 'string' && dto.nickname.trim())) return [3 /*break*/, 2];
                            nickname = dto.nickname.trim().slice(0, 32);
                            return [4 /*yield*/, this.assertUserTextSafe(nickname, 1)];
                        case 1:
                            _a.sent();
                            data.nickname = nickname;
                            _a.label = 2;
                        case 2:
                            if (typeof dto.avatar === 'string')
                                data.avatar = dto.avatar;
                            if (typeof dto.gender === 'number' && [0, 1, 2].includes(dto.gender))
                                data.gender = dto.gender;
                            if (typeof dto.email === 'string' && dto.email.trim()) {
                                email = dto.email.trim().toLowerCase();
                                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                                    throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '邮箱格式不正确');
                                }
                                data.email = email;
                            }
                            if (Object.keys(data).length === 0) {
                                return [2 /*return*/, this.profile(userId)];
                            }
                            return [4 /*yield*/, this.prisma.user.update({ where: { id: userId }, data: data })];
                        case 3:
                            updated = _a.sent();
                            payload = this.serializeUser(updated);
                            // 广播到该用户的所有在线设备（@WebSocketGateway 同 socket.io 房间）
                            this.chat.broadcastUserUpdate(userId, payload);
                            return [2 /*return*/, payload];
                    }
                });
            });
        };
        UserMpService_1.prototype.serializeUser = function (u) {
            return {
                id: u.id,
                openid: u.openid,
                phone: u.phone,
                email: u.email,
                nickname: u.nickname,
                avatar: u.avatar,
                gender: u.gender,
                role: u.role,
                status: u.status,
                createdAt: u.createdAt,
                updatedAt: u.updatedAt,
            };
        };
        // ========== 账号绑定（手机号 / 微信） ==========
        /**
         * 把手机号绑到当前登录用户上。
         *
         * 流程：
         *   1. 验证 SMS 验证码
         *   2. 检查该手机号是否被其他账号占用 → 占用则拒绝（前端可提示用户用手机号登录）
         *   3. 若当前账号已有手机号且不同 → 不允许覆盖（先解绑）
         *   4. 写入 phone，广播 WS user:update
         *
         * 主要场景：微信登录用户首次添加手机号
         */
        UserMpService_1.prototype.bindPhone = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var phone, code, rec, occupied, me, updated, payload;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            phone = String(dto.phone || '').trim();
                            code = String(dto.code || '').trim();
                            if (!/^1[3-9]\d{9}$/.test(phone))
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '手机号格式不正确');
                            if (!/^\d{4,6}$/.test(code))
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '验证码格式不正确');
                            return [4 /*yield*/, this.prisma.smsCode.findFirst({
                                    where: { phone: phone, code: code, used: false, expiresAt: { gt: new Date() } },
                                    orderBy: { createdAt: 'desc' },
                                })];
                        case 1:
                            rec = _a.sent();
                            if (!rec)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '验证码错误或已过期');
                            return [4 /*yield*/, this.prisma.user.findUnique({ where: { phone: phone } })];
                        case 2:
                            occupied = _a.sent();
                            if (occupied && occupied.id !== userId) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '该手机号已被其他账号绑定，请直接使用手机号登录');
                            }
                            return [4 /*yield*/, this.prisma.user.findUnique({ where: { id: userId } })];
                        case 3:
                            me = _a.sent();
                            if (!me)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '用户不存在');
                            if (me.phone && me.phone !== phone) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '当前账号已绑定其他手机号，请先解绑');
                            }
                            return [4 /*yield*/, this.prisma.smsCode.update({ where: { id: rec.id }, data: { used: true } })];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.user.update({
                                    where: { id: userId },
                                    data: { phone: phone },
                                })];
                        case 5:
                            updated = _a.sent();
                            payload = this.serializeUser(updated);
                            this.chat.broadcastUserUpdate(userId, payload);
                            return [2 /*return*/, payload];
                    }
                });
            });
        };
        /**
         * 把微信 OpenID 绑到当前登录用户上。
         *
         * 流程：
         *   1. 用 wxCode 调微信 jscode2session 换 openid（与 wechatLogin 一致）
         *   2. 检查该 openid 是否被其他账号占用 → 占用则拒绝
         *   3. 若当前账号已有 openid 且不同 → 不允许覆盖
         *   4. 写入 openid + unionid，广播 WS
         *
         * 主要场景：手机号登录用户首次绑定微信
         */
        UserMpService_1.prototype.bindWechat = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var appid, secret, isProd, openid, unionid, url, r, data, e_1, occupied, me, updated, payload;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(dto === null || dto === void 0 ? void 0 : dto.code))
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '微信 code 不能为空');
                            appid = process.env.WX_MINIAPP_APPID;
                            secret = process.env.WX_MINIAPP_SECRET;
                            isProd = process.env.NODE_ENV === 'production';
                            openid = null;
                            unionid = null;
                            if (!(appid && secret)) return [3 /*break*/, 6];
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 4, , 5]);
                            url = "https://api.weixin.qq.com/sns/jscode2session?appid=".concat(appid, "&secret=").concat(secret, "&js_code=").concat(encodeURIComponent(dto.code), "&grant_type=authorization_code");
                            return [4 /*yield*/, fetch(url, { method: 'GET' })];
                        case 2:
                            r = _a.sent();
                            return [4 /*yield*/, r.json()];
                        case 3:
                            data = _a.sent();
                            if ((data === null || data === void 0 ? void 0 : data.errcode) && data.errcode !== 0) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, "\u5FAE\u4FE1\u6388\u6743\u5931\u8D25\uFF1A".concat(data.errmsg || data.errcode));
                            }
                            if (data === null || data === void 0 ? void 0 : data.openid) {
                                openid = data.openid;
                                unionid = data.unionid || null;
                            }
                            return [3 /*break*/, 5];
                        case 4:
                            e_1 = _a.sent();
                            if (e_1 instanceof biz_exception_1.BizException)
                                throw e_1;
                            if (isProd) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '微信授权服务暂不可用，请稍后重试');
                            }
                            return [3 /*break*/, 5];
                        case 5: return [3 /*break*/, 7];
                        case 6:
                            if (isProd) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '服务端未配置微信小程序凭证，无法绑定微信');
                            }
                            _a.label = 7;
                        case 7:
                            if (!openid) {
                                if (isProd) {
                                    throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '微信授权失败，未获取到 openid');
                                }
                                openid = "dev_wx_".concat(String(dto.code).slice(0, 16));
                            }
                            return [4 /*yield*/, this.prisma.user.findUnique({ where: { openid: openid } })];
                        case 8:
                            occupied = _a.sent();
                            if (occupied && occupied.id !== userId) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '该微信号已被其他账号绑定，请直接使用微信登录');
                            }
                            return [4 /*yield*/, this.prisma.user.findUnique({ where: { id: userId } })];
                        case 9:
                            me = _a.sent();
                            if (!me)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '用户不存在');
                            if (me.openid && me.openid !== openid) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '当前账号已绑定其他微信，请先解绑');
                            }
                            return [4 /*yield*/, this.prisma.user.update({
                                    where: { id: userId },
                                    data: { openid: openid, unionid: unionid || undefined },
                                })];
                        case 10:
                            updated = _a.sent();
                            payload = this.serializeUser(updated);
                            this.chat.broadcastUserUpdate(userId, payload);
                            return [2 /*return*/, payload];
                    }
                });
            });
        };
        // ========== 商品 ==========
        /**
         * 商品列表查询。
         *
         * categoryId：
         *   - 传 L1 分类 ID：返回该 L1 下的所有商品（包含挂在 L1 的 + 挂在该 L1 任意 L2 子分类的）
         *   - 传 L2 分类 ID：只返回该 L2 下的商品
         *   - 不传：返回所有
         *
         * 实现：每次查询先把分类树展开一层，把当前节点 + 其直接子节点 ID 一起作为 `IN` 列表传 prisma。
         *
         * sort 排序字段（修复 P0-15 之前永远按 sales desc）：
         *   - 'price-asc'  → 价格升序（priceRetailMin asc）
         *   - 'price-desc' → 价格降序（priceRetailMin desc）
         *   - 'sales'      → 销量降序（默认行为，前端"综合"按钮）
         *   - 'newest'     → 上架时间倒序（createdAt desc）
         *   - 其他/未传    → 与 'sales' 一致（向后兼容）
         */
        UserMpService_1.prototype.listProducts = function (q) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, skip, take, page, pageSize, internalMerchantIds, where, kw, children, ids, sort, orderBy, _b, list, total;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(q), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            return [4 /*yield*/, (0, internal_test_merchant_util_1.getInternalTestMerchantIds)(this.prisma)
                                // 自动通过(auto_approved) = 已上架可售，与 active 等价对用户可见
                            ];
                        case 1:
                            internalMerchantIds = _c.sent();
                            where = { status: { in: ['active', 'auto_approved'] } };
                            if (q.keyword) {
                                kw = String(q.keyword).trim();
                                if (kw)
                                    where.name = { contains: kw, mode: 'insensitive' };
                            }
                            if (!q.categoryId) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.category.findMany({
                                    where: { parentId: q.categoryId },
                                    select: { id: true },
                                })];
                        case 2:
                            children = _c.sent();
                            ids = __spreadArray([q.categoryId], children.map(function (c) { return c.id; }), true);
                            where.categoryId = { in: ids };
                            _c.label = 3;
                        case 3:
                            if (q.merchantId) {
                                if (internalMerchantIds.includes(String(q.merchantId))) {
                                    return [2 /*return*/, (0, pagination_util_1.buildPage)([], 0, page, pageSize)];
                                }
                                where.merchantId = q.merchantId;
                            }
                            else if (internalMerchantIds.length) {
                                where.merchantId = { notIn: internalMerchantIds };
                            }
                            sort = String((q === null || q === void 0 ? void 0 : q.sort) || '').trim();
                            switch (sort) {
                                case 'price-asc':
                                    orderBy = { priceRetailMin: 'asc' };
                                    break;
                                case 'price-desc':
                                    orderBy = { priceRetailMin: 'desc' };
                                    break;
                                case 'newest':
                                    orderBy = { createdAt: 'desc' };
                                    break;
                                case 'sales':
                                default:
                                    orderBy = { sales: 'desc' };
                            }
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.product.findMany({ where: where, skip: skip, take: take, orderBy: orderBy }),
                                    this.prisma.product.count({ where: where }),
                                ])];
                        case 4:
                            _b = _c.sent(), list = _b[0], total = _b[1];
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(list.map(decimal_util_1.decimalToNumber), total, page, pageSize)];
                    }
                });
            });
        };
        /** 店铺搜索（按关键词模糊匹配店名） */
        UserMpService_1.prototype.searchShops = function (q) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, skip, take, page, pageSize, internalMerchantIds, where, kw, _b, list, total;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(q), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            return [4 /*yield*/, (0, internal_test_merchant_util_1.getInternalTestMerchantIds)(this.prisma)];
                        case 1:
                            internalMerchantIds = _c.sent();
                            where = { status: 'active' };
                            if (internalMerchantIds.length)
                                where.id = { notIn: internalMerchantIds };
                            kw = String(q.keyword || '').trim();
                            if (kw)
                                where.name = { contains: kw, mode: 'insensitive' };
                            if (q.type === 'factory' || q.type === 'store')
                                where.type = q.type;
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.merchant.findMany({
                                        where: where,
                                        skip: skip,
                                        take: take,
                                        orderBy: { totalGmv: 'desc' },
                                        select: {
                                            id: true,
                                            name: true,
                                            type: true,
                                            region: true,
                                            categories: true,
                                            totalGmv: true,
                                            status: true,
                                        },
                                    }),
                                    this.prisma.merchant.count({ where: where }),
                                ])];
                        case 2:
                            _b = _c.sent(), list = _b[0], total = _b[1];
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(list.map(function (m) { return ({
                                    id: m.id,
                                    name: m.name,
                                    type: m.type,
                                    region: m.region,
                                    categories: m.categories,
                                    gmv: Number(m.totalGmv || 0),
                                }); }), total, page, pageSize)];
                    }
                });
            });
        };
        UserMpService_1.prototype.productDetail = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var p;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.product.findUnique({ where: { id: id }, include: { skus: true } })];
                        case 1:
                            p = _a.sent();
                            if (!p)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '商品不存在');
                            return [4 /*yield*/, this.assertPublicMerchant(p.merchantId)];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, (0, decimal_util_1.decimalToNumber)(p)];
                    }
                });
            });
        };
        // ========== 分类 ==========
        UserMpService_1.prototype.listCategories = function () {
            return __awaiter(this, void 0, void 0, function () {
                var cats;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.category.findMany({
                                where: { type: 'platform' },
                                orderBy: { sort: 'asc' },
                            })];
                        case 1:
                            cats = _a.sent();
                            return [2 /*return*/, cats];
                    }
                });
            });
        };
        // ========== 订单 ==========
        UserMpService_1.prototype.listOrders = function (userId, q) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, skip, take, page, pageSize, where, internalMerchantIds, _b, list, total;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(q), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            where = { userId: userId };
                            return [4 /*yield*/, (0, internal_test_merchant_util_1.getInternalTestMerchantIds)(this.prisma)];
                        case 1:
                            internalMerchantIds = _c.sent();
                            if (internalMerchantIds.length)
                                where.merchantId = { notIn: internalMerchantIds };
                            if (q.status)
                                where.status = q.status;
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.order.findMany({
                                        where: where,
                                        skip: skip,
                                        take: take,
                                        orderBy: { createdAt: 'desc' },
                                        include: { items: true },
                                    }),
                                    this.prisma.order.count({ where: where }),
                                ])];
                        case 2:
                            _b = _c.sent(), list = _b[0], total = _b[1];
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(list.map(decimal_util_1.decimalToNumber), total, page, pageSize)];
                    }
                });
            });
        };
        UserMpService_1.prototype.orderDetail = function (userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var o, expiresIn, diff;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.order.findFirst({
                                where: { id: id, userId: userId },
                                include: { items: true, payments: true },
                            })];
                        case 1:
                            o = _a.sent();
                            if (!o)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '订单不存在');
                            return [4 /*yield*/, this.assertPublicMerchant(o.merchantId)
                                // expiresIn (秒) 计算 —— user-mp 待付款倒计时直接消费该字段
                                // 只在 pending_payment 状态下有意义，其他状态返回 null 避免误导
                            ];
                        case 2:
                            _a.sent();
                            expiresIn = null;
                            if (o.status === 'pending_payment' && o.expiresAt) {
                                diff = Math.floor((o.expiresAt.getTime() - Date.now()) / 1000);
                                expiresIn = diff > 0 ? diff : 0;
                            }
                            return [2 /*return*/, (0, decimal_util_1.decimalToNumber)(__assign(__assign({}, o), { expiresIn: expiresIn }))];
                    }
                });
            });
        };
        UserMpService_1.prototype.createOrder = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var rawItems, normItems, shippingMethod, couponId, remark, address, skuIds, skus, merchantSet, _i, skus_1, sku, merchantId, blacklistCfg, myTier, shopRule, tierStrategy, pickUnitPrice, totalAmount, orderItemsData, shippingFee, couponDiscount, coupon_1, now, threshold, userUsedCount, productIds, matched, products, raw, ratio, clamped, offRate, payAmount, order, free, _a;
                var _this = this;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            rawItems = dto.items || dto.lines || [];
                            if (!Array.isArray(rawItems) || rawItems.length === 0) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '缺少订单项');
                            }
                            normItems = rawItems.map(function (it) {
                                var _a, _b;
                                return ({
                                    skuId: it.skuId,
                                    productId: it.productId,
                                    quantity: Number((_b = (_a = it.quantity) !== null && _a !== void 0 ? _a : it.qty) !== null && _b !== void 0 ? _b : 1),
                                    bySize: it.bySize,
                                });
                            });
                            shippingMethod = dto.shippingMethod || dto.shipping || 'factory';
                            couponId = typeof dto.couponId === 'string' && dto.couponId ? dto.couponId : null;
                            remark = typeof dto.remark === 'string' ? dto.remark.trim().slice(0, 500) : '';
                            return [4 /*yield*/, this.assertUserTextSafe(remark, 2)];
                        case 1:
                            _c.sent();
                            if (!dto.addressId)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '缺少收货地址');
                            return [4 /*yield*/, this.prisma.address.findFirst({ where: { id: dto.addressId, userId: userId } })];
                        case 2:
                            address = _c.sent();
                            if (!address)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '地址不存在');
                            skuIds = normItems.map(function (i) { return i.skuId; });
                            return [4 /*yield*/, this.prisma.sku.findMany({
                                    where: { id: { in: skuIds } },
                                    include: { product: true },
                                })];
                        case 3:
                            skus = _c.sent();
                            if (skus.length !== normItems.length)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '部分 SKU 不存在');
                            merchantSet = new Set();
                            for (_i = 0, skus_1 = skus; _i < skus_1.length; _i++) {
                                sku = skus_1[_i];
                                merchantSet.add(sku.product.merchantId);
                            }
                            if (merchantSet.size === 0) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '部分 SKU 不存在');
                            }
                            if (merchantSet.size > 1) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '不支持跨商户合并下单，请分别下单');
                            }
                            merchantId = Array.from(merchantSet)[0];
                            return [4 /*yield*/, this.assertPublicMerchant(merchantId)
                                // ===== 价格分级解析（资金安全 P0）=====
                                // 之前固定按 sku.priceRetail 计价，会让会员/代理客户被收原价；同时未校验店铺规则
                                // (是否允许游客购买 / 是否禁卖 / 是否拉黑该客户)。
                                //
                                // 修复后链路：
                                //   1. 买家在该店铺被商家拉黑 → 直接 FORBIDDEN
                                //   2. 取 buyer 在该店的 tier（myTierInShop：customer/member/agency/guest）
                                //   3. 取店铺级 priceRule（guestAllow/customerPrice/agencyPrice/memberPrice）
                                //   4. guest=guestAllow=false → 拒绝
                                //   5. 任意 tier 的价格策略 == 'hidden' → 拒绝（隐藏价格意味着不可下单）
                                //   6. 按 tier→strategy 映射出 'retail' | 'wholesale' | 'member'，
                                //      最终选 sku.priceRetail / priceWholesale / priceMember 作为成交价
                                //
                                // 由此商家在「客户管理」给某买家标 agency，并把店铺规则设置成 agencyPrice=wholesale
                                // 后，该客户下单实际入账金额会按 priceWholesale 计算，不再是 priceRetail。
                            ];
                        case 4:
                            _c.sent();
                            return [4 /*yield*/, this.prisma.systemConfig.findUnique({
                                    where: { key: "merchant:".concat(merchantId, ":blacklist:").concat(userId) },
                                })];
                        case 5:
                            blacklistCfg = _c.sent();
                            if (!!((_b = blacklistCfg === null || blacklistCfg === void 0 ? void 0 : blacklistCfg.value) === null || _b === void 0 ? void 0 : _b.blocked)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '抱歉，您已被该店铺加入黑名单，无法下单');
                            }
                            return [4 /*yield*/, this.myTierInShop(userId, merchantId)];
                        case 6:
                            myTier = (_c.sent()).myTier;
                            return [4 /*yield*/, this.shopPriceRule(merchantId)];
                        case 7:
                            shopRule = _c.sent();
                            if (myTier === 'guest' && shopRule.guestAllow === false) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '该店铺不对游客开放，请先登录');
                            }
                            tierStrategy = myTier === 'member'
                                ? shopRule.memberPrice || 'member'
                                : myTier === 'agency'
                                    ? shopRule.agencyPrice || 'wholesale'
                                    : shopRule.customerPrice || 'retail';
                            if (tierStrategy === 'hidden') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '该店铺禁止当前身份直接下单，请联系商家');
                            }
                            pickUnitPrice = function (sku) {
                                if (tierStrategy === 'wholesale')
                                    return Number(sku.priceWholesale);
                                if (tierStrategy === 'member')
                                    return Number(sku.priceMember);
                                return Number(sku.priceRetail);
                            };
                            totalAmount = 0;
                            orderItemsData = normItems.map(function (it) {
                                var _a, _b;
                                var sku = skus.find(function (s) { return s.id === it.skuId; });
                                if (sku.stock < it.quantity)
                                    throw new biz_exception_1.BizException(biz_exception_1.BizCode.STOCK_INSUFFICIENT, "".concat(sku.product.name, " \u5E93\u5B58\u4E0D\u8DB3"));
                                var unitPrice;
                                var specsLabel = sku.specsLabel;
                                if (sku.product.pricingMode === 'by-size') {
                                    // 按尺寸定价：成交价一律服务端按"面积 × 单价 + 基础费"重算，绝不信前端金额；
                                    // 同时把用户定制尺寸写进 specsLabel 持久化，避免下单后查不到要做多大。
                                    var length_1 = Number((_a = it.bySize) === null || _a === void 0 ? void 0 : _a.length);
                                    var width = Number((_b = it.bySize) === null || _b === void 0 ? void 0 : _b.width);
                                    if (!(length_1 > 0) || !(width > 0)) {
                                        throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, "".concat(sku.product.name, " \u8BF7\u586B\u5199\u5B9A\u5236\u5C3A\u5BF8"));
                                    }
                                    var p = sku.product;
                                    if ((p.minLength != null && length_1 < Number(p.minLength)) ||
                                        (p.maxLength != null && length_1 > Number(p.maxLength)) ||
                                        (p.minWidth != null && width < Number(p.minWidth)) ||
                                        (p.maxWidth != null && width > Number(p.maxWidth))) {
                                        throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, "".concat(sku.product.name, " \u5B9A\u5236\u5C3A\u5BF8\u8D85\u51FA\u53EF\u5236\u4F5C\u8303\u56F4"));
                                    }
                                    var toM = p.sizeUnit === 'cm' ? 0.01 : 1; // 统一换算到米后算平方米
                                    var areaSqm = length_1 * toM * (width * toM);
                                    unitPrice =
                                        Math.round((areaSqm * Number(p.pricePerSqm || 0) + Number(p.baseFee || 0)) * 100) / 100;
                                    specsLabel = "\u5B9A\u5236 ".concat(length_1, "\u00D7").concat(width).concat(p.sizeUnit || '', "\uFF08").concat(areaSqm.toFixed(2), "\u33A1\uFF09");
                                    if (!(unitPrice > 0)) {
                                        throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, "".concat(sku.product.name, " \u5B9A\u5236\u4EF7\u683C\u8BA1\u7B97\u5F02\u5E38\uFF0C\u8BF7\u8054\u7CFB\u5546\u5BB6"));
                                    }
                                }
                                else {
                                    unitPrice = pickUnitPrice(sku);
                                    if (!(unitPrice > 0)) {
                                        // 价格异常（如商家未填该 tier 的价格、价格为 0/NaN）一律拒单，绝不按 0 元成交
                                        throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, "".concat(sku.product.name, " \u5F53\u524D\u8EAB\u4EFD\u6682\u65E0\u53EF\u7528\u4EF7\u683C\uFF0C\u8BF7\u8054\u7CFB\u5546\u5BB6"));
                                    }
                                }
                                totalAmount += unitPrice * it.quantity;
                                return {
                                    productId: sku.productId,
                                    skuId: sku.id,
                                    productName: sku.product.name,
                                    productImage: sku.product.images[0] || '',
                                    specsLabel: specsLabel,
                                    unitPrice: unitPrice,
                                    quantity: it.quantity,
                                };
                            });
                            shippingFee = Number.isFinite(Number(dto.shippingFee))
                                ? Math.max(0, Number(dto.shippingFee))
                                : 0;
                            couponDiscount = 0;
                            if (!couponId) return [3 /*break*/, 17];
                            return [4 /*yield*/, this.prisma.coupon.findUnique({ where: { id: couponId } })];
                        case 8:
                            coupon_1 = _c.sent();
                            if (!coupon_1) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '优惠券不存在');
                            }
                            if (coupon_1.status !== 'active') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '优惠券未启用或已下架');
                            }
                            now = new Date();
                            if (coupon_1.validFrom > now || coupon_1.validTo < now) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '优惠券不在有效期内');
                            }
                            if (coupon_1.merchantId !== merchantId) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '该优惠券不适用于本商品');
                            }
                            threshold = coupon_1.threshold ? Number(coupon_1.threshold) : 0;
                            if (threshold > 0 && totalAmount < threshold) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, "\u8BA2\u5355\u91D1\u989D\u9700\u6EE1 ".concat(threshold, " \u5143\u624D\u53EF\u4F7F\u7528\u8BE5\u4F18\u60E0\u5238"));
                            }
                            if (!(coupon_1.perUserLimit && coupon_1.perUserLimit > 0)) return [3 /*break*/, 10];
                            return [4 /*yield*/, this.prisma.order.count({
                                    where: { userId: userId, couponId: coupon_1.id, status: { not: 'cancelled' } },
                                })];
                        case 9:
                            userUsedCount = _c.sent();
                            if (userUsedCount >= coupon_1.perUserLimit) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '该券已超出每人使用次数');
                            }
                            _c.label = 10;
                        case 10:
                            if (!(coupon_1.scope &&
                                coupon_1.scope !== 'all' &&
                                Array.isArray(coupon_1.scopeIds) &&
                                coupon_1.scopeIds.length > 0)) return [3 /*break*/, 16];
                            productIds = Array.from(new Set(skus.map(function (s) { return s.productId; })));
                            matched = false;
                            if (!(coupon_1.scope === 'product')) return [3 /*break*/, 11];
                            matched = productIds.some(function (pid) { return coupon_1.scopeIds.includes(pid); });
                            return [3 /*break*/, 15];
                        case 11:
                            if (!(coupon_1.scope === 'merchant')) return [3 /*break*/, 12];
                            matched = coupon_1.scopeIds.includes(merchantId);
                            return [3 /*break*/, 15];
                        case 12:
                            if (!(coupon_1.scope === 'category')) return [3 /*break*/, 14];
                            return [4 /*yield*/, this.prisma.product.findMany({
                                    where: { id: { in: productIds } },
                                    select: { categoryId: true },
                                })];
                        case 13:
                            products = _c.sent();
                            matched = products.some(function (p) { return p.categoryId && coupon_1.scopeIds.includes(p.categoryId); });
                            return [3 /*break*/, 15];
                        case 14:
                            // 未知 scope 取保守策略：不允许使用
                            matched = false;
                            _c.label = 15;
                        case 15:
                            if (!matched) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '该券不适用于当前订单');
                            }
                            _c.label = 16;
                        case 16:
                            if (coupon_1.type === 'fullReduce' || coupon_1.type === 'fixed') {
                                couponDiscount = coupon_1.amount ? Number(coupon_1.amount) : 0;
                            }
                            else if (coupon_1.type === 'discount' && typeof coupon_1.discountPercent === 'number') {
                                raw = Number(coupon_1.discountPercent);
                                ratio = raw > 1 ? raw / 100 : raw;
                                clamped = Math.max(0, Math.min(1, ratio));
                                offRate = 1 - clamped;
                                couponDiscount = Math.round(totalAmount * offRate * 100) / 100;
                            }
                            if (couponDiscount > totalAmount)
                                couponDiscount = totalAmount;
                            _c.label = 17;
                        case 17:
                            payAmount = Math.max(0, totalAmount + shippingFee - couponDiscount);
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var created, _loop_1, _i, normItems_1, it_1;
                                    var _a, _b;
                                    return __generator(this, function (_c) {
                                        switch (_c.label) {
                                            case 0: return [4 /*yield*/, tx.order.create({
                                                    data: {
                                                        no: (0, id_util_1.orderNo)(),
                                                        userId: userId,
                                                        merchantId: merchantId,
                                                        totalAmount: totalAmount,
                                                        shippingFee: shippingFee,
                                                        payAmount: payAmount,
                                                        shippingMethod: shippingMethod,
                                                        address: address,
                                                        remark: remark || null,
                                                        couponId: couponId,
                                                        couponDiscount: couponDiscount > 0 ? couponDiscount : null,
                                                        expiresAt: new Date(Date.now() + 30 * 60000),
                                                        items: { create: orderItemsData },
                                                    },
                                                })];
                                            case 1:
                                                created = _c.sent();
                                                _loop_1 = function (it_1) {
                                                    var dec, cur;
                                                    return __generator(this, function (_d) {
                                                        switch (_d.label) {
                                                            case 0: return [4 /*yield*/, tx.sku.updateMany({
                                                                    where: { id: it_1.skuId, stock: { gte: it_1.quantity } },
                                                                    data: { stock: { decrement: it_1.quantity } },
                                                                })];
                                                            case 1:
                                                                dec = _d.sent();
                                                                if (dec.count === 0) {
                                                                    cur = skus.find(function (s) { return s.id === it_1.skuId; });
                                                                    throw new biz_exception_1.BizException(biz_exception_1.BizCode.STOCK_INSUFFICIENT, "".concat((_b = (_a = cur === null || cur === void 0 ? void 0 : cur.product) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : '商品', " \u5E93\u5B58\u4E0D\u8DB3"));
                                                                }
                                                                return [2 /*return*/];
                                                        }
                                                    });
                                                };
                                                _i = 0, normItems_1 = normItems;
                                                _c.label = 2;
                                            case 2:
                                                if (!(_i < normItems_1.length)) return [3 /*break*/, 5];
                                                it_1 = normItems_1[_i];
                                                return [5 /*yield**/, _loop_1(it_1)];
                                            case 3:
                                                _c.sent();
                                                _c.label = 4;
                                            case 4:
                                                _i++;
                                                return [3 /*break*/, 2];
                                            case 5:
                                                if (!couponId) return [3 /*break*/, 7];
                                                return [4 /*yield*/, tx.coupon.update({
                                                        where: { id: couponId },
                                                        data: { used: { increment: 1 } },
                                                    })];
                                            case 6:
                                                _c.sent();
                                                _c.label = 7;
                                            case 7: return [2 /*return*/, created];
                                        }
                                    });
                                }); })
                                // 标记该券为"已使用"（best-effort，失败不影响下单）：取该用户这张券最早领取的
                                // 一条未使用 UserCoupon 行，按主键 no 核销（status='used' + usedAt/orderId/orderNo），
                                // 使「我的优惠券 · 已使用」tab 正确显示
                                // （之前只递增 Coupon.used，从不写 per-user 核销，导致已使用列表永远为空）。
                            ];
                        case 18:
                            order = _c.sent();
                            if (!couponId) return [3 /*break*/, 24];
                            _c.label = 19;
                        case 19:
                            _c.trys.push([19, 23, , 24]);
                            return [4 /*yield*/, this.prisma.userCoupon.findFirst({
                                    where: { userId: userId, couponId: couponId, status: 'unused' },
                                    orderBy: { claimedAt: 'asc' },
                                })];
                        case 20:
                            free = _c.sent();
                            if (!free) return [3 /*break*/, 22];
                            return [4 /*yield*/, this.prisma.userCoupon.update({
                                    where: { no: free.no },
                                    data: { status: 'used', usedAt: new Date(), orderId: order.id, orderNo: order.no },
                                })];
                        case 21:
                            _c.sent();
                            _c.label = 22;
                        case 22: return [3 /*break*/, 24];
                        case 23:
                            _a = _c.sent();
                            return [3 /*break*/, 24];
                        case 24:
                            // fire-and-forget WS 推送：商家端 useMerchantNotifyStream 订阅 'order:new'
                            // 推送失败绝不能影响订单创建主流程，所以裹一层 try/catch
                            try {
                                this.chat.emitOrderNew(merchantId, {
                                    id: order.id,
                                    no: order.no,
                                    merchantId: merchantId,
                                    totalAmount: Number(order.totalAmount),
                                    payAmount: Number(order.payAmount),
                                    itemsCount: orderItemsData.reduce(function (s, it) { return s + it.quantity; }, 0),
                                    status: order.status,
                                    createdAt: order.createdAt,
                                });
                            }
                            catch (_d) {
                                // already wrapped in gateway; 这里防御性兜底
                            }
                            return [2 /*return*/, { orderId: order.id, orderNo: order.no, payAmount: Number(order.payAmount) }];
                    }
                });
            });
        };
        /**
         * 用户发起支付：
         *   - method='wechat'（默认/唯一）：调微信支付 JSAPI 拿 prepay 参数，前端用 uni.requestPayment 调起
         *
         * 真正"付款成功"的标记由微信回调 /api/v1/payments/wechat/notify 触发；
         * 这个接口只负责"准备付款参数"。
         *
         * 严格安全策略（资金 P0）：
         *   - 不分环境：微信支付未配置(`wxpay.isReady()=false`) → 一律 BizException 拒绝。
         *   - 严禁任何 mockPaid 路径把订单标已付。开发期商家想本地联调请配真实沙箱凭证。
         *   - openid 缺失 → 拒绝，避免在 wxpay 这一层才抛底层错。
         */
        UserMpService_1.prototype.payOrder = function (userId, id, _method) {
            return __awaiter(this, void 0, void 0, function () {
                var o, user, openid, pay, e_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.order.findFirst({ where: { id: id, userId: userId } })];
                        case 1:
                            o = _a.sent();
                            if (!o)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '订单不存在');
                            return [4 /*yield*/, this.assertPublicMerchant(o.merchantId)];
                        case 2:
                            _a.sent();
                            if (o.status !== 'pending_payment') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.ORDER_STATUS_INVALID, '订单状态不允许支付');
                            }
                            return [4 /*yield*/, this.prisma.user.findUnique({ where: { id: userId } })];
                        case 3:
                            user = _a.sent();
                            openid = (user === null || user === void 0 ? void 0 : user.openid) || '';
                            // 商户号未配齐 → 立刻拒绝，运维需配齐 WX_PAY_* 环境变量
                            if (!this.wxpay.isReady()) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '未配置支付通道，请联系运维配置微信支付');
                            }
                            if (!openid) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '当前账号未绑定微信，请先绑定微信后再支付');
                            }
                            _a.label = 4;
                        case 4:
                            _a.trys.push([4, 6, , 7]);
                            return [4 /*yield*/, this.wxpay.createMiniPay({
                                    outTradeNo: o.no,
                                    description: "\u8BA2\u5355 ".concat(o.no),
                                    totalFen: Math.round(Number(o.payAmount) * 100),
                                    openid: openid,
                                    attach: o.id,
                                })];
                        case 5:
                            pay = _a.sent();
                            return [3 /*break*/, 7];
                        case 6:
                            e_2 = _a.sent();
                            throw new biz_exception_1.BizException(biz_exception_1.BizCode.PAY_FAILED, "\u5FAE\u4FE1\u652F\u4ED8\u4E0B\u5355\u5931\u8D25\uFF1A".concat((e_2 === null || e_2 === void 0 ? void 0 : e_2.message) || e_2));
                        case 7: return [2 /*return*/, { ok: true, miniPay: pay }];
                    }
                });
            });
        };
        UserMpService_1.prototype.confirmOrder = function (userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var o, completedAt;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.order.findFirst({ where: { id: id, userId: userId } })];
                        case 1:
                            o = _a.sent();
                            if (!o)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '订单不存在');
                            return [4 /*yield*/, this.assertPublicMerchant(o.merchantId)];
                        case 2:
                            _a.sent();
                            if (o.status !== 'shipped')
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.ORDER_STATUS_INVALID, '订单尚未发货');
                            completedAt = new Date();
                            return [4 /*yield*/, this.prisma.order.update({
                                    where: { id: o.id },
                                    data: { status: 'completed', completedAt: completedAt },
                                })];
                        case 3:
                            _a.sent();
                            try {
                                this.chat.emitOrderUpdate(o.merchantId, {
                                    orderId: o.id,
                                    no: o.no,
                                    status: 'completed',
                                    updatedAt: completedAt,
                                });
                            }
                            catch (_b) { }
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        /**
         * 用户发起售后/退款（功能残缺 P0-13）
         *
         * 之前用户端的售后弹窗仅前端 toast 假装成功，订单状态从来没改成 after_sale，
         * 商家也收不到售后单 —— 整条售后链路是断的。
         *
         * 现在实现：
         *   1. 校验订单存在 + 归属 + 状态可发起售后（已付/已发/已完成都允许）
         *   2. 校验申请金额合法（必须 > 0 且 ≤ 实付金额）
         *   3. 在一个事务里：
         *      - 创建 Refund 记录 status=pending
         *      - 把 Order.status 设为 'after_sale'（先存一个原状态用于商家拒单后回滚）
         *   4. fire-and-forget 推商家"新售后单"通知
         *
         * 注：Refund 需要 orderItemId，schema 是 1:1 关联 OrderItem。
         * 单订单含多 SKU 时，用户实际想退指定行；前端 dto.orderItemId 显式传时按显式来，
         * 否则取订单第一条 item 兜底（更精细的"逐行退款"可后续扩展为多条 Refund）。
         */
        UserMpService_1.prototype.refundOrder = function (userId, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var reason, o, allowedStatus, target, found, payAmount, applyAmount, dup, refundType, result;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            reason = String((dto === null || dto === void 0 ? void 0 : dto.reason) || '').trim();
                            if (!reason)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请填写售后原因');
                            return [4 /*yield*/, this.prisma.order.findFirst({
                                    where: { id: id, userId: userId },
                                    include: { items: true },
                                })];
                        case 1:
                            o = _a.sent();
                            if (!o)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '订单不存在');
                            return [4 /*yield*/, this.assertPublicMerchant(o.merchantId)];
                        case 2:
                            _a.sent();
                            allowedStatus = ['pending_shipment', 'shipped', 'completed'];
                            if (!allowedStatus.includes(o.status)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.ORDER_STATUS_INVALID, '当前订单状态不允许发起售后（仅已付款/已发货/已完成订单可申请）');
                            }
                            if (!o.items || o.items.length === 0) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '订单缺少商品项，无法发起售后');
                            }
                            target = o.items[0];
                            if (dto === null || dto === void 0 ? void 0 : dto.orderItemId) {
                                found = o.items.find(function (it) { return it.id === dto.orderItemId; });
                                if (!found)
                                    throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '指定订单项不存在');
                                target = found;
                            }
                            payAmount = Number(o.payAmount);
                            applyAmount = typeof (dto === null || dto === void 0 ? void 0 : dto.amount) === 'number' && !Number.isNaN(dto.amount) ? Number(dto.amount) : payAmount;
                            if (!(applyAmount > 0)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '退款金额必须大于 0');
                            }
                            if (applyAmount > payAmount) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '退款金额不能超过订单实付金额');
                            }
                            return [4 /*yield*/, this.prisma.refund.findFirst({
                                    where: { orderId: o.id, status: { in: ['pending', 'agreed', 'in_progress'] } },
                                    select: { id: true, status: true },
                                })];
                        case 3:
                            dup = _a.sent();
                            if (dup) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.CONFLICT, '该订单已有进行中的售后单，请勿重复提交');
                            }
                            refundType = (dto === null || dto === void 0 ? void 0 : dto.type) === 'refund_only' ? 'refund_only' : 'refund_with_return';
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var refund;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, tx.refund.create({
                                                    data: {
                                                        no: (0, id_util_1.refundNo)(),
                                                        orderId: o.id,
                                                        orderItemId: target.id,
                                                        userId: o.userId,
                                                        merchantId: o.merchantId,
                                                        type: refundType,
                                                        reason: reason,
                                                        description: (dto === null || dto === void 0 ? void 0 : dto.description) ? String(dto.description).slice(0, 500) : null,
                                                        evidence: Array.isArray(dto === null || dto === void 0 ? void 0 : dto.evidence)
                                                            ? dto.evidence.filter(function (x) { return typeof x === 'string'; }).slice(0, 9)
                                                            : [],
                                                        applyAmount: applyAmount,
                                                        status: 'pending',
                                                    },
                                                })];
                                            case 1:
                                                refund = _a.sent();
                                                return [4 /*yield*/, tx.order.update({
                                                        where: { id: o.id },
                                                        data: { status: 'after_sale' },
                                                    })];
                                            case 2:
                                                _a.sent();
                                                return [2 /*return*/, refund];
                                        }
                                    });
                                }); })
                                // 商家端 WS 实时推
                            ];
                        case 4:
                            result = _a.sent();
                            // 商家端 WS 实时推
                            try {
                                this.chat.emitRefundNew(o.merchantId, {
                                    refundId: result.id,
                                    no: result.no,
                                    orderId: o.id,
                                    orderNo: o.no,
                                    status: 'pending',
                                    applyAmount: applyAmount,
                                    reason: reason,
                                    createdAt: result.createdAt,
                                });
                            }
                            catch (_b) { }
                            return [2 /*return*/, { ok: true, refundId: result.id, refundNo: result.no, status: 'pending' }];
                    }
                });
            });
        };
        UserMpService_1.prototype.cancelOrder = function (userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var o, cancelledAt;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.order.findFirst({
                                where: { id: id, userId: userId },
                                include: { items: true },
                            })];
                        case 1:
                            o = _a.sent();
                            if (!o)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '订单不存在');
                            return [4 /*yield*/, this.assertPublicMerchant(o.merchantId)];
                        case 2:
                            _a.sent();
                            if (!['pending_payment', 'pending_shipment'].includes(o.status)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.ORDER_STATUS_INVALID, '当前状态不允许取消');
                            }
                            cancelledAt = new Date();
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var _i, _a, it_2;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0: return [4 /*yield*/, tx.order.update({
                                                    where: { id: o.id },
                                                    data: { status: 'cancelled', cancelledAt: cancelledAt },
                                                })];
                                            case 1:
                                                _b.sent();
                                                _i = 0, _a = o.items;
                                                _b.label = 2;
                                            case 2:
                                                if (!(_i < _a.length)) return [3 /*break*/, 5];
                                                it_2 = _a[_i];
                                                return [4 /*yield*/, tx.sku.update({
                                                        where: { id: it_2.skuId },
                                                        data: { stock: { increment: it_2.quantity } },
                                                    })];
                                            case 3:
                                                _b.sent();
                                                _b.label = 4;
                                            case 4:
                                                _i++;
                                                return [3 /*break*/, 2];
                                            case 5: return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 3:
                            _a.sent();
                            try {
                                this.chat.emitOrderUpdate(o.merchantId, {
                                    orderId: o.id,
                                    no: o.no,
                                    status: 'cancelled',
                                    updatedAt: cancelledAt,
                                });
                            }
                            catch (_b) { }
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        /**
         * 催发货
         *
         * 真实实现：
         *   1. 校验订单存在且状态在【待发货】，避免无意义催单
         *   2. 同一订单 30 分钟内只允许催 1 次（写在 SystemConfig 简单去重）
         *   3. 通过商家会话给商家发一条文本提醒（直接落 ChatMessage，前端商家端可见）
         *
         * 全部走真实持久化，无 mock。
         */
        UserMpService_1.prototype.urgeOrder = function (userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var o, dedupKey, prior, lastAt, session;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.order.findFirst({ where: { id: id, userId: userId } })];
                        case 1:
                            o = _b.sent();
                            if (!o)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '订单不存在');
                            return [4 /*yield*/, this.assertPublicMerchant(o.merchantId)];
                        case 2:
                            _b.sent();
                            if (o.status !== 'pending_shipment') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.ORDER_STATUS_INVALID, '订单当前状态无需催发货');
                            }
                            dedupKey = "urge:order:".concat(id);
                            return [4 /*yield*/, this.prisma.systemConfig.findUnique({ where: { key: dedupKey } })];
                        case 3:
                            prior = _b.sent();
                            lastAt = ((_a = prior === null || prior === void 0 ? void 0 : prior.value) === null || _a === void 0 ? void 0 : _a.lastAt) ? new Date((prior === null || prior === void 0 ? void 0 : prior.value).lastAt) : null;
                            if (lastAt && Date.now() - lastAt.getTime() < 30 * 60000) {
                                return [2 /*return*/, { ok: true, urged: true, dedup: true }];
                            }
                            return [4 /*yield*/, this.prisma.systemConfig.upsert({
                                    where: { key: dedupKey },
                                    update: { value: { lastAt: new Date().toISOString(), userId: userId } },
                                    create: { key: dedupKey, value: { lastAt: new Date().toISOString(), userId: userId } },
                                })
                                // 给商家发一条催发货消息（若没有会话则建一个）
                            ];
                        case 4:
                            _b.sent();
                            return [4 /*yield*/, this.ensureChatSession(userId, o.merchantId)];
                        case 5:
                            session = _b.sent();
                            return [4 /*yield*/, this.chatSend(userId, session.id, 'text', "\u7528\u6237\u50AC\u53D1\u8D27\uFF1A\u8BA2\u5355 ".concat(o.no))];
                        case 6:
                            _b.sent();
                            return [2 /*return*/, { ok: true, urged: true, dedup: false }];
                    }
                });
            });
        };
        // ========== Banner ==========
        UserMpService_1.prototype.banners = function () {
            return __awaiter(this, void 0, void 0, function () {
                var v;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.systemConfig.findUnique({ where: { key: 'banners' } })];
                        case 1:
                            v = _a.sent();
                            return [2 /*return*/, (v === null || v === void 0 ? void 0 : v.value) || []];
                    }
                });
            });
        };
        // ========== 热搜词 ==========
        /**
         * 用户端搜索页 hot-keywords 接口
         *
         * 优先从 SystemConfig key='hot_keywords' 读管理员配置（value 接受字符串数组
         * 或 { list: string[] } 两种 shape，兼容前后端约定差异），否则返回内置兜底词。
         *
         * 返回纯 string[]，前端 take(N) 自行截断。
         */
        UserMpService_1.prototype.hotKeywords = function () {
            return __awaiter(this, void 0, void 0, function () {
                var DEFAULTS, cfg, raw, list, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            DEFAULTS = ['咖啡', '奶茶', '螺蛳粉', '面包', '烧烤', '水果', '蔬菜', '早餐'];
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.prisma.systemConfig.findUnique({ where: { key: 'hot_keywords' } })];
                        case 2:
                            cfg = _b.sent();
                            raw = cfg === null || cfg === void 0 ? void 0 : cfg.value;
                            list = [];
                            if (Array.isArray(raw))
                                list = raw;
                            else if (raw && Array.isArray(raw.list))
                                list = raw.list;
                            list = list.filter(function (k) { return typeof k === 'string' && k.trim(); }).map(function (k) { return k.trim(); });
                            if (list.length > 0)
                                return [2 /*return*/, list];
                            return [3 /*break*/, 4];
                        case 3:
                            _a = _b.sent();
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/, DEFAULTS];
                    }
                });
            });
        };
        // ========== 地址 ==========
        /**
         * 校验 token 中的 userId 在 DB 仍存在（数据库 reseed 后旧 token 会指向已删除的用户）。
         * 不存在时抛 TOKEN_EXPIRED（code=2002），前端会清 token 跳登录页。
         */
        UserMpService_1.prototype.assertUserExists = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var u;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } })];
                        case 1:
                            u = _a.sent();
                            if (!u)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.TOKEN_EXPIRED, '登录状态已失效，请重新登录');
                            return [2 /*return*/, u];
                    }
                });
            });
        };
        /** 地址字段白名单（防止前端误传 id/userId/createdAt 等保留字段触发 Prisma 错误） */
        UserMpService_1.prototype.sanitizeAddressDto = function (dto) {
            var _a, _b, _c, _d;
            var name = String((_a = dto === null || dto === void 0 ? void 0 : dto.name) !== null && _a !== void 0 ? _a : '').trim();
            var phone = String((_b = dto === null || dto === void 0 ? void 0 : dto.phone) !== null && _b !== void 0 ? _b : '').trim();
            var region = String((_c = dto === null || dto === void 0 ? void 0 : dto.region) !== null && _c !== void 0 ? _c : '').trim();
            var detail = String((_d = dto === null || dto === void 0 ? void 0 : dto.detail) !== null && _d !== void 0 ? _d : '').trim();
            var isDefault = Boolean(dto === null || dto === void 0 ? void 0 : dto.isDefault);
            if (!name || !phone || !region || !detail) {
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请填写完整的收货地址（姓名/手机号/地区/详细地址）');
            }
            if (!/^1[3-9]\d{9}$/.test(phone)) {
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '手机号格式不正确');
            }
            return { name: name, phone: phone, region: region, detail: detail, isDefault: isDefault };
        };
        UserMpService_1.prototype.listAddresses = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.assertUserExists(userId)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, this.prisma.address.findMany({
                                    where: { userId: userId },
                                    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
                                })];
                    }
                });
            });
        };
        UserMpService_1.prototype.defaultAddress = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var a, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.assertUserExists(userId)];
                        case 1:
                            _b.sent();
                            return [4 /*yield*/, this.prisma.address.findFirst({ where: { userId: userId, isDefault: true } })];
                        case 2:
                            a = _b.sent();
                            _a = a;
                            if (_a) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.prisma.address.findFirst({ where: { userId: userId }, orderBy: { createdAt: 'desc' } })];
                        case 3:
                            _a = (_b.sent());
                            _b.label = 4;
                        case 4: return [2 /*return*/, (_a)];
                    }
                });
            });
        };
        UserMpService_1.prototype.createAddress = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.assertUserExists(userId)];
                        case 1:
                            _a.sent();
                            data = this.sanitizeAddressDto(dto);
                            if (!data.isDefault) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.address.updateMany({ where: { userId: userId }, data: { isDefault: false } })];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3: return [2 /*return*/, this.prisma.address.create({ data: __assign(__assign({}, data), { userId: userId }) })];
                    }
                });
            });
        };
        UserMpService_1.prototype.updateAddress = function (userId, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var exist, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.assertUserExists(userId)
                            // 确保只能改自己的地址
                        ];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.address.findFirst({
                                    where: { id: id, userId: userId },
                                    select: { id: true },
                                })];
                        case 2:
                            exist = _a.sent();
                            if (!exist)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '地址不存在或无权限');
                            data = this.sanitizeAddressDto(dto);
                            if (!data.isDefault) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.prisma.address.updateMany({ where: { userId: userId }, data: { isDefault: false } })];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4: return [2 /*return*/, this.prisma.address.update({ where: { id: id }, data: data })];
                    }
                });
            });
        };
        UserMpService_1.prototype.removeAddress = function (userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.assertUserExists(userId)];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.address.deleteMany({ where: { id: id, userId: userId } })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        // ========== 收藏 ==========
        UserMpService_1.prototype.listFavorites = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var internalMerchantIds, favs;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, internal_test_merchant_util_1.getInternalTestMerchantIds)(this.prisma)];
                        case 1:
                            internalMerchantIds = _a.sent();
                            return [4 /*yield*/, this.prisma.favorite.findMany({
                                    where: __assign({ userId: userId }, (internalMerchantIds.length
                                        ? { product: { merchantId: { notIn: internalMerchantIds } } }
                                        : {})),
                                    include: { product: true },
                                })];
                        case 2:
                            favs = _a.sent();
                            return [2 /*return*/, favs.map(function (f) { return ({
                                    id: f.id,
                                    productId: f.productId,
                                    name: f.product.name,
                                    image: f.product.images[0] || '',
                                    price: Number(f.product.priceRetailMin),
                                }); })];
                    }
                });
            });
        };
        UserMpService_1.prototype.addFavorite = function (userId, productId) {
            return __awaiter(this, void 0, void 0, function () {
                var product;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.product.findUnique({
                                where: { id: productId },
                                select: { merchantId: true },
                            })];
                        case 1:
                            product = _a.sent();
                            if (!product)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '商品不存在');
                            return [4 /*yield*/, this.assertPublicMerchant(product.merchantId)];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.favorite.upsert({
                                    where: { userId_productId: { userId: userId, productId: productId } },
                                    update: {},
                                    create: { userId: userId, productId: productId },
                                })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        UserMpService_1.prototype.removeFavorite = function (userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.favorite.deleteMany({ where: { id: id, userId: userId } })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        // ========== 优惠券（用户端可领取/可用列表） ==========
        /**
         * 列出所有用户可领取/可使用的优惠券
         * - status='active'（商户已上线）
         * - 当前北京时间在 [validFrom, validTo] 之内
         * - 库存未发放完（received < stock，或 stock = 0 视为无限量）
         * - 返回 { list, total } 结构与前端期望一致
         */
        UserMpService_1.prototype.listAvailableCoupons = function () {
            return __awaiter(this, void 0, void 0, function () {
                var now, internalMerchantIds, all, usable;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            now = new Date();
                            return [4 /*yield*/, (0, internal_test_merchant_util_1.getInternalTestMerchantIds)(this.prisma)];
                        case 1:
                            internalMerchantIds = _a.sent();
                            return [4 /*yield*/, this.prisma.coupon.findMany({
                                    where: __assign({ status: 'active', validFrom: { lte: now }, validTo: { gte: now } }, (internalMerchantIds.length ? { merchantId: { notIn: internalMerchantIds } } : {})),
                                    orderBy: { createdAt: 'desc' },
                                    take: 100,
                                })];
                        case 2:
                            all = _a.sent();
                            usable = all.filter(function (c) { return c.stock === 0 || c.received < c.stock; });
                            return [2 /*return*/, {
                                    list: usable.map(function (c) { return (0, decimal_util_1.decimalToNumber)(c); }),
                                    total: usable.length,
                                }];
                    }
                });
            });
        };
        /**
         * 用户领取优惠券
         *
         * 持券落正式 UserCoupon 表（一券一行，主键 no）。历史上曾用 SystemConfig
         * key=`user_coupon:<userId>:<couponId>` 的 JSON { count, ids[], claimedAt } 兜底，
         * 已通过 deploy/user-coupon-init.sql 迁移到本表，对外返回形状不变。
         *
         * 业务校验:
         *   1. 券存在 + 状态 active + 在有效期内
         *   2. 总库存(stock=0 即不限)还剩余
         *   3. 用户已领数量(tx 内 count UserCoupon) < perUserLimit(0 视为不限,但保底视为至少 1)
         *   4. Coupon.received 原子 +1(用 update 的 increment,避免并发超领)
         */
        UserMpService_1.prototype.claimCoupon = function (userId, couponId) {
            return __awaiter(this, void 0, void 0, function () {
                var now, c, limit, claimOnce, isWriteConflict, e_3, e2_1;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!userId)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.UNAUTHORIZED, '未登录');
                            now = new Date();
                            return [4 /*yield*/, this.prisma.coupon.findUnique({ where: { id: couponId } })];
                        case 1:
                            c = _a.sent();
                            if (!c)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '优惠券不存在');
                            return [4 /*yield*/, this.assertPublicMerchant(c.merchantId)];
                        case 2:
                            _a.sent();
                            if (c.status !== 'active') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '优惠券未上架或已下架');
                            }
                            if (c.validFrom > now || c.validTo < now) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '优惠券不在有效期内');
                            }
                            if (c.stock > 0 && c.received >= c.stock) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '优惠券已被领完');
                            }
                            limit = c.perUserLimit > 0 ? c.perUserLimit : 1;
                            claimOnce = function () {
                                return _this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var ucNo, claimed;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                ucNo = "UC".concat(Date.now().toString(36)).concat(Math.random().toString(36).slice(2, 8));
                                                return [4 /*yield*/, tx.userCoupon.count({ where: { userId: userId, couponId: couponId } })];
                                            case 1:
                                                claimed = _a.sent();
                                                if (claimed >= limit) {
                                                    throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, "\u6BCF\u4EBA\u6700\u591A\u9886 ".concat(limit, " \u5F20,\u5DF2\u8FBE\u4E0A\u9650"));
                                                }
                                                // 原子更新 Coupon.received 防超领
                                                return [4 /*yield*/, tx.coupon.update({
                                                        where: { id: couponId },
                                                        data: { received: { increment: 1 } },
                                                    })];
                                            case 2:
                                                // 原子更新 Coupon.received 防超领
                                                _a.sent();
                                                return [4 /*yield*/, tx.userCoupon.create({ data: { no: ucNo, userId: userId, couponId: couponId } })];
                                            case 3:
                                                _a.sent();
                                                return [2 /*return*/, { ok: true, no: ucNo, count: claimed + 1 }];
                                        }
                                    });
                                }); }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
                            };
                            isWriteConflict = function (e) {
                                return e instanceof client_1.Prisma.PrismaClientKnownRequestError && e.code === 'P2034';
                            };
                            _a.label = 3;
                        case 3:
                            _a.trys.push([3, 5, , 10]);
                            return [4 /*yield*/, claimOnce()];
                        case 4: return [2 /*return*/, _a.sent()];
                        case 5:
                            e_3 = _a.sent();
                            if (e_3 instanceof biz_exception_1.BizException)
                                throw e_3;
                            if (!isWriteConflict(e_3)) return [3 /*break*/, 9];
                            _a.label = 6;
                        case 6:
                            _a.trys.push([6, 8, , 9]);
                            return [4 /*yield*/, claimOnce()];
                        case 7: return [2 /*return*/, _a.sent()];
                        case 8:
                            e2_1 = _a.sent();
                            if (e2_1 instanceof biz_exception_1.BizException)
                                throw e2_1;
                            if (isWriteConflict(e2_1)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '领取太频繁，请稍后再试');
                            }
                            throw e2_1;
                        case 9: throw e_3;
                        case 10: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * 我的优惠券列表（汇总用户已领的所有券 + 关联券基础信息）
         *
         * 前端 user-mp couponService.my() 类型契约：直接返回 `MyCoupon[]`（不是 PageObject），
         * 每条带 `no`（用户券唯一编号）+ `status: 'unused' | 'used' | 'expired'` +
         * `usedAt?` + `claimedAt`。前端 pages/coupon/my.vue 按 tab 三态过滤显示。
         *
         * 实现策略：
         *   - 查 UserCoupon 单表（一券一行，claimedAt desc），再按去重 couponId 批量补券基础信息
         *   - 状态判定优先级与 SystemConfig 旧实现完全一致："已使用 > 已过期 > 未使用"：
         *     行已核销（status='used' 或 usedAt 非空）→ used；否则 validTo < now → expired；否则 unused
         *   - 支持 query.status 过滤：'unused' | 'used' | 'expired'
         *
         * 历史 SystemConfig 兜底已由 deploy/user-coupon-init.sql 迁入本表。旧实现里
         * "ids 缺失按 count 生成 LEGACY_ 占位 no" 的兜底分支随之删除——表里每行都有真实 no。
         */
        UserMpService_1.prototype.myCoupons = function (userId_1) {
            return __awaiter(this, arguments, void 0, function (userId, query) {
                var rows, couponIds, internalMerchantIds, coupons, cmap, now, list, _i, rows_1, r, c, used, expired, status_1, want;
                var _a;
                if (query === void 0) { query = {}; }
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!userId)
                                return [2 /*return*/, []
                                    // claimedAt desc（最近领到的排前面）由数据库排序保证
                                ];
                            return [4 /*yield*/, this.prisma.userCoupon.findMany({
                                    where: { userId: userId },
                                    orderBy: { claimedAt: 'desc' },
                                    take: 500,
                                })];
                        case 1:
                            rows = _b.sent();
                            if (!rows.length)
                                return [2 /*return*/, []];
                            couponIds = Array.from(new Set(rows.map(function (r) { return r.couponId; })));
                            return [4 /*yield*/, (0, internal_test_merchant_util_1.getInternalTestMerchantIds)(this.prisma)];
                        case 2:
                            internalMerchantIds = _b.sent();
                            return [4 /*yield*/, this.prisma.coupon.findMany({
                                    where: __assign({ id: { in: couponIds } }, (internalMerchantIds.length ? { merchantId: { notIn: internalMerchantIds } } : {})),
                                    include: { merchant: { select: { id: true, name: true } } },
                                })];
                        case 3:
                            coupons = _b.sent();
                            cmap = new Map(coupons.map(function (c) { return [c.id, c]; }));
                            now = new Date();
                            list = [];
                            for (_i = 0, rows_1 = rows; _i < rows_1.length; _i++) {
                                r = rows_1[_i];
                                c = cmap.get(r.couponId);
                                if (!c)
                                    continue;
                                used = r.status === 'used' || r.usedAt != null;
                                expired = c.validTo < now;
                                status_1 = void 0;
                                if (used)
                                    status_1 = 'used';
                                else if (expired)
                                    status_1 = 'expired';
                                else
                                    status_1 = 'unused';
                                list.push({
                                    no: r.no,
                                    couponId: c.id,
                                    name: c.name,
                                    type: c.type,
                                    amount: c.amount != null ? Number(c.amount) : null,
                                    discountPercent: c.discountPercent,
                                    threshold: c.threshold != null ? Number(c.threshold) : null,
                                    merchantId: c.merchantId,
                                    merchantName: ((_a = c.merchant) === null || _a === void 0 ? void 0 : _a.name) || '',
                                    validFrom: c.validFrom,
                                    validTo: c.validTo,
                                    status: status_1,
                                    usedAt: r.usedAt ? r.usedAt.toISOString() : null,
                                    claimedAt: r.claimedAt ? r.claimedAt.toISOString() : null,
                                });
                            }
                            want = query === null || query === void 0 ? void 0 : query.status;
                            return [2 /*return*/, want ? list.filter(function (x) { return x.status === want; }) : list];
                    }
                });
            });
        };
        // ========== 预约量尺 ==========
        UserMpService_1.prototype.submitBooking = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var b;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.booking.create({
                                data: {
                                    userId: userId || null,
                                    contactName: dto.name || dto.contactName,
                                    contactPhone: dto.phone || dto.contactPhone,
                                    address: dto.address,
                                    scheduledAt: new Date(dto.appointAt || dto.scheduledAt),
                                    spaceTypes: dto.space ? [dto.space] : dto.spaceTypes || [],
                                    remark: dto.remark,
                                },
                            })];
                        case 1:
                            b = _a.sent();
                            return [2 /*return*/, { ok: true, ticketId: b.id }];
                    }
                });
            });
        };
        // ========== 推广 ==========
        /**
         * 推广人维度概览
         *
         * 真实统计（之前 people=0 / conversion=0 都是占位）：
         *   - total / thisMonth / pending：commission amount 聚合
         *   - people：commission 关联订单的"去重买家数"（衡量该推广人带来过多少不同顾客）
         *   - orderCount：commission 关联的去重订单数
         *   - conversion：转化率 = 订单数 / 曝光数
         *     当前 schema 没有 promote 曝光埋点表，conversion 暂返回 null 让前端展示"暂无数据"，
         *     避免对外发布"0%"误导推广人。后续若加 promote_click / promote_impression 表，
         *     这里再补真分母。
         */
        UserMpService_1.prototype.promoteSummary = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var cms, total, now, thisMonth, pending, orderIds, buyerIds, _i, cms_1, c;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.commission.findMany({
                                where: { userId: userId },
                                include: { order: { select: { userId: true } } },
                            })];
                        case 1:
                            cms = _b.sent();
                            total = cms.reduce(function (s, c) { return s + Number(c.amount); }, 0);
                            now = new Date();
                            thisMonth = cms
                                .filter(function (c) {
                                return c.createdAt.getMonth() === now.getMonth() &&
                                    c.createdAt.getFullYear() === now.getFullYear();
                            })
                                .reduce(function (s, c) { return s + Number(c.amount); }, 0);
                            pending = cms
                                .filter(function (c) { return c.status === 'pending'; })
                                .reduce(function (s, c) { return s + Number(c.amount); }, 0);
                            orderIds = new Set();
                            buyerIds = new Set();
                            for (_i = 0, cms_1 = cms; _i < cms_1.length; _i++) {
                                c = cms_1[_i];
                                orderIds.add(c.orderId);
                                if ((_a = c.order) === null || _a === void 0 ? void 0 : _a.userId)
                                    buyerIds.add(c.order.userId);
                            }
                            return [2 /*return*/, {
                                    total: Math.round(total * 100) / 100,
                                    thisMonth: Math.round(thisMonth * 100) / 100,
                                    pending: Math.round(pending * 100) / 100,
                                    people: buyerIds.size,
                                    orderCount: orderIds.size,
                                    // 没有曝光埋点表，先返回 null 让前端显示"暂无数据"
                                    conversion: null,
                                }];
                    }
                });
            });
        };
        /**
         * 推广分享链接
         *
         * 真实链接（之前没有实现）：
         *   - 前端约定 `PROMOTE_LANDING_URL` 环境变量为推广落地页（如商城首页 / 注册页）
         *   - 后端追加 `?ref=<userId>` 给 inviterId 绑定逻辑识别
         *   - 用户首次通过 ?ref=xxx 落地并登录/注册 → User.inviterId 写入
         *
         * 返回结构与前端期望保持兼容：{ url, ref }
         */
        UserMpService_1.prototype.promoteShareLink = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var u, base, sep;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!userId)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.UNAUTHORIZED, '请先登录');
                            return [4 /*yield*/, this.prisma.user.findUnique({ where: { id: userId } })];
                        case 1:
                            u = _a.sent();
                            if (!u)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '用户不存在');
                            if (u.status === 'disabled') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '当前账号已被禁用，无法生成推广链接');
                            }
                            base = (process.env.PROMOTE_LANDING_URL || '').trim();
                            if (!base) {
                                // 没配置落地页直接抛错，绝不返回 about:blank 这类占位
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '推广落地页未配置，请联系运维设置 PROMOTE_LANDING_URL');
                            }
                            sep = base.includes('?') ? '&' : '?';
                            return [2 /*return*/, { url: "".concat(base).concat(sep, "ref=").concat(encodeURIComponent(userId)), ref: userId }];
                    }
                });
            });
        };
        /**
         * 推广关系绑定（首次落地 → 登录后调用）
         *
         * 客户端流程：用户通过 ?ref=xxx 进入小程序，前端把 ref 缓存；
         * 登录成功后调用本接口完成 inviterId 绑定（仅首次有效，避免反复改邀请人）。
         */
        UserMpService_1.prototype.bindInviter = function (userId, inviterId) {
            return __awaiter(this, void 0, void 0, function () {
                var me, inviter;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!userId)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.UNAUTHORIZED, '请先登录');
                            if (!inviterId)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '缺少邀请人 ID');
                            if (inviterId === userId) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '不能将自己设为邀请人');
                            }
                            return [4 /*yield*/, this.prisma.user.findUnique({ where: { id: userId } })];
                        case 1:
                            me = _a.sent();
                            if (!me)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '用户不存在');
                            if (me.inviterId) {
                                // 已绑定过 → 幂等返回，不允许覆盖
                                return [2 /*return*/, { ok: true, inviterId: me.inviterId, alreadyBound: true }];
                            }
                            return [4 /*yield*/, this.prisma.user.findUnique({ where: { id: inviterId } })];
                        case 2:
                            inviter = _a.sent();
                            if (!inviter)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '邀请人不存在');
                            if (inviter.status === 'disabled') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '邀请人账号已被禁用');
                            }
                            return [4 /*yield*/, this.prisma.user.update({ where: { id: userId }, data: { inviterId: inviterId } })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, { ok: true, inviterId: inviterId, alreadyBound: false }];
                    }
                });
            });
        };
        UserMpService_1.prototype.promoteOrders = function (userId, q) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, skip, take, page, pageSize, _b, list, total;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(q), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.commission.findMany({
                                        where: { userId: userId },
                                        skip: skip,
                                        take: take,
                                        orderBy: { createdAt: 'desc' },
                                        include: { order: true },
                                    }),
                                    this.prisma.commission.count({ where: { userId: userId } }),
                                ])];
                        case 1:
                            _b = _c.sent(), list = _b[0], total = _b[1];
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(list.map(function (c) { return ({
                                    id: c.id,
                                    orderNo: c.order.no,
                                    amount: Number(c.amount),
                                    createdAt: c.createdAt,
                                }); }), total, page, pageSize)];
                    }
                });
            });
        };
        /**
         * 推广分佣规则正文（前端 user-mp 推广页"规则"弹窗使用）
         *
         * 数据源：SystemConfig key='promote.rules' value={ body: string, updatedAt?: string }
         * 前端 PromoteRules 契约：{ body: string, updatedAt?: string } | null
         * 未配置返回 null；前端会显示"详情请咨询平台客服"兜底文案。
         *
         * 严格零硬编码：绝不在后端写死 "一级 8% / 二级 3%" 等百分比文案 —— 业务可能随时调整。
         * 平台管理员通过 `POST /p/system/settings` 写入 promote.rules 配置。
         */
        UserMpService_1.prototype.promoteRules = function () {
            return __awaiter(this, void 0, void 0, function () {
                var cfg, raw, body, updatedAt;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.systemConfig.findUnique({ where: { key: 'promote.rules' } })];
                        case 1:
                            cfg = _a.sent();
                            if (!cfg)
                                return [2 /*return*/, null];
                            raw = cfg.value;
                            body = '';
                            if (typeof raw === 'string') {
                                body = raw.trim();
                            }
                            else if (raw && typeof raw === 'object') {
                                body = typeof raw.body === 'string' ? raw.body.trim() : '';
                                updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined;
                            }
                            if (!body)
                                return [2 /*return*/, null];
                            return [2 /*return*/, updatedAt ? { body: body, updatedAt: updatedAt } : { body: body, updatedAt: cfg.updatedAt.toISOString() }];
                    }
                });
            });
        };
        /**
         * 公开系统设置（user-mp 端可访问；脱敏后的平台公开配置）
         *
         * 数据源：SystemConfig key='system_settings' value.service 子对象 + 备用独立 key 兜底
         * 前端 SystemSettings 契约：
         *   { customerServiceWechat?: string | null,
         *     customerServicePhone?: string | null,
         *     customerServiceHours?: string | null,
         *     customerServiceEmail?: string | null,
         *     icp?: string | null,
         *     [k]: unknown }
         * 未配置字段返 null；前端按 null=未提供降级展示，绝不硬编码客服联系方式。
         *
         * 安全：绝不暴露 SystemConfig 全量（避免泄露 IP 白名单 / 密码策略 / business 内部配置）。
         * 只白名单"对用户公开"的字段。
         */
        UserMpService_1.prototype.systemSettings = function () {
            return __awaiter(this, void 0, void 0, function () {
                var cfg, raw, service, site, wechat, phone, hours, email, icp;
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
                return __generator(this, function (_q) {
                    switch (_q.label) {
                        case 0: return [4 /*yield*/, this.prisma.systemConfig.findUnique({ where: { key: 'system_settings' } })];
                        case 1:
                            cfg = _q.sent();
                            raw = (cfg === null || cfg === void 0 ? void 0 : cfg.value) || {};
                            service = raw.service || {};
                            site = raw.site || {};
                            wechat = (_c = (_b = (_a = service.customerServiceWechat) !== null && _a !== void 0 ? _a : service.wechat) !== null && _b !== void 0 ? _b : raw.customerServiceWechat) !== null && _c !== void 0 ? _c : null;
                            phone = (_f = (_e = (_d = service.customerServicePhone) !== null && _d !== void 0 ? _d : service.phone) !== null && _e !== void 0 ? _e : raw.customerServicePhone) !== null && _f !== void 0 ? _f : null;
                            hours = (_j = (_h = (_g = service.customerServiceHours) !== null && _g !== void 0 ? _g : service.workTime) !== null && _h !== void 0 ? _h : raw.customerServiceHours) !== null && _j !== void 0 ? _j : null;
                            email = (_m = (_l = (_k = service.customerServiceEmail) !== null && _k !== void 0 ? _k : service.email) !== null && _l !== void 0 ? _l : raw.customerServiceEmail) !== null && _m !== void 0 ? _m : null;
                            icp = (_p = (_o = site.icp) !== null && _o !== void 0 ? _o : raw.icp) !== null && _p !== void 0 ? _p : null;
                            return [2 /*return*/, {
                                    customerServiceWechat: wechat || null,
                                    customerServicePhone: phone || null,
                                    customerServiceHours: hours || null,
                                    customerServiceEmail: email || null,
                                    icp: icp || null,
                                    siteName: site.name || null,
                                }];
                    }
                });
            });
        };
        // ========== 附近门店 ==========
        /**
         * 附近门店列表
         *
         * - 仅返回 status='active' + 含真实经纬度（latitude/longitude 非 null）的门店
         * - 若客户端传 lat/lng（小程序 uni.getLocation 的真实坐标），按 Haversine 公式
         *   计算真实直线距离（km），并按距离升序排序、截取前 20 条
         * - 若客户端未传坐标，distance 字段返回 null，由前端自行展示「未授权定位」
         *   绝不再用 Math.random() / 任何写死坐标兜底
         */
        UserMpService_1.prototype.nearbyStores = function () {
            return __awaiter(this, arguments, void 0, function (q) {
                var userLat, userLng, hasUserLoc, internalMerchantIds, stores, list;
                if (q === void 0) { q = {}; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            userLat = q.lat !== undefined && q.lat !== '' ? Number(q.lat) : NaN;
                            userLng = q.lng !== undefined && q.lng !== '' ? Number(q.lng) : NaN;
                            hasUserLoc = Number.isFinite(userLat) && Number.isFinite(userLng);
                            return [4 /*yield*/, (0, internal_test_merchant_util_1.getInternalTestMerchantIds)(this.prisma)];
                        case 1:
                            internalMerchantIds = _a.sent();
                            return [4 /*yield*/, this.prisma.store.findMany({
                                    where: __assign({ status: 'active', latitude: { not: null }, longitude: { not: null } }, (internalMerchantIds.length ? { merchantId: { notIn: internalMerchantIds } } : {})),
                                    take: 200,
                                })];
                        case 2:
                            stores = _a.sent();
                            list = stores.map(function (s) {
                                var lat = s.latitude;
                                var lng = s.longitude;
                                var distance = null;
                                if (hasUserLoc) {
                                    distance = haversineKm(userLat, userLng, lat, lng);
                                }
                                return {
                                    id: s.id,
                                    name: s.name,
                                    address: s.address,
                                    distance: distance,
                                    phone: s.phone,
                                    lat: lat,
                                    lng: lng,
                                };
                            });
                            if (hasUserLoc) {
                                list.sort(function (a, b) { var _a, _b; return ((_a = a.distance) !== null && _a !== void 0 ? _a : Infinity) - ((_b = b.distance) !== null && _b !== void 0 ? _b : Infinity); });
                            }
                            return [2 /*return*/, list.slice(0, 20)];
                    }
                });
            });
        };
        // ========== 入驻申请 ==========
        UserMpService_1.prototype.merchantApply = function (authUser, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, m;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(authUser === null || authUser === void 0 ? void 0 : authUser.sub))
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.UNAUTHORIZED, '请先登录');
                            userId = authUser.sub;
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var exists, user, nowSec, smsAuthIsFresh, passwordHash;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, tx.merchant.findUnique({ where: { userId: userId } })];
                                            case 1:
                                                exists = _a.sent();
                                                if (exists)
                                                    throw new biz_exception_1.BizException(biz_exception_1.BizCode.CONFLICT, '已提交入驻申请');
                                                return [4 /*yield*/, tx.user.findUnique({ where: { id: userId } })];
                                            case 2:
                                                user = _a.sent();
                                                if (!user)
                                                    throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '用户不存在');
                                                if (!(!user.passwordHash && dto.password)) return [3 /*break*/, 5];
                                                nowSec = Math.floor(Date.now() / 1000);
                                                smsAuthIsFresh = authUser.amr === 'sms' &&
                                                    typeof authUser.amrAt === 'number' &&
                                                    authUser.amrAt <= nowSec + 30 &&
                                                    nowSec - authUser.amrAt <= 15 * 60;
                                                if (!smsAuthIsFresh) {
                                                    throw new biz_exception_1.BizException(biz_exception_1.BizCode.UNAUTHORIZED, '短信验证已过期，请重新验证手机号');
                                                }
                                                return [4 /*yield*/, argon2.hash(dto.password)];
                                            case 3:
                                                passwordHash = _a.sent();
                                                return [4 /*yield*/, tx.user.update({ where: { id: userId }, data: { passwordHash: passwordHash } })];
                                            case 4:
                                                _a.sent();
                                                _a.label = 5;
                                            case 5: return [2 /*return*/, tx.merchant.create({
                                                    data: {
                                                        userId: userId,
                                                        type: dto.type || 'store',
                                                        name: dto.name || dto.legalName || '',
                                                        legalName: dto.legalName || dto.name || '',
                                                        creditCode: dto.creditCode || '',
                                                        legalRep: dto.legalRep || '',
                                                        contact: dto.contact || dto.legalRep || '',
                                                        contactPhone: dto.contactPhone || dto.phone || '',
                                                        region: dto.region || '',
                                                        address: dto.address || '',
                                                        businessLicense: dto.businessLicense || '',
                                                        qualifications: dto.qualifications || [],
                                                        categories: dto.categories || [],
                                                        status: 'pending',
                                                    },
                                                })];
                                        }
                                    });
                                }); })];
                        case 1:
                            m = _a.sent();
                            return [2 /*return*/, { ok: true, applyId: m.id }];
                    }
                });
            });
        };
        // ========== 店铺价格规则 (user-mp 端读取) ==========
        UserMpService_1.prototype.shopPriceRule = function (merchantId) {
            return __awaiter(this, void 0, void 0, function () {
                var cfg, DEFAULT;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.assertPublicMerchant(merchantId)];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.systemConfig.findUnique({
                                    where: { key: "shop:".concat(merchantId, ":priceRule") },
                                })];
                        case 2:
                            cfg = _a.sent();
                            DEFAULT = {
                                guestAllow: false,
                                customerPrice: 'retail',
                                agencyPrice: 'wholesale',
                                memberPrice: 'member',
                            };
                            return [2 /*return*/, __assign(__assign({}, DEFAULT), ((cfg === null || cfg === void 0 ? void 0 : cfg.value) || {}))];
                    }
                });
            });
        };
        /**
         * 当前用户在某店铺的价格分级身份。
         *
         * priceTier 是按 (merchantId, userId) 维度配置的(商家在「客户管理」里给客户标 member/agency),
         * 存在 SystemConfig key=cust_tier_<merchantId>_<userId> 里。useShopPriceRule 之前用
         * `user.role==='member' || user.isMember===true` 判断 —— User 表根本没有这俩字段,
         * 商家设的等级永远到不了用户端;这里把这条链路接通。
         *
         *  - factory/store/merchant 角色 → 直接 agency(代理人天然能看批发价)
         *  - SystemConfig.priceTier=='member'|'vip' → member
         *  - SystemConfig.priceTier=='agency'|'wholesale' → agency
         *  - 其它 → customer
         */
        UserMpService_1.prototype.myTierInShop = function (userId, merchantId) {
            return __awaiter(this, void 0, void 0, function () {
                var user, _a, tierCfg, authCfg, priceTier, priceAuthorized, myTier;
                var _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0: return [4 /*yield*/, this.assertPublicMerchant(merchantId)];
                        case 1:
                            _e.sent();
                            return [4 /*yield*/, this.prisma.user.findUnique({ where: { id: userId } })];
                        case 2:
                            user = _e.sent();
                            if (!user)
                                return [2 /*return*/, { myTier: 'guest', priceAuthorized: false }];
                            if (['factory', 'store', 'merchant'].includes(user.role)) {
                                return [2 /*return*/, { myTier: 'agency', priceAuthorized: true }];
                            }
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.systemConfig.findUnique({
                                        where: { key: "cust_tier_".concat(merchantId, "_").concat(userId) },
                                    }),
                                    this.prisma.systemConfig.findUnique({
                                        where: { key: "cust_auth_".concat(merchantId, "_").concat(userId) },
                                    }),
                                ])];
                        case 3:
                            _a = _e.sent(), tierCfg = _a[0], authCfg = _a[1];
                            priceTier = String((_c = (_b = tierCfg === null || tierCfg === void 0 ? void 0 : tierCfg.value) === null || _b === void 0 ? void 0 : _b.priceTier) !== null && _c !== void 0 ? _c : 'retail').toLowerCase();
                            priceAuthorized = !!((_d = authCfg === null || authCfg === void 0 ? void 0 : authCfg.value) === null || _d === void 0 ? void 0 : _d.authorized);
                            myTier = 'customer';
                            if (priceTier === 'member' || priceTier === 'vip')
                                myTier = 'member';
                            else if (priceTier === 'agency' || priceTier === 'wholesale')
                                myTier = 'agency';
                            return [2 /*return*/, { myTier: myTier, priceAuthorized: priceAuthorized }];
                    }
                });
            });
        };
        // ========== 在线客服（用户端） ==========
        UserMpService_1.prototype.chatSessions = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var internalMerchantIds, sessions, out, _i, sessions_1, s, last;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, (0, internal_test_merchant_util_1.getInternalTestMerchantIds)(this.prisma)];
                        case 1:
                            internalMerchantIds = _b.sent();
                            return [4 /*yield*/, this.prisma.chatSession.findMany({
                                    where: __assign({ userId: userId }, (internalMerchantIds.length ? { merchantId: { notIn: internalMerchantIds } } : {})),
                                    orderBy: { lastMessageAt: 'desc' },
                                    include: { merchant: { select: { id: true, name: true } } },
                                })];
                        case 2:
                            sessions = _b.sent();
                            out = [];
                            _i = 0, sessions_1 = sessions;
                            _b.label = 3;
                        case 3:
                            if (!(_i < sessions_1.length)) return [3 /*break*/, 6];
                            s = sessions_1[_i];
                            return [4 /*yield*/, this.prisma.chatMessage.findFirst({
                                    where: { sessionId: s.id },
                                    orderBy: { createdAt: 'desc' },
                                })];
                        case 4:
                            last = _b.sent();
                            out.push({
                                id: s.id,
                                merchantId: s.merchantId,
                                merchantName: ((_a = s.merchant) === null || _a === void 0 ? void 0 : _a.name) || '商户',
                                lastContent: (last === null || last === void 0 ? void 0 : last.content) || '',
                                lastSender: (last === null || last === void 0 ? void 0 : last.sender) || '',
                                lastAt: (last === null || last === void 0 ? void 0 : last.createdAt) || s.lastMessageAt,
                                unreadCount: s.unreadCount,
                                status: s.status,
                            });
                            _b.label = 5;
                        case 5:
                            _i++;
                            return [3 /*break*/, 3];
                        case 6: return [2 /*return*/, out];
                    }
                });
            });
        };
        UserMpService_1.prototype.ensureChatSession = function (userId, merchantId) {
            return __awaiter(this, void 0, void 0, function () {
                var existing, created;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            // 必须由调用方明确指定 merchantId（前端要么从店铺详情进入，要么从订单详情发起）。
                            // 之前 fallback "随便挑一个 active 商户" 会让用户莫名其妙开到一家陌生店的客服会话，
                            // 既污染商家的客服面板（陌生用户消息），又给了攻击者枚举 merchantId 的入口。
                            if (!merchantId) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请从店铺进入客服');
                            }
                            return [4 /*yield*/, this.assertPublicMerchant(merchantId)];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.chatSession.findUnique({
                                    where: { userId_merchantId: { userId: userId, merchantId: merchantId } },
                                })];
                        case 2:
                            existing = _a.sent();
                            if (existing)
                                return [2 /*return*/, { id: existing.id, merchantId: existing.merchantId }];
                            return [4 /*yield*/, this.prisma.chatSession.create({
                                    data: { userId: userId, merchantId: merchantId, status: 'open' },
                                })];
                        case 3:
                            created = _a.sent();
                            return [2 /*return*/, { id: created.id, merchantId: created.merchantId }];
                    }
                });
            });
        };
        UserMpService_1.prototype.chatMessages = function (userId, sessionId) {
            return __awaiter(this, void 0, void 0, function () {
                var s;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.chatSession.findFirst({ where: { id: sessionId, userId: userId } })];
                        case 1:
                            s = _a.sent();
                            if (!s)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '会话不存在');
                            return [4 /*yield*/, this.assertPublicMerchant(s.merchantId)];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, this.prisma.chatMessage.findMany({
                                    where: { sessionId: sessionId },
                                    orderBy: { createdAt: 'asc' },
                                    take: 200,
                                })];
                    }
                });
            });
        };
        UserMpService_1.prototype.chatSend = function (userId, sessionId, type, content) {
            return __awaiter(this, void 0, void 0, function () {
                var s, m;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.chatSession.findFirst({ where: { id: sessionId, userId: userId } })];
                        case 1:
                            s = _a.sent();
                            if (!s)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '会话不存在');
                            return [4 /*yield*/, this.assertPublicMerchant(s.merchantId)];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.chatMessage.create({
                                    data: { sessionId: sessionId, sender: 'user', type: type, content: content, read: false },
                                })];
                        case 3:
                            m = _a.sent();
                            return [4 /*yield*/, this.prisma.chatSession.update({
                                    where: { id: sessionId },
                                    data: { lastMessageAt: new Date(), unreadCount: { increment: 1 } },
                                })
                                // 同步推送给房间内的所有 WS（包括商家端）；HTTP 链路之前只写 DB，对方要等下次轮询才看得到 → P1 体验断点
                                // fire-and-forget：失败不影响 HTTP 主流程
                            ];
                        case 4:
                            _a.sent();
                            // 同步推送给房间内的所有 WS（包括商家端）；HTTP 链路之前只写 DB，对方要等下次轮询才看得到 → P1 体验断点
                            // fire-and-forget：失败不影响 HTTP 主流程
                            try {
                                this.chat.emitChatMessage(sessionId, m, s);
                            }
                            catch (_b) { }
                            return [2 /*return*/, m];
                    }
                });
            });
        };
        UserMpService_1.prototype.chatMarkRead = function (userId, sessionId) {
            return __awaiter(this, void 0, void 0, function () {
                var s;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.chatSession.findFirst({ where: { id: sessionId, userId: userId } })];
                        case 1:
                            s = _a.sent();
                            if (!s)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '会话不存在');
                            return [4 /*yield*/, this.assertPublicMerchant(s.merchantId)];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.chatMessage.updateMany({
                                    where: { sessionId: sessionId, sender: 'merchant', read: false },
                                    data: { read: true },
                                })];
                        case 3:
                            _a.sent();
                            this.chat.emitReadReceipt(sessionId, 'user');
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        // ========== 购物车 ==========
        /**
         * 列出当前用户购物车
         *
         * 包含商品 / SKU 摘要（图片、名称、规格、价格、库存），方便前端直接渲染。
         * 同时把过期下架商品/SKU 自动剔除展示（不删 DB，避免误删），保持视图整洁。
         *
         * 字段契约 P0：SKU 响应统一返回 `{ priceRetail, priceWholesale, priceMember }` 三个字段，
         * 不再返回含糊的 `price` 字段。前端按 myTier + shopPriceRule 自己选展示哪个价。
         */
        UserMpService_1.prototype.listCart = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var internalMerchantIds, items;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, internal_test_merchant_util_1.getInternalTestMerchantIds)(this.prisma)];
                        case 1:
                            internalMerchantIds = _a.sent();
                            return [4 /*yield*/, this.prisma.cartItem.findMany({
                                    where: { userId: userId },
                                    orderBy: { updatedAt: 'desc' },
                                    include: {
                                        product: {
                                            select: {
                                                id: true,
                                                name: true,
                                                images: true,
                                                status: true,
                                                priceRetailMin: true,
                                                merchantId: true,
                                            },
                                        },
                                        sku: {
                                            select: {
                                                id: true,
                                                specsLabel: true,
                                                priceRetail: true,
                                                priceWholesale: true,
                                                priceMember: true,
                                                stock: true,
                                                active: true,
                                            },
                                        },
                                    },
                                })];
                        case 2:
                            items = _a.sent();
                            return [2 /*return*/, items
                                    .filter(function (it) { var _a; return !internalMerchantIds.includes(((_a = it.product) === null || _a === void 0 ? void 0 : _a.merchantId) || ''); })
                                    .map(function (it) {
                                    var _a;
                                    return ({
                                        id: it.id,
                                        productId: it.productId,
                                        skuId: it.skuId,
                                        quantity: it.quantity,
                                        product: it.product
                                            ? {
                                                id: it.product.id,
                                                name: it.product.name,
                                                image: ((_a = it.product.images) === null || _a === void 0 ? void 0 : _a[0]) || '',
                                                status: it.product.status,
                                                merchantId: it.product.merchantId,
                                            }
                                            : null,
                                        sku: it.sku
                                            ? {
                                                id: it.sku.id,
                                                specsLabel: it.sku.specsLabel,
                                                priceRetail: Number(it.sku.priceRetail),
                                                priceWholesale: Number(it.sku.priceWholesale),
                                                priceMember: Number(it.sku.priceMember),
                                                stock: it.sku.stock,
                                                active: it.sku.active,
                                            }
                                            : null,
                                        // 整条是否仍可下单（前端给灰禁用 + 提示用）
                                        available: !!it.product &&
                                            ['active', 'auto_approved'].includes(it.product.status) &&
                                            !!it.sku &&
                                            it.sku.active &&
                                            it.sku.stock > 0,
                                        createdAt: it.createdAt,
                                        updatedAt: it.updatedAt,
                                    });
                                })];
                    }
                });
            });
        };
        /**
         * 添加到购物车
         *
         * - 必须传 productId；skuId 可选，未传时取该商品任一启用 SKU 兜底（避免数据库 NOT NULL 报错）
         * - 已存在同 (userId, skuId) → 在原数量上 +quantity（受 SKU.stock 上限保护）
         * - 不存在则 create
         *
         * 校验：商品 + SKU 必须真实存在，并属于同一商品；quantity ≥ 1
         */
        UserMpService_1.prototype.addCart = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var productId, qty, product, sku, found, fallback, existing, targetQty;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            productId = String((dto === null || dto === void 0 ? void 0 : dto.productId) || '').trim();
                            if (!productId)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '缺少商品 ID');
                            qty = Math.max(1, Math.floor(Number((_a = dto === null || dto === void 0 ? void 0 : dto.quantity) !== null && _a !== void 0 ? _a : 1)));
                            if (!Number.isFinite(qty))
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '数量必须为正整数');
                            return [4 /*yield*/, this.prisma.product.findUnique({ where: { id: productId } })];
                        case 1:
                            product = _b.sent();
                            if (!product)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '商品不存在');
                            return [4 /*yield*/, this.assertPublicMerchant(product.merchantId)
                                // auto_approved（自动免审上架）与 active 同属"在售可购"，与列表/详情可见性、立即购买保持一致，
                                // 否则会出现"能立即购买却不能加购物车"的自相矛盾。
                            ];
                        case 2:
                            _b.sent();
                            // auto_approved（自动免审上架）与 active 同属"在售可购"，与列表/详情可见性、立即购买保持一致，
                            // 否则会出现"能立即购买却不能加购物车"的自相矛盾。
                            if (!['active', 'auto_approved'].includes(product.status)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.PRODUCT_OFFLINE, '商品已下架');
                            }
                            sku = null;
                            if (!(dto === null || dto === void 0 ? void 0 : dto.skuId)) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.prisma.sku.findUnique({ where: { id: dto.skuId } })];
                        case 3:
                            found = _b.sent();
                            if (!found || found.productId !== productId) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, 'SKU 不存在或不属于该商品');
                            }
                            sku = { id: found.id, productId: found.productId, stock: found.stock, active: found.active };
                            return [3 /*break*/, 6];
                        case 4: return [4 /*yield*/, this.prisma.sku.findFirst({
                                where: { productId: productId, active: true },
                                orderBy: { createdAt: 'asc' },
                            })];
                        case 5:
                            fallback = _b.sent();
                            if (!fallback) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '该商品暂无可购买规格');
                            }
                            sku = {
                                id: fallback.id,
                                productId: fallback.productId,
                                stock: fallback.stock,
                                active: fallback.active,
                            };
                            _b.label = 6;
                        case 6:
                            if (!sku.active) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.PRODUCT_OFFLINE, '该规格已下架');
                            }
                            return [4 /*yield*/, this.prisma.cartItem.findUnique({
                                    where: { userId_skuId: { userId: userId, skuId: sku.id } },
                                })];
                        case 7:
                            existing = _b.sent();
                            targetQty = ((existing === null || existing === void 0 ? void 0 : existing.quantity) || 0) + qty;
                            if (sku.stock > 0 && targetQty > sku.stock) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.STOCK_INSUFFICIENT, "\u5E93\u5B58\u4E0D\u8DB3\uFF0C\u6700\u591A\u53EF\u52A0 ".concat(sku.stock, " \u4EF6"));
                            }
                            if (existing) {
                                return [2 /*return*/, this.prisma.cartItem.update({
                                        where: { id: existing.id },
                                        data: { quantity: targetQty },
                                    })];
                            }
                            return [2 /*return*/, this.prisma.cartItem.create({
                                    data: { userId: userId, productId: productId, skuId: sku.id, quantity: qty },
                                })];
                    }
                });
            });
        };
        /**
         * 修改购物车某条数量
         *
         * - 必须属于当前用户（防越权改别人购物车）
         * - quantity ≥ 1（如要清零请走 removeCart）
         * - 超过 SKU 库存上限会拒绝（防"无限堆数量"绕过下单校验）
         */
        UserMpService_1.prototype.updateCart = function (userId, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var item, qty;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.cartItem.findFirst({
                                where: { id: id, userId: userId },
                                include: {
                                    sku: { select: { stock: true, active: true } },
                                    product: { select: { merchantId: true } },
                                },
                            })];
                        case 1:
                            item = _b.sent();
                            if (!item)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '购物车条目不存在或无权限');
                            return [4 /*yield*/, this.assertPublicMerchant(item.product.merchantId)];
                        case 2:
                            _b.sent();
                            qty = Math.floor(Number((_a = dto === null || dto === void 0 ? void 0 : dto.quantity) !== null && _a !== void 0 ? _a : 0));
                            if (!Number.isFinite(qty) || qty < 1) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '数量必须为正整数');
                            }
                            if (item.sku && item.sku.stock > 0 && qty > item.sku.stock) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.STOCK_INSUFFICIENT, "\u5E93\u5B58\u4E0D\u8DB3\uFF0C\u6700\u591A\u53EF\u8BBE ".concat(item.sku.stock, " \u4EF6"));
                            }
                            return [2 /*return*/, this.prisma.cartItem.update({ where: { id: id }, data: { quantity: qty } })];
                    }
                });
            });
        };
        /**
         * 删除购物车条目（必须属于当前用户）
         *
         * 使用 deleteMany 双条件，避免按 id 单删时 A 用户能干掉 B 用户的条目
         */
        UserMpService_1.prototype.removeCart = function (userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var r;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.cartItem.deleteMany({ where: { id: id, userId: userId } })];
                        case 1:
                            r = _a.sent();
                            if (r.count === 0) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '购物车条目不存在或无权限');
                            }
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        return UserMpService_1;
    }());
    __setFunctionName(_classThis, "UserMpService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        UserMpService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return UserMpService = _classThis;
}();
exports.UserMpService = UserMpService;
