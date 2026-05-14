/**
 * 数据库种子脚本 · 强关联演示数据
 *
 * 3 个核心账号，互相之间有完整的业务关联：
 *
 *   customer@demo (phone=13800000000, 密码=<SEED_DEFAULT_PASSWORD env>)
 *     ├─ 在 merchant@demo 下 5 个订单（不同状态：待付/待发/已发/完成/售后）
 *     ├─ 收藏 merchant@demo 的 3 个商品
 *     ├─ 购物车有 1 个 merchant@demo 的 SKU
 *     ├─ 给 merchant@demo 发了 1 条客服消息
 *     └─ 申请了 1 个退款（针对已完成订单）
 *
 *   merchant@demo (factory 角色, 密码=<SEED_DEFAULT_PASSWORD env>)
 *     ├─ 6 商品 + 18 SKU
 *     ├─ 1 门店 + 2 员工
 *     ├─ 已订阅"广告专业"套餐 + 缴费记录
 *     ├─ 客服会话（含 customer@demo 的消息）
 *     ├─ 待处理售后单（来自 customer@demo）
 *     ├─ 装修配置 + 优惠券 + 佣金规则
 *     └─ 已被 admin@demo 审核通过（status=active）
 *
 *   admin@demo (platform 角色, 密码=<SEED_DEFAULT_PASSWORD env>)
 *     ├─ 审核记录：通过了 merchant@demo 入驻
 *     ├─ 审核记录：通过了 merchant@demo 的 1 个商品
 *     └─ 平台运营角色（platform_ops）
 *
 * 运行：
 *   SEED_DEFAULT_PASSWORD=<至少 8 位强密码> pnpm --filter @jiujiu/server prisma:seed
 *
 * 安全 P0：脚本不再硬编码 "123456" 之类的弱口令；
 * 必须从环境变量 SEED_DEFAULT_PASSWORD 读取，缺失或长度 < 8 直接拒绝运行。
 * 这样避免 seed 完不小心被对外暴露默认账号。
 */
import { PrismaClient } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

async function clearAll() {
  console.log('🗑  清空所有业务表...')
  // 按外键依赖顺序逆向清空（子表 → 父表）
  await prisma.chatMessage.deleteMany()
  await prisma.chatSession.deleteMany()
  await prisma.quickReply.deleteMany()
  await prisma.refund.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.commission.deleteMany()
  await prisma.order.deleteMany()
  await prisma.cartItem.deleteMany()
  await prisma.favorite.deleteMany()
  await prisma.sku.deleteMany()
  await prisma.product.deleteMany()
  await prisma.commissionRule.deleteMany()
  await prisma.withdraw.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.coupon.deleteMany()
  await prisma.flashSale.deleteMany()
  await prisma.groupBuy.deleteMany()
  await prisma.agencyApplication.deleteMany()
  await prisma.paymentRecord.deleteMany()
  await prisma.usageQuota.deleteMany()
  await prisma.merchantMembership.deleteMany()
  await prisma.shopDecorate.deleteMany()
  await prisma.staff.deleteMany()
  await prisma.store.deleteMany()
  await prisma.merchantFeatureOverride.deleteMany()
  await prisma.merchant.deleteMany()
  await prisma.address.deleteMany()
  await prisma.smsCode.deleteMany()
  await prisma.user.deleteMany()
  await prisma.category.deleteMany()
  await prisma.adCreative.deleteMany()
  await prisma.adSlot.deleteMany()
  await prisma.plazaPush.deleteMany()
  await prisma.memberPlan.deleteMany()
  await prisma.featureFlag.deleteMany()
  await prisma.auditRecord.deleteMany()
  await prisma.adminRole.deleteMany()
  await prisma.uploadedFile.deleteMany()
  await prisma.systemConfig.deleteMany()
  console.log('   ✓ 所有表已清空')
}

