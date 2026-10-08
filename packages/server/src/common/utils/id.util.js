"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderNo = orderNo;
exports.refundNo = refundNo;
exports.withdrawNo = withdrawNo;
exports.payNo = payNo;
exports.membershipNo = membershipNo;
var nanoid_1 = require("nanoid");
var nano = (0, nanoid_1.customAlphabet)('0123456789ABCDEFGHJKLMNPQRSTUVWXYZ', 12);
function orderNo(prefix) {
    if (prefix === void 0) { prefix = 'O'; }
    var d = new Date();
    var ymd = "".concat(d.getFullYear()).concat(String(d.getMonth() + 1).padStart(2, '0')).concat(String(d.getDate()).padStart(2, '0'));
    return "".concat(prefix).concat(ymd).concat(nano());
}
function refundNo() {
    return orderNo('R');
}
function withdrawNo() {
    return orderNo('W');
}
function payNo() {
    return orderNo('P');
}
/** 会员订阅缴费单号；带 MEM 前缀让 wxpay 回调能识别为会员订阅而非普通订单 */
function membershipNo() {
    return orderNo('MEM');
}
