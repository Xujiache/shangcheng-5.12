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
import { Logger, Optional } from '@nestjs/common'
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
import { ContentSecurityService } from '../content-security/content-security.service'
import { HarmonyRealtimeService } from '../harmony-merchant/harmony-realtime.service'
import { HarmonyPushService } from '../harmony-merchant/harmony-push.service'

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
    @Optional() private readonly contentSecurity?: ContentSecurityService,
    @Optional() private readonly harmonyRealtime?: HarmonyRealtimeService,
    @Optional() private readonly harmonyPush?: HarmonyPushService,
  ) {
    this.harmonyRealtime?.registerLegacyChatBridge((event, sessionId, payload) => {
      if (!this.server) return
      this.server.to(`session:${sessionId}`).emit(event, payload)
    })
  }

  async handleConnection(client: AuthedSocket) {
    this.logger.log(`socket connected: ${client.id}`)
    client.emit('ready', { ts: Date.now() })
  }

  handleDisconnect(client: AuthedSocket) {
    this.logger.log(`socket disconnected: ${client.id}`)
  }

  /**
   * 1. 鉴权：握手后必须先发 auth 才能 join/message
   *
   * 安全 P0：role 完全从 JWT payload 中解析，**不接受**任何客户端传入的 role 字段。
   * 之前接受 `data.role` 让任何已登录用户都能把自己标成 merchant 加 merchant 房间，
   * 接收他商家的订单广播 / 售后单广播，等于把后台数据流推给任意外部用户。
   *
   * payload.role 取自登录时 signTokens 注入的字段（顾客=customer/promoter；
   * 商家=factory/store/merchant；后台=admin/platform/super-admin）。
   * 这里把 factory/store/merchant 视为商家 role，其余视为用户 role；
   * 想接 merchant 通道必须先在 User 表确实绑定到商户（findUnique by userId）。
   */
  @SubscribeMessage('auth')
  async onAuth(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { token: string },
  ): Promise<void> {
    try {
      const payload: any = await this.jwt.verifyAsync(data.token)
      if (payload._r || payload.scope || !payload.sub) throw new Error('invalid access token')
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
      if (!user) {
        client.emit('error', { message: '用户不存在' })
        return
      }
      if (user.status === 'disabled') throw new Error('account disabled')

      // 严格根据 JWT payload.role 推导通道，禁止读取 data.role
      const jwtRole = String(payload?.role || user.role || 'customer').toLowerCase()
      // 双身份账号（例如已绑定商户的 super-admin）在商家专用登录接口签发的 token
      // 中带有 merchantId。只有该 claim 与数据库当前绑定完全一致时才允许进入商家通道，
      // 既支持平台管理员切换商家工作台，也不重新信任客户端可伪造的 role 参数。
      const claimedMerchantId = String(payload?.merchantId || '')
      const boundMerchantId = String(user.merchantId || '')
      const hasVerifiedMerchantClaim =
        !!claimedMerchantId && !!boundMerchantId && claimedMerchantId === boundMerchantId
      const isMerchantRole =
        ['factory', 'store', 'merchant'].includes(jwtRole) || hasVerifiedMerchantClaim

      if (isMerchantRole) {
        const m = await this.prisma.merchant.findUnique({ where: { userId: user.id } })
        if (!m) {
          client.emit('error', { message: '当前账号未关联商户' })
          return
        }
        if (claimedMerchantId && claimedMerchantId !== m.id) {
          client.emit('error', { message: '商户身份已失效，请重新登录' })
          return
        }
        client.data.role = 'merchant'
        client.data.merchantId = m.id
        client.data.userId = user.id
        // 商家也进自己的 user 房间，资料更新同样同步
        client.join(`user:${user.id}`)
        // 商家额外进 merchant 房间（如以后要给商家广播订单等）
        client.join(`merchant:${m.id}`)
      } else {
        client.data.role = 'user'
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
      client.data = {}
      for (const room of client.rooms || []) {
        if (room !== client.id) client.leave(room)
      }
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
    const content = String(data.content || '').trim()
    if (!content) return
    if (content.length > 1_000) {
      client.emit('error', { message: '消息不能超过 1000 个字符' })
      return
    }
    const kind = String(data.kind || 'text').toLowerCase()
    if (!['text', 'image', 'quick', 'product', 'order'].includes(kind)) {
      client.emit('error', { message: '不支持的消息类型' })
      return
    }
    const session = await this.findOwnSession(client, data.sessionId)
    if (!session) {
      client.emit('error', { message: '无此会话访问权限' })
      return
    }

    if (kind === 'text' || kind === 'quick') {
      if (!this.contentSecurity && process.env.NODE_ENV === 'production') {
        client.emit('error', { message: '内容安全服务暂不可用，请稍后重试' })
        return
      }
      try {
        await this.contentSecurity?.assertTextSafe(content, { scope: 'mall', scene: 2 })
      } catch (error: any) {
        client.emit('error', { message: error?.message || '消息未通过内容安全检测' })
        return
      }
    }

    const sender = client.data.role === 'merchant' ? 'merchant' : 'user'
    const msg = await this.prisma.chatMessage.create({
      data: {
        sessionId: data.sessionId,
        sender,
        type: kind,
        content,
        read: false,
      },
    })
    await this.prisma.chatSession.update({
      where: { id: data.sessionId },
      data: {
        lastMessageAt: msg.createdAt || new Date(),
        // ChatSession.unreadCount 是商家侧未读数；商家自己发送绝不能自增。
        ...(sender === 'user' ? { unreadCount: { increment: 1 } } : {}),
      },
    })

    // 广播到房间，包括发送方（让 UI 用 server 时间戳）
    this.emitChatMessage(data.sessionId, msg, session)
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
    // ChatSession.unreadCount 只表示商家侧未读；顾客已读不能清掉商家未读。
    if (client.data.role === 'merchant') {
      await this.prisma.chatSession.update({
        where: { id: data.sessionId },
        data: { unreadCount: 0 },
      })
    }
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
    if (!merchantId) return
    try {
      this.server?.to(`merchant:${merchantId}`).emit('order:new', payload)
      this.harmonyRealtime?.emitMerchant(merchantId, 'order.new', payload)
      void this.harmonyPush?.sendToMerchant(merchantId, {
        topic: 'orders',
        title: '收到新订单',
        body: payload?.no ? `订单 ${payload.no} 已创建，请及时查看` : '收到一笔新订单，请及时查看',
        data: {
          route: 'order-detail',
          id: payload?.id || payload?.orderId || '',
          status: payload?.status || '',
        },
        appMessageId: payload?.id ? `order-new-${payload.id}` : undefined,
      })
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
    if (!merchantId) return
    try {
      this.server?.to(`merchant:${merchantId}`).emit('order:update', payload)
      this.harmonyRealtime?.emitMerchant(merchantId, 'order.update', payload)
      const status = String(payload?.status || '')
      const statusText: Record<string, string> = {
        pending_shipment: '已付款，等待发货',
        shipped: '已发货',
        completed: '已完成',
        cancelled: '已取消',
        after_sale: '进入售后处理',
      }
      if (statusText[status]) {
        const id = payload?.orderId || payload?.id || ''
        void this.harmonyPush?.sendToMerchant(merchantId, {
          topic: 'orders',
          title: '订单状态更新',
          body: payload?.no
            ? `订单 ${payload.no} ${statusText[status]}`
            : `一笔订单${statusText[status]}`,
          data: { route: 'order-detail', id, status },
          appMessageId: id ? `order-${status}-${id}` : undefined,
        })
      }
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
    if (!merchantId) return
    try {
      this.server?.to(`merchant:${merchantId}`).emit('refund:new', payload)
      this.harmonyRealtime?.emitMerchant(merchantId, 'refund.new', payload)
      const id = payload?.refundId || payload?.id || ''
      const status = String(payload?.status || 'pending')
      void this.harmonyPush?.sendToMerchant(merchantId, {
        topic: 'refunds',
        title: status === 'pending' ? '收到新的售后申请' : '售后状态更新',
        body: payload?.no
          ? `售后单 ${payload.no} 有新的处理动态`
          : '有一笔售后申请需要查看',
        data: { route: 'after-sale-detail', id, status },
        appMessageId: id ? `refund-${status}-${id}` : undefined,
      })
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
  /**
   * 同时推送会话详情事件和列表级事件。
   * chat:message 发到 merchant/user 身份房间，列表页无需 join 最多100个 session 房间。
   */
  emitChatMessage(
    sessionId: string,
    message: any,
    session?: { merchantId?: string; userId?: string },
  ) {
    if (!sessionId) return
    try {
      this.server?.to(`session:${sessionId}`).emit('message', { sessionId, message })
      const payload = { sessionId, message }
      if (session?.merchantId) {
        this.server?.to(`merchant:${session.merchantId}`).emit('chat:message', payload)
        this.harmonyRealtime?.emitChatMessage(sessionId, session.merchantId, message)
        if (message?.sender === 'user') {
          const content =
            message?.type === 'image'
              ? '[图片]'
              : String(message?.content || '客户发来一条新消息').slice(0, 80)
          void this.harmonyPush?.sendToMerchant(session.merchantId, {
            topic: 'chat',
            title: '客户发来新消息',
            body: content,
            data: { route: 'chat-detail', id: sessionId },
            appMessageId: message?.id ? `chat-${message.id}` : undefined,
          })
        }
      }
      if (session?.userId) {
        this.server?.to(`user:${session.userId}`).emit('chat:message', payload)
      }
    } catch (e: any) {
      this.logger.warn(`emitChatMessage failed sessionId=${sessionId}: ${e?.message || e}`)
    }
  }

  emitReadReceipt(sessionId: string, byRole: 'user' | 'merchant') {
    if (!this.server || !sessionId) return
    try {
      const payload = { sessionId, byRole }
      this.server.to(`session:${sessionId}`).emit('read', payload)
      // HarmonyOS NEXT uses a separate pure-JSON socket. Resolve the owning merchant
      // asynchronously so customer read receipts also reach native merchant clients.
      void this.prisma.chatSession
        .findUnique({ where: { id: sessionId }, select: { merchantId: true } })
        .then((session) => {
          if (session?.merchantId) this.harmonyRealtime?.emitMerchant(session.merchantId, 'chat.read', payload)
        })
        .catch(() => {})
    } catch (e: any) {
      this.logger.warn(`emitReadReceipt failed sessionId=${sessionId}: ${e?.message || e}`)
    }
  }

  isUserOnline(userId: string): boolean {
    if (!this.server || !userId) return false
    try {
      const rooms: Map<string, Set<string>> | undefined = (this.server as any)?.sockets?.adapter
        ?.rooms
      return !!rooms?.get(`user:${userId}`)?.size
    } catch {
      return false
    }
  }
}
