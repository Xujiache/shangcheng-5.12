/**
 * 在线客服
 */
import type { BaseEntity, ID } from './common'

/** 会话 */
export interface ChatSession extends BaseEntity {
  userId: ID
  merchantId: ID
  lastMessageAt: string
  unreadCount?: number
  status: 'open' | 'closed'
}

/** 消息类型 */
export type ChatMessageType = 'text' | 'image' | 'quick' | 'product' | 'order' | 'system'

/** 发送者 */
export type ChatMessageSender = 'user' | 'merchant' | 'system'

/** 消息 */
export interface ChatMessage extends BaseEntity {
  sessionId: ID
  sender: ChatMessageSender
  type: ChatMessageType
  content: string
  /** 富媒体附加 */
  meta?: Record<string, unknown>
  read: boolean
}

/** 快捷回复 */
export interface QuickReply extends BaseEntity {
  merchantId: ID
  label: string
  content: string
  sort: number
}

/** 发送消息 DTO */
export interface SendMessageDto {
  sessionId: ID
  type: ChatMessageType
  content: string
  meta?: Record<string, unknown>
}
