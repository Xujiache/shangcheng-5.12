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
exports.LedgerService = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var sharp_1 = require("sharp");
var biz_exception_1 = require("../../common/exceptions/biz.exception");
var ledger_avatar_util_1 = require("./ledger-avatar.util");
var ledger_constants_1 = require("./ledger.constants");
var ledger_stats_query_1 = require("./ledger-stats.query");
/** input/summary JSON 序列化后体积上限（字节），超出拒绝，防滥用。 */
var CUT_JSON_MAX = 20000;
var ymd = function (d) { return d.toISOString().slice(0, 10); };
var workQuantity = function (value) { return Math.round(Number(value) * 100) / 100; };
var workAmount = function (quantity, unitPrice) { return Math.round(quantity * unitPrice); };
function workDateOf(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime()))
        throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '日期格式不正确');
    return date;
}
function monthRange(month) {
    var _a = month.split('-').map(Number), year = _a[0], mon = _a[1];
    var from = new Date(Date.UTC(year, mon - 1, 1));
    var to = new Date(Date.UTC(year, mon, 1));
    return { from: from, to: to };
}
// ── 通知偏好 ──────────────────────────────────────────────
/** 通知类型 → LedgerSetting 开关字段（未列出的类型不受偏好约束，始终投递）。 */
var NOTIFY_SETTING_KEY = {
    order: 'notifyOrder',
    report: 'notifyReport',
    goal: 'notifyGoal',
    member: 'notifySystem',
    system: 'notifySystem',
};
/** 无设置行时的默认值，须与 prisma schema LedgerSetting 各列 @default 一致。 */
var NOTIFY_SETTING_DEFAULTS = {
    notifyOrder: true,
    notifyReport: true,
    notifyGoal: true,
    notifySystem: false,
};
var LEDGER_ACCOUNT_SELECT = {
    id: true,
    nickname: true,
    avatar: true,
    membership: {
        select: {
            expiresAt: true,
            lastPlanKey: true,
            perpetual: true,
            trialClaimedAt: true,
        },
    },
};
/** 门窗利账 App 业务服务。所有读写强制按 userId 隔离（DTO 不接受 userId 入参）。 */
var LedgerService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var LedgerService = _classThis = /** @class */ (function () {
        function LedgerService_1(prisma, contentSecurity, files) {
            this.prisma = prisma;
            this.contentSecurity = contentSecurity;
            this.files = files;
            this.fastReadChecks = new Map();
            this.fastReadReady = new Map();
        }
        LedgerService_1.prototype.assertLedgerTextSafe = function (content, scene) {
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
                            return [4 /*yield*/, ((_a = this.contentSecurity) === null || _a === void 0 ? void 0 : _a.assertTextSafe(content, { scope: 'ledger', scene: scene }))];
                        case 1:
                            _b.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        // ── 账户 / 会员 ───────────────────────────────────────────
        LedgerService_1.prototype.me = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var u;
                var _a, _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerUser.findUnique({
                                where: { id: userId },
                                select: LEDGER_ACCOUNT_SELECT,
                            })];
                        case 1:
                            u = _f.sent();
                            if (!u)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '账号不存在');
                            return [2 /*return*/, {
                                    id: u.id,
                                    accountCode: u.id.slice(-8).toUpperCase(),
                                    nickname: u.nickname,
                                    avatar: (0, ledger_avatar_util_1.sanitizeLedgerAvatar)(u.avatar),
                                    membership: (0, ledger_constants_1.deriveMembership)((_b = (_a = u.membership) === null || _a === void 0 ? void 0 : _a.expiresAt) !== null && _b !== void 0 ? _b : null, (_c = u.membership) === null || _c === void 0 ? void 0 : _c.lastPlanKey, new Date(), {
                                        perpetual: (_d = u.membership) === null || _d === void 0 ? void 0 : _d.perpetual,
                                        trialClaimedAt: (_e = u.membership) === null || _e === void 0 ? void 0 : _e.trialClaimedAt,
                                    }),
                                }];
                    }
                });
            });
        };
        LedgerService_1.prototype.membership = function (userId, current) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, m, cfg;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, Promise.all([
                                current
                                    ? Promise.resolve(null)
                                    : this.prisma.ledgerMembership.findUnique({ where: { userId: userId } }),
                                this.readConfig(),
                            ])];
                        case 1:
                            _a = _c.sent(), m = _a[0], cfg = _a[1];
                            return [2 /*return*/, __assign(__assign({}, (current !== null && current !== void 0 ? current : (0, ledger_constants_1.deriveMembership)((_b = m === null || m === void 0 ? void 0 : m.expiresAt) !== null && _b !== void 0 ? _b : null, m === null || m === void 0 ? void 0 : m.lastPlanKey, new Date(), {
                                    perpetual: m === null || m === void 0 ? void 0 : m.perpetual,
                                    trialClaimedAt: m === null || m === void 0 ? void 0 : m.trialClaimedAt,
                                }))), { plans: cfg.plans })];
                    }
                });
            });
        };
        LedgerService_1.prototype.updateProfile = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var data, nickname;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            data = {};
                            if (!(typeof dto.nickname === 'string' && dto.nickname.trim())) return [3 /*break*/, 2];
                            nickname = dto.nickname.trim();
                            return [4 /*yield*/, this.assertLedgerTextSafe(nickname, 1)];
                        case 1:
                            _a.sent();
                            data.nickname = nickname;
                            _a.label = 2;
                        case 2:
                            if (dto.avatarMode === 'letter') {
                                if (!(0, ledger_avatar_util_1.isLedgerAvatarHue)(dto.avatarHue))
                                    throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请选择头像底色');
                                data.avatar = dto.avatarHue;
                            }
                            else if (dto.avatarHue !== undefined) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '头像底色参数无效');
                            }
                            if (!Object.keys(data).length)
                                return [2 /*return*/, this.me(userId)];
                            return [4 /*yield*/, this.prisma.ledgerUser.update({ where: { id: userId }, data: data })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, this.me(userId)];
                    }
                });
            });
        };
        LedgerService_1.prototype.updateProfileWithAvatar = function (userId, file, nickname) {
            return __awaiter(this, void 0, void 0, function () {
                var actualMime, claimedMime, nextNickname, image, _a, current, uploaded, nextAvatar, error_1, oldId;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!((_b = file === null || file === void 0 ? void 0 : file.buffer) === null || _b === void 0 ? void 0 : _b.length) || file.size !== file.buffer.length)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '图片文件无效');
                            if (file.size > 10 * 1024 * 1024)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '图片不能超过 10MB');
                            actualMime = this.ledgerImageMime(file.buffer);
                            claimedMime = file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype;
                            if (!actualMime || actualMime !== claimedMime)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '图片内容与文件类型不匹配');
                            nextNickname = typeof nickname === 'string' && nickname.trim() ? nickname.trim() : undefined;
                            if (!nextNickname) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.assertLedgerTextSafe(nextNickname, 1)];
                        case 1:
                            _c.sent();
                            _c.label = 2;
                        case 2:
                            _c.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, (0, sharp_1.default)(file.buffer, { failOn: 'error', limitInputPixels: 40000000 })
                                    .rotate()
                                    .resize(512, 512, { fit: 'cover', position: 'centre' })
                                    .flatten({ background: '#ffffff' })
                                    .jpeg({ quality: 86, progressive: true, mozjpeg: true })
                                    .toBuffer()];
                        case 3:
                            image = _c.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            _a = _c.sent();
                            throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请选择有效的图片文件');
                        case 5:
                            if (image.length > 1024 * 1024)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '头像图片过大，请更换图片');
                            if (!this.files)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '头像存储服务未初始化');
                            return [4 /*yield*/, this.prisma.ledgerUser.findUnique({
                                    where: { id: userId },
                                    select: { id: true, nickname: true, avatar: true },
                                })];
                        case 6:
                            current = _c.sent();
                            if (!current)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '账号不存在');
                            return [4 /*yield*/, this.files.upload({ buffer: image, size: image.length, mimetype: 'image/jpeg', originalname: 'avatar.jpg' }, 'avatar', userId, 'ledger')];
                        case 7:
                            uploaded = _c.sent();
                            nextAvatar = (0, ledger_avatar_util_1.ledgerAvatarPath)(uploaded.id);
                            _c.label = 8;
                        case 8:
                            _c.trys.push([8, 10, , 12]);
                            return [4 /*yield*/, this.prisma.ledgerUser.update({
                                    where: { id: userId },
                                    data: __assign(__assign({}, (nextNickname ? { nickname: nextNickname } : {})), { avatar: nextAvatar }),
                                })];
                        case 9:
                            _c.sent();
                            return [3 /*break*/, 12];
                        case 10:
                            error_1 = _c.sent();
                            return [4 /*yield*/, this.files.removeLedgerAvatar(uploaded.id, userId).catch(function () { return null; })];
                        case 11:
                            _c.sent();
                            throw error_1;
                        case 12:
                            oldId = (0, ledger_avatar_util_1.ledgerAvatarImageId)(current.avatar);
                            if (!(oldId && oldId !== uploaded.id)) return [3 /*break*/, 14];
                            return [4 /*yield*/, this.files.removeLedgerAvatar(oldId, userId).catch(function () { return null; })];
                        case 13:
                            _c.sent();
                            _c.label = 14;
                        case 14: return [2 /*return*/, this.me(userId)];
                    }
                });
            });
        };
        LedgerService_1.prototype.ledgerImageMime = function (buffer) {
            if (buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])))
                return 'image/jpeg';
            if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')))
                return 'image/png';
            if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6)))
                return 'image/gif';
            if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP')
                return 'image/webp';
            return null;
        };
        // ── 全局配置（单行 key='global'）───────────────────────────
        LedgerService_1.prototype.readConfig = function () {
            return __awaiter(this, void 0, void 0, function () {
                var row;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerConfig.findUnique({ where: { key: 'global' } })];
                        case 1:
                            row = _a.sent();
                            return [2 /*return*/, (0, ledger_constants_1.normalizeLedgerConfig)(row === null || row === void 0 ? void 0 : row.value)];
                    }
                });
            });
        };
        LedgerService_1.prototype.fastReadsReady = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var cached, pending, check;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (process.env.LEDGER_FAST_READS !== '1')
                                return [2 /*return*/, false];
                            cached = this.fastReadReady.get(userId);
                            if (cached && cached.expiresAt > Date.now())
                                return [2 /*return*/, cached.value];
                            pending = this.fastReadChecks.get(userId);
                            if (pending)
                                return [2 /*return*/, pending
                                    // 部分索引只覆盖空派生值；count 不再扫描已经回填的订单。仅合并正在执行的请求。
                                ];
                            check = this.prisma.ledgerOrder
                                .count({
                                where: {
                                    userId: userId,
                                    OR: [{ revenueAmount: null }, { costAmount: null }, { profitAmount: null }],
                                },
                            })
                                .then(function (missing) {
                                var value = missing === 0;
                                var configured = Number(process.env.LEDGER_FAST_READS_READINESS_TTL_MS);
                                var ttl = Number.isFinite(configured) && configured >= 1000 ? configured : 60000;
                                _this.fastReadReady.set(userId, { value: value, expiresAt: Date.now() + ttl });
                                if (_this.fastReadReady.size > 4096) {
                                    var oldest = _this.fastReadReady.keys().next().value;
                                    if (oldest)
                                        _this.fastReadReady.delete(oldest);
                                }
                                return value;
                            });
                            this.fastReadChecks.set(userId, check);
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, , 3, 4]);
                            return [4 /*yield*/, check];
                        case 2: return [2 /*return*/, _a.sent()];
                        case 3:
                            this.fastReadChecks.delete(userId);
                            return [7 /*endfinally*/];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        // ── 首页广告（#2）：App 取启用中的轮播 ─────────────────────
        LedgerService_1.prototype.listAds = function () {
            return __awaiter(this, void 0, void 0, function () {
                var rows;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerAd.findMany({
                                where: { enabled: true },
                                orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
                                take: 20,
                                select: { id: true, image: true, link: true, title: true },
                            })];
                        case 1:
                            rows = _a.sent();
                            return [2 /*return*/, rows.map(function (a) { return ({ id: a.id, image: a.image, link: a.link || '', title: a.title || '' }); })];
                    }
                });
            });
        };
        // ── 优化下料（#9）：会员闸门 ──────────────────────────────
        /**
         * 返回优化下料可用状态。所有业务能力均以会员有效状态为准，
         * 此接口只用于客户端在进入工具页前展示开通引导，绝不写试用状态或放行未开通账号。
         */
        LedgerService_1.prototype.cutAccess = function (userId, current) {
            return __awaiter(this, void 0, void 0, function () {
                var mem, u;
                var _a, _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            mem = current;
                            if (!!mem) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.prisma.ledgerUser.findUnique({
                                    where: { id: userId },
                                    select: LEDGER_ACCOUNT_SELECT,
                                })];
                        case 1:
                            u = _f.sent();
                            if (!u)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '账号不存在');
                            mem = (0, ledger_constants_1.deriveMembership)((_b = (_a = u.membership) === null || _a === void 0 ? void 0 : _a.expiresAt) !== null && _b !== void 0 ? _b : null, (_c = u.membership) === null || _c === void 0 ? void 0 : _c.lastPlanKey, new Date(), {
                                perpetual: (_d = u.membership) === null || _d === void 0 ? void 0 : _d.perpetual,
                                trialClaimedAt: (_e = u.membership) === null || _e === void 0 ? void 0 : _e.trialClaimedAt,
                            });
                            _f.label = 2;
                        case 2:
                            if (mem.active) {
                                return [2 /*return*/, {
                                        allowed: true,
                                        mode: 'member',
                                        membership: mem,
                                    }];
                            }
                            return [2 /*return*/, {
                                    allowed: false,
                                    mode: 'locked',
                                    membership: mem,
                                    reason: '优化下料为会员功能，开通会员后即可使用',
                                }];
                    }
                });
            });
        };
        // ── 邀请（#10）：好友首次微信登录时建立邀请关系 ────────────
        /** 取（必要时生成）当前账号的邀请码。 */
        LedgerService_1.prototype.ensureInviteCode = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var u, i, code, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerUser.findUnique({
                                where: { id: userId },
                                select: { inviteCode: true },
                            })];
                        case 1:
                            u = _b.sent();
                            if (!u)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '账号不存在');
                            if (u.inviteCode)
                                return [2 /*return*/, u.inviteCode];
                            i = 0;
                            _b.label = 2;
                        case 2:
                            if (!(i < 6)) return [3 /*break*/, 7];
                            code = (0, ledger_constants_1.genLedgerInviteCode)();
                            _b.label = 3;
                        case 3:
                            _b.trys.push([3, 5, , 6]);
                            return [4 /*yield*/, this.prisma.ledgerUser.update({ where: { id: userId }, data: { inviteCode: code } })];
                        case 4:
                            _b.sent();
                            return [2 /*return*/, code];
                        case 5:
                            _a = _b.sent();
                            return [3 /*break*/, 6];
                        case 6:
                            i++;
                            return [3 /*break*/, 2];
                        case 7: throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '邀请码生成失败，请重试');
                    }
                });
            });
        };
        LedgerService_1.prototype.getInvite = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var code, cfg, invitedCount;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.ensureInviteCode(userId)];
                        case 1:
                            code = _a.sent();
                            return [4 /*yield*/, this.readConfig()];
                        case 2:
                            cfg = _a.sent();
                            return [4 /*yield*/, this.prisma.ledgerUser.count({ where: { invitedById: userId } })];
                        case 3:
                            invitedCount = _a.sent();
                            return [2 /*return*/, {
                                    inviteCode: code,
                                    invitedCount: invitedCount,
                                    rewardDays: cfg.inviteRewardDays,
                                }];
                    }
                });
            });
        };
        // ── 订单 ──────────────────────────────────────────────────
        LedgerService_1.prototype.mapOrder = function (o, useDerivedAmounts) {
            var _a;
            if (useDerivedAmounts === void 0) { useDerivedAmounts = false; }
            var extras = (0, ledger_constants_1.sanitizeExtras)(o.extras);
            var customCosts = (0, ledger_constants_1.sanitizeCustomCosts)(o.customCosts);
            var base = {
                total: o.total,
                costProfile: o.costProfile,
                costGlass: o.costGlass,
                costHardware: o.costHardware,
                costLabor: o.costLabor,
                costScreen: o.costScreen,
                extras: extras,
                customCosts: customCosts,
            };
            var items = (0, ledger_constants_1.sanitizeOrderItems)(o.items);
            var revenue = useDerivedAmounts && o.revenueAmount != null ? Number(o.revenueAmount) : (0, ledger_constants_1.revenueOf)(base);
            var cost = useDerivedAmounts && o.costAmount != null ? Number(o.costAmount) : (0, ledger_constants_1.totalCost)(base);
            var profit = useDerivedAmounts && o.profitAmount != null ? Number(o.profitAmount) : (0, ledger_constants_1.profitOf)(base);
            return {
                id: o.id,
                customerId: o.customerId,
                customer: o.customerName,
                date: ymd(o.date),
                total: o.total,
                received: o.received || 0,
                revenue: revenue,
                costs: {
                    profile: o.costProfile,
                    glass: o.costGlass,
                    hardware: o.costHardware,
                    labor: o.costLabor,
                    screen: o.costScreen,
                },
                extras: extras,
                customCosts: customCosts,
                // 门窗报价明细
                items: items,
                discount: o.discount || 0,
                recycle: o.recycle || 0,
                deposit: o.deposit || 0,
                amount: (0, ledger_constants_1.orderItemsAmount)(items), // 金额 = Σ小计
                unpaid: Math.max(0, (o.total || 0) - (o.deposit || 0) - (o.received || 0)), // 未收 = 总价 − 定金 − 收款
                note: (_a = o.note) !== null && _a !== void 0 ? _a : '',
                fixedCost: (0, ledger_constants_1.fixedCost)(base),
                extrasTotal: (0, ledger_constants_1.extrasTotal)(extras),
                customCostsTotal: (0, ledger_constants_1.customCostsTotal)(customCosts),
                cost: cost,
                profit: profit,
                margin: revenue ? profit / revenue : 0,
            };
        };
        LedgerService_1.prototype.listOrders = function (userId, q) {
            return __awaiter(this, void 0, void 0, function () {
                var where, range, from, to, pmin, pmax, _a, rows, list, total, page, pageSize, items, sums;
                var _this = this;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            where = { userId: userId };
                            if (q.customer)
                                where.customerName = { contains: q.customer };
                            if (q.dateFrom || q.dateTo) {
                                range = {};
                                from = q.dateFrom ? new Date(q.dateFrom) : null;
                                to = q.dateTo ? new Date("".concat(q.dateTo, "T23:59:59.999Z")) : null;
                                if (from && !isNaN(from.getTime()))
                                    range.gte = from;
                                if (to && !isNaN(to.getTime()))
                                    range.lte = to;
                                if (Object.keys(range).length)
                                    where.date = range;
                            }
                            pmin = q.profitMin != null && q.profitMin !== '' ? Number(q.profitMin) : null;
                            pmax = q.profitMax != null && q.profitMax !== '' ? Number(q.profitMax) : null;
                            _a = (pmin === null || Number.isFinite(pmin)) &&
                                (pmax === null || Number.isFinite(pmax)) &&
                                Number.isInteger(Number(q.page || 1)) &&
                                Number.isInteger(Number(q.pageSize || 50));
                            if (!_a) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.fastReadsReady(userId)];
                        case 1:
                            _a = (_b.sent());
                            _b.label = 2;
                        case 2:
                            // 增量字段回填并逐单核验后才切读路径；存在空值时自动沿用旧实现，不漏历史单。
                            if (_a) {
                                return [2 /*return*/, this.listOrdersFast(where, q, pmin, pmax)];
                            }
                            return [4 /*yield*/, this.prisma.ledgerOrder.findMany({ where: where, orderBy: { date: 'desc' } })];
                        case 3:
                            rows = _b.sent();
                            list = rows.map(function (r) { return _this.mapOrder(r); });
                            // 利润区间筛选（派生字段，内存过滤）
                            if (pmin != null)
                                list = list.filter(function (o) { return o.profit >= pmin; });
                            if (pmax != null)
                                list = list.filter(function (o) { return o.profit <= pmax; });
                            if (q.sort === 'profit')
                                list.sort(function (a, b) { return b.profit - a.profit; });
                            total = list.length;
                            page = Math.max(1, Number(q.page) || 1);
                            pageSize = Math.min(200, Math.max(1, Number(q.pageSize) || 50));
                            items = list.slice((page - 1) * pageSize, page * pageSize);
                            sums = list.reduce(function (s, o) { return ({
                                revenue: s.revenue + o.total,
                                profit: s.profit + o.profit,
                                cost: s.cost + o.cost,
                            }); }, { revenue: 0, profit: 0, cost: 0 });
                            return [2 /*return*/, {
                                    list: items,
                                    total: total,
                                    page: page,
                                    pageSize: pageSize,
                                    summary: __assign(__assign({ count: total }, sums), { avgProfit: total ? Math.round(sums.profit / total) : 0 }),
                                }];
                    }
                });
            });
        };
        LedgerService_1.prototype.listOrdersFast = function (where, q, pmin, pmax) {
            return __awaiter(this, void 0, void 0, function () {
                var page, pageSize, rowsQuery, aggregateQuery, _a, rows, aggregate, _b, total, sums;
                var _this = this;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (pmin !== null || pmax !== null) {
                                where.profitAmount = __assign(__assign({}, (pmin !== null ? { gte: Math.ceil(pmin) } : {})), (pmax !== null ? { lte: Math.floor(pmax) } : {}));
                            }
                            page = Math.max(1, Number(q.page) || 1);
                            pageSize = Math.min(200, Math.max(1, Number(q.pageSize) || 50));
                            rowsQuery = this.prisma.ledgerOrder.findMany({
                                where: where,
                                orderBy: q.sort === 'profit' ? [{ profitAmount: 'desc' }, { date: 'desc' }] : { date: 'desc' },
                                skip: (page - 1) * pageSize,
                                take: pageSize,
                            });
                            aggregateQuery = this.prisma.ledgerOrder.aggregate({
                                where: where,
                                _count: { _all: true },
                                _sum: { total: true, costAmount: true, profitAmount: true },
                            });
                            if (!(typeof this.prisma.$transaction === 'function')) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.prisma.$transaction([rowsQuery, aggregateQuery], {
                                    isolationLevel: client_1.Prisma.TransactionIsolationLevel.RepeatableRead,
                                })];
                        case 1:
                            _b = _c.sent();
                            return [3 /*break*/, 4];
                        case 2: return [4 /*yield*/, Promise.all([rowsQuery, aggregateQuery])];
                        case 3:
                            _b = _c.sent();
                            _c.label = 4;
                        case 4:
                            _a = _b, rows = _a[0], aggregate = _a[1];
                            total = aggregate._count._all;
                            sums = {
                                revenue: aggregate._sum.total || 0, // 兼容旧列表：汇总 revenue 为订单总价，不含 extras。
                                cost: Number(aggregate._sum.costAmount || 0),
                                profit: Number(aggregate._sum.profitAmount || 0),
                            };
                            return [2 /*return*/, {
                                    list: rows.map(function (r) { return _this.mapOrder(r, true); }),
                                    total: total,
                                    page: page,
                                    pageSize: pageSize,
                                    summary: __assign(__assign({ count: total }, sums), { avgProfit: total ? Math.round(sums.profit / total) : 0 }),
                                }];
                    }
                });
            });
        };
        LedgerService_1.prototype.getOrder = function (userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var o;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerOrder.findFirst({ where: { id: id, userId: userId } })];
                        case 1:
                            o = _a.sent();
                            if (!o)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '订单不存在');
                            return [2 /*return*/, this.mapOrder(o)];
                    }
                });
            });
        };
        LedgerService_1.prototype.resolveCustomer = function (userId, customerId, fallbackName) {
            return __awaiter(this, void 0, void 0, function () {
                var c;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!customerId)
                                return [2 /*return*/, { customerId: null, customerName: (fallbackName || '').trim() }];
                            return [4 /*yield*/, this.prisma.ledgerCustomer.findFirst({
                                    where: { id: customerId, userId: userId },
                                    select: { id: true, name: true },
                                })];
                        case 1:
                            c = _a.sent();
                            if (!c) {
                                // 客户不属于本账号或已删 → 忽略 id，保留名字（快速录入兜底）
                                return [2 /*return*/, { customerId: null, customerName: (fallbackName || '').trim() }];
                            }
                            return [2 /*return*/, { customerId: c.id, customerName: (fallbackName || c.name).trim() }];
                    }
                });
            });
        };
        LedgerService_1.prototype.createOrder = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, customerId, customerName, items, discount, recycle, deposit, total, date, data, o, mapped;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.resolveCustomer(userId, dto.customerId, dto.customerName)];
                        case 1:
                            _a = _c.sent(), customerId = _a.customerId, customerName = _a.customerName;
                            if (!customerName)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请填写客户');
                            items = (0, ledger_constants_1.sanitizeOrderItems)(dto.items);
                            discount = Math.max(0, Math.round(dto.discount || 0));
                            recycle = Math.max(0, Math.round(dto.recycle || 0));
                            deposit = Math.max(0, Math.round(dto.deposit || 0));
                            total = items.length
                                ? (0, ledger_constants_1.orderTotalFromItems)(items, discount, recycle)
                                : Math.round(dto.total || 0);
                            if (!(total > 0))
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '订单总价需大于 0');
                            date = new Date(dto.date);
                            if (isNaN(date.getTime()))
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '日期格式不正确');
                            data = {
                                userId: userId,
                                customerId: customerId,
                                customerName: customerName,
                                date: date,
                                total: total,
                                received: Math.max(0, Math.round(dto.received || 0)),
                                costProfile: Math.max(0, Math.round(dto.costProfile || 0)),
                                costGlass: Math.max(0, Math.round(dto.costGlass || 0)),
                                costHardware: Math.max(0, Math.round(dto.costHardware || 0)),
                                costLabor: Math.max(0, Math.round(dto.costLabor || 0)),
                                costScreen: Math.max(0, Math.round(dto.costScreen || 0)),
                                extras: (0, ledger_constants_1.sanitizeExtras)(dto.extras),
                                customCosts: (0, ledger_constants_1.sanitizeCustomCosts)(dto.customCosts),
                                items: items,
                                discount: discount,
                                recycle: recycle,
                                deposit: deposit,
                                note: ((_b = dto.note) === null || _b === void 0 ? void 0 : _b.trim()) || null,
                            };
                            data.revenueAmount = BigInt((0, ledger_constants_1.revenueOf)(data));
                            data.costAmount = BigInt((0, ledger_constants_1.totalCost)(data));
                            data.profitAmount = data.revenueAmount - data.costAmount;
                            return [4 /*yield*/, this.prisma.ledgerOrder.create({ data: data })];
                        case 2:
                            o = _c.sent();
                            mapped = this.mapOrder(o);
                            // 录单成功 → 写入一条真实的应用内通知（消息中心由业务事件驱动，无假数据）
                            return [4 /*yield*/, this.pushNotification(userId, 'order', '订单已保存', "\u5BA2\u6237\u300C".concat(mapped.customer, "\u300D\u7684\u8BA2\u5355\u5DF2\u5F55\u5165\uFF0C\u5229\u6DA6 ").concat(this.money(mapped.profit), "\u3002"))];
                        case 3:
                            // 录单成功 → 写入一条真实的应用内通知（消息中心由业务事件驱动，无假数据）
                            _c.sent();
                            return [2 /*return*/, mapped];
                    }
                });
            });
        };
        LedgerService_1.prototype.updateOrder = function (userId, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var exist, data, r, d, finalItems, disc, rec, financial, o;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerOrder.findFirst({ where: { id: id, userId: userId } })];
                        case 1:
                            exist = _c.sent();
                            if (!exist)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '订单不存在');
                            data = {};
                            if (!(dto.customerId !== undefined || dto.customerName !== undefined)) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.resolveCustomer(userId, dto.customerId !== undefined ? dto.customerId : ((_a = exist.customerId) !== null && _a !== void 0 ? _a : undefined), dto.customerName !== undefined ? dto.customerName : exist.customerName)];
                        case 2:
                            r = _c.sent();
                            data.customerId = r.customerId;
                            if (r.customerName)
                                data.customerName = r.customerName;
                            _c.label = 3;
                        case 3:
                            if (dto.date !== undefined) {
                                d = new Date(dto.date);
                                if (isNaN(d.getTime()))
                                    throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '日期格式不正确');
                                data.date = d;
                            }
                            if (dto.total !== undefined)
                                data.total = Math.max(0, Math.round(dto.total));
                            if (dto.received !== undefined)
                                data.received = Math.max(0, Math.round(dto.received));
                            if (dto.costProfile !== undefined)
                                data.costProfile = Math.max(0, Math.round(dto.costProfile));
                            if (dto.costGlass !== undefined)
                                data.costGlass = Math.max(0, Math.round(dto.costGlass));
                            if (dto.costHardware !== undefined)
                                data.costHardware = Math.max(0, Math.round(dto.costHardware));
                            if (dto.costLabor !== undefined)
                                data.costLabor = Math.max(0, Math.round(dto.costLabor));
                            if (dto.costScreen !== undefined)
                                data.costScreen = Math.max(0, Math.round(dto.costScreen));
                            if (dto.extras !== undefined)
                                data.extras = (0, ledger_constants_1.sanitizeExtras)(dto.extras);
                            if (dto.customCosts !== undefined)
                                data.customCosts = (0, ledger_constants_1.sanitizeCustomCosts)(dto.customCosts);
                            if (dto.items !== undefined)
                                data.items = (0, ledger_constants_1.sanitizeOrderItems)(dto.items);
                            if (dto.discount !== undefined)
                                data.discount = Math.max(0, Math.round(dto.discount));
                            if (dto.recycle !== undefined)
                                data.recycle = Math.max(0, Math.round(dto.recycle));
                            if (dto.deposit !== undefined)
                                data.deposit = Math.max(0, Math.round(dto.deposit));
                            if (dto.note !== undefined)
                                data.note = ((_b = dto.note) === null || _b === void 0 ? void 0 : _b.trim()) || null;
                            finalItems = data.items !== undefined ? data.items : (0, ledger_constants_1.sanitizeOrderItems)(exist.items);
                            if (finalItems.length) {
                                disc = data.discount !== undefined ? data.discount : exist.discount;
                                rec = data.recycle !== undefined ? data.recycle : exist.recycle;
                                data.total = (0, ledger_constants_1.orderTotalFromItems)(finalItems, disc, rec);
                            }
                            financial = __assign(__assign({}, exist), data);
                            data.revenueAmount = BigInt((0, ledger_constants_1.revenueOf)(financial));
                            data.costAmount = BigInt((0, ledger_constants_1.totalCost)(financial));
                            data.profitAmount = data.revenueAmount - data.costAmount;
                            return [4 /*yield*/, this.prisma.ledgerOrder.update({ where: { id: id, userId: userId }, data: data })];
                        case 4:
                            o = _c.sent();
                            return [2 /*return*/, this.mapOrder(o)];
                    }
                });
            });
        };
        LedgerService_1.prototype.deleteOrder = function (userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var exist;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerOrder.findFirst({ where: { id: id, userId: userId } })];
                        case 1:
                            exist = _a.sent();
                            if (!exist)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '订单不存在');
                            return [4 /*yield*/, this.prisma.ledgerOrder.delete({ where: { id: id, userId: userId } })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        // ── 客户 ──────────────────────────────────────────────────
        LedgerService_1.prototype.listCustomers = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, customers, orders, map;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.fastReadsReady(userId)];
                        case 1:
                            if (_b.sent()) {
                                return [2 /*return*/, this.listCustomersFast(userId)];
                            }
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.ledgerCustomer.findMany({
                                        where: { userId: userId },
                                        orderBy: { createdAt: 'desc' },
                                        select: { id: true, name: true, phone: true, address: true, note: true },
                                    }),
                                    this.prisma.ledgerOrder.findMany({
                                        where: { userId: userId },
                                        select: {
                                            customerName: true,
                                            date: true,
                                            total: true,
                                            costProfile: true,
                                            costGlass: true,
                                            costHardware: true,
                                            costLabor: true,
                                            costScreen: true,
                                            extras: true,
                                            customCosts: true,
                                        },
                                    }),
                                ])];
                        case 2:
                            _a = _b.sent(), customers = _a[0], orders = _a[1];
                            map = new Map();
                            customers.forEach(function (c) {
                                return map.set(c.name, {
                                    id: c.id,
                                    name: c.name,
                                    phone: c.phone,
                                    address: c.address,
                                    note: c.note,
                                    count: 0,
                                    revenue: 0,
                                    profit: 0,
                                    cost: 0,
                                    lastDate: '',
                                });
                            });
                            orders.forEach(function (o) {
                                var key = o.customerName;
                                if (!map.has(key)) {
                                    map.set(key, {
                                        id: null,
                                        name: key,
                                        phone: null,
                                        address: null,
                                        note: null,
                                        count: 0,
                                        revenue: 0,
                                        profit: 0,
                                        cost: 0,
                                        lastDate: '',
                                    });
                                }
                                var c = map.get(key);
                                var p = (0, ledger_constants_1.profitOf)(o);
                                c.count++;
                                c.revenue += o.total;
                                c.profit += p;
                                c.cost += (0, ledger_constants_1.totalCost)(o);
                                var d = ymd(o.date);
                                if (d > c.lastDate)
                                    c.lastDate = d;
                            });
                            return [2 /*return*/, Array.from(map.values())
                                    .map(function (c) { return (__assign(__assign({}, c), { margin: c.revenue ? c.profit / c.revenue : 0 })); })
                                    .sort(function (a, b) { return b.profit - a.profit; })];
                    }
                });
            });
        };
        LedgerService_1.prototype.listCustomersFast = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var customersQuery, groupsQuery, _a, customers, groups, _b, map;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            customersQuery = this.prisma.ledgerCustomer.findMany({
                                where: { userId: userId },
                                orderBy: { createdAt: 'desc' },
                                select: { id: true, name: true, phone: true, address: true, note: true },
                            });
                            groupsQuery = this.prisma.ledgerOrder.groupBy({
                                by: ['customerName'],
                                where: { userId: userId },
                                orderBy: { customerName: 'asc' },
                                _count: { _all: true },
                                _sum: { total: true, profitAmount: true, costAmount: true },
                                _max: { date: true },
                            });
                            if (!(typeof this.prisma.$transaction === 'function')) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.prisma.$transaction([customersQuery, groupsQuery], {
                                    isolationLevel: client_1.Prisma.TransactionIsolationLevel.RepeatableRead,
                                })];
                        case 1:
                            _b = _c.sent();
                            return [3 /*break*/, 4];
                        case 2: return [4 /*yield*/, Promise.all([customersQuery, groupsQuery])];
                        case 3:
                            _b = _c.sent();
                            _c.label = 4;
                        case 4:
                            _a = _b, customers = _a[0], groups = _a[1];
                            map = new Map();
                            customers.forEach(function (c) {
                                return map.set(c.name, {
                                    id: c.id,
                                    name: c.name,
                                    phone: c.phone,
                                    address: c.address,
                                    note: c.note,
                                    count: 0,
                                    revenue: 0,
                                    profit: 0,
                                    cost: 0,
                                    lastDate: '',
                                });
                            });
                            groups.forEach(function (g) {
                                var c = map.get(g.customerName) || {
                                    id: null,
                                    name: g.customerName,
                                    phone: null,
                                    address: null,
                                    note: null,
                                    count: 0,
                                    revenue: 0,
                                    profit: 0,
                                    cost: 0,
                                    lastDate: '',
                                };
                                c.count = g._count._all;
                                c.revenue = g._sum.total || 0;
                                c.profit = Number(g._sum.profitAmount || 0);
                                c.cost = Number(g._sum.costAmount || 0);
                                c.lastDate = g._max.date ? ymd(g._max.date) : '';
                                map.set(g.customerName, c);
                            });
                            return [2 /*return*/, Array.from(map.values())
                                    .map(function (c) { return (__assign(__assign({}, c), { margin: c.revenue ? c.profit / c.revenue : 0 })); })
                                    .sort(function (a, b) { return b.profit - a.profit; })];
                    }
                });
            });
        };
        LedgerService_1.prototype.getCustomer = function (userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var c, orders, mapped, revenue, profit;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerCustomer.findFirst({
                                where: { id: id, userId: userId },
                                select: { id: true, name: true, phone: true, address: true, note: true, createdAt: true },
                            })];
                        case 1:
                            c = _a.sent();
                            if (!c)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '客户不存在');
                            return [4 /*yield*/, this.prisma.ledgerOrder.findMany({
                                    // customerId 精确匹配；同名仅兜底无 customerId 的历史/快录订单，避免同名客户串档
                                    where: { userId: userId, OR: [{ customerId: id }, { customerName: c.name, customerId: null }] },
                                    orderBy: { date: 'desc' },
                                })];
                        case 2:
                            orders = _a.sent();
                            mapped = orders.map(function (o) { return _this.mapOrder(o); });
                            revenue = mapped.reduce(function (s, o) { return s + o.total; }, 0);
                            profit = mapped.reduce(function (s, o) { return s + o.profit; }, 0);
                            return [2 /*return*/, {
                                    id: c.id,
                                    name: c.name,
                                    phone: c.phone,
                                    address: c.address,
                                    note: c.note,
                                    since: ymd(c.createdAt),
                                    count: mapped.length,
                                    revenue: revenue,
                                    profit: profit,
                                    margin: revenue ? profit / revenue : 0,
                                    orders: mapped,
                                }];
                    }
                });
            });
        };
        LedgerService_1.prototype.createCustomer = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var name, c;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            name = String(dto.name || '').trim();
                            if (!name)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请填写客户姓名');
                            return [4 /*yield*/, this.prisma.ledgerCustomer.create({
                                    data: {
                                        userId: userId,
                                        name: name,
                                        phone: ((_a = dto.phone) === null || _a === void 0 ? void 0 : _a.trim()) || null,
                                        address: ((_b = dto.address) === null || _b === void 0 ? void 0 : _b.trim()) || null,
                                        note: ((_c = dto.note) === null || _c === void 0 ? void 0 : _c.trim()) || null,
                                    },
                                })];
                        case 1:
                            c = _d.sent();
                            return [2 /*return*/, c];
                    }
                });
            });
        };
        /**
         * 按姓名确保客户档案存在（幂等）：同名已建档则复用，否则新建；
         * 并把同名、未关联档案的历史订单关联到该档案（与客户列表「按名归并」一致）。
         * 供客户列表点击「订单自动生成的无档客户」时自动建档并进入详情。
         */
        LedgerService_1.prototype.ensureCustomerByName = function (userId, rawName) {
            return __awaiter(this, void 0, void 0, function () {
                var name, c;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            name = String(rawName || '').trim();
                            if (!name)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请填写客户姓名');
                            return [4 /*yield*/, this.prisma.ledgerCustomer.findFirst({ where: { userId: userId, name: name } })];
                        case 1:
                            c = _a.sent();
                            if (!!c) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.ledgerCustomer.create({ data: { userId: userId, name: name } })];
                        case 2:
                            c = _a.sent();
                            _a.label = 3;
                        case 3: 
                        // 把同名、未关联档案的历史订单挂到该档案，使统计/再下单与档案一致
                        return [4 /*yield*/, this.prisma.ledgerOrder.updateMany({
                                where: { userId: userId, customerName: name, customerId: null },
                                data: { customerId: c.id },
                            })];
                        case 4:
                            // 把同名、未关联档案的历史订单挂到该档案，使统计/再下单与档案一致
                            _a.sent();
                            return [2 /*return*/, c];
                    }
                });
            });
        };
        LedgerService_1.prototype.updateCustomer = function (userId, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var exist, data, c;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerCustomer.findFirst({ where: { id: id, userId: userId } })];
                        case 1:
                            exist = _d.sent();
                            if (!exist)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '客户不存在');
                            data = {};
                            if (dto.name !== undefined && dto.name.trim())
                                data.name = dto.name.trim();
                            if (dto.phone !== undefined)
                                data.phone = ((_a = dto.phone) === null || _a === void 0 ? void 0 : _a.trim()) || null;
                            if (dto.address !== undefined)
                                data.address = ((_b = dto.address) === null || _b === void 0 ? void 0 : _b.trim()) || null;
                            if (dto.note !== undefined)
                                data.note = ((_c = dto.note) === null || _c === void 0 ? void 0 : _c.trim()) || null;
                            return [4 /*yield*/, this.prisma.ledgerCustomer.update({ where: { id: id, userId: userId }, data: data })
                                // 改名时同步历史订单的冗余客户名，保持一致
                            ];
                        case 2:
                            c = _d.sent();
                            if (!(data.name && data.name !== exist.name)) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.prisma.ledgerOrder.updateMany({
                                    where: { userId: userId, customerId: id },
                                    data: { customerName: data.name },
                                })];
                        case 3:
                            _d.sent();
                            _d.label = 4;
                        case 4: return [2 /*return*/, c];
                    }
                });
            });
        };
        LedgerService_1.prototype.deleteCustomer = function (userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var exist;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerCustomer.findFirst({ where: { id: id, userId: userId } })];
                        case 1:
                            exist = _a.sent();
                            if (!exist)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '客户不存在');
                            // 先解绑历史订单（保留 customerName 快照），再删档，避免外键约束失败
                            return [4 /*yield*/, this.prisma.ledgerOrder.updateMany({
                                    where: { userId: userId, customerId: id },
                                    data: { customerId: null },
                                })];
                        case 2:
                            // 先解绑历史订单（保留 customerName 快照），再删档，避免外键约束失败
                            _a.sent();
                            return [4 /*yield*/, this.prisma.ledgerCustomer.delete({ where: { id: id, userId: userId } })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        // ── 记工（日工台账，按 userId 隔离，不计入订单成本）────────────────────
        LedgerService_1.prototype.mapWorkLog = function (row) {
            return {
                id: row.id,
                workDate: ymd(row.workDate),
                workerName: row.workerName,
                jobType: row.jobType,
                unit: row.unit,
                quantity: Number(row.quantity),
                unitPrice: row.unitPrice,
                amount: row.amount,
                note: row.note,
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
            };
        };
        LedgerService_1.prototype.listWorkLogs = function (userId, query) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, from, to, rows, list, summary;
                var _this = this;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = monthRange(query.month), from = _a.from, to = _a.to;
                            return [4 /*yield*/, this.prisma.ledgerWorkLog.findMany({
                                    where: { userId: userId, workDate: { gte: from, lt: to } },
                                    orderBy: [{ workDate: 'desc' }, { createdAt: 'desc' }],
                                    select: {
                                        id: true,
                                        workDate: true,
                                        workerName: true,
                                        jobType: true,
                                        unit: true,
                                        quantity: true,
                                        unitPrice: true,
                                        amount: true,
                                        note: true,
                                        createdAt: true,
                                        updatedAt: true,
                                    },
                                })];
                        case 1:
                            rows = _b.sent();
                            list = rows.map(function (row) { return _this.mapWorkLog(row); });
                            summary = list.reduce(function (acc, row) {
                                acc.totalAmount += row.amount;
                                if (row.unit === 'day')
                                    acc.dayQuantity += row.quantity;
                                else
                                    acc.hourQuantity += row.quantity;
                                return acc;
                            }, { totalAmount: 0, dayQuantity: 0, hourQuantity: 0, count: list.length });
                            return [2 /*return*/, { month: query.month, list: list, summary: summary }];
                    }
                });
            });
        };
        LedgerService_1.prototype.createWorkLog = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var workerName, quantity, unitPrice, row;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            workerName = dto.workerName.trim();
                            if (!workerName)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请填写工人姓名');
                            quantity = workQuantity(dto.quantity);
                            unitPrice = Math.round(dto.unitPrice);
                            return [4 /*yield*/, this.prisma.ledgerWorkLog.create({
                                    data: {
                                        userId: userId,
                                        workDate: workDateOf(dto.workDate),
                                        workerName: workerName,
                                        jobType: ((_a = dto.jobType) === null || _a === void 0 ? void 0 : _a.trim()) || null,
                                        unit: dto.unit,
                                        quantity: quantity,
                                        unitPrice: unitPrice,
                                        amount: workAmount(quantity, unitPrice),
                                        note: ((_b = dto.note) === null || _b === void 0 ? void 0 : _b.trim()) || null,
                                    },
                                })];
                        case 1:
                            row = _c.sent();
                            return [2 /*return*/, this.mapWorkLog(row)];
                    }
                });
            });
        };
        LedgerService_1.prototype.updateWorkLog = function (userId, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var current, workerName, quantity, unitPrice, row;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerWorkLog.findFirst({ where: { id: id, userId: userId } })];
                        case 1:
                            current = _a.sent();
                            if (!current)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '记工记录不存在');
                            workerName = dto.workerName === undefined ? current.workerName : dto.workerName.trim();
                            if (!workerName)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请填写工人姓名');
                            quantity = dto.quantity === undefined ? Number(current.quantity) : workQuantity(dto.quantity);
                            unitPrice = dto.unitPrice === undefined ? current.unitPrice : Math.round(dto.unitPrice);
                            return [4 /*yield*/, this.prisma.ledgerWorkLog.update({
                                    where: { id: id },
                                    data: __assign(__assign(__assign(__assign(__assign(__assign({}, (dto.workDate === undefined ? {} : { workDate: workDateOf(dto.workDate) })), { workerName: workerName }), (dto.jobType === undefined ? {} : { jobType: dto.jobType.trim() || null })), (dto.unit === undefined ? {} : { unit: dto.unit })), { quantity: quantity, unitPrice: unitPrice, amount: workAmount(quantity, unitPrice) }), (dto.note === undefined ? {} : { note: dto.note.trim() || null })),
                                })];
                        case 2:
                            row = _a.sent();
                            return [2 /*return*/, this.mapWorkLog(row)];
                    }
                });
            });
        };
        LedgerService_1.prototype.deleteWorkLog = function (userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var deleted;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerWorkLog.deleteMany({ where: { id: id, userId: userId } })];
                        case 1:
                            deleted = _a.sent();
                            if (!deleted.count)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '记工记录不存在');
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        // ── 优化下料·云端历史（按 userId 隔离）────────────────────
        /** JSON 体积上限校验（input/summary 防滥用）。超限 → 1001。 */
        LedgerService_1.prototype.assertCutJsonSize = function (obj, field) {
            var size = 0;
            try {
                size = JSON.stringify(obj !== null && obj !== void 0 ? obj : null).length;
            }
            catch (_a) {
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, "".concat(field, " \u6570\u636E\u65E0\u6CD5\u5E8F\u5217\u5316"));
            }
            if (size > CUT_JSON_MAX)
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, "".concat(field, " \u6570\u636E\u8FC7\u5927"));
        };
        /** 列表行映射（仅暴露契约字段，按需精简）。 */
        LedgerService_1.prototype.mapCutPlan = function (p) {
            return {
                id: p.id,
                title: p.title,
                material: p.material,
                input: p.input,
                summary: p.summary,
                updatedAt: p.updatedAt.toISOString(),
            };
        };
        /** 方案列表，最新在前，最多 100 条，强制按 userId 隔离。 */
        LedgerService_1.prototype.listCutPlans = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var rows;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerCutPlan.findMany({
                                where: { userId: userId },
                                orderBy: { updatedAt: 'desc' },
                                take: 100,
                                select: { id: true, title: true, material: true, input: true, summary: true, updatedAt: true },
                            })];
                        case 1:
                            rows = _a.sent();
                            return [2 /*return*/, rows.map(function (r) { return _this.mapCutPlan(r); })];
                    }
                });
            });
        };
        LedgerService_1.prototype.createCutPlan = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var title, p;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            title = String(dto.title || '').trim();
                            if (!title)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请填写方案名称');
                            this.assertCutJsonSize(dto.input, 'input');
                            this.assertCutJsonSize(dto.summary, 'summary');
                            return [4 /*yield*/, this.prisma.ledgerCutPlan.create({
                                    data: {
                                        userId: userId,
                                        title: title.slice(0, 40),
                                        material: dto.material,
                                        input: dto.input,
                                        summary: dto.summary,
                                    },
                                })];
                        case 1:
                            p = _a.sent();
                            return [2 /*return*/, this.mapCutPlan(p)];
                    }
                });
            });
        };
        LedgerService_1.prototype.updateCutPlan = function (userId, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var exist, data, t, p;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerCutPlan.findFirst({ where: { id: id, userId: userId } })];
                        case 1:
                            exist = _a.sent();
                            if (!exist)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '方案不存在');
                            data = {};
                            if (dto.title !== undefined) {
                                t = String(dto.title).trim();
                                if (!t)
                                    throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请填写方案名称');
                                data.title = t.slice(0, 40);
                            }
                            if (dto.material !== undefined)
                                data.material = dto.material;
                            if (dto.input !== undefined) {
                                this.assertCutJsonSize(dto.input, 'input');
                                data.input = dto.input;
                            }
                            if (dto.summary !== undefined) {
                                this.assertCutJsonSize(dto.summary, 'summary');
                                data.summary = dto.summary;
                            }
                            return [4 /*yield*/, this.prisma.ledgerCutPlan.update({ where: { id: id, userId: userId }, data: data })];
                        case 2:
                            p = _a.sent();
                            return [2 /*return*/, this.mapCutPlan(p)];
                    }
                });
            });
        };
        LedgerService_1.prototype.deleteCutPlan = function (userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var exist;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerCutPlan.findFirst({ where: { id: id, userId: userId } })];
                        case 1:
                            exist = _a.sent();
                            if (!exist)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '方案不存在');
                            return [4 /*yield*/, this.prisma.ledgerCutPlan.delete({ where: { id: id, userId: userId } })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        // ── 统计 ──────────────────────────────────────────────────
        LedgerService_1.prototype.overview = function (userId_1) {
            return __awaiter(this, arguments, void 0, function (userId, period) {
                var now, Y, M, fast, ranges, startMonth, endMonth, orderQuery, settingQuery, goalQuery, reads, _a, _b, _c, all, setting, goalRow, grouped, totals, cur, categoryMeta, costSliceMap, topOrders, trend, yearProfit, monthProfit, goal;
                var _d, _e;
                if (period === void 0) { period = 'month'; }
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            now = new Date();
                            Y = now.getFullYear();
                            M = now.getMonth();
                            return [4 /*yield*/, this.fastReadsReady(userId)];
                        case 1:
                            fast = _f.sent();
                            ranges = Array.from({ length: 12 }, function (_, month) { return ({
                                from: new Date(Y, month, 1),
                                until: new Date(Y, month + 1, 1),
                            }); });
                            startMonth = period === 'year' ? 0 : period === 'quarter' ? Math.floor(M / 3) * 3 : M;
                            endMonth = period === 'year' ? 12 : period === 'quarter' ? startMonth + 3 : M + 1;
                            orderQuery = this.prisma.ledgerOrder.findMany({
                                where: {
                                    userId: userId,
                                    date: fast
                                        ? { gte: ranges[startMonth].from, lt: ranges[endMonth - 1].until }
                                        : { gte: ranges[0].from, lt: ranges[11].until },
                                },
                                select: {
                                    id: true,
                                    customerName: true,
                                    date: true,
                                    total: true,
                                    costProfile: true,
                                    costGlass: true,
                                    costHardware: true,
                                    costLabor: true,
                                    costScreen: true,
                                    extras: true,
                                    customCosts: true,
                                },
                            });
                            settingQuery = this.prisma.ledgerSetting.findUnique({
                                where: { userId: userId },
                                select: { costCategories: true },
                            });
                            goalQuery = this.prisma.ledgerGoal.findUnique({
                                where: { userId: userId },
                                select: { monthly: true, yearly: true },
                            });
                            if (!fast) return [3 /*break*/, 6];
                            if (!(typeof this.prisma.$transaction === 'function')) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.$transaction([
                                    orderQuery,
                                    settingQuery,
                                    goalQuery,
                                    this.prisma.$queryRaw((0, ledger_stats_query_1.ledgerStatsQuery)(userId, ranges)),
                                ], { isolationLevel: client_1.Prisma.TransactionIsolationLevel.RepeatableRead })];
                        case 2:
                            _b = _f.sent();
                            return [3 /*break*/, 5];
                        case 3: return [4 /*yield*/, Promise.all([
                                orderQuery,
                                settingQuery,
                                goalQuery,
                                this.prisma.$queryRaw((0, ledger_stats_query_1.ledgerStatsQuery)(userId, ranges)),
                            ])];
                        case 4:
                            _b = _f.sent();
                            _f.label = 5;
                        case 5:
                            _a = _b;
                            return [3 /*break*/, 8];
                        case 6: return [4 /*yield*/, Promise.all([orderQuery, settingQuery, goalQuery, Promise.resolve(null)])];
                        case 7:
                            _a = _f.sent();
                            _f.label = 8;
                        case 8:
                            reads = _a;
                            _c = reads, all = _c[0], setting = _c[1], goalRow = _c[2], grouped = _c[3];
                            totals = ranges.map(function () { return ({ count: 0, revenue: 0, cost: 0, profit: 0 }); });
                            if (grouped) {
                                grouped.forEach(function (row) {
                                    totals[row.index] = {
                                        count: Number(row.count),
                                        revenue: Number(row.revenue),
                                        cost: Number(row.cost),
                                        profit: Number(row.profit),
                                    };
                                });
                            }
                            else {
                                all.forEach(function (row) {
                                    if (row.date.getFullYear() !== Y)
                                        return;
                                    var bucket = totals[row.date.getMonth()];
                                    var cost = (0, ledger_constants_1.totalCost)(row);
                                    bucket.count++;
                                    bucket.revenue += row.total;
                                    bucket.cost += cost;
                                    bucket.profit += (0, ledger_constants_1.revenueOf)(row) - cost;
                                });
                            }
                            cur = totals.slice(startMonth, endMonth).reduce(function (sum, bucket) { return ({
                                count: sum.count + bucket.count,
                                revenue: sum.revenue + bucket.revenue,
                                cost: sum.cost + bucket.cost,
                                profit: sum.profit + bucket.profit,
                            }); }, { count: 0, revenue: 0, cost: 0, profit: 0 });
                            categoryMeta = new Map((0, ledger_constants_1.sanitizeCostCategories)(setting === null || setting === void 0 ? void 0 : setting.costCategories).map(function (item) { return [item.id, item]; }));
                            costSliceMap = new Map();
                            topOrders = [];
                            all.forEach(function (order) {
                                var month = order.date.getMonth();
                                if (order.date.getFullYear() !== Y || month < startMonth || month >= endMonth)
                                    return;
                                orderCostBreakdown(order, categoryMeta).forEach(function (item) {
                                    var current = costSliceMap.get(item.key);
                                    if (current) {
                                        current.value += item.value;
                                        if (item.custom) {
                                            current.name = item.name;
                                            current.color = item.color;
                                        }
                                    }
                                    else {
                                        costSliceMap.set(item.key, {
                                            key: item.key,
                                            name: item.name,
                                            color: item.color,
                                            value: item.value,
                                        });
                                    }
                                });
                                // 仅保留前五名；相同利润保持原查询顺序，不对整个周期复制并排序。
                                var profit = (0, ledger_constants_1.profitOf)(order);
                                var rank = topOrders.findIndex(function (item) { return item.profit < profit; });
                                var index = rank < 0 ? topOrders.length : rank;
                                if (index < 5) {
                                    var revenue = (0, ledger_constants_1.revenueOf)(order);
                                    topOrders.splice(index, 0, {
                                        id: order.id,
                                        customer: order.customerName,
                                        date: ymd(order.date),
                                        total: order.total,
                                        profit: profit,
                                        margin: revenue ? profit / revenue : 0,
                                    });
                                    if (topOrders.length > 5)
                                        topOrders.pop();
                                }
                            });
                            trend = totals.map(function (bucket, index) { return ({
                                month: index + 1,
                                label: "".concat(index + 1, "\u6708"),
                                count: bucket.count,
                                revenue: bucket.revenue,
                                profit: bucket.profit,
                            }); });
                            yearProfit = totals.reduce(function (sum, bucket) { return sum + bucket.profit; }, 0);
                            monthProfit = totals[M].profit;
                            goal = { monthly: (_d = goalRow === null || goalRow === void 0 ? void 0 : goalRow.monthly) !== null && _d !== void 0 ? _d : 0, yearly: (_e = goalRow === null || goalRow === void 0 ? void 0 : goalRow.yearly) !== null && _e !== void 0 ? _e : 0 };
                            return [2 /*return*/, __assign(__assign({ period: period }, cur), { avgProfit: cur.count ? Math.round(cur.profit / cur.count) : 0, yearProfit: yearProfit, monthProfit: monthProfit, costSlices: __spreadArray([], costSliceMap.values(), true).filter(function (item) { return item.value > 0; }), topOrders: topOrders, trend: trend, goal: goal, goalProgress: {
                                        monthly: goal.monthly ? monthProfit / goal.monthly : 0,
                                        yearly: goal.yearly ? yearProfit / goal.yearly : 0,
                                    } })];
                    }
                });
            });
        };
        LedgerService_1.prototype.monthlySeries = function (userId, year) {
            return __awaiter(this, void 0, void 0, function () {
                var Y, all, series, yearProfit, yearLabor, count;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            Y = year || new Date().getFullYear();
                            return [4 /*yield*/, this.prisma.ledgerOrder.findMany({
                                    where: { userId: userId, date: { gte: new Date(Y, 0, 1), lt: new Date(Y + 1, 0, 1) } },
                                    select: {
                                        date: true,
                                        total: true,
                                        costProfile: true,
                                        costGlass: true,
                                        costHardware: true,
                                        costLabor: true,
                                        costScreen: true,
                                        extras: true,
                                        customCosts: true,
                                    },
                                })];
                        case 1:
                            all = _a.sent();
                            series = Array.from({ length: 12 }, function (_, index) { return ({
                                month: index + 1,
                                label: "".concat(index + 1, "\u6708"),
                                count: 0,
                                revenue: 0,
                                cost: 0,
                                profit: 0,
                                labor: 0,
                                categoryCosts: {},
                                otherCost: 0,
                            }); });
                            yearProfit = 0;
                            yearLabor = 0;
                            count = 0;
                            all.forEach(function (order) {
                                if (order.date.getFullYear() !== Y)
                                    return;
                                var bucket = series[order.date.getMonth()];
                                var cost = (0, ledger_constants_1.totalCost)(order);
                                var profit = (0, ledger_constants_1.revenueOf)(order) - cost;
                                bucket.count++;
                                bucket.revenue += order.total;
                                bucket.cost += cost;
                                bucket.profit += profit;
                                count++;
                                yearProfit += profit;
                                orderCostBreakdown(order).forEach(function (item) {
                                    bucket.categoryCosts[item.key] = (bucket.categoryCosts[item.key] || 0) + item.value;
                                    if (item.key === 'labor')
                                        yearLabor += item.value;
                                });
                            });
                            series.forEach(function (bucket) {
                                bucket.labor = bucket.categoryCosts.labor || 0;
                                bucket.otherCost = Math.max(0, bucket.cost - bucket.labor);
                            });
                            return [2 /*return*/, { year: Y, series: series, yearProfit: yearProfit, yearLabor: yearLabor, count: count }];
                    }
                });
            });
        };
        /** 首页日/月/年序列：数据库快路径只返回 5～31 个桶，旧数据按原公式单次分桶。 */
        LedgerService_1.prototype.series = function (userId_1) {
            return __awaiter(this, arguments, void 0, function (userId, granularity) {
                var now, Y, M, ranges, labels, unit, size, i, buckets, rows, rows, summary;
                if (granularity === void 0) { granularity = 'month'; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            now = new Date();
                            Y = now.getFullYear();
                            M = now.getMonth();
                            ranges = [];
                            labels = [];
                            unit = granularity === 'day' ? '日' : granularity === 'year' ? '年' : '月';
                            size = granularity === 'day' ? new Date(Y, M + 1, 0).getDate() : granularity === 'year' ? 5 : 12;
                            for (i = 0; i < size; i++) {
                                if (granularity === 'day') {
                                    ranges.push({ from: new Date(Y, M, i + 1), until: new Date(Y, M, i + 2) });
                                    labels.push(String(i + 1));
                                }
                                else if (granularity === 'year') {
                                    ranges.push({ from: new Date(Y - 4 + i, 0, 1), until: new Date(Y - 3 + i, 0, 1) });
                                    labels.push(String(Y - 4 + i));
                                }
                                else {
                                    ranges.push({ from: new Date(Y, i, 1), until: new Date(Y, i + 1, 1) });
                                    labels.push("".concat(i + 1, "\u6708"));
                                }
                            }
                            buckets = labels.map(function (label) { return ({ label: label, count: 0, revenue: 0, cost: 0, profit: 0 }); });
                            return [4 /*yield*/, this.fastReadsReady(userId)];
                        case 1:
                            if (!_a.sent()) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.$queryRaw((0, ledger_stats_query_1.ledgerStatsQuery)(userId, ranges))];
                        case 2:
                            rows = _a.sent();
                            rows.forEach(function (row) {
                                Object.assign(buckets[row.index], {
                                    count: Number(row.count),
                                    revenue: Number(row.revenue),
                                    cost: Number(row.cost),
                                    profit: Number(row.profit),
                                });
                            });
                            return [3 /*break*/, 5];
                        case 3: return [4 /*yield*/, this.prisma.ledgerOrder.findMany({
                                where: { userId: userId, date: { gte: ranges[0].from, lt: ranges[size - 1].until } },
                                select: {
                                    date: true,
                                    total: true,
                                    costProfile: true,
                                    costGlass: true,
                                    costHardware: true,
                                    costLabor: true,
                                    costScreen: true,
                                    extras: true,
                                    customCosts: true,
                                },
                            })];
                        case 4:
                            rows = _a.sent();
                            rows.forEach(function (row) {
                                var date = row.date;
                                var index = granularity === 'day'
                                    ? date.getFullYear() === Y && date.getMonth() === M
                                        ? date.getDate() - 1
                                        : -1
                                    : granularity === 'year'
                                        ? date.getFullYear() - (Y - 4)
                                        : date.getFullYear() === Y
                                            ? date.getMonth()
                                            : -1;
                                var bucket = buckets[index];
                                if (!bucket)
                                    return;
                                var cost = (0, ledger_constants_1.totalCost)(row);
                                bucket.count++;
                                bucket.revenue += row.total;
                                bucket.cost += cost;
                                bucket.profit += (0, ledger_constants_1.revenueOf)(row) - cost;
                            });
                            _a.label = 5;
                        case 5:
                            summary = buckets.reduce(function (sum, bucket) { return ({
                                count: sum.count + bucket.count,
                                revenue: sum.revenue + bucket.revenue,
                                cost: sum.cost + bucket.cost,
                                profit: sum.profit + bucket.profit,
                            }); }, { count: 0, revenue: 0, cost: 0, profit: 0 });
                            return [2 /*return*/, {
                                    granularity: granularity,
                                    unit: unit,
                                    buckets: buckets,
                                    summary: __assign(__assign({}, summary), { avgProfit: summary.count ? Math.round(summary.profit / summary.count) : 0 }),
                                }];
                    }
                });
            });
        };
        // ── 经营目标 ─────────────────────────────────────────────
        LedgerService_1.prototype.getGoal = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var g;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerGoal.findUnique({
                                where: { userId: userId },
                                select: { monthly: true, yearly: true },
                            })];
                        case 1:
                            g = _c.sent();
                            return [2 /*return*/, { monthly: (_a = g === null || g === void 0 ? void 0 : g.monthly) !== null && _a !== void 0 ? _a : 0, yearly: (_b = g === null || g === void 0 ? void 0 : g.yearly) !== null && _b !== void 0 ? _b : 0 }];
                    }
                });
            });
        };
        LedgerService_1.prototype.setGoal = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var g;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerGoal.upsert({
                                where: { userId: userId },
                                update: __assign(__assign({}, (dto.monthly !== undefined ? { monthly: Math.max(0, Math.round(dto.monthly)) } : {})), (dto.yearly !== undefined ? { yearly: Math.max(0, Math.round(dto.yearly)) } : {})),
                                create: {
                                    userId: userId,
                                    monthly: Math.max(0, Math.round(dto.monthly || 0)),
                                    yearly: Math.max(0, Math.round(dto.yearly || 0)),
                                },
                            })];
                        case 1:
                            g = _a.sent();
                            return [2 /*return*/, { monthly: g.monthly, yearly: g.yearly }];
                    }
                });
            });
        };
        // ── 消息中心 ──────────────────────────────────────────────
        /** 金额格式化（¥ + 千分位），用于自动生成的通知文案。 */
        LedgerService_1.prototype.money = function (n) {
            return ('¥' +
                Math.round(n || 0)
                    .toString()
                    .replace(/\B(?=(\d{3})+(?!\d))/g, ','));
        };
        /**
         * 写入一条应用内通知（best-effort，失败不影响主流程）。
         * 先查目标用户的通知偏好，对应类型关闭则不投递；无设置行按默认值。
         *
         * 免打扰（dndEnabled/dndStart/dndEnd）按设计只约束「推送渠道」（打扰类，
         * 如微信订阅消息），不拦应用内收件箱——收件箱是拉取式，用户主动打开才看，
         * 不构成打扰；DND 期间仍写入收件箱，避免静默丢消息。
         * 当前尚无推送渠道接入，故 dnd* 字段为预留、暂无运行期消费方；
         * 接入推送渠道时应在该渠道发送边界调用 dnd 时间窗判断（注意跨午夜）。
         */
        LedgerService_1.prototype.pushNotification = function (userId, type, title, body) {
            return __awaiter(this, void 0, void 0, function () {
                var key, s, enabled, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 4, , 5]);
                            key = NOTIFY_SETTING_KEY[type];
                            if (!key) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.prisma.ledgerSetting.findUnique({
                                    where: { userId: userId },
                                    select: { notifyOrder: true, notifyReport: true, notifyGoal: true, notifySystem: true },
                                })];
                        case 1:
                            s = _b.sent();
                            enabled = s ? s[key] : NOTIFY_SETTING_DEFAULTS[key];
                            if (!enabled)
                                return [2 /*return*/];
                            _b.label = 2;
                        case 2: return [4 /*yield*/, this.prisma.ledgerNotification.create({ data: { userId: userId, type: type, title: title, body: body } })];
                        case 3:
                            _b.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            _a = _b.sent();
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        LedgerService_1.prototype.listNotifications = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var rows;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerNotification.findMany({
                                where: { userId: userId },
                                orderBy: { createdAt: 'desc' },
                                take: 100,
                                select: { id: true, type: true, title: true, body: true, read: true, createdAt: true },
                            })];
                        case 1:
                            rows = _a.sent();
                            return [2 /*return*/, rows.map(function (n) { return ({
                                    id: n.id,
                                    type: n.type,
                                    title: n.title,
                                    body: n.body,
                                    unread: !n.read,
                                    createdAt: n.createdAt.toISOString(),
                                }); })];
                    }
                });
            });
        };
        LedgerService_1.prototype.unreadCount = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var count;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerNotification.count({ where: { userId: userId, read: false } })];
                        case 1:
                            count = _a.sent();
                            return [2 /*return*/, { count: count }];
                    }
                });
            });
        };
        LedgerService_1.prototype.markNotificationRead = function (userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerNotification.updateMany({
                                where: { id: id, userId: userId },
                                data: { read: true },
                            })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, this.unreadCount(userId)];
                    }
                });
            });
        };
        LedgerService_1.prototype.markAllNotificationsRead = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerNotification.updateMany({
                                where: { userId: userId, read: false },
                                data: { read: true },
                            })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { count: 0 }];
                    }
                });
            });
        };
        // ── 偏好设置 ──────────────────────────────────────────────
        LedgerService_1.prototype.mapSetting = function (s) {
            return {
                notifyOrder: s.notifyOrder,
                notifyReport: s.notifyReport,
                notifyGoal: s.notifyGoal,
                notifySystem: s.notifySystem,
                dndEnabled: s.dndEnabled,
                dndStart: s.dndStart,
                dndEnd: s.dndEnd,
                hideAmount: s.hideAmount,
                bioLock: s.bioLock,
                encBackup: s.encBackup,
                costCategories: (0, ledger_constants_1.sanitizeCostCategories)(s.costCategories),
            };
        };
        /** 读取偏好（首次访问自动建默认行）。 */
        LedgerService_1.prototype.getSettings = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var s;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerSetting.upsert({
                                where: { userId: userId },
                                update: {},
                                create: { userId: userId },
                            })];
                        case 1:
                            s = _a.sent();
                            return [2 /*return*/, this.mapSetting(s)];
                    }
                });
            });
        };
        LedgerService_1.prototype.updateSettings = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var data, boolKeys, s;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            data = {};
                            boolKeys = [
                                'notifyOrder',
                                'notifyReport',
                                'notifyGoal',
                                'notifySystem',
                                'dndEnabled',
                                'hideAmount',
                                'bioLock',
                                'encBackup',
                            ];
                            boolKeys.forEach(function (k) {
                                if (dto[k] !== undefined)
                                    data[k] = dto[k];
                            });
                            if (dto.dndStart !== undefined)
                                data.dndStart = dto.dndStart;
                            if (dto.dndEnd !== undefined)
                                data.dndEnd = dto.dndEnd;
                            if (dto.costCategories !== undefined)
                                data.costCategories = (0, ledger_constants_1.sanitizeCostCategories)(dto.costCategories);
                            return [4 /*yield*/, this.prisma.ledgerSetting.upsert({
                                    where: { userId: userId },
                                    update: data,
                                    create: __assign({ userId: userId }, data),
                                })];
                        case 1:
                            s = _a.sent();
                            return [2 /*return*/, this.mapSetting(s)];
                    }
                });
            });
        };
        // ── 意见反馈 ──────────────────────────────────────────────
        LedgerService_1.prototype.createFeedback = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var content, submitted, images, _a, fb;
                var _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            content = String(dto.content || '').trim();
                            if (!content)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请填写反馈内容');
                            return [4 /*yield*/, this.assertLedgerTextSafe(content, 2)];
                        case 1:
                            _d.sent();
                            submitted = Array.isArray(dto.images)
                                ? dto.images.filter(function (u) { return typeof u === 'string'; }).slice(0, 9)
                                : [];
                            if (process.env.NODE_ENV === 'production' && !this.files)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '反馈图片权限服务未初始化');
                            if (!this.files) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.files.normalizeFeedbackImages(userId, submitted)];
                        case 2:
                            _a = _d.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            _a = submitted.filter(function (u) { return /^https?:\/\//.test(u); });
                            _d.label = 4;
                        case 4:
                            images = _a;
                            return [4 /*yield*/, this.prisma.ledgerFeedback.create({
                                    data: {
                                        userId: userId,
                                        type: dto.type || 'general',
                                        content: content.slice(0, 1000),
                                        contact: ((_c = (_b = dto.contact) === null || _b === void 0 ? void 0 : _b.trim()) === null || _c === void 0 ? void 0 : _c.slice(0, 40)) || null,
                                        images: images.length ? images : undefined,
                                    },
                                })];
                        case 5:
                            fb = _d.sent();
                            return [2 /*return*/, { id: fb.id, ok: true }];
                    }
                });
            });
        };
        return LedgerService_1;
    }());
    __setFunctionName(_classThis, "LedgerService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LedgerService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LedgerService = _classThis;
}();
exports.LedgerService = LedgerService;
var LEGACY_COST_META = [
    { key: 'profile', field: 'costProfile', name: '型材', color: 'c1' },
    { key: 'glass', field: 'costGlass', name: '玻璃', color: 'c2' },
    { key: 'hardware', field: 'costHardware', name: '配件', color: 'c3' },
    { key: 'labor', field: 'costLabor', name: '人工', color: 'c4' },
    { key: 'screen', field: 'costScreen', name: '纱窗', color: 'c5' },
];
function orderCostBreakdown(order, categoryMeta) {
    var map = new Map();
    LEGACY_COST_META.forEach(function (meta) {
        var value = Math.max(0, Math.round(Number(order === null || order === void 0 ? void 0 : order[meta.field]) || 0));
        var configured = categoryMeta === null || categoryMeta === void 0 ? void 0 : categoryMeta.get(meta.key);
        if (value > 0)
            map.set(meta.key, __assign(__assign({}, meta), { name: (configured === null || configured === void 0 ? void 0 : configured.name) || meta.name, color: (configured === null || configured === void 0 ? void 0 : configured.color) || meta.color, value: value, custom: false }));
    });
    (0, ledger_constants_1.sanitizeCustomCosts)(order === null || order === void 0 ? void 0 : order.customCosts).forEach(function (item, index) {
        var key = item.id || "custom-name-".concat(encodeURIComponent(item.name));
        var current = map.get(key);
        var configured = categoryMeta === null || categoryMeta === void 0 ? void 0 : categoryMeta.get(key);
        var name = (configured === null || configured === void 0 ? void 0 : configured.name) || item.name;
        var color = (configured === null || configured === void 0 ? void 0 : configured.color) || item.color || "c".concat((index % 6) + 1);
        if (current) {
            current.value += item.amount;
            current.name = name;
            current.color = color;
            current.custom = true;
        }
        else {
            map.set(key, {
                key: key,
                name: name,
                color: color,
                value: item.amount,
                custom: true,
            });
        }
    });
    return __spreadArray([], map.values(), true);
}