async function main() {
  console.log('🌱 开始 seed...\n')

  // 安全 P0：禁止硬编码弱口令。强制从环境变量读取。
  const seedPass = process.env.SEED_DEFAULT_PASSWORD || ''
  if (!seedPass || seedPass.length < 8) {
    throw new Error(
      [
        '[seed] 拒绝运行：SEED_DEFAULT_PASSWORD 未设置或长度 < 8',
        '请在执行前设置该环境变量，例如：',
        '  SEED_DEFAULT_PASSWORD=<强密码> pnpm --filter @jiujiu/server prisma:seed',
      ].join('\n'),
    )
  }

  await clearAll()

  const passHash = await argon2.hash(seedPass)

  // ============ 1. 系统配置 ============
  await prisma.systemConfig.create({
    data: {
      key: 'platform',
      value: {
        name: '经纬科技',
        servicePhone: '400-888-8888',
        merchantLimit: 500,
        trialDays: 30,
        commissionPercent: 2,
      },
    },
  })
  await prisma.systemConfig.create({
    data: {
      key: 'banners',
      value: [
        { id: 'b1', image: 'https://picsum.photos/seed/jjbanner1/1200/500', title: '新春全场满 999-100', link: '' },
        { id: 'b2', image: 'https://picsum.photos/seed/jjbanner2/1200/500', title: '定制家具特惠 7 折起', link: '' },
        { id: 'b3', image: 'https://picsum.photos/seed/jjbanner3/1200/500', title: '会员日 · 享专属价', link: '' },
      ],
    },
  })
  await prisma.systemConfig.create({
    data: {
      key: 'system_settings',
      value: {
        site: { name: '经纬科技', logo: '', icp: '沪ICP备20260000号' },
        payment: { wechat: { enabled: true }, alipay: { enabled: false }, balance: { enabled: true } },
        logistics: { providers: ['顺丰', '京东', '中通', '圆通', '韵达'], defaultFreight: 10 },
        service: { phone: '400-888-8888', email: 'support@jiujiu.com', workTime: '9:00-18:00' },
        security: { passwordPolicy: { minLength: 8, requireUppercase: false }, ipWhitelist: [] },
      },
    },
  })

  // ============ 2. 角色 ============
  const rolePlatform = await prisma.adminRole.create({
    data: { code: 'platform_ops', name: '平台运营', description: '运营平台业务', permissions: ['merchant.*', 'product.audit.*', 'ad.*', 'plaza.*', 'member.*'], isSystem: true },
  })
  await prisma.adminRole.create({
    data: { code: 'super', name: '超级管理员', description: '拥有全部权限', permissions: ['*'], isSystem: true },
  })
  await prisma.adminRole.createMany({
    data: [
      { code: 'auditor', name: '审核员', description: '审核商户和商品', permissions: ['audit.merchant', 'audit.product'], isSystem: false },
      { code: 'cs', name: '客服', description: '处理订单和投诉', permissions: ['order.read', 'complaint.*'], isSystem: false },
      { code: 'finance', name: '财务', description: '支付和佣金', permissions: ['pay.*', 'commission.*'], isSystem: false },
    ],
  })

  // ============ 3. 平台 4 大分类 + 19 子分类 ============
  const cats = [
    { id: 'cat-furniture', name: '家具', icon: '🛋️', sort: 1, children: ['沙发', '床垫', '餐桌椅', '书桌', '衣柜'] },
    { id: 'cat-curtain', name: '窗帘布艺', icon: '🪟', sort: 2, children: ['窗帘', '抱枕', '地毯', '桌布'] },
    { id: 'cat-lighting', name: '灯具', icon: '💡', sort: 3, children: ['吊灯', '台灯', '射灯', '落地灯'] },
    { id: 'cat-deco', name: '装饰', icon: '🖼️', sort: 4, children: ['挂画', '花瓶', '香薰', '摆件', '壁纸', '镜子'] },
  ]
  for (const c of cats) {
    await prisma.category.create({
      data: { id: c.id, name: c.name, icon: c.icon, sort: c.sort, type: 'platform' },
    })
    for (let i = 0; i < c.children.length; i++) {
      await prisma.category.create({
        data: { id: `${c.id}-${i}`, name: c.children[i], parentId: c.id, sort: i, type: 'platform' },
      })
    }
  }
  console.log('  ✓ 4 平台分类 + 19 子分类')

  // ============ 4. 三个核心账号 ============

  // 4.1 admin@demo  (平台运营)
  const adminUser = await prisma.user.create({
    data: {
      username: 'admin@demo',
      email: 'admin@demo',
      nickname: '平台运营',
      passwordHash: passHash,
      role: 'platform',
      adminRoleId: rolePlatform.id,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      lastLoginAt: new Date(),
    },
  })

  // 4.2 merchant@demo (厂家) + 关联 Merchant
  const merchantUser = await prisma.user.create({
    data: {
      username: 'merchant@demo',
      email: 'merchant@demo',
      nickname: '经纬科技',
      passwordHash: passHash,
      role: 'factory',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=merchant',
      lastLoginAt: new Date(),
    },
  })
  const merchantBiz = await prisma.merchant.create({
    data: {
      userId: merchantUser.id,
      type: 'factory',
      name: '经纬科技',
      legalName: '上海经纬科技有限公司',
      creditCode: '91310000MA1FL00012',
      legalRep: '张明华',
      contact: '李经理',
      contactPhone: '13912340001',
      region: '上海市浦东新区',
      address: '上海市浦东新区张江高科技园区博云路 12 号',
      businessLicense: 'https://picsum.photos/seed/license/600/400',
      qualifications: [
        'https://picsum.photos/seed/qual1/600/400',
        'https://picsum.photos/seed/qual2/600/400',
      ],
      categories: ['cat-furniture', 'cat-curtain', 'cat-lighting'],
      status: 'active',
      level: 'A',
      credit: 'A',
      totalGmv: 528000,
    },
  })

  // 4.3 customer@demo (顾客)
  const customerUser = await prisma.user.create({
    data: {
      phone: '13800000000',
      nickname: '小九',
      passwordHash: passHash,
      role: 'customer',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=customer',
      lastLoginAt: new Date(),
    },
  })

  console.log('  ✓ 3 核心账号 (admin@demo / merchant@demo / 13800000000)')

  // 4.4 选品广场：2 个示意厂家（无登录账号，仅作为生态数据）
  const otherFactoriesSeed = [
    { name: '舒馨家具厂', region: '广东省佛山市', cats: ['cat-furniture'], gmv: 380000, level: 'A', credit: 'A', logo: 'https://picsum.photos/seed/factory_shuxin/200/200', tags: ['工厂直供', '新品'], products: [
      { name: '北欧布艺懒人沙发', cat: 'cat-furniture', retail: 1888, wholesale: 1188 },
      { name: '原木双人床架', cat: 'cat-furniture', retail: 2299, wholesale: 1499 },
      { name: '人体工学办公椅', cat: 'cat-furniture', retail: 999, wholesale: 599 },
    ] },
    { name: '云朵窗帘厂', region: '浙江省杭州市', cats: ['cat-curtain'], gmv: 220000, level: 'B', credit: 'A', logo: 'https://picsum.photos/seed/factory_yunduo/200/200', tags: ['爆款', '限时'], products: [
      { name: '高遮光卧室窗帘', cat: 'cat-curtain', retail: 459, wholesale: 269 },
      { name: '法式重工提花窗帘', cat: 'cat-curtain', retail: 899, wholesale: 569 },
      { name: '北欧棉麻抱枕套', cat: 'cat-curtain', retail: 89, wholesale: 49 },
    ] },
    { name: '智享灯具厂', region: '广东省中山市', cats: ['cat-lighting'], gmv: 156000, level: 'B', credit: 'B', logo: 'https://picsum.photos/seed/factory_zhixiang/200/200', tags: ['高佣金'], products: [
      { name: '智能感应客厅吸顶灯', cat: 'cat-lighting', retail: 1299, wholesale: 799 },
      { name: 'LED 落地阅读灯', cat: 'cat-lighting', retail: 599, wholesale: 379 },
    ] },
  ]
  for (let f = 0; f < otherFactoriesSeed.length; f++) {
    const of = otherFactoriesSeed[f]
    const ghostUser = await prisma.user.create({
      data: {
        username: `factory_${f}@platform`,
        nickname: of.name + '管理员',
        passwordHash: passHash,
        role: 'factory',
        avatar: of.logo,
      },
    })
    const ghostMerchant = await prisma.merchant.create({
      data: {
        userId: ghostUser.id,
        type: 'factory',
        name: of.name,
        legalName: of.name + '有限公司',
        creditCode: `9133${String(Date.now()).slice(-12)}${f}`,
        legalRep: '法人代表',
        contact: '联系人',
        contactPhone: `13900100${String(f + 1).padStart(2, '0')}`,
        region: of.region,
        address: of.region + '工业园区',
        businessLicense: of.logo,
        qualifications: [of.logo],
        categories: of.cats,
        status: 'active',
        level: of.level,
        credit: of.credit,
        totalGmv: of.gmv,
      },
    })
    // 给每个厂家创建商品
    for (let pi = 0; pi < of.products.length; pi++) {
      const pp = of.products[pi]
      const newProd = await prisma.product.create({
        data: {
          merchantId: ghostMerchant.id,
          categoryId: pp.cat,
          name: pp.name,
          description: `${of.name} · ${pp.name}`,
          images: [
            `https://picsum.photos/seed/f${f}_p${pi}_a/800/800`,
            `https://picsum.photos/seed/f${f}_p${pi}_b/800/800`,
          ],
          tags: of.tags,
          priceRetailMin: pp.retail,
          priceRetailMax: pp.retail + 500,
          priceWholesaleMin: pp.wholesale,
          priceWholesaleMax: pp.wholesale + 300,
          priceMemberMin: Math.round(pp.retail * 0.85),
          priceMemberMax: Math.round(pp.retail * 0.85) + 400,
          shipping: ['factory'],
          status: 'active',
          totalStock: 150,
          sales: 30 + pi * 15,
          commentCount: 12 + pi * 5,
          priceDisplayRules: { guestVisible: true, customerTier: 'retail', storeTier: 'wholesale', memberTier: 'member' },
        },
      })
      const colors = ['原木色', '深胡桃']
      for (const c of colors) {
        await prisma.sku.create({
          data: {
            productId: newProd.id,
            specs: { color: c },
            specsLabel: c,
            priceWholesale: pp.wholesale,
            priceRetail: pp.retail,
            priceMember: Math.round(pp.retail * 0.85),
            stock: 50,
          },
        })
      }
    }
  }
  console.log(`  ✓ ${otherFactoriesSeed.length} 选品广场示意厂家（共 ${otherFactoriesSeed.reduce((s, f) => s + f.products.length, 0)} 商品）`)

  // 4.4 客户地址（2 条）
  const addr1 = await prisma.address.create({
    data: {
      userId: customerUser.id,
      name: '小九',
      phone: '13800000000',
      region: '上海市浦东新区',
      detail: '世纪大道 1000 号嘉里中心 A 座 1801',
      isDefault: true,
    },
  })
  await prisma.address.create({
    data: {
      userId: customerUser.id,
      name: '小九（公司）',
      phone: '13800000000',
      region: '上海市黄浦区',
      detail: '南京西路 1118 号梅龙镇广场 8 楼',
      isDefault: false,
    },
  })

  // ============ 5. merchant@demo 拥有的商品 ============
  type ProdSeed = { name: string; cat: string; baseRetail: number; baseWholesale: number; baseMember: number; sales: number; comments: number }
  const productsSeed: ProdSeed[] = [
    { name: '北欧三人布艺沙发', cat: 'cat-furniture', baseRetail: 2999, baseWholesale: 2199, baseMember: 2599, sales: 128, comments: 56 },
    { name: '实木餐桌椅四件套', cat: 'cat-furniture', baseRetail: 1599, baseWholesale: 1099, baseMember: 1299, sales: 89, comments: 38 },
    { name: '现代简约客厅地毯', cat: 'cat-curtain', baseRetail: 599, baseWholesale: 399, baseMember: 499, sales: 234, comments: 102 },
    { name: '北欧风遮光窗帘', cat: 'cat-curtain', baseRetail: 399, baseWholesale: 259, baseMember: 329, sales: 178, comments: 81 },
    { name: 'LED 北欧吊灯', cat: 'cat-lighting', baseRetail: 899, baseWholesale: 599, baseMember: 749, sales: 67, comments: 28 },
    { name: '可调光床头台灯', cat: 'cat-lighting', baseRetail: 199, baseWholesale: 129, baseMember: 169, sales: 312, comments: 145 },
  ]

  const productIds: string[] = []
  for (let i = 0; i < productsSeed.length; i++) {
    const ps = productsSeed[i]
    const product = await prisma.product.create({
      data: {
        merchantId: merchantBiz.id,
        categoryId: ps.cat,
        name: ps.name,
        description: `${ps.name} · 经纬科技精选品质`,
        images: [
          `https://picsum.photos/seed/jjp${i}_a/800/800`,
          `https://picsum.photos/seed/jjp${i}_b/800/800`,
          `https://picsum.photos/seed/jjp${i}_c/800/800`,
        ],
        tags: i % 2 === 0 ? ['新品', '热销'] : ['推荐'],
        priceRetailMin: ps.baseRetail,
        priceRetailMax: ps.baseRetail + 1000,
        priceWholesaleMin: ps.baseWholesale,
        priceWholesaleMax: ps.baseWholesale + 700,
        priceMemberMin: ps.baseMember,
        priceMemberMax: ps.baseMember + 800,
        shipping: ['factory', 'local'],
        status: 'active',
        totalStock: 200,
        sales: ps.sales,
        commentCount: ps.comments,
        priceDisplayRules: {
          guestVisible: true,
          customerTier: 'retail',
          storeTier: 'wholesale',
          memberTier: 'member',
        },
      },
    })
    productIds.push(product.id)

    // 每个商品 3 个 SKU
    const colors = ['原木色', '深胡桃', '北欧白']
    for (let j = 0; j < colors.length; j++) {
      await prisma.sku.create({
        data: {
          productId: product.id,
          specs: { color: colors[j] },
          specsLabel: colors[j],
          priceWholesale: ps.baseWholesale + j * 100,
          priceRetail: ps.baseRetail + j * 200,
          priceMember: ps.baseMember + j * 150,
          stock: 50 + j * 20,
        },
      })
    }
  }
  console.log(`  ✓ ${productsSeed.length} 商品 + ${productsSeed.length * 3} SKU（merchant@demo 持有）`)

  // ============ 6. merchant 周边业务数据 ============
  // 6.1 1 个门店
  await prisma.store.create({
    data: {
      merchantId: merchantBiz.id,
      name: '经纬科技 · 浦东体验店',
      contact: '张店长',
      phone: '13912340002',
      region: '上海市浦东新区',
      address: '世纪大道 88 号震旦国际大厦 1 楼',
      longitude: 121.5054,
      latitude: 31.2363,
      level: 'A',
      status: 'active',
      authValidFrom: new Date(),
      authValidTo: new Date(Date.now() + 365 * 86400_000),
      authConfig: {
        visiblePriceTiers: ['retail', 'wholesale', 'member'],
        categories: ['cat-furniture', 'cat-curtain'],
        markupRatio: 10,
      },
    },
  })

  // 6.2 2 个员工
  await prisma.staff.createMany({
    data: [
      { merchantId: merchantBiz.id, name: '王晓琳', phone: '13900100001', role: 'sales', status: 'active', monthlyPerformance: 12800 },
      { merchantId: merchantBiz.id, name: '陈志强', phone: '13900100002', role: 'cs', status: 'active', monthlyPerformance: 0 },
    ],
  })

  // 6.3 装修
  await prisma.shopDecorate.create({
    data: {
      merchantId: merchantBiz.id,
      themeColor: '#FF4D2D',
      fontStyle: 'modern',
      productLayout: 'twoColumn',
      cornerStyle: 'soft',
      banners: [
        { id: 'b1', image: 'https://picsum.photos/seed/decob1/750/300', link: '' },
        { id: 'b2', image: 'https://picsum.photos/seed/decob2/750/300', link: '' },
      ] as any,
      modules: [
        { id: 'm1', type: 'banner', sort: 1 },
        { id: 'm2', type: 'category', sort: 2 },
        { id: 'm3', type: 'product-list', sort: 3 },
      ] as any,
    },
  })

  // 6.4 优惠券
  await prisma.coupon.create({
    data: {
      merchantId: merchantBiz.id,
      name: '满 999 减 100',
      type: 'fullReduce',
      amount: 100,
      threshold: 999,
      stock: 500,
      received: 128,
      used: 67,
      validFrom: new Date(Date.now() - 7 * 86400_000),
      validTo: new Date(Date.now() + 30 * 86400_000),
      perUserLimit: 1,
      scope: 'all',
      status: 'active',
    },
  })

  // 6.5 佣金规则
  await prisma.commissionRule.create({
    data: {
      merchantId: merchantBiz.id,
      productId: null,
      level1Percent: 8,
      level2Percent: 2,
      visibleToPromoter: true,
      allowOffline: false,
      enabled: true,
    },
  })

  // 6.6 快捷回复
  await prisma.quickReply.createMany({
    data: [
      { merchantId: merchantBiz.id, label: '欢迎语', content: '您好，欢迎光临经纬科技，请问需要什么帮助？', sort: 1 },
      { merchantId: merchantBiz.id, label: '尺寸咨询', content: '我们可以根据您家空间定制尺寸，请告知长×宽×高（cm）', sort: 2 },
      { merchantId: merchantBiz.id, label: '物流时效', content: '现货 24h 内发货，定制款 7-15 天交付', sort: 3 },
    ],
  })

  // ============ 7. 会员套餐 + merchant@demo 订阅 ============
  const plans = [
    { type: 'basic', code: 'basic_monthly', name: '基础月会员', price: 99, originalPrice: 199, period: 'monthly', periodCount: 1, hot: false, rights: ['店铺装修', '基础数据', '客服'], constraints: { pushSlots: 5, bannerLimit: 2, impressionLimit: 5000 }, sort: 1 },
    { type: 'basic', code: 'basic_yearly', name: '基础年会员', price: 999, originalPrice: 2388, period: 'yearly', periodCount: 1, hot: true, rights: ['店铺装修', '基础数据', '客服', '广告投放优先级'], constraints: { pushSlots: 60, bannerLimit: 24, impressionLimit: 60000 }, sort: 2 },
    { type: 'ad', code: 'ad_basic', name: '广告基础', price: 299, originalPrice: 599, period: 'monthly', periodCount: 1, hot: false, rights: ['首页 Banner ×3', '推送 ×10'], constraints: { pushSlots: 10, bannerLimit: 3, impressionLimit: 10000 }, sort: 3 },
    { type: 'ad', code: 'ad_pro', name: '广告专业', price: 999, originalPrice: 1999, period: 'monthly', periodCount: 1, hot: true, rights: ['首页 Banner ×10', '推送 ×30', '专属客服'], constraints: { pushSlots: 30, bannerLimit: 10, impressionLimit: 50000 }, sort: 4 },
    { type: 'addon', code: 'addon_quota_push_50', name: '推送加包 50 次', price: 99, period: 'oneoff', periodCount: 1, rights: ['+50 次推送'], constraints: { pushSlots: 50 }, sort: 5 },
    { type: 'addon', code: 'addon_quota_banner_5', name: 'Banner 加包 5 次', price: 79, period: 'oneoff', periodCount: 1, rights: ['+5 次 Banner'], constraints: { bannerLimit: 5 }, sort: 6 },
  ]
  for (const p of plans) {
    await prisma.memberPlan.create({
      data: { ...p, rights: p.rights as any, constraints: p.constraints as any },
    })
  }

  const adProPlan = await prisma.memberPlan.findUnique({ where: { code: 'ad_pro' } })
  if (adProPlan) {
    const startAt = new Date(Date.now() - 7 * 86400_000)
    const endAt = new Date(startAt.getTime() + 30 * 86400_000)
    await prisma.merchantMembership.create({
      data: {
        merchantId: merchantBiz.id,
        planId: adProPlan.id,
        planCode: adProPlan.code,
        startAt,
        endAt,
        status: 'active',
        autoRenew: true,
      },
    })
    await prisma.paymentRecord.create({
      data: {
        no: `MP${Date.now()}001`,
        merchantId: merchantBiz.id,
        planId: adProPlan.id,
        planName: adProPlan.name,
        planType: adProPlan.type,
        amount: adProPlan.price,
        paymentMethod: 'wechat',
        status: 'paid',
        paidAt: startAt,
      },
    })
    // 使用配额
    const periodStart = new Date(); periodStart.setDate(1); periodStart.setHours(0, 0, 0, 0)
    const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0)
    await prisma.usageQuota.create({
      data: {
        merchantId: merchantBiz.id,
        planId: adProPlan.id,
        periodStart,
        periodEnd,
        data: { pushSlots: 30, bannerLimit: 10, impressionLimit: 50000 },
        pushSlotsLimit: 30, pushSlotsUsed: 8,
        bannerLimit: 10, bannerUsed: 3,
        impressionLimit: 50000, impressionUsed: 12450,
      },
    })
  }
  console.log('  ✓ 6 会员套餐 + merchant@demo 已订阅广告专业 + 使用配额')

  // ============ 8. customer@demo 的订单（5 个不同状态，全部针对 merchant@demo）============
  const skuList = await prisma.sku.findMany({
    where: { product: { merchantId: merchantBiz.id } },
    include: { product: true },
  })

  const orderSeeds = [
    { status: 'pending_payment', skuIdx: 0, qty: 1, daysAgo: 0,   hoursAgo: 0.5,  expires: 30 * 60_000, label: '刚下单待付款' },
    { status: 'pending_shipment', skuIdx: 2, qty: 2, daysAgo: 0,  hoursAgo: 4,    paid: true,           label: '已付款待发货' },
    { status: 'shipped',          skuIdx: 5, qty: 1, daysAgo: 2,  hoursAgo: 0,    paid: true, shipped: true, label: '已发货' },
    { status: 'completed',        skuIdx: 8, qty: 1, daysAgo: 14, hoursAgo: 0,    paid: true, shipped: true, completed: true, label: '已完成' },
    { status: 'after_sale',       skuIdx: 11, qty: 1, daysAgo: 9, hoursAgo: 0,    paid: true, shipped: true, completed: true, label: '售后中' },
  ]

  const orderIds: { id: string; status: string; itemId: string }[] = []
  for (let i = 0; i < orderSeeds.length; i++) {
    const os = orderSeeds[i]
    const sku = skuList[os.skuIdx]
    if (!sku) continue
    const createdAt = new Date(Date.now() - os.daysAgo * 86400_000 - (os.hoursAgo || 0) * 3600_000)
    const itemAmount = Number(sku.priceRetail) * os.qty
    const shippingFee = 10
    const payAmount = itemAmount + shippingFee

    const order = await prisma.order.create({
      data: {
        no: `ORD${createdAt.getFullYear()}${String(createdAt.getMonth() + 1).padStart(2, '0')}${String(createdAt.getDate()).padStart(2, '0')}${String(i + 100).padStart(4, '0')}`,
        userId: customerUser.id,
        merchantId: merchantBiz.id,
        status: os.status,
        totalAmount: itemAmount,
        shippingFee,
        payAmount,
        shippingMethod: 'factory',
        paymentMethod: os.paid ? 'wechat' : null,
        address: {
          name: addr1.name,
          phone: addr1.phone,
          region: addr1.region,
          detail: addr1.detail,
        } as any,
        remark: i === 0 ? '请尽快发货，谢谢' : undefined,
        expiresAt: os.expires ? new Date(createdAt.getTime() + os.expires) : null,
        paidAt: os.paid ? new Date(createdAt.getTime() + 60_000) : null,
        shippedAt: os.shipped ? new Date(createdAt.getTime() + 4 * 3600_000) : null,
        completedAt: os.completed ? new Date(createdAt.getTime() + 7 * 86400_000) : null,
        trackingCompany: os.shipped ? '顺丰' : null,
        trackingNumber: os.shipped ? `SF${1000000000 + i}` : null,
        createdAt,
      },
    })
    const orderItem = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: sku.productId,
        skuId: sku.id,
        productName: sku.product.name,
        productImage: sku.product.images[0] || '',
        specsLabel: sku.specsLabel,
        unitPrice: sku.priceRetail,
        quantity: os.qty,
      },
    })
    if (os.paid) {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          method: 'wechat',
          amount: payAmount,
          status: 'success',
          wxTransactionId: `wx${createdAt.getTime()}`,
          paidAt: new Date(createdAt.getTime() + 60_000),
        },
      })
    }
    orderIds.push({ id: order.id, status: os.status, itemId: orderItem.id })
  }
  console.log(`  ✓ ${orderIds.length} 订单（customer@demo 在 merchant@demo 处的全状态订单）`)

  // ============ 9. 售后单（基于"售后中"订单）============
  const afterSaleOrder = orderIds.find((o) => o.status === 'after_sale')
  if (afterSaleOrder) {
    await prisma.refund.create({
      data: {
        no: `R${Date.now()}01`,
        orderId: afterSaleOrder.id,
        orderItemId: afterSaleOrder.itemId,
        userId: customerUser.id,
        merchantId: merchantBiz.id,
        type: 'refund_with_return',
        reason: '商品有瑕疵',
        description: '收到时发现台灯灯罩有轻微划痕，且开关接触不良，希望退货退款',
        evidence: [
          'https://picsum.photos/seed/refund1/600/600',
          'https://picsum.photos/seed/refund2/600/600',
        ],
        applyAmount: 209,
        status: 'pending',
      },
    })
    console.log('  ✓ 1 售后申请（pending，待 merchant@demo 处理）')
  }

  // ============ 10. 收藏 + 购物车（customer→merchant 的商品）============
  for (let i = 0; i < 3; i++) {
    await prisma.favorite.create({
      data: { userId: customerUser.id, productId: productIds[i] },
    })
  }
  // 购物车：1 个 SKU
  if (skuList[1]) {
    await prisma.cartItem.create({
      data: {
        userId: customerUser.id,
        productId: skuList[1].productId,
        skuId: skuList[1].id,
        quantity: 2,
      },
    })
  }
  console.log('  ✓ customer@demo 收藏 3 个商品 + 购物车 1 个 SKU')

  // ============ 11. 客服会话（customer ↔ merchant）============
  const session = await prisma.chatSession.create({
    data: {
      userId: customerUser.id,
      merchantId: merchantBiz.id,
      lastMessageAt: new Date(),
      unreadCount: 1,
      status: 'open',
    },
  })
  await prisma.chatMessage.createMany({
    data: [
      { sessionId: session.id, sender: 'user', type: 'text', content: '您好，请问北欧三人布艺沙发可以定制尺寸吗？', read: true, createdAt: new Date(Date.now() - 2 * 3600_000) },
      { sessionId: session.id, sender: 'merchant', type: 'quick', content: '我们可以根据您家空间定制尺寸，请告知长×宽×高（cm）', read: true, createdAt: new Date(Date.now() - 2 * 3600_000 + 30_000) },
      { sessionId: session.id, sender: 'user', type: 'text', content: '我的客厅是 320×220 cm，能做吗？', read: true, createdAt: new Date(Date.now() - 1.5 * 3600_000) },
      { sessionId: session.id, sender: 'merchant', type: 'text', content: '可以的！标准款最大 320cm。我帮您留意一下材质和颜色偏好？', read: true, createdAt: new Date(Date.now() - 1.5 * 3600_000 + 60_000) },
      { sessionId: session.id, sender: 'user', type: 'text', content: '想要原木色，但听说现货只有北欧白？', read: false, createdAt: new Date(Date.now() - 10 * 60_000) },
    ],
  })
  console.log('  ✓ 1 客服会话 + 5 条消息（customer ↔ merchant，未读 1 条）')

  // ============ 12. 审核记录（admin@demo 审过 merchant 入驻 + 1 商品）============
  await prisma.auditRecord.create({
    data: {
      type: 'merchant',
      targetId: merchantBiz.id,
      status: 'approved',
      auditorId: adminUser.id,
      reviewedAt: new Date(Date.now() - 30 * 86400_000),
    },
  })
  await prisma.auditRecord.create({
    data: {
      type: 'product',
      targetId: productIds[0],
      status: 'approved',
      auditorId: adminUser.id,
      reviewedAt: new Date(Date.now() - 25 * 86400_000),
    },
  })
  console.log('  ✓ admin@demo 审核记录：1 商户入驻 + 1 商品上架')

  // ============ 13. 广告位 ============
  const slots = [
    { code: 'mp_home_banner', name: '小程序首页轮播', scene: '用户端首页', target: 'customer', position: 'top', size: '750x300', sort: 1 },
    { code: 'merchant_home_card', name: '商家 APP 首页广告卡', scene: '商家端首页', target: 'factory', sort: 2 },
    { code: 'mp_detail_top', name: '商品详情顶部', scene: '用户端详情', target: 'customer', sort: 3 },
    { code: 'mp_splash', name: '开屏广告', scene: '用户端启动', target: 'all', sort: 4 },
    { code: 'wheel_reward', name: '推广转盘', scene: '推广中心', target: 'customer', sort: 5 },
  ]
  for (const s of slots) {
    await prisma.adSlot.create({ data: { ...s, enabled: true, status: 'active' } })
  }

  // ============ 14. 功能开关 ============
  const flags = [
    { key: 'home.entry.orderManagement', label: '订单管理入口', group: 'home_entry', defaultEnabled: true, sort: 1 },
    { key: 'home.entry.productManagement', label: '商品管理入口', group: 'home_entry', defaultEnabled: true, sort: 2 },
    { key: 'home.entry.marketing', label: '营销入口', group: 'home_entry', defaultEnabled: true, sort: 3 },
    { key: 'home.entry.plaza', label: '选品广场入口', group: 'home_entry', defaultEnabled: true, sort: 4 },
    { key: 'role.button.exportData', label: '数据导出', group: 'role_button', defaultEnabled: true, sort: 1 },
    { key: 'role.button.bulkAction', label: '批量操作', group: 'role_button', defaultEnabled: true, sort: 2 },
    { key: 'side.menu.commission', label: '佣金菜单', group: 'side_menu', defaultEnabled: true, sort: 1 },
    { key: 'side.menu.decorate', label: '装修菜单', group: 'side_menu', defaultEnabled: true, sort: 2 },
  ]
  for (const f of flags) {
    await prisma.featureFlag.create({ data: f })
  }

  console.log('\n✅ Seed 完成。关联关系总览：')
  console.log('   admin@demo  → 审核了 merchant@demo 入驻 + 1 件商品')
  console.log('   merchant@demo → 6 商品 / 18 SKU / 1 门店 / 2 员工 / 装修 / 优惠券 / 佣金规则 / 广告专业套餐')
  console.log('   customer@demo (13800000000) → 在 merchant@demo 下 5 单（待付/待发/已发/完成/售后）')
  console.log('                              → 收藏 3 商品 + 购物车 1 SKU + 客服 1 会话(5 消息)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
