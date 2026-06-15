import fs from 'fs'
const L = 'packages/server/src/modules/ledger'
let changed = []
function patch(f, fn) {
  const b = fs.readFileSync(f, 'utf8')
  const a = fn(b)
  if (a == null) throw Error('null ' + f)
  if (a !== b) {
    fs.writeFileSync(f, a, 'utf8')
    changed.push(f)
  }
}
function must(s, a, t) {
  if (!s.includes(a)) throw new Error(`ANCHOR ${t}:\n${a}`)
}

// 1) misc.dto: 导出/导入
patch(`${L}/dto/misc.dto.ts`, (s) => {
  if (s.includes('ExportDataDto')) return s
  return (
    s +
    `
/** 数据导出：allowShare 决定他人能否导入。 */
export class ExportDataDto {
  @IsOptional() @IsBoolean() allowShare?: boolean
}
/** 数据导入：pkg 为加密数据包字符串。 */
export class ImportDataDto {
  @IsString() @IsNotEmpty({ message: '请粘贴数据包' }) @MaxLength(5_000_000) pkg!: string
}
`
  )
})

// 2) admin.dto: 更新日志
patch(`${L}/dto/admin.dto.ts`, (s) => {
  if (s.includes('ChangelogCreateDto')) return s
  return (
    s +
    `
/** 后台·更新日志新增 */
export class ChangelogCreateDto {
  @IsString() @IsNotEmpty({ message: '请填写版本号' }) @MaxLength(20) version!: string
  @IsString() @IsNotEmpty({ message: '请填写标题' }) @MaxLength(60) title!: string
  @IsString() @MaxLength(4000) content!: string
  @IsOptional() @IsBoolean() published?: boolean
}
/** 后台·更新日志编辑 */
export class ChangelogUpdateDto {
  @IsOptional() @IsString() @MaxLength(20) version?: string
  @IsOptional() @IsString() @MaxLength(60) title?: string
  @IsOptional() @IsString() @MaxLength(4000) content?: string
  @IsOptional() @IsBoolean() published?: boolean
}
`
  )
})

// 3) mp controller: 更新日志 + 导出/导入
patch(`${L}/ledger.controller.ts`, (s) => {
  let o = s
  if (!o.includes('LedgerExtraService')) {
    o = o.replace(
      `import { FilesService } from '../files/files.service'`,
      `import { FilesService } from '../files/files.service'\nimport { LedgerExtraService } from './ledger-extra.service'`,
    )
  }
  if (!o.includes('Query,')) {
    o = o.replace(`  Post,\n  UploadedFile,`, `  Post,\n  Query,\n  UploadedFile,`)
  }
  if (!o.includes('ExportDataDto')) {
    o = o.replace(
      `import {
  CreateLedgerFeedbackDto,
  UpdateLedgerProfileDto,
  UpdateLedgerSettingDto,
} from './dto/misc.dto'`,
      `import {
  CreateLedgerFeedbackDto,
  UpdateLedgerProfileDto,
  UpdateLedgerSettingDto,
  ExportDataDto,
  ImportDataDto,
} from './dto/misc.dto'`,
    )
  }
  if (!o.includes('private readonly extra')) {
    o = o.replace(
      `  constructor(
    private readonly svc: LedgerService,
    private readonly files: FilesService,
  ) {}`,
      `  constructor(
    private readonly svc: LedgerService,
    private readonly files: FilesService,
    private readonly extra: LedgerExtraService,
  ) {}`,
    )
  }
  if (!o.includes("@Get('changelogs')")) {
    const a = `  @Post('feedback')
  feedback(@CurrentLedgerUser() u: LedgerAuthUser, @Body() dto: CreateLedgerFeedbackDto) {
    return this.svc.createFeedback(u.id, dto)
  }
}`
    must(o, a, 'mp-ctrl-tail')
    o = o.replace(
      a,
      `  @Post('feedback')
  feedback(@CurrentLedgerUser() u: LedgerAuthUser, @Body() dto: CreateLedgerFeedbackDto) {
    return this.svc.createFeedback(u.id, dto)
  }

  // ── 更新日志（按版本定向：客户端只拉自己版本那条做首开弹窗）──
  @Get('changelogs')
  changelogs() {
    return this.extra.changelogList()
  }
  @Get('changelog')
  changelog(@Query('version') version: string) {
    return this.extra.changelogByVersion(version)
  }

  // ── 数据导出 / 导入（加密数据包）──
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('data/export')
  exportData(@CurrentLedgerUser() u: LedgerAuthUser, @Body() dto: ExportDataDto) {
    return this.extra.exportData(u.id, dto.allowShare === true)
  }
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('data/import')
  importData(@CurrentLedgerUser() u: LedgerAuthUser, @Body() dto: ImportDataDto) {
    return this.extra.importData(u.id, dto.pkg)
  }
}`,
    )
  }
  return o
})

