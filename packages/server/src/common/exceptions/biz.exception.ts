import { HttpException, HttpStatus } from '@nestjs/common'

/** 业务错误码（与 @jiujiu/shared ErrorCode 对齐） */
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
  if (code === BizCode.UNAUTHORIZED || code === BizCode.TOKEN_EXPIRED) return HttpStatus.UNAUTHORIZED
  if (code === BizCode.FORBIDDEN) return HttpStatus.FORBIDDEN
  if (code === BizCode.NOT_FOUND) return HttpStatus.NOT_FOUND
  if (code === BizCode.INVALID_PARAMS) return HttpStatus.BAD_REQUEST
  return HttpStatus.OK // 业务异常用 200 让前端通过 code 判断
}
