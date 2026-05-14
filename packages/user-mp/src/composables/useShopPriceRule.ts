/**
 * 用户端读取「店铺价格显示规则」
 *
 * 共用 localStorage key `jj_shop_price_visibility_v1`（admin-pc 写入 / merchant-app 写入）。
 * 同 origin H5 部署下三端 localStorage 共享，所以 user-mp 立刻能看到商家改的规则。
 *
 * 暴露：
 *   - rule: 当前店铺规则
 *   - viewerTier: 当前查看者身份（guest / customer / agency / member）
 *   - displayPolicy: 综合判断 → { showPrice, priceKind, allowEnter, lockReason }
 */
import { computed, ref } from 'vue'
import { useUserStore } from '../store/user'
import { http } from '../utils/request'

const STORAGE_KEY = 'jj_shop_price_visibility_v1'

export type CustomerTier = 'guest' | 'customer' | 'agency' | 'member'

export interface ShopPriceRule {
  guestAllow: boolean
  customerPrice: 'retail' | 'hidden'
  agencyPrice: 'wholesale' | 'retail'
  memberPrice: 'member' | 'retail'
}

const DEFAULT: ShopPriceRule = {
  guestAllow: false,
  customerPrice: 'retail',
  agencyPrice: 'wholesale',
  memberPrice: 'member',
}

function readRule(): ShopPriceRule {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return { ...DEFAULT, ...JSON.parse(raw) }
    }
  } catch {
    /* noop */
  }
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (raw) {
      return { ...DEFAULT, ...(typeof raw === 'string' ? JSON.parse(raw) : raw) }
    }
  } catch {
    /* noop */
  }
  return { ...DEFAULT }
}

// Module-level singleton：保持响应式
const rule = ref<ShopPriceRule>(readRule())

/**
 * 当前用户在每个店铺的分级身份缓存(由 fetchShopPriceRuleByMerchant 写入)。
 * 同一用户在不同店可能有不同 tier,所以按 merchantId 索引;由后端 myTierInShop 真实下发,
 * 不再用「User.role==='member'」这种不存在的字段瞎猜。
 */
const myTierByMerchant = ref<Record<string, CustomerTier>>({})
const currentMerchantId = ref<string>('')

export function reloadShopPriceRule() {
  rule.value = readRule()
}

/**
 * 通过 merchantId 主动拉取店铺规则 + 当前用户在该店的身份。
 *   - rule:   GET /u/shops/:merchantId/price-rule (公开)
 *   - myTier: GET /u/shops/:merchantId/my-tier   (需登录;未登录跳过)
 */
export async function fetchShopPriceRuleByMerchant(merchantId: string): Promise<ShopPriceRule | null> {
  if (!merchantId) return null
  currentMerchantId.value = merchantId

  try {
    const data = await http.get<ShopPriceRule>(`/api/v1/u/shops/${merchantId}/price-rule`, undefined, { silent: true })
    if (data) {
      rule.value = { ...DEFAULT, ...data }
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(rule.value))
        }
      } catch {}
    }
  } catch {
    // 接口不可达：保持本地缓存
  }

  // 已登录用户顺带拉自己的分级身份;未登录或接口失败都不影响店铺规则展示
  try {
    const userStore = useUserStore()
    if (userStore.isLogin) {
      const tier = await http.get<{ myTier: CustomerTier; priceAuthorized: boolean }>(
        `/api/v1/u/shops/${merchantId}/my-tier`,
        undefined,
        { silent: true },
      )
      if (tier?.myTier) {
        myTierByMerchant.value = { ...myTierByMerchant.value, [merchantId]: tier.myTier }
      }
    }
  } catch {
    /* 未登录或接口缺失:viewerTier 走本地兜底 */
  }

  return rule.value
}

/** 用 storage 事件监听跨 tab 修改（H5 端） */
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      try {
        rule.value = e.newValue ? { ...DEFAULT, ...JSON.parse(e.newValue) } : { ...DEFAULT }
      } catch {
        /* noop */
      }
    }
  })
}

