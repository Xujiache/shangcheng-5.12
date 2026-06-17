import { HttpException, HttpStatus } from '@nestjs/common'

/**
 * 业务错误码。成员名与数值必须与 @jiujiu/shared 的 ErrorCode 逐项一致
 * （已核验：SUCCESS=0 / BUSINESS_ERROR=1000 / … / MEMBER_EXPIRED=6001，完全相同）。
 *
 * 为什么是手抄而非 `export const BizCode = ErrorCode` 复用：@jiujiu/shared 的 exports
 * 指向 src/*.ts（面向 Vite/类型检查），后端目前对 shared 零运行时依赖；直接复用会让
 * 后端运行时 require 一个 .ts 入口（node 无法解析）。待 shared 改为 dist 解析后再统一。
 * 在此之前，改动本枚举请同步 packages/shared/src/types/common.ts。
 */
export enum BizCode {
  SUCCESS = 0,
  BUSINESS_ERROR = 1000,
  INVALID_PARAMS = 1001,
  NOT_FOUND = 1002,
  CONFLICT = 1003,
  UNAUTHORIZED = 2001,
  TOKEN_EXPIRED = 2002,
  FORBIDDEN = 2003,
  PRODUCT_OFFLINE = 3001,
  STOCK_INSUFFICIENT = 3002,
  ORDER_STATUS_INVALID = 4001,
  PAY_FAILED = 5001,
  MEMBER_EXPIRED = 6001,
}

/**
 * 业务异常。HTTP 状态默认 200（让前端读 code 字段）。
 * 但 2001/2003 等鉴权类异常使用对应 HTTP 状态码以触发前端拦截器。
 */
export class BizException extends HttpException {
  constructor(code: BizCode | number, message: string, status?: HttpStatus) {
    super({ code, message }, status ?? mapHttpStatus(code))
  }
}

function mapHttpStatus(code: number): HttpStatus {
  if (code === BizCode.UNAUTHORIZED || code === BizCode.TOKEN_EXPIRED)
    return HttpStatus.UNAUTHORIZED
  if (code === BizCode.FORBIDDEN) return HttpStatus.FORBIDDEN
  if (code === BizCode.NOT_FOUND) return HttpStatus.NOT_FOUND
  if (code === BizCode.INVALID_PARAMS) return HttpStatus.BAD_REQUEST
  return HttpStatus.OK // 业务异常用 200 让前端通过 code 判断
}
