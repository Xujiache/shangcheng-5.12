/**
 * 购物车 store
 *
 * 两条数据通道：
 *   lines      —— 已加购商品（多个）
 *   buyNow     —— 立即购买的临时单一行（不进购物车，仅供确认订单页读取）
 *
 * 三种运行模式：
 *   1. 未登录态：纯本地 ref + uni.storage，离线可用
 *   2. 登录态读：loadFromServer() 从 /u/cart 拉真值替换本地
 *   3. 登录态写：addCart / updateCart / removeCart 优先调后端，本地做乐观更新
 *
 * 未登录 → 登录的合并策略（当前实现 & 已知限制）：
 *   登录成功后会调用 `loadFromServer()` 用服务端购物车**完整覆盖**本地（与淘宝/京东
 *   主流做法一致）。匿名期间在本地加购的条目**不会**自动合并到服务端。
 *   如未来需要合并：
 *     在 `setSession()` 中遍历本地 `lines`，按 (productId+skuId) 调 `cartService.add()`
 *     做幂等合并，再 `loadFromServer()` 覆盖。当前暂不实现。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { cartService, type ServerCartItem } from '../services'

export interface CartLine {
  id: string
  productId: string
  skuId: string
  name: string
  spec: string
  image: string
  price: number
  qty: number
  selected: boolean
  /** 按尺寸定价商品的定制尺寸（仅前端透传给下单接口，服务端据此重算成交价） */
  bySize?: { length: number; width: number; area?: number }
}

const STORAGE_KEY = 'jiujiu_cart'
const BUYNOW_KEY = 'jiujiu_buynow'
const TOKEN_KEY = 'jiujiu_token'

/**
 * 通过 token 是否存在判断登录态。
 * 直接读 storage 而不引用 useUserStore 是为了避免 user/cart 双向依赖。
 */
function isLoggedIn(): boolean {
  try {
    return !!uni.getStorageSync(TOKEN_KEY)
  } catch {
    return false
  }
}

/**
 * 选价策略：购物车每条由不同商家的不同 displayPolicy 决定真实成交价，
 * 但 store 层拿不到每家店铺的规则上下文，且后端在「下单时」会重新按 displayPolicy
 * 验算单价（防前端造价）。因此本地仅渲染一个"展示价"——优先级：
 *
 *   priceRetail > 老接口的 sku.price > 商品聚合最低零售价
 *
 * 该展示价仅用于购物车页合计预览；真正下单价格以后端 createOrder 返回的
 * payAmount 为准（前端不再用本地价格做最终结算）。
 */
function serverToLine(it: ServerCartItem): CartLine {
  const sku = it.sku
  const displayPrice = Number(
    sku?.priceRetail ?? sku?.price ?? it.product?.priceRetailMin ?? 0,
  )
  return {
    id: it.id,
    productId: it.productId,
    skuId: it.skuId,
    name: it.product?.name ?? '',
    spec: sku?.specsLabel || '默认规格',
    image: it.product?.image ?? '',
    price: Number.isFinite(displayPrice) ? displayPrice : 0,
    qty: it.quantity,
    selected: true,
  }
}

