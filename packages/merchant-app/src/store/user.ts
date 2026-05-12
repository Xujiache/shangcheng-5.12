/**
 * 用户 store（含商户身份）
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, UserSession } from '@jiujiu/shared/types'

const STORAGE_KEY = 'jiujiu_user'
const TOKEN_KEY = 'jiujiu_token'
const REFRESH_KEY = 'jiujiu_refresh_token'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<string>('')
  const refreshToken = ref<string>('')

  /** 初始化：从本地恢复 */
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

  /** 登录成功 */
  function setSession(session: UserSession) {
    user.value = session.user
    accessToken.value = session.accessToken
    refreshToken.value = session.refreshToken
    try {
      uni.setStorageSync(TOKEN_KEY, session.accessToken)
      uni.setStorageSync(REFRESH_KEY, session.refreshToken)
      uni.setStorageSync(STORAGE_KEY, JSON.stringify(session.user))
    } catch {
      // ignore
    }
  }

  /** 登出 */
  function logout() {
    user.value = null
    accessToken.value = ''
    refreshToken.value = ''
    try {
      uni.removeStorageSync(TOKEN_KEY)
      uni.removeStorageSync(REFRESH_KEY)
      uni.removeStorageSync(STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  const isLogin = computed(() => !!accessToken.value)
  const isFactory = computed(() => user.value?.role === 'factory')
  const isStore = computed(() => user.value?.role === 'store')
  const isMerchant = computed(() => isFactory.value || isStore.value)
  const merchantId = computed(() => user.value?.merchantId ?? '')

  return {
    user,
    accessToken,
    refreshToken,
    isLogin,
    isFactory,
    isStore,
    isMerchant,
    merchantId,
    hydrate,
    setSession,
    logout,
  }
})
