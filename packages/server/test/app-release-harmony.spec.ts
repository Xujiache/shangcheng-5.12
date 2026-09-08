import { describe, expect, it, jest } from '@jest/globals'

jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'RELEASETEST',
}))

import { AppReleaseService } from '../src/modules/app-release/app-release.service'

function makeService() {
  const prisma: any = {
    appRelease: {
      findUnique: jest.fn<any>().mockResolvedValue(null),
      findFirst: jest.fn<any>(),
      findMany: jest.fn<any>(),
      create: jest.fn<any>(),
      delete: jest.fn<any>(),
    },
    uploadedFile: { findFirst: jest.fn<any>().mockResolvedValue(null) },
  }
  const files = {
    uploadApk: jest.fn<any>(),
    remove: jest.fn<any>(),
  }
  return { service: new AppReleaseService(prisma, files as any), prisma, files }
}

describe('AppReleaseService HarmonyOS 发布', () => {
  it('无 APK 时使用 HTTPS AppGallery 地址创建鸿蒙版本', async () => {
    const { service, prisma, files } = makeService()
    prisma.appRelease.create.mockImplementation(async ({ data }: any) => ({ id: 'h1', ...data }))

    const result = await service.create(null, {
      platform: 'merchant-harmony',
      version: '1.0.0',
      versionCode: 1000000,
      changelog: '原生鸿蒙首版',
      force: false,
      storeUrl: 'https://appgallery.huawei.com/app/detail?id=top.ewsn.jingwei.merchant',
    }, 'admin1')

    expect(files.uploadApk).not.toHaveBeenCalled()
    expect(prisma.appRelease.create).toHaveBeenCalledWith({
      data: {
        platform: 'merchant-harmony',
        version: '1.0.0',
        versionCode: 1000000,
        url: 'https://appgallery.huawei.com/app/detail?id=top.ewsn.jingwei.merchant',
        size: 0,
        changelog: '原生鸿蒙首版',
        force: false,
        createdById: 'admin1',
      },
    })
    expect(result).toMatchObject({ id: 'h1', platform: 'merchant-harmony' })
  })

  it('拒绝非 HTTPS 的鸿蒙更新目标', async () => {
    const { service, prisma, files } = makeService()

    await expect(service.create(null, {
      platform: 'merchant-harmony',
      version: '1.0.0',
      versionCode: 1000000,
      storeUrl: 'http://unsafe.example/app',
    })).rejects.toMatchObject({
      response: expect.objectContaining({ message: '鸿蒙版本必须填写 HTTPS AppGallery 地址' }),
    })
    expect(prisma.appRelease.create).not.toHaveBeenCalled()
    expect(files.uploadApk).not.toHaveBeenCalled()
  })

  it('最新版接口为鸿蒙端返回 storeUrl，空记录返回 null', async () => {
    const { service, prisma } = makeService()
    prisma.appRelease.findFirst.mockResolvedValueOnce({
      version: '1.0.1',
      versionCode: 1000001,
      url: 'https://appgallery.huawei.com/app/detail?id=top.ewsn.jingwei.merchant',
      size: 0,
      changelog: '修复',
      force: true,
      publishedAt: new Date('2026-08-30T00:00:00.000Z'),
    })

    await expect(service.latest('merchant-harmony')).resolves.toEqual({
      version: '1.0.1',
      versionCode: 1000001,
      url: 'https://appgallery.huawei.com/app/detail?id=top.ewsn.jingwei.merchant',
      storeUrl: 'https://appgallery.huawei.com/app/detail?id=top.ewsn.jingwei.merchant',
      size: 0,
      changelog: '修复',
      force: true,
      publishedAt: '2026-08-30T00:00:00.000Z',
    })

    prisma.appRelease.findFirst.mockResolvedValueOnce(null)
    await expect(service.latest('merchant-harmony')).resolves.toBeNull()
  })
})
