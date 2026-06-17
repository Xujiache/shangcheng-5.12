/**
 * 通用类型
 */

/**
 * 统一 API 响应。
 * 与后端 response.interceptor 实际输出对齐：message 与 msg 双字段冗余
 * （message 面向新前端、msg 兼容 admin-pc 等老前端），timestamp 必返。
 */
export interface ApiResult<T = unknown> {
  code: number
  data: T | null
  message: string
  /** 与 message 同义的冗余字段，后端始终返回 */
  msg: string
  traceId: string
  timestamp: number
}

/** 分页请求 */
export interface PaginationQuery {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/** 分页响应 */
export interface Pagination<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  hasMore?: boolean
}

/** 基础时间字段 */
export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

/** ID 引用类型 */
export type ID = string

/** 软删除字段 */
export interface SoftDeletable {
  deletedAt?: string | null
}

/** 业务错误码 */
export enum ErrorCode {
  /** 成功 */
  SUCCESS = 0,
  /** 通用业务错误 */
  BUSINESS_ERROR = 1000,
  /** 参数校验失败 */
  INVALID_PARAMS = 1001,
  /** 资源不存在 */
  NOT_FOUND = 1002,
  /** 操作冲突 */
  CONFLICT = 1003,
  /** 未登录 */
  UNAUTHORIZED = 2001,
  /** token 过期 */
  TOKEN_EXPIRED = 2002,
  /** 权限不足 */
  FORBIDDEN = 2003,
  /** 商品已下架 */
  PRODUCT_OFFLINE = 3001,
  /** 库存不足 */
  STOCK_INSUFFICIENT = 3002,
  /** 订单状态不允许 */
  ORDER_STATUS_INVALID = 4001,
  /** 支付失败 */
  PAY_FAILED = 5001,
  /** 会员套餐过期 */
  MEMBER_EXPIRED = 6001,
}

/** 端类型 */
export type ClientType = 'user-mp' | 'merchant-app' | 'platform-app' | 'admin-pc'

/** 文件上传响应 */
export interface UploadResponse {
  url: string
  key: string
  size: number
  mimeType: string
}
