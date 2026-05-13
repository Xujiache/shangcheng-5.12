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
 * 从后端拉取最新规则（用户端通过商品 merchantId 查询对应店铺的规则）
 * 路由：GET /api/v1/u/products/:id → 后端 productDetail 内联了商家 priceRule（待后端补全）
 *
 * 当前临时方案：用户端没有直接读规则的接口，仅靠 localStorage 跨端共享。
 * 长期方案：在 user-mp 端 product detail 响应里返回 merchant.priceRule。
 */
export function reloadShopPriceRule() {
  rule.value = readRule()
}

/** 通过 merchantId 主动拉取（如果有此商户的最新规则） */
export async function fetchShopPriceRuleByMerchant(merchantId: string): Promise<ShopPriceRule | null> {
  if (!merchantId) return null
  try {
    const data = await http.get<ShopPriceRule>(`/api/v1/u/shops/${merchantId}/price-rule`, undefined, { silent: true })
    if (data) {
      rule.value = { ...DEFAULT, ...data }
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(rule.value))
        }
      } catch {}
      return rule.value
    }
  } catch {
    // 接口不可达（未来才加）：保持本地缓存
  }
  return null
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
   * 当前查看者身份：
   *  - guest      未登录
   *  - agency     已申请代理 / 加盟门店（role: factory / store / merchant）
   *  - member     付费会员（暂时按 user.role === 'member' 或 user.isMember 判断）
   *  - customer   其它已登录用户
   */
  const viewerTier = computed<CustomerTier>(() => {
    if (!userStore.isLogin) return 'guest'
    const u = userStore.user as any
    if (!u) return 'customer'
    const role: string = u.role || ''
    if (role === 'factory' || role === 'store' || role === 'merchant') return 'agency'
    if (role === 'member' || u.isMember === true) return 'member'
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
