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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_COST_CATEGORIES = exports.LEDGER_CONFIG_DEFAULTS = exports.LEDGER_PLANS = exports.LEDGER_PLAN_DAYS = exports.genLedgerInviteCode = void 0;
exports.normalizeLedgerPlans = normalizeLedgerPlans;
exports.ledgerPlanPriceFen = ledgerPlanPriceFen;
exports.normalizeLedgerConfig = normalizeLedgerConfig;
exports.deriveMembership = deriveMembership;
exports.computeGrantExpiry = computeGrantExpiry;
exports.sanitizeExtras = sanitizeExtras;
exports.extrasTotal = extrasTotal;
exports.sanitizeCostCategories = sanitizeCostCategories;
exports.sanitizeCustomCosts = sanitizeCustomCosts;
exports.customCostsTotal = customCostsTotal;
exports.sanitizeOrderItems = sanitizeOrderItems;
exports.itemBillingQty = itemBillingQty;
exports.itemSubtotal = itemSubtotal;
exports.orderItemsAmount = orderItemsAmount;
exports.orderTotalFromItems = orderTotalFromItems;
exports.fixedCost = fixedCost;
exports.totalCost = totalCost;
exports.profitOf = profitOf;
exports.revenueOf = revenueOf;
exports.marginOf = marginOf;
// 门窗利账 · 领域常量 + 会员派生算法 + 利润计算（纯函数，无 DI，App/后台共用）
var nanoid_1 = require("nanoid");
/** 邀请码生成器（去易混字符 B/I/O/0/1，8 位大写+数字）。App/后台统一来源，避免重复定义漂移。 */
exports.genLedgerInviteCode = (0, nanoid_1.customAlphabet)('ACDEFGHJKLMNPQRSTUVWXYZ23456789', 8);
/** 套餐 → 天数。custom 走自定义天数，不在此表。 */
exports.LEDGER_PLAN_DAYS = {
    day: 1,
    week: 7,
    month: 30,
    quarter: 90,
    year: 365,
};
/** 套餐展示元数据默认值（后台未改时用这套；与设计 MEMBER_PLANS 对齐）。 */
exports.LEDGER_PLANS = [
    { key: 'day', label: '体验卡', days: 1, price: '¥1' },
    { key: 'week', label: '周卡', days: 7, price: '¥9' },
    { key: 'month', label: '月卡', days: 30, price: '¥29' },
    { key: 'quarter', label: '季卡', days: 90, price: '¥79' },
    { key: 'year', label: '年卡', days: 365, price: '¥268' },
];
/** 清洗后台传入的套餐数组：逐项收口 + 去重 key + 上限 20；非法/空则回落默认。 */
function normalizeLedgerPlans(raw) {
    if (!Array.isArray(raw))
        return exports.LEDGER_PLANS;
    var seen = new Set();
    var cleaned = raw
        .slice(0, 50)
        .map(function (p) {
        var _a, _b, _c;
        return ({
            key: String((_a = p === null || p === void 0 ? void 0 : p.key) !== null && _a !== void 0 ? _a : '')
                .trim()
                .slice(0, 20),
            label: String((_b = p === null || p === void 0 ? void 0 : p.label) !== null && _b !== void 0 ? _b : '')
                .trim()
                .slice(0, 20),
            days: Math.min(3650, Math.max(1, Math.round(Number(p === null || p === void 0 ? void 0 : p.days) || 0))),
            price: String((_c = p === null || p === void 0 ? void 0 : p.price) !== null && _c !== void 0 ? _c : '')
                .trim()
                .slice(0, 20),
            perpetual: !!(p === null || p === void 0 ? void 0 : p.perpetual),
            trial: !!(p === null || p === void 0 ? void 0 : p.trial),
        });
    })
        .filter(function (p) { return p.key && p.label && p.days > 0 && !seen.has(p.key) && seen.add(p.key); });
    return cleaned.length ? cleaned : exports.LEDGER_PLANS;
}
/**
 * 套餐展示价（如 "¥29" / "29" / "29.9 元"）→ 实付分。
 * 服务端权威金额来源：下单与回调金额一律以此为准，绝不信任前端传值。
 * 非法 / 非正 → 返回 0（调用方据此判定该套餐不支持在线支付）。
 */
function ledgerPlanPriceFen(price) {
    var n = Number(String(price !== null && price !== void 0 ? price : '').replace(/[^\d.]/g, ''));
    if (!Number.isFinite(n) || n <= 0)
        return 0;
    return Math.round(n * 100);
}
/**
 * ledger 域全局配置默认值（存 LedgerConfig 单行 key=value，后台 admin-pc 可调）。
 * - inviteRewardDays:  邀请成功奖励邀请人的天数（#10）
 * 会员能力始终以 LedgerMembership 的有效状态为准；不提供按单功能的免会员绕过开关。
 */
