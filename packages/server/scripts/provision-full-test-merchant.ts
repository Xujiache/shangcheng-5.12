import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { PrismaClient } from '@prisma/client'
import {
  INTERNAL_TEST_MERCHANTS_KEY,
  parseInternalTestMerchantIds,
} from '../src/common/utils/internal-test-merchant.util'

const prisma = new PrismaClient()
const ALLOWED_PHONE = '18195819181'
const PREFIX = 'qa1819'
const BACKUP_PATH = '/root/secure/jiujiu-test-account-18195819181-before.json'

function parseArgs(argv: string[]) {
  const args = argv.filter((arg) => arg !== '--')
  const phoneEq = args.find((arg) => arg.startsWith('--phone='))
  const phoneIndex = args.indexOf('--phone')
  const phone = phoneEq?.slice('--phone='.length) || (phoneIndex >= 0 ? args[phoneIndex + 1] : '')
  return {
    phone,
    reset: args.includes('--reset'),
    confirmProduction: args.includes('--confirm-production'),
  }
}

function daysAgo(days: number, hours = 0) {
  return new Date(Date.now() - (days * 24 + hours) * 60 * 60_000)
}

function safeBackup(payload: unknown) {
  if (existsSync(BACKUP_PATH)) return false
  mkdirSync(dirname(BACKUP_PATH), { recursive: true, mode: 0o700 })
  writeFileSync(BACKUP_PATH, `${JSON.stringify(payload, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
    flag: 'wx',
  })
  return true
}

async function clearTestMerchantData(tx: any, merchantId: string) {
  const productRows = await tx.product.findMany({
    where: { merchantId },
    select: { id: true },
  })
  const productIds = productRows.map((row: any) => row.id)
  const orderRows = await tx.order.findMany({ where: { merchantId }, select: { id: true } })
  const orderIds = orderRows.map((row: any) => row.id)
  const orderItemRows = await tx.orderItem.findMany({
    where: { orderId: { in: orderIds } },
    select: { id: true },
  })
  const orderItemIds = orderItemRows.map((row: any) => row.id)
  const couponRows = await tx.coupon.findMany({ where: { merchantId }, select: { id: true } })
  const couponIds = couponRows.map((row: any) => row.id)
  const sessionRows = await tx.chatSession.findMany({
    where: { merchantId },
    select: { id: true },
  })
  const sessionIds = sessionRows.map((row: any) => row.id)
  const syntheticUserIds = Array.from({ length: 3 }, (_, i) => `${PREFIX}_customer_${i + 1}`)

  await tx.orderShare.deleteMany({ where: { merchantId } })
  await tx.refund.deleteMany({
    where: {
      OR: [
        { merchantId },
        { orderId: { in: orderIds } },
        { orderItemId: { in: orderItemIds } },
        { userId: { in: syntheticUserIds } },
      ],
    },
  })
  await tx.payment.deleteMany({ where: { orderId: { in: orderIds } } })
  await tx.commission.deleteMany({
    where: { OR: [{ orderId: { in: orderIds } }, { userId: { in: syntheticUserIds } }] },
  })
  await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } })
  await tx.order.deleteMany({
    where: { OR: [{ merchantId }, { userId: { in: syntheticUserIds } }] },
  })

  await tx.userCoupon.deleteMany({
    where: { OR: [{ couponId: { in: couponIds } }, { userId: { in: syntheticUserIds } }] },
  })
  await tx.favorite.deleteMany({
    where: { OR: [{ productId: { in: productIds } }, { userId: { in: syntheticUserIds } }] },
  })
  await tx.cartItem.deleteMany({
    where: { OR: [{ productId: { in: productIds } }, { userId: { in: syntheticUserIds } }] },
  })

  await tx.chatMessage.deleteMany({ where: { sessionId: { in: sessionIds } } })
  await tx.chatSession.deleteMany({
    where: { OR: [{ merchantId }, { userId: { in: syntheticUserIds } }] },
  })
  await tx.quickReply.deleteMany({ where: { merchantId } })
  await tx.agencyApplication.deleteMany({
    where: { OR: [{ merchantId }, { factoryMerchantId: merchantId }] },
  })

  await tx.flashSale.deleteMany({ where: { merchantId } })
  await tx.groupBuy.deleteMany({ where: { merchantId } })
  await tx.commissionRule.deleteMany({ where: { merchantId } })
  await tx.coupon.deleteMany({ where: { merchantId } })
  await tx.sku.deleteMany({ where: { productId: { in: productIds } } })
  await tx.auditRecord.deleteMany({
    where: { OR: [{ targetId: merchantId }, { targetId: { in: productIds } }] },
  })
  await tx.product.deleteMany({ where: { merchantId } })

  await tx.withdraw.deleteMany({
    where: { OR: [{ merchantId }, { userId: { in: syntheticUserIds } }] },
  })
  await tx.booking.deleteMany({
    where: { OR: [{ merchantId }, { userId: { in: syntheticUserIds } }] },
  })
  await tx.store.deleteMany({ where: { merchantId } })
  await tx.staff.deleteMany({ where: { merchantId } })
  await tx.shopDecorate.deleteMany({ where: { merchantId } })
  await tx.merchantFeatureOverride.deleteMany({ where: { merchantId } })
  await tx.paymentRecord.deleteMany({ where: { merchantId } })
  await tx.usageQuota.deleteMany({ where: { merchantId } })
  await tx.merchantMembership.deleteMany({ where: { merchantId } })
  await tx.adCreative.deleteMany({ where: { merchantId } })

  await tx.address.deleteMany({ where: { userId: { in: syntheticUserIds } } })
  await tx.user.deleteMany({ where: { id: { in: syntheticUserIds } } })
  await tx.systemConfig.deleteMany({
    where: {
      OR: [
        { key: { startsWith: `shop:${merchantId}:` } },
        { key: { startsWith: `cust_tier_${merchantId}_` } },
        { key: { startsWith: `cust_auth_${merchantId}_` } },
        { key: { startsWith: `merchant:${merchantId}:blacklist:` } },
        { key: { startsWith: `${PREFIX}:${merchantId}:` } },
      ],
    },
  })
}

async function provision() {
  const options = parseArgs(process.argv.slice(2))
  if (options.phone !== ALLOWED_PHONE) {
    throw new Error(`安全门禁：该命令只允许手机号 ${ALLOWED_PHONE}`)
  }
  if (!options.reset || !options.confirmProduction) {
    throw new Error('安全门禁：必须同时提供 --reset 与 --confirm-production')
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL 未加载')

  const user = await prisma.user.findUnique({ where: { phone: ALLOWED_PHONE } })
  if (!user) throw new Error(`手机号 ${ALLOWED_PHONE} 不存在，拒绝自动创建生产用户`)
  if (!user.passwordHash) throw new Error('目标账号尚未设置密码，拒绝继续')
  const merchant = await prisma.merchant.findUnique({ where: { userId: user.id } })
  if (!merchant) throw new Error('目标账号没有既有 Merchant，拒绝自动新建或绑定其他商户')

  const backupCreated = safeBackup({
    backedUpAt: new Date().toISOString(),
    purpose: '18195819181 内部测试账号配置前快照',
    user,
    merchant,
  })
  const originalPasswordHash = user.passwordHash

  const category = await prisma.category.findFirst({
    where: { type: 'platform' },
    orderBy: [{ parentId: 'asc' }, { sort: 'asc' }],
  })
  if (!category) throw new Error('生产库没有平台分类，无法安全创建商品')
  const adProPlan = await prisma.memberPlan.findFirst({
    where: { code: 'ad_pro', status: 'active' },
  })
  if (!adProPlan) throw new Error('生产库缺少启用中的 ad_pro 套餐')
  const externalFactories = await prisma.merchant.findMany({
    where: { id: { not: merchant.id }, status: 'active' },
    select: { id: true },
    take: 3,
    orderBy: { createdAt: 'asc' },
  })

  await prisma.$transaction(
    async (tx) => {
      await clearTestMerchantData(tx, merchant.id)

      const marker = await tx.systemConfig.findUnique({
        where: { key: INTERNAL_TEST_MERCHANTS_KEY },
      })
      const markerIds = parseInternalTestMerchantIds(marker?.value)
      const nextMarkerIds = Array.from(new Set([...markerIds, merchant.id]))
      await tx.systemConfig.upsert({
        where: { key: INTERNAL_TEST_MERCHANTS_KEY },
        update: { value: nextMarkerIds },
        create: { key: INTERNAL_TEST_MERCHANTS_KEY, value: nextMarkerIds },
      })

      await tx.user.update({
        where: { id: user.id },
        data: { role: 'super-admin', merchantId: merchant.id, status: 'active' },
      })
      await tx.merchant.update({
        where: { id: merchant.id },
        data: {
          type: 'factory',
          name: '【内部测试】全功能门窗厂',
          legalName: '经纬内部测试门窗制造有限公司',
          creditCode: 'QA1819000000000001',
          legalRep: '内部测试员',
          contact: '全功能测试负责人',
          contactPhone: ALLOWED_PHONE,
          region: '宁夏回族自治区银川市',
          address: '金凤区内部测试路 1819 号（非真实地址）',
          businessLicense: 'https://picsum.photos/seed/qa1819-license/900/1200',
          qualifications: [
            'https://picsum.photos/seed/qa1819-cert-1/900/1200',
            'https://picsum.photos/seed/qa1819-cert-2/900/1200',
          ],
          categories: ['系统门窗', '断桥铝门窗', '阳光房', '入户门'],
          status: 'active',
          level: 'A',
          credit: 'A',
          rejectRate: 1.5,
          totalGmv: 368520.88,
          rejectReason: null,
          trialEndAt: new Date(Date.now() + 365 * 86400_000),
        },
      })

      const customerRows = [
        { id: `${PREFIX}_customer_1`, nickname: '【测试客户】高意向业主', role: 'customer' },
        { id: `${PREFIX}_customer_2`, nickname: '【测试客户】渠道代理', role: 'promoter' },
        { id: `${PREFIX}_customer_3`, nickname: '【测试客户】黑名单客户', role: 'customer' },
      ]
      await tx.user.createMany({
        data: customerRows.map((row, i) => ({
          ...row,
          avatar: `https://picsum.photos/seed/qa1819-customer-${i + 1}/200/200`,
          gender: i === 1 ? 2 : 1,
          status: 'active',
        })),
      })
      await tx.address.createMany({
        data: customerRows.map((row, i) => ({
          id: `${PREFIX}_address_${i + 1}`,
          userId: row.id,
          name: row.nickname.replace('【测试客户】', ''),
          phone: `1810000181${i}`,
          region: '宁夏回族自治区 银川市 金凤区',
          detail: `内部测试小区 ${i + 1} 栋 1819 室（非真实地址）`,
          longitude: 106.2309 + i * 0.01,
          latitude: 38.4872 + i * 0.01,
          isDefault: true,
        })),
      })

      const skuCounts = [3, 3, 3, 3, 3, 2, 2, 2, 2, 2]
      const productNames = [
        '断桥铝 80 系列系统窗',
        '极窄边框推拉门',
        '铝包木静音窗',
        '全景阳光房顶窗',
        '智能提升推拉门',
        '防火入户门',
        '内开内倒纱窗一体窗',
        '庭院电动平移门',
        '圆弧异形景观窗',
        '工程款节能窗',
      ]
      const statuses = [
        'active',
        'active',
        'active',
        'active',
        'offline',
        'draft',
        'auditing',
        'rejected',
        'active',
        'offline',
      ]
      const productIds: string[] = []
      const skuIds: string[] = []
      for (let i = 0; i < productNames.length; i += 1) {
        const productId = `${PREFIX}_product_${String(i + 1).padStart(2, '0')}`
        const bySize = [0, 3, 8].includes(i)
        const base = 680 + i * 115
        await tx.product.create({
          data: {
            id: productId,
            merchantId: merchant.id,
            categoryId: category.id,
            name: `【测试】${productNames[i]}`,
            description: `qa1819 全功能测试商品 ${i + 1}，仅在内部商家后台展示。`,
            images: [`https://picsum.photos/seed/qa1819-product-${i + 1}/900/900`],
            detailImages: [
              `https://picsum.photos/seed/qa1819-detail-${i + 1}-1/900/1200`,
              `https://picsum.photos/seed/qa1819-detail-${i + 1}-2/900/1200`,
            ],
            tags: ['内部测试', bySize ? '按尺寸计价' : '标准规格', i % 2 ? '热销' : '新品'],
            priceRetailMin: base,
            priceRetailMax: base + 360,
            priceWholesaleMin: base * 0.78,
            priceWholesaleMax: (base + 360) * 0.78,
            priceMemberMin: base * 0.9,
            priceMemberMax: (base + 360) * 0.9,
            pricingMode: bySize ? 'by-size' : 'standard',
            pricePerSqm: bySize ? base : null,
            minLength: bySize ? 0.5 : null,
            minWidth: bySize ? 0.5 : null,
            maxLength: bySize ? 6 : null,
            maxWidth: bySize ? 4 : null,
            baseFee: bySize ? 300 : null,
            sizeUnit: bySize ? 'm' : null,
            status: statuses[i],
            totalStock: 120 + i * 15,
            sales: i * 17 + 8,
            commentCount: i * 3,
            shipping: ['factory', 'local', 'pickup'],
            priceDisplayRules: {
              guestVisible: false,
              customerTier: 'retail',
              agencyTier: 'wholesale',
              memberTier: 'member',
            },
            rejectReason: statuses[i] === 'rejected' ? '【测试】详情参数不完整' : null,
            autoApproved: false,
            createdAt: daysAgo(29 - i * 2),
          },
        })
        productIds.push(productId)
        for (let j = 0; j < skuCounts[i]; j += 1) {
          const skuId = `${PREFIX}_sku_${String(i + 1).padStart(2, '0')}_${j + 1}`
          await tx.sku.create({
            data: {
              id: skuId,
              productId,
              specs: bySize
                ? { color: ['砂灰', '曜石黑', '香槟金'][j], glass: '双层中空 Low-E' }
                : { color: ['砂灰', '曜石黑', '香槟金'][j], size: `${120 + j * 30}cm` },
              specsLabel: `${['砂灰', '曜石黑', '香槟金'][j]} / ${bySize ? '双层中空玻璃' : `${120 + j * 30}cm`}`,
              image: `https://picsum.photos/seed/qa1819-sku-${i + 1}-${j + 1}/500/500`,
              priceWholesale: (base + j * 120) * 0.78,
              priceRetail: base + j * 120,
              priceMember: (base + j * 120) * 0.9,
              stock: 30 + i * 3 + j * 8,
              active: !(statuses[i] === 'offline' && j === 0),
            },
          })
          skuIds.push(skuId)
        }
      }

      const orderStatuses = [
        'pending_payment',
        'pending_payment',
        'pending_shipment',
        'pending_shipment',
        'shipped',
        'shipped',
        'completed',
        'completed',
        'cancelled',
        'after_sale',
        'after_sale',
        'after_sale',
      ]
      const orderItems: Array<{ orderId: string; itemId: string; userId: string }> = []
      for (let i = 0; i < orderStatuses.length; i += 1) {
        const orderId = `${PREFIX}_order_${String(i + 1).padStart(2, '0')}`
        const itemId = `${PREFIX}_order_item_${String(i + 1).padStart(2, '0')}`
        const userId = customerRows[i % customerRows.length].id
        const productIndex = i % productIds.length
        const skuId = `${PREFIX}_sku_${String(productIndex + 1).padStart(2, '0')}_1`
        const amount = 980 + i * 215
        const status = orderStatuses[i]
        const createdAt = daysAgo(29 - i * 2, i % 5)
        const isPaid = !['pending_payment', 'cancelled'].includes(status)
        const isShipped = ['shipped', 'completed', 'after_sale'].includes(status)
        await tx.order.create({
          data: {
            id: orderId,
            no: `${PREFIX}_order_no_${String(i + 1).padStart(3, '0')}`,
            userId,
            merchantId: merchant.id,
            status,
            totalAmount: amount,
            discountAmount: i % 3 === 0 ? 80 : 0,
            shippingFee: i % 2 === 0 ? 0 : 35,
            payAmount: amount - (i % 3 === 0 ? 80 : 0) + (i % 2 === 0 ? 0 : 35),
            paymentMethod: isPaid ? 'wechat' : null,
            shippingMethod: i % 3 === 0 ? 'pickup' : 'factory',
            address: {
              name: customerRows[i % customerRows.length].nickname,
              phone: `1810000181${i % 3}`,
              region: '宁夏回族自治区 银川市 金凤区',
              detail: `内部测试地址 ${i + 1} 号`,
            },
            remark: `qa1819 测试订单 ${i + 1}，禁止真实发货`,
            trackingNumber: isShipped ? `${PREFIX}_tracking_${i + 1}` : null,
            trackingCompany: isShipped ? '内部测试物流' : null,
            paidAt: isPaid ? new Date(createdAt.getTime() + 60 * 60_000) : null,
            shippedAt: isShipped ? new Date(createdAt.getTime() + 24 * 60 * 60_000) : null,
            completedAt:
              status === 'completed' ? new Date(createdAt.getTime() + 7 * 86400_000) : null,
            cancelledAt:
              status === 'cancelled' ? new Date(createdAt.getTime() + 2 * 3600_000) : null,
            expiresAt: status === 'pending_payment' ? new Date(Date.now() + 30 * 60_000) : null,
            createdAt,
          },
        })
        await tx.orderItem.create({
          data: {
            id: itemId,
            orderId,
            productId: productIds[productIndex],
            skuId,
            productName: `【测试】${productNames[productIndex]}`,
            productImage: `https://picsum.photos/seed/qa1819-order-${i + 1}/600/600`,
            specsLabel: '砂灰 / 标准测试规格',
            unitPrice: amount,
            quantity: 1,
          },
        })
        await tx.payment.create({
          data: {
            id: `${PREFIX}_payment_${String(i + 1).padStart(2, '0')}`,
            orderId,
            method: 'wechat',
            amount,
            status: isPaid ? 'success' : status === 'cancelled' ? 'failed' : 'pending',
            wxTransactionId: isPaid ? `${PREFIX}_fake_wx_${i + 1}` : null,
            paidAt: isPaid ? new Date(createdAt.getTime() + 60 * 60_000) : null,
          },
        })
        orderItems.push({ orderId, itemId, userId })
      }

      const refundStatuses = ['pending', 'agreed', 'rejected', 'completed']
      const refundOrderIndexes = [9, 10, 7, 11]
      for (let i = 0; i < refundStatuses.length; i += 1) {
        const order = orderItems[refundOrderIndexes[i]]
        await tx.refund.create({
          data: {
            id: `${PREFIX}_refund_${i + 1}`,
            no: `${PREFIX}_refund_no_${i + 1}`,
            orderId: order.orderId,
            orderItemId: order.itemId,
            userId: order.userId,
            merchantId: merchant.id,
            type: i % 2 === 0 ? 'refund_only' : 'refund_with_return',
            reason: ['尺寸不合适', '运输破损', '客户撤销申请', '质量问题已处理'][i],
            description: `qa1819 ${refundStatuses[i]} 售后测试记录`,
            evidence: [`https://picsum.photos/seed/qa1819-refund-${i + 1}/700/700`],
            applyAmount: 300 + i * 180,
            refundAmount: ['agreed', 'completed'].includes(refundStatuses[i])
              ? 300 + i * 180
              : null,
            status: refundStatuses[i],
            merchantReply: i === 2 ? '【测试】资料不足，已拒绝' : '【测试】内部流程处理意见',
            returnAddress:
              i === 1 ? { name: '内部测试仓', phone: ALLOWED_PHONE, address: '非真实地址' } : null,
            completedAt: refundStatuses[i] === 'completed' ? daysAgo(1) : null,
            createdAt: daysAgo(8 - i),
          },
        })
      }

      const commissionStatuses = [
        'pending',
        'settled',
        'cancelled',
        'pending',
        'settled',
        'pending',
      ]
      for (let i = 0; i < commissionStatuses.length; i += 1) {
        await tx.commission.create({
          data: {
            id: `${PREFIX}_commission_${i + 1}`,
            orderId: orderItems[i + 2].orderId,
            userId: customerRows[1].id,
            level: i % 2 === 0 ? 1 : 2,
            amount: 68 + i * 21,
            status: commissionStatuses[i],
            settledAt: commissionStatuses[i] === 'settled' ? daysAgo(2) : null,
            createdAt: daysAgo(12 - i),
          },
        })
      }
      const withdrawalStatuses = ['pending', 'paid', 'rejected']
      for (let i = 0; i < withdrawalStatuses.length; i += 1) {
        await tx.withdraw.create({
          data: {
            id: `${PREFIX}_withdraw_${i + 1}`,
            no: `${PREFIX}_withdraw_no_${i + 1}`,
            userId: user.id,
            merchantId: merchant.id,
            applyAmount: 500 + i * 300,
            actualAmount: withdrawalStatuses[i] === 'paid' ? 800 : 0,
            remark: `qa1819 ${withdrawalStatuses[i]} 提现测试，禁止真实付款`,
            remarkTags: ['内部测试', '禁止付款'],
            method: i === 1 ? 'bank' : 'wechat',
            account: 'qa1819_mock_account',
            status: withdrawalStatuses[i],
            reviewedBy: withdrawalStatuses[i] === 'pending' ? null : user.id,
            reviewedAt: withdrawalStatuses[i] === 'pending' ? null : daysAgo(2),
            paidAt: withdrawalStatuses[i] === 'paid' ? daysAgo(1) : null,
          },
        })
      }

      await tx.store.createMany({
        data: [
          {
            id: `${PREFIX}_store_1`,
            merchantId: merchant.id,
            name: '【测试】银川旗舰体验店',
            contact: '测试店长甲',
            phone: '18100001810',
            region: '宁夏回族自治区银川市金凤区',
            address: '内部测试路 1 号',
            longitude: 106.2309,
            latitude: 38.4872,
            level: 'A',
            status: 'active',
            authValidFrom: daysAgo(30),
            authValidTo: new Date(Date.now() + 335 * 86400_000),
            authConfig: { priceVisible: true, categories: ['系统门窗'], markupRatio: 18 },
          },
          {
            id: `${PREFIX}_store_2`,
            merchantId: merchant.id,
            name: '【测试】吴忠待审核门店',
            contact: '测试店长乙',
            phone: '18100001811',
            region: '宁夏回族自治区吴忠市',
            address: '内部测试路 2 号',
            longitude: 106.198,
            latitude: 37.997,
            level: 'B',
            status: 'pending',
            authConfig: { priceVisible: false, categories: ['入户门'], markupRatio: 22 },
          },
          {
            id: `${PREFIX}_store_3`,
            merchantId: merchant.id,
            name: '【测试】已取消授权门店',
            contact: '测试店长丙',
            phone: '18100001812',
            region: '宁夏回族自治区中卫市',
            address: '内部测试路 3 号',
            level: 'C',
            status: 'cancelled',
            authValidFrom: daysAgo(365),
            authValidTo: daysAgo(30),
            authConfig: { priceVisible: false, categories: [], markupRatio: 0 },
          },
        ],
      })
      await tx.staff.createMany({
        data: [
          ['1', '内部测试总经理', 'manager', 'active', 88600, ['*']],
          ['2', '内部测试销售', 'sales', 'active', 32800, ['product.read', 'order.read']],
          ['3', '内部测试客服', 'cs', 'active', 0, ['chat.*', 'refund.read']],
          ['4', '内部测试离职员工', 'sales', 'left', 9800, []],
        ].map(([suffix, name, role, status, performance, permissions]) => ({
          id: `${PREFIX}_staff_${suffix}`,
          merchantId: merchant.id,
          name: `【测试】${name}`,
          phone: `1810000190${suffix}`,
          role: String(role),
          status: String(status),
          monthlyPerformance: Number(performance),
          permissions: permissions as string[],
        })),
      })
      await tx.shopDecorate.create({
        data: {
          id: `${PREFIX}_shop_decorate`,
          merchantId: merchant.id,
          themeColor: '#176B87',
          fontStyle: 'modern',
          productLayout: 'twoColumn',
          cornerStyle: 'soft',
          banners: [
            {
              id: `${PREFIX}_banner_1`,
              image: 'https://picsum.photos/seed/qa1819-banner-1/1200/480',
            },
            {
              id: `${PREFIX}_banner_2`,
              image: 'https://picsum.photos/seed/qa1819-banner-2/1200/480',
            },
          ],
          modules: [
            { id: `${PREFIX}_module_1`, type: 'banner', sort: 1 },
            { id: `${PREFIX}_module_2`, type: 'category', sort: 2 },
            { id: `${PREFIX}_module_3`, type: 'product-list', sort: 3 },
          ],
        },
      })

      const couponStatuses = ['active', 'paused', 'ended', 'pending']
      for (let i = 0; i < couponStatuses.length; i += 1) {
        await tx.coupon.create({
          data: {
            id: `${PREFIX}_coupon_${i + 1}`,
            merchantId: merchant.id,
            name: `【测试】${['满千减百', '会员九折', '新品直减', '待发布券'][i]}`,
            type: i === 1 ? 'discount' : i === 2 ? 'fixed' : 'fullReduce',
            amount: i === 1 ? null : 100 + i * 20,
            discountPercent: i === 1 ? 0.9 : null,
            threshold: i === 1 ? 0 : 1000,
            stock: 100 + i * 50,
            received: 20 + i * 5,
            used: 8 + i,
            validFrom: i === 2 ? daysAgo(60) : daysAgo(5),
            validTo: i === 2 ? daysAgo(1) : new Date(Date.now() + 30 * 86400_000),
            perUserLimit: 2,
            scope: i === 3 ? 'product' : 'all',
            scopeIds: i === 3 ? [productIds[0], productIds[1]] : [],
            status: couponStatuses[i],
          },
        })
      }
      await tx.flashSale.createMany({
        data: ['active', 'pending', 'ended'].map((status, i) => ({
          id: `${PREFIX}_flash_${i + 1}`,
          merchantId: merchant.id,
          productId: productIds[i],
          skuId: skuIds[i],
          price: 699 + i * 120,
          stock: 50,
          sold: i * 11,
          startAt: status === 'ended' ? daysAgo(10) : daysAgo(1),
          endAt: status === 'ended' ? daysAgo(3) : new Date(Date.now() + 7 * 86400_000),
          status,
        })),
      })
      await tx.groupBuy.createMany({
        data: ['active', 'pending', 'ended'].map((status, i) => ({
          id: `${PREFIX}_group_${i + 1}`,
          merchantId: merchant.id,
          productId: productIds[i + 3],
          skuId: skuIds[i + 3],
          groupSize: 3 + i * 2,
          price: 899 + i * 150,
          validHours: 24 + i * 12,
          status,
        })),
      })
      await tx.commissionRule.create({
        data: {
          id: `${PREFIX}_commission_rule_global`,
          merchantId: merchant.id,
          productId: null,
          level1Percent: 8,
          level2Percent: 3,
          visibleToPromoter: true,
          allowOffline: false,
          enabled: true,
        },
      })
      await tx.commissionRule.create({
        data: {
          id: `${PREFIX}_commission_rule_product`,
          merchantId: merchant.id,
          productId: productIds[0],
          level1Percent: 12,
          level2Percent: 5,
          visibleToPromoter: true,
          allowOffline: true,
          enabled: true,
        },
      })

      await tx.quickReply.createMany({
        data: [
          ['欢迎语', '您好，这里是内部测试门窗厂，请问需要测试哪个功能？'],
          ['量尺预约', '已为您记录测试量尺需求，不会产生真实上门任务。'],
          ['售后说明', '这是内部测试售后回复，不会触发真实退款或物流。'],
        ].map(([label, content], i) => ({
          id: `${PREFIX}_quick_reply_${i + 1}`,
          merchantId: merchant.id,
          label: `【测试】${label}`,
          content,
          sort: i + 1,
        })),
      })
      for (let i = 0; i < customerRows.length; i += 1) {
        const sessionId = `${PREFIX}_chat_session_${i + 1}`
        await tx.chatSession.create({
          data: {
            id: sessionId,
            userId: customerRows[i].id,
            merchantId: merchant.id,
            lastMessageAt: daysAgo(0, i),
            unreadCount: i === 0 ? 2 : i,
            status: i === 2 ? 'closed' : 'open',
          },
        })
        await tx.chatMessage.createMany({
          data: [
            {
              id: `${PREFIX}_chat_message_${i + 1}_1`,
              sessionId,
              sender: 'user',
              type: 'text',
              content: `qa1819 客户 ${i + 1}：咨询门窗尺寸与报价`,
              read: i !== 0,
              createdAt: daysAgo(0, i + 2),
            },
            {
              id: `${PREFIX}_chat_message_${i + 1}_2`,
              sessionId,
              sender: 'merchant',
              type: 'quick',
              content: '【测试回复】已收到，仅用于内部验收。',
              read: true,
              createdAt: daysAgo(0, i + 1),
            },
            {
              id: `${PREFIX}_chat_message_${i + 1}_3`,
              sessionId,
              sender: 'user',
              type: 'image',
              content: `https://picsum.photos/seed/qa1819-chat-${i + 1}/600/600`,
              read: i === 2,
              createdAt: daysAgo(0, i),
            },
          ],
        })
      }

      const factoryFallbacks = externalFactories.length
        ? externalFactories.map((row) => row.id)
        : [`${PREFIX}_external_factory_placeholder`]
      const agencyStatuses = ['pending', 'approved', 'rejected', 'offline']
      for (let i = 0; i < agencyStatuses.length; i += 1) {
        await tx.agencyApplication.create({
          data: {
            id: `${PREFIX}_agency_${i + 1}`,
            merchantId: merchant.id,
            factoryMerchantId: factoryFallbacks[i % factoryFallbacks.length],
            productIds: [productIds[i], productIds[(i + 1) % productIds.length]],
            markupPercent: 18 + i * 5,
            autoSyncPrice: i % 2 === 0,
            message: `qa1819 ${agencyStatuses[i]} 代理测试申请`,
            status: agencyStatuses[i],
          },
        })
      }

      const startAt = daysAgo(8)
      const endAt = new Date(Date.now() + 22 * 86400_000)
      await tx.merchantMembership.create({
        data: {
          id: `${PREFIX}_membership_ad_pro`,
          merchantId: merchant.id,
          planId: adProPlan.id,
          planCode: adProPlan.code,
          startAt,
          endAt,
          status: 'active',
          autoRenew: false,
        },
      })
      const periodStart = new Date()
      periodStart.setDate(1)
      periodStart.setHours(0, 0, 0, 0)
      const periodEnd = new Date(
        periodStart.getFullYear(),
        periodStart.getMonth() + 1,
        0,
        23,
        59,
        59,
      )
      await tx.usageQuota.create({
        data: {
          id: `${PREFIX}_usage_quota`,
          merchantId: merchant.id,
          planId: adProPlan.id,
          periodStart,
          periodEnd,
          data: { fixture: PREFIX, pushSlots: 30, bannerLimit: 10, impressionLimit: 50000 },
          pushSlotsUsed: 12,
          pushSlotsLimit: 30,
          bannerUsed: 4,
          bannerLimit: 10,
          impressionUsed: 18619,
          impressionLimit: 50000,
        },
      })
      const memberPaymentStatuses = ['paid', 'failed', 'refunded']
      for (let i = 0; i < memberPaymentStatuses.length; i += 1) {
        await tx.paymentRecord.create({
          data: {
            id: `${PREFIX}_member_payment_${i + 1}`,
            no: `${PREFIX}_member_payment_no_${i + 1}`,
            merchantId: merchant.id,
            planId: adProPlan.id,
            planName: adProPlan.name,
            planType: adProPlan.type,
            amount: adProPlan.price,
            paymentMethod: 'wechat',
            status: memberPaymentStatuses[i],
            paidAt: memberPaymentStatuses[i] === 'paid' ? startAt : null,
            refundReason: memberPaymentStatuses[i] === 'refunded' ? 'qa1819 内部退款测试' : null,
            createdAt: daysAgo(12 - i * 3),
          },
        })
      }

      const systemConfigs = [
        {
          key: `shop:${merchant.id}:priceRule`,
          value: {
            fixture: PREFIX,
            guestAllow: false,
            customerPrice: 'retail',
            agencyPrice: 'wholesale',
            memberPrice: 'member',
          },
        },
        {
          key: `shop:${merchant.id}:profile-extras`,
          value: {
            fixture: PREFIX,
            description: '仅用于内部全功能验收，不对顾客端开放。',
            avatar: 'https://picsum.photos/seed/qa1819-avatar/400/400',
            rating: 4.8,
            ratingCount: 1819,
            plazaVisibility: 'stores',
          },
        },
        {
          key: `${PREFIX}:${merchant.id}:analytics`,
          value: {
            fixture: PREFIX,
            trend30d: [18, 22, 31, 29, 45, 52, 61, 58, 72, 84, 91, 103],
            conversionRate: 18.19,
            repeatPurchaseRate: 26.8,
          },
        },
      ]
      for (let i = 0; i < customerRows.length; i += 1) {
        systemConfigs.push(
          {
            key: `cust_tier_${merchant.id}_${customerRows[i].id}`,
            value: { fixture: PREFIX, priceTier: ['member', 'agency', 'retail'][i] },
          },
          {
            key: `cust_auth_${merchant.id}_${customerRows[i].id}`,
            value: {
              fixture: PREFIX,
              authorized: i !== 2,
              authorizedAt: daysAgo(10).toISOString(),
            },
          },
          {
            key: `merchant:${merchant.id}:blacklist:${customerRows[i].id}`,
            value: {
              fixture: PREFIX,
              blocked: i === 2,
              reason: i === 2 ? 'qa1819 黑名单测试' : '',
            },
          },
        )
      }
      for (const config of systemConfigs) {
        await tx.systemConfig.create({ data: config })
      }

      await tx.auditRecord.createMany({
        data: [
          {
            id: `${PREFIX}_audit_merchant`,
            type: 'merchant',
            targetId: merchant.id,
            status: 'approved',
            auditorId: user.id,
            reason: 'qa1819 内部测试商户',
            reviewedAt: daysAgo(30),
          },
          {
            id: `${PREFIX}_audit_product_1`,
            type: 'product',
            targetId: productIds[6],
            status: 'pending',
            reason: 'qa1819 待审核商品',
          },
          {
            id: `${PREFIX}_audit_product_2`,
            type: 'product',
            targetId: productIds[7],
            status: 'rejected',
            auditorId: user.id,
            reason: 'qa1819 模拟驳回',
            reviewedAt: daysAgo(2),
          },
        ],
      })
    },
    { maxWait: 10_000, timeout: 120_000 },
  )

  const [after, summary] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id } }),
    Promise.all([
      prisma.product.count({ where: { merchantId: merchant.id } }),
      prisma.sku.count({ where: { product: { merchantId: merchant.id } } }),
      prisma.order.count({ where: { merchantId: merchant.id } }),
      prisma.refund.count({ where: { merchantId: merchant.id } }),
      prisma.store.count({ where: { merchantId: merchant.id } }),
      prisma.staff.count({ where: { merchantId: merchant.id } }),
      prisma.coupon.count({ where: { merchantId: merchant.id } }),
      prisma.chatSession.count({ where: { merchantId: merchant.id } }),
      prisma.agencyApplication.count({ where: { merchantId: merchant.id } }),
      prisma.merchantMembership.count({ where: { merchantId: merchant.id, status: 'active' } }),
    ]),
  ])
  if (!after || after.passwordHash !== originalPasswordHash) {
    throw new Error('严重错误：密码哈希未保持不变')
  }
  const [products, skus, orders, refunds, stores, staffs, coupons, chats, agencies, memberships] =
    summary
  if (products !== 10 || skus !== 25 || orders !== 12 || refunds !== 4) {
    throw new Error(
      `配置后数量校验失败：products=${products}, skus=${skus}, orders=${orders}, refunds=${refunds}`,
    )
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        phone: ALLOWED_PHONE,
        userId: user.id,
        merchantId: merchant.id,
        role: after.role,
        passwordHashPreserved: true,
        backupCreated,
        backupPath: BACKUP_PATH,
        counts: {
          products,
          skus,
          orders,
          refunds,
          stores,
          staffs,
          coupons,
          chats,
          agencies,
          memberships,
        },
      },
      null,
      2,
    ),
  )
}

provision()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
