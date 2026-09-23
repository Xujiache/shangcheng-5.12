import { describe, it, expect, afterEach, jest } from '@jest/globals'
import { Readable } from 'stream'

jest.mock('nanoid', () => ({ customAlphabet: () => () => 'testfileid123456' }))

import { FilesService } from '../src/modules/files/files.service'

describe('ledger feedback media security', () => {
  const env0 = { ...process.env }
  afterEach(() => {
    process.env = { ...env0 }
  })

  function service() {
    const prisma: any = {
      uploadedFile: {
        create: jest.fn(async (args: any) => ({ id: 'file123', ...args.data })),
        findFirst: jest.fn(async () => ({
          id: 'file123',
          key: 'feedback/test.png',
          mimeType: 'image/png',
          size: 8,
        })),
      },
    }
    const contentSecurity: any = { assertImageSafe: jest.fn(async () => {}) }
    return { files: new FilesService(prisma, contentSecurity), prisma, contentSecurity }
  }

  it('拒绝 MIME 与魔数不一致的 ledger 图片', async () => {
    const { files, contentSecurity } = service()
    await expect(
      files.upload(
        {
          buffer: Buffer.from('not-an-image'),
          size: 12,
          mimetype: 'image/png',
          originalname: 'x.png',
        },
        'avatar',
        'u1',
        'ledger',
      ),
    ).rejects.toBeTruthy()
    expect(contentSecurity.assertImageSafe).not.toHaveBeenCalled()
  })

  it('私有图链接过期即拒绝，签名有效且对象存在才读取', async () => {
    process.env.LEDGER_MEDIA_SIGN_SECRET = 'x'.repeat(40)
    process.env.LEDGER_MEDIA_BASE_URL = 'https://example.test/api/v1/l/feedback-media/view'
    process.env.S3_PRIVATE_BUCKET = 'ledger-private-test'
    const { files } = service()
    ;(files as any).client = { getObject: jest.fn(async () => Readable.from([Buffer.from('PNG')])) }
    const url = new URL(files.feedbackViewUrl('file123'))
    const exp = url.searchParams.get('exp')!
    const sig = url.searchParams.get('sig')!
    const opened = await files.openPrivateFeedback('file123', exp, sig)
    expect(opened.mimeType).toBe('image/png')
    await expect(
      files.openPrivateFeedback('file123', String(Number(exp) - 900), sig),
    ).rejects.toBeTruthy()
    await expect(files.openPrivateFeedback('file123', exp, '0'.repeat(64))).rejects.toBeTruthy()
  })

  it('反馈引用按上传者隔离，不能提交他人私有图', async () => {
    process.env.LEDGER_MEDIA_SIGN_SECRET = 'x'.repeat(40)
    const { files, prisma } = service()
    prisma.uploadedFile.findFirst.mockResolvedValueOnce(null)
    await expect(
      files.normalizeFeedbackImages('other-user', ['feedback-private:file123']),
    ).rejects.toBeTruthy()
    expect(prisma.uploadedFile.findFirst).toHaveBeenCalledWith({
      where: { id: 'file123', ownerId: 'other-user', bizType: 'ledger-feedback-private' },
    })
  })

  it('通用文件删除端点不能误删私有反馈图记录', async () => {
    const { files, prisma } = service()
    const removeObject = jest.fn()
    ;(files as any).client = { removeObject }
    prisma.uploadedFile.findUnique = jest.fn(async () => ({
      key: 'feedback/test.png',
      ownerId: 'u1',
      bizType: 'ledger-feedback-private',
    }))
    prisma.uploadedFile.delete = jest.fn()
    await expect(
      files.remove('feedback/test.png', { userId: 'u1', role: 'user' }),
    ).rejects.toBeTruthy()
    expect(removeObject).not.toHaveBeenCalled()
    expect(prisma.uploadedFile.delete).not.toHaveBeenCalled()
  })
})
