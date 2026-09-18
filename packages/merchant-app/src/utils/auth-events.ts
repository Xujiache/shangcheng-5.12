export const AUTH_TOKENS_UPDATED_EVENT = 'jiujiu:merchant-auth-tokens-updated'

export interface AuthTokensUpdatedPayload {
  accessToken: string
  refreshToken: string
}

export function emitAuthTokensUpdated(payload: AuthTokensUpdatedPayload) {
  try {
    uni.$emit(AUTH_TOKENS_UPDATED_EVENT, payload)
  } catch {
    // App 初始化极早期事件总线不可用时，storage 仍是最终数据源。
  }
}
