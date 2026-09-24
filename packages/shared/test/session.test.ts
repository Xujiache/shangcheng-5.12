import { describe, expect, it, vi } from 'vitest'
import { createSessionCoordinator, SessionChangedError } from '../src/utils/session'

function setup() {
  let tokens = { accessToken: 'access-a', refreshToken: 'refresh-a' }
  const coordinator = createSessionCoordinator(() => tokens)
  return {
    coordinator,
    set: (next: typeof tokens) => {
      tokens = next
    },
    read: () => tokens,
  }
}

describe('session lifetime and refresh', () => {
  it('coalesces concurrent refresh and retains existing request epochs', async () => {
    const s = setup(),
      epoch = s.coordinator.capture()
    const next = { accessToken: 'rotated', refreshToken: 'rotated-refresh' }
    const request = vi.fn(async () => next)
    await Promise.all(
      Array.from({ length: 10 }, () => s.coordinator.refresh(epoch, request, s.set)),
    )
    expect(request).toHaveBeenCalledTimes(1)
    expect(s.read()).toEqual(next)
    expect(() => s.coordinator.assertCurrent(epoch)).not.toThrow()
  })
  it('does not overwrite a new login with a previous refresh response', async () => {
    const s = setup(),
      epoch = s.coordinator.capture()
    let finish!: (v: { accessToken: string; refreshToken: string }) => void
    const pending = s.coordinator.refresh(
      epoch,
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
      s.set,
    )
    await Promise.resolve()
    s.set({ accessToken: 'account-b', refreshToken: 'refresh-b' })
    finish({ accessToken: 'old-rotated', refreshToken: 'old-refresh' })
    await expect(pending).rejects.toBeInstanceOf(SessionChangedError)
    expect(s.read().accessToken).toBe('account-b')
  })
  it('preserves tokens on a network error and releases the failed flight', async () => {
    const s = setup(),
      epoch = s.coordinator.capture()
    const failing = vi.fn(async () => {
      throw new Error('network')
    })
    await expect(s.coordinator.refresh(epoch, failing, s.set)).rejects.toThrow('network')
    await expect(s.coordinator.refresh(epoch, failing, s.set)).rejects.toThrow('network')
    expect(failing).toHaveBeenCalledTimes(2)
    expect(s.read().accessToken).toBe('access-a')
  })
  it('rejects old responses after logout', () => {
    const s = setup(),
      epoch = s.coordinator.capture()
    s.set({ accessToken: '', refreshToken: '' })
    expect(() => s.coordinator.assertCurrent(epoch)).toThrow(SessionChangedError)
  })
  it('reuses a refresh completed before a delayed 401 arrived', async () => {
    const s = setup(),
      epoch = s.coordinator.capture()
    const request = vi.fn(async () => ({ accessToken: 'next', refreshToken: 'next-refresh' }))
    await s.coordinator.refresh(epoch, request, s.set, 'access-a')
    await s.coordinator.refresh(epoch, request, s.set, 'access-a')
    expect(request).toHaveBeenCalledTimes(1)
  })
  it('invalidates old requests when token persistence fails halfway', async () => {
    const s = setup(),
      epoch = s.coordinator.capture()
    await expect(
      s.coordinator.refresh(
        epoch,
        async () => ({ accessToken: 'next', refreshToken: 'next-refresh' }),
        () => {
          s.set({ accessToken: 'next', refreshToken: 'refresh-a' })
          throw new Error('disk full')
        },
      ),
    ).rejects.toThrow('登录状态保存失败')
    expect(() => s.coordinator.assertCurrent(epoch)).toThrow(SessionChangedError)
  })
})
