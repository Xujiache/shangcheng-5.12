/**
 * 认证相关接口
 *
 * 通过 VITE_USE_MOCK 环境变量切换 mock / 真后端：
 *  - VITE_USE_MOCK !== 'false'：走本地 MOCK_ACCOUNTS（merchant@demo / admin@demo / super@demo）
 *  - VITE_USE_MOCK === 'false'：调 /api/v1/auth/admin-login + /api/v1/auth/user-info
 */
import request from '@/utils/http'
import { HttpError } from '@/utils/http/error'
import { ApiStatus } from '@/utils/http/status'
import { useUserStore } from '@/store/modules/user'
import {
  MOCK_ACCOUNTS,
  buildMockToken,
  findAccountByToken,
  findAccountByUserName
} from './mock-accounts'

const MOCK_USER_KEY = 'admin_pc_mock_active_user'
const USE_MOCK = (import.meta.env.VITE_USE_MOCK as string) !== 'false'

const mockDelay = <T>(data: T, ms = 250): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms))

/** 登录 */
export function fetchLogin(params: Api.Auth.LoginParams): Promise<Api.Auth.LoginResponse> {
  if (!USE_MOCK) {
    return request
      .post<{ accessToken: string; refreshToken: string; token?: string }>({
        url: '/api/v1/auth/admin-login',
        data: { username: params.userName, userName: params.userName, password: params.password }
      })
      .then((res) => ({
        token: (res.token || res.accessToken) as string,
        refreshToken: res.refreshToken
      }))
  }

  const acc = findAccountByUserName(params.userName)
  if (!acc || acc.password !== params.password) {
    return Promise.reject(new HttpError('账号或密码错误', ApiStatus.unauthorized))
  }
  const token = buildMockToken(acc.userName)
  localStorage.setItem(MOCK_USER_KEY, acc.userName)
  return mockDelay({
    token,
    refreshToken: token.replace('mock-token-', 'mock-refresh-')
  })
}

/** 获取用户信息 */
export function fetchGetUserInfo(): Promise<Api.Auth.UserInfo> {
  if (!USE_MOCK) {
    return request.get<Api.Auth.UserInfo>({ url: '/api/v1/auth/user-info' })
  }

  const userStore = useUserStore()

  let acc =
    (userStore.accessToken && findAccountByToken(userStore.accessToken)) ||
    undefined

  if (!acc) {
    const activeUserName = localStorage.getItem(MOCK_USER_KEY) || ''
    acc = MOCK_ACCOUNTS.find((a) => a.userName === activeUserName)
  }

  if (!acc && userStore.info?.userName) {
    acc = MOCK_ACCOUNTS.find((a) => a.userName === userStore.info.userName)
  }

  if (!acc) {
    return Promise.reject(new HttpError('未登录或会话已过期', ApiStatus.unauthorized))
  }

  localStorage.setItem(MOCK_USER_KEY, acc.userName)

  return mockDelay<Api.Auth.UserInfo>({
    userId: acc.userId,
    userName: acc.userName,
    email: acc.email,
    avatar: acc.avatar,
    roles: acc.roles,
    buttons: acc.buttons
  })
}
