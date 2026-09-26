import { describe, expect, it, jest } from '@jest/globals'

// nanoid@5 为 ESM；服务端 Jest 运行在 CJS 测试配置中，因此提供等价的稳定桩。
jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'a'.repeat(16),
}))

import { BizException } from '../src/common/exceptions/biz.exception'
import { FilesService } from '../src/modules/files/files.service'

describe('FilesService 内容安全上传闸门', () => {
  it('量窗助手轮播图上传使用 ledger 凭据', async () => {
    const putObject = jest.fn(async () => undefined)
    const create = jest.fn(async () => ({ id: 'uploaded-1' }))
    const contentSecurity = { assertImageSafe: jest.fn(async (..._args: any[]) => undefined) }
    const service = new FilesService({ uploadedFile: { create } } as any, contentSecurity as any)
    ;(service as any).client = { putObject }
    const file = {
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      originalname: 'banner.png',
      mimetype: 'image/png',
      size: 8,
    }

    await service.upload(file, 'ledger-ad', 'admin-1')
    await service.batchUpload([file], 'ledger-ad', 'admin-1')

    expect(contentSecurity.assertImageSafe).toHaveBeenCalledTimes(2)
    expect(contentSecurity.assertImageSafe).toHaveBeenCalledWith(
      file.buffer,
      expect.objectContaining({ scope: 'ledger', scene: 2 }),
    )
    expect(putObject).toHaveBeenCalledTimes(2)
    expect(create).toHaveBeenCalledTimes(2)
  })

  it('头像检测不通过时，不写入对象存储或 UploadedFile', async () => {
    const putObject = jest.fn()
    const create = jest.fn()
    const contentSecurity = {
      assertImageSafe: jest.fn(async (..._args: any[]) => {
        throw new BizException(1000, '内容未通过安全检测，请修改后重试')
      }),
    }
    const service = new FilesService({ uploadedFile: { create } } as any, contentSecurity as any)
    ;(service as any).client = { putObject }

    await expect(
      service.upload(
        {
          buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
          originalname: 'avatar.png',
          mimetype: 'image/png',
          size: 4,
        },
        'avatar',
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BizException)

    expect(contentSecurity.assertImageSafe).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({ scope: 'mall', scene: 1, filename: 'avatar.png' }),
    )
    expect(putObject).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })
})
