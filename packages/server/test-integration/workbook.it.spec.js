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
jest.mock('nanoid', function () { return ({ customAlphabet: function () { return function () { return 'TESTCODE'; }; } }); });
var client_1 = require("@prisma/client");
var workbook_service_1 = require("../src/modules/ledger/workbook/workbook.service");
var workbook_controller_1 = require("../src/modules/ledger/workbook/workbook.controller");
var ledger_membership_guard_1 = require("../src/modules/ledger/guards/ledger-membership.guard");
var crypto_1 = require("crypto");
var db = new client_1.PrismaClient();
var svc = new workbook_service_1.WorkbookService(db);
var users = [];
var worker = {
    name: '测试工人',
    jobType: '安装',
    phone: '',
    mode: 'day',
    rateFen: 30025,
    status: 'active',
};
var e = {
    workerId: 'w1',
    projectId: '',
    workDate: '2026-09-09',
    mode: 'day',
    quantity100: 50,
    rateFen: 30025,
    attendance: 'work',
    overtimeQuantity100: 0,
    overtimeRateFen: 0,
    bonusFen: 0,
    subsidyFen: 0,
    deductionFen: 0,
    note: '',
    tags: '',
    attachmentIds: [],
};
function op(changes, id) {
    if (id === void 0) { id = (0, crypto_1.randomUUID)(); }
    return { id: id, at: '2026-09-09T12:00:00.000Z', label: 'integration', changes: changes };
}
function user() {
    return __awaiter(this, void 0, void 0, function () {
        var r;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db.ledgerUser.create({ data: { nickname: 'workbook-test-' + (0, crypto_1.randomUUID)() } })];
                case 1:
                    r = _a.sent();
                    users.push(r.id);
                    return [2 /*return*/, r.id];
            }
        });
    });
}
afterAll(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, db.ledgerUser.deleteMany({ where: { id: { in: users } } })];
            case 1:
                _a.sent();
                return [4 /*yield*/, db.$disconnect()];
            case 2:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
