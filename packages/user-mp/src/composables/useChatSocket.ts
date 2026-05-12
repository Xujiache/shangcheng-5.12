/**
 * Chat WebSocket 客户端（H5 + 微信小程序）
 *
 * 用法：
 *   const sock = useChatSocket(token, 'user')
 *   sock.connect()
 *   sock.join(sessionId)
 *   sock.onMessage((msg) => ...)
 *   sock.send(sessionId, '你好')
 *   sock.disconnect()  // 离开页面时
 *
 * 协议见 packages/server/src/modules/chat/chat.gateway.ts
 *
 * 平台差异：
 *   - H5: 直接用 socket.io-client，允许 websocket + polling
 *   - mp-weixin: main.ts 注入 globalThis.WebSocket polyfill 后，socket.io-client 走 websocket-only
 */
import { ref } from 'vue'
// 改成静态 import，避免 app-plus 端 rollup 不支持 code-splitting
// （bundle 会变大约 50KB，但能让 app 端也支持聊天）
import { io as ioCtor } from 'socket.io-client'

type ChatMessageHandler = (msg: any) => void
type TypingHandler = (data: { sessionId: string; fromRole: string; on: boolean }) => void

interface ChatSocket {
  connected: ReturnType<typeof ref<boolean>>
  connect: () => void
  disconnect: () => void
  join: (sessionId: string) => void
  leave: (sessionId: string) => void
  send: (sessionId: string, content: string, kind?: string) => void
  typing: (sessionId: string, on: boolean) => void
  markRead: (sessionId: string) => void
  onMessage: (h: ChatMessageHandler) => void
  offMessage: (h: ChatMessageHandler) => void
  onTyping: (h: TypingHandler) => void
}

export function useChatSocket(token: string, role: 'user' | 'merchant' = 'user'): ChatSocket {
  const connected = ref(false)
  let io: any = null
  const msgHandlers: ChatMessageHandler[] = []
  const typingHandlers: TypingHandler[] = []

  async function connect() {
    if (io) return

    // 小程序没有 window；H5 优先用 window.location.origin，兼顾同源/反向代理
    let origin = ''
    // #ifdef H5
    if (typeof window !== 'undefined' && window.location) origin = window.location.origin
    // #endif
    if (!origin) origin = ((import.meta as any).env?.VITE_API_BASE_URL ?? '') as string

    // 小程序 polling 走 XHR，没有 XMLHttpRequest，强制 websocket-only
    let transports: string[] = ['websocket', 'polling']
    // #ifdef MP-WEIXIN
    transports = ['websocket']
    // #endif

    // 服务端 @WebSocketGateway({ path: '/ws/chat' })：path 通过 options 传，
    // 而不是拼到 URL（拼进去会被当成 namespace）
    io = ioCtor(origin, {
      path: '/ws/chat',
      transports,
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1500,
    })
    io.on('connect', () => {
      connected.value = true
      io.emit('auth', { token, role })
    })
    io.on('disconnect', () => {
      connected.value = false
    })
    io.on('message', (data: any) => {
      msgHandlers.forEach((h) => h(data))
    })
    io.on('typing', (data: any) => {
      typingHandlers.forEach((h) => h(data))
    })
    io.on('error', (data: any) => {
      console.warn('[chat] socket error:', data)
    })
  }

  function disconnect() {
    if (!io) return
    try { io.disconnect() } catch {}
    io = null
    connected.value = false
  }

  function join(sessionId: string) {
    io?.emit('join', { sessionId })
  }
  function leave(sessionId: string) {
    io?.emit('leave', { sessionId })
  }
  function send(sessionId: string, content: string, kind = 'text') {
    if (!content?.trim()) return
    io?.emit('message', { sessionId, kind, content })
  }
  function typing(sessionId: string, on: boolean) {
    io?.emit('typing', { sessionId, on })
  }
  function markRead(sessionId: string) {
    io?.emit('read', { sessionId })
  }

  return {
    connected,
    connect,
    disconnect,
    join,
    leave,
    send,
    typing,
    markRead,
    onMessage: (h) => msgHandlers.push(h),
    offMessage: (h) => {
      const i = msgHandlers.indexOf(h); if (i >= 0) msgHandlers.splice(i, 1)
    },
    onTyping: (h) => typingHandlers.push(h),
  }
}
