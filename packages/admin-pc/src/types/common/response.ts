/**
 * API 响应类型定义模块
 *
 * 提供统一的 API 响应结构类型定义
 *
 * ## 主要功能
 *
 * - 基础响应结构定义
 * - 泛型支持（适配不同数据类型）
 * - 统一的响应格式约束
 *
 * ## 使用场景
 *
 * - API 请求响应类型约束
 * - 接口数据类型定义
 * - 响应数据解析
 *
 * @module types/common/response
 * @author Art Design Pro Team
 */

/**
 * 基础 API 响应结构。
 *
 * 与后端 response.interceptor / @jiujiu/shared ApiResult 对齐：后端实际同时返回
 * message 与 msg（双字段冗余）、traceId、timestamp。这里 msg 必有（admin-pc 历史依赖），
 * 其余按真实返回补为可选，方便链路排查与读取 message，且不影响既有构造点。
 */
export interface BaseResponse<T = unknown> {
  /** 状态码 */
  code: number
  /** 消息（与 message 同义，admin-pc 历史字段） */
  msg: string
  /** 消息（新前端字段，后端与 msg 同时返回） */
  message?: string
  /** 链路追踪 ID */
  traceId?: string
  /** 服务端时间戳（ms） */
  timestamp?: number
  /** 数据 */
  data: T
}
