/**
 * 微信小程序 WebSocket polyfill
 *
 * socket.io-client / engine.io-client 通过 `globalThis.WebSocket` 创建连接，
 * 小程序里没有该全局，只有 `uni.connectSocket`。本文件提供一个最小可用的
 * WebSocket 实现，桥接到 uni.connectSocket。
 *
 * 仅在 mp-weixin 平台 import 此模块（main.ts 用 // #ifdef MP-WEIXIN 包裹）。
 */

type Listener = (ev: any) => void

const STATE = { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 }

class MpWebSocket {
  static readonly CONNECTING = STATE.CONNECTING
  static readonly OPEN = STATE.OPEN
  static readonly CLOSING = STATE.CLOSING
  static readonly CLOSED = STATE.CLOSED

  readonly CONNECTING = STATE.CONNECTING
  readonly OPEN = STATE.OPEN
  readonly CLOSING = STATE.CLOSING
  readonly CLOSED = STATE.CLOSED

  url: string
  readyState: number = STATE.CONNECTING
  binaryType: 'arraybuffer' | 'blob' = 'arraybuffer'

  onopen: Listener | null = null
  onmessage: Listener | null = null
  onerror: Listener | null = null
  onclose: Listener | null = null

  private task: UniApp.SocketTask | null = null
  private listeners: Record<string, Listener[]> = {}

  constructor(url: string, protocols?: string | string[]) {
    this.url = url
    const protoList = Array.isArray(protocols) ? protocols : protocols ? [protocols] : undefined
    try {
      this.task = uni.connectSocket({
        url,
        protocols: protoList,
        complete: () => {},
      })
    } catch (e) {
      this.readyState = STATE.CLOSED
      queueMicrotask(() => this.dispatch('error', { message: String(e) }))
      return
    }

    this.task.onOpen(() => {
      this.readyState = STATE.OPEN
      this.dispatch('open', {})
    })
    this.task.onMessage((res) => {
      this.dispatch('message', { data: res.data })
    })
    this.task.onError((res) => {
      this.dispatch('error', { message: (res as any)?.errMsg ?? 'socket error' })
    })
    this.task.onClose((res) => {
      this.readyState = STATE.CLOSED
      this.dispatch('close', {
        code: (res as any)?.code ?? 1006,
        reason: (res as any)?.reason ?? '',
        wasClean: ((res as any)?.code ?? 1006) === 1000,
      })
    })
  }

  send(data: string | ArrayBuffer) {
    if (!this.task || this.readyState !== STATE.OPEN) return
    this.task.send({ data: data as any })
  }

  close(code?: number, reason?: string) {
    if (!this.task || this.readyState === STATE.CLOSED) return
    this.readyState = STATE.CLOSING
    this.task.close({ code, reason })
  }

  addEventListener(type: string, fn: Listener) {
    ;(this.listeners[type] ||= []).push(fn)
  }

  removeEventListener(type: string, fn: Listener) {
    const arr = this.listeners[type]
    if (!arr) return
    const i = arr.indexOf(fn)
    if (i >= 0) arr.splice(i, 1)
  }

  private dispatch(type: 'open' | 'message' | 'error' | 'close', payload: any) {
    const ev = { type, target: this, ...payload }
    const cb = (this as any)['on' + type] as Listener | null
    if (cb) try { cb(ev) } catch {}
    const arr = this.listeners[type]
    if (arr) for (const fn of arr.slice()) try { fn(ev) } catch {}
  }
}

export function installMpWebSocketPolyfill() {
  const g: any = globalThis
  if (!g.WebSocket) g.WebSocket = MpWebSocket
}
