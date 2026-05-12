/**
 * Admin-PC Mock 账号数据
 *
 * 用于本地开发阶段模拟登录接口和用户信息接口。
 * 当接入真后端后，删除此文件并恢复 `auth.ts` 走 axios 请求即可。
 *
 * 角色定义：
 * - merchant：商家管理员，仅可见 /merchant/* 菜单
 * - platform：平台运营，仅可见 /platform/* 菜单
 * - super-admin：超级管理员，两边都可见，且可在顶部切换工作台
 */

export type UserRole = 'merchant' | 'platform' | 'super-admin'

export interface MockAccount {
  /** 账号（登录用） */
  userName: string
  /** 密码（明文，仅 mock 阶段） */
  password: string
  /** 用户 ID */
  userId: number
  /** 显示昵称 */
  nickName: string
  /** 邮箱 */
  email: string
  /** 头像 */
  avatar: string
  /** 角色枚举 */
  roleKey: UserRole
  /** ArtDesign 内部使用的 roles 数组 */
  roles: string[]
  /** 按钮级权限（暂不细做） */
  buttons: string[]
}

export const MOCK_ACCOUNTS: MockAccount[] = [
  {
    userName: 'merchant@demo',
    password: '123456',
    userId: 1001,
    nickName: '王老板',
    email: 'merchant@demo.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=merchant&backgroundColor=ffdfbf',
    roleKey: 'merchant',
    roles: ['merchant'],
    buttons: []
  },
  {
    userName: 'admin@demo',
    password: '123456',
    userId: 1002,
    nickName: '李运营',
    email: 'admin@demo.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin&backgroundColor=c0aede',
    roleKey: 'platform',
    roles: ['platform'],
    buttons: []
  },
  {
    userName: 'super@demo',
    password: '123456',
    userId: 1003,
    nickName: '张总',
    email: 'super@demo.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=super&backgroundColor=ffd5dc',
    roleKey: 'super-admin',
    // 超管只有 super-admin 单角色；菜单过滤时由 currentWorkspace 派生 merchant/platform
    roles: ['super-admin'],
    buttons: []
  }
]

/** 通过 userName 查找账号 */
export function findAccountByUserName(userName: string): MockAccount | undefined {
  return MOCK_ACCOUNTS.find((a) => a.userName === userName)
}

/** 通过 token 查找账号（mock token 直接编码 userName） */
export function findAccountByToken(token: string): MockAccount | undefined {
  const userName = token.replace(/^mock-token-/, '').split('-')[0]
  return MOCK_ACCOUNTS.find((a) => a.userName.split('@')[0] === userName)
}

/** 生成 mock token */
export function buildMockToken(userName: string): string {
  const prefix = userName.split('@')[0]
  return `mock-token-${prefix}-${Date.now()}`
}
