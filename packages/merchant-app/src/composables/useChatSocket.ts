/**
 * Chat WebSocket 客户端（商家端 · App + H5）
 *
 * 用法：
 *   const sock = useChatSocket(token, 'merchant')
 *   await sock.connect()
 *   sock.join(sessionId)
 *   sock.onMessage((msg) => ...)
 *   sock.send(sessionId, '你好')
 *   sock.disconnect()  // 通常只在登出时调
 *
 * 协议见 packages/server/src/modules/chat/chat.gateway.ts
 *
 * 平台差异：
 *   - H5 / App-plus：直接用 socket.io-client，websocket + polling
 *   - mp-weixin：商家端理论上不出小程序版本，但保留 #ifdef 以防万一
 *     （要在 mp-weixin 上真正跑通，需要类似 user-mp 的 mpWebSocketPolyfill）
 *
 * 单例策略：
 *   - 同一 (token, role) 复用同一个 socket 实例
 *   - 聊天页 + 订单通知页 共享一条连接（节省握手 + 后端在线状态）
 *   - 切换账号（token 变）时自动断旧、建新
 *
 * 与 user-mp/composables/useChatSocket.ts 协议保持一致，唯一差异：
 *   - 默认 role: 'merchant'
 *   - 单例化（便于多 composable 共享）
 *   - 暴露通用 on/off，让 useMerchantNotifyStream 监听 order:new 等业务事件
 */
import { ref } from 'vue'
// 静态 import，避免 app-plus 端 rollup 不支持 code-splitting
// （bundle 会变大约 50KB，但能让 App 端也支持聊天）
import { io as ioCtor } from 'socket.io-client'

type ChatMessageHandler = (msg: any) => void
type TypingHandler = (data: { sessionId: string; fromRole: string; on: boolean }) => void
type AnyEventHandler = (payload: any) => void

export interface ChatSocket {
  connected: ReturnType<typeof ref<boolean>>
  connect: () => Promise<void>
  disconnect: () => void
  join: (sessionId: string) => void
  leave: (sessionId: string) => void
  send: (sessionId: string, content: string, kind?: string) => void
  typing: (sessionId: string, on: boolean) => void
  markRead: (sessionId: string) => void
  onMessage: (h: ChatMessageHandler) => void
  offMessage: (h: ChatMessageHandler) => void
  onTyping: (h: TypingHandler) => void
  /** 通用事件订阅（例：on('order:new', ...) / on('refund:new', ...)） */
  on: (event: string, h: AnyEventHandler) => void
  off: (event: string, h: AnyEventHandler) => void
}

interface InternalSock extends ChatSocket {
  _token: string
  _role: string
}

let _singleton: InternalSock | null = null

function createSocket(token: string, role: 'user' | 'merchant'): InternalSock {
  const connected = ref(false)
  let io: any = null
  const msgHandlers: ChatMessageHandler[] = []
  const typingHandlers: TypingHandler[] = []
  /** 通用事件：event → handler[]，仅在 io 实例化后再 attach 到 socket */
  const extraEvents: Record<string, AnyEventHandler[]> = {}
  /** 已 attach 到 socket 的事件名（避免重复 io.on(event, ...)）*/
  const attached = new Set<string>()

  function attachExtra(event: string) {
    if (!io || attached.has(event)) return
    attached.add(event)
    io.on(event, (payload: any) => {
      ;(extraEvents[event] || []).forEach((fn) => {
        try { fn(payload) } catch (e) { console.warn(`[chat] ${event} handler error:`, e) }
      })
    })
  }

  async function connect() {
    if (io) return

    // App / H5 优先用 window.location.origin；mp-weixin 走 env 兜底
    let origin = ''
    // #ifdef H5
    if (typeof window !== 'undefined' && window.location) origin = window.location.origin
    // #endif
    if (!origin) origin = ((import.meta as any).env?.VITE_API_BASE_URL ?? '') as string
    if (!origin) origin = 'https://ewsn.top'

    // mp-weixin 小程序 polling 走 XHR 不通，强制 websocket-only
    let transports: string[] = ['websocket', 'polling']
    // #ifdef MP-WEIXIN
    transports = ['websocket']
    // #endif

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
      msgHandlers.forEach((h) => { try { h(data) } catch (e) { console.warn('[chat] message handler error:', e) } })
    })
    io.on('typing', (data: any) => {
      typingHandlers.forEach((h) => { try { h(data) } catch {} })
    })
    io.on('error', (data: any) => {
      console.warn('[chat] socket error:', data)
    })

    // connect 之前已 on(event, ...) 注册的业务事件，这里统一 attach 一次
    for (const ev of Object.keys(extraEvents)) attachExtra(ev)
  }

  function disconnect() {
    if (!io) return
    try { io.disconnect() } catch {}
    io = null
    connected.value = false
    attached.clear()
  }

  function join(sessionId: string) { io?.emit('join', { sessionId }) }
  function leave(sessionId: string) { io?.emit('leave', { sessionId }) }
  function send(sessionId: string, content: string, kind = 'text') {
    if (!content?.trim()) return
    io?.emit('message', { sessionId, kind, content })
  }
  function typing(sessionId: string, on: boolean) { io?.emit('typing', { sessionId, on }) }
  function markRead(sessionId: string) { io?.emit('read', { sessionId }) }

  function on(event: string, h: AnyEventHandler) {
    if (!extraEvents[event]) extraEvents[event] = []
    extraEvents[event].push(h)
    attachExtra(event) // 已连接就立即 attach，未连接时 connect() 内会补 attach
  }
  function off(event: string, h: AnyEventHandler) {
    const arr = extraEvents[event]
    if (!arr) return
    const i = arr.indexOf(h)
    if (i >= 0) arr.splice(i, 1)
  }

  const sock: InternalSock = {
    _token: token,
    _role: role,
    connected,
    connect,
    disconnect,
    join,
    leave,
    send,
    typing,
    markRead,
    onMessage: (h) => { msgHandlers.push(h) },
    offMessage: (h) => {
      const i = msgHandlers.indexOf(h); if (i >= 0) msgHandlers.splice(i, 1)
    },
    onTyping: (h) => { typingHandlers.push(h) },
    on,
    off,
  }
  return sock
}

/**
 * 获取（或创建）当前账号的 chat socket。
 *
 * - 同 token + role：返回同一实例（多 composable / 多页面共享）
 * - token 或 role 不同：断旧建新
 * - 传 '' 空 token：返回空壳实例（不会 connect），等业务上拿到 token 后再调
 */
export function useChatSocket(token: string, role: 'user' | 'merchant' = 'merchant'): ChatSocket {
  if (_singleton && _singleton._token === token && _singleton._role === role) {
    return _singleton
  }
  if (_singleton) {
    try { _singleton.disconnect() } catch {}
    _singleton = null
  }
  _singleton = createSocket(token, role)
  return _singleton
}

/** 显式销毁单例（登出时调） */
export function destroyChatSocket() {
  if (!_singleton) return
  try { _singleton.disconnect() } catch {}
  _singleton = null
}
