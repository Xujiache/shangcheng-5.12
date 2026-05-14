/**
 * 商家端通用通知流（订单 / 退款 / 系统消息）
 *
 * 复用 useChatSocket 的同一条 WebSocket，避免双连接。
 *
 * 用法：
 *   const notify = useMerchantNotifyStream(userStore.accessToken)
 *   await notify.ensureConnected()
 *   notify.onNewOrder((order) => { 列表插入 + 震动 + 声音 })
 *   notify.onRefund((refund) => { ... })
 *
 *   // 卸载时
 *   notify.offNewOrder(handler)
 *
 * 后端约定（待 Backend Agent 实现，见 packages/server/src/modules/chat/chat.gateway.ts）：
 *   - 用户下单成功后：gateway.server.to('merchant:'+merchantId).emit('order:new', orderVo)
 *   - 用户申请退款后：gateway.server.to('merchant:'+merchantId).emit('refund:new', refundVo)
 *   - chat.gateway 鉴权阶段：role === 'merchant' 时把 socket join 到 'merchant:'+merchantId 房间
 *
 * 当前 backend 若未发对应事件，前端依然安全（监听器无事件即触发）；后续后端就绪后无需前端改动。
 */
import { useChatSocket, type ChatSocket } from './useChatSocket'

export interface MerchantNewOrderPayload {
  id: string
  no?: string
  amount?: number
  customer?: string
  /** 后端 OrderVo 透传字段 */
  [k: string]: any
}

export interface MerchantRefundPayload {
  id: string
  orderId?: string
  amount?: number
  [k: string]: any
}

type Handler<T> = (payload: T) => void

/**
 * 业务事件 dispatcher —— 用 Set 避免重复注册，且 add/delete O(1)
 *
 * 模块级 hub 配合 useChatSocket 的单例化：
 *  - 每个 page mount 调用 useMerchantNotifyStream，触发 bindOnce 给 socket 装一次 dispatcher
 *  - page unmount 时调 offNewOrder 取消订阅，但 dispatcher 留着不动（下个 page 还能用）
 */
const orderHandlers = new Set<Handler<MerchantNewOrderPayload>>()
const refundHandlers = new Set<Handler<MerchantRefundPayload>>()
const orderUpdateHandlers = new Set<Handler<any>>()

let boundSock: ChatSocket | null = null

function bindOnce(sock: ChatSocket) {
  if (boundSock === sock) return
  boundSock = sock
  sock.on('order:new', (data: MerchantNewOrderPayload) => {
    orderHandlers.forEach((h) => { try { h(data) } catch (e) { console.warn('[notify] order:new handler error:', e) } })
  })
  sock.on('order:update', (data: any) => {
    orderUpdateHandlers.forEach((h) => { try { h(data) } catch {} })
  })
  sock.on('refund:new', (data: MerchantRefundPayload) => {
    refundHandlers.forEach((h) => { try { h(data) } catch {} })
  })
}

export function useMerchantNotifyStream(token: string) {
  const sock = useChatSocket(token, 'merchant')
  bindOnce(sock)

  return {
    /** 确保 WS 已建立（不论之前是否已 connect 都安全调） */
    async ensureConnected() {
      await sock.connect()
    },
    onNewOrder(h: Handler<MerchantNewOrderPayload>) { orderHandlers.add(h) },
    offNewOrder(h: Handler<MerchantNewOrderPayload>) { orderHandlers.delete(h) },

    onOrderUpdate(h: Handler<any>) { orderUpdateHandlers.add(h) },
    offOrderUpdate(h: Handler<any>) { orderUpdateHandlers.delete(h) },

    onRefund(h: Handler<MerchantRefundPayload>) { refundHandlers.add(h) },
    offRefund(h: Handler<MerchantRefundPayload>) { refundHandlers.delete(h) },

    /** 暴露底层 socket 给需要做自定义事件的页面使用 */
    socket: sock,
  }
}
