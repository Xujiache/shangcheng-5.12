import { describe, expect, it, jest } from '@jest/globals'

jest.mock('nanoid', () => ({ customAlphabet: () => () => 'a'.repeat(16) }))

import sharp from 'sharp'
import { BizException } from '../src/common/exceptions/biz.exception'
import { LedgerService } from '../src/modules/ledger/ledger.service'

async function sampleJpeg() {
  return sharp({ create: { width: 32, height: 20, channels: 3, background: '#4aa88d' } })
    .jpeg()
    .toBuffer()
}

function setup(update: jest.Mock = jest.fn(async () => undefined)) {
  const user = { id: 'user-1', nickname: '店主', avatar: 'teal', membership: null }
  const prisma: any = {
    ledgerUser: {
      findUnique: jest.fn(async () => user),
      update,
    },
  }
  const files: any = {
    upload: jest.fn(async () => ({ id: 'avatar-record-1234567890' })),
    removeLedgerAvatar: jest.fn(async () => ({ ok: true })),
  }
  const service = new LedgerService(prisma, { assertTextSafe: jest.fn(async () => undefined) } as any, files)
  return { service, prisma, files }
}

describe('LedgerService avatar replacement', () => {
  it('rejects MIME and magic mismatch before content or storage work', async () => {
    const { service, files } = setup()
    await expect(
      service.updateProfileWithAvatar('user-1', { buffer: Buffer.from('not-image'), mimetype: 'image/jpeg', size: 9 }, '店主'),
    ).rejects.toBeInstanceOf(BizException)
    expect(files.upload).not.toHaveBeenCalled()
  })

  it('stores a normalized 512 square JPEG and returns the server profile', async () => {
    const { service, files } = setup()
    const input = await sampleJpeg()
    await service.updateProfileWithAvatar(
      'user-1',
      { buffer: input, mimetype: 'image/jpeg', size: input.length },
      '新店主',
    )
    const uploaded = files.upload.mock.calls[0][0]
    const metadata = await sharp(uploaded.buffer).metadata()
    expect(uploaded.mimetype).toBe('image/jpeg')
    expect(metadata.width).toBe(512)
    expect(metadata.height).toBe(512)
    expect(files.upload).toHaveBeenCalledWith(
      expect.objectContaining({ originalname: 'avatar.jpg', mimetype: 'image/jpeg' }),
      'avatar',
      'user-1',
      'ledger',
    )
  })

  it('rolls back the new object when the profile write fails', async () => {
    const update = jest.fn(async () => {
      throw new Error('db down')
    })
    const { service, files } = setup(update)
    const input = await sampleJpeg()
    await expect(
      service.updateProfileWithAvatar('user-1', { buffer: input, mimetype: 'image/jpeg', size: input.length }),
    ).rejects.toThrow('db down')
    expect(files.removeLedgerAvatar).toHaveBeenCalledWith('avatar-record-1234567890', 'user-1')
  })
})
