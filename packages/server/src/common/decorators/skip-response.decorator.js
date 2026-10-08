"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkipResponseWrap = exports.SKIP_RESPONSE_WRAP = void 0;
var common_1 = require("@nestjs/common");
/**
 * 跳过全局 ResponseInterceptor 的包装。
 *
 * 用途：某些回调（如微信支付 v3）要求顶层返回 `{ code: 'SUCCESS'|'FAIL', message }`
 * 这种第三方约定的格式，绝不能被业务统一响应壳 `{ code: 0, data, message, traceId, ... }`
 * 二次包装，否则微信网关解析失败，会无限重试这笔回调。
 *
 * 使用：
 *   @SkipResponseWrap()
 *   @Post('wechat/notify')
 *   wechatNotify(...) { return { code: 'SUCCESS', message: 'OK' } }
 */
exports.SKIP_RESPONSE_WRAP = 'skipResponseWrap';
var SkipResponseWrap = function () { return (0, common_1.SetMetadata)(exports.SKIP_RESPONSE_WRAP, true); };
exports.SkipResponseWrap = SkipResponseWrap;