exports.LEDGER_CONFIG_DEFAULTS = {
    inviteRewardDays: 7,
    /** 每个邀请人最多奖励多少个被邀请人（反刷量上限）；0=不限 */
    inviteMaxRewarded: 50,
    /** 会员套餐（后台可编辑；App /l/membership 与后台授予按此天数）*/
    plans: exports.LEDGER_PLANS,
};
/** 合并默认值 + 持久化覆盖，做类型收口（数值取整、布尔强制）。 */
function normalizeLedgerConfig(raw) {
    var r = raw && typeof raw === 'object' ? raw : {};
    var num = function (v, d, min, max) {
        var n = Math.round(Number(v));
        return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
    };
    return {
        inviteRewardDays: num(r.inviteRewardDays, exports.LEDGER_CONFIG_DEFAULTS.inviteRewardDays, 0, 3650),
        inviteMaxRewarded: num(r.inviteMaxRewarded, exports.LEDGER_CONFIG_DEFAULTS.inviteMaxRewarded, 0, 100000),
        plans: normalizeLedgerPlans(r.plans),
    };
}
var DAY_MS = 86400000;
/**
 * 由到期时间派生会员状态。now 注入便于测试（保持第 3 位不变以兼容既有测试）。
 * extra.perpetual=true → 永久有效（不看 expiresAt）；extra.trialClaimedAt → 已领体验卡。
 */
function deriveMembership(expiresAt, lastPlanKey, now, extra) {
    if (now === void 0) { now = new Date(); }
    var trialClaimed = !!(extra === null || extra === void 0 ? void 0 : extra.trialClaimedAt);
    if (extra === null || extra === void 0 ? void 0 : extra.perpetual) {
        return {
            active: true,
            expired: false,
            never: false,
            expiresAt: null,
            daysLeft: 36500,
            expiringSoon: false,
            lastPlanKey: lastPlanKey !== null && lastPlanKey !== void 0 ? lastPlanKey : null,
            perpetual: true,
            trialClaimed: trialClaimed,
        };
    }
    if (!expiresAt) {
        return {
            active: false,
            expired: false,
            never: true,
            expiresAt: null,
            daysLeft: 0,
            expiringSoon: false,
            lastPlanKey: lastPlanKey !== null && lastPlanKey !== void 0 ? lastPlanKey : null,
            perpetual: false,
            trialClaimed: trialClaimed,
        };
    }
    var diff = expiresAt.getTime() - now.getTime();
    var active = diff > 0;
    var daysLeft = Math.ceil(diff / DAY_MS);
    return {
        active: active,
        expired: !active,
        never: false,
        expiresAt: expiresAt.toISOString(),
        daysLeft: daysLeft,
        expiringSoon: active && daysLeft <= 7,
        lastPlanKey: lastPlanKey !== null && lastPlanKey !== void 0 ? lastPlanKey : null,
        perpetual: false,
        trialClaimed: trialClaimed,
    };
}
/** 会员到期上限：今天起最多 ~10 年，避免重复叠加把到期推到不合理的远期。 */
var MAX_MEMBERSHIP_MS = 3650 * DAY_MS;
/**
 * 增加会员时长（叠加）：新到期 = max(now, 当前到期) + N 天，封顶 now+10 年。
 * - 未过期：从原到期日往后续（不浪费剩余天数）
 * - 已过期/从未开通：从今天起算
 * - 负数天数（后台纠错/扣减）：只会减少时长，不受上限影响
 */
function computeGrantExpiry(currentExpiresAt, days, now) {
    if (now === void 0) { now = new Date(); }
    var stillValid = !!currentExpiresAt && currentExpiresAt.getTime() > now.getTime();
    var base = stillValid ? currentExpiresAt : now;
    var target = base.getTime() + days * DAY_MS;
    var ceiling = now.getTime() + MAX_MEMBERSHIP_MS;
    return new Date(Math.min(target, ceiling));
}
/**
 * 仅保留合法的其他开销项（type 非空字符串 + amount 正数），用于落库前清洗。
 * 限制条数(≤50) + 类型名长度(≤20)，防止已登录用户注入超大数组导致行膨胀 / 统计 DoS。
 */
