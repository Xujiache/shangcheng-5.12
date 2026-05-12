/**
 * 商品 / SKU Mock 数据
 */
import type { Product, SKU, PriceDisplayRule, ProductStatus } from '../../types/product'
import { faker, placeholderImage, priceBetween, pickN, chance } from '../faker'
import { genId } from '../../utils/id'

const PRODUCT_NAMES = [
  '实木北欧餐桌',
  '布艺真皮沙发',
  '现代简约书架',
  '原木儿童椅',
  '日式榻榻米床',
  '岩板茶几',
  '北欧吊灯',
  '羊毛地毯',
  '智能升降桌',
  '人体工学办公椅',
  '美式复古衣柜',
  '北欧鞋柜',
  '实木餐边柜',
  '新中式电视柜',
  '简约落地灯',
]

const SPEC_OPTIONS = {
  size: ['1.2m', '1.4m', '1.6m', '1.8m'],
  color: ['橡木', '胡桃木', '原木色', '深棕', '白橡', '黑胡桃'],
  material: ['实木', '布艺', '真皮', '岩板', '亚克力'],
}

const TAGS = ['新品', '包邮', '厂家直发', '热销', '限时', '推荐', '环保', 'A级品']

const DEFAULT_PRICE_RULE: PriceDisplayRule = {
  guestVisible: false,
  customerTier: 'retail',
  storeTier: 'wholesale',
  memberTier: 'member',
}

/** 生成单个商品 */
export function genProduct(opts?: {
  merchantId?: string
  categoryId?: string
  status?: ProductStatus
}): Product {
  const id = genId()
  const name = `${faker.helpers.arrayElement(PRODUCT_NAMES)} ${faker.string.alpha({ length: 1, casing: 'upper' })}款`
  const now = new Date().toISOString()
  const priceWholesale = priceBetween(800, 4000)
  const priceRetail = Math.round(priceWholesale * faker.number.float({ min: 1.2, max: 1.6 }))
  const priceMember = Math.round(priceWholesale * faker.number.float({ min: 1.05, max: 1.2 }))

  const totalStock = faker.number.int({ min: 0, max: 200 })

  return {
    id,
    merchantId: opts?.merchantId ?? genId(),
    categoryId: opts?.categoryId ?? genId(),
    name,
    description: faker.commerce.productDescription(),
    images: Array.from({ length: faker.number.int({ min: 3, max: 6 }) }).map(() =>
      placeholderImage(800, 800),
    ),
    detailHtml: `<p>${faker.commerce.productDescription()}</p><p>采用${faker.helpers.arrayElement(SPEC_OPTIONS.material)}工艺，匠心制作。</p>`,
    tags: pickN(TAGS, faker.number.int({ min: 1, max: 3 })),
    priceRetailMin: priceRetail,
    priceRetailMax: Math.round(priceRetail * 1.3),
    priceWholesaleMin: priceWholesale,
    priceWholesaleMax: Math.round(priceWholesale * 1.3),
    priceMemberMin: priceMember,
    priceMemberMax: Math.round(priceMember * 1.3),
    status: opts?.status ?? 'active',
    totalStock,
    sales: faker.number.int({ min: 0, max: 2000 }),
    commentCount: faker.number.int({ min: 0, max: 500 }),
    shipping: chance(70) ? ['factory'] : ['local', 'pickup'],
    priceDisplayRules: DEFAULT_PRICE_RULE,
    autoApproved: chance(60),
    createdAt: now,
    updatedAt: now,
    // FX-5 · 约 15% 概率为按尺寸定价（地毯/桌布等定制商品）
    ...(chance(15)
      ? {
          pricingMode: 'by-size' as const,
          pricePerSqm: priceBetween(180, 800),
          minLength: 50,
          minWidth: 50,
          maxLength: 600,
          maxWidth: 400,
          baseFee: chance(50) ? priceBetween(30, 150) : 0,
          sizeUnit: 'cm' as const,
        }
      : { pricingMode: 'standard' as const }),
  } as Product
}

/** 为商品生成 SKU */
export function genSKUs(product: Product, count?: number): SKU[] {
  const skuCount = count ?? faker.number.int({ min: 1, max: 5 })
  const now = new Date().toISOString()

  return Array.from({ length: skuCount }).map((_, i) => {
    const size = faker.helpers.arrayElement(SPEC_OPTIONS.size)
    const color = faker.helpers.arrayElement(SPEC_OPTIONS.color)
    return {
      id: genId(),
      productId: product.id,
      specs: { size, color },
      specsLabel: `${size} · ${color}`,
      priceWholesale: product.priceWholesaleMin! + i * 100,
      priceRetail: product.priceRetailMin + i * 100,
      priceMember: product.priceMemberMin! + i * 100,
      stock: Math.floor(product.totalStock / skuCount),
      active: true,
      createdAt: now,
      updatedAt: now,
    }
  })
}

/** 批量生成 */
export function genProducts(count: number, opts?: Parameters<typeof genProduct>[0]): Product[] {
  return Array.from({ length: count }).map(() => genProduct(opts))
}
