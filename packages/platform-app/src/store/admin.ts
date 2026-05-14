/**
 * 平台管理员 store
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, UserSession } from '@jiujiu/shared/types'

const STORAGE_KEY = 'jiujiu_admin'
const TOKEN_KEY = 'jiujiu_admin_token'
const REFRESH_KEY = 'jiujiu_admin_refresh_token'
const LOGIN_AT_KEY = 'jiujiu_admin_login_at'

export const useAdminStore = defineStore('admin', () => {
  const admin = ref<User | null>(null)
  const accessToken = ref<string>('')
  const refreshToken = ref<string>('')
  /** 本次登录时间戳（毫秒）, 0 表示未登录 / 历史会话未记录 */
  const loginAt = ref<number>(0)

  function hydrate() {
    try {
      const t = uni.getStorageSync(TOKEN_KEY)
      const rt = uni.getStorageSync(REFRESH_KEY)
      const u = uni.getStorageSync(STORAGE_KEY)
      const lt = uni.getStorageSync(LOGIN_AT_KEY)
      if (t) accessToken.value = t
      if (rt) refreshToken.value = rt
      if (u) admin.value = typeof u === 'string' ? JSON.parse(u) : u
      const ltNum = Number(lt)
      if (Number.isFinite(ltNum) && ltNum > 0) loginAt.value = ltNum
    } catch {
      // ignore
    }
  }

  function setSession(session: UserSession) {
    admin.value = session.user
    accessToken.value = session.accessToken
    refreshToken.value = session.refreshToken
    loginAt.value = Date.now()
    try {
      uni.setStorageSync(TOKEN_KEY, session.accessToken)
      uni.setStorageSync(REFRESH_KEY, session.refreshToken)
      uni.setStorageSync(STORAGE_KEY, JSON.stringify(session.user))
      uni.setStorageSync(LOGIN_AT_KEY, String(loginAt.value))
    } catch {
      // ignore
    }
  }

  function logout() {
    admin.value = null
    accessToken.value = ''
    refreshToken.value = ''
    loginAt.value = 0
    try {
      uni.removeStorageSync(TOKEN_KEY)
      uni.removeStorageSync(REFRESH_KEY)
      uni.removeStorageSync(STORAGE_KEY)
      uni.removeStorageSync(LOGIN_AT_KEY)
    } catch {
      // ignore
    }
  }

  const isLogin = computed(() => !!accessToken.value)
  const nickname = computed(() => admin.value?.nickname ?? '平台管理员')
  const avatar = computed(() => admin.value?.avatar ?? '')

  return {
    admin,
    accessToken,
    refreshToken,
    loginAt,
    isLogin,
    nickname,
    avatar,
    hydrate,
    setSession,
    logout,
  }
})
