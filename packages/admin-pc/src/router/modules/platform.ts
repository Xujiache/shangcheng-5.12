import { AppRouteRecord } from '@/types/router'

/**
 * 平台工作台路由（S5 · 共 13 屏 · 2 顶级 + 5 分组）
 *
 * meta.roles 只包含 'platform'。
 * 超管账号通过 currentWorkspace='platform' 派生出相同权限。
 *
 * 分组结构：
 *   ├─ 驾驶舱（dashboard, 顶级）
 *   ├─ 数据中心（data-center, 顶级）
 *   ├─ 运营管理（merchant/list, order/list）
 *   ├─ 审核中心（audit/merchant, audit/product）
 *   ├─ 营销中心（ad, plaza）
 *   ├─ 会员与支付（member/plan, member/orders）
 *   └─ 系统配置（permission, system, feature-flag）
 */

const ROLE_PLATFORM = { roles: ['platform'] as string[] }

export const platformRoutes: AppRouteRecord = {
  name: 'PlatformConsole',
  path: '/platform',
  component: '/index/index',
  meta: {
    title: 'menus.platform.title',
    icon: 'ri:building-line',
    roles: ['platform']
  },
  children: [
    // ============ 1. 驾驶舱 ============
    {
      path: 'dashboard',
      name: 'PlatformDashboard',
      component: '/platform/dashboard',
      meta: {
        title: 'menus.platform.dashboard',
        icon: 'ri:dashboard-line',
        keepAlive: false,
        fixedTab: true,
        ...ROLE_PLATFORM
      }
    },

    // ============ 2. 数据中心 ============
    {
      path: 'data-center',
      name: 'PlatformDataCenter',
      component: '/platform/data-center',
      meta: {
        title: 'menus.platform.dataCenter',
        icon: 'ri:bar-chart-2-line',
        keepAlive: true,
        ...ROLE_PLATFORM
      }
    },

    // ============ 3. 运营管理 ============
    {
      path: 'ops',
      meta: {
        title: 'menus.platform.groupOps',
        icon: 'ri:shopping-cart-2-line',
        ...ROLE_PLATFORM
      },
      children: [
        {
          path: '/platform/merchant/list',
          name: 'PlatformMerchantList',
          component: '/platform/merchant/list',
          meta: {
            title: 'menus.platform.merchantList',
            icon: 'ri:store-2-line',
            keepAlive: true,
            ...ROLE_PLATFORM
          }
        },
        {
          path: '/platform/order/list',
          name: 'PlatformOrderList',
          component: '/platform/order/list',
          meta: {
            title: 'menus.platform.orderList',
            icon: 'ri:bill-line',
            keepAlive: true,
            ...ROLE_PLATFORM
          }
        }
      ]
    },

    // ============ 4. 审核中心 ============
    {
      path: 'audit',
      meta: {
        title: 'menus.platform.groupAudit',
        icon: 'ri:shield-check-line',
        ...ROLE_PLATFORM
      },
      children: [
        {
          path: 'merchant',
          name: 'PlatformAuditMerchant',
          component: '/platform/audit/merchant',
          meta: {
            title: 'menus.platform.auditMerchant',
            icon: 'ri:checkbox-multiple-line',
            keepAlive: true,
            ...ROLE_PLATFORM
          }
        },
        {
          path: 'product',
          name: 'PlatformAuditProduct',
          component: '/platform/audit/product',
          meta: {
            title: 'menus.platform.auditProduct',
            icon: 'ri:price-tag-2-line',
            keepAlive: true,
            ...ROLE_PLATFORM
          }
        },
        {
          // 与后端 GET /api/v1/p/audit/records 对齐：审核流转日志（商家/商品通批驳记录）
          path: 'records',
          name: 'PlatformAuditRecord',
          component: '/platform/audit-record',
          meta: {
            title: 'menus.platform.auditRecord',
            icon: 'ri:history-line',
            keepAlive: true,
            ...ROLE_PLATFORM
          }
        }
      ]
    },

    // ============ 5. 营销中心 ============
    {
      path: 'marketing',
      meta: {
        title: 'menus.platform.groupMarketing',
        icon: 'ri:megaphone-line',
        ...ROLE_PLATFORM
      },
      children: [
        {
          path: '/platform/ad',
          name: 'PlatformAd',
          component: '/platform/ad',
          meta: {
            title: 'menus.platform.ad',
            icon: 'ri:advertisement-line',
            keepAlive: true,
            ...ROLE_PLATFORM
          }
        },
        {
          path: '/platform/plaza',
          name: 'PlatformPlaza',
          component: '/platform/plaza',
          meta: {
            title: 'menus.platform.plaza',
            icon: 'ri:store-3-line',
            keepAlive: true,
            ...ROLE_PLATFORM
          }
        }
      ]
    },

    // ============ 6. 会员与支付 ============
    {
      path: 'member',
      meta: {
        title: 'menus.platform.groupMember',
        icon: 'ri:vip-crown-2-line',
        ...ROLE_PLATFORM
      },
      children: [
        {
          path: 'plan',
          name: 'PlatformMemberPlan',
          component: '/platform/member/plan',
          meta: {
            title: 'menus.platform.memberPlan',
            icon: 'ri:medal-line',
            keepAlive: true,
            ...ROLE_PLATFORM
          }
        },
        {
          path: 'orders',
          name: 'PlatformPayOrders',
          component: '/platform/member/orders',
          meta: {
            title: 'menus.platform.payOrders',
            icon: 'ri:money-cny-circle-line',
            keepAlive: true,
            ...ROLE_PLATFORM
          }
        },
        {
          // 平台层提现审核：商家提交申请 → 平台通过 → 标记打款
          // 后端 /p/withdraws (list/approve/reject/mark-paid) 已实现，
          // 这里挂在「会员与支付」分组下，与缴费订单同维度。
          path: '/platform/withdraws',
          name: 'PlatformWithdraws',
          component: '/platform/withdraws',
          meta: {
            title: '提现审核',
            icon: 'ri:wallet-line',
            keepAlive: true,
            ...ROLE_PLATFORM
          }
        }
      ]
    },

    // ============ 6.6 门窗利账 ============
    // 门窗利账小程序的运营后台：平台运营创建 / 启停账号、重置密码、为账号充值
    // 会员时长并查看变更记录。后端 /api/v1/p/ledger/* 走平台 / 超管鉴权。
    {
      path: 'ledger',
      meta: {
        title: 'menus.platform.groupLedger',
        icon: 'ri:wallet-3-line',
        ...ROLE_PLATFORM
      },
      children: [
        {
          path: '/platform/ledger/accounts',
          name: 'PlatformLedgerAccounts',
          component: '/platform/ledger/accounts',
          meta: {
            title: 'menus.platform.ledgerAccounts',
            icon: 'ri:wallet-3-line',
            keepAlive: true,
            ...ROLE_PLATFORM
          }
        },
        {
          path: '/platform/ledger/membership',
          name: 'PlatformLedgerMembership',
          component: '/platform/ledger/membership',
          meta: {
            title: 'menus.platform.ledgerMembership',
            icon: 'ri:vip-crown-2-line',
            keepAlive: true,
            ...ROLE_PLATFORM
          }
        },
        {
          path: '/platform/ledger/feedback',
          name: 'PlatformLedgerFeedback',
          component: '/platform/ledger/feedback',
          meta: {
            title: 'menus.platform.ledgerFeedback',
            icon: 'ri:feedback-line',
            keepAlive: true,
            ...ROLE_PLATFORM
          }
        },
        {
          path: '/platform/ledger/ads',
          name: 'PlatformLedgerAds',
          component: '/platform/ledger/ads',
          meta: {
            title: 'menus.platform.ledgerAds',
            icon: 'ri:image-line',
            keepAlive: true,
            ...ROLE_PLATFORM
          }
        },
        {
          path: '/platform/ledger/config',
          name: 'PlatformLedgerConfig',
          component: '/platform/ledger/config',
          meta: {
            title: 'menus.platform.ledgerConfig',
            icon: 'ri:settings-3-line',
            keepAlive: true,
            ...ROLE_PLATFORM
          }
        },
        {
          path: '/platform/ledger/invite',
          name: 'PlatformLedgerInvite',
          component: '/platform/ledger/invite',
          meta: {
            title: 'menus.platform.ledgerInvite',
            icon: 'ri:share-forward-line',
            keepAlive: true,
            ...ROLE_PLATFORM
          }
        }
      ]
    },

    // ============ 6.5 订单分享数据看板 ============
    // 与运营管理（订单列表）同维度，但聚焦"商家分享行为 + 浏览数据"的看板，
    // 不放进 ops 分组以免和"订单列表"语义混淆；后续若有"分享审核"等关联功能
    // 可以演化成独立 group。
    {
      path: 'order-share',
      name: 'PlatformOrderShare',
      component: '/platform/order-share',
      meta: {
        title: 'menus.platform.orderShare',
        icon: 'ri:share-line',
        keepAlive: true,
        ...ROLE_PLATFORM
      }
    },

    // ============ 7. 系统配置 ============
    {
      path: 'sys',
      meta: {
        title: 'menus.platform.groupSystem',
        icon: 'ri:settings-3-line',
        ...ROLE_PLATFORM
      },
      children: [
        {
          path: '/platform/permission',
          name: 'PlatformPermission',
          component: '/platform/permission',
          meta: {
            title: 'menus.platform.permission',
            icon: 'ri:shield-user-line',
            keepAlive: true,
            ...ROLE_PLATFORM
          }
        },
        {
          path: '/platform/system',
          name: 'PlatformSystem',
          component: '/platform/system',
          meta: {
            title: 'menus.platform.system',
            icon: 'ri:tools-line',
            keepAlive: true,
            ...ROLE_PLATFORM
          }
        },
        {
          path: '/platform/legal',
          name: 'PlatformLegal',
          component: '/platform/legal',
          meta: {
            title: '协议管理',
            icon: 'ri:file-text-line',
            keepAlive: true,
            ...ROLE_PLATFORM
          }
        },
        {
          path: '/platform/feature-flag',
          name: 'PlatformFeatureFlag',
          component: '/platform/feature-flag',
          meta: {
            title: 'menus.platform.featureFlag',
            icon: 'ri:toggle-line',
            keepAlive: true,
            ...ROLE_PLATFORM
          }
        },
        {
          path: '/platform/app-release',
          name: 'PlatformAppRelease',
          component: '/platform/app-release',
          meta: {
            title: 'APP 发布',
            icon: 'ri:smartphone-line',
            keepAlive: true,
            ...ROLE_PLATFORM
          }
        }
      ]
    }
  ]
}
