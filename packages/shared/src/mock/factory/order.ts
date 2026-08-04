/**
 * 订单 / 售后 Mock
 */
import type { Order, OrderItem, OrderStatus, Refund } from '../../types/order'
import { faker, chineseName, chinaPhone, CITIES, placeholderImage, chance } from '../faker'
import { genId, genOrderNo, genRefundNo } from '../../utils/id'

export function genOrder(opts?: { userId?: string; merchantId?: string; status?: OrderStatus }): Order {
  const now = new Date().toISOString()
  const itemCount = faker.number.int({ min: 1, max: 3 })
  const items: OrderItem[] = Array.from({ length: itemCount }).map(() => {
    const id = genId()
    const unitPrice = faker.number.float({ min: 200, max: 5000, fractionDigits: 2 })
    return {
      id,
      orderId: '',
      productId: genId(),
      skuId: genId(),
      productName: faker.helpers.arrayElement(['实木餐桌', '布艺沙发', '北欧床', '儿童椅', '落地灯', '岩板茶几']),
      productImage: placeholderImage(400, 400),
      specsLabel: `${faker.helpers.arrayElement(['1.2m', '1.4m'])} · ${faker.helpers.arrayElement(['橡木', '胡桃木'])}`,
      unitPrice,
      quantity: faker.number.int({ min: 1, max: 3 }),
      createdAt: now,
      updatedAt: now,
    }
  })
  const totalAmount = items.reduce((s, x) => s + x.unitPrice * x.quantity, 0)
  const discount = chance(40) ? Math.round(totalAmount * 0.05) : 0
  const status = opts?.status ?? faker.helpers.arrayElement(['pending_payment', 'pending_shipment', 'shipped', 'completed'] as const)
  const city = faker.helpers.arrayElement(CITIES)

  const order: Order = {
    id: genId(),
    no: genOrderNo(),
    userId: opts?.userId ?? genId(),
    merchantId: opts?.merchantId ?? genId(),
    status,
    totalAmount,
    discountAmount: discount,
    shippingFee: 0,
    payAmount: totalAmount - discount,
    shippingMethod: 'factory',
    address: {
      userId: '',
      name: chineseName(),
      phone: chinaPhone(),
      region: `${city} 朝阳区`,
      detail: faker.location.streetAddress(),
      isDefault: true,
    },
    remark: chance(20) ? '请尽快发货' : undefined,
    paidAt: status === 'pending_payment' ? undefined : now,
    shippedAt: ['shipped', 'completed'].includes(status) ? now : undefined,
    completedAt: status === 'completed' ? now : undefined,
    expiresIn: status === 'pending_payment' ? faker.number.int({ min: 60, max: 900 }) : undefined,
    items,
    createdAt: now,
    updatedAt: now,
  }

  items.forEach((i) => (i.orderId = order.id))
  return order
}

export function genOrders(count: number, opts?: Parameters<typeof genOrder>[0]): Order[] {
  return Array.from({ length: count }).map(() => genOrder(opts))
}

export function genRefund(orderId: string): Refund {
  const now = new Date().toISOString()
  return {
    id: genId(),
    no: genRefundNo(),
    orderId,
    orderItemId: genId(),
    userId: genId(),
    merchantId: genId(),
    type: chance(60) ? 'refund_with_return' : 'refund_only',
    reason: faker.helpers.arrayElement(['商品损坏', '尺寸不符', '颜色不喜欢', '不想要了', '质量问题']),
    description: faker.lorem.sentence(),
    evidence: Array.from({ length: 3 }).map(() => placeholderImage(400, 400)),
    applyAmount: faker.number.float({ min: 100, max: 3000, fractionDigits: 2 }),
    status: faker.helpers.arrayElement(['pending', 'agreed', 'in_progress'] as const),
    createdAt: now,
    updatedAt: now,
  }
}
