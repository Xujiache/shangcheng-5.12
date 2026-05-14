import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'
import { ApiTags, ApiConsumes } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { FilesService } from './files.service'
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'

/**
 * 业务类型白名单 —— 所有"上传"接口对应的 bizType 必须在这里登记。
 *
 * 为什么严格白名单：
 *   - bizType 决定对象存储 key 的一级目录（如 `avatar/2026/05/xxx.png`），
 *     如果允许任意字符串，攻击者可以传 `../../etc/passwd` 之类绕过 prefix 隔离
 *   - bizType 还决定后台审计 / 配额统计的归类，未知类别会污染指标
 *
 * 新增业务时在此 set 里追加即可：
 *   - product   商品图 / 详情图
 *   - avatar    用户 / 商家头像
 *   - idcard    实名认证证件照
 *   - apk       Android 安装包（实际通过 uploadApk 通道走，此处兜底）
 *   - chat      在线客服图文消息附件
 *   - misc      其他临时素材
 */
const BIZ_TYPE_WHITELIST = new Set(['product', 'avatar', 'idcard', 'apk', 'chat', 'misc'])

function normalizeBizType(input: string | undefined): string {
  const v = (input || 'misc').toLowerCase().trim()
  if (!BIZ_TYPE_WHITELIST.has(v)) {
    throw new BizException(BizCode.INVALID_PARAMS, `不支持的业务类型：${input}`)
  }
  return v
}

@ApiTags('文件')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * 普通上传 —— 单文件
   *
   * 安全规则（防越权写）：
   *   - 客户端**不允许**指定 ownerId；ownerId 一律强制 = 当前登录用户 sub
   *   - 历史调用方仍可能传 ownerId 字段（如旧 admin-pc 代码）→ 在此忽略并 log warn
   *   - 管理员代上传需走专门接口（不在本次范围）
   */
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  // 走独立 upload 桶(60/min),不消耗业务 default 桶 —— 商品编辑可能一波上传 30+ 张图,
  // 撞 default 限流会导致 toast "Too Many Requests" + 后续业务请求一起被卡。
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: any,
    @Body('bizType') bizType: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (!user?.sub) {
      throw new BizException(BizCode.UNAUTHORIZED, '请先登录后再上传')
    }
    return this.filesService.upload(file, normalizeBizType(bizType), user.sub)
  }

  @Post('batch-upload')
  @ApiConsumes('multipart/form-data')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @UseInterceptors(FilesInterceptor('files', 20))
  batchUpload(
    @UploadedFiles() files: any[],
    @Body('bizType') bizType: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (!user?.sub) {
      throw new BizException(BizCode.UNAUTHORIZED, '请先登录后再上传')
    }
    return this.filesService.batchUpload(files, normalizeBizType(bizType), user.sub)
  }

  @Delete(':key')
  remove(@Param('key') key: string, @CurrentUser() user: AuthUser) {
    return this.filesService.remove(key, user ? { userId: user.sub, role: user.role } : null)
  }
}
