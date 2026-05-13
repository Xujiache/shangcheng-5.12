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
      if (!user) { client.emit('error', { message: '用户不存在' }); return }

      client.data.role = data.role
      if (data.role === 'merchant') {
        const m = await this.prisma.merchant.findUnique({ where: { userId: user.id } })
        if (!m) { client.emit('error', { message: '当前账号未关联商户' }); return }
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
    if (!client.data.role) { client.emit('error', { message: '未鉴权' }); return }
    const session = await this.findOwnSession(client, data.sessionId)
    if (!session) { client.emit('error', { message: '无此会话访问权限' }); return }
    client.join(`session:${data.sessionId}`)
    client.emit('joined', { sessionId: data.sessionId })
  }

  @SubscribeMessage('leave')
  onLeave(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    client.leave(`session:${data.sessionId}`)
    client.emit('left', { sessionId: data.sessionId })
  }

  /** 3. 收发消息 */
  @SubscribeMessage('message')
  async onMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { sessionId: string; kind?: string; content: string },
  ): Promise<void> {
    if (!client.data.role) { client.emit('error', { message: '未鉴权' }); return }
    if (!data.content || !data.content.trim()) return
    const session = await this.findOwnSession(client, data.sessionId)
    if (!session) { client.emit('error', { message: '无此会话访问权限' }); return }

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
  onTyping(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { sessionId: string; on: boolean },
  ) {
    if (!client.data.role) return
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
}
