import { AppRouteRecord } from '@/types/router'

/**
 * 商家工作台路由（S3 + S3.5 · 共 18 屏 · 2 顶级 + 6 分组）
 *
 * meta.roles 只包含 'merchant'。
 * 超管账号通过 currentWorkspace='merchant' 派生出相同权限。
 *
 * 分组结构：
 *   ├─ 工作台首页（dashboard, 顶级）
 *   ├─ 数据中心（stats, 顶级）
 *   ├─ 商品中心（list/add/category/agency/plaza）
 *   ├─ 订单管理（list/aftersale）
 *   ├─ 客户与客服（customer/chat）
 *   ├─ 营销与店铺（marketing/decorate）
 *   ├─ 门店与员工（store/staff）
 *   └─ 财务与会员（commission/withdraw/member）
 *
 * 注意：分组节点 (group-xxx) 自身没有 component，只是菜单层级；
 * 实际屏的 URL 通过子路由的绝对路径（/ 开头）保持不变。
 */

const ROLE_MERCHANT = { roles: ['merchant'] as string[] }

export const merchantRoutes: AppRouteRecord = {
  name: 'MerchantConsole',
  path: '/merchant',
  component: '/index/index',
  meta: {
    title: 'menus.merchant.title',
    icon: 'ri:store-2-line',
    roles: ['merchant']
  },
  children: [
    // ============ 1. 工作台首页 ============
    {
      path: 'dashboard',
      name: 'MerchantDashboard',
      component: '/merchant/dashboard',
      meta: {
        title: 'menus.merchant.dashboard',
        icon: 'ri:home-smile-2-line',
        keepAlive: false,
        fixedTab: true,
        ...ROLE_MERCHANT
      }
    },

    // ============ 2. 数据中心 ============
    {
      path: 'stats',
      name: 'MerchantStats',
      component: '/merchant/stats',
      meta: {
        title: 'menus.merchant.stats',
        icon: 'ri:bar-chart-2-line',
        keepAlive: true,
        ...ROLE_MERCHANT
      }
    },

    // ============ 3. 商品中心 ============
    {
      path: 'product',
      meta: {
        title: 'menus.merchant.groupProduct',
        icon: 'ri:price-tag-3-line',
        ...ROLE_MERCHANT
      },
      children: [
        {
          path: 'list',
          name: 'MerchantProductList',
          component: '/merchant/product/list',
          meta: {
            title: 'menus.merchant.productList',
            icon: 'ri:list-check-2',
            keepAlive: true,
            ...ROLE_MERCHANT
          }
        },
        {
          path: 'add',
          name: 'MerchantProductAdd',
          component: '/merchant/product/add',
          meta: {
            title: 'menus.merchant.productAdd',
            icon: 'ri:add-box-line',
            keepAlive: false,
            ...ROLE_MERCHANT
          }
        },
        {
          path: 'category',
          name: 'MerchantProductCategory',
          component: '/merchant/product/category',
          meta: {
            title: 'menus.merchant.productCategory',
            icon: 'ri:folder-3-line',
            keepAlive: true,
            ...ROLE_MERCHANT
          }
        },
        {
          path: 'agency',
          name: 'MerchantAgencyList',
          component: '/merchant/product/agency',
          meta: {
            title: 'menus.merchant.agencyList',
            icon: 'ri:link-m',
            keepAlive: true,
            ...ROLE_MERCHANT
          }
        },
        {
          // 绝对路径：URL 保持 /merchant/plaza 不变
          path: '/merchant/plaza',
          name: 'MerchantPlaza',
          component: '/merchant/plaza',
          meta: {
            title: 'menus.merchant.plaza',
            icon: 'ri:store-3-line',
            keepAlive: true,
            ...ROLE_MERCHANT
          }
        }
      ]
    },

    // ============ 4. 订单管理 ============
    {
      path: 'order',
      meta: {
        title: 'menus.merchant.groupOrder',
        icon: 'ri:bill-line',
        ...ROLE_MERCHANT
      },
      children: [
        {
          path: 'list',
          name: 'MerchantOrderList',
          component: '/merchant/order/list',
          meta: {
            title: 'menus.merchant.orderList',
            icon: 'ri:shopping-bag-3-line',
            keepAlive: true,
            ...ROLE_MERCHANT
          }
        },
        {
          path: 'aftersale',
          name: 'MerchantAftersale',
          component: '/merchant/order/aftersale',
          meta: {
            title: 'menus.merchant.aftersale',
            icon: 'ri:refund-line',
            keepAlive: true,
            ...ROLE_MERCHANT
          }
        }
      ]
    },

    // ============ 5. 客户与客服 ============
    {
      path: 'cs',
      meta: {
        title: 'menus.merchant.groupCustomer',
        icon: 'ri:customer-service-2-line',
        ...ROLE_MERCHANT
      },
      children: [
        {
          path: '/merchant/customer',
          name: 'MerchantCustomer',
          component: '/merchant/customer',
          meta: {
            title: 'menus.merchant.customer',
            icon: 'ri:user-3-line',
            keepAlive: true,
            ...ROLE_MERCHANT
          }
        },
        {
          path: '/merchant/chat',
          name: 'MerchantChat',
          component: '/merchant/chat',
          meta: {
            title: 'menus.merchant.chat',
            icon: 'ri:chat-3-line',
            keepAlive: true,
            ...ROLE_MERCHANT
          }
        }
      ]
    },

    // ============ 6. 营销与店铺 ============
    {
      path: 'promo',
      meta: {
        title: 'menus.merchant.groupMarketing',
        icon: 'ri:megaphone-line',
        ...ROLE_MERCHANT
      },
      children: [
        {
          path: '/merchant/marketing',
          name: 'MerchantMarketing',
          component: '/merchant/marketing',
          meta: {
            title: 'menus.merchant.marketing',
            icon: 'ri:flag-2-line',
            keepAlive: true,
            ...ROLE_MERCHANT
          }
        },
        {
          path: '/merchant/decorate',
          name: 'MerchantDecorate',
          component: '/merchant/decorate',
          meta: {
            title: 'menus.merchant.decorate',
            icon: 'ri:layout-masonry-line',
            keepAlive: true,
            ...ROLE_MERCHANT
          }
        }
      ]
    },

    // ============ 7. 门店与员工 ============
    {
      path: 'team',
      meta: {
        title: 'menus.merchant.groupOperation',
        icon: 'ri:team-line',
        ...ROLE_MERCHANT
      },
      children: [
        {
          path: '/merchant/store',
          name: 'MerchantStore',
          component: '/merchant/store',
          meta: {
            title: 'menus.merchant.store',
            icon: 'ri:store-line',
            keepAlive: true,
            ...ROLE_MERCHANT
          }
        },
        {
          path: '/merchant/staff',
          name: 'MerchantStaff',
          component: '/merchant/staff',
          meta: {
            title: 'menus.merchant.staff',
            icon: 'ri:group-line',
            keepAlive: true,
            ...ROLE_MERCHANT
          }
        }
      ]
    },

    // ============ 8. 财务与会员 ============
    {
      path: 'finance',
      meta: {
        title: 'menus.merchant.groupFinance',
        icon: 'ri:wallet-3-line',
        ...ROLE_MERCHANT
      },
      children: [
        {
          path: '/merchant/commission',
          name: 'MerchantCommission',
          component: '/merchant/commission',
          meta: {
            title: 'menus.merchant.commission',
            icon: 'ri:percent-line',
            keepAlive: true,
            ...ROLE_MERCHANT
          }
        },
        {
          path: '/merchant/withdraw',
          name: 'MerchantWithdraw',
          component: '/merchant/withdraw',
          meta: {
            title: 'menus.merchant.withdraw',
            icon: 'ri:hand-coin-line',
            keepAlive: true,
            ...ROLE_MERCHANT
          }
        },
        {
          path: '/merchant/member',
          name: 'MerchantMember',
          component: '/merchant/member',
          meta: {
            title: 'menus.merchant.member',
            icon: 'ri:vip-crown-2-line',
            keepAlive: true,
            ...ROLE_MERCHANT
          }
        }
      ]
    }
  ]
}
