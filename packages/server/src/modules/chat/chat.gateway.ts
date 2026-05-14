/**
 * 在线客服 WebSocket Gateway
 *
 * 路径：ws://<host>/ws/chat（被 nginx 反代到 :3400 同路径）
 *
 * 协议：
 *   client → server：
 *     - { type: 'auth', token: '<jwt>', role: 'user' | 'merchant' }
 *     - { type: 'join', sessionId: 'xxx' }
 *     - { type: 'leave', sessionId: 'xxx' }
 *     - { type: 'message', sessionId: 'xxx', kind: 'text', content: '...' }
 *     - { type: 'typing', sessionId: 'xxx', on: boolean }
 *     - { type: 'read', sessionId: 'xxx' }
 *
 *   server → client：
 *     - { type: 'ready' }
 *     - { type: 'message', sessionId, message: ChatMessage }
 *     - { type: 'typing', sessionId, fromRole, on }
 *     - { type: 'read', sessionId, byRole }
 *     - { type: 'error', message }
 *
 * 房间命名：session:<sessionId>
 *
 * 鉴权：握手后必须先发 auth，JWT 校验通过才能 join/message。
 * 用户只能 join 自己的会话；商家只能 join 自己 merchantId 名下的会话。
 */
import { Logger } from '@nestjs/common'
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../../prisma/prisma.service'

interface AuthedSocket extends Socket {
  data: {
    userId?: string
    merchantId?: string
    role?: 'user' | 'merchant'
  }
}

