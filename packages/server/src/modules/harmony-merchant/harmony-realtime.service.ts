import { randomUUID } from 'node:crypto'
import { HttpAdapterHost } from '@nestjs/core'
import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy, Optional } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { IncomingMessage } from 'http'
import { Duplex } from 'stream'
import { WebSocket, WebSocketServer, RawData } from 'ws'
import { PrismaService } from '../../prisma/prisma.service'
import { ContentSecurityService } from '../content-security/content-security.service'

interface HarmonyEnvelope {
  v: 1
  event: string
  requestId?: string
  ts: number
  data?: Record<string, unknown>
}

interface HarmonyClientState {
  userId: string
  merchantId: string
  sessions: Set<string>
  requestIds: Set<string>
  authenticatedAt: number
}

type LegacyChatBridge = (
  event: 'message' | 'typing' | 'read',
  sessionId: string,
  payload: Record<string, unknown>,
) => void

@Injectable()
export class HarmonyRealtimeService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(HarmonyRealtimeService.name)
  private readonly server = new WebSocketServer({ noServer: true, maxPayload: 128 * 1024 })
  private readonly clients = new Map<WebSocket, HarmonyClientState>()
  private heartbeatTimer?: NodeJS.Timeout
  private legacyChatBridge?: LegacyChatBridge

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    @Optional() private readonly contentSecurity?: ContentSecurityService,
  ) {}

  onApplicationBootstrap() {
    const httpServer = this.adapterHost.httpAdapter.getHttpServer()
    httpServer.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
      const path = new URL(request.url || '/', 'http://localhost').pathname
      if (path !== '/ws/harmony/merchant') return
      this.server.handleUpgrade(request, socket, head, (webSocket) => {
        this.server.emit('connection', webSocket, request)
      })
    })
    this.server.on('connection', (socket) => this.accept(socket))
    this.heartbeatTimer = setInterval(() => this.sweep(), 30_000)
    this.heartbeatTimer.unref()
    this.logger.log('pure JSON WebSocket listening on /ws/harmony/merchant')
  }

  onModuleDestroy() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    for (const socket of this.clients.keys()) socket.close(1001, 'server shutdown')
    this.server.close()
  }

  registerLegacyChatBridge(bridge: LegacyChatBridge) {
    this.legacyChatBridge = bridge
  }

  emitMerchant(merchantId: string, event: string, data: Record<string, unknown>) {
    if (!merchantId) return
    const eventId = randomUUID()
    for (const [socket, state] of this.clients) {
      if (state.merchantId === merchantId) this.send(socket, event, data, eventId)
    }
  }

  emitChatMessage(
    sessionId: string,
    merchantId: string,
    message: Record<string, unknown>,
  ) {
    this.emitMerchant(merchantId, 'chat.message', { sessionId, message })
  }

  private accept(socket: WebSocket) {
    const tracked = socket as WebSocket & { harmonyAlive?: boolean }
    tracked.harmonyAlive = true
    const authDeadline = setTimeout(() => {
      if (!this.clients.has(socket)) socket.close(4401, 'authentication timeout')
    }, 10_000)
    socket.on('pong', () => {
      tracked.harmonyAlive = true
    })
    socket.on('message', (raw) => void this.handle(socket, raw))
    socket.on('close', () => {
      clearTimeout(authDeadline)
      this.clients.delete(socket)
    })
    socket.on('error', (error) => this.logger.warn(`Harmony WS error: ${error.message}`))
    this.send(socket, 'connection.ready', { authTimeoutMs: 10_000 })
  }

  private async handle(socket: WebSocket, raw: RawData) {
    let envelope: HarmonyEnvelope
    try {
      const parsed = JSON.parse(raw.toString()) as Partial<HarmonyEnvelope>
      if (parsed.v !== 1 || typeof parsed.event !== 'string' || !parsed.event) throw new Error()
      envelope = parsed as HarmonyEnvelope
    } catch {
      this.send(socket, 'error', { code: 'BAD_ENVELOPE', message: '消息信封格式不正确' })
      return
    }

    const state = this.clients.get(socket)
    if (envelope.event === 'auth' || envelope.event === 'token.update') {
      await this.authenticate(socket, String(envelope.data?.token || ''), envelope.requestId)
      return
    }
    if (!state) {
      this.send(socket, 'error', { code: 'UNAUTHORIZED', message: '请先发送 auth 首帧' }, envelope.requestId)
      return
    }
    if (envelope.requestId) {
      if (state.requestIds.has(envelope.requestId)) {
        this.send(socket, 'ack', { duplicate: true }, envelope.requestId)
        return
      }
      state.requestIds.add(envelope.requestId)
      if (state.requestIds.size > 200) state.requestIds.delete(state.requestIds.values().next().value as string)
    }

    try {
      switch (envelope.event) {
        case 'heartbeat':
          this.send(socket, 'heartbeat.ack', {}, envelope.requestId)
          return
        case 'ack':
          return
        case 'chat.join':
          await this.joinSession(socket, state, String(envelope.data?.sessionId || ''), envelope.requestId)
          return
        case 'chat.leave': {
          const sessionId = String(envelope.data?.sessionId || '')
          state.sessions.delete(sessionId)
          this.send(socket, 'chat.left', { sessionId }, envelope.requestId)
          return
        }
        case 'chat.typing':
          await this.typing(socket, state, envelope)
          return
        case 'chat.read':
          await this.read(socket, state, envelope)
          return
        case 'chat.send':
          await this.sendChat(socket, state, envelope)
          return
        default:
          this.send(socket, 'error', { code: 'UNKNOWN_EVENT', message: '不支持的事件' }, envelope.requestId)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '实时操作失败'
      this.send(socket, 'error', { code: 'EVENT_FAILED', message }, envelope.requestId)
    }
  }

  private async authenticate(socket: WebSocket, token: string, requestId?: string) {
    try {
      const payload = await this.jwt.verifyAsync<Record<string, unknown>>(token)
      if (payload._r || !payload.sub) throw new Error('无效访问令牌')
      const user = await this.prisma.user.findUnique({
        where: { id: String(payload.sub) },
        select: { id: true, role: true, status: true, merchantId: true },
      })
      if (!user || user.status !== 'active' || !user.merchantId) throw new Error('商家身份已失效')
      const claimed = String(payload.merchantId || '')
      const role = String(payload.role || user.role).toLowerCase()
      if (!['merchant', 'factory', 'store'].includes(role) && claimed !== user.merchantId) {
        throw new Error('当前令牌不是商家令牌')
      }
      if (claimed && claimed !== user.merchantId) throw new Error('商家身份已变更，请重新登录')
      const merchant = await this.prisma.merchant.findUnique({ where: { id: user.merchantId } })
      if (!merchant || merchant.status === 'disabled') throw new Error('商户已停用')
      const previous = this.clients.get(socket)
      this.clients.set(socket, {
        userId: user.id,
        merchantId: user.merchantId,
        sessions: previous?.sessions || new Set<string>(),
        requestIds: previous?.requestIds || new Set<string>(),
        authenticatedAt: Date.now(),
      })
      this.send(
        socket,
        'auth.ok',
        { userId: user.id, merchantId: user.merchantId, heartbeatMs: 30_000 },
        requestId,
      )
    } catch (error) {
      this.send(
        socket,
        'auth.failed',
        { message: error instanceof Error ? error.message : '令牌无效或已过期' },
        requestId,
      )
      socket.close(4401, 'authentication failed')
    }
  }

  private async ownSession(merchantId: string, sessionId: string) {
    if (!sessionId) return null
    return this.prisma.chatSession.findFirst({ where: { id: sessionId, merchantId } })
  }

  private async joinSession(
    socket: WebSocket,
    state: HarmonyClientState,
    sessionId: string,
    requestId?: string,
  ) {
    if (!(await this.ownSession(state.merchantId, sessionId))) throw new Error('无此会话访问权限')
    state.sessions.add(sessionId)
    this.send(socket, 'chat.joined', { sessionId }, requestId)
  }

  private async typing(socket: WebSocket, state: HarmonyClientState, envelope: HarmonyEnvelope) {
    const sessionId = String(envelope.data?.sessionId || '')
    if (!(await this.ownSession(state.merchantId, sessionId))) throw new Error('无此会话访问权限')
    const payload = { sessionId, fromRole: 'merchant', on: !!envelope.data?.on }
    this.broadcastSession(sessionId, 'chat.typing', payload, socket)
    this.legacyChatBridge?.('typing', sessionId, payload)
    this.send(socket, 'ack', {}, envelope.requestId)
  }

  private async read(socket: WebSocket, state: HarmonyClientState, envelope: HarmonyEnvelope) {
    const sessionId = String(envelope.data?.sessionId || '')
    if (!(await this.ownSession(state.merchantId, sessionId))) throw new Error('无此会话访问权限')
    await this.prisma.$transaction([
      this.prisma.chatMessage.updateMany({
        where: { sessionId, sender: 'user', read: false },
        data: { read: true },
      }),
      this.prisma.chatSession.update({ where: { id: sessionId }, data: { unreadCount: 0 } }),
    ])
    const payload = { sessionId, byRole: 'merchant' }
    this.broadcastSession(sessionId, 'chat.read', payload, socket)
    this.legacyChatBridge?.('read', sessionId, payload)
    this.send(socket, 'ack', {}, envelope.requestId)
  }

  private async sendChat(socket: WebSocket, state: HarmonyClientState, envelope: HarmonyEnvelope) {
    const sessionId = String(envelope.data?.sessionId || '')
    const session = await this.ownSession(state.merchantId, sessionId)
    if (!session) throw new Error('无此会话访问权限')
    const type = String(envelope.data?.type || 'text').toLowerCase()
    const content = String(envelope.data?.content || '').trim()
    if (!['text', 'quick', 'image'].includes(type)) throw new Error('不支持的消息类型')
    if (!content || content.length > 1_000) throw new Error('消息不能为空且不能超过 1000 个字符')
    if (type === 'text' || type === 'quick') {
      if (!this.contentSecurity && process.env.NODE_ENV === 'production') {
        throw new Error('内容安全服务暂不可用')
      }
      await this.contentSecurity?.assertTextSafe(content, { scope: 'mall', scene: 2 })
    }
    const message = await this.prisma.chatMessage.create({
      data: { sessionId, sender: 'merchant', type, content, read: false },
    })
    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { lastMessageAt: message.createdAt },
    })
    const payload = { sessionId, message: message as unknown as Record<string, unknown> }
    this.emitMerchant(state.merchantId, 'chat.message', payload)
    this.legacyChatBridge?.('message', sessionId, payload)
    this.send(socket, 'ack', { messageId: message.id }, envelope.requestId)
  }

  private broadcastSession(
    sessionId: string,
    event: string,
    data: Record<string, unknown>,
    except?: WebSocket,
  ) {
    for (const [socket, state] of this.clients) {
      if (socket !== except && state.sessions.has(sessionId)) this.send(socket, event, data)
    }
  }

  private send(
    socket: WebSocket,
    event: string,
    data: Record<string, unknown>,
    requestId?: string,
  ) {
    if (socket.readyState !== WebSocket.OPEN) return
    const envelope: HarmonyEnvelope = { v: 1, event, requestId, ts: Date.now(), data }
    socket.send(JSON.stringify(envelope))
  }

  private sweep() {
    for (const socket of this.server.clients) {
      const tracked = socket as WebSocket & { harmonyAlive?: boolean }
      if (tracked.harmonyAlive === false) {
        socket.terminate()
        continue
      }
      tracked.harmonyAlive = false
      socket.ping()
    }
  }
}
