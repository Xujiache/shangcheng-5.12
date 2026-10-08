"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decimalToNumber = decimalToNumber;
var client_1 = require("@prisma/client");
/** 把任何对象里 Prisma Decimal 字段转 number（接口返回友好） */
function decimalToNumber(input) {
    var _a;
    if (input === null || input === undefined)
        return input;
    if (input instanceof Date)
        return input;
    if (Array.isArray(input))
        return input.map(decimalToNumber);
    if (typeof input !== 'object')
        return input;
    if (input instanceof client_1.Prisma.Decimal)
        return Number(input);
    // Prisma 5 没导出 Decimal class 兼容判断
    if (typeof input.toFixed === 'function' &&
        ((_a = input.constructor) === null || _a === void 0 ? void 0 : _a.name) === 'Decimal') {
        return Number(input);
    }
    var out = {};
    for (var _i = 0, _b = Object.keys(input); _i < _b.length; _i++) {
        var k = _b[_i];
        out[k] = decimalToNumber(input[k]);
    }
    return out;
}
