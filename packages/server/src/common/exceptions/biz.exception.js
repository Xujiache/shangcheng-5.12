"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BizException = exports.BizCode = void 0;
var common_1 = require("@nestjs/common");
/**
 * 业务错误码。成员名与数值必须与 @jiujiu/shared 的 ErrorCode 逐项一致
 * （已核验：SUCCESS=0 / BUSINESS_ERROR=1000 / … / MEMBER_EXPIRED=6001，完全相同）。
 *
 * 为什么是手抄而非 `export const BizCode = ErrorCode` 复用：@jiujiu/shared 的 exports
 * 指向 src/*.ts（面向 Vite/类型检查），后端目前对 shared 零运行时依赖；直接复用会让
 * 后端运行时 require 一个 .ts 入口（node 无法解析）。待 shared 改为 dist 解析后再统一。
 * 在此之前，改动本枚举请同步 packages/shared/src/types/common.ts。
 */
var BizCode;
(function (BizCode) {
    BizCode[BizCode["SUCCESS"] = 0] = "SUCCESS";
    BizCode[BizCode["BUSINESS_ERROR"] = 1000] = "BUSINESS_ERROR";
    BizCode[BizCode["INVALID_PARAMS"] = 1001] = "INVALID_PARAMS";
    BizCode[BizCode["NOT_FOUND"] = 1002] = "NOT_FOUND";
    BizCode[BizCode["CONFLICT"] = 1003] = "CONFLICT";
    BizCode[BizCode["UNAUTHORIZED"] = 2001] = "UNAUTHORIZED";
    BizCode[BizCode["TOKEN_EXPIRED"] = 2002] = "TOKEN_EXPIRED";
    BizCode[BizCode["FORBIDDEN"] = 2003] = "FORBIDDEN";
    BizCode[BizCode["PRODUCT_OFFLINE"] = 3001] = "PRODUCT_OFFLINE";
    BizCode[BizCode["STOCK_INSUFFICIENT"] = 3002] = "STOCK_INSUFFICIENT";
    BizCode[BizCode["ORDER_STATUS_INVALID"] = 4001] = "ORDER_STATUS_INVALID";
    BizCode[BizCode["PAY_FAILED"] = 5001] = "PAY_FAILED";
    BizCode[BizCode["MEMBER_EXPIRED"] = 6001] = "MEMBER_EXPIRED";
})(BizCode || (exports.BizCode = BizCode = {}));
/**
 * 业务异常。HTTP 状态默认 200（让前端读 code 字段）。
 * 但 2001/2003 等鉴权类异常使用对应 HTTP 状态码以触发前端拦截器。
 */
var BizException = /** @class */ (function (_super) {
    __extends(BizException, _super);
    function BizException(code, message, status) {
        return _super.call(this, { code: code, message: message }, status !== null && status !== void 0 ? status : mapHttpStatus(code)) || this;
    }
    return BizException;
}(common_1.HttpException));
exports.BizException = BizException;
function mapHttpStatus(code) {
    if (code === BizCode.UNAUTHORIZED || code === BizCode.TOKEN_EXPIRED)
        return common_1.HttpStatus.UNAUTHORIZED;
    if (code === BizCode.FORBIDDEN)
        return common_1.HttpStatus.FORBIDDEN;
    if (code === BizCode.NOT_FOUND)
        return common_1.HttpStatus.NOT_FOUND;
    if (code === BizCode.INVALID_PARAMS)
        return common_1.HttpStatus.BAD_REQUEST;
    return common_1.HttpStatus.OK; // 业务异常用 200 让前端通过 code 判断
}