export type PriceKind = 'retail' | 'wholesale' | 'member' | 'hidden'

export interface DisplayPolicy {
  /** 是否允许进入（仅 guest 受限） */
  allowEnter: boolean
  /** 是否显示价格 */
  showPrice: boolean
  /** 展示哪种价格 */
  priceKind: PriceKind
  /** 锁住时的原因文案（用于 UI 提示） */
  lockReason: string
  /** 是否允许加入购物车 / 立即购买（隐藏价格通常 = 询价，不能直接买） */
  allowBuy: boolean
}

export function useShopPriceRule() {
  const userStore = useUserStore()

  /**
   * 当前查看者身份(按 merchantId 维度,因为同一用户在不同店可能不同分级):
   *  - guest      未登录
   *  - 已 fetch 过 my-tier 的店铺 → 用后端真实下发的 tier
   *  - 否则按 user.role 兜底:factory/store/merchant → agency,其余 → customer
   *    (老的 user.role==='member' / u.isMember 判断已下线,改由后端 myTierInShop 真实裁决)
   */
  const viewerTier = computed<CustomerTier>(() => {
    if (!userStore.isLogin) return 'guest'
    const mid = currentMerchantId.value
    const remoteTier = mid ? myTierByMerchant.value[mid] : undefined
    if (remoteTier) return remoteTier
    const u = userStore.user as any
    if (!u) return 'customer'
    const role: string = u.role || ''
    if (role === 'factory' || role === 'store' || role === 'merchant') return 'agency'
    return 'customer'
  })

  const displayPolicy = computed<DisplayPolicy>(() => {
    const r = rule.value
    const tier = viewerTier.value

    if (tier === 'guest') {
      if (!r.guestAllow) {
        return {
          allowEnter: false,
          showPrice: false,
          priceKind: 'hidden',
          lockReason: '该店铺仅对登录用户开放，请先登录',
          allowBuy: false,
        }
      }
      // 允许进入但不一定显示价格——访客模式按"普通客户"规则降级
      return {
        allowEnter: true,
        showPrice: r.customerPrice === 'retail',
        priceKind: r.customerPrice === 'retail' ? 'retail' : 'hidden',
        lockReason: '登录后查看更优价格',
        allowBuy: false,
      }
    }

    if (tier === 'customer') {
      return {
        allowEnter: true,
        showPrice: r.customerPrice === 'retail',
        priceKind: r.customerPrice === 'retail' ? 'retail' : 'hidden',
        lockReason: '商家未开放价格 · 请联系客服询价',
        allowBuy: r.customerPrice === 'retail',
      }
    }

    if (tier === 'agency') {
      return {
        allowEnter: true,
        showPrice: true,
        priceKind: r.agencyPrice,
        lockReason: '',
        allowBuy: true,
      }
    }

    // member
    return {
      allowEnter: true,
      showPrice: true,
      priceKind: r.memberPrice,
      lockReason: '',
      allowBuy: true,
    }
  })

  return {
    rule,
    viewerTier,
    displayPolicy,
    reload: reloadShopPriceRule,
  }
}

/** 给一个商品 + 规则 → 算实际显示价 */
export function pickPriceByKind(
  product: {
    priceRetailMin?: number
    priceRetailMax?: number
    priceWholesaleMin?: number
    priceWholesaleMax?: number
    priceMemberMin?: number
    priceMemberMax?: number
  },
  kind: PriceKind
): number {
  switch (kind) {
    case 'wholesale':
      return product.priceWholesaleMin ?? product.priceRetailMin ?? 0
    case 'member':
      return product.priceMemberMin ?? product.priceRetailMin ?? 0
    case 'retail':
      return product.priceRetailMin ?? 0
    default:
      return 0
  }
}

export function labelOfPriceKind(kind: PriceKind): string {
  return (
    {
      retail: '零售价',
      wholesale: '批发价',
      member: '会员价',
      hidden: '询价',
    } as const
  )[kind]
}
