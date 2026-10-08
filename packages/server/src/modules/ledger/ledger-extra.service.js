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
exports.LedgerExtraService = void 0;
var common_1 = require("@nestjs/common");
var node_crypto_1 = require("node:crypto");
var biz_exception_1 = require("../../common/exceptions/biz.exception");
var ledger_constants_1 = require("./ledger.constants");
// 导出包对称密钥：优先专用 env，缺省回退 JWT_SECRET 派生（务必生产配置 LEDGER_EXPORT_SECRET）
var EXPORT_SECRET = process.env.LEDGER_EXPORT_SECRET || process.env.JWT_SECRET || 'ledger-export-fallback';
var EXPORT_KEY = (0, node_crypto_1.scryptSync)(EXPORT_SECRET, 'ledger-export-salt-v1', 32);
var PKG_PREFIX = 'LJBK1.'; // 数据包前缀标识
var MAX_IMPORT_ORDERS = 5000;
var IMPORT_BATCH_SIZE = 250;
var int = function (x) { return Math.max(0, Math.round(Number(x) || 0)); };
var LedgerExtraService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var LedgerExtraService = _classThis = /** @class */ (function () {
        function LedgerExtraService_1(prisma) {
            this.prisma = prisma;
            this.logger = new common_1.Logger('LedgerExtra');
        }
        // ── 更新日志 ─────────────────────────────────────────────
        /** 客户端：全部已发布更新日志（更新日志页）。 */
        LedgerExtraService_1.prototype.changelogList = function () {
            return __awaiter(this, void 0, void 0, function () {
                var rows;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerChangelog.findMany({
                                where: { published: true },
                                orderBy: { version: 'desc' },
                            })];
                        case 1:
                            rows = _a.sent();
                            return [2 /*return*/, rows.map(function (r) { return ({
                                    version: r.version,
                                    title: r.title,
                                    content: r.content,
                                    date: r.createdAt,
                                }); })];
                    }
                });
            });
        };
        /** 客户端：某版本的更新日志（用于首开弹窗，按版本定向）。无则返回 null。 */
        LedgerExtraService_1.prototype.changelogByVersion = function (version) {
            return __awaiter(this, void 0, void 0, function () {
                var v, r;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            v = String(version || '').trim();
                            if (!v)
                                return [2 /*return*/, null];
                            return [4 /*yield*/, this.prisma.ledgerChangelog.findFirst({
                                    where: { version: v, published: true },
                                })];
                        case 1:
                            r = _a.sent();
                            if (!r)
                                return [2 /*return*/, null];
                            return [2 /*return*/, { version: r.version, title: r.title, content: r.content, date: r.createdAt }];
                    }
                });
            });
        };
        /** 后台：全部（含未发布）。 */
        LedgerExtraService_1.prototype.changelogAll = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.ledgerChangelog.findMany({ orderBy: { version: 'desc' } })];
                });
            });
        };
        LedgerExtraService_1.prototype.changelogCreate = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var version, title, content, dup;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            version = String(dto.version || '').trim();
                            title = String(dto.title || '').trim();
                            content = String(dto.content || '').trim();
                            if (!version)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请填写版本号');
                            if (!title)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请填写标题');
                            return [4 /*yield*/, this.prisma.ledgerChangelog.findUnique({ where: { version: version } })];
                        case 1:
                            dup = _a.sent();
                            if (dup)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.CONFLICT, "\u7248\u672C ".concat(version, " \u7684\u66F4\u65B0\u65E5\u5FD7\u5DF2\u5B58\u5728"));
                            return [2 /*return*/, this.prisma.ledgerChangelog.create({
                                    data: {
                                        version: version.slice(0, 20),
                                        title: title.slice(0, 60),
                                        content: content.slice(0, 4000),
                                        published: dto.published !== false,
                                    },
                                })];
                    }
                });
            });
        };
        LedgerExtraService_1.prototype.changelogUpdate = function (id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var exist, data, v, dup;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerChangelog.findUnique({ where: { id: id } })];
                        case 1:
                            exist = _a.sent();
                            if (!exist)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '更新日志不存在');
                            data = {};
                            if (!(dto.version !== undefined)) return [3 /*break*/, 4];
                            v = String(dto.version).trim();
                            if (!v)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '版本号不能为空');
                            if (!(v !== exist.version)) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.ledgerChangelog.findUnique({ where: { version: v } })];
                        case 2:
                            dup = _a.sent();
                            if (dup)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.CONFLICT, "\u7248\u672C ".concat(v, " \u5DF2\u5B58\u5728"));
                            _a.label = 3;
                        case 3:
                            data.version = v.slice(0, 20);
                            _a.label = 4;
                        case 4:
                            if (dto.title !== undefined)
                                data.title = String(dto.title).trim().slice(0, 60);
                            if (dto.content !== undefined)
                                data.content = String(dto.content).trim().slice(0, 4000);
                            if (dto.published !== undefined)
                                data.published = !!dto.published;
                            return [2 /*return*/, this.prisma.ledgerChangelog.update({ where: { id: id }, data: data })];
                    }
                });
            });
        };
        LedgerExtraService_1.prototype.changelogRemove = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var exist;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerChangelog.findUnique({ where: { id: id } })];
                        case 1:
                            exist = _a.sent();
                            if (!exist)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '更新日志不存在');
                            return [4 /*yield*/, this.prisma.ledgerChangelog.delete({ where: { id: id } })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        // ── 加密数据导出 / 导入 ──────────────────────────────────
        LedgerExtraService_1.prototype.encrypt = function (obj) {
            var iv = (0, node_crypto_1.randomBytes)(12);
            var cipher = (0, node_crypto_1.createCipheriv)('aes-256-gcm', EXPORT_KEY, iv);
            var plain = Buffer.from(JSON.stringify(obj), 'utf8');
            var enc = Buffer.concat([cipher.update(plain), cipher.final()]);
            var tag = cipher.getAuthTag();
            // iv(12) + tag(16) + enc
            return PKG_PREFIX + Buffer.concat([iv, tag, enc]).toString('base64');
        };
        LedgerExtraService_1.prototype.decrypt = function (token) {
            var t = String(token || '').trim();
            if (!t.startsWith(PKG_PREFIX))
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '数据包格式不正确');
            var raw;
            try {
                raw = Buffer.from(t.slice(PKG_PREFIX.length), 'base64');
            }
            catch (e) {
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '数据包已损坏');
            }
            if (raw.length < 29)
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '数据包已损坏');
            var iv = raw.subarray(0, 12);
            var tag = raw.subarray(12, 28);
            var enc = raw.subarray(28);
            try {
                var decipher = (0, node_crypto_1.createDecipheriv)('aes-256-gcm', EXPORT_KEY, iv);
                decipher.setAuthTag(tag);
                var dec = Buffer.concat([decipher.update(enc), decipher.final()]); // 篡改/换密钥 → 抛错
                return JSON.parse(dec.toString('utf8'));
            }
            catch (e) {
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '数据包无效或已被篡改');
            }
        };
        /** 导出该用户全部订单+客户为加密数据包。allowShare 决定他人能否导入。 */
        LedgerExtraService_1.prototype.exportData = function (userId, allowShare) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, orders, customers, payload;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, Promise.all([
                                this.prisma.ledgerOrder.findMany({ where: { userId: userId }, orderBy: { date: 'asc' } }),
                                this.prisma.ledgerCustomer.findMany({ where: { userId: userId }, orderBy: { createdAt: 'asc' } }),
                            ])];
                        case 1:
                            _a = _b.sent(), orders = _a[0], customers = _a[1];
                            payload = {
                                v: 1,
                                owner: userId,
                                allowShare: !!allowShare,
                                exportedAt: new Date().toISOString(),
                                data: {
                                    customers: customers.map(function (c) { return ({
                                        name: c.name,
                                        phone: c.phone,
                                        address: c.address,
                                        note: c.note,
                                    }); }),
                                    orders: orders.map(function (o) { return ({
                                        date: o.date,
                                        customerName: o.customerName,
                                        total: o.total,
                                        received: o.received,
                                        deposit: o.deposit,
                                        discount: o.discount,
                                        recycle: o.recycle,
                                        costProfile: o.costProfile,
                                        costGlass: o.costGlass,
                                        costHardware: o.costHardware,
                                        costLabor: o.costLabor,
                                        costScreen: o.costScreen,
                                        extras: o.extras,
                                        customCosts: o.customCosts,
                                        items: o.items,
                                        note: o.note,
                                    }); }),
                                },
                            };
                            return [2 /*return*/, {
                                    package: this.encrypt(payload),
                                    orders: orders.length,
                                    customers: customers.length,
                                    allowShare: !!allowShare,
                                }];
                    }
                });
            });
        };
        /** 导入加密数据包到当前用户。非本人导出且 allowShare=false 时拒绝。 */
        LedgerExtraService_1.prototype.importData = function (userId, token) {
            return __awaiter(this, void 0, void 0, function () {
                var pkg, data, customers, orders, existing, nameMap, pendingCustomerRows, _i, customers_1, c, name_1, storedName, storedId, id, start, orderRows, _a, orders_1, o, customerName, customerId, d, orderData;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            pkg = this.decrypt(token);
                            if (!pkg || pkg.v !== 1 || !pkg.data)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '数据包格式不支持');
                            if (pkg.owner !== userId && !pkg.allowShare)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '该数据包未开启共享，不允许被他人导入');
                            data = pkg.data || {};
                            customers = Array.isArray(data.customers) ? data.customers : [];
                            orders = Array.isArray(data.orders) ? data.orders : [];
                            if (orders.length > MAX_IMPORT_ORDERS)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '数据包过大，无法导入');
                            return [4 /*yield*/, this.prisma.ledgerCustomer.findMany({
                                    where: { userId: userId },
                                    select: { id: true, name: true },
                                })];
                        case 1:
                            existing = _b.sent();
                            nameMap = new Map(existing.map(function (c) { return [c.name, c.id]; }));
                            pendingCustomerRows = [];
                            for (_i = 0, customers_1 = customers; _i < customers_1.length; _i++) {
                                c = customers_1[_i];
                                name_1 = String((c === null || c === void 0 ? void 0 : c.name) || '').trim();
                                if (!name_1 || nameMap.has(name_1))
                                    continue;
                                storedName = name_1.slice(0, 40);
                                storedId = nameMap.get(storedName);
                                if (storedId) {
                                    nameMap.set(name_1, storedId);
                                    continue;
                                }
                                id = (0, node_crypto_1.randomUUID)();
                                nameMap.set(name_1, id);
                                nameMap.set(storedName, id);
                                pendingCustomerRows.push({
                                    id: id,
                                    userId: userId,
                                    name: storedName,
                                    phone: c.phone ? String(c.phone).slice(0, 20) : null,
                                    address: c.address ? String(c.address).slice(0, 200) : null,
                                    note: c.note ? String(c.note).slice(0, 500) : null,
                                });
                            }
                            start = 0;
                            _b.label = 2;
                        case 2:
                            if (!(start < pendingCustomerRows.length)) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.prisma.ledgerCustomer.createMany({
                                    data: pendingCustomerRows.slice(start, start + IMPORT_BATCH_SIZE),
                                })];
                        case 3:
                            _b.sent();
                            _b.label = 4;
                        case 4:
                            start += IMPORT_BATCH_SIZE;
                            return [3 /*break*/, 2];
                        case 5:
                            orderRows = [];
                            _a = 0, orders_1 = orders;
                            _b.label = 6;
                        case 6:
                            if (!(_a < orders_1.length)) return [3 /*break*/, 9];
                            o = orders_1[_a];
                            customerName = String((o === null || o === void 0 ? void 0 : o.customerName) || '').trim();
                            customerId = customerName && nameMap.has(customerName) ? nameMap.get(customerName) : null;
                            d = (o === null || o === void 0 ? void 0 : o.date) ? new Date(o.date) : new Date();
                            orderData = {
                                userId: userId,
                                customerId: customerId,
                                customerName: customerName,
                                date: isNaN(d.getTime()) ? new Date() : d,
                                total: int(o.total),
                                received: int(o.received),
                                deposit: int(o.deposit),
                                discount: int(o.discount),
                                recycle: int(o.recycle),
                                costProfile: int(o.costProfile),
                                costGlass: int(o.costGlass),
                                costHardware: int(o.costHardware),
                                costLabor: int(o.costLabor),
                                costScreen: int(o.costScreen),
                                extras: (0, ledger_constants_1.sanitizeExtras)(o.extras),
                                customCosts: (0, ledger_constants_1.sanitizeCustomCosts)(o.customCosts),
                                items: (0, ledger_constants_1.sanitizeOrderItems)(o.items),
                                note: o.note ? String(o.note).slice(0, 500) : null,
                            };
                            orderData.revenueAmount = BigInt((0, ledger_constants_1.revenueOf)(orderData));
                            orderData.costAmount = BigInt((0, ledger_constants_1.totalCost)(orderData));
                            orderData.profitAmount = orderData.revenueAmount - orderData.costAmount;
                            orderRows.push(orderData);
                            if (!(orderRows.length === IMPORT_BATCH_SIZE)) return [3 /*break*/, 8];
                            return [4 /*yield*/, this.prisma.ledgerOrder.createMany({ data: orderRows.splice(0) })];
                        case 7:
                            _b.sent();
                            _b.label = 8;
                        case 8:
                            _a++;
                            return [3 /*break*/, 6];
                        case 9:
                            if (!orderRows.length) return [3 /*break*/, 11];
                            return [4 /*yield*/, this.prisma.ledgerOrder.createMany({ data: orderRows.splice(0) })];
                        case 10:
                            _b.sent();
                            _b.label = 11;
                        case 11: return [2 /*return*/, { ok: true, customers: pendingCustomerRows.length, orders: orders.length }];
                    }
                });
            });
        };
        return LedgerExtraService_1;
    }());
    __setFunctionName(_classThis, "LedgerExtraService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LedgerExtraService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LedgerExtraService = _classThis;
}();
exports.LedgerExtraService = LedgerExtraService;
