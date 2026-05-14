import { describe, it } from '@jest/globals'

// ----------------------------------------------------------------------------
// ChatGateway — Socket.IO 在线客服网关
//
// 实现位置：packages/server/src/modules/chat/chat.gateway.ts
//
// 关键点：
//   - 握手后必须先发 'auth' 事件携带 JWT，才能 join / message
//   - 'join' 时校验 sessionId 归属当前用户，防越权进入他人房间
//   - 'message' 广播 payload 必须固定为 { sessionId, message: ChatMessage }，
//     前端三端依赖该结构（user-mp / merchant-app / admin-pc 都在监听）
//
// 占位骨架 — 等 socket.io-client mock 就绪后转正。
// ----------------------------------------------------------------------------
describe.skip('ChatGateway — auth handshake', () => {
  it.todo('rejects unauthenticated client when calling join/message before auth')

  it.todo('accepts client after valid JWT auth, attaches userId + role to socket')

  it.todo('disconnects on invalid / expired JWT')
})

describe.skip('ChatGateway.join', () => {
  it.todo('lets owner join room "session:<sessionId>"')

  it.todo('rejects join when sessionId does not belong to current user (FORBIDDEN)')

  it.todo('idempotent: joining same session twice does not duplicate room membership')
})

describe.skip('ChatGateway.message — broadcast contract', () => {
  it.todo('persists message via ChatService, then broadcasts to room "session:<sessionId>"')

  it.todo(
    'broadcast payload shape is exactly { sessionId, message: ChatMessage } — DO NOT rename keys',
  )

  it.todo('broadcast includes the sender themselves (so UI uses server timestamp consistently)')

  it.todo('rejects message when sender is not a participant of the session')
})
