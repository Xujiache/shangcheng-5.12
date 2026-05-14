/**
 * 用户 store · 用户端
 *
 * 多端实时同步策略：
 *   1. 每次 onShow 调 refreshFromServer() 拉一次 /u/profile（拉取式同步，秒级）
 *   2. WebSocket /ws/chat 鉴权后服务端把 socket 加入 'user:<userId>' 房间，
 *      PATCH 后服务端广播 'user:update'，前端在 connectProfileSync() 里挂监听 → 立即更新
 *   3. 同步源都汇总到 setUserInfo()，store 内 deep-merge 后持久化到 uni storage
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, UserSession } from '@jiujiu/shared/types'
import { http } from '../utils/request'

const STORAGE_KEY = 'jiujiu_user'
const TOKEN_KEY = 'jiujiu_token'
const REFRESH_KEY = 'jiujiu_refresh_token'

let chatSock: any = null // 单例 WebSocket，避免重复连接

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<string>('')
  const refreshToken = ref<string>('')

  function hydrate() {
    try {
      const t = uni.getStorageSync(TOKEN_KEY)
      const rt = uni.getStorageSync(REFRESH_KEY)
      const u = uni.getStorageSync(STORAGE_KEY)
      if (t) accessToken.value = t
      if (rt) refreshToken.value = rt
      if (u) user.value = typeof u === 'string' ? JSON.parse(u) : u
    } catch {
      // ignore
    }
  }

  function persist() {
    try {
      uni.setStorageSync(TOKEN_KEY, accessToken.value)
      uni.setStorageSync(REFRESH_KEY, refreshToken.value)
      uni.setStorageSync(STORAGE_KEY, JSON.stringify(user.value))
    } catch {
      /* ignore */
    }
  }

  function setSession(session: UserSession) {
    user.value = session.user
    accessToken.value = session.accessToken
    refreshToken.value = session.refreshToken
    persist()
    // 登录成功 → 拉一次服务端购物车覆盖本地（动态 import 避免 user/cart store 循环依赖）
    import('./cart')
      .then(({ useCartStore }) => {
        useCartStore()
          .loadFromServer()
          .catch(() => {
            /* ignore */
          })
      })
      .catch(() => {
        /* ignore */
      })
  }

  /** 合并部分字段更新（来自 PATCH 响应 / WS 推送） */
  function setUserInfo(partial: Partial<User>) {
    if (!user.value) return
    user.value = { ...user.value, ...partial }
    persist()
  }

  function logout() {
    user.value = null
    accessToken.value = ''
    refreshToken.value = ''
    try {
      uni.removeStorageSync(TOKEN_KEY)
      uni.removeStorageSync(REFRESH_KEY)
      uni.removeStorageSync(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    disconnectProfileSync()
  }

  /** 主动从服务器拉一次最新资料（onShow / 进入个人中心时调） */
  async function refreshFromServer(): Promise<void> {
    if (!accessToken.value) return
    try {
      const fresh = await http.get<Partial<User>>('/api/v1/u/profile', undefined, { silent: true })
      if (fresh) setUserInfo(fresh)
    } catch {
      // 401 等 http 拦截器已处理；其它错误静默
    }
  }

  /** PATCH 修改资料 — 成功后 store 即时更新 + 服务端 WS 也会广播给同账号其他设备 */
  async function updateProfile(dto: {
    nickname?: string
    avatar?: string
    gender?: number
    email?: string
  }) {
    const fresh = await http.patch<Partial<User>>(
      '/api/v1/u/profile',
      dto as Record<string, unknown>,
    )
    if (fresh) setUserInfo(fresh)
    return fresh
  }

  /** 绑定手机号（需先调 sms-code 发验证码） */
  async function bindPhone(payload: { phone: string; code: string }) {
    const fresh = await http.post<Partial<User>>(
      '/api/v1/u/bind-phone',
      payload as Record<string, unknown>,
    )
    if (fresh) setUserInfo(fresh)
    return fresh
  }

  /** 绑定微信（传 uni.login 拿到的 code） */
  async function bindWechat(payload: { code: string }) {
    const fresh = await http.post<Partial<User>>(
      '/api/v1/u/bind-wechat',
      payload as Record<string, unknown>,
    )
    if (fresh) setUserInfo(fresh)
    return fresh
  }

  /**
   * 建立 WS 连接订阅 user:update 事件（多端实时同步）
   *
   * 平台差异（与 useChatSocket.ts 保持一致）：
   *   - H5: 优先用 window.location.origin（同源/反代场景），允许 websocket + polling
   *   - mp-weixin: 小程序 polling 走 XHR，没有 XMLHttpRequest，强制 websocket-only；
   *     origin 写死 https://ewsn.top（small program build 时 import.meta.env 不会注入）
   */
  async function connectProfileSync() {
    if (chatSock || !accessToken.value) return
    try {
      const mod = await import('socket.io-client')
      const io = (mod as any).io || (mod as any).default

      // 计算 origin（与 useChatSocket.ts 同套推导）
      let origin = ''
      // #ifdef H5
      if (typeof window !== 'undefined' && window.location) origin = window.location.origin
      // #endif
      if (!origin) origin = ((import.meta as any).env?.VITE_API_BASE_URL ?? '') as string
      if (!origin) origin = 'https://ewsn.top'

      // 平台 transports（与 useChatSocket.ts 同套）
      let transports: string[] = ['websocket', 'polling']
      // #ifdef MP-WEIXIN
      transports = ['websocket']
      // #endif

      chatSock = io(origin, {
        path: '/ws/chat',
        transports,
        reconnection: true,
        reconnectionAttempts: 8,
        reconnectionDelay: 1500,
      })
      chatSock.on('connect', () =>
        chatSock.emit('auth', { token: accessToken.value, role: 'user' }),
      )
      chatSock.on('user:update', (msg: any) => {
        if (msg?.user) setUserInfo(msg.user)
      })
    } catch {
      // socket.io 未安装或不可用：降级为 onShow 拉取
    }
  }

  function disconnectProfileSync() {
    try {
      chatSock?.disconnect?.()
    } catch {}
    chatSock = null
  }

  const isLogin = computed(() => !!accessToken.value)
  const nickname = computed(() => user.value?.nickname ?? '未登录')
  const avatar = computed(() => user.value?.avatar ?? '')

  return {
    user,
    accessToken,
    refreshToken,
    isLogin,
    nickname,
    avatar,
    hydrate,
    setSession,
    setUserInfo,
    logout,
    refreshFromServer,
    updateProfile,
    bindPhone,
    bindWechat,
    connectProfileSync,
    disconnectProfileSync,
  }
})
