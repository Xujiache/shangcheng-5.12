import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

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

  // 注意：不能用 @IsIn(['admin','platform','super-admin']) 强枚举 ——
  // admin-pc 权限页（views/platform/permission/index.vue）历史上把 /p/roles 的
  // 角色「显示名」（客服/审核员/财务/平台运营/超级管理员）直接当 role 发上来。
  // service.createAdmin() 自己会把不在 ALLOWED_NORMAL_ROLES 的值兜底成 'platform'，
  // 且 super-admin 提权有 callerRole 守卫，这里强枚举只会把原本可用的创建流程打成 400。
  @IsOptional()
  @IsString()
  @MaxLength(64)
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
