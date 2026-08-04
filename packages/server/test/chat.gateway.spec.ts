import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { ChatGateway } from '../src/modules/chat/chat.gateway'

// ----------------------------------------------------------------------------
// ChatGateway — Socket.IO 在线客服网关
//
// 实现位置：packages/server/src/modules/chat/chat.gateway.ts
// 构造：constructor(jwt, prisma)
//
// 直接实例化 gateway，用 plain-object fake socket + jest.fn() 验证行为契约：
//   - auth：role 严格从 JWT payload 推导，禁止信任客户端 role
//   - join/message/typing/read：均校验 sessionId 归属，防越权
//   - 'message' 广播 payload 固定 { sessionId, message }，三端依赖此结构
// ----------------------------------------------------------------------------

// 每个 case 各自的房间级 emit spy
let roomEmit: jest.Mock
let serverEmit: jest.Mock

const makeClient = () =>
  ({
    id: 's1',
    data: {},
    emit: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    to: jest.fn(() => ({ emit: roomEmit })),
  }) as any

const makeGateway = () => {
  const jwt = { verifyAsync: jest.fn() }
  const prisma = {
    user: { findUnique: jest.fn() },
    merchant: { findUnique: jest.fn() },
    chatSession: { findFirst: jest.fn(), update: jest.fn() },
    chatMessage: { create: jest.fn(), updateMany: jest.fn() },
  }
  const gateway = new ChatGateway(jwt as any, prisma as any)
  gateway.server = { to: jest.fn(() => ({ emit: serverEmit })) } as any
  return { gateway, jwt, prisma }
}

beforeEach(() => {
  roomEmit = jest.fn()
  serverEmit = jest.fn()
})

describe('ChatGateway.onAuth — 鉴权与通道推导', () => {
  it('token 无效（verifyAsync reject）→ emit("error")，且不设置 data.role', async () => {
    const { gateway, jwt } = makeGateway()
    jwt.verifyAsync.mockRejectedValue(new Error('bad token') as never)
    const client = makeClient()

    await gateway.onAuth(client, { token: 'x' })

    expect(client.emit).toHaveBeenCalledWith('error', { message: 'token 无效或过期' })
    expect(client.data.role).toBeUndefined()
    expect(client.join).not.toHaveBeenCalled()
  })

  it('普通用户（payload.role=customer）→ join 一次 "user:<id>"，emit("authed", {role:"user"})', async () => {
    const { gateway, jwt, prisma } = makeGateway()
    jwt.verifyAsync.mockResolvedValue({ sub: 'u1', role: 'customer' } as never)
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'customer' } as never)
    const client = makeClient()

    await gateway.onAuth(client, { token: 't' })

    expect(client.join).toHaveBeenCalledTimes(1)
    expect(client.join).toHaveBeenCalledWith('user:u1')
    expect(client.data.role).toBe('user')
    expect(client.data.userId).toBe('u1')
    expect(client.emit).toHaveBeenCalledWith('authed', {
      role: 'user',
      userId: 'u1',
      merchantId: undefined,
    })
    expect(prisma.merchant.findUnique).not.toHaveBeenCalled()
  })

  it('商家（payload.role=factory 且关联到 m1）→ 各 join 一次 user 与 merchant 房间，data.merchantId="m1"', async () => {
    const { gateway, jwt, prisma } = makeGateway()
    jwt.verifyAsync.mockResolvedValue({ sub: 'u2', role: 'factory' } as never)
    prisma.user.findUnique.mockResolvedValue({ id: 'u2', role: 'factory' } as never)
    prisma.merchant.findUnique.mockResolvedValue({ id: 'm1', userId: 'u2' } as never)
    const client = makeClient()

    await gateway.onAuth(client, { token: 't' })

    expect(client.join).toHaveBeenCalledTimes(2)
    expect(client.join).toHaveBeenCalledWith('user:u2')
    expect(client.join).toHaveBeenCalledWith('merchant:m1')
    expect(client.data.role).toBe('merchant')
    expect(client.data.merchantId).toBe('m1')
    expect(client.emit).toHaveBeenCalledWith('authed', {
      role: 'merchant',
      userId: 'u2',
      merchantId: 'm1',
    })
  })

  it('商家 role 但 User 未关联商户 → emit("error")，不进 merchant 房间', async () => {
    const { gateway, jwt, prisma } = makeGateway()
    jwt.verifyAsync.mockResolvedValue({ sub: 'u3', role: 'merchant' } as never)
    prisma.user.findUnique.mockResolvedValue({ id: 'u3', role: 'merchant' } as never)
    prisma.merchant.findUnique.mockResolvedValue(null as never)
    const client = makeClient()

    await gateway.onAuth(client, { token: 't' })

    expect(client.emit).toHaveBeenCalledWith('error', { message: '当前账号未关联商户' })
    expect(client.join).not.toHaveBeenCalled()
    expect(client.data.role).toBeUndefined()
  })

  it('防伪造：customer payload 即便 DB user.role=customer 也绝不进 merchant 房间（仅一次 join）', async () => {
    const { gateway, jwt, prisma } = makeGateway()
    jwt.verifyAsync.mockResolvedValue({ sub: 'u4', role: 'customer' } as never)
    prisma.user.findUnique.mockResolvedValue({ id: 'u4', role: 'customer' } as never)
    const client = makeClient()

    await gateway.onAuth(client, { token: 't' })

    expect(client.join).toHaveBeenCalledTimes(1)
    expect(client.join).toHaveBeenCalledWith('user:u4')
    expect(client.data.merchantId).toBeUndefined()
    expect(prisma.merchant.findUnique).not.toHaveBeenCalled()
  })

  it('防伪造：客户端附带 {token, role:"merchant"} 多余字段也不会切到 merchant 通道（只信 payload.role）', async () => {
    const { gateway, jwt, prisma } = makeGateway()
    jwt.verifyAsync.mockResolvedValue({ sub: 'u5', role: 'customer' } as never)
    prisma.user.findUnique.mockResolvedValue({ id: 'u5', role: 'customer' } as never)
    const client = makeClient()

    // 客户端试图通过 body 上的 role 字段提权
    await gateway.onAuth(client, { token: 't', role: 'merchant' } as any)

    expect(client.data.role).toBe('user')
    expect(client.data.merchantId).toBeUndefined()
    expect(client.join).toHaveBeenCalledTimes(1)
    expect(client.join).toHaveBeenCalledWith('user:u5')
    expect(prisma.merchant.findUnique).not.toHaveBeenCalled()
  })
})