function sanitizeExtras(raw) {
    if (!Array.isArray(raw))
        return [];
    return raw
        .slice(0, 50)
        .map(function (e) {
        var _a;
        return ({
            type: String((_a = e === null || e === void 0 ? void 0 : e.type) !== null && _a !== void 0 ? _a : '')
                .trim()
                .slice(0, 20),
            amount: Math.max(0, Math.round(Number(e === null || e === void 0 ? void 0 : e.amount) || 0)),
        });
    })
        .filter(function (e) { return e.type && e.amount > 0; });
}
function extrasTotal(extras) {
    return sanitizeExtras(extras).reduce(function (s, e) { return s + e.amount; }, 0);
}
exports.DEFAULT_COST_CATEGORIES = [
    { id: 'profile', name: '型材', color: 'c1' },
    { id: 'glass', name: '玻璃', color: 'c2' },
    { id: 'hardware', name: '配件', color: 'c3' },
    { id: 'labor', name: '人工', color: 'c4' },
    { id: 'screen', name: '纱窗', color: 'c5' },
];
var COST_COLORS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
function sanitizeCostCategories(raw) {
    if (!Array.isArray(raw) || raw.length === 0)
        return exports.DEFAULT_COST_CATEGORIES.map(function (x) { return (__assign({}, x)); });
    var seen = new Set();
    var list = raw
        .slice(0, 20)
        .map(function (item, index) {
        var _a, _b;
        var fallbackId = "cost-".concat(index + 1);
        var id = String((_a = item === null || item === void 0 ? void 0 : item.id) !== null && _a !== void 0 ? _a : fallbackId)
            .trim()
            .replace(/[^a-zA-Z0-9_-]/g, '')
            .slice(0, 40) || fallbackId;
        var name = String((_b = item === null || item === void 0 ? void 0 : item.name) !== null && _b !== void 0 ? _b : '')
            .trim()
            .slice(0, 20);
        var color = COST_COLORS.includes(String(item === null || item === void 0 ? void 0 : item.color))
            ? String(item.color)
            : COST_COLORS[index % COST_COLORS.length];
        return { id: id, name: name, color: color };
    })
        .filter(function (item) {
        if (!item.name || seen.has(item.id))
            return false;
        seen.add(item.id);
        return true;
    });
    return list.length ? list : exports.DEFAULT_COST_CATEGORIES.map(function (x) { return (__assign({}, x)); });
}
function sanitizeCustomCosts(raw) {
    if (!Array.isArray(raw))
        return [];
    return raw
        .slice(0, 50)
        .map(function (e) {
        var _a, _b;
        return (__assign(__assign(__assign({}, (String((_a = e === null || e === void 0 ? void 0 : e.id) !== null && _a !== void 0 ? _a : '')
            .trim()
            .replace(/[^a-zA-Z0-9_-]/g, '')
            .slice(0, 40)
            ? {
                id: String(e.id)
                    .trim()
                    .replace(/[^a-zA-Z0-9_-]/g, '')
                    .slice(0, 40),
            }
            : {})), (COST_COLORS.includes(String(e === null || e === void 0 ? void 0 : e.color)) ? { color: String(e.color) } : {})), { name: String((_b = e === null || e === void 0 ? void 0 : e.name) !== null && _b !== void 0 ? _b : '')
                .trim()
                .slice(0, 20), amount: Math.max(0, Math.round(Number(e === null || e === void 0 ? void 0 : e.amount) || 0)) }));
    })
        .filter(function (e) { return e.name && e.amount > 0; });
}
function customCostsTotal(raw) {
    return sanitizeCustomCosts(raw).reduce(function (s, e) { return s + e.amount; }, 0);
}
/** 尺寸备注清洗：兼容新 notes 数组与旧单 note 单串；逐条 trim+≤30 字、丢空、≤50 条 */
function sanitizeSizeNotes(s) {
    var raw = Array.isArray(s === null || s === void 0 ? void 0 : s.notes)
        ? s.notes
        : (s === null || s === void 0 ? void 0 : s.note) !== undefined && (s === null || s === void 0 ? void 0 : s.note) !== null && (s === null || s === void 0 ? void 0 : s.note) !== ''
            ? [s.note]
            : [];
    return raw
        .slice(0, 50)
        .map(function (t) {
        return String(t !== null && t !== void 0 ? t : '')
            .trim()
            .slice(0, 30);
    })
        .filter(function (t) { return t.length > 0; });
}
function sanitizeOrderItems(raw) {
    if (!Array.isArray(raw))
        return [];
    return (raw
        .slice(0, 100)
        .map(function (it) {
        var _a, _b;
        var sizes = Array.isArray(it === null || it === void 0 ? void 0 : it.sizes)
            ? it.sizes
                .slice(0, 100)
                .map(function (s) { return ({
                w: Math.max(0, Math.round(Number(s === null || s === void 0 ? void 0 : s.w) || 0)),
                h: Math.max(0, Math.round(Number(s === null || s === void 0 ? void 0 : s.h) || 0)),
                count: Math.max(1, Math.round(Number(s === null || s === void 0 ? void 0 : s.count) || 1)),
                notes: sanitizeSizeNotes(s),
            }); })
                .filter(function (s) { return s.w > 0 && s.h > 0; })
            : [];
        // 小计手动改写：传了 subtotal（数字）即覆盖「计费量×单价」；null/空 = 自动算
        var hasSub = (it === null || it === void 0 ? void 0 : it.subtotal) !== null && (it === null || it === void 0 ? void 0 : it.subtotal) !== undefined && (it === null || it === void 0 ? void 0 : it.subtotal) !== '';
        var subtotal = hasSub ? Math.max(0, Math.round(Number(it === null || it === void 0 ? void 0 : it.subtotal) || 0)) : null;
        return {
            name: String((_a = it === null || it === void 0 ? void 0 : it.name) !== null && _a !== void 0 ? _a : '')
                .trim()
                .slice(0, 40),
            note: String((_b = it === null || it === void 0 ? void 0 : it.note) !== null && _b !== void 0 ? _b : '')
                .trim()
                .slice(0, 30),
            baseArea: Math.max(0, Number(it === null || it === void 0 ? void 0 : it.baseArea) || 0),
            unitPrice: Math.max(0, Math.round(Number(it === null || it === void 0 ? void 0 : it.unitPrice) || 0)),
            qty: Math.max(0, Number(it === null || it === void 0 ? void 0 : it.qty) || 0),
            sizes: sizes,
            subtotal: subtotal,
        };
    })
        // 名称非强制：只要填了 名称/尺寸/数量/单价/小计 任一就视为有效明细（仅丢真正的空行）。
        // 门窗下单常只填尺寸+单价不起名，强制名称会导致漏算金额 + 退出丢数据。
        .filter(function (it) {
        return it.name || it.sizes.length > 0 || it.qty > 0 || it.unitPrice > 0 || it.subtotal != null;
    }));
}
function sizeArea(s, baseArea) {
    // 单件面积按起算兜底，再乘以件数（宽×高×件数）
    var count = Math.max(1, Math.round(Number(s.count) || 1));
    return Math.max((s.w * s.h) / 1000000, baseArea || 0) * count;
}
/** 计费量：有尺寸=各尺寸面积之和(按起算兜底)；无尺寸=手填数量 */
function itemBillingQty(it) {
    if (it.sizes && it.sizes.length) {
        return it.sizes.reduce(function (sum, s) { return sum + sizeArea(s, it.baseArea); }, 0);
    }
    return it.qty || 0;
}
function itemSubtotal(it) {
    // 手动改写的小计优先（门窗常按整窗议价/抹零，与 计费量×单价 解耦）
    if (it.subtotal != null)
        return Math.max(0, Math.round(it.subtotal));
    return Math.round(itemBillingQty(it) * (it.unitPrice || 0));
}
/** 金额 = Σ各项小计 */
function orderItemsAmount(items) {
    return sanitizeOrderItems(items).reduce(function (s, it) { return s + itemSubtotal(it); }, 0);
}
/** 总价 = 金额 − 优惠 − 回收（≥0；回收=拆旧窗折抵） */
function orderTotalFromItems(items, discount, recycle) {
    if (recycle === void 0) { recycle = 0; }
    return Math.max(0, orderItemsAmount(items) -
        Math.max(0, Math.round(discount || 0)) -
        Math.max(0, Math.round(recycle || 0)));
}
/** 固定 5 类成本之和 */
function fixedCost(o) {
    return ((o.costProfile || 0) +
        (o.costGlass || 0) +
        (o.costHardware || 0) +
        (o.costLabor || 0) +
        (o.costScreen || 0));
}
function totalCost(o) {
    // 卖旧门窗(extras)是收入不是成本，不计入；成本 = 固定5类 + 自定义成本
    return fixedCost(o) + customCostsTotal(o.customCosts);
}
function profitOf(o) {
    // 利润 = 营收(总价 + 卖旧门窗收入) − 成本(固定5类 + 自定义)
    return revenueOf(o) - totalCost(o);
}
/** 营收 = 总价 */
function revenueOf(o) {
    // 营收 = 订单总价 + 卖旧门窗收入（extras 由「其他开销」改为收入）
    return (o.total || 0) + extrasTotal(o.extras);
}
function marginOf(o) {
    var revenue = revenueOf(o);
    return revenue ? profitOf(o) / revenue : 0;
}
