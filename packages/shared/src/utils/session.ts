export interface SessionTokens {
  accessToken: string | null
  refreshToken: string | null
}

export class SessionChangedError extends Error {
  constructor() {
    super('账号状态已变化，请重新操作')
    this.name = 'SessionChangedError'
  }
}

export class LoginExpiredError extends Error {}

/** Platform-neutral guard. Only refreshes performed here preserve the session epoch. */
export function createSessionCoordinator(read: () => SessionTokens) {
  let epoch = 0
  let known = read()
  let flight: { epoch: number; promise: Promise<void> } | undefined
  function capture(): number {
    const next = read()
    if (next.accessToken !== known.accessToken || next.refreshToken !== known.refreshToken) {
      epoch++
      known = next
    }
    return epoch
  }
  function assertCurrent(expected: number): void {
    if (capture() !== expected) throw new SessionChangedError()
  }
  return {
    capture,
    assertCurrent,
    refresh(
      expected: number,
      request: (refreshToken: string) => Promise<SessionTokens>,
      persist: (tokens: SessionTokens) => void,
      sentAccessToken?: string | null,
    ): Promise<void> {
      assertCurrent(expected)
      // A delayed 401 for the previous access token must reuse the completed refresh.
      if (sentAccessToken !== undefined && sentAccessToken !== known.accessToken)
        return Promise.resolve()
      if (flight?.epoch === expected) return flight.promise
      const refreshToken = known.refreshToken
      const promise = Promise.resolve().then(async () => {
        assertCurrent(expected)
        if (!refreshToken) throw new LoginExpiredError('登录已过期')
        const tokens = await request(refreshToken)
        assertCurrent(expected)
        if (!tokens.accessToken || !tokens.refreshToken) throw new Error('登录响应格式错误')
        try {
          persist(tokens)
          known = read()
        } catch {
          // A partial write is not a successful refresh and invalidates outstanding requests.
          epoch++
          throw new Error('登录状态保存失败，请重试')
        }
        if (
          known.accessToken !== tokens.accessToken ||
          known.refreshToken !== tokens.refreshToken
        ) {
          epoch++
          throw new Error('登录状态保存失败，请重试')
        }
      })
      flight = { epoch: expected, promise }
      // Do not create an unhandled rejected promise with an ignored finally().
      const clear = () => {
        if (flight?.promise === promise) flight = undefined
      }
      void promise.then(clear, clear)
      return promise
    },
  }
}
