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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerAdminService = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var biz_exception_1 = require("../../common/exceptions/biz.exception");
var metal_config_1 = require("./metal.config");
var ledger_constants_1 = require("./ledger.constants");
/**
 * 门窗利账 · 后台管理服务（admin-pc 平台工作台调用）。
 * 微信账号由小程序首次登录自动创建；后台负责禁用、资料维护和会员时长审计。
 */
var LedgerAdminService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var LedgerAdminService = _classThis = /** @class */ (function () {
        function LedgerAdminService_1(prisma, files) {
            this.prisma = prisma;
            this.files = files;
        }
        LedgerAdminService_1.prototype.mapUser = function (u) {
            var _a, _b, _c, _d, _e;
            return {
                id: u.id,
                accountCode: u.id.slice(-8).toUpperCase(),
                wechatLinked: !!u.wxOpenid,
                nickname: u.nickname,
                avatar: u.avatar,
                status: u.status,
                lastLoginAt: u.lastLoginAt,
                createdAt: u.createdAt,
                membership: (0, ledger_constants_1.deriveMembership)((_b = (_a = u.membership) === null || _a === void 0 ? void 0 : _a.expiresAt) !== null && _b !== void 0 ? _b : null, (_c = u.membership) === null || _c === void 0 ? void 0 : _c.lastPlanKey, new Date(), {
                    perpetual: (_d = u.membership) === null || _d === void 0 ? void 0 : _d.perpetual,
                    trialClaimedAt: (_e = u.membership) === null || _e === void 0 ? void 0 : _e.trialClaimedAt,
                }),
            };
        };
        LedgerAdminService_1.prototype.listUsers = function (q) {
            return __awaiter(this, void 0, void 0, function () {
                var kw, where, page, pageSize, _a, rows, total;
                var _this = this;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            kw = String((q === null || q === void 0 ? void 0 : q.keyword) || '').trim();
                            where = {};
                            if (kw) {
                                where.OR = [
                                    { id: { contains: kw.toLowerCase() } },
                                    { nickname: { contains: kw, mode: 'insensitive' } },
                                ];
                            }
                            if ((q === null || q === void 0 ? void 0 : q.status) === 'active' || (q === null || q === void 0 ? void 0 : q.status) === 'disabled')
                                where.status = q.status;
                            page = Math.max(1, Number(q === null || q === void 0 ? void 0 : q.page) || 1);
                            pageSize = Math.min(200, Math.max(1, Number(q === null || q === void 0 ? void 0 : q.pageSize) || 50));
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.ledgerUser.findMany({
                                        where: where,
                                        include: { membership: true },
                                        orderBy: { createdAt: 'desc' },
                                        skip: (page - 1) * pageSize,
                                        take: pageSize,
                                    }),
                                    this.prisma.ledgerUser.count({ where: where }),
                                ])];
                        case 1:
                            _a = _b.sent(), rows = _a[0], total = _a[1];
                            return [2 /*return*/, { list: rows.map(function (u) { return _this.mapUser(u); }), total: total, page: page, pageSize: pageSize }];
                    }
                });
            });
        };
        LedgerAdminService_1.prototype.updateUser = function (id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var exist, data, u;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerUser.findUnique({ where: { id: id } })];
                        case 1:
                            exist = _a.sent();
                            if (!exist)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '账号不存在');
                            data = {};
                            if (dto.nickname !== undefined && dto.nickname.trim())
                                data.nickname = dto.nickname.trim();
                            if (dto.status === 'active' || dto.status === 'disabled')
                                data.status = dto.status;
                            return [4 /*yield*/, this.prisma.ledgerUser.update({
                                    where: { id: id },
                                    data: data,
                                    include: { membership: true },
                                })];
                        case 2:
                            u = _a.sent();
                            return [2 /*return*/, this.mapUser(u)];
                    }
                });
            });
        };
        /** 增加会员时长（叠加）。planKey 与 days 二选一，days 优先。 */
        LedgerAdminService_1.prototype.grantMembership = function (id, dto, operatorId) {
            return __awaiter(this, void 0, void 0, function () {
                var user, days, isPerpetual, cfg, plan, auditNote, deltaDays, grantOnce, grantResult, e_1, conflict, retryError_1, retryConflict, updated, after, status;
                var _this = this;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerUser.findUnique({
                                where: { id: id },
                                select: { id: true },
                            })];
                        case 1:
                            user = _b.sent();
                            if (!user)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '账号不存在');
                            days = dto.days;
                            isPerpetual = false;
                            if (!(dto.planKey && (days === undefined || days === null))) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.getConfig()];
                        case 2:
                            cfg = _b.sent();
                            plan = cfg.plans.find(function (p) { return p.key === dto.planKey; });
                            if (plan === null || plan === void 0 ? void 0 : plan.perpetual)
                                isPerpetual = true;
                            days = plan ? plan.days : ledger_constants_1.LEDGER_PLAN_DAYS[dto.planKey];
                            _b.label = 3;
                        case 3:
                            if (!isPerpetual && (days === undefined || days === null || days === 0)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请选择套餐或填写有效天数');
                            }
                            days = days !== null && days !== void 0 ? days : 0;
                            auditNote = ((_a = dto.note) === null || _a === void 0 ? void 0 : _a.trim()) || '';
                            deltaDays = isPerpetual ? 0 : days;
                            grantOnce = function () {
                                return _this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var membership, before, nextExpiry, next;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, tx.ledgerMembership.findUnique({ where: { userId: id } })];
                                            case 1:
                                                membership = _a.sent();
                                                if (!!membership) return [3 /*break*/, 3];
                                                return [4 /*yield*/, tx.ledgerMembership.create({ data: { userId: id } })];
                                            case 2:
                                                membership = _a.sent();
                                                _a.label = 3;
                                            case 3:
                                                before = membership.expiresAt;
                                                nextExpiry = isPerpetual ? null : (0, ledger_constants_1.computeGrantExpiry)(before, days);
                                                return [4 /*yield*/, tx.ledgerMembership.update({
                                                        where: { id: membership.id },
                                                        data: __assign({ expiresAt: nextExpiry, lastPlanKey: dto.planKey || 'custom', updatedById: operatorId || null }, (isPerpetual ? { perpetual: true } : {})),
                                                    })];
                                            case 4:
                                                next = _a.sent();
                                                return [4 /*yield*/, tx.ledgerMembershipLog.create({
                                                        data: {
                                                            membershipId: membership.id,
                                                            deltaDays: deltaDays,
                                                            planKey: dto.planKey || 'custom',
                                                            beforeAt: before,
                                                            afterAt: nextExpiry,
                                                            operatorId: operatorId || null,
                                                            note: isPerpetual
                                                                ? ['开通永久会员', auditNote].filter(Boolean).join('；')
                                                                : auditNote || null,
                                                        },
                                                    })];
                                            case 5:
                                                _a.sent();
                                                return [2 /*return*/, { updated: next, after: nextExpiry }];
                                        }
                                    });
                                }); }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
                            };
                            _b.label = 4;
                        case 4:
                            _b.trys.push([4, 6, , 11]);
                            return [4 /*yield*/, grantOnce()];
                        case 5:
                            grantResult = _b.sent();
                            return [3 /*break*/, 11];
                        case 6:
                            e_1 = _b.sent();
                            conflict = e_1 instanceof client_1.Prisma.PrismaClientKnownRequestError && e_1.code === 'P2034';
                            if (!conflict)
                                throw e_1;
                            _b.label = 7;
                        case 7:
                            _b.trys.push([7, 9, , 10]);
                            return [4 /*yield*/, grantOnce()];
                        case 8:
                            grantResult = _b.sent();
                            return [3 /*break*/, 10];
                        case 9:
                            retryError_1 = _b.sent();
                            retryConflict = retryError_1 instanceof client_1.Prisma.PrismaClientKnownRequestError && retryError_1.code === 'P2034';
                            if (retryConflict) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '会员状态正在更新，请重试');
                            }
                            throw retryError_1;
                        case 10: return [3 /*break*/, 11];
                        case 11:
                            updated = grantResult.updated, after = grantResult.after;
                            status = (0, ledger_constants_1.deriveMembership)(updated.expiresAt, updated.lastPlanKey, new Date(), {
                                perpetual: isPerpetual || updated.perpetual,
                                trialClaimedAt: updated.trialClaimedAt,
                            });
                            if (!isPerpetual) return [3 /*break*/, 13];
                            return [4 /*yield*/, this.notify(id, 'member', '永久会员已开通', '已为您开通永久会员，长期有效。')];
                        case 12:
                            _b.sent();
                            return [3 /*break*/, 15];
                        case 13: return [4 /*yield*/, this.notify(id, 'member', days >= 0 ? '会员已开通 / 续费' : '会员时长已调整', days >= 0
                                ? "\u5DF2\u4E3A\u60A8\u589E\u52A0 ".concat(days, " \u5929\u4F1A\u5458\u65F6\u957F\uFF0C\u6709\u6548\u671F\u81F3 ").concat(this.ymd(after), "\u3002")
                                : "\u4F1A\u5458\u65F6\u957F\u8C03\u6574 ".concat(days, " \u5929\uFF0C\u5F53\u524D\u6709\u6548\u671F\u81F3 ").concat(this.ymd(after), "\u3002"))];
                        case 14:
                            _b.sent();
                            _b.label = 15;
                        case 15: return [2 /*return*/, { membership: status, deltaDays: deltaDays }];
                    }
                });
            });
        };
        /** 写入一条记账用户的应用内通知（best-effort）。 */
        LedgerAdminService_1.prototype.notify = function (userId, type, title, body) {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, this.prisma.ledgerNotification.create({ data: { userId: userId, type: type, title: title, body: body } })];
                        case 1:
                            _b.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            _a = _b.sent();
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        LedgerAdminService_1.prototype.ymd = function (d) {
            return d.toISOString().slice(0, 10);
        };
        LedgerAdminService_1.prototype.membershipLogs = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var m;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerMembership.findUnique({
                                where: { userId: id },
                                select: { id: true },
                            })];
                        case 1:
                            m = _a.sent();
                            if (!m)
                                return [2 /*return*/, []];
                            return [2 /*return*/, this.prisma.ledgerMembershipLog.findMany({
                                    where: { membershipId: m.id },
                                    orderBy: { createdAt: 'desc' },
                                    take: 50,
                                })];
                    }
                });
            });
        };
        // ── 意见反馈管理 ──────────────────────────────────────────
        LedgerAdminService_1.prototype.listFeedback = function (q) {
            return __awaiter(this, void 0, void 0, function () {
                var where, kw, page, pageSize, _a, rows, total, list;
                var _this = this;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            where = {};
                            if ((q === null || q === void 0 ? void 0 : q.status) === 'open' || (q === null || q === void 0 ? void 0 : q.status) === 'resolved')
                                where.status = q.status;
                            if (q === null || q === void 0 ? void 0 : q.type)
                                where.type = q.type;
                            kw = String((q === null || q === void 0 ? void 0 : q.keyword) || '').trim();
                            if (kw)
                                where.content = { contains: kw };
                            page = Math.max(1, Number(q === null || q === void 0 ? void 0 : q.page) || 1);
                            pageSize = Math.min(200, Math.max(1, Number(q === null || q === void 0 ? void 0 : q.pageSize) || 50));
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.ledgerFeedback.findMany({
                                        where: where,
                                        include: { user: { select: { id: true, nickname: true } } },
                                        orderBy: { createdAt: 'desc' },
                                        skip: (page - 1) * pageSize,
                                        take: pageSize,
                                    }),
                                    this.prisma.ledgerFeedback.count({ where: where }),
                                ])];
                        case 1:
                            _a = _b.sent(), rows = _a[0], total = _a[1];
                            list = rows.map(function (f) {
                                var _a, _b;
                                return ({
                                    id: f.id,
                                    userId: f.userId,
                                    accountCode: ((_a = f.user) === null || _a === void 0 ? void 0 : _a.id.slice(-8).toUpperCase()) || '',
                                    nickname: ((_b = f.user) === null || _b === void 0 ? void 0 : _b.nickname) || '',
                                    type: f.type,
                                    content: f.content,
                                    contact: f.contact,
                                    status: f.status,
                                    reply: f.reply,
                                    images: (Array.isArray(f.images) ? f.images : []).map(function (image) {
                                        var _a;
                                        return typeof image === 'string' && image.startsWith('feedback-private:')
                                            ? ((_a = _this.files) === null || _a === void 0 ? void 0 : _a.feedbackViewUrl(image.slice('feedback-private:'.length))) || ''
                                            : image;
                                    }),
                                    createdAt: f.createdAt,
                                });
                            });
                            return [2 /*return*/, { list: list, total: total, page: page, pageSize: pageSize }];
                    }
                });
            });
        };
        LedgerAdminService_1.prototype.updateFeedback = function (id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var exist, data, f;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerFeedback.findUnique({ where: { id: id } })];
                        case 1:
                            exist = _a.sent();
                            if (!exist)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '反馈不存在');
                            data = {};
                            if (dto.status === 'open' || dto.status === 'resolved')
                                data.status = dto.status;
                            if (dto.reply !== undefined)
                                data.reply = dto.reply.trim() || null;
                            return [4 /*yield*/, this.prisma.ledgerFeedback.update({ where: { id: id }, data: data })];
                        case 2:
                            f = _a.sent();
                            return [2 /*return*/, { id: f.id, status: f.status, reply: f.reply }];
                    }
                });
            });
        };
        // ── 推送通知 ──────────────────────────────────────────────
        LedgerAdminService_1.prototype.pushNotification = function (id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var user, n;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerUser.findUnique({ where: { id: id }, select: { id: true } })];
                        case 1:
                            user = _b.sent();
                            if (!user)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '账号不存在');
                            return [4 /*yield*/, this.prisma.ledgerNotification.create({
                                    data: {
                                        userId: id,
                                        type: ((_a = dto.type) === null || _a === void 0 ? void 0 : _a.trim()) || 'system',
                                        title: dto.title.trim(),
                                        body: dto.body.trim(),
                                    },
                                })];
                        case 2:
                            n = _b.sent();
                            return [2 /*return*/, { id: n.id, ok: true }];
                    }
                });
            });
        };
        // ── 首页广告管理（#2）────────────────────────────────────
        LedgerAdminService_1.prototype.listAds = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.ledgerAd.findMany({ orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }] })];
                });
            });
        };
        LedgerAdminService_1.prototype.createAd = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, _b, _c, _d;
                return __generator(this, function (_e) {
                    return [2 /*return*/, this.prisma.ledgerAd.create({
                            data: {
                                image: dto.image.trim(),
                                title: ((_a = dto.title) === null || _a === void 0 ? void 0 : _a.trim()) || null,
                                link: ((_b = dto.link) === null || _b === void 0 ? void 0 : _b.trim()) || null,
                                sort: (_c = dto.sort) !== null && _c !== void 0 ? _c : 0,
                                enabled: (_d = dto.enabled) !== null && _d !== void 0 ? _d : true,
                            },
                        })];
                });
            });
        };
        LedgerAdminService_1.prototype.updateAd = function (id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var exist, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerAd.findUnique({ where: { id: id } })];
                        case 1:
                            exist = _a.sent();
                            if (!exist)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '广告不存在');
                            data = {};
                            if (dto.image !== undefined)
                                data.image = dto.image.trim();
                            if (dto.title !== undefined)
                                data.title = dto.title.trim() || null;
                            if (dto.link !== undefined)
                                data.link = dto.link.trim() || null;
                            if (dto.sort !== undefined)
                                data.sort = dto.sort;
                            if (dto.enabled !== undefined)
                                data.enabled = dto.enabled;
                            return [2 /*return*/, this.prisma.ledgerAd.update({ where: { id: id }, data: data })];
                    }
                });
            });
        };
        LedgerAdminService_1.prototype.deleteAd = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var exist;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerAd.findUnique({ where: { id: id }, select: { id: true } })];
                        case 1:
                            exist = _a.sent();
                            if (!exist)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '广告不存在');
                            return [4 /*yield*/, this.prisma.ledgerAd.delete({ where: { id: id } })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        // ── 全局功能配置（#9 优化下料 / #10 邀请）────────────────
        LedgerAdminService_1.prototype.getConfig = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a, global, metal;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, Promise.all([
                                this.prisma.ledgerConfig.findUnique({ where: { key: 'global' } }),
                                this.prisma.ledgerConfig.findUnique({ where: { key: 'metal' } }),
                            ])];
                        case 1:
                            _a = _b.sent(), global = _a[0], metal = _a[1];
                            return [2 /*return*/, __assign(__assign({}, (0, ledger_constants_1.normalizeLedgerConfig)(global === null || global === void 0 ? void 0 : global.value)), { metal: (0, metal_config_1.normalizeMetalConfig)(metal === null || metal === void 0 ? void 0 : metal.value) })];
                    }
                });
            });
        };
        LedgerAdminService_1.prototype.updateConfig = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var current, globalChanged, merged, metal;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getConfig()];
                        case 1:
                            current = _a.sent();
                            globalChanged = dto.inviteRewardDays !== undefined || dto.inviteMaxRewarded !== undefined || dto.plans !== undefined;
                            merged = (0, ledger_constants_1.normalizeLedgerConfig)(__assign(__assign({}, current), dto));
                            if (!(globalChanged || dto.metal === undefined)) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.ledgerConfig.upsert({
                                    where: { key: 'global' },
                                    create: { key: 'global', value: merged },
                                    update: { value: merged },
                                })];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3:
                            metal = current.metal;
                            if (!(dto.metal !== undefined)) return [3 /*break*/, 5];
                            metal = (0, metal_config_1.normalizeMetalConfig)(__assign(__assign({}, dto.metal), { updatedAt: new Date().toISOString() }));
                            return [4 /*yield*/, this.prisma.ledgerConfig.upsert({
                                    where: { key: 'metal' },
                                    create: { key: 'metal', value: metal },
                                    update: { value: metal },
                                })];
                        case 4:
                            _a.sent();
                            _a.label = 5;
                        case 5: return [2 /*return*/, __assign(__assign({}, merged), { metal: metal })];
                    }
                });
            });
        };
        // ── 邀请统计（#10）────────────────────────────────────────
        LedgerAdminService_1.prototype.inviteStats = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a, totalUsers, invitedUsers, grouped, sorted, inviters, map, list;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, Promise.all([
                                this.prisma.ledgerUser.count(),
                                this.prisma.ledgerUser.count({ where: { invitedById: { not: null } } }),
                            ])];
                        case 1:
                            _a = _b.sent(), totalUsers = _a[0], invitedUsers = _a[1];
                            return [4 /*yield*/, this.prisma.ledgerUser.groupBy({
                                    by: ['invitedById'],
                                    where: { invitedById: { not: null } },
                                    _count: { _all: true },
                                })];
                        case 2:
                            grouped = _b.sent();
                            sorted = grouped
                                .map(function (g) { return ({ inviterId: g.invitedById, count: g._count._all }); })
                                .sort(function (a, b) { return b.count - a.count; })
                                .slice(0, 100);
                            return [4 /*yield*/, this.prisma.ledgerUser.findMany({
                                    where: { id: { in: sorted.map(function (s) { return s.inviterId; }) } },
                                    select: { id: true, nickname: true, inviteCode: true },
                                })];
                        case 3:
                            inviters = _b.sent();
                            map = new Map(inviters.map(function (u) { return [u.id, u]; }));
                            list = sorted.map(function (s) {
                                var u = map.get(s.inviterId);
                                return {
                                    inviterId: s.inviterId,
                                    accountCode: (u === null || u === void 0 ? void 0 : u.id.slice(-8).toUpperCase()) || '',
                                    nickname: (u === null || u === void 0 ? void 0 : u.nickname) || '',
                                    inviteCode: (u === null || u === void 0 ? void 0 : u.inviteCode) || '',
                                    invitedCount: s.count,
                                };
                            });
                            return [2 /*return*/, { totalUsers: totalUsers, invitedUsers: invitedUsers, list: list }];
                    }
                });
            });
        };
        return LedgerAdminService_1;
    }());
    __setFunctionName(_classThis, "LedgerAdminService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LedgerAdminService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LedgerAdminService = _classThis;
}();
exports.LedgerAdminService = LedgerAdminService;
