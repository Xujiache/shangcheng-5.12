/**
 * 用户端在线客服 service
 *
 * HTTP：用于历史消息加载 / 创建会话 / 已读回执
 * WebSocket：用于实时收发
 *
 * 路由：
 *   GET    /api/v1/u/chat/sessions
 *   POST   /api/v1/u/chat/sessions          { merchantId? }
 *   GET    /api/v1/u/chat/sessions/:id/messages
 *   POST   /api/v1/u/chat/sessions/:id/messages   { type?, content }
 *   POST   /api/v1/u/chat/sessions/:id/read
 *   WS     /ws/chat
 */
import { http } from '../utils/request'

export interface ChatSessionSummary {
  id: string
  merchantId: string
  merchantName: string
  lastContent: string
  lastSender: string
  lastAt: string
  unreadCount: number
  status: string
}

export interface ChatMessage {
  id: string
  sessionId: string
  sender: 'user' | 'merchant' | 'system'
  type: string
  content: string
  read: boolean
  createdAt: string
}

export const chatService = {
  sessions(): Promise<ChatSessionSummary[]> {
    return http.get<ChatSessionSummary[]>('/api/v1/u/chat/sessions')
  },
  ensureSession(merchantId?: string): Promise<{ id: string; merchantId: string }> {
    return http.post<{ id: string; merchantId: string }>('/api/v1/u/chat/sessions', { merchantId })
  },
  messages(sessionId: string): Promise<ChatMessage[]> {
    return http.get<ChatMessage[]>(`/api/v1/u/chat/sessions/${sessionId}/messages`)
  },
  send(sessionId: string, content: string, type = 'text'): Promise<ChatMessage> {
    return http.post<ChatMessage>(`/api/v1/u/chat/sessions/${sessionId}/messages`, { type, content })
  },
  markRead(sessionId: string): Promise<{ ok: boolean }> {
    return http.post<{ ok: boolean }>(`/api/v1/u/chat/sessions/${sessionId}/read`, {})
  },
}