export const useCartStore = defineStore('cart', () => {
  const lines = ref<CartLine[]>([])
  /** 立即购买临时单（不持久化到购物车列表，仅 sessionStorage 跨页传递） */
  const buyNow = ref<CartLine | null>(null)

  function hydrate() {
    try {
      const raw = uni.getStorageSync(STORAGE_KEY)
      if (raw) lines.value = typeof raw === 'string' ? JSON.parse(raw) : raw
      const bn = uni.getStorageSync(BUYNOW_KEY)
      if (bn) buyNow.value = typeof bn === 'string' ? JSON.parse(bn) : bn
    } catch {
      // ignore
    }
  }

  function persist() {
    try {
      uni.setStorageSync(STORAGE_KEY, JSON.stringify(lines.value))
    } catch {
      /* ignore */
    }
  }

  function persistBuyNow() {
    try {
      if (buyNow.value) uni.setStorageSync(BUYNOW_KEY, JSON.stringify(buyNow.value))
      else uni.removeStorageSync(BUYNOW_KEY)
    } catch {
      /* ignore */
    }
  }

  /* ========== 本地操作（未登录态使用 / 也作为乐观更新底层） ========== */

  function add(line: Omit<CartLine, 'id' | 'qty' | 'selected'> & { qty?: number }) {
    const existing = lines.value.find(
      (l) => l.productId === line.productId && l.skuId === line.skuId,
    )
    if (existing) {
      existing.qty += line.qty ?? 1
    } else {
      lines.value.unshift({
        id: 'cl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        productId: line.productId,
        skuId: line.skuId,
        name: line.name,
        spec: line.spec,
        image: line.image,
        price: line.price,
        qty: line.qty ?? 1,
        bySize: line.bySize,
        selected: true,
      })
    }
    persist()
  }

  /** 立即购买：单独存储，不污染购物车 */
  function setBuyNow(line: Omit<CartLine, 'id' | 'selected'>) {
    buyNow.value = {
      id: 'bn-' + Date.now(),
      productId: line.productId,
      skuId: line.skuId,
      name: line.name,
      spec: line.spec,
      image: line.image,
      price: line.price,
      qty: line.qty || 1,
      bySize: line.bySize,
      selected: true,
    }
    persistBuyNow()
  }

  function clearBuyNow() {
    buyNow.value = null
    persistBuyNow()
  }

  function remove(id: string) {
    lines.value = lines.value.filter((l) => l.id !== id)
    persist()
  }

  function update(id: string, patch: Partial<CartLine>) {
    const l = lines.value.find((x) => x.id === id)
    if (l) Object.assign(l, patch)
    persist()
  }

  function setAllSelected(selected: boolean) {
    lines.value.forEach((l) => (l.selected = selected))
    persist()
  }

  function clearSelected() {
    lines.value = lines.value.filter((l) => !l.selected)
    persist()
  }

  /* ========== 服务器同步（登录态使用） ========== */

  /** 从 /u/cart 拉取后端真值，替换本地。已勾选状态按 id 继承 */
  async function loadFromServer(): Promise<void> {
    if (!isLoggedIn()) return
    try {
      const items = await cartService.list()
      const prevSelected = new Map(lines.value.map((l) => [l.id, l.selected]))
      lines.value = (items || []).map((it) => {
        const ln = serverToLine(it)
        if (prevSelected.has(ln.id)) ln.selected = prevSelected.get(ln.id) as boolean
        return ln
      })
      persist()
    } catch {
      // 拉取失败保留本地缓存（弱网/离线场景）
    }
  }

  /**
   * 加购：登录态优先后端 POST，成功后 reload；未登录态走本地。
   * 调用方应 await 此方法再 toast，避免「显示成功后后端失败」的体验问题。
   */
  async function addCart(
    line: Omit<CartLine, 'id' | 'qty' | 'selected'> & { qty?: number },
  ): Promise<void> {
    if (!isLoggedIn()) {
      add(line)
      return
    }
    await cartService.add({
      productId: line.productId,
      skuId: line.skuId || undefined,
      quantity: line.qty ?? 1,
    })
    await loadFromServer()
  }

  /**
   * 改数量：登录态后端 PATCH + 乐观更新；未登录态纯本地。
   * 后端失败时回滚 qty。
   */
  async function updateCart(id: string, qty: number): Promise<void> {
    if (qty < 1) return
    const prev = lines.value.find((x) => x.id === id)
    const prevQty = prev?.qty
    if (prev) {
      prev.qty = qty
      persist()
    }
    if (!isLoggedIn()) return
    try {
      await cartService.update(id, { quantity: qty })
    } catch (e) {
      if (prev && typeof prevQty === 'number') {
        prev.qty = prevQty
        persist()
      }
      throw e
    }
  }

  /**
   * 删除条目：登录态后端 DELETE + 乐观移除；未登录态纯本地。
   * 后端失败时把整行恢复。
   */
  async function removeCart(id: string): Promise<void> {
    const prevList = lines.value
    lines.value = lines.value.filter((l) => l.id !== id)
    persist()
    if (!isLoggedIn()) return
    try {
      await cartService.remove(id)
    } catch (e) {
      lines.value = prevList
      persist()
      throw e
    }
  }

  /**
   * 批量删除选中：登录态逐条调后端，全部成功才本地移除；
   * 任一失败 → 调 loadFromServer 重新对齐避免脏数据。
   */
  async function removeSelected(): Promise<void> {
    const selectedIds = lines.value.filter((l) => l.selected).map((l) => l.id)
    if (selectedIds.length === 0) return
    if (!isLoggedIn()) {
      clearSelected()
      return
    }
    const failed: string[] = []
    for (const id of selectedIds) {
      try {
        await cartService.remove(id)
      } catch {
        failed.push(id)
      }
    }
    if (failed.length === 0) {
      lines.value = lines.value.filter((l) => !selectedIds.includes(l.id))
      persist()
    } else {
      await loadFromServer()
      throw new Error(`${failed.length} 件删除失败`)
    }
  }

  const totalCount = computed(() => lines.value.reduce((s, l) => s + l.qty, 0))
  const selectedLines = computed(() => lines.value.filter((l) => l.selected))
  const allSelected = computed(() => lines.value.length > 0 && lines.value.every((l) => l.selected))
  const subtotal = computed(() => selectedLines.value.reduce((s, l) => s + l.price * l.qty, 0))

  return {
    lines,
    buyNow,
    totalCount,
    selectedLines,
    allSelected,
    subtotal,
    hydrate,
    add,
    setBuyNow,
    clearBuyNow,
    remove,
    update,
    setAllSelected,
    clearSelected,
    loadFromServer,
    addCart,
    updateCart,
    removeCart,
    removeSelected,
  }
})
