/**
 * 店铺级「价格显示规则」 —— 改一次全店生效
 *
 * 数据源：后端 `/api/v1/m/shop/price-rule`（GET 读 / PUT 写），持久化在 SystemConfig 表
 * 本地缓存：localStorage('jj_shop_price_visibility_v1') 用于离线/秒级渲染
 *
 * 流程：
 *   - 首次 mount → 调 fetchFromServer，结果 merge 到本地缓存 + state
 *   - 用户改字段 → state 立即变更（UI 即时反馈）+ debounce 300ms 调 PUT
 *   - 失败 → 本地 toast，但 state 不回滚（用户继续操作时下次 PUT 还会带过去）
 */
import { ref, watch } from 'vue'
import request from '@/utils/http'

const STORAGE_KEY = 'jj_shop_price_visibility_v1'

export type CustomerPriceChoice = 'retail' | 'wholesale' | 'member' | 'hidden'

export interface ShopPriceVisibility {
  guestAllow: boolean
  customerPrice: 'retail' | 'hidden'
  agencyPrice: 'wholesale' | 'retail'
  memberPrice: 'member' | 'retail'
}

const DEFAULT: ShopPriceVisibility = {
  guestAllow: false,
  customerPrice: 'retail',
  agencyPrice: 'wholesale',
  memberPrice: 'member'
}

function readLocalCache(): ShopPriceVisibility {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) }
  } catch {
    /* noop */
  }
  return { ...DEFAULT }
}

function writeLocalCache(v: ShopPriceVisibility) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
  } catch {
    /* noop */
  }
}

const state = ref<ShopPriceVisibility>(readLocalCache())
let initialized = false

async function fetchFromServer() {
  try {
    const data = await request.get<ShopPriceVisibility>({
      url: '/api/v1/m/shop/price-rule'
    })
    if (data) {
      state.value = { ...DEFAULT, ...data }
      writeLocalCache(state.value)
    }
  } catch {
    // 没登录或非商家：保持本地缓存即可
  }
}

let pushTimer: ReturnType<typeof setTimeout> | null = null
function debouncedPush(v: ShopPriceVisibility) {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(async () => {
    try {
      await request.put({
        url: '/api/v1/m/shop/price-rule',
        data: v
      })
    } catch {
      // 后端失败也没关系，本地缓存保住
    }
  }, 300)
}

// 单例：state 变化时 → 本地缓存 + debounced 推服务器
watch(
  state,
  (v) => {
    writeLocalCache(v)
    if (initialized) debouncedPush(v)
  },
  { deep: true }
)

export function useShopPriceVisibility() {
  // 首次调用时拉一次远端
  if (!initialized) {
    initialized = true
    fetchFromServer()
  }
  function reset() {
    state.value = { ...DEFAULT }
  }
  async function refresh() {
    await fetchFromServer()
  }
  return { state, reset, refresh }
}

export function getShopPriceVisibilitySnapshot(): ShopPriceVisibility {
  return { ...state.value }
}
