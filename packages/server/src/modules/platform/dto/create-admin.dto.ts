import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

/**
 * 平台管理员创建 DTO —— 字段白名单
 *
 * 背景：全局 ValidationPipe 配置为 `{ whitelist: true, transform: true }`，
 * 任何「未在 DTO 上声明的字段」都会被静默剥离（forbidNonWhitelisted:false，不报 400）。
 * 因此本 DTO 必须显式声明 service.createAdmin() 按名读取的每一个字段，
 * 否则该字段会被剥离成 undefined，造成静默数据丢失。
 *
 * service.createAdmin() 按名读取：
 *   dto.password / dto.username / dto.email / dto.nickname / dto.role / dto.roleId / dto.avatar
 * （无 spread，逐字段读取 —— 适合上白名单 DTO）
 *
 * 安全约束：
 *   - password 必填且 ≥ 8 位（service 同样会校验并抛错，这里做入口防御）
 *   - username 必填（service 会抛错）
 *   - role 仅允许 admin / platform / super-admin（super-admin 的越权校验在 service 内基于 callerRole）
 */
export class CreateAdminDto {
  @IsString()
  @MaxLength(64)
  username!: string

  // service 要求 password.trim() 非空且长度 ≥ 8，这里同步约束
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string

  @IsOptional()
  @IsString()
  @MaxLength(128)
  email?: string

  @IsOptional()
  @IsString()
  @MaxLength(64)
  nickname?: string

  @IsOptional()
  @IsString()
  @IsIn(['admin', 'platform', 'super-admin'])
  role?: string

  // 关联 adminRoleId（service: data.adminRoleId = dto.roleId）
  @IsOptional()
  @IsString()
  @MaxLength(64)
  roleId?: string

  @IsOptional()
  @IsString()
  @MaxLength(512)
  avatar?: string
}
