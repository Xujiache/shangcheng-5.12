/**
 * 法律协议 · Controller
 *
 * 公开读取 GET /api/v1/u/agreements（小程序/H5/三端登录页弹窗用）
 * 管理员读写 GET/PUT /api/v1/p/legal/agreements
 *
 * 安全：LegalAdminController 必须强制角色校验，否则任意已登录账号都能
 * 改隐私政策/用户协议正文（直接的合规与品牌风险）。
 */
import { Body, Controller, Get, Headers, Param, Put, Query, Res, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Response } from 'express'
import { Public } from '../../common/decorators/public.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { SkipResponseWrap } from '../../common/decorators/skip-response.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'
import { LegalService } from './legal.service'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function legalHtml(title: string, body: string, language: string): string {
  const lang = language.toLowerCase().startsWith('en') ? 'en' : 'zh-CN'
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="color-scheme" content="light dark">
  <title>${escapeHtml(title)}</title>
  <style>
    :root{font-family:-apple-system,BlinkMacSystemFont,"HarmonyOS Sans SC","Noto Sans SC",sans-serif;color:#1b1d22;background:#f6f7f9}
    body{margin:0;padding:max(24px,env(safe-area-inset-top)) max(18px,env(safe-area-inset-right)) max(32px,env(safe-area-inset-bottom)) max(18px,env(safe-area-inset-left))}
    main{box-sizing:border-box;max-width:860px;margin:0 auto;padding:28px;border:1px solid rgba(90,98,112,.16);border-radius:20px;background:rgba(255,255,255,.92);box-shadow:0 14px 40px rgba(36,44,60,.08)}
    h1{margin:0 0 20px;font-size:26px;line-height:1.35}pre{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font:15px/1.85 inherit;color:inherit}
    @media(prefers-color-scheme:dark){:root{color:#f2f3f5;background:#111319}main{background:rgba(30,33,41,.94);border-color:rgba(255,255,255,.12);box-shadow:none}}
    @media(max-width:600px){body{padding-left:12px;padding-right:12px}main{padding:20px 16px;border-radius:16px}h1{font-size:22px}pre{font-size:14px}}
  </style>
</head>
<body><main><h1>${escapeHtml(title)}</h1><pre>${escapeHtml(body)}</pre></main></body>
</html>`
}

@ApiTags('协议 · 公开')
@Controller('u')
export class LegalPublicController {
  constructor(private readonly svc: LegalService) {}

  /** 三端登录页 / 设置页弹窗读取 */
  @Public()
  @Get('agreements')
  list(
    @Headers('accept-language') language?: string,
    @Query('platform') platform?: string,
  ) {
    return this.svc.list(language, platform)
  }

  /** AppGallery 与浏览器可直接访问的鸿蒙商家端法律文本。 */
  @Public()
  @SkipResponseWrap()
  @Get('legal/merchant-harmony/:kind')
  async merchantHarmonyDocument(
    @Param('kind') kind: string,
    @Query('lang') requestedLanguage: string | undefined,
    @Headers('accept-language') acceptedLanguage: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    const language = requestedLanguage || acceptedLanguage || 'zh-CN'
    const agreements = await this.svc.merchantHarmonyList(language)
    const section = kind === 'privacy' ? agreements.privacy
      : kind === 'collect' ? agreements.collect
        : agreements.user
    response
      .status(200)
      .set({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
        'X-Content-Type-Options': 'nosniff',
      })
      .send(legalHtml(section.title, section.body, language))
  }
}

@ApiTags('协议 · 平台')
@UseGuards(RolesGuard)
@Roles('admin', 'platform', 'super-admin')
@Controller('p/legal')
export class LegalAdminController {
  constructor(private readonly svc: LegalService) {}

  @Get('agreements')
  read() {
    return this.svc.list()
  }

  @Put('agreements')
  write(@Body() dto: any) {
    return this.svc.save(dto)
  }
}
