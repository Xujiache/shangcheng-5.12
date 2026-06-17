import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator'

/**
 * 平台管理员更新 DTO —— 字段白名单
 *
 * 历史风险：updateAdmin 之前是 `data: { ...dto }` 宽松 spread，
 * 任何人都能通过修改用户接口把 `passwordHash` / `id` / `createdAt` / `merchantId` /
 * `adminRoleId` / `role` 改成 super-admin 等敏感字段，造成提权。
 *
 * 本 DTO 显式声明可更新字段，配合 service 二次过滤（双保险），杜绝越权改字段。
 *
 * **不允许通过本接口修改**：
 *   - passwordHash（必须走专门的"重置密码"接口，强制旧密码或验证码）
 *   - id / createdAt / updatedAt（系统字段）
 *   - merchantId（商家归属，需另走"绑定商户"流程）
 *   - adminRoleId（权限敏感，按业务流程通过专门接口设置）
 */
export class UpdateAdminDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  username?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string

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
  @MaxLength(512)
  avatar?: string

  @IsOptional()
  @IsString()
  @IsIn(['admin', 'platform', 'super-admin'])
  role?: string

  @IsOptional()
  @IsString()
  @IsIn(['active', 'disabled'])
  status?: string
}
