"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var globals_1 = require("@jest/globals");
// nanoid@5 是纯 ESM，ts-jest(CJS) 无法直接 require。这里用一份"忠实"的轻量实现替身：
// customAlphabet 仍按传入字符集 + 长度随机取字符，从而保留 genLedgerInviteCode 的
// 长度/字符集契约可被真实验证（仅替换熵源，不改变可观察行为）。
globals_1.jest.mock('nanoid', function () { return ({
    customAlphabet: function (alphabet, size) { return function () {
        var out = '';
        for (var i = 0; i < size; i++) {
            out += alphabet[Math.floor(Math.random() * alphabet.length)];
        }
        return out;
    }; },
}); });
var ledger_constants_1 = require("../src/modules/ledger/ledger.constants");
// ----------------------------------------------------------------------------
// 门窗利账 · 领域常量纯函数
//   会员派生 / 增时叠加 / 订单清洗 / 计费量 / 利润口径 / 配置收口 / 邀请码
// 全部无 DI、无副作用，now 注入便于稳定断言（用相对天数，绝不写死本地时区日期串）。
// ----------------------------------------------------------------------------
var DAY_MS = 86400000;
var NOW = new Date('2026-06-11T00:00:00.000Z');
var daysFromNow = function (n) { return new Date(NOW.getTime() + n * DAY_MS); };
(0, globals_1.describe)('deriveMembership 会员状态派生', function () {
    (0, globals_1.it)('expiresAt 为 null → never=true，daysLeft=0，active/expired 均 false', function () {
        var s = (0, ledger_constants_1.deriveMembership)(null, 'month', NOW);
        (0, globals_1.expect)(s.never).toBe(true);
        (0, globals_1.expect)(s.active).toBe(false);
        (0, globals_1.expect)(s.expired).toBe(false);
        (0, globals_1.expect)(s.daysLeft).toBe(0);
        (0, globals_1.expect)(s.expiringSoon).toBe(false);
        (0, globals_1.expect)(s.expiresAt).toBeNull();
        (0, globals_1.expect)(s.lastPlanKey).toBe('month');
    });
    (0, globals_1.it)('expiresAt 为 undefined 同样判定为 never，lastPlanKey 缺省回落 null', function () {
        var s = (0, ledger_constants_1.deriveMembership)(undefined, undefined, NOW);
        (0, globals_1.expect)(s.never).toBe(true);
        (0, globals_1.expect)(s.lastPlanKey).toBeNull();
    });
    (0, globals_1.it)('未来 +10 天 → active=true，daysLeft=10，expiringSoon=false（>7）', function () {
        var s = (0, ledger_constants_1.deriveMembership)(daysFromNow(10), 'year', NOW);
        (0, globals_1.expect)(s.active).toBe(true);
        (0, globals_1.expect)(s.expired).toBe(false);
        (0, globals_1.expect)(s.never).toBe(false);
        (0, globals_1.expect)(s.daysLeft).toBe(10);
        (0, globals_1.expect)(s.expiringSoon).toBe(false);
        (0, globals_1.expect)(s.expiresAt).toBe(daysFromNow(10).toISOString());
    });
    (0, globals_1.it)('未来 +3 天 → active=true 且 expiringSoon=true（≤7）', function () {
        var s = (0, ledger_constants_1.deriveMembership)(daysFromNow(3), 'week', NOW);
        (0, globals_1.expect)(s.active).toBe(true);
        (0, globals_1.expect)(s.daysLeft).toBe(3);
        (0, globals_1.expect)(s.expiringSoon).toBe(true);
    });
    (0, globals_1.it)('已过期（-5 天）→ expired=true，active=false，daysLeft 为负，expiringSoon=false', function () {
        var s = (0, ledger_constants_1.deriveMembership)(daysFromNow(-5), 'day', NOW);
        (0, globals_1.expect)(s.expired).toBe(true);
        (0, globals_1.expect)(s.active).toBe(false);
        (0, globals_1.expect)(s.never).toBe(false);
        (0, globals_1.expect)(s.daysLeft).toBeLessThan(0);
        (0, globals_1.expect)(s.expiringSoon).toBe(false);
    });
    (0, globals_1.it)('perpetual=true → 永久有效（active=true，不看 expiresAt）', function () {
        var s = (0, ledger_constants_1.deriveMembership)(null, 'permanent', NOW, { perpetual: true });
        (0, globals_1.expect)(s.perpetual).toBe(true);
        (0, globals_1.expect)(s.active).toBe(true);
        (0, globals_1.expect)(s.expired).toBe(false);
        (0, globals_1.expect)(s.never).toBe(false);
    });
    (0, globals_1.it)('trialClaimedAt 非空 → trialClaimed=true', function () {
        var s = (0, ledger_constants_1.deriveMembership)(null, null, NOW, { trialClaimedAt: NOW });
        (0, globals_1.expect)(s.trialClaimed).toBe(true);
        (0, globals_1.expect)(s.never).toBe(true);
    });
});
(0, globals_1.describe)('computeGrantExpiry 增加会员时长（叠加）', function () {
    (0, globals_1.it)('当前到期在未来 → 从原到期日往后续 N 天（不浪费剩余天数）', function () {
        var current = daysFromNow(10);
        var out = (0, ledger_constants_1.computeGrantExpiry)(current, 30, NOW);
        (0, globals_1.expect)(out.getTime()).toBe(current.getTime() + 30 * DAY_MS);
    });
    (0, globals_1.it)('已过期 → 从今天起算 N 天', function () {
        var out = (0, ledger_constants_1.computeGrantExpiry)(daysFromNow(-5), 30, NOW);
        (0, globals_1.expect)(out.getTime()).toBe(NOW.getTime() + 30 * DAY_MS);
    });
    (0, globals_1.it)('从未开通（null）→ 从今天起算 N 天', function () {
        var out = (0, ledger_constants_1.computeGrantExpiry)(null, 7, NOW);
        (0, globals_1.expect)(out.getTime()).toBe(NOW.getTime() + 7 * DAY_MS);
    });
    (0, globals_1.it)('负数天数（后台扣减）→ 只减少时长，从原到期日往前推', function () {
        var current = daysFromNow(100);
        var out = (0, ledger_constants_1.computeGrantExpiry)(current, -10, NOW);
        (0, globals_1.expect)(out.getTime()).toBe(current.getTime() - 10 * DAY_MS);
        (0, globals_1.expect)(out.getTime()).toBeLessThan(current.getTime());
    });
    (0, globals_1.it)('封顶 now+3650 天：传 99999 天被钳到上限', function () {
        var out = (0, ledger_constants_1.computeGrantExpiry)(null, 99999, NOW);
        (0, globals_1.expect)(out.getTime()).toBe(NOW.getTime() + 3650 * DAY_MS);
    });
});
(0, globals_1.describe)('sanitizeExtras / extrasTotal 其他开销清洗', function () {
    (0, globals_1.it)('非数组输入 → 返回空数组', function () {
        (0, globals_1.expect)((0, ledger_constants_1.sanitizeExtras)(null)).toEqual([]);
        (0, globals_1.expect)((0, ledger_constants_1.sanitizeExtras)('x')).toEqual([]);
        (0, globals_1.expect)((0, ledger_constants_1.sanitizeExtras)({})).toEqual([]);
    });
    (0, globals_1.it)('截断超过 50 条', function () {
        var raw = Array.from({ length: 60 }, function () { return ({ type: '运费', amount: 5 }); });
        (0, globals_1.expect)((0, ledger_constants_1.sanitizeExtras)(raw)).toHaveLength(50);
    });
    (0, globals_1.it)('type 做 trim + 截断到 20 字符；amount 四舍五入', function () {
        var out = (0, ledger_constants_1.sanitizeExtras)([{ type: '  ' + 'A'.repeat(30) + '  ', amount: 12.6 }]);
        (0, globals_1.expect)(out[0].type).toBe('A'.repeat(20));
        (0, globals_1.expect)(out[0].amount).toBe(13);
    });
    (0, globals_1.it)('amount 为负 / 0 / NaN 的项被过滤；type 为空被过滤', function () {
        var out = (0, ledger_constants_1.sanitizeExtras)([
            { type: '负', amount: -10 },
            { type: '零', amount: 0 },
            { type: '非数', amount: 'abc' },
            { type: '', amount: 100 },
            { type: '有效', amount: 50 },
        ]);
        (0, globals_1.expect)(out).toEqual([{ type: '有效', amount: 50 }]);
    });
    (0, globals_1.it)('extrasTotal 正确求和', function () {
        (0, globals_1.expect)((0, ledger_constants_1.extrasTotal)([
            { type: 'a', amount: 10 },
            { type: 'b', amount: 20 },
        ])).toBe(30);
        (0, globals_1.expect)((0, ledger_constants_1.extrasTotal)('bad')).toBe(0);
    });
});
(0, globals_1.describe)('sanitizeCustomCosts / customCostsTotal 自定义成本项', function () {
    (0, globals_1.it)('非数组 → []', function () {
        (0, globals_1.expect)((0, ledger_constants_1.sanitizeCustomCosts)(undefined)).toEqual([]);
    });
    (0, globals_1.it)('截断超过 50 条', function () {
        var raw = Array.from({ length: 60 }, function () { return ({ name: '杂费', amount: 3 }); });
        (0, globals_1.expect)((0, ledger_constants_1.sanitizeCustomCosts)(raw)).toHaveLength(50);
    });
    (0, globals_1.it)('name 截断到 20 字符；无名 / 0 金额项被丢弃', function () {
        var out = (0, ledger_constants_1.sanitizeCustomCosts)([
            { name: 'N'.repeat(25), amount: 8 },
            { name: '', amount: 100 },
            { name: '免费', amount: 0 },
            { name: '有效', amount: 40 },
        ]);
        (0, globals_1.expect)(out).toEqual([
            { name: 'N'.repeat(20), amount: 8 },
            { name: '有效', amount: 40 },
        ]);
    });
    (0, globals_1.it)('customCostsTotal 正确求和', function () {
        (0, globals_1.expect)((0, ledger_constants_1.customCostsTotal)([
            { name: 'a', amount: 5 },
            { name: 'b', amount: 15 },
        ])).toBe(20);
    });
    (0, globals_1.it)('保留合法分类 id，非法字符会被清洗', function () {
        (0, globals_1.expect)((0, ledger_constants_1.sanitizeCustomCosts)([{ id: ' cost:board/1 ', name: '板材', amount: 80 }])).toEqual([
            { id: 'costboard1', name: '板材', amount: 80 },
        ]);
    });
});
(0, globals_1.describe)('sanitizeCostCategories 常用成本分类', function () {
    (0, globals_1.it)('空配置回退到门窗默认五类', function () {
        (0, globals_1.expect)((0, ledger_constants_1.sanitizeCostCategories)([])).toEqual(ledger_constants_1.DEFAULT_COST_CATEGORIES);
    });
    (0, globals_1.it)('保留用户排序、清理重复 id 并补齐合法颜色', function () {
        (0, globals_1.expect)((0, ledger_constants_1.sanitizeCostCategories)([
            { id: 'board', name: '石膏板', color: 'c4' },
            { id: 'paint', name: '刮大白', color: 'bad' },
            { id: 'board', name: '重复项', color: 'c1' },
        ])).toEqual([
            { id: 'board', name: '石膏板', color: 'c4' },
            { id: 'paint', name: '刮大白', color: 'c2' },
        ]);
    });
});
(0, globals_1.describe)('sanitizeOrderItems 门窗报价明细清洗', function () {
    (0, globals_1.it)('非数组 → []，整体截断到 100 条', function () {
        (0, globals_1.expect)((0, ledger_constants_1.sanitizeOrderItems)(null)).toEqual([]);
        var raw = Array.from({ length: 120 }, function () { return ({ name: '推拉窗' }); });
        (0, globals_1.expect)((0, ledger_constants_1.sanitizeOrderItems)(raw)).toHaveLength(100);
    });
    (0, globals_1.it)('纯空行被丢弃；name 做 trim + slice(0,40)', function () {
        var out = (0, ledger_constants_1.sanitizeOrderItems)([
            { name: '  ' }, // 纯空（无名称/尺寸/数量/单价）→ 丢弃
            { name: '  断桥铝  ' },
            { name: 'X'.repeat(50) },
        ]);
        (0, globals_1.expect)(out).toHaveLength(2);
        (0, globals_1.expect)(out[0].name).toBe('断桥铝');
        (0, globals_1.expect)(out[1].name).toBe('X'.repeat(40));
    });
    (0, globals_1.it)('名称非强制：无名称但有 尺寸/数量/单价 任一的项被保留', function () {
        var out = (0, ledger_constants_1.sanitizeOrderItems)([
            { name: '', sizes: [{ w: 800, h: 1200, note: '' }] }, // 有尺寸 → 保留
            { name: '', qty: 3, unitPrice: 100 }, // 有数量+单价 → 保留
            { name: '', unitPrice: 50 }, // 仅单价 → 保留
            { name: '', baseArea: 0, qty: 0, unitPrice: 0, sizes: [] }, // 纯空 → 丢弃
        ]);
        (0, globals_1.expect)(out).toHaveLength(3);
        (0, globals_1.expect)(out[0].sizes).toHaveLength(1);
        (0, globals_1.expect)(out[1].qty).toBe(3);
        (0, globals_1.expect)(out[2].unitPrice).toBe(50);
    });
    (0, globals_1.it)('小计手动改写：保留 subtotal（含仅有小计的项），无 subtotal 落 null', function () {
        var out = (0, ledger_constants_1.sanitizeOrderItems)([
            { name: '', baseArea: 0, qty: 0, unitPrice: 0, sizes: [], subtotal: 500 }, // 仅小计 → 保留
            { name: '窗', unitPrice: 100, qty: 2, subtotal: 0 }, // 改写 0 → 保留且 subtotal=0
            { name: '门', unitPrice: 50, qty: 1 }, // 无 subtotal → null
            { name: '', baseArea: 0, qty: 0, unitPrice: 0, sizes: [], subtotal: '' }, // 纯空 → 丢弃
        ]);
        (0, globals_1.expect)(out).toHaveLength(3);
        (0, globals_1.expect)(out[0].subtotal).toBe(500);
        (0, globals_1.expect)(out[1].subtotal).toBe(0);
        (0, globals_1.expect)(out[2].subtotal).toBeNull();
    });
    (0, globals_1.it)('sizes 截断到 100，w/h ≤ 0 的尺寸被过滤，每条备注截断到 30', function () {
        var sizes = [
            { w: 800, h: 1250, note: 'N'.repeat(40) },
            { w: 0, h: 1000, note: '无宽' },
            { w: 1000, h: 0, note: '无高' },
            { w: -5, h: -5, note: '负' },
        ];
        var out = (0, ledger_constants_1.sanitizeOrderItems)([{ name: '窗', sizes: sizes }]);
        (0, globals_1.expect)(out[0].sizes).toHaveLength(1);
        // 旧单单条 note 兼容迁移为 notes 数组，逐条仍截断到 30
        (0, globals_1.expect)(out[0].sizes[0]).toEqual({ w: 800, h: 1250, count: 1, notes: ['N'.repeat(30)] });
    });
    (0, globals_1.it)('尺寸多条备注：notes 数组逐条 trim/≤30、丢空、≤50 条', function () {
        var out = (0, ledger_constants_1.sanitizeOrderItems)([
            { name: '窗', sizes: [{ w: 800, h: 1200, notes: ['  灰色  ', '', '钢化', 'N'.repeat(40)] }] },
        ]);
        (0, globals_1.expect)(out[0].sizes[0].notes).toEqual(['灰色', '钢化', 'N'.repeat(30)]);
        var many = Array.from({ length: 60 }, function (_, i) { return 'n' + i; });
        var out2 = (0, ledger_constants_1.sanitizeOrderItems)([{ name: '窗', sizes: [{ w: 100, h: 100, notes: many }] }]);
        (0, globals_1.expect)(out2[0].sizes[0].notes).toHaveLength(50);
    });
    (0, globals_1.it)('baseArea/unitPrice/qty 清洗：负数归 0，unitPrice 四舍五入', function () {
        var out = (0, ledger_constants_1.sanitizeOrderItems)([{ name: '门', baseArea: -2, unitPrice: 199.7, qty: -3 }]);
        (0, globals_1.expect)(out[0].baseArea).toBe(0);
        (0, globals_1.expect)(out[0].unitPrice).toBe(200);
        (0, globals_1.expect)(out[0].qty).toBe(0);
    });
    (0, globals_1.it)('sizes 非数组 → 退化为空数组', function () {
        var out = (0, ledger_constants_1.sanitizeOrderItems)([{ name: '门', sizes: 'oops' }]);
        (0, globals_1.expect)(out[0].sizes).toEqual([]);
    });
});
(0, globals_1.describe)('itemBillingQty 计费量', function () {
    (0, globals_1.it)('有尺寸 = 各尺寸面积之和（800x1250mm=1㎡，不足起算按 baseArea 兜底）', function () {
        var it = {
            name: '窗',
            note: '',
            baseArea: 1.5,
            unitPrice: 0,
            qty: 0,
            sizes: [
                { w: 800, h: 1250, note: '' }, // 1.0㎡ → 兜底到 1.5
                { w: 2000, h: 2000, note: '' }, // 4.0㎡ → 保留 4.0
            ],
        };
        (0, globals_1.expect)((0, ledger_constants_1.itemBillingQty)(it)).toBeCloseTo(5.5, 6);
    });
    (0, globals_1.it)('无尺寸 = 手填数量 qty', function () {
        var it = { name: '门', note: '', baseArea: 0, unitPrice: 0, qty: 3.5, sizes: [] };
        (0, globals_1.expect)((0, ledger_constants_1.itemBillingQty)(it)).toBe(3.5);
    });
    (0, globals_1.it)('尺寸件数：宽×高×件数（1000×2000×3 = 6㎡，单价100 → 小计600）', function () {
        var it = {
            name: '窗',
            baseArea: 0,
            unitPrice: 100,
            qty: 0,
            sizes: [{ w: 1000, h: 2000, count: 3 }],
        };
        (0, globals_1.expect)((0, ledger_constants_1.itemBillingQty)(it)).toBeCloseTo(6, 6);
        (0, globals_1.expect)((0, ledger_constants_1.itemSubtotal)(it)).toBe(600);
    });
    (0, globals_1.it)('件数缺省/非法 → 按 1 计', function () {
        var a = { name: '窗', baseArea: 0, unitPrice: 0, qty: 0, sizes: [{ w: 1000, h: 1000 }] };
        var b = {
            name: '窗',
            baseArea: 0,
            unitPrice: 0,
            qty: 0,
            sizes: [{ w: 1000, h: 1000, count: 0 }],
        };
        (0, globals_1.expect)((0, ledger_constants_1.itemBillingQty)(a)).toBeCloseTo(1, 6);
        (0, globals_1.expect)((0, ledger_constants_1.itemBillingQty)(b)).toBeCloseTo(1, 6);
    });
});
(0, globals_1.describe)('itemSubtotal / orderItemsAmount / orderTotalFromItems 金额口径', function () {
    (0, globals_1.it)('itemSubtotal = round(计费量 × 单价)', function () {
        var it = { name: '门', note: '', baseArea: 0, unitPrice: 199, qty: 2, sizes: [] };
        (0, globals_1.expect)((0, ledger_constants_1.itemSubtotal)(it)).toBe(398);
    });
    (0, globals_1.it)('itemSubtotal 手动改写优先：subtotal 非空即覆盖 计费量×单价（含 0）', function () {
        // 改写 250 覆盖 2×100=200
        (0, globals_1.expect)((0, ledger_constants_1.itemSubtotal)({ unitPrice: 100, qty: 2, sizes: [], subtotal: 250 })).toBe(250);
        // 改写 0（免单）覆盖 5×80=400
        (0, globals_1.expect)((0, ledger_constants_1.itemSubtotal)({ unitPrice: 80, qty: 5, sizes: [], subtotal: 0 })).toBe(0);
        // subtotal=null → 回落自动算
        (0, globals_1.expect)((0, ledger_constants_1.itemSubtotal)({ unitPrice: 100, qty: 2, sizes: [], subtotal: null })).toBe(200);
    });
    (0, globals_1.it)('orderTotalFromItems 尊重手动小计：以改写值入金额', function () {
        var items = [
            { unitPrice: 100, qty: 2, sizes: [], subtotal: 1500 }, // 改写 1500（非 200）
            { unitPrice: 50, qty: 3, sizes: [] }, // 自动 150
        ];
        (0, globals_1.expect)((0, ledger_constants_1.orderTotalFromItems)(items, 0)).toBe(1650);
    });
    (0, globals_1.it)('orderItemsAmount = Σ各项小计', function () {
        var items = [
            { name: 'a', unitPrice: 100, qty: 2, sizes: [] },
            { name: 'b', unitPrice: 50, qty: 3, sizes: [] },
        ];
        (0, globals_1.expect)((0, ledger_constants_1.orderItemsAmount)(items)).toBe(350);
    });
    (0, globals_1.it)('总价 = max(0, 金额 − 优惠)', function () {
        var items = [{ name: 'a', unitPrice: 100, qty: 10, sizes: [] }]; // 1000
        (0, globals_1.expect)((0, ledger_constants_1.orderTotalFromItems)(items, 200)).toBe(800);
    });
    (0, globals_1.it)('总价 = max(0, 金额 − 优惠 − 回收)', function () {
        var items = [{ name: 'a', unitPrice: 100, qty: 10, sizes: [] }]; // 1000
        (0, globals_1.expect)((0, ledger_constants_1.orderTotalFromItems)(items, 200, 100)).toBe(700);
        (0, globals_1.expect)((0, ledger_constants_1.orderTotalFromItems)(items, 0, 1200)).toBe(0); // 回收超额也归 0
        (0, globals_1.expect)((0, ledger_constants_1.orderTotalFromItems)(items, 0)).toBe(1000); // 回收缺省=0，向后兼容
    });
    (0, globals_1.it)('优惠为负 → 视为 0（不增加总价）', function () {
        var items = [{ name: 'a', unitPrice: 100, qty: 10, sizes: [] }]; // 1000
        (0, globals_1.expect)((0, ledger_constants_1.orderTotalFromItems)(items, -300)).toBe(1000);
    });
    (0, globals_1.it)('优惠超过金额 → 总价钳到 0（不为负）', function () {
        var items = [{ name: 'a', unitPrice: 100, qty: 10, sizes: [] }]; // 1000
        (0, globals_1.expect)((0, ledger_constants_1.orderTotalFromItems)(items, 5000)).toBe(0);
    });
});
(0, globals_1.describe)('成本 / 利润 / 营收 / 毛利率 全链路', function () {
    var base = {
        total: 1000,
        costProfile: 100,
        costGlass: 50,
        costHardware: 30,
        costLabor: 20,
        costScreen: 10,
        extras: [{ type: '运费', amount: 40 }],
        customCosts: [{ name: '回扣', amount: 60 }],
    };
    (0, globals_1.it)('fixedCost = 固定 5 类之和', function () {
        (0, globals_1.expect)((0, ledger_constants_1.fixedCost)(base)).toBe(210);
    });
    (0, globals_1.it)('totalCost = 固定成本 + customCosts（卖旧门窗是收入不计成本）', function () {
        (0, globals_1.expect)((0, ledger_constants_1.totalCost)(base)).toBe(210 + 60);
    });
    (0, globals_1.it)('revenueOf = 总价 + 卖旧门窗收入', function () {
        (0, globals_1.expect)((0, ledger_constants_1.revenueOf)(base)).toBe(1000 + 40);
    });
    (0, globals_1.it)('profitOf = 营收 − 成本（卖旧门窗加进利润）', function () {
        // (1000 + 40) − (210 + 60) = 770
        (0, globals_1.expect)((0, ledger_constants_1.profitOf)(base)).toBe(770);
    });
    (0, globals_1.it)('marginOf = 利润 / 营收', function () {
        (0, globals_1.expect)((0, ledger_constants_1.marginOf)(base)).toBeCloseTo(770 / 1040, 6);
    });
    (0, globals_1.it)('营收为 0 → marginOf 返回 0（避免除零）', function () {
        var zero = {
            total: 0,
            costProfile: 0,
            costGlass: 0,
            costHardware: 0,
            costLabor: 0,
            costScreen: 0,
            extras: [],
        };
        (0, globals_1.expect)((0, ledger_constants_1.revenueOf)(zero)).toBe(0);
        (0, globals_1.expect)((0, ledger_constants_1.marginOf)(zero)).toBe(0);
    });
});
(0, globals_1.describe)('normalizeLedgerConfig 配置收口', function () {
    (0, globals_1.it)('null / 非对象输入 → 全量默认值', function () {
        (0, globals_1.expect)((0, ledger_constants_1.normalizeLedgerConfig)(null)).toEqual(ledger_constants_1.LEDGER_CONFIG_DEFAULTS);
        (0, globals_1.expect)((0, ledger_constants_1.normalizeLedgerConfig)('garbage')).toEqual(ledger_constants_1.LEDGER_CONFIG_DEFAULTS);
        (0, globals_1.expect)((0, ledger_constants_1.normalizeLedgerConfig)(undefined)).toEqual(ledger_constants_1.LEDGER_CONFIG_DEFAULTS);
    });
    (0, globals_1.it)('数值越上限被钳到 3650，越下限被钳到 0，并四舍五入', function () {
        var out = (0, ledger_constants_1.normalizeLedgerConfig)({
            inviteRewardDays: 99999,
            inviteMaxRewarded: -10,
        });
        (0, globals_1.expect)(out.inviteRewardDays).toBe(3650);
        (0, globals_1.expect)(out.inviteMaxRewarded).toBe(0);
    });
    (0, globals_1.it)('数值非法（NaN）→ 回落该字段默认值', function () {
        var out = (0, ledger_constants_1.normalizeLedgerConfig)({ inviteRewardDays: 'abc' });
        (0, globals_1.expect)(out.inviteRewardDays).toBe(ledger_constants_1.LEDGER_CONFIG_DEFAULTS.inviteRewardDays);
    });
    (0, globals_1.it)('历史试用字段被忽略，不能关闭会员闸门', function () {
        var out = (0, ledger_constants_1.normalizeLedgerConfig)({ cutRequireMembership: false, cutTrialDays: 3650 });
        (0, globals_1.expect)(out).not.toHaveProperty('cutRequireMembership');
        (0, globals_1.expect)(out).not.toHaveProperty('cutTrialDays');
    });
    (0, globals_1.it)('plans 缺省 / 非数组 → 回落默认套餐', function () {
        (0, globals_1.expect)((0, ledger_constants_1.normalizeLedgerConfig)({}).plans).toEqual(ledger_constants_1.LEDGER_PLANS);
        (0, globals_1.expect)((0, ledger_constants_1.normalizeLedgerConfig)({ plans: 'x' }).plans).toEqual(ledger_constants_1.LEDGER_PLANS);
    });
});
(0, globals_1.describe)('normalizeLedgerPlans 套餐收口', function () {
    (0, globals_1.it)('合法套餐被采用，天数取整、价格 trim', function () {
        var out = (0, ledger_constants_1.normalizeLedgerPlans)([
            { key: 'month', label: '月卡', days: 30.4, price: ' ¥29 ' },
            { key: 'year', label: '年卡', days: 365, price: '¥268' },
        ]);
        (0, globals_1.expect)(out).toEqual([
            { key: 'month', label: '月卡', days: 30, price: '¥29', perpetual: false, trial: false },
            { key: 'year', label: '年卡', days: 365, price: '¥268', perpetual: false, trial: false },
        ]);
    });
    (0, globals_1.it)('天数越界钳到 [1,3650]；缺名称/缺标识的行被丢弃', function () {
        var out = (0, ledger_constants_1.normalizeLedgerPlans)([
            { key: 'big', label: '超大', days: 99999, price: '' }, // 钳到 3650
            { key: 'zero', label: '零天', days: 0, price: '' }, // 钳到 1
            { key: '', label: '无标识', days: 10, price: '' }, // 缺 key → 丢弃
            { key: 'noname', label: '', days: 10, price: '' }, // 缺 label → 丢弃
        ]);
        (0, globals_1.expect)(out).toEqual([
            { key: 'big', label: '超大', days: 3650, price: '', perpetual: false, trial: false },
            { key: 'zero', label: '零天', days: 1, price: '', perpetual: false, trial: false },
        ]);
    });
    (0, globals_1.it)('key 重复仅保留首条', function () {
        var out = (0, ledger_constants_1.normalizeLedgerPlans)([
            { key: 'm', label: '月卡A', days: 30, price: '' },
            { key: 'm', label: '月卡B', days: 60, price: '' },
        ]);
        (0, globals_1.expect)(out).toEqual([
            { key: 'm', label: '月卡A', days: 30, price: '', perpetual: false, trial: false },
        ]);
    });
    (0, globals_1.it)('全部非法 / 空数组 → 回落默认套餐', function () {
        (0, globals_1.expect)((0, ledger_constants_1.normalizeLedgerPlans)([])).toEqual(ledger_constants_1.LEDGER_PLANS);
        (0, globals_1.expect)((0, ledger_constants_1.normalizeLedgerPlans)([{ key: '', label: '', days: 0, price: '' }])).toEqual(ledger_constants_1.LEDGER_PLANS);
        (0, globals_1.expect)((0, ledger_constants_1.normalizeLedgerPlans)(null)).toEqual(ledger_constants_1.LEDGER_PLANS);
    });
});
(0, globals_1.describe)('genLedgerInviteCode 邀请码', function () {
    (0, globals_1.it)('长度为 8 且字符集排除 B/I/O/0/1', function () {
        for (var i = 0; i < 200; i++) {
            var code = (0, ledger_constants_1.genLedgerInviteCode)();
            (0, globals_1.expect)(code).toHaveLength(8);
            (0, globals_1.expect)(code).toMatch(/^[ACDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
            (0, globals_1.expect)(code).not.toMatch(/[BIO01]/);
        }
    });
});