test('serializable persistence, operation receipts and conflict rollback', function () { return __awaiter(void 0, void 0, void 0, function () {
    var id, seed, first, _a, snap, update, _b, delta;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, user()];
            case 1:
                id = _c.sent();
                seed = op([
                    { collection: 'workers', id: 'w1', baseVersion: 0, value: worker },
                    { collection: 'entries', id: 'e1', baseVersion: 0, value: e },
                ]);
                return [4 /*yield*/, svc.sync(id, seed)];
            case 2:
                first = _c.sent();
                expect(first.revision).toBe(1);
                _a = expect;
                return [4 /*yield*/, svc.sync(id, seed)];
            case 3:
                _a.apply(void 0, [(_c.sent()).replayed]).toBe(true);
                return [4 /*yield*/, svc.snapshot(id)];
            case 4:
                snap = _c.sent();
                expect(snap.book.entries.e1.amountFen).toBe(15013);
                expect(snap.applied).toContain(seed.id);
                return [4 /*yield*/, expect(svc.sync(id, __assign(__assign({}, seed), { label: 'different' }))).rejects.toThrow('同一操作编号')];
            case 5:
                _c.sent();
                update = op([
                    { collection: 'entries', id: 'e1', baseVersion: 1, value: __assign(__assign({}, e), { quantity100: 100 }) },
                ]);
                return [4 /*yield*/, svc.sync(id, update)];
            case 6:
                _c.sent();
                return [4 /*yield*/, expect(svc.sync(id, op(update.changes))).rejects.toThrow('版本冲突')];
            case 7:
                _c.sent();
                _b = expect;
                return [4 /*yield*/, svc.snapshot(id)];
            case 8:
                _b.apply(void 0, [(_c.sent()).revision]).toBe(2);
                return [4 /*yield*/, svc.changes(id, 1)];
            case 9:
                delta = _c.sent();
                expect(delta.changes).toHaveLength(1);
                return [2 /*return*/];
        }
    });
}); });
test('two simultaneous settlements cannot settle the same record', function () { return __awaiter(void 0, void 0, void 0, function () {
    var id, s, results, _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0: return [4 /*yield*/, user()];
            case 1:
                id = _d.sent();
                return [4 /*yield*/, svc.sync(id, op([
                        { collection: 'workers', id: 'w1', baseVersion: 0, value: worker },
                        { collection: 'entries', id: 'e1', baseVersion: 0, value: e },
                    ]))];
            case 2:
                _d.sent();
                s = {
                    workerId: 'w1',
                    projectId: '',
                    from: '2026-09-01',
                    to: '2026-09-30',
                    entryIds: ['e1'],
                    adjustmentIds: [],
                    allocations: [],
                    state: 'confirmed',
                    voidReason: '',
                };
                return [4 /*yield*/, Promise.allSettled(['s1', 's2'].map(function (sid) {
                        return svc.sync(id, op([{ collection: 'settlements', id: sid, baseVersion: 0, value: s }]));
                    }))];
            case 3:
                results = _d.sent();
                expect(results.filter(function (r) { return r.status === 'fulfilled'; })).toHaveLength(1);
                _a = expect;
                _c = (_b = Object).keys;
                return [4 /*yield*/, svc.snapshot(id)];
            case 4:
                _a.apply(void 0, [_c.apply(_b, [(_d.sent()).book])]).toContain('settlements');
                return [2 /*return*/];
        }
    });
}); });
test('account ownership applies to state and private proof downloads', function () { return __awaiter(void 0, void 0, void 0, function () {
    var a, b, buffer, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, user()];
            case 1:
                a = _b.sent();
                return [4 /*yield*/, user()];
            case 2:
                b = _b.sent();
                return [4 /*yield*/, svc.sync(a, op([{ collection: 'workers', id: 'w1', baseVersion: 0, value: worker }]))];
            case 3:
                _b.sent();
                return [4 /*yield*/, expect(svc.sync(b, op([{ collection: 'entries', id: 'e1', baseVersion: 0, value: e }]))).rejects.toThrow('关联记录')];
            case 4:
                _b.sent();
                buffer = Buffer.from('89504e470d0a1a0a00000000', 'hex');
                return [4 /*yield*/, svc.upload(a, 'proof_1', { buffer: buffer, size: buffer.length })];
            case 5:
                _b.sent();
                return [4 /*yield*/, expect(svc.attachment(b, 'proof_1')).rejects.toThrow('凭证不存在')];
            case 6:
                _b.sent();
                _a = expect;
                return [4 /*yield*/, svc.attachment(a, 'proof_1')];
            case 7:
                _a.apply(void 0, [(_b.sent()).size]).toBe(buffer.length);
                return [4 /*yield*/, expect(svc.upload(a, 'proof_1', {
                        buffer: Buffer.concat([buffer, Buffer.from('x')]),
                        size: buffer.length + 1,
                    })).rejects.toThrow('不可覆盖')];
            case 8:
                _b.sent();
                return [2 /*return*/];
        }
    });
}); });
test('legacy backfill preserves original IDs and integer-yuan rounded amount', function () { return __awaiter(void 0, void 0, void 0, function () {
    var id, row, snap, again, list, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, user()];
            case 1:
                id = _b.sent();
                return [4 /*yield*/, db.ledgerWorkLog.create({
                        data: {
                            userId: id,
                            workDate: new Date('2026-09-09'),
                            workerName: '旧工人',
                            unit: 'day',
                            quantity: 0.5,
                            unitPrice: 301,
                            amount: 151,
                            note: '历史四舍五入',
                        },
                    })];
            case 2:
                row = _b.sent();
                return [4 /*yield*/, svc.snapshot(id)];
            case 3:
                snap = _b.sent();
                expect(snap.book.entries[row.id].legacyAmountFen).toBe(15100);
                return [4 /*yield*/, svc.snapshot(id)];
            case 4:
                again = _b.sent();
                expect(Object.keys(again.book.entries)).toHaveLength(1);
                return [4 /*yield*/, svc.legacyList(id, '2026-09')];
            case 5:
                list = _b.sent();
                expect(list.list[0].amount).toBe(151);
                expect(list.list[0].id).toBe(row.id);
                return [4 /*yield*/, svc.legacyWrite(id, row.id, { quantity: 1 })];
            case 6:
                _b.sent();
                _a = expect;
                return [4 /*yield*/, svc.legacyList(id, '2026-09')];
            case 7:
                _a.apply(void 0, [(_b.sent()).list[0].amount]).toBe(301);
                return [2 /*return*/];
        }
    });
}); });
test('membership is method-scoped: snapshot remains readable after expiry', function () {
    var read = Reflect.getMetadata('__guards__', workbook_controller_1.WorkbookController.prototype.snapshot) || [];
    var write = Reflect.getMetadata('__guards__', workbook_controller_1.WorkbookController.prototype.sync) || [];
    expect(read).not.toContain(ledger_membership_guard_1.LedgerMembershipGuard);
    expect(write).toContain(ledger_membership_guard_1.LedgerMembershipGuard);
    var guard = new ledger_membership_guard_1.LedgerMembershipGuard();
    expect(function () {
        return guard.canActivate({
            switchToHttp: function () { return ({
                getRequest: function () { return ({
                    method: 'POST',
                    originalUrl: '/api/v1/l/workbook/sync',
                    ledgerUser: { membership: { active: false, expired: true } },
                }); },
            }); },
        });
    }).toThrow();
});
