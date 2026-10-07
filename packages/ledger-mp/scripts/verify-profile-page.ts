import assert from 'node:assert/strict'

let registeredPage: any
const runtime = globalThis as Record<string, unknown>
runtime.Page = (definition: unknown) => {
  registeredPage = definition
  return definition
}
runtime.getApp = () => ({ globalData: { statusBarHeight: 24 } })
runtime.wx = { getStorageSync: () => undefined }

async function main() {
  const { profileAccountText, profileMembershipView, profileUserView } =
    await import('../miniprogram/pages/profile/index')

  assert.equal(
    profileAccountText({ accountCode: 'acct-123456789', id: 'user-id' }),
    '微信账号 · 23456789',
  )
  assert.deepEqual(profileMembershipView(null), {
    memberActive: false,
    memberText: '未开通会员',
    memberSub: '点击开通，解锁全部功能',
  })
  assert.deepEqual(
    profileMembershipView({
      active: true,
      expired: false,
      never: false,
      expiresAt: '2026-10-20T00:00:00.000Z',
      daysLeft: 14,
      expiringSoon: false,
      lastPlanKey: 'monthly',
    }),
    {
      memberActive: true,
      memberText: '门窗利账 会员',
      memberSub: '有效期至 2026年10月20日 · 剩 14 天',
    },
  )
  assert.deepEqual(
    profileMembershipView({
      active: false,
      expired: true,
      never: false,
      expiresAt: null,
      daysLeft: 0,
      expiringSoon: false,
      lastPlanKey: null,
    }),
    {
      memberActive: false,
      memberText: '会员已过期',
      memberSub: '续费后恢复使用',
    },
  )

  const user = profileUserView({
    id: 'user-id',
    accountCode: 'acct-123456789',
    nickname: '李师傅',
    avatar: '/api/v1/l/avatar-image/abcdefgh',
    membership: {
      active: false,
      expired: false,
      never: true,
      expiresAt: null,
      daysLeft: 0,
      expiringSoon: false,
      lastPlanKey: null,
    },
  })
  assert.equal(user.nickname, '李师傅')
  assert.equal(user.avatarChar, '李')
  assert.equal(user.avatarUrl, 'https://ewsn.top/api/v1/l/avatar-image/abcdefgh')
  assert.equal(user.accountText, '微信账号 · 23456789')
  assert.equal(user.avatarFailed, false)

  const legacy = profileUserView({
    id: 'user-id',
    accountCode: 'acct',
    nickname: '王师傅',
    avatar: 'https://old.example/avatar.jpg',
    membership: null as any,
  })
  assert.equal(legacy.avatarUrl, '')
  assert.equal(legacy.avatarChar, '王')
  assert.equal(registeredPage.data.topSpace, 38)
  assert.equal(registeredPage.data.rows.length, 2)
  assert.deepEqual(
    registeredPage.data.rows.map((row: { label: string; page: string }) => [row.label, row.page]),
    [
      ['邀请好友得会员', '/pages/invite/index'],
      ['设置', '/subpackages/settings/pages/settings/index'],
    ],
  )
  console.log('profile page model and static navigation contract verified')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
