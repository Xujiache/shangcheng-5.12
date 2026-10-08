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
exports.WorkbookService = void 0;
var common_1 = require("@nestjs/common");
var crypto_1 = require("crypto");
var client_1 = require("@prisma/client");
var biz_exception_1 = require("../../../common/exceptions/biz.exception");
var domain_1 = require("./domain");
var digest = function (v) { return (0, crypto_1.createHash)('sha256').update(v).digest('hex'); };
var WorkbookService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var WorkbookService = _classThis = /** @class */ (function () {
        function WorkbookService_1(prisma) {
            this.prisma = prisma;
        }
        WorkbookService_1.prototype.ensure = function (tx, userId) {
            return __awaiter(this, void 0, void 0, function () {
                var account, legacy, book, _i, legacy_1, r, workerId, updatedAt;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, tx.ledgerWorkbook.findUnique({ where: { userId: userId } })];
                        case 1:
                            account = _a.sent();
                            if (account)
                                return [2 /*return*/, account];
                            return [4 /*yield*/, tx.ledgerWorkLog.findMany({
                                    where: { userId: userId },
                                    orderBy: { createdAt: 'asc' },
                                })];
                        case 2:
                            legacy = _a.sent();
                            book = (0, domain_1.emptyBook)();
                            for (_i = 0, legacy_1 = legacy; _i < legacy_1.length; _i++) {
                                r = legacy_1[_i];
                                workerId = 'old_' + digest(JSON.stringify([r.workerName, r.jobType || ''])).slice(0, 24);
                                updatedAt = r.updatedAt.toISOString();
                                book.workers[workerId] = {
                                    id: workerId,
                                    version: 1,
                                    deleted: false,
                                    updatedAt: updatedAt,
                                    name: r.workerName,
                                    jobType: r.jobType || '',
                                    phone: '',
                                    mode: r.unit,
                                    rateFen: r.unitPrice * 100,
                                    status: 'active',
                                };
                                book.entries[r.id] = {
                                    id: r.id,
                                    version: 1,
                                    deleted: false,
                                    updatedAt: updatedAt,
                                    workerId: workerId,
                                    projectId: '',
                                    workDate: r.workDate.toISOString().slice(0, 10),
                                    mode: r.unit,
                                    quantity100: Math.round(Number(r.quantity) * 100),
                                    rateFen: r.unitPrice * 100,
                                    attendance: 'work',
                                    overtimeQuantity100: 0,
                                    overtimeRateFen: 0,
                                    bonusFen: 0,
                                    subsidyFen: 0,
                                    deductionFen: 0,
                                    note: r.note || '',
                                    tags: '',
                                    attachmentIds: [],
                                    amountFen: r.amount * 100,
                                    legacyAmountFen: r.amount * 100,
                                };
                            }
                            return [4 /*yield*/, tx.ledgerWorkbook.create({ data: { userId: userId, data: book } })];
                        case 3:
                            // Historical rows are imported without recalculating rounded integer-yuan wages.
                            account = _a.sent();
                            return [2 /*return*/, account];
                    }
                });
            });
        };
        WorkbookService_1.prototype.transaction = function (fn_1) {
            return __awaiter(this, arguments, void 0, function (fn, isolationLevel) {
                var attempt, e_1;
                if (isolationLevel === void 0) { isolationLevel = client_1.Prisma.TransactionIsolationLevel
                    .Serializable; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            attempt = 0;
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.prisma.$transaction(fn, {
                                    isolationLevel: isolationLevel,
                                    timeout: 30000,
                                })];
                        case 2: return [2 /*return*/, _a.sent()];
                        case 3:
                            e_1 = _a.sent();
                            if (['P2034', 'P2002'].includes(e_1 === null || e_1 === void 0 ? void 0 : e_1.code) && attempt < 3)
                                return [3 /*break*/, 4];
                            throw e_1;
                        case 4:
                            attempt++;
                            return [3 /*break*/, 1];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        WorkbookService_1.prototype.snapshot = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                            var a, receipts;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, this.ensure(tx, userId)];
                                    case 1:
                                        a = _a.sent();
                                        return [4 /*yield*/, tx.ledgerWorkbookOperation.findMany({
                                                where: { userId: userId },
                                                select: { operationId: true },
                                            })];
                                    case 2:
                                        receipts = _a.sent();
                                        return [2 /*return*/, { book: a.data, revision: a.revision, applied: receipts.map(function (r) { return r.operationId; }) }];
                                }
                            });
                        }); }, client_1.Prisma.TransactionIsolationLevel.RepeatableRead)];
                });
            });
        };
        WorkbookService_1.prototype.changes = function (userId, cursor) {
            return __awaiter(this, void 0, void 0, function () {
                var changes;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerWorkbookOperation.findMany({
                                where: { userId: userId, revision: { gt: cursor } },
                                orderBy: { revision: 'asc' },
                                take: 100,
                            })];
                        case 1:
                            changes = _a.sent();
                            return [2 /*return*/, {
                                    changes: changes.map(function (c) { return ({ revision: c.revision, operation: c.operation }); }),
                                    cursor: changes.length ? changes[changes.length - 1].revision : cursor,
                                    hasMore: changes.length === 100,
                                }];
                    }
                });
            });
        };
        WorkbookService_1.prototype.sync = function (userId, operation) {
            return __awaiter(this, void 0, void 0, function () {
                var hash_1, e_2;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            (0, domain_1.check)(operation && typeof operation.id === 'string', '操作格式错误');
                            hash_1 = digest(JSON.stringify(operation));
                            return [4 /*yield*/, this.transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var previous, current, next, revision;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, tx.ledgerWorkbookOperation.findUnique({
                                                    where: { userId_operationId: { userId: userId, operationId: operation.id } },
                                                })];
                                            case 1:
                                                previous = _a.sent();
                                                if (previous) {
                                                    (0, domain_1.check)(previous.digest === hash_1, '同一操作编号不能提交不同内容');
                                                    return [2 /*return*/, { revision: previous.revision, replayed: true }];
                                                }
                                                return [4 /*yield*/, this.ensure(tx, userId)];
                                            case 2:
                                                current = _a.sent();
                                                next = (0, domain_1.applyOperation)(current.data, (0, domain_1.clone)(operation));
                                                revision = current.revision + 1;
                                                return [4 /*yield*/, tx.ledgerWorkbook.update({ where: { userId: userId }, data: { revision: revision, data: next } })];
                                            case 3:
                                                _a.sent();
                                                return [4 /*yield*/, tx.ledgerWorkbookOperation.create({
                                                        data: {
                                                            userId: userId,
                                                            operationId: operation.id,
                                                            revision: revision,
                                                            digest: hash_1,
                                                            operation: operation,
                                                        },
                                                    })];
                                            case 4:
                                                _a.sent();
                                                return [2 /*return*/, { revision: revision, replayed: false }];
                                        }
                                    });
                                }); })];
                        case 1: return [2 /*return*/, _a.sent()];
                        case 2:
                            e_2 = _a.sent();
                            if (e_2 instanceof biz_exception_1.BizException)
                                throw e_2;
                            if (e_2 === null || e_2 === void 0 ? void 0 : e_2.code)
                                throw e_2;
                            throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, e_2.message || '台账保存失败');
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        WorkbookService_1.prototype.upload = function (userId, id, file) {
            return __awaiter(this, void 0, void 0, function () {
                var b, mime, hash, old;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            (0, domain_1.check)(/^[a-zA-Z0-9_-]{1,100}$/.test(id) && !['__proto__', 'constructor', 'prototype'].includes(id), '凭证编号错误');
                            (0, domain_1.check)(((_a = file === null || file === void 0 ? void 0 : file.buffer) === null || _a === void 0 ? void 0 : _a.length) > 0 && file.size <= 5 * 1024 * 1024, '请选择不超过 5MB 的图片');
                            b = file.buffer;
                            mime = b[0] === 0xff && b[1] === 0xd8
                                ? 'image/jpeg'
                                : b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
                                    ? 'image/png'
                                    : b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP'
                                        ? 'image/webp'
                                        : '';
                            (0, domain_1.check)(!!mime, '凭证不是有效图片');
                            hash = digest(b);
                            return [4 /*yield*/, this.prisma.ledgerWorkbookAttachment.findUnique({
                                    where: { userId_id: { userId: userId, id: id } },
                                })];
                        case 1:
                            old = _b.sent();
                            if (old) {
                                (0, domain_1.check)(old.digest === hash, '凭证不可覆盖，请新增图片');
                                return [2 /*return*/, { id: id, mime: mime, size: b.length }];
                            }
                            return [4 /*yield*/, this.prisma.ledgerWorkbookAttachment.create({
                                    data: { id: id, userId: userId, mime: mime, size: b.length, digest: hash, content: b },
                                })];
                        case 2:
                            _b.sent();
                            return [2 /*return*/, { id: id, mime: mime, size: b.length }];
                    }
                });
            });
        };
        WorkbookService_1.prototype.attachment = function (userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var a;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerWorkbookAttachment.findUnique({
                                where: { userId_id: { userId: userId, id: id } },
                            })];
                        case 1:
                            a = _a.sent();
                            if (!a)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '凭证不存在');
                            return [2 /*return*/, a];
                    }
                });
            });
        };
        WorkbookService_1.prototype.compatible = function (e) {
            return (['day', 'hour'].includes(e.mode) &&
                e.rateFen % 100 === 0 &&
                e.amountFen % 100 === 0 &&
                !e.overtimeQuantity100 &&
                !e.bonusFen &&
                !e.subsidyFen &&
                !e.deductionFen &&
                e.attendance === 'work');
        };
        WorkbookService_1.prototype.oldRow = function (e, b) {
            return {
                id: e.id,
                workDate: e.workDate,
                workerName: b.workers[e.workerId].name,
                jobType: b.workers[e.workerId].jobType,
                unit: e.mode,
                quantity: e.quantity100 / 100,
                unitPrice: e.rateFen / 100,
                amount: e.amountFen / 100,
                note: e.note,
            };
        };
        WorkbookService_1.prototype.legacyList = function (userId, month) {
            return __awaiter(this, void 0, void 0, function () {
                var raw, b, es;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.snapshot(userId)];
                        case 1:
                            raw = (_a.sent()).book;
                            b = raw;
                            es = (0, domain_1.rows)(b, 'entries')
                                .filter(function (e) { return e.workDate.startsWith(month) && _this.compatible(e); })
                                .sort(function (a, b) { return b.workDate.localeCompare(a.workDate); });
                            return [2 /*return*/, {
                                    month: month,
                                    list: es.map(function (e) { return _this.oldRow(e, b); }),
                                    summary: {
                                        totalAmount: es.reduce(function (n, e) { return n + e.amountFen / 100; }, 0),
                                        dayQuantity: es
                                            .filter(function (e) { return e.mode === 'day'; })
                                            .reduce(function (n, e) { return n + e.quantity100 / 100; }, 0),
                                        hourQuantity: es
                                            .filter(function (e) { return e.mode === 'hour'; })
                                            .reduce(function (n, e) { return n + e.quantity100 / 100; }, 0),
                                        count: es.length,
                                    },
                                }];
                    }
                });
            });
        };
        WorkbookService_1.prototype.legacyWrite = function (userId_1, id_1, dto_1) {
            return __awaiter(this, arguments, void 0, function (userId, id, dto, remove) {
                var raw, b, old, merged, changes, workerName, worker, wid, entryId, value, book;
                if (remove === void 0) { remove = false; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.snapshot(userId)];
                        case 1:
                            raw = (_a.sent()).book;
                            b = raw;
                            old = id ? b.entries[id] : undefined;
                            if (id)
                                (0, domain_1.check)(old && !old.deleted && this.compatible(old), '请使用新版记工查看和编辑该记录');
                            merged = __assign(__assign({}, (old ? this.oldRow(old, b) : {})), dto);
                            changes = [];
                            workerName = merged.workerName;
                            worker = (0, domain_1.rows)(b, 'workers').find(function (w) { return w.name === workerName && w.jobType === (merged.jobType || ''); });
                            if (!worker) {
                                wid = (0, crypto_1.randomUUID)();
                                worker = {
                                    id: wid,
                                    version: 1,
                                    deleted: false,
                                    updatedAt: new Date().toISOString(),
                                    name: workerName,
                                    jobType: merged.jobType || '',
                                    phone: '',
                                    mode: merged.unit,
                                    rateFen: merged.unitPrice * 100,
                                    status: 'active',
                                };
                                changes.push({ collection: 'workers', id: wid, baseVersion: 0, value: worker });
                            }
                            entryId = id || (0, crypto_1.randomUUID)();
                            value = __assign(__assign({}, old), { workerId: worker.id, projectId: (old === null || old === void 0 ? void 0 : old.projectId) || '', workDate: merged.workDate.slice(0, 10), mode: merged.unit, quantity100: Math.round(merged.quantity * 100), rateFen: merged.unitPrice * 100, attendance: 'work', overtimeQuantity100: 0, overtimeRateFen: 0, bonusFen: 0, subsidyFen: 0, deductionFen: 0, note: merged.note || '', tags: (old === null || old === void 0 ? void 0 : old.tags) || '', attachmentIds: (old === null || old === void 0 ? void 0 : old.attachmentIds) || [], deleted: remove });
                            changes.push({ collection: 'entries', id: entryId, baseVersion: (old === null || old === void 0 ? void 0 : old.version) || 0, value: value });
                            return [4 /*yield*/, this.sync(userId, {
                                    id: (0, crypto_1.randomUUID)(),
                                    at: new Date().toISOString(),
                                    label: remove ? '旧端删除记工' : '旧端保存记工',
                                    changes: changes,
                                })];
                        case 2:
                            _a.sent();
                            if (remove)
                                return [2 /*return*/, { id: entryId }];
                            return [4 /*yield*/, this.snapshot(userId)];
                        case 3:
                            book = (_a.sent()).book;
                            return [2 /*return*/, this.oldRow(book.entries[entryId], book)];
                    }
                });
            });
        };
        return WorkbookService_1;
    }());
    __setFunctionName(_classThis, "WorkbookService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WorkbookService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WorkbookService = _classThis;
}();
exports.WorkbookService = WorkbookService;
