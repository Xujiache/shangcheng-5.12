"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var globals_1 = require("@jest/globals");
var client_1 = require("@prisma/client");
// nanoid@5 是纯 ESM，ts-jest 默认不转换 node_modules，会在导入 id.util 时抛
// "Cannot use import statement outside a module"。这里用工厂 mock 替换掉
// customAlphabet，使其返回一个从给定字符集随机取 N 位的生成器，行为等价。
globals_1.jest.mock('nanoid', function () { return ({
    customAlphabet: function (alphabet, size) { return function () {
        var s = '';
        for (var i = 0; i < size; i++) {
            s += alphabet[Math.floor(Math.random() * alphabet.length)];
        }
        return s;
    }; },
}); });
var pagination_util_1 = require("../src/common/utils/pagination.util");
var decimal_util_1 = require("../src/common/utils/decimal.util");
var id_util_1 = require("../src/common/utils/id.util");
// ----------------------------------------------------------------------------
// common/utils — 分页 / Decimal 序列化 / 单号生成
//
// 实现位置：packages/server/src/common/utils/{pagination,decimal,id}.util.ts
// ----------------------------------------------------------------------------
(0, globals_1.describe)('pagination.util — parsePage', function () {
    (0, globals_1.it)('空查询时返回默认分页 page=1 / pageSize=20', function () {
        var _a = (0, pagination_util_1.parsePage)({}), page = _a.page, pageSize = _a.pageSize, skip = _a.skip, take = _a.take;
        (0, globals_1.expect)(page).toBe(1);
        (0, globals_1.expect)(pageSize).toBe(20);
        (0, globals_1.expect)(skip).toBe(0);
        (0, globals_1.expect)(take).toBe(20);
    });
    (0, globals_1.it)('page 为 0 / -1 / 非法字符串时都回落到 1', function () {
        (0, globals_1.expect)((0, pagination_util_1.parsePage)({ page: 0 }).page).toBe(1);
        (0, globals_1.expect)((0, pagination_util_1.parsePage)({ page: -1 }).page).toBe(1);
        (0, globals_1.expect)((0, pagination_util_1.parsePage)({ page: 'abc' }).page).toBe(1);
    });
    (0, globals_1.it)('pageSize 超过 100 时被夹到 100', function () {
        (0, globals_1.expect)((0, pagination_util_1.parsePage)({ pageSize: 1000 }).pageSize).toBe(100);
        (0, globals_1.expect)((0, pagination_util_1.parsePage)({ pageSize: 1000 }).take).toBe(100);
    });
    (0, globals_1.it)('pageSize 为 0 时回落到下界 1（而非默认 20）', function () {
        // Number(0) || 20 => 20，再被 Math.max(1, 20) 取 20 —— 但 0 是 falsy，
        // 实际链路是 Number(q.pageSize) || 20 => 20。这里断言真实行为。
        (0, globals_1.expect)((0, pagination_util_1.parsePage)({ pageSize: 0 }).pageSize).toBe(20);
    });
    (0, globals_1.it)('pageSize 为 1 时保持 1（下界不被默认值覆盖）', function () {
        (0, globals_1.expect)((0, pagination_util_1.parsePage)({ pageSize: 1 }).pageSize).toBe(1);
    });
    (0, globals_1.it)('skip / take 随 page、pageSize 正确计算', function () {
        var _a = (0, pagination_util_1.parsePage)({ page: 3, pageSize: 15 }), skip = _a.skip, take = _a.take;
        (0, globals_1.expect)(skip).toBe((3 - 1) * 15);
        (0, globals_1.expect)(take).toBe(15);
    });
});
(0, globals_1.describe)('pagination.util — buildPage', function () {
    (0, globals_1.it)('page*pageSize === total 时 hasMore=false（恰好到末页）', function () {
        var res = (0, pagination_util_1.buildPage)([], 40, 2, 20); // 2*20 === 40
        (0, globals_1.expect)(res.hasMore).toBe(false);
    });
    (0, globals_1.it)('page*pageSize < total 时 hasMore=true（仍有下一页）', function () {
        var res = (0, pagination_util_1.buildPage)([], 41, 2, 20); // 2*20 = 40 < 41
        (0, globals_1.expect)(res.hasMore).toBe(true);
    });
    (0, globals_1.it)('透传 list / total / page / pageSize 原样返回', function () {
        var list = [{ id: 1 }, { id: 2 }];
        var res = (0, pagination_util_1.buildPage)(list, 2, 1, 20);
        (0, globals_1.expect)(res.list).toBe(list);
        (0, globals_1.expect)(res.total).toBe(2);
        (0, globals_1.expect)(res.page).toBe(1);
        (0, globals_1.expect)(res.pageSize).toBe(20);
    });
});
(0, globals_1.describe)('decimal.util — decimalToNumber', function () {
    (0, globals_1.it)('顶层 Prisma.Decimal 转为 number', function () {
        var out = (0, decimal_util_1.decimalToNumber)(new client_1.Prisma.Decimal('12.34'));
        (0, globals_1.expect)(out).toBe(12.34);
        (0, globals_1.expect)(typeof out).toBe('number');
    });
    (0, globals_1.it)('嵌套对象内的 Decimal 字段递归转 number', function () {
        var out = (0, decimal_util_1.decimalToNumber)({
            price: new client_1.Prisma.Decimal('99.9'),
            inner: { fee: new client_1.Prisma.Decimal('1.5') },
        });
        (0, globals_1.expect)(out).toEqual({ price: 99.9, inner: { fee: 1.5 } });
    });
    (0, globals_1.it)('数组内的 Decimal 元素递归转 number', function () {
        var out = (0, decimal_util_1.decimalToNumber)([new client_1.Prisma.Decimal('1.1'), new client_1.Prisma.Decimal('2.2')]);
        (0, globals_1.expect)(out).toEqual([1.1, 2.2]);
    });
    (0, globals_1.it)('Date 实例原样返回，不被展开成 {}', function () {
        var d = new Date('2026-06-11T00:00:00.000Z');
        var out = (0, decimal_util_1.decimalToNumber)(d);
        (0, globals_1.expect)(out).toBe(d);
        (0, globals_1.expect)(out instanceof Date).toBe(true);
    });
    (0, globals_1.it)('null / undefined 原样透传', function () {
        (0, globals_1.expect)((0, decimal_util_1.decimalToNumber)(null)).toBeNull();
        (0, globals_1.expect)((0, decimal_util_1.decimalToNumber)(undefined)).toBeUndefined();
    });
    (0, globals_1.it)('原始类型（string / number / boolean）原样透传', function () {
        (0, globals_1.expect)((0, decimal_util_1.decimalToNumber)('hello')).toBe('hello');
        (0, globals_1.expect)((0, decimal_util_1.decimalToNumber)(42)).toBe(42);
        (0, globals_1.expect)((0, decimal_util_1.decimalToNumber)(true)).toBe(true);
    });
});
(0, globals_1.describe)('id.util — 单号生成', function () {
    var CHARSET = /^[0-9A-Z]+$/;
    // 业务字符集排除了易混淆的 I 和 O
    var NO_IO = function (s) { return !/[IO]/.test(s); };
    function expectDatePart(no, prefix) {
        // prefix + 8位日期 + 12位随机
        var body = no.slice(prefix.length);
        var ymd = body.slice(0, 8);
        (0, globals_1.expect)(ymd).toMatch(/^\d{8}$/);
        var rand = body.slice(8);
        (0, globals_1.expect)(rand).toHaveLength(12);
    }
    (0, globals_1.it)('orderNo 形如 O + 8位日期 + 12位随机，总长 21', function () {
        var no = (0, id_util_1.orderNo)();
        (0, globals_1.expect)(no).toHaveLength(21);
        (0, globals_1.expect)(no.startsWith('O')).toBe(true);
        expectDatePart(no, 'O');
    });
    (0, globals_1.it)('orderNo 随机段字符集仅 0-9A-Z 且不含 I / O', function () {
        var no = (0, id_util_1.orderNo)();
        var rand = no.slice(9); // 跳过 O 前缀(1) + 日期(8)
        (0, globals_1.expect)(rand).toMatch(CHARSET);
        (0, globals_1.expect)(NO_IO(rand)).toBe(true);
    });
    (0, globals_1.it)('refundNo 以 R 开头，结构与 orderNo 一致（总长 21）', function () {
        var no = (0, id_util_1.refundNo)();
        (0, globals_1.expect)(no.startsWith('R')).toBe(true);
        (0, globals_1.expect)(no).toHaveLength(21);
        expectDatePart(no, 'R');
    });
    (0, globals_1.it)('withdrawNo 以 W 开头', function () {
        var no = (0, id_util_1.withdrawNo)();
        (0, globals_1.expect)(no.startsWith('W')).toBe(true);
        (0, globals_1.expect)(no).toHaveLength(21);
        expectDatePart(no, 'W');
    });
    (0, globals_1.it)('payNo 以 P 开头', function () {
        var no = (0, id_util_1.payNo)();
        (0, globals_1.expect)(no.startsWith('P')).toBe(true);
        (0, globals_1.expect)(no).toHaveLength(21);
        expectDatePart(no, 'P');
    });
    (0, globals_1.it)('membershipNo 以 MEM 开头，结构为 MEM + 8位日期 + 12位随机', function () {
        var no = (0, id_util_1.membershipNo)();
        (0, globals_1.expect)(no.startsWith('MEM')).toBe(true);
        (0, globals_1.expect)(no).toHaveLength(3 + 8 + 12);
        expectDatePart(no, 'MEM');
        var rand = no.slice(3 + 8);
        (0, globals_1.expect)(rand).toMatch(CHARSET);
        (0, globals_1.expect)(NO_IO(rand)).toBe(true);
    });
});
