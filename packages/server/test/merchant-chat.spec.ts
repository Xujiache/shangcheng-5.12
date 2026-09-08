import { describe, expect, it, jest } from '@jest/globals'

jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'CHATTEST',
}))

import { MerchantService } from '../src/modules/merchant/merchant.service'

function makeService(overrides: Record<string, any> = {}) {
  const prisma: any = {
    chatSession: {
      findFirst: jest.fn<any>(),
      findMany: jest.fn<any>(),
      update: jest.fn<any>().mockResolvedValue({}),
      ...overrides.chatSession,
    },
    chatMessage: {
      findFirst: jest.fn<any>(),
      findMany: jest.fn<any>(),
      create: jest.fn<any>(),
      updateMany: jest.fn<any>().mockResolvedValue({ count: 0 }),
      ...overrides.chatMessage,
    },
    $transaction: jest.fn<any>().mockImplementation(async (jobs: Promise<any>[]) => Promise.all(jobs)),
  }
  const chat = {
    isUserOnline: jest.fn<any>().mockReturnValue(false),
    emitChatMessage: jest.fn<any>(),
    emitReadReceipt: jest.fn<any>(),
  }
  const contentSecurity = { assertTextSafe: jest.fn<any>().mockResolvedValue(undefined) }
  const service = new MerchantService(prisma, {} as any, chat as any, contentSecurity as any)
  return { service, prisma, chat, contentSecurity }
}

describe('MerchantService 商家客服', () => {
  it('消息分页校验游标归属并把数据库倒序结果恢复为正序', async () => {
    const older = { id: 'm1', sessionId: 's1', createdAt: new Date('2026-08-01T00:00:00Z') }
    const newer = { id: 'm2', sessionId: 's1', createdAt: new Date('2026-08-02T00:00:00Z') }
    const { service, prisma } = makeService({
      chatSession: { findFirst: jest.fn<any>().mockResolvedValue({ id: 's1' }) },
      chatMessage: {
        findFirst: jest.fn<any>().mockResolvedValue({ id: 'cursor1' }),
        findMany: jest.fn<any>().mockResolvedValue([newer, older]),
      },
    })

    const rows = await service.chatMessages('merchant1', 's1', { cursor: 'cursor1', pageSize: 30 })

    expect(rows).toEqual([older, newer])
    expect(prisma.chatMessage.findFirst).toHaveBeenCalledWith({
      where: { id: 'cursor1', sessionId: 's1' },
      select: { id: true },
    })
    expect(prisma.chatMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 30, cursor: { id: 'cursor1' }, skip: 1 }),
    )
  })

  it('快捷回复按 quick 类型落库、执行内容安全并向身份房间实时广播', async () => {
    const session = { id: 's1', merchantId: 'merchant1', userId: 'user1' }
    const created = {
      id: 'msg1',
      sessionId: 's1',
      sender: 'merchant',
      type: 'quick',
      content: '已收到',
      createdAt: new Date(),
    }
    const { service, prisma, chat, contentSecurity } = makeService({
      chatSession: { findFirst: jest.fn<any>().mockResolvedValue(session) },
      chatMessage: { create: jest.fn<any>().mockResolvedValue(created) },
    })

    const result = await service.chatSend('merchant1', 's1', 'quick', '  已收到  ')

    expect(result).toBe(created)
    expect(contentSecurity.assertTextSafe).toHaveBeenCalledWith('已收到', {
      scope: 'mall',
      scene: 2,
    })
    expect(prisma.chatMessage.create).toHaveBeenCalledWith({
      data: {
        sessionId: 's1',
        sender: 'merchant',
        type: 'quick',
        content: '已收到',
        read: false,
      },
    })
    expect(chat.emitChatMessage).toHaveBeenCalledWith('s1', created, session)
  })

  it('拒绝客户端伪造 system 消息且不落库', async () => {
    const { service, prisma } = makeService({
      chatSession: { findFirst: jest.fn<any>().mockResolvedValue({ id: 's1' }) },
    })

    await expect(service.chatSend('merchant1', 's1', 'system', '系统通知')).rejects.toMatchObject({
      response: expect.objectContaining({ message: '不支持的消息类型' }),
    })
    expect(prisma.chatMessage.create).not.toHaveBeenCalled()
  })

  it('HTTP 已读同时清除用户未读消息和商家会话未读数并广播回执', async () => {
    const { service, prisma, chat } = makeService({
      chatSession: { findFirst: jest.fn<any>().mockResolvedValue({ id: 's1' }) },
    })

    await expect(service.chatRead('merchant1', 's1')).resolves.toEqual({ ok: true })
    expect(prisma.chatMessage.updateMany).toHaveBeenCalledWith({
      where: { sessionId: 's1', sender: 'user', read: false },
      data: { read: true },
    })
    expect(prisma.chatSession.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { unreadCount: 0 },
    })
    expect(chat.emitReadReceipt).toHaveBeenCalledWith('s1', 'merchant')
  })
})
