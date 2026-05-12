/**
 * 购物车 store
 *
 * 两条线分开：
 *   lines     —— 用户加入购物车的商品（多个）
 *   buyNow    —— 立即购买的临时单一行（不进购物车，仅供确认订单页读取）
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

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
}

const STORAGE_KEY = 'jiujiu_cart'
const BUYNOW_KEY = 'jiujiu_buynow'

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
    try { uni.setStorageSync(STORAGE_KEY, JSON.stringify(lines.value)) } catch { /* ignore */ }
  }

  function persistBuyNow() {
    try {
      if (buyNow.value) uni.setStorageSync(BUYNOW_KEY, JSON.stringify(buyNow.value))
      else uni.removeStorageSync(BUYNOW_KEY)
    } catch { /* ignore */ }
  }

  function add(line: Omit<CartLine, 'id' | 'qty' | 'selected'> & { qty?: number }) {
    const existing = lines.value.find((l) => l.productId === line.productId && l.skuId === line.skuId)
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
  }
})