// 4) admin controller: 更新日志 CRUD
patch(`${L}/ledger-admin.controller.ts`, (s) => {
  let o = s
  if (!o.includes('LedgerExtraService')) {
    o = o.replace(
      `import { LedgerAiService } from './ledger-ai.service'`,
      `import { LedgerAiService } from './ledger-ai.service'\nimport { LedgerExtraService } from './ledger-extra.service'`,
    )
  }
  if (!o.includes('ChangelogCreateDto')) {
    o = o.replace(
      `  GenAiImageDto,\n} from './dto/admin.dto'`,
      `  GenAiImageDto,\n  ChangelogCreateDto,\n  ChangelogUpdateDto,\n} from './dto/admin.dto'`,
    )
  }
  if (!o.includes('private readonly extra')) {
    o = o.replace(
      `  constructor(
    private readonly admin: LedgerAdminService,
    private readonly ai: LedgerAiService,
  ) {}`,
      `  constructor(
    private readonly admin: LedgerAdminService,
    private readonly ai: LedgerAiService,
    private readonly extra: LedgerExtraService,
  ) {}`,
    )
  }
  if (!o.includes("'changelogs'")) {
    const a = `  @Post('ai/image/adopt')
  adoptAiImage(@CurrentUser() u: AuthUser, @Body() dto: { url: string }) {
    return this.ai.adopt(dto.url, u?.sub)
  }
}`
    must(o, a, 'admin-ctrl-tail')
    o = o.replace(
      a,
      `  @Post('ai/image/adopt')
  adoptAiImage(@CurrentUser() u: AuthUser, @Body() dto: { url: string }) {
    return this.ai.adopt(dto.url, u?.sub)
  }

  // ── 更新日志管理 ──
  @Get('changelogs')
  changelogs() {
    return this.extra.changelogAll()
  }
  @Post('changelogs')
  createChangelog(@Body() dto: ChangelogCreateDto) {
    return this.extra.changelogCreate(dto)
  }
  @Patch('changelogs/:id')
  updateChangelog(@Param('id') id: string, @Body() dto: ChangelogUpdateDto) {
    return this.extra.changelogUpdate(id, dto)
  }
  @Delete('changelogs/:id')
  removeChangelog(@Param('id') id: string) {
    return this.extra.changelogRemove(id)
  }
}`,
    )
  }
  return o
})

// 5) module: provider
patch(`${L}/ledger.module.ts`, (s) => {
  let o = s
  if (!o.includes('LedgerExtraService')) {
    o = o.replace(
      `import { LedgerAiService } from './ledger-ai.service'`,
      `import { LedgerAiService } from './ledger-ai.service'\nimport { LedgerExtraService } from './ledger-extra.service'`,
    )
    o = o.replace(
      `    LedgerAiService,\n    LedgerJwtGuard,`,
      `    LedgerAiService,\n    LedgerExtraService,\n    LedgerJwtGuard,`,
    )
  }
  return o
})

console.log('changed:\n  ' + changed.join('\n  '))
