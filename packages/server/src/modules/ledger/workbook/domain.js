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
exports.MODE_LABEL = exports.COLLECTIONS = void 0;
exports.check = check;
exports.emptyBook = emptyBook;
exports.clone = clone;
exports.rows = rows;
exports.localDate = localDate;
exports.validDate = validDate;
exports.decimal100 = decimal100;
exports.money = money;
exports.quantity = quantity;
exports.product = product;
exports.entryAmount = entryAmount;
exports.validateBook = validateBook;
exports.applyOperation = applyOperation;
exports.lockedIds = lockedIds;
exports.advanceRemaining = advanceRemaining;
exports.settlementRemaining = settlementRemaining;
exports.filteredEntries = filteredEntries;
exports.summary = summary;
/** Platform-independent workbook contract. Mirrored to server by scripts/workbook-contract.mjs. */
exports.COLLECTIONS = [
    'workers',
    'projects',
    'entries',
    'adjustments',
    'advances',
    'settlements',
    'payments',
    'templates',
    'attachments',
];
var MAX_MONEY = 1000000000000;
var ID = /^(?!__proto__$|constructor$|prototype$)[a-zA-Z0-9_-]{1,100}$/;
function check(ok, message) {
    if (!ok)
        throw new Error(message);
}
function emptyBook() {
    var b = {};
    exports.COLLECTIONS.forEach(function (k) { return (b[k] = {}); });
    return b;
}
function clone(v) {
    return JSON.parse(JSON.stringify(v));
}
function rows(book, name, deleted) {
    if (deleted === void 0) { deleted = false; }
    return Object.keys(book[name])
        .map(function (id) { return book[name][id]; })
        .filter(function (r) { return r.deleted === deleted; });
}
function localDate(d) {
    if (d === void 0) { d = new Date(); }
    return "".concat(d.getFullYear(), "-").concat(String(d.getMonth() + 1).padStart(2, '0'), "-").concat(String(d.getDate()).padStart(2, '0'));
}
function validDate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s))
        return false;
    var _a = s.split('-').map(Number), y = _a[0], m = _a[1], d = _a[2];
    var date = new Date(Date.UTC(y, m - 1, d));
    return (y >= 1900 &&
        y <= 2199 &&
        date.getUTCFullYear() === y &&
        date.getUTCMonth() === m - 1 &&
        date.getUTCDate() === d);
}
function decimal100(value, signed) {
    if (signed === void 0) { signed = false; }
    var s = String(value == null || value === '' ? '0' : value).trim();
    check((signed ? /^-?\d{1,10}(\.\d{1,2})?$/ : /^\d{1,10}(\.\d{1,2})?$/).test(s), '请输入最多两位小数的有效数字');
    var negative = s[0] === '-';
    var _a = s.replace('-', '').split('.'), whole = _a[0], _b = _a[1], part = _b === void 0 ? '' : _b;
    var n = Number(whole) * 100 + Number(part.padEnd(2, '0'));
    check(Number.isSafeInteger(n) && n <= MAX_MONEY, '金额或数量超出范围');
    return negative ? -n : n;
}
function money(n) {
    return "\u00A5".concat((n / 100).toFixed(2));
}
function quantity(n) {
    return (n / 100)
        .toFixed(2)
        .replace(/\.00$/, '')
        .replace(/(\.\d)0$/, '$1');
}
exports.MODE_LABEL = {
    day: '工天',
    hour: '工时',
    piece: '件',
    fixed: '包工',
};
function integer(v, label, max, min) {
    if (max === void 0) { max = MAX_MONEY; }
    if (min === void 0) { min = 0; }
    check(Number.isSafeInteger(v) && v >= min && v <= max, "".concat(label, "\u8D85\u51FA\u8303\u56F4"));
    return v;
}
function text(v, max, required) {
    if (required === void 0) { required = false; }
    check(typeof v === 'string' && v.length <= max && (!required || !!v.trim()), '文本为空或过长');
    return v.trim();
}
function ids(v, max) {
    if (max === void 0) { max = 10000; }
    check(Array.isArray(v) &&
        v.length <= max &&
        v.every(function (x) { return typeof x === 'string' && ID.test(x); }) &&
        new Set(v).size === v.length, '关联编号无效或重复');
    return v;
}
function ref(book, c, id) {
    var r = book[c][id];
    check(r && !r.deleted, '关联记录不存在或已删除');
    return r;
}
function product(q, p) {
    integer(q, '数量', 10000000);
    integer(p, '单价', MAX_MONEY);
    var n = Math.floor(q / 100) * p + Math.floor(((q % 100) * p + 50) / 100);
    return integer(n, '工资');
}
function entryAmount(e) {
    var base = e.attendance === 'work'
        ? e.mode === 'fixed'
            ? e.rateFen
            : product(e.quantity100, e.rateFen)
        : 0;
    var overtime = e.attendance === 'work' ? product(e.overtimeQuantity100, e.overtimeRateFen) : 0;
    return integer(base + overtime + e.bonusFen + e.subsidyFen - e.deductionFen, '应计工资', MAX_MONEY, -MAX_MONEY);
}
var FIELDS = {
    workers: ['name', 'jobType', 'phone', 'mode', 'rateFen', 'status'],
    projects: ['name', 'address', 'contact', 'startDate', 'status'],
    entries: [
        'workerId',
        'projectId',
        'workDate',
        'mode',
        'quantity100',
        'rateFen',
        'attendance',
        'overtimeQuantity100',
        'overtimeRateFen',
        'bonusFen',
        'subsidyFen',
        'deductionFen',
        'note',
        'tags',
        'attachmentIds',
        'legacyAmountFen',
    ],
    adjustments: ['workerId', 'projectId', 'workDate', 'amountFen', 'note'],
    advances: ['workerId', 'amountFen', 'date', 'method', 'note', 'state', 'voidReason'],
    settlements: [
        'workerId',
        'projectId',
        'from',
        'to',
        'entryIds',
        'adjustmentIds',
        'allocations',
        'state',
        'voidReason',
    ],
    payments: [
        'workerId',
        'settlementId',
        'amountFen',
        'date',
        'method',
        'note',
        'state',
        'voidReason',
    ],
    templates: ['name', 'workerIds', 'projectId', 'input'],
    attachments: ['name', 'mime', 'size'],
};
function normalize(collection, input, old, id, at) {
    check(input && typeof input === 'object' && !Array.isArray(input), '记录格式错误');
    var out = {
        id: id,
        version: ((old === null || old === void 0 ? void 0 : old.version) || 0) + 1,
        deleted: input.deleted === true,
        updatedAt: at,
    };
    for (var _i = 0, _a = FIELDS[collection]; _i < _a.length; _i++) {
        var f = _a[_i];
        if (input[f] !== undefined)
            out[f] = clone(input[f]);
    }
    // Voided imported statements are historical evidence only, never payable balances.
    if (collection === 'settlements' && input.state === 'void')
        out.amountFen = integer(input.amountFen, '原结算金额');
    // Legacy amount is immutable, and may only originate from trusted migration.
    if (collection === 'entries') {
        if ((old === null || old === void 0 ? void 0 : old.legacyAmountFen) !== undefined)
            out.legacyAmountFen = old.legacyAmountFen;
        else
            delete out.legacyAmountFen;
    }
    return out;
}
function validateBook(b) {
    check(b && typeof b === 'object', '台账格式错误');
    for (var _i = 0, COLLECTIONS_1 = exports.COLLECTIONS; _i < COLLECTIONS_1.length; _i++) {
        var c = COLLECTIONS_1[_i];
        check(b[c] && typeof b[c] === 'object' && !Array.isArray(b[c]), '台账结构不完整');
        for (var _a = 0, _b = Object.keys(b[c]); _a < _b.length; _a++) {
            var id = _b[_a];
            var r = b[c][id];
            check(ID.test(id) &&
                r &&
                r.id === id &&
                Number.isSafeInteger(r.version) &&
                r.version > 0 &&
                typeof r.deleted === 'boolean', '记录编号或版本错误');
        }
    }
    for (var _c = 0, _d = rows(b, 'workers'); _c < _d.length; _c++) {
        var w = _d[_c];
        text(w.name, 40, true);
        text(w.jobType, 40);
        text(w.phone, 40);
        check(['day', 'hour', 'piece', 'fixed'].includes(w.mode), '计薪方式错误');
        integer(w.rateFen, '默认单价', MAX_MONEY);
        check(['active', 'archived'].includes(w.status), '人员状态错误');
    }
    for (var _e = 0, _f = rows(b, 'projects'); _e < _f.length; _e++) {
        var p = _f[_e];
        text(p.name, 60, true);
        text(p.address, 200);
        text(p.contact, 100);
        check(!p.startDate || validDate(p.startDate), '开工日期错误');
        check(['active', 'archived'].includes(p.status), '工地状态错误');
    }
    for (var _g = 0, _h = rows(b, 'attachments'); _g < _h.length; _g++) {
        var a = _h[_g];
        text(a.name, 100, true);
        check(['image/jpeg', 'image/png', 'image/webp'].includes(a.mime), '只支持图片凭证');
        integer(a.size, '图片大小', 5 * 1024 * 1024, 1);
    }
    for (var _j = 0, _k = __spreadArray(__spreadArray([], rows(b, 'entries'), true), rows(b, 'adjustments'), true); _j < _k.length; _j++) {
        var e = _k[_j];
        ref(b, 'workers', e.workerId);
        if (e.projectId)
            ref(b, 'projects', e.projectId);
        check(validDate(e.workDate), '记工日期错误');
        text(e.note, 500);
        if ('mode' in e) {
            check(['day', 'hour', 'piece', 'fixed'].includes(e.mode), '计薪方式错误');
            check(['work', 'rest', 'leave', 'absent'].includes(e.attendance), '出勤状态错误');
            integer(e.quantity100, '数量', 10000000, e.attendance === 'work' && e.mode !== 'fixed' ? 1 : 0);
            integer(e.rateFen, '单价', MAX_MONEY);
            integer(e.overtimeQuantity100, '加班工时', 10000000);
            integer(e.overtimeRateFen, '加班时薪', MAX_MONEY);
            for (var _l = 0, _m = ['bonusFen', 'subsidyFen', 'deductionFen']; _l < _m.length; _l++) {
                var k = _m[_l];
                integer(e[k], k);
            }
            text(e.tags, 100);
            ids(e.attachmentIds, 9).forEach(function (id) { return ref(b, 'attachments', id); });
            e.amountFen =
                e.legacyAmountFen === undefined
                    ? entryAmount(e)
                    : integer(e.legacyAmountFen, '历史金额', MAX_MONEY, -MAX_MONEY);
        }
        else {
            integer(e.amountFen, '补差金额', MAX_MONEY, -MAX_MONEY);
            text(e.note, 500, true);
        }
    }
    for (var _o = 0, _p = rows(b, 'templates'); _o < _p.length; _o++) {
        var t = _p[_o];
        text(t.name, 60, true);
        ids(t.workerIds, 100).forEach(function (id) { return ref(b, 'workers', id); });
        if (t.projectId)
            ref(b, 'projects', t.projectId);
        check(t.input && typeof t.input === 'object' && JSON.stringify(t.input).length <= 4000, '模板格式错误');
    }
    for (var _q = 0, _r = __spreadArray(__spreadArray([], rows(b, 'advances'), true), rows(b, 'payments'), true); _q < _r.length; _q++) {
        var a = _r[_q];
        ref(b, 'workers', a.workerId);
        integer(a.amountFen, '付款金额', MAX_MONEY, 1);
        check(validDate(a.date), '付款日期错误');
        text(a.method, 30, true);
        text(a.note, 500);
        check(['confirmed', 'void'].includes(a.state), '付款状态错误');
        text(a.voidReason, 200, a.state === 'void');
    }
    var locked = new Set();
    var used = {};
    for (var _s = 0, _t = rows(b, 'settlements'); _s < _t.length; _s++) {
        var s = _t[_s];
        ref(b, 'workers', s.workerId);
        if (s.projectId)
            ref(b, 'projects', s.projectId);
        check(validDate(s.from) && validDate(s.to) && s.from <= s.to, '结算日期范围错误');
        check(['confirmed', 'void'].includes(s.state), '结算状态错误');
        text(s.voidReason, 200, s.state === 'void');
        ids(s.entryIds);
        ids(s.adjustmentIds);
        check(s.entryIds.length + s.adjustmentIds.length > 0, '请选择待结算记录');
        check(Array.isArray(s.allocations) && s.allocations.length <= 1000, '借支抵扣格式错误');
        var total = 0;
        for (var _u = 0, _v = ['entries', 'adjustments']; _u < _v.length; _u++) {
            var c = _v[_u];
            for (var _w = 0, _x = c === 'entries' ? s.entryIds : s.adjustmentIds; _w < _x.length; _w++) {
                var id = _x[_w];
                var e = b[c][id];
                check(e && e.workerId === s.workerId, '结算人员不一致');
                if (s.state === 'confirmed') {
                    check(!e.deleted &&
                        e.workDate >= s.from &&
                        e.workDate <= s.to &&
                        (!s.projectId || e.projectId === s.projectId), '结算记录不在筛选范围');
                    check(!locked.has(c + id), '同一记录不能重复结算');
                    locked.add(c + id);
                }
                total += e.amountFen;
            }
        }
        if (s.state === 'confirmed')
            s.amountFen = integer(total, '结算工资', MAX_MONEY, 0);
        else if (!Number.isSafeInteger(s.amountFen))
            s.amountFen = total;
        var offset = 0;
        var seen = new Set();
        for (var _y = 0, _z = s.allocations; _y < _z.length; _y++) {
            var allocation = _z[_y];
            var a = b.advances[allocation.advanceId];
            check(a && a.workerId === s.workerId, '借支人员不一致');
            check(!seen.has(a.id), '重复借支抵扣');
            seen.add(a.id);
            integer(allocation.amountFen, '抵扣金额', MAX_MONEY, 1);
            if (s.state === 'confirmed') {
                check(!a.deleted && a.state === 'confirmed', '借支已作废');
                used[a.id] = (used[a.id] || 0) + allocation.amountFen;
                check(used[a.id] <= a.amountFen, '借支不能超额抵扣');
                offset += allocation.amountFen;
            }
        }
        if (s.state === 'confirmed')
            check(offset <= s.amountFen, '抵扣不能超过结算金额');
    }
    var paid = {};
    for (var _0 = 0, _1 = rows(b, 'payments'); _0 < _1.length; _0++) {
        var p = _1[_0];
        var s = ref(b, 'settlements', p.settlementId);
        check(s.workerId === p.workerId, '发薪人员不一致');
        if (p.state === 'confirmed') {
            check(s.state === 'confirmed', '请先作废该结算的有效付款');
            paid[s.id] = (paid[s.id] || 0) + p.amountFen;
            check(paid[s.id] + s.allocations.reduce(function (n, a) { return n + a.amountFen; }, 0) <= s.amountFen, '付款不能超过待付余额，多付请记为借支');
        }
    }
}
function applyOperation(source, op) {
    check(op && ID.test(op.id) && typeof op.at === 'string' && Number.isFinite(Date.parse(op.at)), '操作编号或时间错误');
    text(op.label, 100, true);
    check(Array.isArray(op.changes) && op.changes.length > 0 && op.changes.length <= 20000, '单次最多修改 20000 条');
    var b = clone(source);
    var seen = new Set();
    var _loop_1 = function (c) {
        check(exports.COLLECTIONS.includes(c.collection) && ID.test(c.id), '记录类型或编号错误');
        check(!seen.has(c.collection + c.id), '同一次操作重复修改记录');
        seen.add(c.collection + c.id);
        var old = b[c.collection][c.id];
        check(((old === null || old === void 0 ? void 0 : old.version) || 0) === c.baseVersion, "\u7248\u672C\u51B2\u7A81\uFF1A".concat(c.collection, "/").concat(c.id));
        if (old && ['payments', 'advances', 'settlements'].includes(c.collection)) {
            check(!c.value.deleted && old.state === 'confirmed' && c.value.state === 'void', '财务记录不可覆盖或删除，请作废后重新记账');
            var before = clone(old);
            var after = __assign(__assign({}, before), { state: 'void', voidReason: c.value.voidReason });
            for (var _b = 0, _c = FIELDS[c.collection]; _b < _c.length; _b++) {
                var f = _c[_b];
                if (f !== 'state' && f !== 'voidReason')
                    check(JSON.stringify(c.value[f]) === JSON.stringify(old[f]), '作废不能修改原财务数据');
            }
            c.value = after;
        }
        if (old && ['entries', 'adjustments'].includes(c.collection)) {
            var locked = rows(b, 'settlements').some(function (s) {
                return s.state === 'confirmed' &&
                    (c.collection === 'entries' ? s.entryIds : s.adjustmentIds).includes(c.id);
            });
            check(!locked, '该记录已结算，请记补差或先撤销结算');
            // Editing a migrated record switches to the new calculation only after explicit edit.
        }
        if (c.value.deleted && ['workers', 'projects'].includes(c.collection))
            check(false, '人员和工地请使用归档，不允许删除');
        var next = normalize(c.collection, c.value, old, c.id, op.at);
        if (c.collection === 'settlements' && old)
            next.amountFen = old.amountFen;
        if (c.collection === 'entries' &&
            (old === null || old === void 0 ? void 0 : old.legacyAmountFen) !== undefined &&
            !c.value.deleted &&
            JSON.stringify(FIELDS.entries.filter(function (k) { return k !== 'legacyAmountFen'; }).map(function (k) { return c.value[k]; })) !== JSON.stringify(FIELDS.entries.filter(function (k) { return k !== 'legacyAmountFen'; }).map(function (k) { return old[k]; })))
            delete next.legacyAmountFen;
        b[c.collection][c.id] = next;
    };
    for (var _i = 0, _a = op.changes; _i < _a.length; _i++) {
        var c = _a[_i];
        _loop_1(c);
    }
    validateBook(b);
    return b;
}
function lockedIds(b) {
    var out = new Set();
    rows(b, 'settlements')
        .filter(function (s) { return s.state === 'confirmed'; })
        .forEach(function (s) { return __spreadArray(__spreadArray([], s.entryIds, true), s.adjustmentIds, true).forEach(function (id) { return out.add(id); }); });
    return out;
}
function advanceRemaining(b, id) {
    var a = b.advances[id];
    if (!a || a.deleted || a.state === 'void')
        return 0;
    return (a.amountFen -
        rows(b, 'settlements')
            .filter(function (s) { return s.state === 'confirmed'; })
            .reduce(function (n, s) {
            return n +
                s.allocations
                    .filter(function (x) { return x.advanceId === id; })
                    .reduce(function (v, x) { return v + x.amountFen; }, 0);
        }, 0));
}
function settlementRemaining(b, id) {
    var s = b.settlements[id];
    if (!s || s.deleted || s.state === 'void')
        return 0;
    return (s.amountFen -
        s.allocations.reduce(function (n, a) { return n + a.amountFen; }, 0) -
        rows(b, 'payments')
            .filter(function (p) { return p.state === 'confirmed' && p.settlementId === id; })
            .reduce(function (n, p) { return n + p.amountFen; }, 0));
}
function filteredEntries(b, f) {
    if (f === void 0) { f = {}; }
    var locked = lockedIds(b);
    return rows(b, 'entries')
        .filter(function (e) {
        var _a, _b, _c;
        return (!f.from || e.workDate >= f.from) &&
            (!f.to || e.workDate <= f.to) &&
            (!f.workerId || e.workerId === f.workerId) &&
            (!f.projectId || e.projectId === f.projectId) &&
            (!f.jobType || ((_a = b.workers[e.workerId]) === null || _a === void 0 ? void 0 : _a.jobType) === f.jobType) &&
            (!f.status || (f.status === 'settled' ? locked.has(e.id) : !locked.has(e.id))) &&
            (!f.search ||
                [(_b = b.workers[e.workerId]) === null || _b === void 0 ? void 0 : _b.name, (_c = b.projects[e.projectId]) === null || _c === void 0 ? void 0 : _c.name, e.note, e.tags]
                    .join(' ')
                    .includes(f.search));
    })
        .sort(function (a, b) { return b.workDate.localeCompare(a.workDate) || b.updatedAt.localeCompare(a.updatedAt); });
}
function summary(b, f) {
    if (f === void 0) { f = {}; }
    var es = filteredEntries(b, f);
    var match = function (r) { return !f.workerId || r.workerId === f.workerId; };
    var date = function (d) { return (!f.from || d >= f.from) && (!f.to || d <= f.to); };
    var adjustments = rows(b, 'adjustments').filter(function (r) { return match(r) && date(r.workDate) && (!f.projectId || r.projectId === f.projectId); });
    var settlements = rows(b, 'settlements').filter(function (s) { return match(s) && s.state === 'confirmed' && (!f.projectId || s.projectId === f.projectId); });
    return {
        count: es.length,
        earned: es.reduce(function (n, e) { return n + e.amountFen; }, 0) + adjustments.reduce(function (n, e) { return n + e.amountFen; }, 0),
        days: es
            .filter(function (e) { return e.mode === 'day' && e.attendance === 'work'; })
            .reduce(function (n, e) { return n + e.quantity100; }, 0),
        hours: es.reduce(function (n, e) {
            return n +
                (e.mode === 'hour' && e.attendance === 'work' ? e.quantity100 : 0) +
                (e.attendance === 'work' ? e.overtimeQuantity100 : 0);
        }, 0),
        pieces: es
            .filter(function (e) { return e.mode === 'piece' && e.attendance === 'work'; })
            .reduce(function (n, e) { return n + e.quantity100; }, 0),
        settled: settlements.reduce(function (n, s) { return n + s.amountFen; }, 0),
        due: settlements.reduce(function (n, s) { return n + settlementRemaining(b, s.id); }, 0),
        paid: rows(b, 'payments')
            .filter(function (p) {
            var _a;
            return match(p) &&
                p.state === 'confirmed' &&
                date(p.date) &&
                (!f.projectId || ((_a = b.settlements[p.settlementId]) === null || _a === void 0 ? void 0 : _a.projectId) === f.projectId);
        })
            .reduce(function (n, p) { return n + p.amountFen; }, 0),
        advance: rows(b, 'advances')
            .filter(match)
            .reduce(function (n, a) { return n + advanceRemaining(b, a.id); }, 0),
    };
}