describe('ChatGateway.onJoin — 会话房间归属校验', () => {
  it('未鉴权（data.role 为空）→ emit("error", 未鉴权)，不查会话', async () => {
    const { gateway, prisma } = makeGateway()
    const client = makeClient()

    await gateway.onJoin(client, { sessionId: 's-1' })

    expect(client.emit).toHaveBeenCalledWith('error', { message: '未鉴权' })
    expect(prisma.chatSession.findFirst).not.toHaveBeenCalled()
    expect(client.join).not.toHaveBeenCalled()
  })

  it('他人会话（findFirst 返回 null）→ emit("error", 无访问权限)，不 join', async () => {
    const { gateway, prisma } = makeGateway()
    prisma.chatSession.findFirst.mockResolvedValue(null as never)
    const client = makeClient()
    client.data.role = 'user'
    client.data.userId = 'u1'

    await gateway.onJoin(client, { sessionId: 's-other' })

    expect(client.emit).toHaveBeenCalledWith('error', { message: '无此会话访问权限' })
    expect(client.join).not.toHaveBeenCalled()
  })

  it('自己的会话 → join("session:<id>") + emit("joined")', async () => {
    const { gateway, prisma } = makeGateway()
    prisma.chatSession.findFirst.mockResolvedValue({ id: 's-mine', userId: 'u1' } as never)
    const client = makeClient()
    client.data.role = 'user'
    client.data.userId = 'u1'

    await gateway.onJoin(client, { sessionId: 's-mine' })

    expect(client.join).toHaveBeenCalledWith('session:s-mine')
    expect(client.emit).toHaveBeenCalledWith('joined', { sessionId: 's-mine' })
  })
})