@WebSocketGateway({
  path: '/ws/chat',
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name)

  @WebSocketServer()
  server!: Server

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthedSocket) {
    this.logger.log(`socket connected: ${client.id}`)
    client.emit('ready', { ts: Date.now() })
  }

  handleDisconnect(client: AuthedSocket) {
    this.logger.log(`socket disconnected: ${client.id}`)
  }

  /** 1. 鉴权：握手后必须先发 auth 才能 join/message */
  @SubscribeMessage('auth')
  async onAuth(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { token: string; role: 'user' | 'merchant' },
  ): Promise<void> {
    try {
      const payload: any = await this.jwt.verifyAsync(data.token)
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
      if (!user) {
        client.emit('error', { message: '用户不存在' })
        return
      }

      client.data.role = data.role
      if (data.role === 'merchant') {
        const m = await this.prisma.merchant.findUnique({ where: { userId: user.id } })
        if (!m) {
          client.emit('error', { message: '当前账号未关联商户' })
          return
        }
        client.data.merchantId = m.id
        client.data.userId = user.id
        // 商家也进自己的 user 房间，资料更新同样同步
        client.join(`user:${user.id}`)
        // 商家额外进 merchant 房间（如以后要给商家广播订单等）
        client.join(`merchant:${m.id}`)
      } else {
        client.data.userId = user.id
        // 用户进自己 user 房间，资料更新会推到所有 socket
        client.join(`user:${user.id}`)
      }
      client.emit('authed', {
        role: client.data.role,
        userId: client.data.userId,
        merchantId: client.data.merchantId,
      })
    } catch {
      client.emit('error', { message: 'token 无效或过期' })
    }
  }

  /** 2. 加入会话房间（限自己的会话） */
  @SubscribeMessage('join')
  async onJoin(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { sessionId: string },
  ): Promise<void> {
    if (!client.data.role) {
      client.emit('error', { message: '未鉴权' })
      return
    }
    const session = await this.findOwnSession(client, data.sessionId)
    if (!session) {
      client.emit('error', { message: '无此会话访问权限' })
      return
    }
    client.join(`session:${data.sessionId}`)
    client.emit('joined', { sessionId: data.sessionId })
  }

  @SubscribeMessage('leave')
  onLeave(@ConnectedSocket() client: AuthedSocket, @MessageBody() data: { sessionId: string }) {
    client.leave(`session:${data.sessionId}`)
    client.emit('left', { sessionId: data.sessionId })
  }

  /** 3. 收发消息 */
  @SubscribeMessage('message')
  async onMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { sessionId: string; kind?: string; content: string },
  ): Promise<void> {
    if (!client.data.role) {
      client.emit('error', { message: '未鉴权' })
      return
    }
    if (!data.content || !data.content.trim()) return
    const session = await this.findOwnSession(client, data.sessionId)
    if (!session) {
      client.emit('error', { message: '无此会话访问权限' })
      return
    }

    const sender = client.data.role === 'merchant' ? 'merchant' : 'user'
    const msg = await this.prisma.chatMessage.create({
      data: {
        sessionId: data.sessionId,
        sender,
        type: data.kind || 'text',
        content: data.content,
        read: false,
      },
    })
    await this.prisma.chatSession.update({
      where: { id: data.sessionId },
      data: { lastMessageAt: new Date(), unreadCount: { increment: 1 } },
    })

    // 广播到房间，包括发送方（让 UI 用 server 时间戳）
    this.server.to(`session:${data.sessionId}`).emit('message', {
      sessionId: data.sessionId,
      message: msg,
    })
  }

  /** 4. 正在输入提示（不持久化） */
  @SubscribeMessage('typing')
  async onTyping(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { sessionId: string; on: boolean },
  ) {
    if (!client.data.role) return
    if (!data?.sessionId) return
    // 与 onMessage / onRead 一致校验会话归属：不属于当前 socket 的会话静默丢弃，
    // 避免攻击者伪造任意 sessionId 在他人会话里持续触发 "对方正在输入..." 骚扰
    const session = await this.findOwnSession(client, data.sessionId)
    if (!session) return
    client.to(`session:${data.sessionId}`).emit('typing', {
      sessionId: data.sessionId,
      fromRole: client.data.role,
      on: !!data.on,
    })
  }

  /** 5. 已读回执 */
  @SubscribeMessage('read')
  async onRead(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    if (!client.data.role) return
    const session = await this.findOwnSession(client, data.sessionId)
    if (!session) return
    const otherSender = client.data.role === 'merchant' ? 'user' : 'merchant'
    await this.prisma.chatMessage.updateMany({
      where: { sessionId: data.sessionId, sender: otherSender, read: false },
      data: { read: true },
    })
    // 清零未读
    await this.prisma.chatSession.update({
      where: { id: data.sessionId },
      data: { unreadCount: 0 },
    })
    client.to(`session:${data.sessionId}`).emit('read', {
      sessionId: data.sessionId,
      byRole: client.data.role,
    })
  }

  /** 校验当前 socket 是否有该会话访问权限 */
  private async findOwnSession(client: AuthedSocket, sessionId: string) {
    if (!sessionId) return null
    const where: any = { id: sessionId }
    if (client.data.role === 'merchant') {
      if (!client.data.merchantId) return null
      where.merchantId = client.data.merchantId
    } else {
      if (!client.data.userId) return null
      where.userId = client.data.userId
    }
    return this.prisma.chatSession.findFirst({ where })
  }

  /**
   * 给某用户的所有在线设备推送资料更新（PATCH /u/profile 后调用）
   * 客户端事件名：'user:update' → payload 是完整序列化后的 User 对象
   */
  broadcastUserUpdate(userId: string, user: any) {
    if (!this.server) return
    this.server.to(`user:${userId}`).emit('user:update', { user })
  }

  /**
   * 商家端实时通知 —— 新订单
   *
   * 触发点：user-mp.service.createOrder() 订单建单成功（status=pending_payment）。
   * 接收方：商家所有已 auth 的 socket（房间 merchant:<merchantId>）。
   * 用法：merchant-app 的 useMerchantNotifyStream 订阅 'order:new' 后即可弹通知/刷新待发货数。
   *
   * 失败保护：自身 try/catch；外部 service 也再裹一层避免推送异常阻塞主业务。
   */
  emitOrderNew(merchantId: string, payload: any) {
    if (!this.server || !merchantId) return
    try {
      this.server.to(`merchant:${merchantId}`).emit('order:new', payload)
    } catch (e: any) {
      this.logger.warn(`emitOrderNew failed merchantId=${merchantId}: ${e?.message || e}`)
    }
  }

  /**
   * 商家端实时通知 —— 订单状态变更
   *
   * 触发点示例：
   *   - 微信支付回调后订单转 pending_shipment
   *   - 商家发货 → shipped
   *   - 用户确认收货 → completed
   *   - 用户取消 → cancelled
   *
   * payload 建议字段：{ orderId, no?, status, updatedAt }
   */
  emitOrderUpdate(merchantId: string, payload: any) {
    if (!this.server || !merchantId) return
    try {
      this.server.to(`merchant:${merchantId}`).emit('order:update', payload)
    } catch (e: any) {
      this.logger.warn(`emitOrderUpdate failed merchantId=${merchantId}: ${e?.message || e}`)
    }
  }

  /**
   * 商家端实时通知 —— 新售后单
   *
   * 触发点：用户发起退款/售后申请时（当前仓库无对外创建退款的 controller；
   * 预留接口给未来 user-mp 退款入口或 admin 代发起退款接入）。
   */
  emitRefundNew(merchantId: string, payload: any) {
    if (!this.server || !merchantId) return
    try {
      this.server.to(`merchant:${merchantId}`).emit('refund:new', payload)
    } catch (e: any) {
      this.logger.warn(`emitRefundNew failed merchantId=${merchantId}: ${e?.message || e}`)
    }
  }

  /**
   * HTTP REST 入口（user-mp 的 chatSend / merchant 的 chatSend）发完消息后，
   * 通过本方法把同一条 ChatMessage 同步推送到房间，让对方在 WS 长连中即时收到。
   *
   * 此前 HTTP 链路只写 DB，对方需要等下次 chatMessages 拉接口才能看到消息，
   * 体验上等于"客服没收到消息" —— 这是 P1 体验断点。
   *
   * 注意：
   *   - WS 链路（onMessage 内部 emit）已带广播，仅 HTTP 链路缺这一步
   *   - 失败 fire-and-forget，不阻塞 HTTP 主流程；DB 已落库的消息丢推送也不影响后续轮询
   *   - 仅推送给已 join(`session:<sessionId>`) 的 socket；用户/商家未在线就跳过
   */
  emitChatMessage(sessionId: string, message: any) {
    if (!this.server || !sessionId) return
    try {
      this.server.to(`session:${sessionId}`).emit('message', { sessionId, message })
    } catch (e: any) {
      this.logger.warn(`emitChatMessage failed sessionId=${sessionId}: ${e?.message || e}`)
    }
  }
}
