import { webSocket } from '@kit.NetworkKit';
import { util } from '@kit.ArkTS';
import { AppConfig } from '../config/AppConfig';
import { SessionStore } from '../storage/SessionStore';
import { RealtimePolicy } from './RealtimePolicy';
import { RecentEventIds } from '../model/RecentEventIds';

export interface RealtimeEnvelope {
  v: number;
  event: string;
  requestId?: string;
  ts: number;
  data?: Object;
}

export type RealtimeListener = (envelope: RealtimeEnvelope) => void;

interface SessionPayload { sessionId: string; }
interface TypingPayload { sessionId: string; on: boolean; }
interface TokenPayload { token: string; }
interface EmptyRealtimePayload {}

export class HarmonyRealtime {
  private static instance?: HarmonyRealtime;
  private socket?: webSocket.WebSocket;
  private listeners: RealtimeListener[] = [];
  private connected: boolean = false;
  private connecting: boolean = false;
  private stopped: boolean = true;
  private reconnectAttempt: number = 0;
  private heartbeatTimer: number = -1;
  private reconnectTimer: number = -1;
  private joinedSessions: string[] = [];
  private receivedEventIds: RecentEventIds = new RecentEventIds(200);

  static shared(): HarmonyRealtime {
    if (!HarmonyRealtime.instance) HarmonyRealtime.instance = new HarmonyRealtime();
    return HarmonyRealtime.instance;
  }

  start(): void {
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.connected = false;
    this.connecting = false;
    this.clearTimers();
    this.socket?.close({ code: 1000, reason: 'logout' }).catch((): void => {});
    this.socket = undefined;
    this.joinedSessions = [];
    this.receivedEventIds.clear();
    this.reconnectAttempt = 0;
  }

  subscribe(listener: RealtimeListener): () => void {
    this.listeners.push(listener);
    return (): void => {
      this.listeners = this.listeners.filter((item: RealtimeListener): boolean => item !== listener);
    };
  }

  joinChat(sessionId: string): void {
    if (!this.joinedSessions.includes(sessionId)) this.joinedSessions.push(sessionId);
    const payload: SessionPayload = { sessionId };
    this.send('chat.join', payload);
  }

  leaveChat(sessionId: string): void {
    this.joinedSessions = this.joinedSessions.filter((item: string): boolean => item !== sessionId);
    const payload: SessionPayload = { sessionId };
    this.send('chat.leave', payload);
  }

  markChatRead(sessionId: string): void {
    const payload: SessionPayload = { sessionId };
    this.send('chat.read', payload);
  }

  setTyping(sessionId: string, on: boolean): void {
    const payload: TypingPayload = { sessionId, on };
    this.send('chat.typing', payload);
  }

  updateToken(): void {
    if (this.connected) {
      const payload: TokenPayload = { token: SessionStore.shared().accessToken };
      this.send('token.update', payload);
      return;
    }
    // A cold restore can start with only a refresh token.  In that case start()
    // correctly waits for ApiClient to refresh the access token; once refreshed,
    // updateToken must establish the socket instead of silently doing nothing.
    if (!this.stopped) this.connect();
  }

  private connect(): void {
    if (this.stopped || this.connected || this.connecting || !SessionStore.shared().accessToken) return;
    this.connecting = true;
    const socket = webSocket.createWebSocket();
    this.socket = socket;
    socket.on('open', (error: Error): void => {
      if (this.socket !== socket || this.stopped) {
        socket.close({ code: 1000, reason: 'stale connection' }).catch((): void => {});
        return;
      }
      if (error) {
        this.handleDisconnect(socket);
        return;
      }
      this.connecting = false;
      this.connected = true;
      this.reconnectAttempt = 0;
      const payload: TokenPayload = { token: SessionStore.shared().accessToken };
      this.send('auth', payload);
      this.startHeartbeat();
    });
    socket.on('message', (error: Error, data: string | ArrayBuffer): void => {
      if (this.socket !== socket || error || typeof data !== 'string') return;
      try {
        const envelope = JSON.parse(data) as RealtimeEnvelope;
        if (!RealtimePolicy.acceptsEnvelope(envelope.v, envelope.event || '')) return;
        if (!this.receivedEventIds.accept(envelope.requestId || '')) return;
        if (envelope.event === 'auth.ok') {
          this.joinedSessions.forEach((sessionId: string): void => {
            const payload: SessionPayload = { sessionId };
            this.send('chat.join', payload);
          });
        }
        this.listeners.forEach((listener: RealtimeListener): void => listener(envelope));
      } catch (_) {
      }
    });
    socket.on('close', (): void => this.handleDisconnect(socket));
    socket.on('error', (): void => this.handleDisconnect(socket));
    socket.connect(AppConfig.HARMONY_WS_URL).catch((): void => this.handleDisconnect(socket));
  }

  private send(event: string, data: Object): void {
    const socket = this.socket;
    if (!socket || !this.connected) return;
    const envelope: RealtimeEnvelope = {
      v: 1,
      event,
      requestId: util.generateRandomUUID(true),
      ts: Date.now(),
      data
    };
    socket.send(JSON.stringify(envelope)).catch((): void => this.handleDisconnect(socket));
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer >= 0) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval((): void => {
      const payload: EmptyRealtimePayload = {};
      this.send('heartbeat', payload);
    }, 25000);
  }

  private handleDisconnect(source?: webSocket.WebSocket): void {
    if (this.stopped) return;
    // An old socket can finish closing after a replacement has already opened.
    // Never let that stale callback tear down the current healthy connection.
    if (source && this.socket !== source) return;
    this.connected = false;
    this.connecting = false;
    this.socket = undefined;
    if (this.heartbeatTimer >= 0) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = -1;
    if (this.reconnectTimer >= 0) return;
    const delay = RealtimePolicy.reconnectDelay(this.reconnectAttempt++);
    this.reconnectTimer = setTimeout((): void => {
      this.reconnectTimer = -1;
      this.connect();
    }, delay);
  }

  private clearTimers(): void {
    if (this.heartbeatTimer >= 0) clearInterval(this.heartbeatTimer);
    if (this.reconnectTimer >= 0) clearTimeout(this.reconnectTimer);
    this.heartbeatTimer = -1;
    this.reconnectTimer = -1;
  }
}