describe('ChatGateway.onMessage — 持久化与广播契约', () => {
  it('持久化消息 + 更新会话(lastMessageAt/unreadCount+1) + 向 session 房间广播 { sessionId, message }', async () => {
    const { gateway, prisma } = makeGateway()
    prisma.chatSession.findFirst.mockResolvedValue({ id: 's-1', userId: 'u1' } as never)
    const created = { id: 'msg-1', sessionId: 's-1', sender: 'user', content: 'hi' }
    prisma.chatMessage.create.mockResolvedValue(created as never)
    const client = makeClient()
    client.data.role = 'user'
    client.data.userId = 'u1'

    await gateway.onMessage(client, { sessionId: 's-1', content: 'hi' })

    // 落库
    expect(prisma.chatMessage.create).toHaveBeenCalledTimes(1)
    const createArg = prisma.chatMessage.create.mock.calls[0][0] as any
    expect(createArg.data.sessionId).toBe('s-1')
    expect(createArg.data.sender).toBe('user')
    expect(createArg.data.content).toBe('hi')

    // 更新会话：lastMessageAt + unreadCount 自增
    expect(prisma.chatSession.update).toHaveBeenCalledTimes(1)
    const updateArg = prisma.chatSession.update.mock.calls[0][0] as any
    expect(updateArg.where).toEqual({ id: 's-1' })
    expect(updateArg.data.unreadCount).toEqual({ increment: 1 })
    expect(updateArg.data.lastMessageAt).toBeInstanceOf(Date)

    // 广播：到正确房间 + payload 形状严格为 { sessionId, message }
    expect(gateway.server.to).toHaveBeenCalledWith('session:s-1')
    expect(serverEmit).toHaveBeenCalledTimes(1)
    const [evt, payload] = serverEmit.mock.calls[0] as any[]
    expect(evt).toBe('message')
    expect(Object.keys(payload).sort()).toEqual(['message', 'sessionId'])
    expect(payload).toEqual({ sessionId: 's-1', message: created })
  })

  it('空白/纯空格内容 → 不落库、不广播', async () => {
    const { gateway, prisma } = makeGateway()
    const client = makeClient()
    client.data.role = 'user'
    client.data.userId = 'u1'

    await gateway.onMessage(client, { sessionId: 's-1', content: '   ' })

    expect(prisma.chatMessage.create).not.toHaveBeenCalled()
    expect(prisma.chatSession.update).not.toHaveBeenCalled()
    expect(serverEmit).not.toHaveBeenCalled()
  })
})

describe('ChatGateway.onTyping — 伪造 sessionId 防御', () => {
  it('伪造 sessionId（findFirst 返回 null）→ 静默丢弃，不向房间转发', async () => {
    const { gateway, prisma } = makeGateway()
    prisma.chatSession.findFirst.mockResolvedValue(null as never)
    const client = makeClient()
    client.data.role = 'user'
    client.data.userId = 'u1'

    await gateway.onTyping(client, { sessionId: 's-forged', on: true })

    expect(client.to).not.toHaveBeenCalled()
    expect(roomEmit).not.toHaveBeenCalled()
  })
})

describe('ChatGateway.onRead — 已读回执', () => {
  it('商家已读 → 仅把对方(user)未读标为已读，并清零会话 unreadCount', async () => {
    const { gateway, prisma } = makeGateway()
    prisma.chatSession.findFirst.mockResolvedValue({ id: 's-1', merchantId: 'm1' } as never)
    const client = makeClient()
    client.data.role = 'merchant'
    client.data.merchantId = 'm1'

    await gateway.onRead(client, { sessionId: 's-1' })

    expect(prisma.chatMessage.updateMany).toHaveBeenCalledTimes(1)
    const upd = prisma.chatMessage.updateMany.mock.calls[0][0] as any
    expect(upd.where.sessionId).toBe('s-1')
    expect(upd.where.sender).toBe('user')
    expect(upd.where.read).toBe(false)
    expect(upd.data).toEqual({ read: true })

    expect(prisma.chatSession.update).toHaveBeenCalledTimes(1)
    const sess = prisma.chatSession.update.mock.calls[0][0] as any
    expect(sess.where).toEqual({ id: 's-1' })
    expect(sess.data).toEqual({ unreadCount: 0 })
  })
})

describe('ChatGateway.emitOrderNew / emitChatMessage — 推送边界', () => {
  it('emitOrderNew：merchantId 为空 → server.to 不调用', () => {
    const { gateway } = makeGateway()
    gateway.emitOrderNew('', { orderId: 'o1' })
    expect(gateway.server.to).not.toHaveBeenCalled()
  })

  it('emitChatMessage：sessionId 为空 → server.to 不调用', () => {
    const { gateway } = makeGateway()
    gateway.emitChatMessage('', { id: 'msg' })
    expect(gateway.server.to).not.toHaveBeenCalled()
  })

  it('server 未初始化（gateway.server=undefined）→ 安全返回不抛错', () => {
    const { gateway } = makeGateway()
    gateway.server = undefined as any
    expect(() => gateway.emitOrderNew('m1', { orderId: 'o1' })).not.toThrow()
    expect(() => gateway.emitChatMessage('s1', { id: 'msg' })).not.toThrow()
  })
})
